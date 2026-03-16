<template>
  <div class="d-flex flex-column gap-3">
    <MedicalBlock
      title="Template & Dokumentationsregeln"
      subtitle="Template wählen, Regelsätze aktivieren und die Wissensbasis für diesen Fall vorbereiten"
      icon="description"
      icon-bg-class="bg-gradient-primary"
      :is-complete="!!selectedTemplateName"
      :is-active="true"
      :show-action="false"
      :loading="loading || templateLoading"
    >
      <template #default>
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">KB-Modul</label>
            <input
              class="form-control"
              :value="selectedKbModule"
              :disabled="loading || templateLoading"
              @change="onModuleChange(($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Untersuchung</label>
            <input class="form-control" :value="selectedExaminationDisplayName || ''" readonly />
          </div>
          <div class="col-md-4">
            <label class="form-label">Template</label>
            <select
              class="form-select"
              :value="selectedTemplateName || ''"
              :disabled="loading || templateLoading || !templateOptions.length"
              @change="onTemplateSelectionChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>
                {{ templateLoading ? 'Templates laden...' : 'Template wählen' }}
              </option>
              <option v-for="template in templateOptions" :key="template.name" :value="template.name">
                {{ template.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mb-3">
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="loading || templateLoading || !selectedExaminationName"
            @click="refreshTemplatesForExamination"
          >
            Templates für Untersuchung laden
          </button>
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="loading || !canInitializeLookup"
            @click="fetchLookupAll"
          >
            Fallstand laden
          </button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="loading || !canInitializeLookup"
            @click="triggerRecompute"
          >
            Wissensbasis neu prüfen
          </button>
        </div>

        <div v-if="templateErrorMessage" class="alert alert-danger py-2 mb-2">
          {{ templateErrorMessage }}
        </div>
        <div v-if="templateStatusMessage" class="alert alert-success py-2 mb-2">
          {{ templateStatusMessage }}
        </div>

        <div v-if="selectedTemplate" class="small text-muted mb-3">
          Abschnitte: {{ sectionBlocks.length }} · Validierungen:
          {{ selectedTemplateValidatorCounts.examination }} auf Untersuchungsebene,
          {{ selectedTemplateValidatorCounts.findings }} auf Befundebene
        </div>

        <RequirementSetSelectionList
          v-if="flow.lookupToken"
          :items="requirementSets"
          :selected-id-set="selectedRequirementSetIdSet"
          :loading="loading"
          :requirement-set-status="lookupRequirementSetStatus"
          @toggle="toggleRequirementSet"
        />

        <div
          v-if="!flow.lookupToken"
          class="alert alert-warning mb-0"
        >
          Kein aktiver Fallstand vorhanden. Bitte zuerst den Fall anlegen oder neu öffnen.
        </div>

        <div v-if="hasSuggestedActions" class="mt-3">
          <h6 class="mb-2">Empfohlene Aktionen</h6>
          <pre class="small bg-light rounded p-2 mb-0">{{ prettySuggestedActions }}</pre>
        </div>
      </template>
    </MedicalBlock>

    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Befunderfassung</h5>
          <small class="text-muted">Befunde hinzufügen, Klassifikationen setzen und gegen die Wissensbasis prüfen</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" :disabled="loading || !canInitializeLookup" @click="fetchLookupAll">
            Fallstand laden
          </button>
          <button class="btn btn-primary btn-sm" :disabled="loading || !canInitializeLookup" @click="triggerRecompute">
            Wissensbasis neu prüfen
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <LookupStatusPanel
          class="mb-3"
          :patient-examination-id="flow.patientExaminationId"
          :selected-examination-id="flow.selectedExaminationId"
          :lookup-token="flow.lookupToken"
          :findings-revision="flow.findingsRevision"
        />
        <ReportingMediaPreviewCards class="mb-3" />

        <div v-if="!flow.patientExaminationId || !flow.selectedExaminationId" class="alert alert-warning">
          Bitte zuerst das Fall-Setup abschließen (Patient + Untersuchung + PatientExamination).
        </div>

        <template v-else>
          <div v-if="!flow.lookupToken" class="alert alert-info d-flex justify-content-between align-items-center">
            <span>Kein aktiver Fallstand vorhanden. Initialisieren Sie den Fallkontext für diese Untersuchung.</span>
            <button class="btn btn-sm btn-outline-primary" :disabled="loading || !canInitializeLookup" @click="ensureLookupSession">
              Fallstand initialisieren
            </button>
          </div>

          <div class="mb-3">
            <AddableFindingsDetail
              :examination-id="flow.selectedExaminationId || undefined"
              :patient-examination-id="flow.patientExaminationId || undefined"
              @finding-added="onFindingAddedToExamination"
              @finding-error="onFindingError"
            />
          </div>

          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-0">Verfügbare Befunde</h6>
                <small class="text-muted">Befunde aus dem aktiven Fallkontext</small>
              </div>
              <small class="text-muted">{{ availableFindings.length }} verfügbar</small>
            </div>
            <div class="card-body" style="max-height: 60vh; overflow: auto;">
              <div v-if="findingSelectorsLoading || loading" class="text-muted small">Lade Befunde...</div>
              <div v-else-if="availableFindings.length" class="d-flex flex-column gap-3">
                <FindingsDetail
                  v-for="findingId in availableFindings"
                  :key="findingId"
                  :finding-id="findingId"
                  :patient-examination-id="flow.patientExaminationId || undefined"
                  :is-added-to-examination="isFindingAddedToExamination(findingId)"
                  @added-to-examination="onFindingAddedToExamination"
                  @classification-updated="onClassificationUpdated"
                  @error-occurred="onFindingDetailError"
                />
              </div>
              <div v-else class="text-muted">
                Keine Befunde geladen. Bitte Fallstand laden oder die Wissensbasis neu prüfen.
              </div>
            </div>
          </div>

          <div class="mt-3 p-3 bg-light rounded small">
            <div><strong>Letztes Befund-Ereignis:</strong> {{ flow.lastFindingsEvent ? formatFindingsEvent(flow.lastFindingsEvent) : 'keins' }}</div>
          </div>

          <div class="mt-3">
            <ReportTemplateValidationPanel
              :loading="templateValidationLoading"
              :error-message="templateValidationError"
              :result="flow.lastTemplateValidation"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { getFindingDisplayName } from '@/api/findings.contract'
import { validatePatientFindingsAgainstTemplate } from '@/api/reportTemplatesApi'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue'
import AddableFindingsDetail from '@/components/RequirementReport/AddableFindingsDetail.vue'
import FindingsDetail from '@/components/RequirementReport/FindingsDetail.vue'
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors'
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue'
import ReportTemplateValidationPanel from '@/components/Reporting/ReportTemplateValidationPanel.vue'
import ReportingMediaPreviewCards from '@/components/Reporting/ReportingMediaPreviewCards.vue'
import { useLookupActions } from '@/composables/reporting/useLookupActions'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import { endpoints } from '@/types/api/endpoints'

type LookupFindingsState = {
  availableFindings?: number[]
  requiredFindings?: number[]
  requirementStatus?: Record<string, boolean>
  requirementSetStatus?: Record<string, boolean>
  suggestedActions?: Record<string, any[]>
  requirementsBySet?: Record<string, Array<{ id: number; name: string }>>
  selectedRequirementSetIds?: number[]
  requirementSets?: Array<{ id: number; name: string; type: string }>
}

type FindingAddedEvent =
  | number
  | {
      findingId: number
      findingName?: string
      selectedClassifications?: Array<{ classification: number; choice: number | null }>
      response?: unknown
    }

const flow = useReportingFlowStore()
const examinationStore = useExaminationStore()
const patientExaminationStore = usePatientExaminationStore()
const {
  loading: findingSelectorsLoading,
  ensureCatalogLoaded,
  ensurePatientFindingsLoaded,
  getFindingById,
  isFindingAttached
} = useFindingSelectors()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lookupState = ref<LookupFindingsState | null>(null)
const lookupInitInFlight = ref<Promise<boolean> | null>(null)
const templateValidationLoading = ref(false)
const templateValidationError = ref<string | null>(null)
const templateStatusMessage = ref<string | null>(null)

const {
  moduleName: selectedKbModule,
  selectedTemplateName,
  templateOptions,
  selectedTemplate,
  sectionBlocks,
  loading: templateLoading,
  errorMessage: templateErrorMessage,
  fetchTemplatesByExamination,
  selectTemplateByName,
  setModuleName
} = useReportTemplates({
  initialModuleName: flow.selectedKbModule,
  initialTemplateName: flow.selectedTemplateName
})

function normalizeIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.trunc(entry))
  return Array.from(new Set(ids))
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), !!entry])
  )
}

