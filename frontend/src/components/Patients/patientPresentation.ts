export const PATIENT_SUCCESS_DURATION_MS = 5000
export const PSEUDONYM_SUCCESS_DURATION_MS = 3000
const PSEUDONYM_PREVIEW_LENGTH = 8

export function formatPatientDate(dateString?: string | null): string {
  if (!dateString) return 'Nicht angegeben'
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return 'Ungültig'
  }
}

export function formatPatientDateTime(dateString?: string | null): string {
  if (!dateString) return 'Nicht angegeben'
  try {
    return new Date(dateString).toLocaleString('de-DE')
  } catch {
    return 'Ungültig'
  }
}

export function patientAge(dob?: string | null, today = new Date()): number | null {
  if (!dob) return null
  const birthDate = new Date(dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
  return age >= 0 ? age : null
}

export function pseudonymPreview(hash: string): string {
  return hash.length >= PSEUDONYM_PREVIEW_LENGTH
    ? `${hash.substring(0, PSEUDONYM_PREVIEW_LENGTH)}...`
    : hash || '—'
}
