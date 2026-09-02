import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRuntimeLogger, type RuntimeLogSink } from '@/utils/runtimeLogger'

describe('runtimeLogger', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('is silent in tests unless test logging is explicitly enabled', () => {
    const sink = vi.fn<RuntimeLogSink>()

    createRuntimeLogger('patient-workflow', sink).error(
      'request-failed',
      new Error('private detail')
    )

    expect(sink).not.toHaveBeenCalled()
  })

  it('emits structured scalar context without raw error details', () => {
    vi.stubEnv('VITE_ENABLE_TEST_LOGS', 'true')
    const sink = vi.fn<RuntimeLogSink>()
    const logger = createRuntimeLogger('patient-workflow', sink)
    const error = Object.assign(new Error('patient Jane Doe failed'), {
      response: {
        status: 422,
        data: { patientName: 'Jane Doe' }
      },
      request: { body: 'clinical payload' }
    })

    logger.error('request-failed', error, {
      operation: 'create',
      outcome: 'rejected'
    })

    expect(sink).toHaveBeenCalledOnce()
    const record = sink.mock.calls[0][0]
    const serialized = JSON.stringify(record)
    expect(serialized).not.toContain('Jane Doe')
    expect(serialized).not.toContain('clinical payload')
    expect(serialized).not.toContain('patientName')
    expect(record).toMatchObject({
      severity: 'error',
      scope: 'patient-workflow',
      event: 'request-failed',
      errorType: 'Error',
      httpStatus: 422,
      context: {
        operation: 'create',
        outcome: 'rejected'
      }
    })
  })

  it('drops nested and unapproved context supplied across an untyped runtime boundary', () => {
    vi.stubEnv('VITE_ENABLE_TEST_LOGS', 'true')
    const sink = vi.fn<RuntimeLogSink>()
    const logger = createRuntimeLogger('video-store', sink)
    const unsafeContext = {
      count: 2,
      patient: { firstName: 'Jane' },
      filename: 'patient-jane.mp4'
    }

    Reflect.apply(logger.warn, undefined, ['response-rejected', unsafeContext])

    const record = sink.mock.calls[0][0]
    expect(record.context).toEqual({ count: 2 })
  })

  it('allows reporting evaluation identities while rejecting patient-identifying context', () => {
    vi.stubEnv('VITE_ENABLE_TEST_LOGS', 'true')
    const sink = vi.fn<RuntimeLogSink>()
    const logger = createRuntimeLogger('reporting-shell', sink)
    const context = {
      evaluationId: 'reporting-314-7',
      patientExaminationId: 314,
      pinnedIdentity: 'clinical-reporting@1.0.0',
      requestedIdentity: 'clinical-reporting@2.0.0',
      responseIdentity: 'clinical-reporting@1.0.0',
      registryRevision: 'registry-sha-1',
      reasonCode: 'superseded',
      supersessionReason: 'dag-context-changed',
      patientName: 'Jane Doe'
    }

    Reflect.apply(logger.warn, undefined, ['evaluation-superseded', context])

    const record = sink.mock.calls[0][0]
    expect(record.context).toEqual({
      evaluationId: 'reporting-314-7',
      patientExaminationId: 314,
      pinnedIdentity: 'clinical-reporting@1.0.0',
      requestedIdentity: 'clinical-reporting@2.0.0',
      responseIdentity: 'clinical-reporting@1.0.0',
      registryRevision: 'registry-sha-1',
      reasonCode: 'superseded',
      supersessionReason: 'dag-context-changed'
    })
    expect(JSON.stringify(record)).not.toContain('Jane Doe')
  })

  it('gates debug output behind the explicit frontend debug flag', () => {
    vi.stubEnv('VITE_ENABLE_TEST_LOGS', 'true')
    const sink = vi.fn<RuntimeLogSink>()
    const logger = createRuntimeLogger('annotation', sink)

    logger.debug('refresh-complete', { count: 3 })
    expect(sink).not.toHaveBeenCalled()

    vi.stubEnv('VITE_ENABLE_DEBUG', 'true')
    logger.debug('refresh-complete', { count: 3 })
    expect(sink).toHaveBeenCalledOnce()
  })
})
