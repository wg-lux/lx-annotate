import { defineStore } from 'pinia'
import type { ReportFrameSelection } from '@/utils/frameStreams'
import { computed, ref, watch } from 'vue'
import { savePatientExaminationDraft } from '@/api/reportDraftApi'
import type { ReportDraftBlob, ReportDraftTextMode } from '@/api/reportDraftApi'
import type {
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimePayload,
  ReportTemplateSectionDraft,
  ReportTemplateIdentity
} from '@/types/reportTemplate'
import type { ReportTemplateRuntimeValidationResult, ReportVerbosity } from '@/types/reportTemplate'
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
  verificationStatus?: 'verified' | 'unverified'
  persistencePolicy?: 'persistable' | 'blocked_until_verified'
  payload: ReportTemplateRuntimePayload
  hydratedFrom: 'session_storage' | 'backend_context' | 'draft_api'
  updatedAt: string
  /** Last server revision observed for optimistic draft persistence. */
  revision?: number
}

export function isVerifiedRuntimeDraftForBundle(
  draft: ReportingRuntimeDraft | null,
  bundle: { moduleName: string; version: string } | null,
  patientExaminationId?: number | null
): boolean {
  if (!draft || !bundle) return false
  return (
    isVerifiedTemplatedDraft(draft) &&
    matchesPatientExamination(draft, patientExaminationId) &&
    matchesTemplateBundle(draft, bundle)
  )
}

function matchesTemplateBundle(
  draft: ReportingRuntimeDraft,
  bundle: { moduleName: string; version: string }
): boolean {
  const identity = draft.templateIdentity
  const moduleName = identity?.moduleName || draft.payload.knowledgeBaseModule || draft.moduleName
  const version = identity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
  return moduleName === bundle.moduleName && version === bundle.version
}

function isVerifiedTemplatedDraft(draft: ReportingRuntimeDraft): boolean {
  return draft.verificationStatus === 'verified' && Boolean(draft.templateName)
}

function matchesPatientExamination(
  draft: ReportingRuntimeDraft,
  patientExaminationId?: number | null
): boolean {
  return !patientExaminationId || draft.patientExaminationId === patientExaminationId
}

type PersistedReportingFlowState = {
  lookupToken: string | null
  caseId: string | null
  patientExaminationId: number | null
  selectedPatientId: number | null
  selectedExaminationId: number | null
  activeReportId: number | null
  reportTextMode: ReportDraftTextMode
  renderedReportText: string
  indications: ReportingIndicationRow[]
  selectedKbModule: string
  selectedReportLanguage: ReportLanguageCode
  selectedTemplateName: string | null
  selectedTemplateIdentity: ReportTemplateIdentity | null
  templateSectionDrafts: Partial<Record<string, ReportTemplateSectionDraft>>
  runtimeDraftsByPatientExaminationId: Partial<Record<string, ReportingRuntimeDraft>>
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
  return `${prefix}_${String(runtimeDraftEntityCounter)}`
}

function normalizeRuntimeDescriptors(
  descriptors: ReportTemplateRuntimeDescriptorInput[] | undefined
): ReportTemplateRuntimeDescriptorInput[] {
  if (!Array.isArray(descriptors)) {
    return []
  }
  return descriptors.map((descriptor) => ({
    ...descriptor,
    localId: descriptor.localId || nextRuntimeDraftEntityId('descriptor')
  }))
}

function normalizeRuntimeClassificationChoices(
  classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[] | undefined
): ReportTemplateRuntimeClassificationChoiceInput[] {
  if (!Array.isArray(classificationChoices)) {
    return []
  }
  return classificationChoices.map((classificationChoice) => ({
    ...classificationChoice,
    localId: classificationChoice.localId || nextRuntimeDraftEntityId('classification'),
    descriptors: normalizeRuntimeDescriptors(classificationChoice.descriptors)
  }))
}

