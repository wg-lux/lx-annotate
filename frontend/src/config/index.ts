// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8188',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  withCredentials: true
} as const

// App Configuration
export const APP_CONFIG = {
  title: import.meta.env.VITE_APP_TITLE || 'LX Annotate',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development'
} as const

// Authentication Configuration
export const AUTH_CONFIG = {
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.endo-reg.net/',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'master',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'lx-frontend'
} as const

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxFileSize: import.meta.env.VITE_MAX_FILE_SIZE || '100MB',
  allowedTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['.pdf', '.mp4', '.avi']
} as const

// Logging Configuration
export const LOG_CONFIG = {
  level: import.meta.env.VITE_LOG_LEVEL || 'info',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true'
} as const

// Production Services
export const SERVICES_CONFIG = {
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  analyticsId: import.meta.env.VITE_ANALYTICS_ID
} as const
