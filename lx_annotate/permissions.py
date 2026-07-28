from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rest_framework.permissions import BasePermission

if TYPE_CHECKING:
    from rest_framework.request import Request
    from rest_framework.views import APIView


CENTER_SCOPE_ADMIN_ROLE = "center_scope:admin"
GLOBAL_CENTER_SCOPE_ADMIN_ROLE = "center_scope:global_admin"


def user_has_exact_group(user: Any, group_name: str) -> bool:
    if not bool(getattr(user, "is_authenticated", False)):
        return False
    groups = getattr(user, "groups", None)
    if groups is None:
        return False
    return bool(groups.filter(name=group_name).exists())


def user_has_global_center_scope_admin(user: Any) -> bool:
    """Grant global center administration only through explicit trusted facts."""
    return bool(getattr(user, "is_superuser", False)) or user_has_exact_group(
        user, GLOBAL_CENTER_SCOPE_ADMIN_ROLE
    )


def user_can_administer_center_scope(user: Any) -> bool:
    return user_has_global_center_scope_admin(user) or user_has_exact_group(
        user, CENTER_SCOPE_ADMIN_ROLE
    )


class ExactCenterScopeAdminPermission(BasePermission):
    """Require a superuser or a dedicated Keycloak-synchronized capability."""

    message = "A superuser or an exact center_scope:admin capability is required."

    def has_permission(self, request: "Request", view: "APIView") -> bool:
        del view
        return user_can_administer_center_scope(request.user)