function normalizeRuntimePatientFindings(
  patientFindings: ReportTemplateRuntimePatientFindingInput[] | undefined
): ReportTemplateRuntimePatientFindingInput[] {
  if (!Array.isArray(patientFindings)) {
    return []
  }
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

export type DraftRevisionConflict = {
  patientExaminationId: number
  expectedRevision: number
  currentRevision: number
  updatedAt: string | null
}

export class DraftRevisionConflictError extends Error {
  readonly conflict: DraftRevisionConflict

  constructor(conflict: DraftRevisionConflict) {
    super(
      'Der Reporting-Entwurf wurde zwischenzeitlich von einer anderen Bearbeitung geändert. Ihre lokalen Änderungen wurden nicht überschrieben.'
    )
    this.name = 'DraftRevisionConflictError'
    this.conflict = conflict
  }
}

function safeRevision(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function draftRevisionConflict(
  error: unknown,
  params: {
    patientExaminationId: number
    expectedRevision: number
  }
): DraftRevisionConflict | null {
  const errorRecord = recordOrEmpty(error)
  const response = recordOrEmpty(errorRecord.response)
  if (response.status !== 409) {
    return null
  }
  const data = recordOrEmpty(response.data)
  const currentRevision = safeRevision(data.currentRevision ?? data.current_revision)
  if (currentRevision === null) {
    return null
  }
  const updatedAt = data.updatedAt ?? data.updated_at
  return {
    patientExaminationId: params.patientExaminationId,
    expectedRevision: params.expectedRevision,
    currentRevision,
    updatedAt: typeof updatedAt === 'string' || updatedAt === null ? updatedAt : null
  }
}

function draftPersistenceErrorMessage(error: unknown): string {
  if (error instanceof DraftRevisionConflictError) {
    return error.message
  }
  const errorRecord = recordOrEmpty(error)
  const response = recordOrEmpty(errorRecord.response)
  const data = recordOrEmpty(response.data)
  const nonFieldErrors = data.nonFieldErrors ?? data.non_field_errors
  const firstNonFieldError: unknown = Array.isArray(nonFieldErrors) ? nonFieldErrors[0] : null
  if (typeof data.detail === 'string') return data.detail
  if (typeof firstNonFieldError === 'string') return firstNonFieldError
  if (typeof errorRecord.message === 'string') return errorRecord.message
  return 'Der Reporting-Entwurf konnte nicht gespeichert werden.'
}

function clearPersistedState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Persisted reporting state cleanup is best-effort.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isReportTemplateIdentity(value: unknown): value is ReportTemplateIdentity {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasValidTemplateIdentityStrings(value) &&
    isTemplateLifecycleStatus(value.lifecycleStatus) &&
    isTemplateReadiness(value.readiness)
  )
}

function hasValidTemplateIdentityStrings(value: Record<string, unknown>): boolean {
  return (
    isNullableString(value.moduleName) &&
    isNullableString(value.knowledgeBaseVersion) &&
    isNullableString(value.templateVersion) &&
    isNullableString(value.templateHash)
  )
}

function isTemplateLifecycleStatus(value: unknown): boolean {
  return value === null || value === 'draft' || value === 'published'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')
}

function isTemplateReadiness(value: unknown): boolean {
  if (value === null) return true
  if (!isRecord(value)) return false
  const canPublishIsValid = value.canPublish === null || typeof value.canPublish === 'boolean'
  return (
    canPublishIsValid &&
    isStringArray(value.blockingIssues) &&
    isStringArray(value.warnings) &&
    isRecord(value.raw)
  )
}

function isRuntimeDescriptor(value: unknown): value is ReportTemplateRuntimeDescriptorInput {
  return (
    isRecord(value) &&
    (value.localId === undefined || typeof value.localId === 'string') &&
    typeof value.classificationChoiceDescriptor === 'string' &&
    'descriptorValue' in value
  )
}

function isRuntimeClassificationChoice(
  value: unknown
): value is ReportTemplateRuntimeClassificationChoiceInput {
  return (
    isRecord(value) &&
    (value.localId === undefined || typeof value.localId === 'string') &&
    typeof value.classification === 'string' &&
    typeof value.classificationChoice === 'string' &&
    Array.isArray(value.descriptors) &&
    value.descriptors.every(isRuntimeDescriptor)
  )
}

function isRuntimePatientFinding(
  value: unknown
): value is ReportTemplateRuntimePatientFindingInput {
  return (
    isRecord(value) &&
    (value.localId === undefined || typeof value.localId === 'string') &&
    typeof value.finding === 'string' &&
    Array.isArray(value.classificationChoices) &&
    value.classificationChoices.every(isRuntimeClassificationChoice)
  )
}

function isRuntimePayload(value: unknown): value is ReportTemplateRuntimePayload {
  if (!isRecord(value)) return false
  return hasValidRuntimePayloadCore(value) && hasValidRuntimePayloadOptionals(value)
}

function hasValidRuntimePayloadCore(value: Record<string, unknown>): boolean {
  return (
    typeof value.patient === 'string' &&
    isStringArray(value.examiners) &&
    typeof value.examination === 'string' &&
    Array.isArray(value.patientFindings) &&
    value.patientFindings.every(isRuntimePatientFinding)
  )
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || isNullableString(value)
}

function hasValidRuntimePayloadOptionals(value: Record<string, unknown>): boolean {
  return (
    isOptionalNullableString(value.date) &&
    isOptionalNullableString(value.knowledgeBaseModule) &&
    isOptionalNullableString(value.knowledgeBaseVersion)
  )
}

function isReportingRuntimeDraft(value: unknown): value is ReportingRuntimeDraft {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasValidRuntimeDraftIdentity(value) &&
    hasValidRuntimeDraftPolicy(value) &&
    hasValidRuntimeDraftProvenance(value)
  )
}

