const OVERRIDE_STORAGE_PREFIX = 'lxAnnotate.annotationPrincipalOverride.v1'

export function getAnnotatorPrincipalFromAuthUser(
  user: Record<string, unknown> | null | undefined
): string {
  const subject =
    typeof user?.sub === 'string'
      ? user.sub.trim()
      : typeof user?.oidcSub === 'string'
        ? user.oidcSub.trim()
        : ''
  if (subject) {
    return `oidc:${subject}`
  }

  const username = typeof user?.username === 'string' ? user.username.trim() : ''
  if (username) {
    return username
  }
  return 'unknown'
}

function getOverrideStorageKey(scope: string, basePrincipal: string): string {
  return `${OVERRIDE_STORAGE_PREFIX}:${encodeURIComponent(basePrincipal)}:${encodeURIComponent(scope)}`
}

export function loadAnnotatorOverride(scope: string, basePrincipal: string): string | null {
  try {
    const storedPrincipal = localStorage.getItem(getOverrideStorageKey(scope, basePrincipal))
    const normalized = storedPrincipal?.trim() ?? ''
    return normalized || null
  } catch {
    return null
  }
}

export function saveAnnotatorOverride(
  scope: string,
  basePrincipal: string,
  overridePrincipal: string
): void {
  const normalized = overridePrincipal.trim()
  if (!normalized) {
    return
  }
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
