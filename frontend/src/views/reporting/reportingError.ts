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
  return error && typeof error === 'object' ? (error) : {}
}

export function reportingApiErrorMessage(error: unknown, fallback: string): string {
  const candidate = reportingApiError(error)
  const detail = candidate.response?.data?.detail
  if (typeof detail === 'string' && detail) {
    return detail
  }
  const responseError = candidate.response?.data?.error
  if (typeof responseError === 'string' && responseError) {
    return responseError
  }
  return typeof candidate.message === 'string' && candidate.message ? candidate.message : fallback
}
