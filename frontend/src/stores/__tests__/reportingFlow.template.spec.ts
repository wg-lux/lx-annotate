import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useReportingFlowStore } from '@/stores/reportingFlowStore'

type SavePatientExaminationDraft =
  typeof import('@/api/reportDraftApi').savePatientExaminationDraft

const hoisted = vi.hoisted(() => ({
  reportDraftApi: {
    savePatientExaminationDraft: vi.fn<SavePatientExaminationDraft>()
  }
}))

vi.mock('@/api/reportDraftApi', () => ({
  savePatientExaminationDraft: hoisted.reportDraftApi.savePatientExaminationDraft
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

describe('reportingFlowStore template draft state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
    hoisted.reportDraftApi.savePatientExaminationDraft.mockResolvedValue({
      patient_examination_id: 42,
      revision: 1,
      draft: {
        module_name: 'report_template_examples',
        template_name: 'star_upper_gi_main',
        payload: {
          patient: 'patient_7',
          examiners: [],
          examination: 'colonoscopy',
          patientFindings: []
        }
      },
      updated_at: '2026-03-19T14:00:00.000Z'
    })
  })

  it('does not invent a knowledge-base module before terminology is active', () => {
    const flow = useReportingFlowStore()

    expect(flow.selectedKbModule).toBe('')
    flow.setTemplateSelection({ moduleName: '' })
    expect(flow.selectedKbModule).toBe('')
  })

  it('stores template selection and section drafts for report reuse', () => {
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')

    flow.setTemplateSelection({
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main'
    })
    flow.setReportLanguage('en')
    flow.setTemplateSectionDraft('examination_baseline', {
      note: 'Baseline details',
      includePatientData: true
    })

    expect(flow.selectedKbModule).toBe('report_template_examples')
    expect(flow.selectedTemplateName).toBe('star_upper_gi_main')
    expect(flow.selectedReportLanguage).toBe('en')
    expect(flow.templateSectionDrafts.examination_baseline).toEqual({
      note: 'Baseline details',
      includePatientData: true,
      includeExaminationData: false
    })
  })

  it('drops persisted reporting state when the authenticated user changes', () => {
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({
      patientExaminationId: 42,
      selectedPatientId: 7,
      selectedExaminationId: 9
    })

    const reloaded = useReportingFlowStore()
    reloaded.bindAuthSubject('oidc:user-2')

    expect(reloaded.lookupToken).toBeNull()
    expect(reloaded.patientExaminationId).toBeNull()
    expect(reloaded.selectedPatientId).toBeNull()
    expect(reloaded.selectedExaminationId).toBeNull()
  })

  it('discards malformed persisted runtime drafts while retaining valid session context', () => {
    sessionStorage.setItem(
      'reportingFlowState.v2',
      JSON.stringify({
        ownerSub: 'oidc:user-1',
        expiresAt: Date.now() + 60_000,
        state: {
          patientExaminationId: 42,
          runtimeDraftsByPatientExaminationId: {
            '-1': {
              draftId: 'invalid-draft',
              patientExaminationId: -1,
              moduleName: 'report_template_examples',
              templateName: null,
              payload: {
                patient: 'patient_7',
                examiners: [],
                examination: 'colonoscopy',
                patientFindings: []
              },
              hydratedFrom: 'session_storage',
              updatedAt: '2026-03-19T14:00:00.000Z'
            }
          }
        }
      })
    )

    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')

    expect(flow.patientExaminationId).toBe(42)
    expect(flow.runtimeDraftsByPatientExaminationId).toEqual({})
  })

  it('clears only the requested runtime draft', () => {
    const flow = useReportingFlowStore()
    const makeDraft = (patientExaminationId: number) => ({
      draftId: `draft_${String(patientExaminationId)}`,
      patientExaminationId,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: `patient_${String(patientExaminationId)}`,
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context' as const,
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    flow.setRuntimeDraft(makeDraft(42))
    flow.setRuntimeDraft(makeDraft(43))
    flow.clearRuntimeDraft(42)

    expect(flow.runtimeDraftsByPatientExaminationId).toMatchObject({
      '43': makeDraft(43)
    })
    expect(flow.runtimeDraftsByPatientExaminationId['42']).toBeUndefined()
  })

  it('autosaves the current runtime draft to the backend draft endpoint', async () => {
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({
      patientExaminationId: 42,
      selectedPatientId: 7,
      selectedExaminationId: 9
    })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    await vi.advanceTimersByTimeAsync(1500)

    const firstSave = hoisted.reportDraftApi.savePatientExaminationDraft.mock.calls[0][0]
    expect(firstSave.patientExaminationId).toBe(42)
    expect(firstSave.expectedRevision).toBe(0)
    expect(firstSave.moduleName).toBe('report_template_examples')
    expect(firstSave.templateName).toBe('star_upper_gi_main')
    expect(firstSave).toMatchObject({
      indications: [{ examinationIndicationId: null, indicationChoiceId: null }],
      templateSectionDrafts: {},
      selectedReportLanguage: 'de',
      activeReportId: null,
      reportTextMode: 'generated',
      renderedText: ''
    })
    expect(firstSave.payload).toMatchObject({
      patient: 'patient_7',
      examination: 'colonoscopy'
    })
    expect(flow.draftPersistenceStatus).toBe('saved')
    expect(flow.currentRuntimeDraft?.revision).toBe(1)
    expect(flow.lastPersistedDraftAt).toBe('2026-03-19T14:00:00.000Z')
  })

  it('uses the server revision recorded during restored draft hydration on the next save', async () => {
    const flow = useReportingFlowStore()
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'draft_api',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })
    flow.markDraftPersistenceHydrated('2026-03-19T14:00:00.000Z', 5)
    flow.addFinding({ findingName: 'colon_polyp' })

    await vi.advanceTimersByTimeAsync(1500)

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 5 })
    )
  })

  it('autosaves report configuration changes as part of the complete draft document', async () => {
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })
    await vi.advanceTimersByTimeAsync(1500)
    hoisted.reportDraftApi.savePatientExaminationDraft.mockClear()

    flow.updateIndicationRow(0, { examinationIndicationId: 12, indicationChoiceId: 21 })
    flow.setTemplateSectionDraft('examination_baseline', {
      note: 'Clinically relevant note',
      includePatientData: true
    })
    flow.setReportLanguage('en')
    flow.setActiveReportId(88)
    flow.setRenderedReportText('Klinischer Freitext', 'manual')

    expect(flow.hasUnpersistedDraftChanges).toBe(true)
    await vi.advanceTimersByTimeAsync(1500)

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        indications: [{ examinationIndicationId: 12, indicationChoiceId: 21 }],
        templateSectionDrafts: {
          examination_baseline: {
            note: 'Clinically relevant note',
            includePatientData: true,
            includeExaminationData: false
          }
        },
        selectedReportLanguage: 'en',
        activeReportId: 88,
        reportTextMode: 'manual',
        renderedText: 'Klinischer Freitext'
      })
    )
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
  })

  it('tracks whether the current runtime draft has unpersisted changes', async () => {
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({
      patientExaminationId: 42,
      selectedPatientId: 7,
      selectedExaminationId: 9
    })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    expect(flow.hasUnpersistedDraftChanges).toBe(true)

    await vi.advanceTimersByTimeAsync(1500)
    expect(flow.hasUnpersistedDraftChanges).toBe(false)

    flow.addFinding({ findingName: 'colon_polyp' })
    expect(flow.hasUnpersistedDraftChanges).toBe(true)
  })

  it('persists annotation-only findings while keeping template verification separate', async () => {
    const flow = useReportingFlowStore()
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: '',
      templateName: null,
      verificationStatus: 'unverified',
      persistencePolicy: 'persistable',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })
    flow.addFinding({ findingName: 'colon_polyp' })

    await flow.persistCurrentRuntimeDraft()

    const annotationSave = hoisted.reportDraftApi.savePatientExaminationDraft.mock.calls[0][0]
    expect(annotationSave.patientExaminationId).toBe(42)
    expect(annotationSave.moduleName).toBe('')
    expect(annotationSave.templateName).toBeNull()
    expect(annotationSave.payload.patientFindings).toHaveLength(1)
    expect(annotationSave.payload.patientFindings[0]?.finding).toBe('colon_polyp')

    hoisted.reportDraftApi.savePatientExaminationDraft.mockClear()
    flow.setPatientExaminationContext({ patientExaminationId: 43 })
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.addFinding({ findingName: 'colon_adenoma' })
    await flow.persistCurrentRuntimeDraft()

    expect(flow.currentRuntimeDraft?.persistencePolicy).toBe('persistable')
    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(1)
  })

  it('blocks a cached draft from autosave until the new context verifies it', async () => {
    const flow = useReportingFlowStore()
    flow.setPatientExaminationContext({ patientExaminationId: 43 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'old_bundle',
      templateName: 'old_template',
      verificationStatus: 'verified',
      persistencePolicy: 'persistable',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: 'old_bundle',
        knowledgeBaseVersion: '1.0.0',
        patientFindings: []
      },
      hydratedFrom: 'session_storage',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    await vi.advanceTimersByTimeAsync(2000)

    expect(flow.currentRuntimeDraft?.verificationStatus).toBe('unverified')
    expect(flow.currentRuntimeDraft?.persistencePolicy).toBe('blocked_until_verified')
    expect(hoisted.reportDraftApi.savePatientExaminationDraft).not.toHaveBeenCalled()
  })

  it('drains edits made while an autosave request is still in flight', async () => {
    const firstSave = deferred<{
      patient_examination_id: number
      revision: number
      draft: Record<string, never>
      updated_at: string
    }>()
    hoisted.reportDraftApi.savePatientExaminationDraft
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValueOnce({
        patient_examination_id: 42,
        revision: 2,
        draft: {},
        updated_at: '2026-03-19T14:01:00.000Z'
      })
    const flow = useReportingFlowStore()
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    const persistence = flow.persistCurrentRuntimeDraft()
    await Promise.resolve()
    flow.addFinding({ findingName: 'colon_polyp' })
    firstSave.resolve({
      patient_examination_id: 42,
      revision: 1,
      draft: {},
      updated_at: '2026-03-19T14:00:00.000Z'
    })
    await persistence

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(2)
    expect(hoisted.reportDraftApi.savePatientExaminationDraft.mock.calls[1][0]).toMatchObject({
      patientExaminationId: 42,
      payload: {
        patientFindings: [{ finding: 'colon_polyp' }]
      }
    })
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
    expect(flow.draftPersistenceStatus).toBe('saved')
  })

  it('flushes pending autosave immediately when navigation requires a sync', async () => {
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({
      patientExaminationId: 42,
      selectedPatientId: 7,
      selectedExaminationId: 9
    })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).not.toHaveBeenCalled()

    await flow.flushDraftAutosave()

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(1)
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
  })

  it('suspends draft autosave during final persistence and resumes when still dirty', async () => {
    const flow = useReportingFlowStore()
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    flow.setSavingFinalReport(true)
    await vi.advanceTimersByTimeAsync(1500)
    await flow.flushDraftAutosave()

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).not.toHaveBeenCalled()
    expect(flow.hasUnpersistedDraftChanges).toBe(true)

    flow.setSavingFinalReport(false)
    await vi.advanceTimersByTimeAsync(1500)

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(1)
    expect(flow.hasUnpersistedDraftChanges).toBe(false)
  })

  it('records scheduled autosave failures without leaking an unhandled rejection', async () => {
    hoisted.reportDraftApi.savePatientExaminationDraft.mockRejectedValueOnce({
      message: 'Request failed with status code 400',
      response: {
        data: {
          nonFieldErrors: ['template_identity.readiness: Extra inputs are not permitted']
        }
      }
    })
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z'
    })

    await vi.advanceTimersByTimeAsync(1500)

    expect(flow.draftPersistenceStatus).toBe('error')
    expect(flow.draftPersistenceError).toContain('template_identity.readiness')
    expect(flow.hasUnpersistedDraftChanges).toBe(true)
  })

  it('preserves local content and stops autosave after a stale draft revision conflict', async () => {
    hoisted.reportDraftApi.savePatientExaminationDraft.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: 'The report draft was modified by another writer.',
          current_revision: 7,
          updated_at: '2026-03-19T14:01:00.000Z'
        }
      }
    })
    const flow = useReportingFlowStore()
    flow.bindAuthSubject('oidc:user-1')
    flow.setPatientExaminationContext({ patientExaminationId: 42 })
    flow.setRuntimeDraft({
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      payload: {
        patient: 'patient_7',
        examiners: [],
        examination: 'colonoscopy',
        patientFindings: []
      },
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T13:55:00.000Z',
      revision: 3
    })
    flow.setRenderedReportText('Lokaler klinischer Freitext', 'manual')
    flow.updateIndicationRow(0, { examinationIndicationId: 12, indicationChoiceId: 21 })

    await vi.advanceTimersByTimeAsync(1500)

    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 3 })
    )
    expect(flow.draftPersistenceStatus).toBe('conflict')
    expect(flow.draftPersistenceError).toContain('nicht überschrieben')
    expect(flow.draftConflict).toEqual({
      patientExaminationId: 42,
      expectedRevision: 3,
      currentRevision: 7,
      updatedAt: '2026-03-19T14:01:00.000Z'
    })
    expect(flow.renderedReportText).toBe('Lokaler klinischer Freitext')
    expect(flow.reportTextMode).toBe('manual')
    expect(flow.indications).toEqual([{ examinationIndicationId: 12, indicationChoiceId: 21 }])
    expect(flow.currentRuntimeDraft?.revision).toBe(3)
    expect(flow.hasUnpersistedDraftChanges).toBe(true)

    flow.addFinding({ findingName: 'colon_polyp' })
    await vi.advanceTimersByTimeAsync(1500)
    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(1)
    await expect(flow.flushDraftAutosave()).rejects.toMatchObject({
      name: 'DraftRevisionConflictError'
    })

    expect(flow.discardConflictedLocalDraft()).toBe(true)
    expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(1)
    expect(flow.currentRuntimeDraft).toBeNull()
    expect(flow.renderedReportText).toBe('')
    expect(flow.draftConflict).toBeNull()
    const persisted = JSON.parse(sessionStorage.getItem('reportingFlowState.v2') || '{}') as {
      state?: { renderedReportText?: string; runtimeDraftsByPatientExaminationId?: Record<string, unknown> }
    }
    expect(persisted.state?.renderedReportText).toBe('')
    expect(persisted.state?.runtimeDraftsByPatientExaminationId?.['42']).toBeUndefined()
  })
})
