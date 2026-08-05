// frontend/src/stores/auth_kc.ts
import { defineStore } from 'pinia'
import axios from 'axios'
import { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

const REPORTING_STORAGE_KEYS = [
  'reportingFlowState.v1',
  'reportingFlowState.v2',
  'lookupToken',
  'currentPatientExaminationId'
]

function clearReportingSessionArtifacts() {
  try {
    for (const key of REPORTING_STORAGE_KEYS) {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    }
  } catch {
    // Storage cleanup is best-effort during authentication transitions.
  }
}

/**
 * We support two backend shapes for capabilities:
 *  A) Boolean map:        { "page.patients.view": true, "api.patients:GET": false, ... }
 *  B) Read/Write objects: { "page.patients.view": { read:true, write:false }, ... }
 *
 * This store normalizes both so `can(key, method)` just returns a boolean.
 */
type CapMap = Record<string, boolean>

export interface User {
  username: string
  roles: string[]
  sub?: string
  canOverrideAnnotationPrincipal?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function normalizeUser(value: unknown): User | null {
  if (
    !isRecord(value) ||
    typeof value.username !== 'string' ||
    !value.username.trim() ||
    !isStringArray(value.roles)
  ) {
    return null
  }
  const sub = typeof value.sub === 'string' ? value.sub : undefined
  const canOverrideAnnotationPrincipal =
    typeof value.canOverrideAnnotationPrincipal === 'boolean'
      ? value.canOverrideAnnotationPrincipal
      : undefined
  return {
    username: value.username,
    roles: value.roles,
    ...(sub === undefined ? {} : { sub }),
    ...(canOverrideAnnotationPrincipal === undefined ? {} : { canOverrideAnnotationPrincipal })
  }
}

/** Normalize arbitrary capability payloads into a simple boolean map. */
function normalizeCaps(raw: unknown): CapMap {
  const out: CapMap = {}
  if (!isRecord(raw)) return out

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'boolean') {
      out[key] = val
      continue
    }
    if (!isRecord(val)) continue
    if (
      (val.read !== undefined && typeof val.read !== 'boolean') ||
      (val.write !== undefined && typeof val.write !== 'boolean')
    ) {
      continue
    }
    // Object form { read, write } → provide both a default and method-specific keys.
    const r = val.read === true
    const w = val.write === true
    // Default semantic: GET → read; others → write
    out[key] = r || w // truthy if either permitted; UI pieces can still use method-specific checks

    // Method-specific composites allow precise gating in the UI:
    out[`${key}:GET`] = r
    out[`${key}:HEAD`] = r
    out[`${key}:OPTIONS`] = r
    out[`${key}:POST`] = w
    out[`${key}:PUT`] = w
    out[`${key}:PATCH`] = w
    out[`${key}:DELETE`] = w
  }
  return out
}

export const useAuthKcStore = defineStore('auth_kc', {
  state: () => ({
    /** Filled from backend bootstrap */
    user: null as User | null,
    roles: [] as string[],

    /** Capabilities normalized to simple booleans (see normalizeCaps) */
    caps: {} as CapMap,

    /** True once we’ve attempted to load bootstrap */
    loaded: false
  }),
  getters: {
    isAuthenticated: (s) => !!s.user
  },
  actions: {
    /**
     * Load the backend-provided auth/bootstrap context exactly once.
     * Primary endpoint:    GET auth/bootstrap
     * Back-compat fallback: GET auth/context
     */
    async loadBootstrap() {
      if (this.loaded) return
      try {
        let data: unknown
        try {
          const res = await axios.get<unknown>(r(endpoints.auth.bootstrap), {
            withCredentials: true
          })
          data = res.data
        } catch {
          // Fallback for older backend
          const res = await axios.get<unknown>(r(endpoints.auth.context), {
            withCredentials: true
          })
          data = res.data
        }

        // User & roles (support both shapes)
        const bootstrap = isRecord(data) ? data : {}
        const rawUser = normalizeUser(bootstrap.user)
        const fallbackSub =
          typeof bootstrap.sub === 'string'
            ? bootstrap.sub
            : typeof bootstrap.oidcSub === 'string'
              ? bootstrap.oidcSub
              : typeof bootstrap.oidc_sub === 'string'
                ? bootstrap.oidc_sub
                : null
        const user = rawUser
          ? {
              ...rawUser,
              sub:
                typeof rawUser.sub === 'string' && rawUser.sub.trim()
                  ? rawUser.sub
                  : (fallbackSub ?? undefined)
            }
          : null
        const roles = user
          ? isStringArray(bootstrap.roles)
            ? bootstrap.roles
            : user.roles
          : []

        this.user = user
        this.roles = roles
        this.caps = user ? normalizeCaps(bootstrap.capabilities) : {}
      } finally {
        // Even on failure we mark loaded so the UI can decide; middleware should redirect unauthenticated anyway
        this.loaded = true
      }
    },

    /**
     * Capability check used by directives/components.
     * - First checks method-specific key: "<key>:<METHOD>"
     * - Then falls back to the plain "<key>"
     * - Missing keys default to false (secure default).
     */
    can(
      key: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' = 'GET'
    ): boolean {
      const composite = `${key}:${method.toUpperCase()}`
      if (Object.prototype.hasOwnProperty.call(this.caps, composite)) return this.caps[composite]
      if (Object.prototype.hasOwnProperty.call(this.caps, key)) return this.caps[key]
      return false
    },

    login() {
      clearReportingSessionArtifacts()
      // Explicit login button (usually not needed because backend redirects,
      // but nice to have)
      const next = encodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash
      )
      window.location.href = `/oidc/authenticate/?next=${next}`
    },

    logout() {
      clearReportingSessionArtifacts()
      // Clear local state (not strictly needed because we reload the page, but harmless)
      this.user = null
      this.roles = []
      this.caps = {}
      this.loaded = false

      // Let Django + mozilla_django_oidc handle full logout + Keycloak side
      window.location.href = '/oidc/logout/'
    }
  }
})
