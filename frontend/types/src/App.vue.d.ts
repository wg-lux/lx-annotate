declare const _default: import("vue").DefineComponent<{}, {}, {
    staticUrl: any;
    isMenuOpen: boolean;
}, {}, {
    toggleMenu(): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    NavbarComponent: import("vue").DefineComponent<{}, {
        authStore: import("pinia").Store<"auth", import("./stores/auth.js").AuthState, {
            username: (state: {
                isAuthenticated: boolean;
                user: {
                    username: string;
                    groups: string[];
                } | null;
                loading: boolean;
                error: string | null;
            } & import("pinia").PiniaCustomStateProperties<import("./stores/auth.js").AuthState>) => string;
            userGroups: (state: {
                isAuthenticated: boolean;
                user: {
                    username: string;
                    groups: string[];
                } | null;
                loading: boolean;
                error: string | null;
            } & import("pinia").PiniaCustomStateProperties<import("./stores/auth.js").AuthState>) => string[];
            isLoading: (state: {
                isAuthenticated: boolean;
                user: {
                    username: string;
                    groups: string[];
                } | null;
                loading: boolean;
                error: string | null;
            } & import("pinia").PiniaCustomStateProperties<import("./stores/auth.js").AuthState>) => boolean;
            hasError: (state: {
                isAuthenticated: boolean;
                user: {
                    username: string;
                    groups: string[];
                } | null;
                loading: boolean;
                error: string | null;
            } & import("pinia").PiniaCustomStateProperties<import("./stores/auth.js").AuthState>) => boolean;
        }, {
            checkAuth(): Promise<void>;
            login(): void;
            logout(): Promise<void>;
        }>;
        router: import("vue-router").Router;
    }, {}, {
        isAuthenticated(): boolean;
        username(): string;
        currentRouteName(): string;
    }, {
        handleLogin(): void;
        handleLogout(): void;
    }, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    SidebarComponent: import("vue").DefineComponent<{}, {}, {
        staticUrl: any;
        isSidebarOpen: boolean;
    }, {}, {
        toggleSidebar(): void;
    }, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    DashboardComponent: import("vue").DefineComponent<{}, {
        availableRoutes: import("vue").ComputedRef<import("vue-router").RouteRecordRaw[]>;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    LoginComponent: import("vue").DefineComponent<{}, {
        email: import("vue").Ref<string, string>;
        password: import("vue").Ref<string, string>;
        rememberMe: import("vue").Ref<boolean, boolean>;
        error: import("vue").Ref<null, null>;
        handleLogin: () => Promise<void>;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
