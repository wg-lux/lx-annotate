from __future__ import annotations

import uuid
from typing import Any, Literal, Protocol, cast

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist
from django.db import models, transaction
from endoreg_db.models import Center, Examiner, PortalUserInfo
from endoreg_db.models.state.audit_ledger import AuditLedger
from endoreg_db.utils import DJANGO_NAME_SALT, get_examiner_hash
from pydantic import BaseModel, ConfigDict, Field, field_validator

from lx_annotate.permissions import user_has_global_center_scope_admin

User = get_user_model()


def _has_plural_center_scope() -> bool:
    try:
        PortalUserInfo._meta.get_field("centers")
    except FieldDoesNotExist:
        return False
    return True


class _UserWithUsername(Protocol):
    username: str


def _username(user: object) -> str:
    return str(cast(_UserWithUsername, user).username)


class AccessManagementError(Exception):
    pass


class AccessManagementConflict(AccessManagementError):
    pass


class AccessManagementForbidden(AccessManagementError):
    pass


class AccessManagementAuditPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    actor_user_id: int
    actor_username: str
    target_user_id: int
    target_username: str
    previous_center_key: str | None
    new_center_key: str | None
    previous_center_keys: tuple[str, ...]
    new_center_keys: tuple[str, ...]
    portal_user_info_created: bool
    examiner_created: bool
    reason: str = Field(min_length=1, max_length=1000)
    correlation_id: str = Field(min_length=1, max_length=255)


class CenterScopeMutation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    operation: Literal["assign", "revoke"]
    center_key: str | None = Field(default=None, max_length=255)
    expected_center_key: str | None = Field(default=None, max_length=255)
    expected_center_keys: frozenset[str] | None = None
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("reason must not be blank")
        return normalized


def get_portal_info_for_user(user: Any) -> PortalUserInfo | None:
    queryset = PortalUserInfo.objects.select_related("examiner__center")
    if _has_plural_center_scope():
        queryset = queryset.prefetch_related("centers")
    return queryset.filter(user_id=user.pk).first()


def _centers(portal_info: PortalUserInfo | None) -> list[Center]:
    if portal_info is None:
        return []
    centers_by_id: dict[int, Center] = {}
    if _has_plural_center_scope():
        centers_by_id.update(
            {int(center.pk): center for center in cast(Any, portal_info).centers.all()}
        )
    legacy_center = getattr(getattr(portal_info, "examiner", None), "center", None)
    if legacy_center is not None:
        centers_by_id.setdefault(int(legacy_center.pk), legacy_center)
    return sorted(
        centers_by_id.values(),
        key=lambda center: (str(center.display_name or center.name), int(center.pk)),
    )


def _center_keys(portal_info: PortalUserInfo | None) -> tuple[str, ...]:
    return tuple(sorted(str(center.center_key) for center in _centers(portal_info)))


def assignment_status(portal_info: PortalUserInfo | None) -> str:
    if portal_info is None:
        return "incomplete"
    return "assigned" if _center_keys(portal_info) else "unassigned"


def serialize_user_access(
    user: Any,
    portal_info: PortalUserInfo | None,
    *,
    actor_user_id: int | None = None,
) -> dict[str, Any]:
    centers = _centers(portal_info)
    return {
        "id": int(user.pk),
        "username": _username(user),
        "is_active": bool(user.is_active),
        "roles": sorted(user.groups.values_list("name", flat=True)),
        "can_mutate": actor_user_id is None or int(user.pk) != actor_user_id,
        "assignment_status": assignment_status(portal_info),
        "centers": [
            {
                "center_key": str(center.center_key),
                "display_name": str(center.display_name or center.name),
            }
            for center in centers
        ],
        # Transitional single-center representation for older clients.
        "center": (
            {
                "center_key": str(centers[0].center_key),
                "display_name": str(centers[0].display_name or centers[0].name),
            }
            if len(centers) == 1
            else None
        ),
    }


def delegated_center_for_actor(actor: Any) -> Center:
    portal_info = get_portal_info_for_user(actor)
    centers = _centers(portal_info)
    if len(centers) != 1:
        raise AccessManagementForbidden(
            "Center-scope administrators must have an unambiguous local center assignment."
        )
    return centers[0]


