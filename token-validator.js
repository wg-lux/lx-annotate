const Keycloak = require('keycloak-backend');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Keycloak-Konfiguration
const keycloak = new Keycloak({
  "realm": process.env.KEYCLOAK_REALM || "master",
  "keycloak-server": process.env.KEYCLOAK_SERVER_URL || "https://keycloak.endo-reg.net",
  "client_id": process.env.KEYCLOAK_CLIENT_ID || "lx-frontend",
  "client_secret": process.env.KEYCLOAK_CLIENT_SECRET || "FmXqjdtoZLidEMqfeZ7Jqap4L5CTw72E"
});

// Offline Token-Validierung Endpoint
app.post('/validate-token', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Missing access token',
        valid: false 
      });
    }

    console.log('🔍 Validating token offline...');
    
    // Offline-Validierung ohne Remote-Request
    const cert = await keycloak.jwt.getCert();
    const token = await keycloak.jwt.verifyOffline(accessToken, cert);
    
    console.log('✅ Token validation successful');
    console.log('👤 User info:', {
      username: token.preferred_username,
      email: token.email,
      sub: token.sub,
      roles: token.realm_access?.roles || [],
      groups: token.groups || []
    });

    res.json({
      valid: true,
      token: token,
      user: {
        id: token.sub,
        username: token.preferred_username,
        email: token.email,
        firstName: token.given_name,
        lastName: token.family_name,
        roles: token.realm_access?.roles || [],
        groups: token.groups || [],
        // Token-Informationen
        exp: token.exp,
        iat: token.iat,
        iss: token.iss
      }
    });
    
  } catch (error) {
    console.error('🚨 Token validation failed:', error.message);
    
    res.status(401).json({
      valid: false,
      error: error.message,
      code: 'INVALID_TOKEN'
    });
  }
});

// Health-Check Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'keycloak-token-validator',
    timestamp: new Date().toISOString()
  });
});

// Keycloak-Konfiguration Info
app.get('/config', (req, res) => {
  res.json({
    realm: keycloak.config.realm,
    serverUrl: keycloak.config['keycloak-server'],
    clientId: keycloak.config.client_id
  });
});

const PORT = process.env.TOKEN_VALIDATOR_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🔐 Keycloak Token Validator running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Token validation: POST http://localhost:${PORT}/validate-token`);
  console.log(`⚙️  Configuration: http://localhost:${PORT}/config`);
});

module.exports = app;