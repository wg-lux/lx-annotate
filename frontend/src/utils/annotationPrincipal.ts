const OVERRIDE_STORAGE_PREFIX = 'lxAnnotate.annotationPrincipalOverride.v1'

export function getAnnotatorPrincipalFromAuthUser(user: Record<string, unknown> | null | undefined): string {
  const sub =
    typeof user?.sub === 'string'
      ? user.sub.trim()
      : typeof user?.oidcSub === 'string'
        ? user.oidcSub.trim()
        : ''
  if (sub) return `oidc:${sub}`

  const username = typeof user?.username === 'string' ? user.username.trim() : ''
  if (username) return username
  return 'unknown'
}

function getOverrideStorageKey(scope: string, basePrincipal: string): string {
  return `${OVERRIDE_STORAGE_PREFIX}:${encodeURIComponent(basePrincipal)}:${encodeURIComponent(scope)}`
}

export function loadAnnotatorOverride(scope: string, basePrincipal: string): string | null {
  try {
    const raw = localStorage.getItem(getOverrideStorageKey(scope, basePrincipal))
    const normalized = raw?.trim() ?? ''
    return normalized || null
  } catch {
    return null
  }
}

export function saveAnnotatorOverride(scope: string, basePrincipal: string, overridePrincipal: string): void {
  const normalized = overridePrincipal.trim()
  if (!normalized) return
  try {
    localStorage.setItem(getOverrideStorageKey(scope, basePrincipal), normalized)
  } catch {
    // Annotation overrides are a convenience; storage failures must not block annotation.
  }
}

export function clearAnnotatorOverride(scope: string, basePrincipal: string): void {
  try {
    localStorage.removeItem(getOverrideStorageKey(scope, basePrincipal))
  } catch {
    // Annotation overrides are a convenience; storage failures must not block annotation.
  }
}
