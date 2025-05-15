declare const _default: import("vue").DefineComponent<{}, {
    authStore: import("pinia").Store<"auth", import("@/stores/auth").AuthState, {
        username: (state: {
            isAuthenticated: boolean;
            user: {
                username: string;
                groups: string[];
            };
            loading: boolean;
            error: string;
        } & import("pinia").PiniaCustomStateProperties<import("@/stores/auth").AuthState>) => string;
        userGroups: (state: {
            isAuthenticated: boolean;
            user: {
                username: string;
                groups: string[];
            };
            loading: boolean;
            error: string;
        } & import("pinia").PiniaCustomStateProperties<import("@/stores/auth").AuthState>) => string[];
        isLoading: (state: {
            isAuthenticated: boolean;
            user: {
                username: string;
                groups: string[];
            };
            loading: boolean;
            error: string;
        } & import("pinia").PiniaCustomStateProperties<import("@/stores/auth").AuthState>) => boolean;
        hasError: (state: {
            isAuthenticated: boolean;
            user: {
                username: string;
                groups: string[];
            };
            loading: boolean;
            error: string;
        } & import("pinia").PiniaCustomStateProperties<import("@/stores/auth").AuthState>) => boolean;
    }, {
        checkAuth(): Promise<void>;
        login(): void;
        logout(): Promise<void>;
    }>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
