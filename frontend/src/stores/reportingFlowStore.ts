import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ReportTemplateSectionDraft } from '@/types/reportTemplate'
import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate'
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi'

type SessionStatus = 'idle' | 'active' | 'expired' | 'restarting'

type ReportingRequirementSetLite = {
  id: number
  name: string
  type: string
}

export type ReportingLookupSnapshot = {
  requirementStatus?: Record<string, boolean>
  requirementSetStatus?: Record<string, boolean>
  suggestedActions?: Record<string, any[]>
  requirementsBySet?: Record<string, Array<{ id: number; name: string }>>
  requirementSets?: ReportingRequirementSetLite[]
  selectedRequirementSetIds?: number[]
  candidateRequirementSetIds?: number[]
  candidateRequirementSetConfidence?: number | null
}

export type ReportingRequirementGuidance = Record<string, unknown> | null
export type ReportingTemplateValidation = ReportTemplateRuntimeValidationResult | null

export type ReportingIndicationRow = {
  examinationIndicationId: number | null
  indicationChoiceId: number | null
}

type PersistedReportingFlowState = {
  lookupToken: string | null
  patientExaminationId: number | null
  selectedPatientId: number | null
  selectedExaminationId: number | null
  selectedRequirementSetIds: number[]
  activeReportId: number | null
  indications: ReportingIndicationRow[]
  selectedKbModule: string
  selectedTemplateName: string | null
  templateSectionDrafts: Record<string, ReportTemplateSectionDraft>
}

type PersistedReportingFlowEnvelope = {
  ownerSub: string | null
  expiresAt: number
  state: PersistedReportingFlowState
}

const STORAGE_KEY = 'reportingFlowState.v2'
const LEGACY_STORAGE_KEY = 'reportingFlowState.v1'
const STORAGE_TTL_MS = 30 * 60 * 1000

function clearPersistedState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {}
}

