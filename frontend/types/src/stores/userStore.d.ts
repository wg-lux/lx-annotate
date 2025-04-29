export declare const useUserStore: import("pinia").StoreDefinition<"user", {
    users: never[];
}, {
    getUsers(state: {
        users: never[];
    } & import("pinia").PiniaCustomStateProperties<{
        users: never[];
    }>): never[];
}, {
    fetchUsers(): Promise<void>;
}>;
