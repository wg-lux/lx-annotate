from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
import requests
import jwt
from jwt.exceptions import InvalidTokenError
import logging

logger = logging.getLogger(__name__)


class KeycloakUser:
    """
    Simple user class for Keycloak users
    """

    def __init__(self, token_data):
        self.token_data = token_data
        self.username = token_data.get("preferred_username", "unknown")
        self.email = token_data.get("email", "")
        self.first_name = token_data.get("given_name", "")
        self.last_name = token_data.get("family_name", "")
        self.roles = token_data.get("realm_access", {}).get("roles", [])
        self.groups = token_data.get("groups", [])
        self.is_authenticated = True
        self.is_active = True
        self.is_staff = "admin" in self.roles
        self.is_superuser = "admin" in self.roles

    def __str__(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class KeycloakAuthentication(BaseAuthentication):
    """
    Keycloak JWT Token Authentication for Django REST Framework
    """

    def authenticate(self, request):
        """
        Authenticates user based on Bearer token
        """
        auth_header = request.META.get("HTTP_AUTHORIZATION")

        if not auth_header:
            return None

        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]

        try:
            user_data = self.validate_token(token)
            if user_data:
                user = KeycloakUser(user_data)
                return (user, token)
        except Exception as e:
            logger.error(f"Keycloak authentication failed: {e}")
            raise AuthenticationFailed("Invalid token")

        return None

    def validate_token(self, token):
        """
        Validates JWT token with Keycloak
        """
        try:
            # For development: Skip signature verification
            if settings.DEBUG:
                logger.warning(
                    "Development mode: Skipping token signature verification"
                )
                decoded_token = jwt.decode(token, options={"verify_signature": False})
                return decoded_token

            # Production: Validate with Keycloak public key
            public_key = self.get_keycloak_public_key()
            if not public_key:
                raise AuthenticationFailed("Unable to verify token signature")

            decoded_token = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=settings.KEYCLOAK_CLIENT_ID,
                issuer=f"{settings.KEYCLOAK_SERVER_URL}/realms/{settings.KEYCLOAK_REALM}",
            )

            return decoded_token

        except InvalidTokenError as e:
            logger.error(f"JWT validation failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return None

    def get_keycloak_public_key(self):
        """
        Fetches public key from Keycloak for token verification
        """
        try:
            jwks_url = f"{settings.KEYCLOAK_SERVER_URL}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/certs"

            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()

            jwks = response.json()

            if jwks.get("keys"):
                key_data = jwks["keys"][0]

                from cryptography.hazmat.primitives import serialization
                from cryptography.hazmat.primitives.asymmetric import rsa
                import base64

                n = base64.urlsafe_b64decode(key_data["n"] + "==")
                e = base64.urlsafe_b64decode(key_data["e"] + "==")

                public_numbers = rsa.RSAPublicNumbers(
                    int.from_bytes(e, "big"), int.from_bytes(n, "big")
                )

                public_key = public_numbers.public_key()
                pem = public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo,
                )

                return pem

        except Exception as e:
            logger.error(f"Error fetching Keycloak public key: {e}")
            return None

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
