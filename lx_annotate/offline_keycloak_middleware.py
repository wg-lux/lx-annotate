import json
import requests
import logging
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)

class OfflineKeycloakUser:
    """User-Objekt basierend auf offline-validierten Keycloak-Token"""
    
    def __init__(self, token_data):
        self.token_data = token_data
        self.user_data = token_data.get('user', {})
        self.is_authenticated = True
        self.is_anonymous = False
        
    @property
    def id(self):
        return self.user_data.get('id')
        
    @property
    def username(self):
        return self.user_data.get('username', 'keycloak_user')
        
    @property
    def email(self):
        return self.user_data.get('email')
        
    @property
    def first_name(self):
        return self.user_data.get('firstName', '')
        
    @property
    def last_name(self):
        return self.user_data.get('lastName', '')
        
    @property
    def roles(self):
        return self.user_data.get('roles', [])
        
    @property
    def groups(self):
        return self.user_data.get('groups', [])
        
    def has_role(self, role):
        return role in self.roles
        
    def has_group(self, group):
        return group in self.groups
        
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

class OfflineKeycloakMiddleware:
    """
    Middleware für Offline-Token-Validierung mit keycloak-backend
    Nutzt lokalen Node.js-Service anstatt Remote-Requests zu Keycloak
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.token_validator_url = getattr(
            settings, 
            'TOKEN_VALIDATOR_URL', 
            'http://localhost:3001'
        )
        logger.info(f"🔐 OfflineKeycloakMiddleware initialized with validator URL: {self.token_validator_url}")

    def __call__(self, request):
        # Token aus Authorization Header extrahieren
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
            try:
                # Offline-Validierung über lokalen Service
                validation_result = self._validate_token_offline(token)
                
                if validation_result and validation_result.get('valid'):
                    logger.debug(f"✅ Token validation successful for user: {validation_result['user']['username']}")
                    request.user = OfflineKeycloakUser(validation_result)
                    request.keycloak_token = validation_result['token']
                else:
                    logger.warning("❌ Token validation failed")
                    request.user = AnonymousUser()
                    
            except Exception as e:
                logger.error(f"🚨 Token validation error: {e}")
                request.user = AnonymousUser()
        else:
            request.user = AnonymousUser()

        response = self.get_response(request)
        return response

    def _validate_token_offline(self, token):
        """
        Validiert Token über lokalen Node.js-Service mit keycloak-backend
        Viel effizienter als Remote-Requests zu Keycloak bei jeder Anfrage
        """
        try:
            response = requests.post(
                f"{self.token_validator_url}/validate-token",
                json={'accessToken': token},
                timeout=5,  # Schnelle lokale Anfrage
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Token validation service returned {response.status_code}: {response.text}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"🚨 Failed to connect to token validation service: {e}")
            # Fallback: Service nicht verfügbar
            return None

    def process_exception(self, request, exception):
        """Handle exceptions during token validation"""
        logger.error(f"🚨 OfflineKeycloakMiddleware exception: {exception}")
        return None