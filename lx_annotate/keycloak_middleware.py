import requests
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from django.shortcuts import redirect


class KeycloakUser:
    """Mock user object that behaves like Django's User model"""
    def __init__(self, user_info):
        self.preferred_username = user_info.get('preferred_username', 'unknown')
        self.email = user_info.get('email', '')
        self.first_name = user_info.get('given_name', '')
        self.last_name = user_info.get('family_name', '')
        self.is_authenticated = True
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False
        
    def __str__(self):
        return self.preferred_username


class KeycloakMiddleware:
    """
    Middleware that validates Keycloak tokens from session and injects user info.
    This prevents the redirect loop by properly authenticating users after callback.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip middleware for login/callback URLs to prevent recursion
        if request.path in ['/login/', '/login/callback/', '/admin/', '/api/csrf/']:
            return self.get_response(request)
            
        # Check if user has access token in session
        access_token = request.session.get('access_token')
        
        if access_token:
            # Validate token with Keycloak userinfo endpoint
            user_info = self.validate_token(access_token)
            if user_info:
                # Inject authenticated user
                request.user = KeycloakUser(user_info)
                return self.get_response(request)
            else:
                # Token invalid, clear session
                request.session.flush()
        
        # No valid token, redirect to login for protected routes
        if self.is_protected_route(request.path):
            return redirect('/login/')
            
        # Allow access to unprotected routes
        request.user = AnonymousUser()
        return self.get_response(request)
    
    def validate_token(self, access_token):
        """Validate token with Keycloak userinfo endpoint"""
        try:
            userinfo_url = f"{settings.KEYCLOAK_SERVER_URL}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/userinfo"
            headers = {'Authorization': f'Bearer {access_token}'}
            
            response = requests.get(userinfo_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Token validation failed: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            print(f"Token validation error: {e}")
            return None
    
    def is_protected_route(self, path):
        """Define which routes require authentication"""
        protected_routes = [
            '/media/',
            '/api/',
            '/admin/',
        ]
        
        return any(path.startswith(route) for route in protected_routes)