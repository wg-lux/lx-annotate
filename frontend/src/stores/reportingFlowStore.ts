import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { savePatientExaminationDraft } from '@/api/reportDraftApi'
import type {
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimePayload,
  ReportTemplateSectionDraft,
  ReportTemplateIdentity
} from '@/types/reportTemplate'
import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate'
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi'
import type { ReportLanguageCode } from '@/api/reportingLanguagesApi'

type SessionStatus = 'idle' | 'active' | 'expired' | 'restarting'

export type ReportingLookupSnapshot = Record<string, unknown>
export type ReportingTemplateValidation = ReportTemplateRuntimeValidationResult | null

export type ReportingIndicationRow = {
  examinationIndicationId: number | null
  indicationChoiceId: number | null
}

export type ReportingRuntimeDraft = {
  draftId: string
  patientExaminationId: number
  moduleName: string
  templateName: string | null
  templateIdentity?: ReportTemplateIdentity | null
  payload: ReportTemplateRuntimePayload
  hydratedFrom: 'session_storage' | 'backend_context' | 'draft_api'
  updatedAt: string
}

type PersistedReportingFlowState = {
  lookupToken: string | null
  caseId: string | null
  patientExaminationId: number | null
  selectedPatientId: number | null
  selectedExaminationId: number | null
  activeReportId: number | null
  indications: ReportingIndicationRow[]
  selectedKbModule: string
  selectedReportLanguage: ReportLanguageCode
  selectedTemplateName: string | null
  selectedTemplateIdentity: ReportTemplateIdentity | null
  templateSectionDrafts: Record<string, ReportTemplateSectionDraft>
  runtimeDraftsByPatientExaminationId: Record<string, ReportingRuntimeDraft>
}

type PersistedReportingFlowEnvelope = {
  ownerSub: string | null
  expiresAt: number
  state: PersistedReportingFlowState
}

const STORAGE_KEY = 'reportingFlowState.v2'
const LEGACY_STORAGE_KEY = 'reportingFlowState.v1'
const STORAGE_TTL_MS = 30 * 60 * 1000
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 1500
let runtimeDraftEntityCounter = 0

function nextRuntimeDraftEntityId(prefix: string): string {
  runtimeDraftEntityCounter += 1
  return `${prefix}_${runtimeDraftEntityCounter}`
}

function normalizeRuntimeDescriptors(
  descriptors: ReportTemplateRuntimeDescriptorInput[] | undefined
): ReportTemplateRuntimeDescriptorInput[] {
  if (!Array.isArray(descriptors)) return []
  return descriptors.map((descriptor) => ({
    ...descriptor,
    localId: descriptor.localId || nextRuntimeDraftEntityId('descriptor')
  }))
}

function normalizeRuntimeClassificationChoices(
  classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[] | undefined
): ReportTemplateRuntimeClassificationChoiceInput[] {
  if (!Array.isArray(classificationChoices)) return []
  return classificationChoices.map((classificationChoice) => ({
    ...classificationChoice,
    localId: classificationChoice.localId || nextRuntimeDraftEntityId('classification'),
    descriptors: normalizeRuntimeDescriptors(classificationChoice.descriptors)
  }))
}

function normalizeRuntimePatientFindings(
  patientFindings: ReportTemplateRuntimePatientFindingInput[] | undefined
): ReportTemplateRuntimePatientFindingInput[] {
  if (!Array.isArray(patientFindings)) return []
  return patientFindings.map((patientFinding) => ({
    ...patientFinding,
    localId: patientFinding.localId || nextRuntimeDraftEntityId('finding'),
    classificationChoices: normalizeRuntimeClassificationChoices(
      patientFinding.classificationChoices
    )
  }))
}

function normalizeRuntimePayloadIds(
  payload: ReportTemplateRuntimePayload
): ReportTemplateRuntimePayload {
  return {
    ...payload,
    patientFindings: normalizeRuntimePatientFindings(payload.patientFindings)
  }
}

