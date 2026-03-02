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
            {{ selectedTemplate.validators.examinationValidators.length }} examination,
            {{ selectedTemplate.validators.findingsValidators.length }} findings
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
            :requirement-set-status="lookup?.requirementSetStatus || {}"
            @toggle="toggleRequirementSet"
          />

          <div class="mt-3 p-3 bg-light rounded">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-semibold">Ausgewählte Set-IDs</span>
              <code>{{ flow.selectedRequirementSetIds.join(', ') || 'keine' }}</code>
            </div>
          </div>

          <div v-if="lookup?.suggestedActions && Object.keys(lookup.suggestedActions).length" class="mt-3">
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
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import LookupActionsBar from '@/components/Reporting/LookupActionsBar.vue'
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue'
import { useLookupActions } from '@/composables/reporting/useLookupActions'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

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

const requirementSets = computed<RequirementSetLite[]>(() => lookup.value?.requirementSets ?? [])
const selectedRequirementSetIdSet = computed(() => new Set(flow.selectedRequirementSetIds))
const prettySuggestedActions = computed(() =>
  JSON.stringify(lookup.value?.suggestedActions || {}, null, 2)
)

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function applyLookup(partial: Partial<LookupDict>) {
  if (!lookup.value) {
    lookup.value = partial as LookupDict
  } else {
    lookup.value = { ...lookup.value, ...partial }
  }
  if (Array.isArray(partial.selectedRequirementSetIds)) {
    flow.setSelectedRequirementSetIds(partial.selectedRequirementSetIds)
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
  const next = new Set(flow.selectedRequirementSetIds)
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
  if (flow.lookupToken) {
    await fetchLookupAll()
  }
})
</script>
