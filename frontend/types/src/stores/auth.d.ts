export interface AuthState {
    isAuthenticated: boolean;
    user: {
        username: string;
        groups: string[];
    } | null;
    loading: boolean;
    error: string | null;
}
export declare const useAuthStore: import("pinia").StoreDefinition<"auth", AuthState, {
    username: (state: {
        isAuthenticated: boolean;
        user: {
            username: string;
            groups: string[];
        } | null;
        loading: boolean;
        error: string | null;
    } & import("pinia").PiniaCustomStateProperties<AuthState>) => string;
    userGroups: (state: {
        isAuthenticated: boolean;
        user: {
            username: string;
            groups: string[];
        } | null;
        loading: boolean;
        error: string | null;
    } & import("pinia").PiniaCustomStateProperties<AuthState>) => string[];
    isLoading: (state: {
        isAuthenticated: boolean;
        user: {
            username: string;
            groups: string[];
        } | null;
        loading: boolean;
        error: string | null;
    } & import("pinia").PiniaCustomStateProperties<AuthState>) => boolean;
    hasError: (state: {
        isAuthenticated: boolean;
        user: {
            username: string;
            groups: string[];
        } | null;
        loading: boolean;
        error: string | null;
    } & import("pinia").PiniaCustomStateProperties<AuthState>) => boolean;
}, {
    checkAuth(): Promise<void>;
    login(): void;
    logout(): Promise<void>;
}>;
