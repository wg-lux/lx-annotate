import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'

import { createAppRouter } from '@/router'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useToastStore } from '@/stores/toastStore'
import { savePatientExaminationDraft } from '@/api/reportDraftApi'

vi.mock('@/api/reportDraftApi', () => ({
  savePatientExaminationDraft: vi.fn()
}))

function createDirtyDraft(patientExaminationId: number) {
  const flow = useReportingFlowStore()
  flow.setPatientExaminationContext({ patientExaminationId })
  flow.setRuntimeDraft({
    draftId: `draft_${String(patientExaminationId)}`,
    patientExaminationId,
    moduleName: 'report_template_examples',
    templateName: 'example',
    payload: {
      patient: 'patient_1',
      examiners: [],
      examination: 'colonoscopy',
      patientFindings: []
    },
    hydratedFrom: 'backend_context',
    updatedAt: '2026-07-20T00:00:00.000Z'
  })
  return flow
}

describe('reporting routes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.mocked(savePatientExaminationDraft).mockResolvedValue({
      updatedAt: '2026-07-20T00:00:01.000Z'
    } as Awaited<ReturnType<typeof savePatientExaminationDraft>>)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each([
    ['/untersuchung', '/reporting'],
    ['/report-generator', '/reporting'],
    ['/reporting/123/template-requirements', '/reporting/123/findings'],
    ['/reporting/:patient_examination_id/findings', '/reporting'],
    ['/reporting/case-setup', '/reporting']
  ])('resolves %s through the application route configuration', async (from, expected) => {
    const router = createAppRouter(createMemoryHistory())

    await router.push(from)

    expect(router.currentRoute.value.path).toBe(expected)
  })

  it('rejects repeated patient-examination route parameters instead of joining them', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/reporting')
    const route = router
      .getRoutes()
      .find(
        (candidate) => candidate.path === '/reporting/:patient_examination_id/template-requirements'
      )

    if (!route || typeof route.redirect !== 'function') {
      throw new Error('Expected the legacy template-requirements redirect route')
    }

    const resolved = router.resolve('/reporting/123/template-requirements')
    expect(
      route.redirect(
        {
          ...resolved,
          params: { patient_examination_id: ['123', '456'] }
        },
        router.currentRoute.value
      )
    ).toBe('/reporting')
  })

  it('keeps navigation within the same reporting draft without flushing', async () => {
    const router = createAppRouter(createMemoryHistory())
    const flow = createDirtyDraft(123)
    const flushSpy = vi.spyOn(flow, 'flushDraftAutosave')
    await router.push('/reporting/123/findings')
    flushSpy.mockClear()

    await router.push('/reporting/123/report-editor')

    expect(router.currentRoute.value.path).toBe('/reporting/123/report-editor')
    expect(flushSpy).not.toHaveBeenCalled()
  })

  it('flushes a dirty draft before leaving its reporting context', async () => {
    const router = createAppRouter(createMemoryHistory())
    const flow = createDirtyDraft(123)
    await router.push('/reporting/123/findings')

    await router.push('/reporting')

    expect(savePatientExaminationDraft).toHaveBeenCalledTimes(1)
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
    expect(router.currentRoute.value.path).toBe('/reporting')
  })

  it('does not flush while final report persistence is active', async () => {
    const router = createAppRouter(createMemoryHistory())
    const flow = createDirtyDraft(123)
    flow.setSavingFinalReport(true)
    await router.push('/reporting/123/report-editor')

    await router.push('/reporting/123/finalized')
    await vi.advanceTimersByTimeAsync(1500)

    expect(savePatientExaminationDraft).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/reporting/123/finalized')
  })

  it('cancels navigation and reports an error when draft persistence fails', async () => {
    const router = createAppRouter(createMemoryHistory())
    createDirtyDraft(123)
    const toast = useToastStore()
    vi.mocked(savePatientExaminationDraft).mockRejectedValueOnce(new Error('storage unavailable'))
    await router.push('/reporting/123/findings')

    await router.push('/reporting')

    expect(router.currentRoute.value.path).toBe('/reporting/123/findings')
    expect(toast.toasts).toEqual([
      expect.objectContaining({
        status: 'error',
        text: 'Der Reporting-Entwurf konnte vor dem Verlassen nicht gespeichert werden.'
      })
    ])
  })
})