def _create_portal_examiner(*, target_user: Any, center: Center) -> Examiner:
    """Create a non-PHI examiner identity used only for local center scoping."""
    username = _username(target_user)
    target_user_id = int(target_user.pk)
    identity_seed = f"oidc-user-{target_user_id}"
    examiner_hash = get_examiner_hash(
        first_name=identity_seed,
        last_name=username,
        center_name=str(center.center_key),
        salt=DJANGO_NAME_SALT,
    )
    return Examiner.objects.create(
        first_name="Portal",
        last_name=f"User-{target_user_id}",
        center=None,
        hash=examiner_hash,
        is_real_person=False,
    )


def _delegated_user_queryset(delegated_center: Center | None):
    queryset = User.objects.all()
    if delegated_center is not None:
        center_filter = models.Q(portaluserinfo__examiner__center=delegated_center)
        if _has_plural_center_scope():
            center_filter |= models.Q(portaluserinfo__centers=delegated_center)
        queryset = queryset.filter(center_filter)
    return queryset.distinct().prefetch_related("groups").order_by("username", "pk")


def _portal_infos_by_user(users: list[Any]) -> dict[int, PortalUserInfo]:
    queryset = PortalUserInfo.objects.select_related("examiner__center")
    if _has_plural_center_scope():
        queryset = queryset.prefetch_related("centers")
    return {
        int(getattr(info, "user_id")): info
        for info in queryset.filter(user_id__in=[user.pk for user in users])
    }


def _available_centers(
    *,
    is_global_admin: bool,
    delegated_center: Center | None,
) -> list[dict[str, str]]:
    centers = (
        Center.objects.order_by("display_name", "name", "pk")
        if is_global_admin
        else [cast(Center, delegated_center)]
    )
    return [
        {
            "center_key": str(center.center_key),
            "display_name": str(center.display_name or center.name),
        }
        for center in centers
    ]


def list_delegated_users(*, actor: Any, page: int, page_size: int) -> dict[str, Any]:
    is_global_admin = user_has_global_center_scope_admin(actor)
    delegated_center = None if is_global_admin else delegated_center_for_actor(actor)
    queryset = _delegated_user_queryset(delegated_center)
    total = queryset.count()
    start = (page - 1) * page_size
    users = list(queryset[start : start + page_size])
    portal_infos = _portal_infos_by_user(users)
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "users": [
            serialize_user_access(
                user,
                portal_infos.get(user.pk),
                actor_user_id=int(actor.pk),
            )
            for user in users
        ],
        "centers": _available_centers(
            is_global_admin=is_global_admin,
            delegated_center=delegated_center,
        ),
    }


def _locked_target_user(target_user_id: int) -> Any:
    target_user = (
        User.objects.select_for_update()
        .prefetch_related("groups")
        .filter(pk=target_user_id)
        .first()
    )
    if target_user is None:
        raise AccessManagementError("Target user was not found.")
    return target_user


def _locked_portal_info(target_user: Any) -> PortalUserInfo | None:
    queryset = PortalUserInfo.objects.select_for_update()
    if _has_plural_center_scope():
        queryset = queryset.prefetch_related("centers")
    return queryset.filter(user_id=target_user.pk).first()


def _locked_examiner(portal_info: PortalUserInfo | None) -> Examiner | None:
    relation = (
        getattr(portal_info, "examiner", None) if portal_info is not None else None
    )
    examiner_pk = getattr(relation, "pk", None)
    if examiner_pk is None:
        return None
    examiner = (
        Examiner.objects.select_for_update()
        .select_related("center")
        .filter(pk=examiner_pk)
        .first()
    )
    if portal_info is not None and examiner is not None:
        portal_info.examiner = examiner
    return examiner


def _expected_center_keys(mutation: CenterScopeMutation) -> tuple[str, ...]:
    if mutation.expected_center_keys is not None:
        return tuple(sorted(mutation.expected_center_keys))
    if mutation.expected_center_key is not None:
        return (mutation.expected_center_key,)
    return ()


def _validate_mutation_scope(
    *,
    previous_center_keys: tuple[str, ...],
    expected_center_keys: tuple[str, ...],
    delegated_center_key: str | None,
) -> None:
    if previous_center_keys != expected_center_keys:
        raise AccessManagementConflict(
            "Center assignment changed since it was loaded. Refresh and try again."
        )
    if (
        delegated_center_key is not None
        and delegated_center_key not in previous_center_keys
    ):
        raise AccessManagementForbidden(
            "Target user is outside the administrator's delegated center."
        )