function draftPersistenceErrorMessage(error: unknown): string {
  const errorRecord = error && typeof error === 'object' ? (error as Record<string, unknown>) : {}
  const response =
    errorRecord.response && typeof errorRecord.response === 'object'
      ? (errorRecord.response as Record<string, unknown>)
      : {}
  const data =
    response.data && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>)
      : {}
  const nonFieldErrors = data.nonFieldErrors ?? data.non_field_errors
  const firstNonFieldError =
    Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === 'string'
      ? nonFieldErrors[0]
      : null
  return (
    (typeof data.detail === 'string' ? data.detail : null) ||
    firstNonFieldError ||
    (typeof errorRecord.message === 'string' ? errorRecord.message : null) ||
    'Der Reporting-Entwurf konnte nicht gespeichert werden.'
  )
}

function clearPersistedState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Persisted reporting state cleanup is best-effort.
  }
}

function normalizePersistedState(
  parsed: Partial<PersistedReportingFlowState>
): PersistedReportingFlowState {
  const runtimeDraftsByPatientExaminationId =
    parsed.runtimeDraftsByPatientExaminationId &&
    typeof parsed.runtimeDraftsByPatientExaminationId === 'object'
      ? Object.fromEntries(
          Object.entries(parsed.runtimeDraftsByPatientExaminationId).filter(([, value]) => {
            if (!value || typeof value !== 'object') return false
            const draft = value as Partial<ReportingRuntimeDraft>
            return (
              typeof draft.draftId === 'string' &&
              typeof draft.patientExaminationId === 'number' &&
              !!draft.payload &&
              typeof draft.payload === 'object'
            )
          })
        )
      : {}

  return {
    lookupToken: typeof parsed.lookupToken === 'string' ? parsed.lookupToken : null,
    caseId: typeof parsed.caseId === 'string' && parsed.caseId.trim() ? parsed.caseId : null,
    patientExaminationId:
      typeof parsed.patientExaminationId === 'number' ? parsed.patientExaminationId : null,
    selectedPatientId:
      typeof parsed.selectedPatientId === 'number' ? parsed.selectedPatientId : null,
    selectedExaminationId:
      typeof parsed.selectedExaminationId === 'number' ? parsed.selectedExaminationId : null,
    activeReportId: typeof parsed.activeReportId === 'number' ? parsed.activeReportId : null,
    indications: Array.isArray(parsed.indications)
      ? parsed.indications.map((row) => ({
          examinationIndicationId:
            typeof row?.examinationIndicationId === 'number' ? row.examinationIndicationId : null,
          indicationChoiceId:
            typeof row?.indicationChoiceId === 'number' ? row.indicationChoiceId : null
        }))
      : [],
    selectedKbModule:
      typeof parsed.selectedKbModule === 'string' && parsed.selectedKbModule.trim()
        ? parsed.selectedKbModule
        : 'report_template_examples',
    selectedReportLanguage:
      parsed.selectedReportLanguage === 'en' || parsed.selectedReportLanguage === 'de'
        ? parsed.selectedReportLanguage
        : 'de',
    selectedTemplateName:
      typeof parsed.selectedTemplateName === 'string' && parsed.selectedTemplateName.trim()
        ? parsed.selectedTemplateName
        : null,
    selectedTemplateIdentity:
      parsed.selectedTemplateIdentity && typeof parsed.selectedTemplateIdentity === 'object'
        ? parsed.selectedTemplateIdentity
        : null,
    templateSectionDrafts:
      parsed.templateSectionDrafts && typeof parsed.templateSectionDrafts === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.templateSectionDrafts).map(([key, value]) => {
              const draft = value as Partial<ReportTemplateSectionDraft> | undefined
              return [
                key,
                {
                  note: typeof draft?.note === 'string' ? draft.note : '',
                  includePatientData: !!draft?.includePatientData,
                  includeExaminationData: !!draft?.includeExaminationData
                }
              ]
            })
          )
        : {},
    runtimeDraftsByPatientExaminationId: runtimeDraftsByPatientExaminationId as Record<
      string,
      ReportingRuntimeDraft
    >
  }
}

