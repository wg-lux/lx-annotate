export declare class KeycloakService {
    private keycloak;
    init(): Promise<void>;
    login(): Promise<void>;
    logout(): void;
    isAuthenticated(): boolean;
    getToken(): string | null;
}
