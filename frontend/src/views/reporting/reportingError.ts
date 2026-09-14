type ReportingApiError = {
  message?: unknown
  response?: {
    status?: unknown
    data?: {
      detail?: unknown
      error?: unknown
      expectedVersion?: unknown
    }
  }
}

export function reportingApiError(error: unknown): ReportingApiError {
  return error && typeof error === 'object' ? error : {}
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export function reportingApiErrorMessage(error: unknown, fallback: string): string {
  const candidate = reportingApiError(error)
  const messages = [
    candidate.response?.data?.detail,
    candidate.response?.data?.error,
    candidate.message
  ]
  return messages.map(nonEmptyString).find((message) => message !== null) ?? fallback
}
