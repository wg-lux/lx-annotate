export declare const useAuthStore: import("pinia").StoreDefinition<"auth", {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: any;
    token: string | null;
    tokenExpiry: number | null;
}, {
    isTokenExpired: (state: {
        isLoading: boolean;
        isAuthenticated: boolean;
        user: any;
        token: string | null;
        tokenExpiry: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        isLoading: boolean;
        isAuthenticated: boolean;
        user: any;
        token: string | null;
        tokenExpiry: number | null;
    }>) => boolean;
    userDisplayName: (state: {
        isLoading: boolean;
        isAuthenticated: boolean;
        user: any;
        token: string | null;
        tokenExpiry: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        isLoading: boolean;
        isAuthenticated: boolean;
        user: any;
        token: string | null;
        tokenExpiry: number | null;
    }>) => any;
    userRoles: (state: {
        isLoading: boolean;
        isAuthenticated: boolean;
        user: any;
        token: string | null;
        tokenExpiry: number | null;
    } & import("pinia").PiniaCustomStateProperties<{
        isLoading: boolean;
        isAuthenticated: boolean;
        user: any;
        token: string | null;
        tokenExpiry: number | null;
    }>) => any;
}, {
    checkAuth(): Promise<void>;
    updateTokenInfo(): Promise<void>;
    loadUserProfile(): Promise<void>;
    login(): Promise<void>;
    logout(): Promise<void>;
    refreshToken(): Promise<boolean>;
    clearAuthData(): void;
    refreshTimerId: number | null;
    startTokenRefreshTimer(): void;
    stopTokenRefreshTimer(): void;
    getAuthHeader(): Record<string, string>;
    hasRole(role: string): boolean;
    hasAnyRole(roles: string[]): boolean;
}>;
export declare class AuthService {
    getCurrentUser(): Promise<any>;
    checkUserStatus(): Promise<any>;
    login(credentials: {
        username: string;
        password: string;
    }): Promise<void>;
    logout(): Promise<void>;
    refreshToken(): Promise<boolean>;
}
export declare const authService: AuthService;
