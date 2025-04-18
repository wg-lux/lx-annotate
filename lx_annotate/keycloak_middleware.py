from django.shortcuts import redirect
from keycloak import KeycloakOpenID
from django.conf import settings

class KeycloakMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.keycloak_openid = KeycloakOpenID(
            server_url=settings.KEYCLOAK_SERVER_URL,
            client_id=settings.KEYCLOAK_CLIENT_ID,
            realm_name=settings.KEYCLOAK_REALM,
            client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
            verify=True
        )

    def __call__(self, request):
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        token = request.headers.get('Authorization', '').split('Bearer ')[-1]
        if not token:
            return redirect('/login/')

        try:
            user_info = self.keycloak_openid.userinfo(token)
            request.user = user_info
        except Exception:
            return redirect('/login/')

        return self.get_response(request)