function hasValidRuntimeDraftIdentity(value: Record<string, unknown>): boolean {
  const templateIdentity = value.templateIdentity
  return (
    typeof value.draftId === 'string' &&
    typeof value.patientExaminationId === 'number' &&
    Number.isSafeInteger(value.patientExaminationId) &&
    value.patientExaminationId > 0 &&
    typeof value.moduleName === 'string' &&
    isNullableString(value.templateName) &&
    (templateIdentity === undefined ||
      templateIdentity === null ||
      isReportTemplateIdentity(templateIdentity))
  )
}

function hasValidRuntimeDraftPolicy(value: Record<string, unknown>): boolean {
  return (
    (value.verificationStatus === undefined ||
      value.verificationStatus === 'verified' ||
      value.verificationStatus === 'unverified') &&
    (value.persistencePolicy === undefined ||
      value.persistencePolicy === 'persistable' ||
      value.persistencePolicy === 'blocked_until_verified')
  )
}

function hasValidRuntimeDraftProvenance(value: Record<string, unknown>): boolean {
  return (
    isRuntimePayload(value.payload) &&
    (value.hydratedFrom === 'session_storage' ||
      value.hydratedFrom === 'backend_context' ||
      value.hydratedFrom === 'draft_api') &&
    typeof value.updatedAt === 'string' &&
    (value.revision === undefined || safeRevision(value.revision) !== null)
  )
}

function normalizePersistedState(parsed: Record<string, unknown>): PersistedReportingFlowState {
  return {
    ...normalizePersistedContext(parsed),
    ...normalizePersistedReportConfiguration(parsed),
    runtimeDraftsByPatientExaminationId: normalizePersistedRuntimeDrafts(
      parsed.runtimeDraftsByPatientExaminationId
    )
  }
}

function normalizePersistedRuntimeDrafts(
  value: unknown
): Partial<Record<string, ReportingRuntimeDraft>> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, ReportingRuntimeDraft] =>
      isReportingRuntimeDraft(entry[1])
    )
  )
}

function normalizePersistedIndications(value: unknown): ReportingIndicationRow[] {
  const rows = Array.isArray(value) ? value : []
  return rows.map((row: unknown): ReportingIndicationRow => {
    const record = isRecord(row) ? row : {}
    return {
      examinationIndicationId:
        typeof record.examinationIndicationId === 'number' ? record.examinationIndicationId : null,
      indicationChoiceId:
        typeof record.indicationChoiceId === 'number' ? record.indicationChoiceId : null
    }
  })
}

function normalizeTemplateSectionDrafts(
  value: unknown
): Partial<Record<string, ReportTemplateSectionDraft>> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, section]) => {
      const draft = recordOrEmpty(section)
      return [
        key,
        {
          note: typeof draft.note === 'string' ? draft.note : '',
          includePatientData: draft.includePatientData === true,
          includeExaminationData: draft.includeExaminationData === true
        }
      ]
    })
  )
}

function normalizePersistedContext(
  parsed: Record<string, unknown>
): Pick<
  PersistedReportingFlowState,
  | 'lookupToken'
  | 'caseId'
  | 'patientExaminationId'
  | 'selectedPatientId'
  | 'selectedExaminationId'
  | 'activeReportId'
  | 'reportTextMode'
  | 'renderedReportText'
  | 'indications'
> {
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
    reportTextMode: parsed.reportTextMode === 'manual' ? 'manual' : 'generated',
    renderedReportText:
      typeof parsed.renderedReportText === 'string' ? parsed.renderedReportText : '',
    indications: normalizePersistedIndications(parsed.indications)
  }
}

function normalizePersistedReportConfiguration(
  parsed: Record<string, unknown>
): Pick<
  PersistedReportingFlowState,
  | 'selectedKbModule'
  | 'selectedReportLanguage'
  | 'selectedTemplateName'
  | 'selectedTemplateIdentity'
  | 'templateSectionDrafts'
