## Overview

The lx-annotate application implements a comprehensive Keycloak authentication system with both frontend and backend components, featuring JWT token validation, middleware-based authentication, and offline token validation capabilities.

## Architecture Components

### 1. Frontend Integration (TypeScript/JavaScript)

**Files:** `frontend/src/services/keycloak.ts`, `frontend/src/services/keycloak.js`

The frontend uses the `keycloak-js` library for client-side authentication:

```typescript
const keycloak = new Keycloak({
  url: keycloakUrl,
  realm: keycloakRealm,
  clientId: keycloakClientId
});
```

**Key Features:**
- **Environment Configuration**: Uses Vite environment variables for configuration
- **PKCE Support**: Implements PKCE (S256) for enhanced security
- **Silent Check SSO**: Supports silent authentication checks with iframe fallback
- **Automatic Token Refresh**: Refreshes tokens every 60 seconds with 70-second validity buffer

**Initialization Options:**
- `onLoad: 'check-sso'` - Checks if user is already authenticated
- `checkLoginIframe: true` - Enables iframe-based session management
- `silentCheckSsoFallback: true` - Fallback for blocked third-party cookies

### 2. Backend Authentication (Django/Python)

**File:** `lx_annotate/keycloak_auth.py`

#### KeycloakUser Class
Custom user implementation that maps Keycloak JWT token data to Django user interface:

```python
class KeycloakUser:
    def __init__(self, token_data):
        self.username = token_data.get('preferred_username', 'unknown')
        self.email = token_data.get('email', '')
        self.roles = token_data.get('realm_access', {}).get('roles', [])
        self.groups = token_data.get('groups', [])
        self.is_staff = 'admin' in self.roles
        self.is_superuser = 'admin' in self.roles
```

#### KeycloakAuthentication Class
Django REST Framework authentication backend:

**Token Validation Process:**
1. **Development Mode**: Skips signature verification for debugging
2. **Production Mode**: Full JWT validation with Keycloak public key
3. **Public Key Retrieval**: Fetches JWKS from Keycloak's certificate endpoint
4. **JWT Verification**: Validates signature, audience, and issuer

**Key Methods:**
- `authenticate()`: Extracts and validates Bearer tokens
- `validate_token()`: Performs JWT validation with environment-specific logic
- `get_keycloak_public_key()`: Retrieves RSA public key from Keycloak JWKS endpoint

### 3. Middleware Components

#### KeycloakMiddleware
**File:** `lx_annotate/keycloak_middleware.py`

Session-based authentication middleware that:
- Validates tokens stored in Django sessions
- Redirects unauthenticated users to login for protected routes
- Injects user information into requests
- Handles token expiration gracefully

**Protected Routes:**
- `/media/` - Media files
- `/api/` - API endpoints
- `/admin/` - Admin interface

#### OfflineKeycloakMiddleware
**File:** `lx_annotate/offline_keycloak_middleware.py`

Advanced middleware for offline token validation using a local Node.js service:
- Reduces external API calls to Keycloak
- Improves performance with local token validation
- Supports comprehensive user data extraction
- Implements role and group-based authorization

### 4. Configuration Management

#### Environment Variables

**Frontend (Vite):**
```javascript
VITE_KEYCLOAK_URL=https://keycloak.endo-reg.net
VITE_KEYCLOAK_REALM=master
VITE_KEYCLOAK_CLIENT_ID=lx-frontend
```

**Backend (Django):**
```python
KEYCLOAK_SERVER_URL=https://keycloak-endoreg.net
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=lx-frontend
KEYCLOAK_CLIENT_SECRET=<secret>
```

#### Settings Integration
**File:** `lx_annotate/settings_backup.py`

Production configuration with environment variable support and debug logging for Keycloak settings.

### 5. Token Validation Service

**File:** `start-token-validator.sh`

Standalone Node.js service for offline token validation:
- Runs on configurable port (default: 3001)
- Validates tokens without external Keycloak calls
- Supports batch token validation
- Provides REST API for token verification

## Security Features

### JWT Token Validation
- **Algorithm**: RS256 (RSA with SHA-256)
- **Signature Verification**: Uses Keycloak's public key from JWKS endpoint
- **Audience Validation**: Ensures tokens are intended for the correct client
- **Issuer Verification**: Validates token origin from correct Keycloak realm

### Development vs Production
- **Development**: Signature verification disabled for easier debugging
- **Production**: Full cryptographic validation enabled
- **Logging**: Comprehensive error logging for authentication failures

### PKCE Implementation
- **Method**: S256 (SHA256-based PKCE)
- **Purpose**: Prevents authorization code interception attacks
- **Client Type**: Public client protection

## Integration Patterns

### Request Flow
1. **Frontend**: User authenticates via Keycloak
2. **Token Storage**: Access token stored in session/memory
3. **API Requests**: Bearer token sent in Authorization header
4. **Backend Validation**: Django middleware validates JWT
5. **User Injection**: Authenticated user object created from token claims

### Error Handling
- **Invalid Tokens**: Return 401 Unauthorized
- **Network Failures**: Graceful degradation with logging
- **Token Expiration**: Automatic refresh on frontend
- **Configuration Errors**: Detailed logging for troubleshooting

## Deployment Considerations

### Docker Configuration
**File:** `frontend/Dockerfile`

Multi-stage build with production environment variables:
- Build-time Keycloak configuration
- Nginx-based serving
- Environment-specific settings injection

### Token Refresh Strategy
- **Refresh Interval**: Every 60 seconds
- **Token Validity Buffer**: 70 seconds
- **Failure Handling**: Silent failures with console logging
- **Session Management**: Iframe-based session monitoring

This implementation provides a robust, scalable Keycloak integration suitable for production environments while maintaining development flexibility.