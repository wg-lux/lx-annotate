const DEFAULT_STATIC_URL = '/static/'

type StaticWindow = Window & { STATIC_URL?: unknown }

export function normalizeStaticUrl(value?: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_STATIC_URL
  }

  return value.endsWith('/') ? value : `${value}/`
}

export function getStaticUrl(path = ''): string {
  const base =
    typeof window !== 'undefined'
      ? normalizeStaticUrl((window as StaticWindow).STATIC_URL)
      : DEFAULT_STATIC_URL
  const normalizedPath = path.replace(/^\/+/, '')

  return normalizedPath ? `${base}${normalizedPath}` : base
}
