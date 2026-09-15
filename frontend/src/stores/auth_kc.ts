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

// A request belongs to one store/session, never to a shared global auth state.
const bootstrapRequests = new WeakMap<object, Promise<void>>()

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

function isUserRecord(
  value: unknown
): value is Record<string, unknown> & { username: string; roles: string[] } {
  return (
    isRecord(value) &&
    typeof value.username === 'string' &&
    Boolean(value.username.trim()) &&
    isStringArray(value.roles)
  )
}

function annotationPrincipalOverride(value: Record<string, unknown>): boolean | undefined {
  const camelOverride = value.canOverrideAnnotationPrincipal
  const snakeOverride = value.can_override_annotation_principal
  const camelInvalid = camelOverride !== undefined && typeof camelOverride !== 'boolean'
  const snakeInvalid = snakeOverride !== undefined && typeof snakeOverride !== 'boolean'
  const valuesConflict =
    camelOverride !== undefined && snakeOverride !== undefined && camelOverride !== snakeOverride
  if (camelInvalid || snakeInvalid || valuesConflict) {
    throw new TypeError('Invalid annotation principal override capability')
  }
  return camelOverride ?? snakeOverride
}

function normalizeUser(value: unknown): User | null {
  if (!isUserRecord(value)) return null
  const subject = typeof value.sub === 'string' ? value.sub : undefined
  const canOverrideAnnotationPrincipal = annotationPrincipalOverride(value)
  return {
    username: value.username,
    roles: value.roles,
    ...(subject === undefined ? {} : { sub: subject }),
    ...(canOverrideAnnotationPrincipal === undefined ? {} : { canOverrideAnnotationPrincipal })
  }
}

/** Normalize arbitrary capability payloads into a simple boolean map. */
function normalizeCaps(raw: unknown): CapMap {
  const capabilities: CapMap = {}
  if (!isRecord(raw)) {
    return capabilities
  }

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'boolean') {
      capabilities[key] = val
      continue
    }
    if (!isRecord(val)) {
      continue
    }
    if (
      (val.read !== undefined && typeof val.read !== 'boolean') ||
      (val.write !== undefined && typeof val.write !== 'boolean')
    ) {
      continue
    }
    // Object form { read, write } → provide both a default and method-specific keys.
    const canRead = val.read === true
    const canWrite = val.write === true
    // Default semantic: GET → read; others → write
    capabilities[key] = canRead || canWrite // truthy if either permitted; UI pieces can still use method-specific checks

    // Method-specific composites allow precise gating in the UI:
    capabilities[`${key}:GET`] = canRead
    capabilities[`${key}:HEAD`] = canRead
    capabilities[`${key}:OPTIONS`] = canRead
    capabilities[`${key}:POST`] = canWrite
    capabilities[`${key}:PUT`] = canWrite
    capabilities[`${key}:PATCH`] = canWrite
    capabilities[`${key}:DELETE`] = canWrite
  }
  return capabilities
}

function emptyCapabilities(): CapMap {
  return {}
}

interface AuthBootstrapState {
  user: User | null
  roles: string[]
  caps: CapMap
  loaded: boolean
  bootstrapFailed: boolean
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return null
}

function bootstrapUser(bootstrap: Record<string, unknown>): User | null {
  const user = normalizeUser(bootstrap.user)
  if (!user) return null
  const fallbackSub = firstString(bootstrap, ['sub', 'oidcSub', 'oidc_sub'])
  return {
    ...user,
    sub: typeof user.sub === 'string' && user.sub.trim() ? user.sub : (fallbackSub ?? undefined)
  }
}

function applyBootstrapData(store: AuthBootstrapState, data: unknown): void {
  const bootstrap = isRecord(data) ? data : {}
  const user = bootstrapUser(bootstrap)
  store.user = user
  store.roles = user && isStringArray(bootstrap.roles) ? bootstrap.roles : (user?.roles ?? [])
  store.caps = user ? normalizeCaps(bootstrap.capabilities) : {}
  store.bootstrapFailed = false
}

function resetFailedBootstrap(store: AuthBootstrapState): void {
  store.user = null
  store.roles = []
  store.caps = {}
  store.bootstrapFailed = true
}

async function performBootstrap(
  store: AuthBootstrapState,
  request: () => Promise<void>
): Promise<void> {
  try {
    const response = await axios.get<unknown>(r(endpoints.auth.bootstrap), {
      withCredentials: true
    })
    if (bootstrapRequests.get(store) !== request()) return
    applyBootstrapData(store, response.data)
  } catch (error: unknown) {
    if (bootstrapRequests.get(store) === request()) resetFailedBootstrap(store)
    throw error
  } finally {
    if (bootstrapRequests.get(store) === request()) {
      store.loaded = true
      bootstrapRequests.delete(store)
    }
  }
}

export const useAuthKcStore = defineStore('auth_kc', {
  state: () => ({
    /** Filled from backend bootstrap */
    user: null as User | null,
    roles: [] as string[],

    /** Capabilities normalized to simple booleans (see normalizeCaps) */
    caps: emptyCapabilities(),

    /** True once we’ve attempted to load bootstrap */
    loaded: false,
    bootstrapFailed: false
  }),
  getters: {
    isAuthenticated: (s) => !!s.user
  },
  actions: {
    /**
     * Load the backend-provided auth/bootstrap context exactly once.
     * Canonical endpoint: GET auth/bootstrap
     */
    async loadBootstrap() {
      if (this.loaded) {
        if (this.bootstrapFailed) {
          throw new Error('Authentication bootstrap failed')
        }
        return
      }
      const pending = bootstrapRequests.get(this)
      if (pending) {
        return pending
      }

      const request: Promise<void> = Promise.resolve().then(() =>
        performBootstrap(this, () => request)
      )
      bootstrapRequests.set(this, request)
      return request
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
      if (Object.prototype.hasOwnProperty.call(this.caps, composite)) {
        return this.caps[composite]
      }
      if (Object.prototype.hasOwnProperty.call(this.caps, key)) {
        return this.caps[key]
      }
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
      bootstrapRequests.delete(this)
      clearReportingSessionArtifacts()
      // Clear local state (not strictly needed because we reload the page, but harmless)
      this.user = null
      this.roles = []
      this.caps = {}
      this.loaded = false
      this.bootstrapFailed = false

      // Let Django + mozilla_django_oidc handle full logout + Keycloak side
      window.location.href = '/oidc/logout/'
    }
  }
})
