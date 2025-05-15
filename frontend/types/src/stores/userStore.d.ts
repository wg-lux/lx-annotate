export declare const useUserStore: import("pinia").StoreDefinition<"user", {
    users: any[];
}, {
    getUsers(state: {
        users: any[];
    } & import("pinia").PiniaCustomStateProperties<{
        users: any[];
    }>): any[];
}, {
    fetchUsers(): Promise<void>;
}>;
