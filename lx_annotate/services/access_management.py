from __future__ import annotations

import uuid
from typing import Any, Literal, Protocol, cast

from django.contrib.auth import get_user_model
from django.db import transaction
from pydantic import BaseModel, ConfigDict, Field, field_validator

from endoreg_db.models import Center, Examiner, PortalUserInfo
from endoreg_db.models.state.audit_ledger import AuditLedger
from endoreg_db.utils import DJANGO_NAME_SALT, get_examiner_hash

User = get_user_model()


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
    portal_user_info_created: bool
    examiner_created: bool
    reason: str = Field(min_length=1, max_length=1000)
    correlation_id: str = Field(min_length=1, max_length=255)


class CenterScopeMutation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    operation: Literal["assign", "revoke"]
    center_key: str | None = Field(default=None, max_length=255)
    expected_center_key: str | None = Field(max_length=255)
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
    return queryset.filter(user_id=user.pk).first()


def _center_key(portal_info: PortalUserInfo | None) -> str | None:
    examiner = getattr(portal_info, "examiner", None)
    center = getattr(examiner, "center", None)
    return str(center.center_key) if center is not None else None


def assignment_status(portal_info: PortalUserInfo | None) -> str:
    if portal_info is None or getattr(portal_info, "examiner", None) is None:
        return "incomplete"
    return "assigned" if _center_key(portal_info) is not None else "unassigned"


def serialize_user_access(
    user: Any,
    portal_info: PortalUserInfo | None,
    *,
    actor_user_id: int | None = None,
) -> dict[str, Any]:
    center = getattr(getattr(portal_info, "examiner", None), "center", None)
    return {
        "id": int(user.pk),
        "username": _username(user),
        "is_active": bool(user.is_active),
        "roles": sorted(user.groups.values_list("name", flat=True)),
        "can_mutate": actor_user_id is None or int(user.pk) != actor_user_id,
        "assignment_status": assignment_status(portal_info),
        "center": (
            {
                "center_key": str(center.center_key),
                "display_name": str(center.display_name or center.name),
            }
            if center is not None
            else None
        ),
    }


def delegated_center_for_actor(actor: Any) -> Center:
    portal_info = get_portal_info_for_user(actor)
    center = getattr(getattr(portal_info, "examiner", None), "center", None)
    if center is None:
        raise AccessManagementForbidden(
            "Center-scope administrators must have an unambiguous local center assignment."
        )
    return center


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


def list_delegated_users(*, actor: Any, page: int, page_size: int) -> dict[str, Any]:
    is_global_admin = bool(getattr(actor, "is_superuser", False))
    delegated_center = None if is_global_admin else delegated_center_for_actor(actor)
    queryset = User.objects.all()
    if delegated_center is not None:
        queryset = queryset.filter(portaluserinfo__examiner__center=delegated_center)
    queryset = queryset.distinct().prefetch_related("groups").order_by("username", "pk")
    total = queryset.count()
    start = (page - 1) * page_size
    users = list(queryset[start : start + page_size])
    portal_infos = {
        int(getattr(info, "user_id")): info
        for info in PortalUserInfo.objects.select_related("examiner__center").filter(
            user_id__in=[user.pk for user in users]
        )
    }
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
        "centers": [
            {
                "center_key": str(center.center_key),
                "display_name": str(center.display_name or center.name),
            }
            for center in (
                Center.objects.order_by("display_name", "name", "pk")
                if is_global_admin
                else [cast(Center, delegated_center)]
            )
        ],
    }


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

    is_global_admin = bool(getattr(actor, "is_superuser", False))
    delegated_center = None if is_global_admin else delegated_center_for_actor(actor)
    with transaction.atomic():
        target_user = (
            User.objects.select_for_update()
            .prefetch_related("groups")
            .filter(pk=target_user_id)
            .first()
        )
        if target_user is None:
            raise AccessManagementError("Target user was not found.")

        portal_info = (
            PortalUserInfo.objects.select_for_update()
            .filter(user_id=target_user.pk)
            .first()
        )
        portal_user_info_created = False
        examiner_created = False
        examiner_relation = (
            getattr(portal_info, "examiner", None) if portal_info is not None else None
        )
        examiner_pk = getattr(examiner_relation, "pk", None)
        examiner = (
            Examiner.objects.select_for_update()
            .select_related("center")
            .filter(pk=examiner_pk)
            .first()
            if examiner_pk is not None
            else None
        )
        previous_center_key = (
            str(examiner.center.center_key)
            if examiner is not None and examiner.center is not None
            else None
        )
        if previous_center_key != mutation.expected_center_key:
            raise AccessManagementConflict(
                "Center assignment changed since it was loaded. Refresh and try again."
            )
        if delegated_center is not None and previous_center_key != str(
            delegated_center.center_key
        ):
            raise AccessManagementForbidden(
                "Target user is outside the administrator's delegated center."
            )

        if mutation.operation == "assign":
            if not mutation.center_key:
                raise AccessManagementError("center_key is required for assignment.")
            if delegated_center is not None and mutation.center_key != str(
                delegated_center.center_key
            ):
                raise AccessManagementForbidden(
                    "Requested center is outside the administrator's delegated center."
                )
            selected_center = (
                Center.objects.select_for_update()
                .filter(center_key=mutation.center_key)
                .first()
            )
            if selected_center is None:
                raise AccessManagementError("Center was not found.")
            if examiner is None:
                if not is_global_admin:
                    raise AccessManagementForbidden(
                        "Only a global administrator may provision an incomplete "
                        "PortalUserInfo/Examiner relationship."
                    )
                if portal_info is None:
                    portal_info = PortalUserInfo.objects.create(user=target_user)
                    portal_user_info_created = True
                examiner = _create_portal_examiner(
                    target_user=target_user,
                    center=selected_center,
                )
                examiner_created = True
                portal_info.examiner = examiner
                portal_info.save(update_fields=["examiner"])
            new_center_key: str | None = str(selected_center.center_key)
            new_center_id: int | None = int(selected_center.pk)
        else:
            if mutation.center_key is not None:
                raise AccessManagementError(
                    "center_key must be omitted for revocation."
                )
            if examiner is None or portal_info is None:
                raise AccessManagementError(
                    "Target user has no center assignment to revoke."
                )
            new_center_key = None
            new_center_id = None

        changed = previous_center_key != new_center_key
        if portal_info is None or examiner is None:
            raise RuntimeError(
                "Center assignment relationship was not established transactionally."
            )
        if changed:
            cast(Any, examiner).center_id = new_center_id
            examiner.save(update_fields=["center"])

            audit_payload = AccessManagementAuditPayload(
                actor_user_id=int(actor.pk),
                actor_username=_username(actor),
                target_user_id=int(target_user.pk),
                target_username=_username(target_user),
                previous_center_key=previous_center_key,
                new_center_key=new_center_key,
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
                raise RuntimeError(
                    "Durable audit ledger write failed; center update aborted."
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
