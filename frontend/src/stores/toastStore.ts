import { defineStore } from 'pinia'

export type ToastStatus = 'success' | 'warning' | 'error' | 'info'

export interface ToastPayload {
  /** Text that will be rendered. */
  text: string
  /** Override auto-dismiss in ms (default = 3000). */
  timeout?: number
}

export interface Toast extends ToastPayload {
  id: number
  status: ToastStatus
}

const DEFAULT_TIMEOUT = 3000
let nextId = 0

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[]
  }),

  actions: {
    /** Low-level helper used by the status-specific shorthands. */
    _push(payload: ToastPayload, status: ToastStatus) {
      const toast: Toast = {
        id: nextId++,
        status,
        text: payload.text,
        timeout: payload.timeout ?? DEFAULT_TIMEOUT
      }

      this.toasts.push(toast)

      // auto-dismiss
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== toast.id)
      }, toast.timeout)
    },

    /* ------------- public API ------------- */

    success(payload: ToastPayload) { this._push(payload, 'success') },
    warning(payload: ToastPayload) { this._push(payload, 'warning') },
    error(payload: ToastPayload)   { this._push(payload, 'error')   },
    info(payload: ToastPayload)    { this._push(payload, 'info')    }
  }
})
