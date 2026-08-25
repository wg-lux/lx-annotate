from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from lx_annotate.services.access_management import (
    AccessManagementError,
    AccessManagementForbidden,
)
from lx_annotate.views import administration


class _ConfiguredFile:
    def __init__(self, *, size: int = 1, error: OSError | None = None) -> None:
        self.size = size
        self.error = error

    def expanduser(self):
        return self

    def is_file(self) -> bool:
        if self.error is not None:
            raise self.error
        return True

    def stat(self):
        return SimpleNamespace(st_size=self.size)


@pytest.mark.parametrize(
    ("configured_file", "expected"),
    [
        (_ConfiguredFile(size=10), (True, True)),
        (_ConfiguredFile(size=0), (True, False)),
        (_ConfiguredFile(error=OSError("unreadable")), (True, False)),
    ],
)
@override_settings(TEST_TRANSPORT_FILE="/configured")
def test_transport_file_health_fails_closed(
    monkeypatch,
    configured_file: _ConfiguredFile,
    expected: tuple[bool, bool],
) -> None:
    monkeypatch.setattr(administration, "Path", lambda _value: configured_file)
    assert administration._configured_readable_file("TEST_TRANSPORT_FILE") == expected


@pytest.mark.parametrize(
    ("base_url", "expected"),
    [
        ("https://hub.example", True),
        ("http://hub.example", False),
        ("https:///missing-host", False),
    ],
)
def test_hub_health_requires_complete_https_url(base_url: str, expected: bool) -> None:
    node = SimpleNamespace(
        base_url=base_url,
        node_key="hub",
        display_name="Hub",
        owning_center=None,
        is_active=True,
    )
    assert administration._hub_node_health(node)["https_configured"] is expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(None, 25), ("invalid", 25), ("0", 1), ("50", 50), ("999", 100)],
)
def test_positive_int_uses_default_and_bounds(raw, expected: int) -> None:
    assert administration._positive_int(raw, default=25, maximum=100) == expected


@pytest.fixture
def superuser_client(django_user_model):
    user = django_user_model.objects.create_user(
        username="administration-unit-admin",
        is_superuser=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
def test_center_scope_list_returns_forbidden_service_error(
    superuser_client,
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        administration,
        "list_delegated_users",
        lambda **_kwargs: (_ for _ in ()).throw(AccessManagementForbidden("denied")),
    )

    response = superuser_client.get("/api/administration/center-scopes/")

    assert response.status_code == 403
    assert response.json() == {"detail": "denied"}


@pytest.mark.parametrize(
    "error",
    [AccessManagementError("invalid"), ValueError("invalid")],
)
@pytest.mark.django_db
@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
def test_center_scope_assignment_returns_bad_request_for_invalid_mutation(
    superuser_client,
    monkeypatch,
    error: Exception,
) -> None:
    monkeypatch.setattr(
        administration,
        "mutate_center_scope",
        lambda **_kwargs: (_ for _ in ()).throw(error),
    )

    response = superuser_client.post(
        "/api/administration/center-scopes/999/",
        data={"operation": "revoke", "reason": "Access ended"},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "invalid"}


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
)
def test_unassigned_non_superuser_sees_no_transfer_jobs(django_user_model) -> None:
    user = django_user_model.objects.create_user(username="unassigned-user")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/administration/overview/")

    assert response.status_code == 200
    assert cast(Any, response).json()["transfer_monitoring"]["total"] == 0