function normalizeRequirementSets(
  value: unknown
): Array<{ id: number; name: string; type: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const id = Number((entry as any).id)
      if (!Number.isFinite(id)) return null
      return {
        id,
        name: String((entry as any).name || ''),
        type: String((entry as any).type || '')
      }
    })
    .filter((entry): entry is { id: number; name: string; type: string } => !!entry)
}

function normalizeSuggestedActions(value: unknown): Record<string, any[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), Array.isArray(entry) ? entry : []])
  )
}

function normalizeRequirementsBySet(
  value: unknown
): Record<string, Array<{ id: number; name: string }>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const requirements = Array.isArray(entry)
        ? entry
            .map((requirement) => {
              if (!requirement || typeof requirement !== 'object') return null
              const id = Number((requirement as any).id)
              const name = String((requirement as any).name || '')
              if (!Number.isFinite(id) || !name) return null
              return { id, name }
            })
            .filter((requirement): requirement is { id: number; name: string } => !!requirement)
        : []
      return [String(key), requirements]
    })
  )
}

function normalizeLookupPartial(partial: Partial<LookupFindingsState>): Partial<LookupFindingsState> {
  const normalized: Partial<LookupFindingsState> = { ...partial }
  if ('availableFindings' in partial) {
    normalized.availableFindings = normalizeIdArray(partial.availableFindings)
  }
  if ('requiredFindings' in partial) {
    normalized.requiredFindings = normalizeIdArray(partial.requiredFindings)
  }
  if ('selectedRequirementSetIds' in partial) {
    normalized.selectedRequirementSetIds = normalizeIdArray(partial.selectedRequirementSetIds)
  }
  if ('requirementStatus' in partial) {
    normalized.requirementStatus = normalizeBooleanRecord(partial.requirementStatus)
  }
  if ('requirementSetStatus' in partial) {
    normalized.requirementSetStatus = normalizeBooleanRecord(partial.requirementSetStatus)
  }
  if ('suggestedActions' in partial) {
    normalized.suggestedActions = normalizeSuggestedActions(partial.suggestedActions)
  }
  if ('requirementsBySet' in partial) {
    normalized.requirementsBySet = normalizeRequirementsBySet(partial.requirementsBySet)
  }
  if ('requirementSets' in partial) {
    normalized.requirementSets = normalizeRequirementSets(partial.requirementSets)
  }
  return normalized
}