function loadPersistedState(ownerSub: string | null): PersistedReportingFlowState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedReportingFlowEnvelope>
    if (!parsed || typeof parsed !== 'object') {
      clearPersistedState()
      return null
    }
    if (
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Date.now() ||
      parsed.ownerSub !== ownerSub ||
      !parsed.state ||
      typeof parsed.state !== 'object'
    ) {
      clearPersistedState()
      return null
    }
    return normalizePersistedState(parsed.state)
  } catch {
    clearPersistedState()
    return null
  }
}

export const useReportingFlowStore = defineStore('reportingFlow', () => {
  const authSubject = ref<string | null>(null)
  const sessionStatus = ref<SessionStatus>('idle')
  const lookupToken = ref<string | null>(null)
  const caseId = ref<string | null>(null)
  const patientExaminationId = ref<number | null>(null)
  const selectedPatientId = ref<number | null>(null)
  const selectedExaminationId = ref<number | null>(null)
  const activeReportId = ref<number | null>(null)
  const selectedKbModule = ref<string>('report_template_examples')
  const selectedReportLanguage = ref<ReportLanguageCode>('de')
  const selectedTemplateName = ref<string | null>(null)
  const selectedTemplateIdentity = ref<ReportTemplateIdentity | null>(null)
  const templateSectionDrafts = ref<Record<string, ReportTemplateSectionDraft>>({})
  const indications = ref<ReportingIndicationRow[]>([
    { examinationIndicationId: null, indicationChoiceId: null }
  ])
  const lookupSnapshot = ref<ReportingLookupSnapshot | null>(null)
  const lastTemplateValidation = ref<ReportingTemplateValidation>(null)
  const findingsRevision = ref(0)
  const lastFindingsEvent = ref<{
    type: 'finding_added' | 'classification_updated'
    at: string
    findingId: number
    classificationId?: number
    choiceId?: number | null
  } | null>(null)
  const mediaPreload = ref<TimelineLatestPayload | null>(null)
  const mediaPreloadStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const mediaPreloadError = ref<string | null>(null)
  const runtimeDraftsByPatientExaminationId = ref<Record<string, ReportingRuntimeDraft>>({})
  const draftPersistenceStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const draftPersistenceError = ref<string | null>(null)
  const lastPersistedDraftAt = ref<string | null>(null)
  const draftAutosaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const draftAutosaveSignature = ref<string | null>(null)
  const draftPersistencePromise = ref<Promise<void> | null>(null)
  const savingFinalReport = ref(false)

  const hasActiveCase = computed(
    () =>
      !!caseId.value &&
      !!patientExaminationId.value &&
      !!selectedExaminationId.value &&
      !!selectedPatientId.value
  )

  const currentRuntimeDraft = computed<ReportingRuntimeDraft | null>(() => {
    if (!patientExaminationId.value) return null
    return runtimeDraftsByPatientExaminationId.value[String(patientExaminationId.value)] || null
  })

  const hasDraftContent = computed(() => {
    const hasNonDefaultIndications =
      indications.value.length > 1 ||
      indications.value.some(
        (row) => row.examinationIndicationId !== null || row.indicationChoiceId !== null
      )

    return !!(
      patientExaminationId.value &&
      (activeReportId.value ||
        currentRuntimeDraft.value ||
        selectedTemplateName.value ||
        Object.keys(templateSectionDrafts.value).length ||
        hasNonDefaultIndications ||
        findingsRevision.value > 0)
    )
  })

  const canUseLookupPages = computed(
    () => !!patientExaminationId.value && !!lookupToken.value && sessionStatus.value !== 'expired'
  )

  function setLookupSession(params: {
    lookupToken: string | null
    patientExaminationId: number | null
    status?: SessionStatus
  }) {
    lookupToken.value = params.lookupToken
    patientExaminationId.value = params.patientExaminationId
    sessionStatus.value = params.status ?? (params.lookupToken ? 'active' : 'idle')
  }

  function setPatientExaminationContext(params: {
    patientExaminationId: number | null
    selectedPatientId?: number | null
    selectedExaminationId?: number | null
    preserveTemplateSelection?: boolean
  }) {
    patientExaminationId.value = params.patientExaminationId
    if (params.selectedPatientId !== undefined) {
      selectedPatientId.value = params.selectedPatientId
    }
    if (params.selectedExaminationId !== undefined) {
      selectedExaminationId.value = params.selectedExaminationId
    }

    lookupToken.value = null
    sessionStatus.value = 'idle'
    activeReportId.value = null
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    if (!(params.preserveTemplateSelection ?? false)) {
      selectedTemplateName.value = null
      selectedTemplateIdentity.value = null
      templateSectionDrafts.value = {}
    } else {
      templateSectionDrafts.value = {}
    }
  }

  function setCaseContext(params: { caseId: string | null; selectedPatientId?: number | null }) {
    caseId.value = params.caseId
    if (params.selectedPatientId !== undefined) {
      selectedPatientId.value = params.selectedPatientId
    }
  }

  function setRuntimeDraft(draft: ReportingRuntimeDraft) {
    runtimeDraftsByPatientExaminationId.value = {
      ...runtimeDraftsByPatientExaminationId.value,
      [String(draft.patientExaminationId)]: {
        ...draft,
        templateIdentity: draft.templateIdentity ?? selectedTemplateIdentity.value,
        payload: normalizeRuntimePayloadIds(draft.payload)
      }
    }
  }

  function markDraftPersistenceHydrated(updatedAt: string | null) {
    draftPersistenceStatus.value = updatedAt ? 'saved' : 'idle'
    draftPersistenceError.value = null
    lastPersistedDraftAt.value = updatedAt
    draftAutosaveSignature.value = currentDraftPersistenceSignature.value
  }

  function updateCurrentRuntimeDraft(
    updater: (draft: ReportingRuntimeDraft) => ReportingRuntimeDraft | null
  ): ReportingRuntimeDraft | null {
    const currentDraft = currentRuntimeDraft.value
    if (!currentDraft) return null
    const nextDraft = updater(currentDraft)
    if (!nextDraft) return null
    setRuntimeDraft({
      ...nextDraft,
      updatedAt: new Date().toISOString()
    })
    return runtimeDraftsByPatientExaminationId.value[String(nextDraft.patientExaminationId)] || null
  }

  function addFinding(params: { findingName: string }): string | null {
    if (!params.findingName.trim()) return null
    const findingLocalId = nextRuntimeDraftEntityId('finding')
    const updated = updateCurrentRuntimeDraft((draft) => ({
      ...draft,
      payload: {
        ...draft.payload,
        patientFindings: [
          ...draft.payload.patientFindings,
          {
            localId: findingLocalId,
            finding: params.findingName.trim(),
            classificationChoices: []
          }
        ]
      }
    }))
    return updated ? findingLocalId : null
  }

  function removeFinding(findingLocalId: string) {
    if (!findingLocalId) return
    updateCurrentRuntimeDraft((draft) => ({
      ...draft,
      payload: {
        ...draft.payload,
        patientFindings: draft.payload.patientFindings.filter(
          (finding) => finding.localId !== findingLocalId
        )
      }
    }))
  }

  function updateClassificationValue(params: {
    findingLocalId: string
    classificationName: string
    classificationChoice: string | null
    descriptors?: ReportTemplateRuntimeDescriptorInput[]
  }) {
    if (!params.findingLocalId || !params.classificationName.trim()) return
    updateCurrentRuntimeDraft((draft) => ({
      ...draft,
      payload: {
        ...draft.payload,
        patientFindings: draft.payload.patientFindings.map((finding) => {
          if (finding.localId !== params.findingLocalId) return finding

          const classificationKey = params.classificationName.trim()
          const remainingChoices = finding.classificationChoices.filter(
            (choice) => choice.classification !== classificationKey
          )

          if (!params.classificationChoice) {
            return {
              ...finding,
              classificationChoices: remainingChoices
            }
          }

          const existingChoice = finding.classificationChoices.find(
            (choice) => choice.classification === classificationKey
          )
          const nextChoice: ReportTemplateRuntimeClassificationChoiceInput = {
            localId: existingChoice?.localId || nextRuntimeDraftEntityId('classification'),
            classification: classificationKey,
            classificationChoice: params.classificationChoice,
            descriptors: normalizeRuntimeDescriptors(params.descriptors)
          }

          return {
            ...finding,
            classificationChoices: [...remainingChoices, nextChoice]
          }
        })
      }
    }))
  }

  function clearRuntimeDraft(targetPatientExaminationId?: number | null) {
    if (targetPatientExaminationId == null) {
      runtimeDraftsByPatientExaminationId.value = {}
      return
    }
    const next = { ...runtimeDraftsByPatientExaminationId.value }
    delete next[String(targetPatientExaminationId)]
    runtimeDraftsByPatientExaminationId.value = next
  }

  const currentDraftPersistencePayload = computed(() => {
    const draft = currentRuntimeDraft.value
    if (!draft || !draft.patientExaminationId) return null
    return {
      patientExaminationId: draft.patientExaminationId,
      moduleName: draft.moduleName,
      templateName: draft.templateName,
      ...(draft.templateIdentity ?? selectedTemplateIdentity.value
        ? { templateIdentity: draft.templateIdentity ?? selectedTemplateIdentity.value }
        : {}),
      payload: draft.payload
    }
  })

  const currentDraftPersistenceSignature = computed(() => {
    if (!currentDraftPersistencePayload.value) return null
    return JSON.stringify(currentDraftPersistencePayload.value)
  })

  const hasUnpersistedDraftChanges = computed(() => {
    if (!currentRuntimeDraft.value) return false
    if (draftPersistenceStatus.value === 'saving') return true
    const currentSignature = currentDraftPersistenceSignature.value
    if (!currentSignature) return false
    return currentSignature !== draftAutosaveSignature.value
  })

  function cancelDraftAutosave() {
    if (!draftAutosaveTimer.value) return
    clearTimeout(draftAutosaveTimer.value)
    draftAutosaveTimer.value = null
  }

  async function persistCurrentRuntimeDraft() {
    if (savingFinalReport.value) return
    const draft = currentRuntimeDraft.value
    if (!draft?.patientExaminationId) return
    if (draftPersistencePromise.value) {
      return draftPersistencePromise.value
    }
    const signatureToPersist = currentDraftPersistenceSignature.value
    draftPersistenceStatus.value = 'saving'
    draftPersistenceError.value = null
    const request = (async () => {
      try {
        const response = await savePatientExaminationDraft({
          patientExaminationId: draft.patientExaminationId,
          moduleName: draft.moduleName,
          templateName: draft.templateName,
          ...(draft.templateIdentity ?? selectedTemplateIdentity.value
            ? { templateIdentity: draft.templateIdentity ?? selectedTemplateIdentity.value }
            : {}),
          payload: draft.payload
        })
        draftPersistenceStatus.value = 'saved'
        lastPersistedDraftAt.value = response.updatedAt ?? response.updated_at ?? null
        draftAutosaveSignature.value = signatureToPersist
      } catch (error: unknown) {
        draftPersistenceStatus.value = 'error'
        draftPersistenceError.value = draftPersistenceErrorMessage(error)
        throw error
      } finally {
        draftPersistencePromise.value = null
      }
    })()
    draftPersistencePromise.value = request
    return request
  }

  function scheduleDraftAutosave() {
    cancelDraftAutosave()
    if (savingFinalReport.value) return
    draftAutosaveTimer.value = setTimeout(() => {
      draftAutosaveTimer.value = null
      if (savingFinalReport.value) return
      void persistCurrentRuntimeDraft().catch(() => {
        // Scheduled autosave errors are exposed through draftPersistenceStatus/error.
        // Explicit flushes still reject so navigation can fail closed.
      })
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS)
  }

  async function flushDraftAutosave() {
    cancelDraftAutosave()
    if (savingFinalReport.value) return
    if (!currentRuntimeDraft.value) return
    if (!hasUnpersistedDraftChanges.value && !draftPersistencePromise.value) return
    await persistCurrentRuntimeDraft()
  }

  function setSavingFinalReport(value: boolean) {
    savingFinalReport.value = value
    if (value) {
      cancelDraftAutosave()
      return
    }
    if (hasUnpersistedDraftChanges.value && !draftPersistencePromise.value) {
      scheduleDraftAutosave()
    }
  }

  function setCaseSelection(params: {
    selectedPatientId?: number | null
    selectedExaminationId?: number | null
  }) {
    if (params.selectedPatientId !== undefined) selectedPatientId.value = params.selectedPatientId
    if (params.selectedExaminationId !== undefined)
      selectedExaminationId.value = params.selectedExaminationId
  }

  function setActiveReportId(id: number | null) {
    activeReportId.value = id
  }

  function setSessionStatus(status: SessionStatus) {
    sessionStatus.value = status
  }

  function setTemplateSelection(params: {
    moduleName?: string
    templateName?: string | null
    templateIdentity?: ReportTemplateIdentity | null
  }) {
    if (params.moduleName !== undefined) {
      selectedKbModule.value = params.moduleName || 'report_template_examples'
    }
    if (params.templateName !== undefined) {
      selectedTemplateName.value = params.templateName || null
    }
    if (params.templateIdentity !== undefined) {
      selectedTemplateIdentity.value = params.templateIdentity
    }
  }

  function setReportLanguage(language: ReportLanguageCode) {
    selectedReportLanguage.value = language
  }

  function setTemplateSectionDraft(
    sectionName: string,
    patch: Partial<ReportTemplateSectionDraft>
  ) {
    if (!sectionName) return
    const current = templateSectionDrafts.value[sectionName] || {
      note: '',
      includePatientData: false,
      includeExaminationData: false
    }
    templateSectionDrafts.value = {
      ...templateSectionDrafts.value,
      [sectionName]: {
        note: patch.note ?? current.note,
        includePatientData: patch.includePatientData ?? current.includePatientData,
        includeExaminationData: patch.includeExaminationData ?? current.includeExaminationData
      }
    }
  }

  function clearTemplateSectionDrafts() {
    templateSectionDrafts.value = {}
  }

  function applyPersistedState(persisted: PersistedReportingFlowState | null) {
    lookupToken.value = persisted?.lookupToken ?? null
    caseId.value = persisted?.caseId ?? null
    patientExaminationId.value = persisted?.patientExaminationId ?? null
    selectedPatientId.value = persisted?.selectedPatientId ?? null
    selectedExaminationId.value = persisted?.selectedExaminationId ?? null
    activeReportId.value = persisted?.activeReportId ?? null
    indications.value = persisted?.indications?.length
      ? persisted.indications
      : [{ examinationIndicationId: null, indicationChoiceId: null }]
    selectedKbModule.value = persisted?.selectedKbModule ?? 'report_template_examples'
    selectedReportLanguage.value = persisted?.selectedReportLanguage ?? 'de'
    selectedTemplateName.value = persisted?.selectedTemplateName ?? null
    selectedTemplateIdentity.value = persisted?.selectedTemplateIdentity ?? null
    templateSectionDrafts.value = persisted?.templateSectionDrafts ?? {}
    runtimeDraftsByPatientExaminationId.value = persisted?.runtimeDraftsByPatientExaminationId ?? {}
  }

  function bindAuthSubject(subject: string | null | undefined) {
    const normalized = typeof subject === 'string' && subject.trim() ? subject.trim() : null
    if (authSubject.value === normalized) return
    authSubject.value = normalized
    clearAll()
    if (!normalized) {
      clearPersistedState()
      return
    }
    applyPersistedState(loadPersistedState(normalized))
  }

  function resetForPatientSwitch() {
    if (draftAutosaveTimer.value) {
      clearTimeout(draftAutosaveTimer.value)
      draftAutosaveTimer.value = null
    }
    lookupToken.value = null
    caseId.value = null
    patientExaminationId.value = null
    selectedExaminationId.value = null
    activeReportId.value = null
    sessionStatus.value = 'idle'
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    selectedTemplateName.value = null
    selectedTemplateIdentity.value = null
    templateSectionDrafts.value = {}
    runtimeDraftsByPatientExaminationId.value = {}
    mediaPreload.value = null
    mediaPreloadStatus.value = 'idle'
    mediaPreloadError.value = null
    draftPersistenceStatus.value = 'idle'
    draftPersistenceError.value = null
    lastPersistedDraftAt.value = null
    draftAutosaveSignature.value = null
    draftPersistencePromise.value = null
    savingFinalReport.value = false
  }

  function clearAll() {
    if (draftAutosaveTimer.value) {
      clearTimeout(draftAutosaveTimer.value)
      draftAutosaveTimer.value = null
    }
    lookupToken.value = null
    caseId.value = null
    patientExaminationId.value = null
    selectedPatientId.value = null
    selectedExaminationId.value = null
    activeReportId.value = null
    sessionStatus.value = 'idle'
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    selectedKbModule.value = 'report_template_examples'
    selectedReportLanguage.value = 'de'
    selectedTemplateName.value = null
    selectedTemplateIdentity.value = null
    templateSectionDrafts.value = {}
    runtimeDraftsByPatientExaminationId.value = {}
    mediaPreload.value = null
    mediaPreloadStatus.value = 'idle'
    mediaPreloadError.value = null
    draftPersistenceStatus.value = 'idle'
    draftPersistenceError.value = null
    lastPersistedDraftAt.value = null
    draftAutosaveSignature.value = null
    draftPersistencePromise.value = null
    savingFinalReport.value = false
  }

  function setMediaPreloadLoading() {
    mediaPreloadStatus.value = 'loading'
    mediaPreloadError.value = null
  }

  function setMediaPreload(payload: TimelineLatestPayload | null) {
    mediaPreload.value = payload
    mediaPreloadStatus.value = payload ? 'ready' : 'idle'
    mediaPreloadError.value = null
  }

  function setMediaPreloadError(message: string) {
    mediaPreloadStatus.value = 'error'
    mediaPreloadError.value = message
  }

  function clearMediaPreload() {
    mediaPreload.value = null
    mediaPreloadStatus.value = 'idle'
    mediaPreloadError.value = null
  }

  function setIndications(rows: ReportingIndicationRow[]) {
    indications.value = rows.length
      ? rows
      : [{ examinationIndicationId: null, indicationChoiceId: null }]
  }

  function setLookupSnapshot(snapshot: ReportingLookupSnapshot | null) {
    lookupSnapshot.value = snapshot
  }

  function patchLookupSnapshot(partial: Partial<ReportingLookupSnapshot>) {
    lookupSnapshot.value = {
      ...(lookupSnapshot.value || {}),
      ...partial
    }
  }

  function setLastTemplateValidation(validation: ReportingTemplateValidation) {
    lastTemplateValidation.value = validation
  }

  function noteFindingAdded(findingId: number) {
    findingsRevision.value += 1
    lastFindingsEvent.value = {
      type: 'finding_added',
      at: new Date().toISOString(),
      findingId
    }
  }

  function noteClassificationUpdated(
    findingId: number,
    classificationId: number,
    choiceId: number | null
  ) {
    findingsRevision.value += 1
    lastFindingsEvent.value = {
      type: 'classification_updated',
      at: new Date().toISOString(),
      findingId,
      classificationId,
      choiceId
    }
  }

  function addIndicationRow() {
    indications.value = [
      ...indications.value,
      { examinationIndicationId: null, indicationChoiceId: null }
    ]
  }

  function updateIndicationRow(index: number, patch: Partial<ReportingIndicationRow>) {
    if (index < 0 || index >= indications.value.length) return
    const next = indications.value.slice()
    next[index] = {
      ...next[index],
      ...patch
    }
    indications.value = next
  }

  function removeIndicationRow(index: number) {
    if (indications.value.length <= 1) {
      indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
      return
    }
    indications.value = indications.value.filter((_, i) => i !== index)
  }

  const persistable = computed<PersistedReportingFlowState>(() => ({
    lookupToken: lookupToken.value,
    caseId: caseId.value,
    patientExaminationId: patientExaminationId.value,
    selectedPatientId: selectedPatientId.value,
    selectedExaminationId: selectedExaminationId.value,
    activeReportId: activeReportId.value,
    indications: indications.value,
    selectedKbModule: selectedKbModule.value,
    selectedReportLanguage: selectedReportLanguage.value,
    selectedTemplateName: selectedTemplateName.value,
    selectedTemplateIdentity: selectedTemplateIdentity.value,
    templateSectionDrafts: templateSectionDrafts.value,
    runtimeDraftsByPatientExaminationId: runtimeDraftsByPatientExaminationId.value
  }))

  watch(
    persistable,
    (state) => {
      if (!authSubject.value) {
        clearPersistedState()
        return
      }
      const envelope: PersistedReportingFlowEnvelope = {
        ownerSub: authSubject.value,
        expiresAt: Date.now() + STORAGE_TTL_MS,
        state
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    },
    { deep: true }
  )

  watch(currentDraftPersistenceSignature, (signature) => {
    if (!signature) return
    if (signature === draftAutosaveSignature.value) return
    scheduleDraftAutosave()
  })

  return {
    authSubject,
    sessionStatus,
    lookupToken,
    caseId,
    patientExaminationId,
    selectedPatientId,
    selectedExaminationId,
    activeReportId,
    selectedKbModule,
    selectedReportLanguage,
    selectedTemplateName,
    selectedTemplateIdentity,
    templateSectionDrafts,
    runtimeDraftsByPatientExaminationId,
    currentRuntimeDraft,
    indications,
    lookupSnapshot,
    lastTemplateValidation,
    findingsRevision,
    lastFindingsEvent,
    mediaPreload,
    mediaPreloadStatus,
    mediaPreloadError,
    draftPersistenceStatus,
    draftPersistenceError,
    lastPersistedDraftAt,
    hasUnpersistedDraftChanges,
    savingFinalReport,
    hasActiveCase,
    hasDraftContent,
    canUseLookupPages,
    setLookupSession,
    setCaseContext,
    setPatientExaminationContext,
    setRuntimeDraft,
    markDraftPersistenceHydrated,
    persistCurrentRuntimeDraft,
    flushDraftAutosave,
    setSavingFinalReport,
    clearRuntimeDraft,
    addFinding,
    removeFinding,
    updateClassificationValue,
    setCaseSelection,
    setActiveReportId,
    setSessionStatus,
    setTemplateSelection,
    setReportLanguage,
    setTemplateSectionDraft,
    clearTemplateSectionDrafts,
    bindAuthSubject,
    setIndications,
    setLookupSnapshot,
    patchLookupSnapshot,
    setLastTemplateValidation,
    noteFindingAdded,
    noteClassificationUpdated,
    setMediaPreloadLoading,
    setMediaPreload,
    setMediaPreloadError,
    clearMediaPreload,
    addIndicationRow,
    updateIndicationRow,
    removeIndicationRow,
    resetForPatientSwitch,
    clearAll
  }
})
