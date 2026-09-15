from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast

import pytest
from django.core.exceptions import FieldDoesNotExist
from pydantic import ValidationError

from lx_annotate.permissions import user_can_administer_center_scope
from lx_annotate.services import access_management
from lx_annotate.services.access_management import (
    AccessManagementConflict,
    AccessManagementError,
    AccessManagementForbidden,
    CenterScopeMutation,
)


class _Groups:
    def __init__(self, names: set[str]) -> None:
        self.names = names
        self.requested_name: str | None = None

    def filter(self, *, name: str) -> _Groups:
        self.requested_name = name
        return self

    def exists(self) -> bool:
        return self.requested_name in self.names


@pytest.mark.parametrize(
    ("user", "expected"),
    [
        (SimpleNamespace(is_authenticated=False), False),
        (SimpleNamespace(is_authenticated=True), False),
        (
            SimpleNamespace(
                is_authenticated=True,
                is_superuser=False,
                groups=_Groups({"center_scope:administrator"}),
            ),
            False,
        ),
        (
            SimpleNamespace(
                is_authenticated=True,
                is_superuser=False,
                groups=_Groups({"center_scope:admin"}),
            ),
            True,
        ),
        (
            SimpleNamespace(
                is_authenticated=True,
                is_superuser=False,
                groups=_Groups({"center_scope:global_admin"}),
            ),
            True,
        ),
        (SimpleNamespace(is_authenticated=True, is_superuser=True), True),
    ],
)
def test_center_scope_administration_requires_an_exact_trusted_role(
    user: SimpleNamespace,
    expected: bool,
) -> None:
    assert user_can_administer_center_scope(user) is expected


def test_center_scope_mutation_normalizes_valid_input() -> None:
    mutation = CenterScopeMutation.model_validate(
        {
            "operation": "assign",
            "center_key": "center-a",
            "expected_center_keys": ["center-b", "center-a"],
            "reason": "  Approved clinical access  ",
        },
    )

    assert mutation.reason == "Approved clinical access"
    assert mutation.expected_center_keys == frozenset({"center-a", "center-b"})


