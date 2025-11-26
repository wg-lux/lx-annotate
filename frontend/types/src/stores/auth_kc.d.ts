type CapMap = Record<string, boolean>;
export declare const useAuthKcStore: import("pinia").StoreDefinition<"auth_kc", {
    /** Filled from backend bootstrap */
    user: {
        username: string;
        roles: string[];
    } | null;
    roles: string[];
    /** Capabilities normalized to simple booleans (see normalizeCaps) */
    caps: CapMap;
    /** True once we’ve attempted to load bootstrap */
    loaded: boolean;
}, {
    isAuthenticated: (s: {
        user: {
            username: string;
            roles: string[];
        } | null;
        roles: string[];
        caps: CapMap;
        loaded: boolean;
    } & import("pinia").PiniaCustomStateProperties<{
        /** Filled from backend bootstrap */
        user: {
            username: string;
            roles: string[];
        } | null;
        roles: string[];
        /** Capabilities normalized to simple booleans (see normalizeCaps) */
        caps: CapMap;
        /** True once we’ve attempted to load bootstrap */
        loaded: boolean;
    }>) => boolean;
}, {
    /**
     * Load the backend-provided auth/bootstrap context exactly once.
     * Primary endpoint:    GET /api/auth/bootstrap
     * Back-compat fallback: GET /api/auth/context
     */
    loadBootstrap(): Promise<void>;
    /**
     * Capability check used by directives/components.
     * - First checks method-specific key: "<key>:<METHOD>"
     * - Then falls back to the plain "<key>"
     * - Missing keys default to false (secure default).
     */
    can(key: string, method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'): boolean;
    login(): void;
    logout(): void;
}>;
export {};
