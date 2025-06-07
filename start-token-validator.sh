#!/bin/bash

# Startup script für den Keycloak Token Validator Service

echo "🔐 Starting Keycloak Token Validator Service..."

# Prüfe ob Node.js verfügbar ist
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Prüfe ob npm packages installiert sind
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Environment-Variablen setzen (falls nicht bereits gesetzt)
export KEYCLOAK_REALM="${KEYCLOAK_REALM:-master}"
export KEYCLOAK_SERVER_URL="${KEYCLOAK_SERVER_URL:-https://keycloak.endo-reg.net}"
export KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-lx-frontend}"
export KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-FmXqjdtoZLidEMqfeZ7Jqap4L5CTw72E}"
export TOKEN_VALIDATOR_PORT="${TOKEN_VALIDATOR_PORT:-3001}"

echo "⚙️  Configuration:"
echo "   Realm: $KEYCLOAK_REALM"
echo "   Server: $KEYCLOAK_SERVER_URL"
echo "   Client ID: $KEYCLOAK_CLIENT_ID"
echo "   Port: $TOKEN_VALIDATOR_PORT"

# Starte den Service
echo "🚀 Starting token validator on port $TOKEN_VALIDATOR_PORT..."
node token-validator.js