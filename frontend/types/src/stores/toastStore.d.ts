export type ToastStatus = 'success' | 'warning' | 'error' | 'info';
export interface ToastPayload {
    /** Text that will be rendered. */
    text: string;
    /** Override auto-dismiss in ms (default = 3000). */
    timeout?: number;
}
export interface Toast extends ToastPayload {
    id: number;
    status: ToastStatus;
}
export declare const useToastStore: import("pinia").StoreDefinition<"toast", {
    toasts: Toast[];
}, {}, {
    /** Low-level helper used by the status-specific shorthands. */
    _push(payload: ToastPayload, status: ToastStatus): void;
    success(payload: ToastPayload): void;
    warning(payload: ToastPayload): void;
    error(payload: ToastPayload): void;
    info(payload: ToastPayload): void;
}>;
