import axios, { AxiosError, type AxiosResponse } from 'axios'
import Cookies from 'js-cookie'
import camelcaseKeys from 'camelcase-keys'
import { useToastStore } from '@/stores/toastStore'
import { useAuthKcStore } from '@/stores/auth_kc'

// This handles requests to the local Django APIs.

const LEGACY_API_PREFIX = import.meta.env.VITE_API_PREFIX
const ENDOREG_API_PREFIX =
  import.meta.env.VITE_ENDOREG_API_PREFIX ?? LEGACY_API_PREFIX ?? 'endoreg-api/'
const DTYPES_API_PREFIX = import.meta.env.VITE_DTYPES_API_PREFIX ?? 'dtypes-api/'

function joinApiPath(prefix: string, path: string): string {
  const normalizedPrefix = prefix.trim().replace(/^\/+|\/+$/g, '')
  const normalizedPath = path.replace(/^\/+/, '')
  return normalizedPrefix ? `/${normalizedPrefix}/${normalizedPath}` : `/${normalizedPath}`
}
const axiosInstance = axios.create({
  // Da die Vue-App als statische Dateien über Django serviert wird,
  // verwenden wir relative URLs (kein baseURL nötig)
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: true
})

function shouldSuppressErrorToast(url: string, explicitlySuppressed: boolean): boolean {
  if (explicitlySuppressed) return true
  return (
    url.includes('/dtypes-api/') ||
    url.startsWith('dtypes-api/')
  )
}

function getResponseErrorMessage(err: AxiosError): string {
  const data = err.response?.data
  const detail = isPlainJsonObject(data) && typeof data.detail === 'string' ? data.detail : ''
  const apiError = isPlainJsonObject(data) && typeof data.error === 'string' ? data.error : ''
  return detail || apiError || err.message || 'Unbekannter Netzwerk- oder Serverfehler'
}

function handleResponseError(error: unknown): Promise<never> {
  const err: AxiosError = axios.isAxiosError(error)
    ? error
    : new AxiosError(error instanceof Error ? error.message : undefined)
  const toast = useToastStore()
  const auth = useAuthKcStore()
  const status = err.response?.status
  const config = err.config as
    | (NonNullable<typeof err.config> & { suppressErrorToast?: boolean })
    | undefined
  const url = config?.url || ''
  const suppressErrorToast = shouldSuppressErrorToast(
    url,
    config?.suppressErrorToast === true
  )
  const isPollingRequest = url.includes('/status/') || url.includes('/polling-info/')

  if (status === 401) {
    auth.login()
    return Promise.reject(err)
  }

  if (!isPollingRequest && !suppressErrorToast) {
    toast.error({ text: getResponseErrorMessage(err) })
  }

  return Promise.reject(err)
}

// Error toast - Skip toast messages for polling requests
// Error handling: Keycloak login on 401 + toast for other errors
axiosInstance.interceptors.response.use((r) => r, handleResponseError)

// Helper for endoreg_db plus lx-annotate local API routes.
export function endoregApi(path: string): string {
  return joinApiPath(ENDOREG_API_PREFIX, path)
}

// Helper for lx_dtypes API routes.
export function dtypesApi(path: string): string {
  return joinApiPath(DTYPES_API_PREFIX, path)
}

// Compatibility helper for existing callers. Prefer endoregApi() in new code.
export function r(path: string): string {
  return endoregApi(path)
}

// Helper zur Erzeugung des API-Pfads für PDF-Endpunkte
export function a(path: string): string {
  return r(`pdf/${path}`)
}

export function silentRequestConfig<T extends AxiosRequestConfig = AxiosRequestConfig>(
  config?: T
): T & {
  suppressErrorToast: true
} {
  return {
    ...(config || ({} as T)),
    suppressErrorToast: true
  }
}

import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const csrftoken = Cookies.get('csrftoken')
  if (config.data instanceof FormData) {
    // Let the browser automatically set 'Content-Type: multipart/form-data; boundary=…'
    // Do NOT manually set Content-Type for FormData - the browser handles this correctly
    delete config.headers['Content-Type']
    // Don't set it back! The browser will add the correct boundary automatically
  }
  if (csrftoken) {
    config.headers['X-CSRFToken'] = csrftoken
  }
  return config
})

function localSnakecaseKeys(obj: unknown, options: { deep?: boolean } = {}): unknown {
  const isPlainObject = (v: unknown): v is Record<string, unknown> => {
    if (!v || typeof v !== 'object') return false
    if (Object.prototype.toString.call(v) !== '[object Object]') return false
    const proto = Reflect.getPrototypeOf(v)
    return proto === Object.prototype || proto === null
  }

  if (Array.isArray(obj)) {
    // Keep arrays of primitives intact; recurse only when elements are arrays/objects.
    if (!options.deep) return obj
    return obj.map((item: unknown) =>
      Array.isArray(item) || isPlainObject(item) ? localSnakecaseKeys(item, options) : item
    )
  }

  if (!isPlainObject(obj)) return obj

  return Object.keys(obj).reduce<Record<string, unknown>>(
    (acc, key) => {
      const newKey = key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
      const value = obj[key]
      acc[newKey] =
        options.deep && (Array.isArray(value) || isPlainObject(value))
          ? localSnakecaseKeys(value, options)
          : value
      return acc
    },
    {}
  )
}

// ─── Convert outgoing payload from camelCase → snake_case ───────────
axiosInstance.interceptors.request.use((config) => {
  // Skip snake_case conversion for FormData - it should be passed through as-is
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = localSnakecaseKeys(config.data, { deep: true })
  }
  return config
})

// ─── Convert incoming payload from snake_case → camelCase ───────────
function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false
  const prototype = Reflect.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function convertIncomingResponseData(data: unknown): unknown {
  if (Array.isArray(data)) return data.map((item: unknown) => convertIncomingResponseData(item))
  if (!isPlainJsonObject(data)) return data
  return camelcaseKeys(data, { deep: true })
}

axiosInstance.interceptors.response.use((response: AxiosResponse<unknown>) => {
  response.data = convertIncomingResponseData(response.data)
  return response
})

export default axiosInstance
