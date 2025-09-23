export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
}
export declare const useAuthStore: import("pinia").StoreDefinition<"auth", Pick<{
    user: import("vue").Ref<{
        id: string;
        username: string;
        email: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
    } | null, User | {
        id: string;
        username: string;
        email: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
    } | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    setUser: (userData: User) => void;
    logout: () => void;
    initMockUser: () => void;
}, "user">, Pick<{
    user: import("vue").Ref<{
        id: string;
        username: string;
        email: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
    } | null, User | {
        id: string;
        username: string;
        email: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
    } | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    setUser: (userData: User) => void;
    logout: () => void;
    initMockUser: () => void;
}, "isAuthenticated">, Pick<{
    user: import("vue").Ref<{
        id: string;
        username: string;
        email: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
    } | null, User | {
        id: string;
        username: string;
        email: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
    } | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    setUser: (userData: User) => void;
    logout: () => void;
    initMockUser: () => void;
}, "logout" | "setUser" | "initMockUser">>;
