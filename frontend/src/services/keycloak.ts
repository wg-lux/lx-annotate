import Keycloak from 'keycloak-js';

// Lese Umgebungsvariablen aus import.meta.env (für Vite) oder definiere Standardwerte
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080/auth';
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM || 'lx-annotate';
const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'lx-annotate-frontend';

// Keycloak-Konfiguration
const keycloak = new Keycloak({
  url: keycloakUrl,
  realm: keycloakRealm,
  clientId: keycloakClientId
});

// Keycloak initialisieren
export function initKeycloak(onAuthenticatedCallback: () => void): Promise<boolean> {
  return keycloak
    .init({
      onLoad: 'check-sso',
      checkLoginIframe: true,  // Iframe-Check aktivieren für bessere Sitzungsverwaltung
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      silentCheckSsoFallback: true  // Fallback aktivieren, wenn 3P-Cookies blockiert sind
    })
    .then((authenticated) => {
      if (authenticated) {
        onAuthenticatedCallback();
      }
      return authenticated;
    })
    .catch((error) => {
      console.error('Keycloak initialization failed', error);
      return false;
    });
}

// Token-Aktualisierung
export function setupTokenRefresh() {
  setInterval(() => {
    keycloak.updateToken(70).catch(() => {
      console.log('Token refresh failed');
    });
  }, 60000);
}

export default keycloak;