// frontend/src/stores/auth_kc.ts
import { defineStore } from 'pinia';
import axios from 'axios';
/** Normalize arbitrary capability payloads into a simple boolean map. */
function normalizeCaps(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object')
        return out;
    for (const [key, val] of Object.entries(raw)) {
        if (typeof val === 'boolean') {
            out[key] = val;
            continue;
        }
        // Object form { read, write } → provide both a default and method-specific keys.
        const r = !!val.read;
        const w = !!val.write;
        // Default semantic: GET → read; others → write
        out[key] = r || w; // truthy if either permitted; UI pieces can still use method-specific checks
        // Method-specific composites allow precise gating in the UI:
        out[`${key}:GET`] = r;
        out[`${key}:HEAD`] = r;
        out[`${key}:OPTIONS`] = r;
        out[`${key}:POST`] = w;
        out[`${key}:PUT`] = w;
        out[`${key}:PATCH`] = w;
        out[`${key}:DELETE`] = w;
    }
    return out;
}
export const useAuthKcStore = defineStore('auth_kc', {
    state: () => ({
        /** Filled from backend bootstrap */
        user: null,
        roles: [],
        /** Capabilities normalized to simple booleans (see normalizeCaps) */
        caps: {},
        /** True once we’ve attempted to load bootstrap */
        loaded: false,
    }),
    getters: {
        isAuthenticated: (s) => !!s.user,
    },
    actions: {
        /**
         * Load the backend-provided auth/bootstrap context exactly once.
         * Primary endpoint:    GET /api/auth/bootstrap
         * Back-compat fallback: GET /api/auth/context
         */
        async loadBootstrap() {
            if (this.loaded)
                return;
            try {
                let data;
                try {
                    const res = await axios.get('/api/auth/bootstrap', { withCredentials: true });
                    data = res.data;
                }
                catch (e) {
                    // Fallback for older backend
                    const res = await axios.get('/api/auth/context', { withCredentials: true });
                    data = res.data;
                }
                // User & roles (support both shapes)
                const user = (data && 'user' in data) ? data.user : null;
                const roles = (data?.roles && Array.isArray(data.roles))
                    ? data.roles
                    : (user?.roles ?? []);
                this.user = user;
                this.roles = roles;
                this.caps = normalizeCaps(data?.capabilities);
            }
            finally {
                // Even on failure we mark loaded so the UI can decide; middleware should redirect unauthenticated anyway
                this.loaded = true;
            }
        },
        /**
         * Capability check used by directives/components.
         * - First checks method-specific key: "<key>:<METHOD>"
         * - Then falls back to the plain "<key>"
         * - Missing keys default to false (secure default).
         */
        can(key, method = 'GET') {
            const composite = `${key}:${method.toUpperCase()}`;
            if (this.caps.hasOwnProperty(composite))
                return !!this.caps[composite];
            if (this.caps.hasOwnProperty(key))
                return !!this.caps[key];
            return false;
        },
    },
});
