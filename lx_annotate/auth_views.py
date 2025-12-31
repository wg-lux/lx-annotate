from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(["GET"])
@permission_classes([AllowAny])
def user_status(request):
    """
    Check if user is authenticated via Keycloak
    """
    if hasattr(request, "user") and request.user.is_authenticated:
        return Response(
            {
                "is_authenticated": True,
                "username": request.user.username,
                "groups": getattr(request.user, "roles", []),  # Keycloak uses roles
            }
        )

    return Response({"is_authenticated": False})


@api_view(["GET"])
def current_user(request):
    """
    Get current authenticated user info
    """
    if not request.user.is_authenticated:
        return Response(
            {"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED
        )

    return Response(
        {
            "id": getattr(request.user, "id", None),
            "username": request.user.username,
            "email": getattr(request.user, "email", ""),
            "groups": getattr(request.user, "roles", []),
            "is_staff": getattr(request.user, "is_staff", False),
            "is_active": getattr(request.user, "is_active", True),
        }
    )
