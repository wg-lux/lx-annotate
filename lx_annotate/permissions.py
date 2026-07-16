from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rest_framework.permissions import BasePermission

if TYPE_CHECKING:
    from rest_framework.request import Request
    from rest_framework.views import APIView


CENTER_SCOPE_ADMIN_ROLE = "center_scope:admin"


def user_has_exact_group(user: Any, group_name: str) -> bool:
    if not bool(getattr(user, "is_authenticated", False)):
        return False
    groups = getattr(user, "groups", None)
    if groups is None:
        return False
    return bool(groups.filter(name=group_name).exists())


class ExactCenterScopeAdminPermission(BasePermission):
    """Require the dedicated center-scope role without compatibility overrides."""

    message = "The exact center_scope:admin role is required."

    def has_permission(self, request: "Request", view: "APIView") -> bool:
        del view
        return user_has_exact_group(request.user, CENTER_SCOPE_ADMIN_ROLE)
