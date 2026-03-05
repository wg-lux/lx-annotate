<template>
  <div class="d-flex flex-column gap-3">
    <MedicalBlock
      title="Template-Auswahl"
      subtitle="Report-Templates nach Untersuchung laden und für den Editor vorbereiten"
      icon="description"
      icon-bg-class="bg-gradient-primary"
      :is-complete="!!selectedTemplateName"
      :is-active="true"
      :show-action="false"
      :loading="templateLoading"
    >
      <template #default>
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">KB-Modul</label>
            <input
              class="form-control"
              :value="selectedKbModule"
              :disabled="templateLoading"
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
              :disabled="templateLoading || !templateOptions.length"
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
            :disabled="templateLoading || !selectedExaminationName"
            @click="refreshTemplatesForExamination"
          >
            Templates für Untersuchung laden
          </button>
        </div>

        <div v-if="templateErrorMessage" class="alert alert-danger py-2 mb-2">
          {{ templateErrorMessage }}
        </div>
        <div v-if="templateStatusMessage" class="alert alert-success py-2 mb-0">
          {{ templateStatusMessage }}
        </div>

        <div v-if="selectedTemplate" class="mt-3">
          <div class="small text-muted mb-2">
            Abschnitte: {{ sectionBlocks.length }} · Validators:
            {{ selectedTemplateValidatorCounts.examination }} examination,
            {{ selectedTemplateValidatorCounts.findings }} findings
          </div>
          <ul class="list-group list-group-flush">
            <li v-for="section in sectionBlocks" :key="section.name" class="list-group-item px-0">
              <div class="fw-semibold">{{ section.title }}</div>
              <div class="small text-muted">
                {{ section.findings.length }} Befunde, {{ section.requiredFindingsCount }} erforderlich,
                {{ section.requiredClassificationsCount }} Pflicht-Klassifikationen
              </div>
            </li>
          </ul>
        </div>
      </template>
    </MedicalBlock>

    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Template & Anforderungssets</h5>
          <small class="text-muted">Lookup-Zustand laden, Sets auswählen, Neuberechnung auslösen</small>
        </div>
        <LookupActionsBar
          :loading="loading"
          :has-lookup-token="!!flow.lookupToken"
          :show-parts="true"
          @refresh="fetchLookupAll"
          @load-parts="fetchLookupParts(['requirementSets','selectedRequirementSetIds','requirementSetStatus','suggestedActions'])"
          @recompute="triggerRecompute"
        />
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">PatientExamination-ID</label>
            <input class="form-control" :value="flow.patientExaminationId ?? ''" readonly />
          </div>
          <div class="col-md-8">
            <label class="form-label">Lookup-Token</label>
            <input class="form-control" :value="flow.lookupToken ?? ''" readonly />
          </div>
        </div>

        <div class="small text-muted mb-3">
          Route-Parameter `patient_examination_id`: {{ route.params.patient_examination_id }}
        </div>

        <div v-if="!flow.lookupToken" class="alert alert-warning mb-0">
          Keine Lookup-Session vorhanden. Bitte zuerst das Fall-Setup abschließen.
        </div>

        <div v-else>
          <RequirementSetSelectionList
            :items="requirementSets"
            :selected-id-set="selectedRequirementSetIdSet"
            :loading="loading"
            :requirement-set-status="lookupRequirementSetStatus"
            @toggle="toggleRequirementSet"
          />

          <div class="mt-3 p-3 bg-light rounded">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-semibold">Ausgewählte Set-IDs</span>
              <code>{{ selectedRequirementSetIdsDisplay }}</code>
            </div>
          </div>

          <div v-if="hasSuggestedActions" class="mt-3">
            <h6 class="mb-2">Empfohlene Aktionen (Lookup)</h6>
            <pre class="small bg-light rounded p-2 mb-0">{{ prettySuggestedActions }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import LookupActionsBar from '@/components/Reporting/LookupActionsBar.vue'
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue'
import { useLookupActions } from '@/composables/reporting/useLookupActions'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'

type RequirementSetLite = { id: number; name: string; type: string }
type RequirementLite = { id: number; name: string }
type LookupDict = {
  patientExaminationId: number
  requirementSets: RequirementSetLite[]
  requirementsBySet: Record<string, RequirementLite[]>
  requirementStatus: Record<string, boolean>
  requirementSetStatus: Record<string, boolean>
  suggestedActions: Record<string, any[]>
  selectedRequirementSetIds?: number[]
}

type PatientExaminationDetailResponse = {
  id?: number
  patientData?: { id?: number } | null
  patient_data?: { id?: number } | null
  examination?: string | { id?: number; name?: string } | null
  examinationName?: string | null
  examination_name?: string | null
}

const route = useRoute()
const flow = useReportingFlowStore()
const examinationStore = useExaminationStore()

const lookup = ref<LookupDict | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

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

const selectedExamination = computed(
  () =>
    examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) || null
)
const selectedExaminationName = computed(() => selectedExamination.value?.name || null)
const selectedExaminationDisplayName = computed(
  () => selectedExamination.value?.displayName || selectedExaminationName.value || null
)
const templateStatusMessage = ref<string | null>(null)

function normalizeIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.trunc(entry))
  return Array.from(new Set(ids))
}

function normalizeRequirementSets(value: unknown): RequirementSetLite[] {
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
    .filter((entry): entry is RequirementSetLite => !!entry)
}

function normalizeRequirementsBySet(value: unknown): Record<string, RequirementLite[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const requirements = Array.isArray(entry)
        ? entry
            .map((item) => {
              if (!item || typeof item !== 'object') return null
              const id = Number((item as any).id)
              if (!Number.isFinite(id)) return null
              return {
                id,
                name: String((item as any).name || '')
              }
            })
            .filter((item): item is RequirementLite => !!item)
        : []
      return [String(key), requirements]
    })
  )
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [String(key), !!entry]))
}

function normalizeSuggestedActions(value: unknown): Record<string, any[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), Array.isArray(entry) ? entry : []])
  )
}

function normalizeLookupPartial(partial: Partial<LookupDict>): Partial<LookupDict> {
  const normalized: Partial<LookupDict> = { ...partial }
  if ('requirementSets' in partial) {
    normalized.requirementSets = normalizeRequirementSets(partial.requirementSets)
  }
  if ('requirementsBySet' in partial) {
    normalized.requirementsBySet = normalizeRequirementsBySet(partial.requirementsBySet)
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
  if ('selectedRequirementSetIds' in partial) {
    normalized.selectedRequirementSetIds = normalizeIdArray(partial.selectedRequirementSetIds)
  }
  return normalized
}

const requirementSets = computed<RequirementSetLite[]>(() =>
  normalizeRequirementSets(lookup.value?.requirementSets)
)
const selectedRequirementSetIds = computed(() => normalizeIdArray(flow.selectedRequirementSetIds))
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value))
const selectedRequirementSetIdsDisplay = computed(() =>
  selectedRequirementSetIds.value.length ? selectedRequirementSetIds.value.join(', ') : 'keine'
)
const lookupRequirementSetStatus = computed(() =>
  normalizeBooleanRecord(lookup.value?.requirementSetStatus)
)
const hasSuggestedActions = computed(
  () => Object.keys(normalizeSuggestedActions(lookup.value?.suggestedActions)).length > 0
)
const prettySuggestedActions = computed(() =>
  JSON.stringify(normalizeSuggestedActions(lookup.value?.suggestedActions), null, 2)
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
const routePatientExaminationId = computed<number | null>(() => {
  const raw = Number(route.params.patient_examination_id)
  return Number.isFinite(raw) ? raw : null
})

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function applyLookup(partial: Partial<LookupDict>) {
  const normalizedPartial = normalizeLookupPartial(partial)
  if (!lookup.value) {
    lookup.value = normalizedPartial as LookupDict
  } else {
    lookup.value = { ...lookup.value, ...normalizedPartial }
  }
  if (Array.isArray(normalizedPartial.selectedRequirementSetIds)) {
    flow.setSelectedRequirementSetIds(normalizedPartial.selectedRequirementSetIds)
  }
}

function extractPatientId(payload: PatientExaminationDetailResponse): number | null {
  const patientId = Number(payload?.patientData?.id ?? payload?.patient_data?.id)
  return Number.isFinite(patientId) ? patientId : null
}

function extractExaminationName(payload: PatientExaminationDetailResponse): string | null {
  if (typeof payload?.examination === 'string' && payload.examination.trim()) {
    return payload.examination.trim()
  }
  if (
    payload?.examination &&
    typeof payload.examination === 'object' &&
    typeof payload.examination.name === 'string' &&
    payload.examination.name.trim()
  ) {
    return payload.examination.name.trim()
  }
  if (typeof payload?.examinationName === 'string' && payload.examinationName.trim()) {
    return payload.examinationName.trim()
  }
  if (typeof payload?.examination_name === 'string' && payload.examination_name.trim()) {
    return payload.examination_name.trim()
  }
  return null
}

function resolveExaminationIdByName(name: string): number | null {
  const normalized = name.trim().toLowerCase()
  const match = examinationStore.examinationsDropdown.find(
    (item) => String(item.name || '').trim().toLowerCase() === normalized
  )
  return match?.id ?? null
}

function applyRoutePatientExaminationContext(routeId: number) {
  if (flow.patientExaminationId !== routeId) {
    flow.setLookupSession({
      patientExaminationId: routeId,
      lookupToken: null,
      status: 'idle'
    })
    flow.setSelectedRequirementSetIds([])
    flow.setActiveReportId(null)
  }
}

async function hydrateCaseSelectionFromPatientExamination(routeId: number) {
  const res = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(routeId)))
  const payload = res.data as PatientExaminationDetailResponse

  const patientId = extractPatientId(payload)
  if (patientId != null) {
    flow.setCaseSelection({ selectedPatientId: patientId })
  }

  const examinationName = extractExaminationName(payload)
  if (examinationName) {
    const examinationId = resolveExaminationIdByName(examinationName)
    if (examinationId != null) {
      flow.setCaseSelection({ selectedExaminationId: examinationId })
    }
  }
}