const availableFindings = computed<number[]>(() =>
  normalizeIdArray(lookupState.value?.availableFindings)
)
const requirementSets = computed(() => normalizeRequirementSets(lookupState.value?.requirementSets))
const selectedRequirementSetIds = computed(() => normalizeIdArray(flow.selectedRequirementSetIds))
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value))
const lookupRequirementSetStatus = computed(() =>
  normalizeBooleanRecord(lookupState.value?.requirementSetStatus)
)
const hasSuggestedActions = computed(
  () => Object.keys(normalizeSuggestedActions(lookupState.value?.suggestedActions)).length > 0
)
const prettySuggestedActions = computed(() =>
  JSON.stringify(normalizeSuggestedActions(lookupState.value?.suggestedActions), null, 2)
)
const canInitializeLookup = computed(() => !!flow.patientExaminationId)
const selectedExamination = computed(
  () =>
    examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) || null
)
const selectedExaminationName = computed(() => selectedExamination.value?.name || null)
const selectedExaminationDisplayName = computed(
  () => selectedExamination.value?.displayName || selectedExaminationName.value || null
)
const selectedTemplateValidatorCounts = computed(() => {
  const validators = selectedTemplate.value?.validators
  return {
    examination: Array.isArray(validators?.examinationValidators)
      ? validators.examinationValidators.length
      : 0,
    findings: Array.isArray(validators?.findingsValidators)
      ? validators.findingsValidators.length
      : 0
  }
})

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function formatApiError(e: any, fallback: string): string {
  return e?.response?.data?.detail || e?.response?.data?.error || e?.message || fallback
}

