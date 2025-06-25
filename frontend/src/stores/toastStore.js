import { defineStore } from 'pinia';
const DEFAULT_TIMEOUT = 3000;
let nextId = 0;
export const useToastStore = defineStore('toast', {
    state: () => ({
        toasts: []
    }),
    actions: {
        /** Low-level helper used by the status-specific shorthands. */
        _push(payload, status) {
            const toast = {
                id: nextId++,
                status,
                text: payload.text,
                timeout: payload.timeout ?? DEFAULT_TIMEOUT
            };
            this.toasts.push(toast);
            // auto-dismiss
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== toast.id);
            }, toast.timeout);
        },
        /* ------------- public API ------------- */
        success(payload) { this._push(payload, 'success'); },
        warning(payload) { this._push(payload, 'warning'); },
        error(payload) { this._push(payload, 'error'); },
        info(payload) { this._push(payload, 'info'); }
    }
});