@pytest.mark.parametrize(
    "payload",
    [
        {"operation": "delete", "reason": "Unsupported operation"},
        {"operation": "revoke", "reason": "  "},
        {
            "operation": "revoke",
            "reason": "Access ended",
            "unexpected": True,
        },
    ],
)
def test_center_scope_mutation_rejects_invalid_or_unexpected_input(
    payload: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        CenterScopeMutation.model_validate(payload)


def test_plural_center_detection_handles_legacy_model(monkeypatch) -> None:
    monkeypatch.setattr(
        access_management.PortalUserInfo._meta,
        "get_field",
        lambda _name: (_ for _ in ()).throw(FieldDoesNotExist("centers")),
    )
    assert access_management._has_plural_center_scope() is False


def test_delegated_admin_requires_exactly_one_center(monkeypatch) -> None:
    monkeypatch.setattr(
        access_management,
        "get_portal_info_for_user",
        lambda _actor: None,
    )
    with pytest.raises(AccessManagementForbidden, match="unambiguous"):
        access_management.delegated_center_for_actor(object())


@pytest.mark.parametrize(
    ("previous", "expected", "delegated", "error"),
    [
        (("center-a",), (), None, AccessManagementConflict),
        (("center-a",), ("center-a",), "center-b", AccessManagementForbidden),
    ],
)
def test_mutation_scope_rejects_stale_or_cross_center_changes(
    previous: tuple[str, ...],
    expected: tuple[str, ...],
    delegated: str | None,
    error: type[Exception],
) -> None:
    with pytest.raises(error):
        access_management._validate_mutation_scope(
            previous_center_keys=previous,
            expected_center_keys=expected,
            delegated_center_key=delegated,
        )


@pytest.mark.parametrize(
    "kwargs",
    [
        {
            "portal_info": SimpleNamespace(),
            "selected_center_key": None,
            "delegated_center_key": None,
            "is_global_admin": True,
        },
        {
            "portal_info": None,
            "selected_center_key": "center-a",
            "delegated_center_key": None,
            "is_global_admin": False,
        },
    ],
)
def test_assign_preparation_rejects_missing_center_or_incomplete_delegated_user(
    kwargs: dict[str, object],
) -> None:
    with pytest.raises((AccessManagementError, AccessManagementForbidden)):
        access_management._prepare_assign_operation(
            target_user=object(),
            **cast(dict[str, Any], kwargs),
        )


@pytest.mark.parametrize(
    ("portal_info", "center_key", "previous", "message"),
    [
        (None, None, (), "no center assignment"),
        (SimpleNamespace(), None, ("a", "b"), "center_key is required"),
    ],
)
def test_revoke_preparation_requires_an_existing_unambiguous_center(
    portal_info: object | None,
    center_key: str | None,
    previous: tuple[str, ...],
    message: str,
) -> None:
    with pytest.raises(AccessManagementError, match=message):
        access_management._prepare_revoke_operation(
            portal_info=portal_info,
            selected_center_key=center_key,
            previous_center_keys=previous,
        )


def test_legacy_assignment_replaces_previous_center(monkeypatch) -> None:
    monkeypatch.setattr(access_management, "_has_plural_center_scope", lambda: False)
    selected = SimpleNamespace(center_key="center-b")
    assert access_management._desired_center_keys(
        previous_center_keys=("center-a",),
        selected_center=selected,
        operation="assign",
    ) == ("center-b",)


def test_locked_center_rejects_disappeared_center(monkeypatch) -> None:
    query = SimpleNamespace(
        filter=lambda **_kwargs: SimpleNamespace(first=lambda: None),
    )
    monkeypatch.setattr(
        access_management.Center.objects,
        "select_for_update",
        lambda: query,
    )
    with pytest.raises(AccessManagementError, match="Center was not found"):
        access_management._locked_center("missing")


def test_apply_center_scope_detects_disappeared_center(monkeypatch) -> None:
    query = SimpleNamespace(order_by=lambda *_args: [])
    monkeypatch.setattr(
        access_management.Center.objects,
        "filter",
        lambda **_kwargs: query,
    )
    with pytest.raises(RuntimeError, match="center disappeared"):
        access_management._apply_center_scope(
            portal_info=SimpleNamespace(),
            examiner=None,
            new_center_keys=("missing",),
        )


def test_delegated_user_query_is_limited_to_the_delegated_center(monkeypatch) -> None:
    class Query:
        filtered_with = None

        def filter(self, value):
            self.filtered_with = value
            return self

        def distinct(self):
            return self

        def prefetch_related(self, *_args):
            return self

        def order_by(self, *_args):
            return self

    query = Query()
    monkeypatch.setattr(access_management.User.objects, "all", lambda: query)
    monkeypatch.setattr(access_management, "_has_plural_center_scope", lambda: True)

    assert access_management._delegated_user_queryset(object()) is query
    assert query.filtered_with is not None


def test_locked_target_user_rejects_missing_user(monkeypatch) -> None:
    query = SimpleNamespace()
    query.prefetch_related = lambda *_args: query
    query.filter = lambda **_kwargs: SimpleNamespace(first=lambda: None)
    monkeypatch.setattr(
        access_management.User.objects,
        "select_for_update",
        lambda: query,
    )

    with pytest.raises(AccessManagementError, match="Target user was not found"):
        access_management._locked_target_user(999)


def test_apply_center_scope_allows_missing_legacy_examiner(monkeypatch) -> None:
    center = SimpleNamespace(center_key="center-a", pk=1)
    query = SimpleNamespace(order_by=lambda *_args: [center])
    monkeypatch.setattr(
        access_management.Center.objects,
        "filter",
        lambda **_kwargs: query,
    )
    monkeypatch.setattr(access_management, "_has_plural_center_scope", lambda: False)

    access_management._apply_center_scope(
        portal_info=SimpleNamespace(),
        examiner=None,
        new_center_keys=("center-a",),
    )


def test_audit_write_must_be_durably_queryable(monkeypatch) -> None:
    entry = SimpleNamespace(pk=1)
    monkeypatch.setattr(
        access_management.AuditLedger.objects,
        "create",
        lambda **_kwargs: entry,
    )
    monkeypatch.setattr(
        access_management.AuditLedger.objects,
        "filter",
        lambda **_kwargs: SimpleNamespace(exists=lambda: False),
    )
    mutation = CenterScopeMutation(
        operation="assign",
        center_key="center-a",
        reason="Approved access",
    )

    with pytest.raises(RuntimeError, match="Durable audit ledger write failed"):
        access_management._write_center_scope_audit(
            actor=SimpleNamespace(pk=1, username="actor"),
            target_user=SimpleNamespace(pk=2, username="target"),
            portal_info=SimpleNamespace(pk=3),
            mutation=mutation,
            correlation_id="request-1",
            previous_center_keys=(),
            new_center_keys=("center-a",),
            portal_user_info_created=False,
            examiner_created=False,
        )