function normalizePersistedState(
  parsed: Partial<PersistedReportingFlowState>
): PersistedReportingFlowState {
  return {
    lookupToken: typeof parsed.lookupToken === 'string' ? parsed.lookupToken : null,
    patientExaminationId:
      typeof parsed.patientExaminationId === 'number' ? parsed.patientExaminationId : null,
    selectedPatientId:
      typeof parsed.selectedPatientId === 'number' ? parsed.selectedPatientId : null,
    selectedExaminationId:
      typeof parsed.selectedExaminationId === 'number' ? parsed.selectedExaminationId : null,
    selectedRequirementSetIds: Array.isArray(parsed.selectedRequirementSetIds)
      ? parsed.selectedRequirementSetIds.filter((v): v is number => typeof v === 'number')
      : [],
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
    selectedTemplateName:
      typeof parsed.selectedTemplateName === 'string' && parsed.selectedTemplateName.trim()
        ? parsed.selectedTemplateName
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
        : {}
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
  const patientExaminationId = ref<number | null>(null)
  const selectedPatientId = ref<number | null>(null)
  const selectedExaminationId = ref<number | null>(null)
  const selectedRequirementSetIds = ref<number[]>([])
  const activeReportId = ref<number | null>(null)
  const selectedKbModule = ref<string>('report_template_examples')
  const selectedTemplateName = ref<string | null>(null)
  const templateSectionDrafts = ref<Record<string, ReportTemplateSectionDraft>>({})
  const indications = ref<ReportingIndicationRow[]>(
    [{ examinationIndicationId: null, indicationChoiceId: null }]
  )
  const lookupSnapshot = ref<ReportingLookupSnapshot | null>(null)
  const lastRequirementGuidance = ref<ReportingRequirementGuidance>(null)
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

  const hasActiveCase = computed(
    () => !!patientExaminationId.value && !!selectedExaminationId.value && !!selectedPatientId.value
  )

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

  function setCaseSelection(params: {
    selectedPatientId?: number | null
    selectedExaminationId?: number | null
  }) {
    if (params.selectedPatientId !== undefined) selectedPatientId.value = params.selectedPatientId
    if (params.selectedExaminationId !== undefined) selectedExaminationId.value = params.selectedExaminationId
  }

  function setSelectedRequirementSetIds(ids: number[]) {
    selectedRequirementSetIds.value = Array.from(new Set(ids.filter((v) => Number.isFinite(v))))
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
  }) {
    if (params.moduleName !== undefined) {
      selectedKbModule.value = params.moduleName || 'report_template_examples'
    }
    if (params.templateName !== undefined) {
      selectedTemplateName.value = params.templateName || null
    }
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
        includeExaminationData:
          patch.includeExaminationData ?? current.includeExaminationData
      }
    }
  }

  function clearTemplateSectionDrafts() {
    templateSectionDrafts.value = {}
  }

  function applyPersistedState(persisted: PersistedReportingFlowState | null) {
    lookupToken.value = persisted?.lookupToken ?? null
    patientExaminationId.value = persisted?.patientExaminationId ?? null
    selectedPatientId.value = persisted?.selectedPatientId ?? null
    selectedExaminationId.value = persisted?.selectedExaminationId ?? null
    selectedRequirementSetIds.value = persisted?.selectedRequirementSetIds ?? []
    activeReportId.value = persisted?.activeReportId ?? null
    indications.value =
      persisted?.indications?.length
        ? persisted.indications
        : [{ examinationIndicationId: null, indicationChoiceId: null }]
    selectedKbModule.value = persisted?.selectedKbModule ?? 'report_template_examples'
    selectedTemplateName.value = persisted?.selectedTemplateName ?? null
    templateSectionDrafts.value = persisted?.templateSectionDrafts ?? {}
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
    lookupToken.value = null
    patientExaminationId.value = null
    selectedExaminationId.value = null
    selectedRequirementSetIds.value = []
    activeReportId.value = null
    sessionStatus.value = 'idle'
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastRequirementGuidance.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    selectedTemplateName.value = null
    templateSectionDrafts.value = {}
    mediaPreload.value = null
    mediaPreloadStatus.value = 'idle'
    mediaPreloadError.value = null
  }

  function clearAll() {
    lookupToken.value = null
    patientExaminationId.value = null
    selectedPatientId.value = null
    selectedExaminationId.value = null
    selectedRequirementSetIds.value = []
    activeReportId.value = null
    sessionStatus.value = 'idle'
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastRequirementGuidance.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    selectedKbModule.value = 'report_template_examples'
    selectedTemplateName.value = null
    templateSectionDrafts.value = {}
    mediaPreload.value = null
    mediaPreloadStatus.value = 'idle'
    mediaPreloadError.value = null
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
    indications.value = rows.length ? rows : [{ examinationIndicationId: null, indicationChoiceId: null }]
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

  function setLastRequirementGuidance(guidance: ReportingRequirementGuidance) {
    lastRequirementGuidance.value = guidance
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

  function noteClassificationUpdated(findingId: number, classificationId: number, choiceId: number | null) {
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
    patientExaminationId: patientExaminationId.value,
    selectedPatientId: selectedPatientId.value,
    selectedExaminationId: selectedExaminationId.value,
    selectedRequirementSetIds: selectedRequirementSetIds.value,
    activeReportId: activeReportId.value,
    indications: indications.value,
    selectedKbModule: selectedKbModule.value,
    selectedTemplateName: selectedTemplateName.value,
    templateSectionDrafts: templateSectionDrafts.value
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

  return {
    authSubject,
    sessionStatus,
    lookupToken,
    patientExaminationId,
    selectedPatientId,
    selectedExaminationId,
    selectedRequirementSetIds,
    activeReportId,
    selectedKbModule,
    selectedTemplateName,
    templateSectionDrafts,
    indications,
    lookupSnapshot,
    lastRequirementGuidance,
    lastTemplateValidation,
    findingsRevision,
    lastFindingsEvent,
    mediaPreload,
    mediaPreloadStatus,
    mediaPreloadError,
    hasActiveCase,
    canUseLookupPages,
    setLookupSession,
    setCaseSelection,
    setSelectedRequirementSetIds,
    setActiveReportId,
    setSessionStatus,
    setTemplateSelection,
    setTemplateSectionDraft,
    clearTemplateSectionDrafts,
    bindAuthSubject,
    setIndications,
    setLookupSnapshot,
    patchLookupSnapshot,
    setLastRequirementGuidance,
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