def _prepare_assign_operation(
    *,
    target_user: Any,
    portal_info: PortalUserInfo | None,
    selected_center_key: str | None,
    delegated_center_key: str | None,
    is_global_admin: bool,
) -> tuple[PortalUserInfo, str, bool]:
    if not selected_center_key:
        raise AccessManagementError("center_key is required for assignment.")
    if delegated_center_key is not None and selected_center_key != delegated_center_key:
        raise AccessManagementForbidden(
            "Requested center is outside the administrator's delegated center."
        )
    if portal_info is None:
        if not is_global_admin:
            raise AccessManagementForbidden(
                "Only a global administrator may provision an incomplete "
                "PortalUserInfo relationship."
            )
        return (
            PortalUserInfo.objects.create(user=target_user),
            selected_center_key,
            True,
        )
    return portal_info, selected_center_key, False


def _prepare_revoke_operation(
    *,
    portal_info: PortalUserInfo | None,
    selected_center_key: str | None,
    previous_center_keys: tuple[str, ...],
) -> tuple[PortalUserInfo, str, bool]:
    if portal_info is None or not previous_center_keys:
        raise AccessManagementError("Target user has no center assignment to revoke.")
    if selected_center_key is None:
        if len(previous_center_keys) != 1:
            raise AccessManagementError(
                "center_key is required when revoking one of multiple centers."
            )
        selected_center_key = previous_center_keys[0]
    return portal_info, selected_center_key, False


def _prepare_assignment(
    *,
    target_user: Any,
    portal_info: PortalUserInfo | None,
    mutation: CenterScopeMutation,
    previous_center_keys: tuple[str, ...],
    delegated_center_key: str | None,
    is_global_admin: bool,
) -> tuple[PortalUserInfo, str, bool]:
    if mutation.operation == "assign":
        return _prepare_assign_operation(
            target_user=target_user,
            portal_info=portal_info,
            selected_center_key=mutation.center_key,
            delegated_center_key=delegated_center_key,
            is_global_admin=is_global_admin,
        )
    return _prepare_revoke_operation(
        portal_info=portal_info,
        selected_center_key=mutation.center_key,
        previous_center_keys=previous_center_keys,
    )


def _locked_center(center_key: str) -> Center:
    center = Center.objects.select_for_update().filter(center_key=center_key).first()
    if center is None:
        raise AccessManagementError("Center was not found.")
    return center


def _ensure_portal_examiner(
    *,
    target_user: Any,
    portal_info: PortalUserInfo,
    examiner: Examiner | None,
    selected_center: Center,
    portal_user_info_created: bool,
    is_global_admin: bool,
    operation: Literal["assign", "revoke"],
) -> tuple[Examiner | None, bool]:
    should_create = (
        operation == "assign"
        and examiner is None
        and (portal_user_info_created or not _has_plural_center_scope())
        and is_global_admin
    )
    if not should_create:
        return examiner, False
    examiner = _create_portal_examiner(
        target_user=target_user,
        center=selected_center,
    )
    portal_info.examiner = examiner
    portal_info.save(update_fields=["examiner"])
    return examiner, True


def _desired_center_keys(
    *,
    previous_center_keys: tuple[str, ...],
    selected_center: Center,
    operation: Literal["assign", "revoke"],
) -> tuple[str, ...]:
    desired_center_keys = set(previous_center_keys)
    selected_center_key = str(selected_center.center_key)
    if operation == "assign":
        if _has_plural_center_scope():
            desired_center_keys.add(selected_center_key)
        else:
            desired_center_keys = {selected_center_key}
    else:
        desired_center_keys.discard(selected_center_key)
    return tuple(sorted(desired_center_keys))


def _apply_center_scope(
    *,
    portal_info: PortalUserInfo,
    examiner: Examiner | None,
    new_center_keys: tuple[str, ...],
) -> None:
    desired_centers = list(
        Center.objects.filter(center_key__in=new_center_keys).order_by("pk")
    )
    if len(desired_centers) != len(new_center_keys):
        raise RuntimeError("A center disappeared during the locked mutation.")
    if _has_plural_center_scope():
        cast(Any, portal_info).centers.set(desired_centers)
    if examiner is None:
        return

    legacy_center = getattr(examiner, "center", None)
    legacy_center_key = (
        str(legacy_center.center_key) if legacy_center is not None else None
    )
    if legacy_center_key not in new_center_keys:
        cast(Any, examiner).center_id = (
            int(desired_centers[0].pk) if desired_centers else None
        )
        examiner.save(update_fields=["center"])


