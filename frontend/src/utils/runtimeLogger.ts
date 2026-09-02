export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error'

export type SafeLogValue = string | number | boolean | null

const SAFE_CONTEXT_KEY_LIST = [
  'action',
  'count',
  'currentStatus',
  'durationMs',
  'evaluationId',
  'expectedStatus',
  'fileType',
  'httpStatus',
  'mediaType',
  'mode',
  'operation',
  'outcome',
  'patientExaminationId',
  'pinnedIdentity',
  'queue',
  'reasonCode',
  'registryRevision',
  'requestedIdentity',
  'responseIdentity',
  'retryCount',
  'source',
  'state',
  'supersessionReason',
  'taskType'
] as const

export type SafeLogContextKey = (typeof SAFE_CONTEXT_KEY_LIST)[number]
const SAFE_CONTEXT_KEYS: ReadonlySet<string> = new Set(SAFE_CONTEXT_KEY_LIST)

export type SafeLogContext = Readonly<Partial<Record<SafeLogContextKey, SafeLogValue>>>

export type RuntimeLogRecord = {
  timestamp: string
  severity: RuntimeLogLevel
  scope: string
  event: string
  context?: SafeLogContext
  errorType?: string
  httpStatus?: number
}

const SAFE_ERROR_TYPES = new Set([
  'AbortError',
  'AxiosError',
  'Error',
  'EvalError',
  'NetworkError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TimeoutError',
  'TypeError',
  'URIError'
])

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function safeName(value: string, fallback: string): string {
  return EVENT_NAME_PATTERN.test(value) ? value : fallback
}

function sanitizeContext(context: SafeLogContext | undefined): SafeLogContext | undefined {
  if (!isRecord(context)) return undefined
  const safeEntries = Object.entries(context).filter(
    (entry): entry is [SafeLogContextKey, SafeLogValue] =>
      SAFE_CONTEXT_KEYS.has(entry[0]) &&
      (entry[1] === null ||
        typeof entry[1] === 'string' ||
        typeof entry[1] === 'number' ||
        typeof entry[1] === 'boolean')
  )
  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : undefined
}

function classifyError(error: unknown): Pick<RuntimeLogRecord, 'errorType' | 'httpStatus'> {
  if (!isRecord(error)) return { errorType: typeof error === 'undefined' ? undefined : 'UnknownError' }

  const rawName = typeof error.name === 'string' ? error.name : ''
  const errorType = SAFE_ERROR_TYPES.has(rawName) ? rawName : 'UnknownError'
  const response = isRecord(error.response) ? error.response : undefined
  const status = response?.status
  const httpStatus =
    typeof status === 'number' && Number.isSafeInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined

  return {
    errorType,
    ...(httpStatus === undefined ? {} : { httpStatus })
  }
}

export function isRuntimeDebugEnabled(): boolean {
  return import.meta.env.DEBUG === 'true' || import.meta.env.VITE_ENABLE_DEBUG === 'true'
}

function shouldEmit(level: RuntimeLogLevel): boolean {
  if (import.meta.env.MODE === 'test' && import.meta.env.VITE_ENABLE_TEST_LOGS !== 'true') {
    return false
  }
  return level === 'warn' || level === 'error' || isRuntimeDebugEnabled()
}

function writeRecord(record: RuntimeLogRecord): void {
  const serialized = JSON.stringify(record)
  if (record.severity === 'error') {
    console.error(serialized)
  } else if (record.severity === 'warn') {
    console.warn(serialized)
  } else if (record.severity === 'info') {
    console.info(serialized)
  } else {
    console.debug(serialized)
  }
}

export type RuntimeLogger = {
  debug: (event: string, context?: SafeLogContext) => void
  info: (event: string, context?: SafeLogContext) => void
  warn: (event: string, context?: SafeLogContext) => void
  error: (event: string, error?: unknown, context?: SafeLogContext) => void
}

export type RuntimeLogSink = (record: RuntimeLogRecord) => void

export function createRuntimeLogger(
  scope: string,
  sink: RuntimeLogSink = writeRecord
): RuntimeLogger {
  const safeScope = safeName(scope, 'application')

  function emit(
    severity: RuntimeLogLevel,
    event: string,
    context?: SafeLogContext,
    error?: unknown
  ): void {
    if (!shouldEmit(severity)) return
    const safeContext = sanitizeContext(context)
    const errorFields = severity === 'error' ? classifyError(error) : {}
    sink({
      timestamp: new Date().toISOString(),
      severity,
      scope: safeScope,
      event: safeName(event, 'unexpected-event'),
      ...(safeContext === undefined ? {} : { context: safeContext }),
      ...errorFields
    })
  }

  return {
    debug: (event, context) => {
      emit('debug', event, context)
    },
    info: (event, context) => {
      emit('info', event, context)
    },
    warn: (event, context) => {
      emit('warn', event, context)
    },
    error: (event, error, context) => {
      emit('error', event, context, error)
    }
  }
}