async function ensureLookupSession(routeId: number) {
  if (flow.lookupToken) {
    flow.setLookupSession({
      patientExaminationId: routeId,
      lookupToken: flow.lookupToken,
      status: 'active'
    })
    return
  }
  const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
    patientExaminationId: routeId
  })
  const token = String(initRes.data?.token || '')
  if (!token) {
    throw new Error('Lookup-Init lieferte kein Token.')
  }
  flow.setLookupSession({
    patientExaminationId: routeId,
    lookupToken: token,
    status: 'active'
  })
}

async function initializeFromRouteContext() {
  const routeId = routePatientExaminationId.value
  if (!routeId) return

  applyRoutePatientExaminationContext(routeId)
  await hydrateCaseSelectionFromPatientExamination(routeId)
  await ensureLookupSession(routeId)

  const lookupResult = await lookupActions.fetchLookupAll()
  if (!lookupResult.ok && lookupResult.expired) {
    flow.setLookupSession({
      patientExaminationId: routeId,
      lookupToken: null,
      status: 'expired'
    })
    await ensureLookupSession(routeId)
    await lookupActions.fetchLookupAll()
  }
}

const lookupActions = useLookupActions<LookupDict>({
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

async function fetchLookupAll() {
  await lookupActions.fetchLookupAll()
}

async function fetchLookupParts(keys: string[]) {
  const result = await lookupActions.fetchLookupParts(keys)
  if (result.ok) {
    successMessage.value = 'Teilstatus aus Lookup geladen.'
  }
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
      { fallbackErrorMessage: 'Fehler beim Speichern der Anforderungssets.' }
    )
    if (!patchResult.ok) return
    flow.setSelectedRequirementSetIds(ids)
    if (lookup.value) lookup.value = { ...lookup.value, selectedRequirementSetIds: ids }
    await fetchLookupParts(['selectedRequirementSetIds', 'requirementSetStatus'])
    successMessage.value = 'Anforderungssets gespeichert.'
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Speichern der Anforderungssets.'
  }
}

async function triggerRecompute() {
  const result = await lookupActions.recomputeLookup({
    applyUpdates: true,
    refreshAfter: true,
    fallbackErrorMessage: 'Fehler bei der Neuberechnung.'
  })
  if (result.ok) {
    successMessage.value = 'Lookup wurde erfolgreich neu berechnet.'
  }
}

onMounted(async () => {
  if (!examinationStore.exams.length) {
    await examinationStore.fetchExaminations()
  }

  await initializeFromRouteContext()

  if (selectedExaminationName.value) {
    await refreshTemplatesForExamination()
  }

  if (
    flow.patientExaminationId &&
    Number(route.params.patient_examination_id) !== flow.patientExaminationId
  ) {
    errorMessage.value =
      'Warnung: Route-Parameter und gespeicherte Patientenuntersuchung stimmen nicht überein.'
  }
  if (flow.lookupToken && !lookup.value) {
    await fetchLookupAll()
  }
})

watch(
  routePatientExaminationId,
  async (newId, oldId) => {
    if (!newId || newId === oldId) return
    await initializeFromRouteContext()
    if (selectedExaminationName.value) {
      await refreshTemplatesForExamination()
    }
  }
)
</script>
