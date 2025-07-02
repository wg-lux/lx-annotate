import Keycloak from 'keycloak-js';
declare const keycloak: Keycloak.KeycloakInstance;
export declare function initKeycloak(onAuthenticatedCallback: () => void): Promise<boolean>;
export declare function setupTokenRefresh(): void;
export default keycloak;