function applyLookup(partial: Partial<LookupFindingsState>) {
  const normalizedPartial = normalizeLookupPartial(partial)
  lookupState.value = { ...(lookupState.value || {}), ...normalizedPartial }
  flow.patchLookupSnapshot({
    requirementStatus: normalizedPartial.requirementStatus as any,
    requirementSetStatus: normalizedPartial.requirementSetStatus as any,
    suggestedActions: normalizedPartial.suggestedActions as any,
    requirementsBySet: normalizedPartial.requirementsBySet as any,
    selectedRequirementSetIds: normalizedPartial.selectedRequirementSetIds,
    requirementSets: normalizedPartial.requirementSets as any
  })
  if (Array.isArray(normalizedPartial.selectedRequirementSetIds)) {
    flow.setSelectedRequirementSetIds(normalizedPartial.selectedRequirementSetIds)
  }
}

const lookupActions = useLookupActions<LookupFindingsState>({
  flow,
  loading,
  errorMessage,
  successMessage,
  applyLookup,
  clearMessages
})

watch([selectedKbModule, selectedTemplateName], ([moduleName, templateName]) => {
  flow.setTemplateSelection({
    moduleName,
    templateName
  })
})

async function refreshTemplatesForExamination() {
  templateStatusMessage.value = null
  const examName = selectedExaminationName.value
  if (!examName) return
  const templates = await fetchTemplatesByExamination(examName)
  if (templates.length) {
    templateStatusMessage.value = `${templates.length} Template(s) für "${examName}" geladen.`
  } else {
    templateStatusMessage.value = `Keine Templates für "${examName}" gefunden.`
  }
}

function onModuleChange(next: string) {
  setModuleName(next.trim() || 'report_template_examples')
  void refreshTemplatesForExamination()
}

function onTemplateSelectionChange(name: string) {
  void selectTemplateByName(name || null)
}

async function toggleRequirementSet(id: number, checked: boolean) {
  if (loading.value) return
  clearMessages()
  const next = new Set(selectedRequirementSetIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  const ids = Array.from(next)

  try {
    const patchResult = await lookupActions.patchLookupParts(
      { selectedRequirementSetIds: ids },
      { fallbackErrorMessage: 'Fehler beim Speichern der Dokumentationsregeln.' }
    )
    if (!patchResult.ok) return
    flow.setSelectedRequirementSetIds(ids)
    if (lookupState.value) {
      lookupState.value = { ...lookupState.value, selectedRequirementSetIds: ids }
    }
    successMessage.value = 'Dokumentationsregeln gespeichert.'
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Speichern der Dokumentationsregeln.'
  }
}

async function loadFindingsCatalog() {
  await ensureCatalogLoaded()
}

async function refreshRuntimeValidation() {
  const patientExaminationId = flow.patientExaminationId
  const templateName = flow.selectedTemplateName
  if (!patientExaminationId || !templateName) {
    templateValidationError.value = null
    flow.setLastTemplateValidation(null)
    return
  }

  templateValidationLoading.value = true
  templateValidationError.value = null
  try {
    await loadFindingsCatalog()
    const result = await validatePatientFindingsAgainstTemplate({
      moduleName: flow.selectedKbModule,
      templateName,
      patientExaminationId,
      getFindingById
    })
    flow.setLastTemplateValidation(result)
  } catch (e: any) {
    flow.setLastTemplateValidation(null)
    templateValidationError.value = formatApiError(
      e,
      'Template-Validierung konnte nicht ausgeführt werden.'
    )
  } finally {
    templateValidationLoading.value = false
  }
}

async function fetchLookupAll() {
  const ensured = await ensureLookupSessionForCurrentPatientExamination()
  if (!ensured) return
  await lookupActions.fetchLookupAll({
    fallbackErrorMessage: 'Fehler beim Laden des Fallstands.'
  })
}

async function triggerRecompute() {
  const ensured = await ensureLookupSessionForCurrentPatientExamination()
  if (!ensured) return
  const result = await lookupActions.recomputeLookup({
    applyUpdates: true,
    refreshAfter: true,
    fallbackErrorMessage: 'Fehler bei der Wissensbasis-Prüfung.'
  })
  if (result.ok) {
    successMessage.value = 'Die Wissensbasis wurde nach den Befundänderungen neu geprüft.'
  }
}

async function ensureLookupSessionForCurrentPatientExamination(): Promise<boolean> {
  if (flow.lookupToken) return true
  const patientExaminationId = flow.patientExaminationId
  if (!patientExaminationId) {
    errorMessage.value = 'Keine Patientenuntersuchung vorhanden. Bitte zuerst im Fall-Setup initialisieren.'
    return false
  }
  if (lookupInitInFlight.value) {
    return await lookupInitInFlight.value
  }

  const initPromise = (async () => {
    loading.value = true
    errorMessage.value = null
    flow.setSessionStatus('restarting')
    try {
      const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
        patientExaminationId
      })
      const token = String(initRes.data?.token || '')
      if (!token) {
        throw new Error('Initialisierung lieferte keinen Fallstand.')
      }
      flow.setLookupSession({
        patientExaminationId,
        lookupToken: token,
        status: 'active'
      })
      return true
    } catch (e: any) {
      flow.setSessionStatus('expired')
      errorMessage.value = formatApiError(
        e,
        'Der Fallkontext konnte nicht initialisiert werden.'
      )
      return false
    } finally {
      loading.value = false
      lookupInitInFlight.value = null
    }
  })()

  lookupInitInFlight.value = initPromise
  return await initPromise
}