def _write_center_scope_audit(
    *,
    actor: Any,
    target_user: Any,
    portal_info: PortalUserInfo,
    mutation: CenterScopeMutation,
    correlation_id: str | None,
    previous_center_keys: tuple[str, ...],
    new_center_keys: tuple[str, ...],
    portal_user_info_created: bool,
    examiner_created: bool,
) -> None:
    audit_payload = AccessManagementAuditPayload(
        actor_user_id=int(actor.pk),
        actor_username=_username(actor),
        target_user_id=int(target_user.pk),
        target_username=_username(target_user),
        previous_center_key=(
            previous_center_keys[0] if len(previous_center_keys) == 1 else None
        ),
        new_center_key=new_center_keys[0] if len(new_center_keys) == 1 else None,
        previous_center_keys=previous_center_keys,
        new_center_keys=new_center_keys,
        portal_user_info_created=portal_user_info_created,
        examiner_created=examiner_created,
        reason=mutation.reason.strip(),
        correlation_id=(correlation_id or str(uuid.uuid4())).strip(),
    )
    entry = AuditLedger.objects.create(
        user=actor,
        object_type="PortalUserInfo",
        object_pk=str(portal_info.pk),
        action="center_scope_changed",
        data=audit_payload.model_dump(mode="json"),
    )
    if entry.pk is None or not AuditLedger.objects.filter(pk=entry.pk).exists():
        raise RuntimeError("Durable audit ledger write failed; center update aborted.")


def mutate_center_scope(
    *,
    actor: Any,
    target_user_id: int,
    mutation: CenterScopeMutation,
    correlation_id: str | None,
) -> dict[str, Any]:
    if int(actor.pk) == int(target_user_id):
        raise AccessManagementForbidden(
            "Administrators cannot change their own center scope."
        )

    is_global_admin = user_has_global_center_scope_admin(actor)
    delegated_center = None if is_global_admin else delegated_center_for_actor(actor)
    with transaction.atomic():
        target_user = _locked_target_user(target_user_id)
        portal_info = _locked_portal_info(target_user)
        examiner = _locked_examiner(portal_info)
        previous_center_keys = _center_keys(portal_info)
        delegated_center_key = (
            str(delegated_center.center_key) if delegated_center is not None else None
        )
        _validate_mutation_scope(
            previous_center_keys=previous_center_keys,
            expected_center_keys=_expected_center_keys(mutation),
            delegated_center_key=delegated_center_key,
        )
        portal_info, selected_center_key, portal_user_info_created = (
            _prepare_assignment(
                target_user=target_user,
                portal_info=portal_info,
                mutation=mutation,
                previous_center_keys=previous_center_keys,
                delegated_center_key=delegated_center_key,
                is_global_admin=is_global_admin,
            )
        )
        selected_center = _locked_center(selected_center_key)
        examiner, examiner_created = _ensure_portal_examiner(
            target_user=target_user,
            portal_info=portal_info,
            examiner=examiner,
            selected_center=selected_center,
            portal_user_info_created=portal_user_info_created,
            is_global_admin=is_global_admin,
            operation=mutation.operation,
        )
        new_center_keys = _desired_center_keys(
            previous_center_keys=previous_center_keys,
            selected_center=selected_center,
            operation=mutation.operation,
        )
        changed = previous_center_keys != new_center_keys
        if changed:
            _apply_center_scope(
                portal_info=portal_info,
                examiner=examiner,
                new_center_keys=new_center_keys,
            )
            _write_center_scope_audit(
                actor=actor,
                target_user=target_user,
                portal_info=portal_info,
                mutation=mutation,
                correlation_id=correlation_id,
                previous_center_keys=previous_center_keys,
                new_center_keys=new_center_keys,
                portal_user_info_created=portal_user_info_created,
                examiner_created=examiner_created,
            )

        portal_info = get_portal_info_for_user(target_user)
        return {
            "changed": changed,
            "user": serialize_user_access(
                target_user,
                portal_info,
                actor_user_id=int(actor.pk),
            ),
        }
