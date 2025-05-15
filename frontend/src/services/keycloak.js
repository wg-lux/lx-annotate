import Keycloak from 'keycloak-js';
// Lese Umgebungsvariablen aus import.meta.env (für Vite) oder definiere Standardwerte
// @ts-ignore: import.meta env allowed with module:"esnext"
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
// @ts-ignore
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM;
// @ts-ignore
const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
// Keycloak-Konfiguration
// Um TS7009 zu beheben, verwenden wir eine Typ-Assertion für den Konstruktor.
// Dies ist oft notwendig, wenn die Typdefinitionen der Bibliothek nicht perfekt mit den Projekteinstellungen harmonieren.
const keycloak = new Keycloak({
    url: keycloakUrl,
    realm: keycloakRealm,
    clientId: keycloakClientId
});
export async function initKeycloak(onAuthenticatedCallback) {
    try {
        const authenticated = await keycloak.init({
            onLoad: 'check-sso',
            checkLoginIframe: true,
            silentCheckSsoFallback: true,
            ...(window.location.origin && {
                silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
            })
        });
        if (authenticated) {
            onAuthenticatedCallback();
        }
        return true;
    }
    catch (error) {
        console.error('Keycloak initialization failed', error);
        return false;
    }
}
export function setupTokenRefresh() {
    setInterval(async () => {
        try {
            const refreshed = await keycloak.updateToken(30);
            if (refreshed) {
                console.log('Token was successfully refreshed');
            }
            else {
                console.log('Token is still valid');
            }
        }
        catch (error) {
            console.error('Failed to refresh token:', error);
            keycloak.logout();
        }
    }, 60000); // Check every 60 seconds
}
export default keycloak;