async function ensureLookupSession() {
  await ensureLookupSessionForCurrentPatientExamination()
}

function isFindingAddedToExamination(findingId: number): boolean {
  return isFindingAttached(flow.patientExaminationId, findingId)
}

function onFindingAddedToExamination(
  findingIdOrData: FindingAddedEvent,
  findingName?: string
) {
  const findingId = typeof findingIdOrData === 'number' ? findingIdOrData : findingIdOrData.findingId
  const name =
    (typeof findingIdOrData === 'number' ? findingName : findingIdOrData.findingName) ??
    getFindingDisplayName(getFindingById(findingId) ?? { id: findingId, name: `Befund ${findingId}` })

  flow.noteFindingAdded(findingId)
  successMessage.value = `Befund "${name}" wurde hinzugefügt.`

  // Refresh lookup advisory state after changes
  void ensurePatientFindingsLoaded(flow.patientExaminationId).then(() => refreshRuntimeValidation())
  void triggerRecompute()
}

function onClassificationUpdated(findingId: number, classificationId: number, choiceId: number | null) {
  flow.noteClassificationUpdated(findingId, classificationId, choiceId)
  successMessage.value = `Klassifikation für Befund ${findingId} aktualisiert.`
  void ensurePatientFindingsLoaded(flow.patientExaminationId).then(() => refreshRuntimeValidation())
  void triggerRecompute()
}

function onFindingError(message: string) {
  errorMessage.value = message
}

function onFindingDetailError(data: { error: string }) {
  errorMessage.value = data.error
}

function formatFindingsEvent(event: {
  type: 'finding_added' | 'classification_updated'
  at: string
  findingId: number
  classificationId?: number
  choiceId?: number | null
}) {
  const e = event
  if (e.type === 'finding_added') return `Befund ${e.findingId} hinzugefügt (${e.at})`
  return `Klassifikation geändert: Befund ${e.findingId}, Klassifikation ${e.classificationId}, Wahl ${e.choiceId ?? 'leer'} (${e.at})`
}

onMounted(async () => {
  if (!examinationStore.exams.length) {
    await examinationStore.fetchExaminations()
  }
  if (flow.patientExaminationId) {
    patientExaminationStore.setCurrentPatientExaminationId(flow.patientExaminationId)
    await ensurePatientFindingsLoaded(flow.patientExaminationId)
  }
  await loadFindingsCatalog()
  if (selectedExaminationName.value) {
    await refreshTemplatesForExamination()
  }
  if (flow.patientExaminationId) {
    await fetchLookupAll()
  }
  await refreshRuntimeValidation()
})

watch(
  () => [flow.patientExaminationId, flow.selectedKbModule, flow.selectedTemplateName] as const,
  async () => {
    await refreshRuntimeValidation()
  }
)

watch(
  selectedExaminationName,
  async (newName, oldName) => {
    if (!newName || newName === oldName) return
    await refreshTemplatesForExamination()
  }
)
</script>