> {
  return {
    selectedKbModule:
      typeof parsed.selectedKbModule === 'string' && parsed.selectedKbModule.trim()
        ? parsed.selectedKbModule
        : '',
    selectedReportLanguage:
      parsed.selectedReportLanguage === 'en' || parsed.selectedReportLanguage === 'de'
        ? parsed.selectedReportLanguage
        : 'de',
    selectedTemplateName:
      typeof parsed.selectedTemplateName === 'string' && parsed.selectedTemplateName.trim()
        ? parsed.selectedTemplateName
        : null,
    selectedTemplateIdentity: isReportTemplateIdentity(parsed.selectedTemplateIdentity)
      ? parsed.selectedTemplateIdentity
      : null,
    templateSectionDrafts: normalizeTemplateSectionDrafts(parsed.templateSectionDrafts)
  }
}

function loadPersistedState(ownerSub: string | null): PersistedReportingFlowState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      clearPersistedState()
      return null
    }
    if (
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Date.now() ||
      parsed.ownerSub !== ownerSub ||
      !isRecord(parsed.state)
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
  const reportTextMode = ref<ReportDraftTextMode>('generated')
  const renderedReportText = ref('')
  const selectedKbModule = ref<string>('')
  const selectedReportLanguage = ref<ReportLanguageCode>('de')
  // Presentation preference for this mounted reporting session; report text is persisted separately.
  const selectedReportVerbosity = ref<ReportVerbosity>('standard')
  const selectedTemplateName = ref<string | null>(null)
  const selectedTemplateIdentity = ref<ReportTemplateIdentity | null>(null)
  const templateSectionDrafts = ref<Partial<Record<string, ReportTemplateSectionDraft>>>({})
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
  const preferredReportFrame = ref<ReportFrameSelection | null>(null)
  const selectedReportFrames = ref<ReportFrameSelection[] | null>(null)
  function addReportFrame(frame: ReportFrameSelection) {
    const frames = selectedReportFrames.value ?? []
    if (
      frames.some(
        (item) => item.videoId === frame.videoId && item.frameNumber === frame.frameNumber
      )
    ) {
      return
    }
    if (frames.length >= 24) {
      throw new Error('A report supports at most 24 frames')
    }
    selectedReportFrames.value = [...frames, { ...frame }]
  }
  function removeReportFrame(frame: ReportFrameSelection) {
    selectedReportFrames.value = (selectedReportFrames.value ?? []).filter(
      (item) => item.videoId !== frame.videoId || item.frameNumber !== frame.frameNumber
    )
  }
  const reportFrameSelectionStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  function setPreferredReportFrame(
    frame: ReportFrameSelection | null,
    status: 'idle' | 'loading' | 'ready' | 'error'
  ) {
    preferredReportFrame.value = frame
    reportFrameSelectionStatus.value = status
    if (status === 'idle') {
      selectedReportFrames.value = null
    }
  }
  const mediaPreloadStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const mediaPreloadError = ref<string | null>(null)
  const runtimeDraftsByPatientExaminationId = ref<Partial<Record<string, ReportingRuntimeDraft>>>(
    {}
  )
  const draftPersistenceStatus = ref<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const draftPersistenceError = ref<string | null>(null)
  const draftConflict = ref<DraftRevisionConflict | null>(null)
  const lastPersistedDraftAt = ref<string | null>(null)
  const draftAutosaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const draftAutosaveSignature = ref<string | null>(null)
  const draftPersistencePromise = ref<Promise<void> | null>(null)
  const savingFinalReport = ref(false)
  let draftPersistenceGeneration = 0

  const hasActiveCase = computed(
    () =>
      !!caseId.value &&
      !!patientExaminationId.value &&
      !!selectedExaminationId.value &&
      !!selectedPatientId.value
  )

  const currentRuntimeDraft = computed<ReportingRuntimeDraft | null>(() => {
    if (!patientExaminationId.value) {
      return null
    }
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
    markCachedDraftUnverifiedForContextChange(params.patientExaminationId)
    applyPatientExaminationSelection(params)
    resetPatientExaminationWorkflow(params.preserveTemplateSelection ?? false)
  }

  function markCachedDraftUnverifiedForContextChange(nextPatientExaminationId: number | null) {
    const cachedDraft = nextPatientExaminationId
      ? runtimeDraftsByPatientExaminationId.value[String(nextPatientExaminationId)]
      : null
    if (!cachedDraft || nextPatientExaminationId === patientExaminationId.value) return

    const requiresTemplateVerification = Boolean(
      cachedDraft.templateName ||
      cachedDraft.moduleName ||
      cachedDraft.templateIdentity?.moduleName ||
      cachedDraft.payload.knowledgeBaseModule
    )
    runtimeDraftsByPatientExaminationId.value = {
      ...runtimeDraftsByPatientExaminationId.value,
      [String(nextPatientExaminationId)]: {
        ...cachedDraft,
        verificationStatus: 'unverified',
        persistencePolicy: requiresTemplateVerification ? 'blocked_until_verified' : 'persistable'
      }
    }
  }

  function applyPatientExaminationSelection(params: {
    patientExaminationId: number | null
    selectedPatientId?: number | null
    selectedExaminationId?: number | null
  }) {
    patientExaminationId.value = params.patientExaminationId
    if (params.selectedPatientId !== undefined) {
      selectedPatientId.value = params.selectedPatientId
    }
    if (params.selectedExaminationId !== undefined) {
      selectedExaminationId.value = params.selectedExaminationId
    }
  }

  function resetPatientExaminationWorkflow(preserveTemplateSelection: boolean) {
    lookupToken.value = null
    sessionStatus.value = 'idle'
    activeReportId.value = null
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    if (!preserveTemplateSelection) {
      selectedTemplateName.value = null
      selectedTemplateIdentity.value = null
    }
    templateSectionDrafts.value = {}
  }

  function setCaseContext(params: { caseId: string | null; selectedPatientId?: number | null }) {
    caseId.value = params.caseId
    if (params.selectedPatientId !== undefined) {
      selectedPatientId.value = params.selectedPatientId
    }
  }

  function setRuntimeDraft(draft: ReportingRuntimeDraft) {
    const existingDraft =
      runtimeDraftsByPatientExaminationId.value[String(draft.patientExaminationId)]
    runtimeDraftsByPatientExaminationId.value = {
      ...runtimeDraftsByPatientExaminationId.value,
      [String(draft.patientExaminationId)]: {
        ...draft,
        // A missing legacy/browser revision can only attempt revision zero. The server
        // rejects any non-zero draft rather than allowing a stale client to overwrite it.
        revision: draft.revision ?? existingDraft?.revision ?? 0,
        templateIdentity: draft.templateIdentity ?? selectedTemplateIdentity.value,
        payload: normalizeRuntimePayloadIds(draft.payload)
      }
    }
  }

  function markDraftPersistenceHydrated(updatedAt: string | null, revision?: number) {
    const currentDraft = currentRuntimeDraft.value
    const normalizedRevision = safeRevision(revision)
    if (currentDraft && normalizedRevision !== null) {
      setRuntimeDraft({ ...currentDraft, revision: normalizedRevision })
    }
    draftPersistenceStatus.value = updatedAt ? 'saved' : 'idle'
    draftPersistenceError.value = null
    draftConflict.value = null
    lastPersistedDraftAt.value = updatedAt
    draftAutosaveSignature.value = currentDraftPersistenceSignature.value
  }

  function updateCurrentRuntimeDraft(
    updater: (draft: ReportingRuntimeDraft) => ReportingRuntimeDraft | null
  ): ReportingRuntimeDraft | null {
    const currentDraft = currentRuntimeDraft.value
    if (!currentDraft) {
      return null
    }
    const nextDraft = updater(currentDraft)
    if (!nextDraft) {
      return null
    }
    setRuntimeDraft({
      ...nextDraft,
      updatedAt: new Date().toISOString()
    })
    return runtimeDraftsByPatientExaminationId.value[String(nextDraft.patientExaminationId)] || null
  }

  function addFinding(params: { findingName: string }): string | null {
    if (!params.findingName.trim()) {
      return null
    }
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
    if (!findingLocalId) {
      return
    }
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
    if (!params.findingLocalId || !params.classificationName.trim()) {
      return
    }
    updateCurrentRuntimeDraft((draft) => ({
      ...draft,
      payload: {
        ...draft.payload,
        patientFindings: draft.payload.patientFindings.map((finding) => {
          if (finding.localId !== params.findingLocalId) {
            return finding
          }

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
    const targetKey = String(targetPatientExaminationId)
    runtimeDraftsByPatientExaminationId.value = Object.fromEntries(
      Object.entries(runtimeDraftsByPatientExaminationId.value).filter(
        ([patientExaminationId]) => patientExaminationId !== targetKey
      )
    )
  }

  /**
   * Deliberately discard the conflicted browser copy before a full server rehydrate.
   * This never writes the local document or adopts the server's revision as permission
   * to overwrite it; the caller must obtain explicit user confirmation first.
   */
  function discardConflictedLocalDraft(): boolean {
    const conflict = draftConflict.value
    const draft = currentRuntimeDraft.value
    if (!conflict || !draft || conflict.patientExaminationId !== draft.patientExaminationId) {
      return false
    }

    draftPersistenceGeneration += 1
    cancelDraftAutosave()
    clearRuntimeDraft(conflict.patientExaminationId)
    activeReportId.value = null
    reportTextMode.value = 'generated'
    renderedReportText.value = ''
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    selectedReportLanguage.value = 'de'
    selectedReportVerbosity.value = 'standard'
    selectedTemplateName.value = null
    selectedTemplateIdentity.value = null
    templateSectionDrafts.value = {}
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    draftPersistenceStatus.value = 'idle'
    draftPersistenceError.value = null
    draftConflict.value = null
    lastPersistedDraftAt.value = null
    draftAutosaveSignature.value = null
    persistCurrentFlowState()
    return true
  }

  const currentDraftPersistencePayload = computed(() => {
    const draft = currentRuntimeDraft.value
    if (
      !draft ||
      !draft.patientExaminationId ||
      draft.persistencePolicy === 'blocked_until_verified'
    ) {
      return null
    }
    return {
      patientExaminationId: draft.patientExaminationId,
      expectedRevision: draft.revision ?? 0,
      moduleName: draft.moduleName,
      templateName: draft.templateName,
      ...((draft.templateIdentity ?? selectedTemplateIdentity.value)
        ? { templateIdentity: draft.templateIdentity ?? selectedTemplateIdentity.value }
        : {}),
      indications: indications.value,
      templateSectionDrafts: templateSectionDrafts.value,
      selectedReportLanguage: selectedReportLanguage.value,
      activeReportId: activeReportId.value,
      reportTextMode: reportTextMode.value,
      renderedText: renderedReportText.value,
      payload: draft.payload
    }
  })

  const currentDraftPersistenceSignature = computed(() => {
    if (!currentDraftPersistencePayload.value) {
      return null
    }
    const { expectedRevision: _expectedRevision, ...document } =
      currentDraftPersistencePayload.value
    return JSON.stringify(document)
  })

  const hasUnpersistedDraftChanges = computed(() => {
    if (!currentRuntimeDraft.value) {
      return false
    }
    if (draftPersistenceStatus.value === 'saving') {
      return true
    }
    const currentSignature = currentDraftPersistenceSignature.value
    if (!currentSignature) {
      return false
    }
    return currentSignature !== draftAutosaveSignature.value
  })

  function cancelDraftAutosave() {
    if (!draftAutosaveTimer.value) {
      return
    }
    clearTimeout(draftAutosaveTimer.value)
    draftAutosaveTimer.value = null
  }

  type DraftSaveAttempt = {
    patientExaminationId: number
    expectedRevision: number
  }

  async function persistDraftChanges(
    generation: number,
    attemptState: { last: DraftSaveAttempt | null }
  ) {
    while (shouldContinueDraftPersistence(generation)) {
      const currentPayload = currentDraftPersistencePayload.value
      const signatureToPersist = currentDraftPersistenceSignature.value
      if (!currentPayload || !signatureToPersist) return
      if (signatureToPersist === draftAutosaveSignature.value) break

      const payloadSnapshot = JSON.parse(JSON.stringify(currentPayload)) as typeof currentPayload
      attemptState.last = {
        patientExaminationId: payloadSnapshot.patientExaminationId,
        expectedRevision: payloadSnapshot.expectedRevision
      }
      const response = await savePatientExaminationDraft(payloadSnapshot)
      if (generation !== draftPersistenceGeneration) return
      if (patientExaminationId.value !== payloadSnapshot.patientExaminationId) continue

      lastPersistedDraftAt.value = response.updatedAt ?? response.updated_at ?? null
      const persistedDraft = currentRuntimeDraft.value
      if (persistedDraft) {
        setRuntimeDraft({ ...persistedDraft, revision: response.revision })
      }
      draftAutosaveSignature.value = signatureToPersist
      draftConflict.value = null
    }
  }

  function shouldContinueDraftPersistence(generation: number): boolean {
    return generation === draftPersistenceGeneration && !savingFinalReport.value
  }

  function markDraftPersistenceComplete(generation: number) {
    if (generation !== draftPersistenceGeneration) return
    if (currentDraftPersistenceSignature.value !== draftAutosaveSignature.value) return
    draftPersistenceStatus.value = 'saved'
  }

  function handleDraftPersistenceFailure(
    error: unknown,
    generation: number,
    lastAttempt: DraftSaveAttempt | null
  ): never {
    if (generation !== draftPersistenceGeneration) throw error
    const conflict = draftRevisionConflict(error, {
      patientExaminationId: lastAttempt?.patientExaminationId ?? 0,
      expectedRevision: lastAttempt?.expectedRevision ?? 0
    })
    if (!conflict) {
      draftPersistenceStatus.value = 'error'
      draftPersistenceError.value = draftPersistenceErrorMessage(error)
      throw error
    }
    const conflictError = new DraftRevisionConflictError(conflict)
    draftConflict.value = conflict
    draftPersistenceStatus.value = 'conflict'
    draftPersistenceError.value = draftPersistenceErrorMessage(conflictError)
    throw conflictError
  }

  async function runDraftPersistence(generation: number): Promise<void> {
    const attemptState: { last: DraftSaveAttempt | null } = { last: null }
    try {
      await persistDraftChanges(generation, attemptState)
      markDraftPersistenceComplete(generation)
    } catch (error: unknown) {
      handleDraftPersistenceFailure(error, generation, attemptState.last)
    } finally {
      if (generation === draftPersistenceGeneration) {
        draftPersistencePromise.value = null
      }
    }
  }

  async function persistCurrentRuntimeDraft() {
    if (savingFinalReport.value) {
      return
    }
    if (!currentRuntimeDraft.value?.patientExaminationId) {
      return
    }
    if (
      draftConflict.value?.patientExaminationId === currentRuntimeDraft.value.patientExaminationId
    ) {
      throw new DraftRevisionConflictError(draftConflict.value)
    }
    if (draftPersistencePromise.value) {
      return draftPersistencePromise.value
    }
    const generation = draftPersistenceGeneration
    draftPersistenceStatus.value = 'saving'
    draftPersistenceError.value = null
    const request = runDraftPersistence(generation)
    draftPersistencePromise.value = request
    return request
  }

  function scheduleDraftAutosave() {
    cancelDraftAutosave()
    if (savingFinalReport.value) {
      return
    }
    if (
      draftConflict.value?.patientExaminationId === currentRuntimeDraft.value?.patientExaminationId
    ) {
      return
    }
    draftAutosaveTimer.value = setTimeout(() => {
      draftAutosaveTimer.value = null
      if (savingFinalReport.value) {
        return
      }
      void persistCurrentRuntimeDraft().catch(() => {
        // Scheduled autosave errors are exposed through draftPersistenceStatus/error.
        // Explicit flushes still reject so navigation can fail closed.
      })
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS)
  }

  async function flushDraftAutosave() {
    cancelDraftAutosave()
    if (savingFinalReport.value) {
      return
    }
    if (!currentRuntimeDraft.value) {
      return
    }
    if (!hasUnpersistedDraftChanges.value && !draftPersistencePromise.value) {
      return
    }
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
    if (params.selectedPatientId !== undefined) {
      selectedPatientId.value = params.selectedPatientId
    }
    if (params.selectedExaminationId !== undefined) {
      selectedExaminationId.value = params.selectedExaminationId
    }
  }

  function setActiveReportId(id: number | null) {
    activeReportId.value = id
  }

  function setRenderedReportText(text: string, mode: ReportDraftTextMode) {
    renderedReportText.value = text
    reportTextMode.value = mode
  }

  function applyBackendDraftDocument(draft: ReportDraftBlob) {
    if (draft.indications) {
      setIndications(draft.indications)
    }
    if (draft.templateSectionDrafts) {
      templateSectionDrafts.value = draft.templateSectionDrafts
    }
    if (draft.selectedReportLanguage) {
      selectedReportLanguage.value = draft.selectedReportLanguage
    }
    if (draft.activeReportId !== undefined) {
      activeReportId.value = draft.activeReportId
    }
    if (draft.reportTextMode) {
      reportTextMode.value = draft.reportTextMode
    }
    if (draft.renderedText !== undefined) {
      renderedReportText.value = draft.renderedText
    }
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
      selectedKbModule.value = params.moduleName.trim()
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
    if (!sectionName) {
      return
    }
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

  function applyPersistedTemplateConfiguration(persisted: PersistedReportingFlowState | null) {
    selectedKbModule.value = persisted?.selectedKbModule ?? ''
    selectedTemplateName.value = persisted?.selectedTemplateName ?? null
    selectedTemplateIdentity.value = persisted?.selectedTemplateIdentity ?? null
    templateSectionDrafts.value = persisted?.templateSectionDrafts ?? {}
  }

  function applyPersistedCaseContext(persisted: PersistedReportingFlowState | null) {
    lookupToken.value = persisted?.lookupToken ?? null
    caseId.value = persisted?.caseId ?? null
    patientExaminationId.value = persisted?.patientExaminationId ?? null
    applyPersistedCaseSelection(persisted)
  }

  function applyPersistedCaseSelection(persisted: PersistedReportingFlowState | null) {
    selectedPatientId.value = persisted?.selectedPatientId ?? null
    selectedExaminationId.value = persisted?.selectedExaminationId ?? null
  }

  function applyPersistedDocument(persisted: PersistedReportingFlowState | null) {
    activeReportId.value = persisted?.activeReportId ?? null
    reportTextMode.value = persisted?.reportTextMode ?? 'generated'
    renderedReportText.value = persisted?.renderedReportText ?? ''
    applyPersistedIndicationsAndLanguage(persisted)
  }

  function applyPersistedIndicationsAndLanguage(persisted: PersistedReportingFlowState | null) {
    indications.value = persisted?.indications.length
      ? persisted.indications
      : [{ examinationIndicationId: null, indicationChoiceId: null }]
    selectedReportLanguage.value = persisted?.selectedReportLanguage ?? 'de'
  }

  function applyPersistedState(persisted: PersistedReportingFlowState | null) {
    applyPersistedCaseContext(persisted)
    applyPersistedDocument(persisted)
    applyPersistedTemplateConfiguration(persisted)
    runtimeDraftsByPatientExaminationId.value = persisted?.runtimeDraftsByPatientExaminationId ?? {}
  }

  function bindAuthSubject(subject: string | null | undefined) {
    const normalized = typeof subject === 'string' && subject.trim() ? subject.trim() : null
    if (authSubject.value === normalized) {
      return
    }
    authSubject.value = normalized
    clearAll()
    if (!normalized) {
      clearPersistedState()
      return
    }
    applyPersistedState(loadPersistedState(normalized))
  }

  function resetForPatientSwitch() {
    setPreferredReportFrame(null, 'idle')
    draftPersistenceGeneration += 1
    if (draftAutosaveTimer.value) {
      clearTimeout(draftAutosaveTimer.value)
      draftAutosaveTimer.value = null
    }
    lookupToken.value = null
    caseId.value = null
    patientExaminationId.value = null
    selectedExaminationId.value = null
    activeReportId.value = null
    reportTextMode.value = 'generated'
    renderedReportText.value = ''
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
    draftConflict.value = null
    lastPersistedDraftAt.value = null
    draftAutosaveSignature.value = null
    draftPersistencePromise.value = null
    savingFinalReport.value = false
  }

  function clearAll() {
    setPreferredReportFrame(null, 'idle')
    draftPersistenceGeneration += 1
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
    reportTextMode.value = 'generated'
    renderedReportText.value = ''
    sessionStatus.value = 'idle'
    indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }]
    lookupSnapshot.value = null
    lastTemplateValidation.value = null
    findingsRevision.value = 0
    lastFindingsEvent.value = null
    selectedKbModule.value = ''
    selectedReportLanguage.value = 'de'
    selectedReportVerbosity.value = 'standard'
    selectedTemplateName.value = null
    selectedTemplateIdentity.value = null
    templateSectionDrafts.value = {}
    runtimeDraftsByPatientExaminationId.value = {}
    mediaPreload.value = null
    mediaPreloadStatus.value = 'idle'
    mediaPreloadError.value = null
    draftPersistenceStatus.value = 'idle'
    draftPersistenceError.value = null
    draftConflict.value = null
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
    setPreferredReportFrame(null, 'idle')
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
    if (index < 0 || index >= indications.value.length) {
      return
    }
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
    reportTextMode: reportTextMode.value,
    renderedReportText: renderedReportText.value,
    indications: indications.value,
    selectedKbModule: selectedKbModule.value,
    selectedReportLanguage: selectedReportLanguage.value,
    selectedTemplateName: selectedTemplateName.value,
    selectedTemplateIdentity: selectedTemplateIdentity.value,
    templateSectionDrafts: templateSectionDrafts.value,
    runtimeDraftsByPatientExaminationId: runtimeDraftsByPatientExaminationId.value
  }))

  function persistCurrentFlowState() {
    if (!authSubject.value) {
      clearPersistedState()
      return
    }
    const envelope: PersistedReportingFlowEnvelope = {
      ownerSub: authSubject.value,
      expiresAt: Date.now() + STORAGE_TTL_MS,
      state: persistable.value
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }

  watch(
    persistable,
    () => {
      persistCurrentFlowState()
    },
    { deep: true }
  )

  watch(currentDraftPersistenceSignature, (signature) => {
    if (!signature) {
      return
    }
    if (signature === draftAutosaveSignature.value) {
      return
    }
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
    reportTextMode,
    renderedReportText,
    selectedKbModule,
    selectedReportLanguage,
    selectedReportVerbosity,
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
    preferredReportFrame,
    selectedReportFrames,
    addReportFrame,
    removeReportFrame,
    reportFrameSelectionStatus,
    setPreferredReportFrame,
    mediaPreloadStatus,
    mediaPreloadError,
    draftPersistenceStatus,
    draftPersistenceError,
    draftConflict,
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
    discardConflictedLocalDraft,
    addFinding,
    removeFinding,
    updateClassificationValue,
    setCaseSelection,
    setActiveReportId,
    setRenderedReportText,
    applyBackendDraftDocument,
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
