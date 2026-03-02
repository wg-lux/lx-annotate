<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Berichtseditor & Speichern</h5>
          <small class="text-muted">Template-gesteuerte Abschnitte mit wiederverwendbaren MedicalBlocks.</small>
        </div>
        <RouterLink class="btn btn-outline-secondary btn-sm" to="/report-generator">
          Aktuellen monolithischen Workflow öffnen
        </RouterLink>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <LookupStatusPanel
          class="mb-3"
          :patient-examination-id="flow.patientExaminationId"
          :lookup-token="flow.lookupToken"
        />
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">Aktive Report-ID</label>
            <input class="form-control" :value="flow.activeReportId ?? ''" readonly />
          </div>
          <div class="col-md-4">
            <label class="form-label">Report-Version</label>
            <input class="form-control" :value="currentReportVersion ?? ''" readonly />
          </div>
          <div class="col-md-4">
            <label class="form-label">Status letzter Save</label>
            <input class="form-control" :value="lastSaveStatus ?? ''" readonly />
          </div>
        </div>

        <MedicalBlock
          title="Template-Kontext"
          subtitle="Templates per Untersuchung laden und für den Bericht aktivieren"
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

            <div class="d-flex flex-wrap gap-2">
              <button
                class="btn btn-outline-secondary btn-sm"
                :disabled="loading || templateLoading || !selectedExaminationName"
                @click="refreshTemplatesForExamination"
              >
                Templates für Untersuchung laden
              </button>
              <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadLatestReportMeta">
                Letzten Report laden
              </button>
            </div>
            <div v-if="templateErrorMessage" class="alert alert-danger py-2 mt-3 mb-0">
              {{ templateErrorMessage }}
            </div>
            <div v-if="templateStatusMessage" class="alert alert-success py-2 mt-3 mb-0">
              {{ templateStatusMessage }}
            </div>
          </template>
        </MedicalBlock>

        <div v-if="!sectionBlocks.length" class="alert alert-info">
          Keine Template-Abschnitte geladen. Bitte zunächst ein Template auswählen.
        </div>

        <MedicalBlock
          v-for="section in sectionBlocks"
          :key="section.name"
          :title="section.title"
          :subtitle="section.subtitle"
          icon="assignment"
          icon-bg-class="bg-gradient-info"
          :is-complete="isSectionConfigured(section.name)"
          :is-active="section.position === 0"
          :show-action="false"
          :loading="loading"
        >
          <template #default>
            <div class="small text-muted mb-2">
              {{ section.findings.length }} Befunde · {{ section.requiredFindingsCount }} erforderlich ·
              {{ section.requiredClassificationsCount }} Pflicht-Klassifikationen
            </div>

            <div class="d-flex flex-wrap gap-3 mb-3">
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="getSectionDraft(section.name).includePatientData"
                  :disabled="loading"
                  @change="onSectionDraftToggle(section.name, 'includePatientData', ($event.target as HTMLInputElement).checked)"
                />
                <label class="form-check-label">Patientendaten einbeziehen</label>
              </div>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="getSectionDraft(section.name).includeExaminationData"
                  :disabled="loading"
                  @change="onSectionDraftToggle(section.name, 'includeExaminationData', ($event.target as HTMLInputElement).checked)"
                />
                <label class="form-check-label">Untersuchungsdaten einbeziehen</label>
              </div>
            </div>

            <label class="form-label">Abschnittsnotiz / Entwurfstext</label>
            <textarea
              class="form-control"
              rows="4"
              :disabled="loading"
              :value="getSectionDraft(section.name).note"
              @input="onSectionDraftNote(section.name, ($event.target as HTMLTextAreaElement).value)"
            />
          </template>
        </MedicalBlock>

        <IndicationsEditor
          class="mb-4"
          :rows="flow.indications"
          :disabled="loading"
          description="Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend."
          @update-row="(idx, patch) => flow.updateIndicationRow(idx, patch)"
          @add-row="flow.addIndicationRow()"
          @remove-row="(idx) => flow.removeIndicationRow(idx)"
        />

        <div class="d-flex flex-wrap gap-2">
          <button
            class="btn btn-outline-primary"
            :disabled="loading || !canSave"
            @click="saveReportSubmission('draft')"
          >
            <span v-if="loading && pendingSaveStatus === 'draft'" class="spinner-border spinner-border-sm me-1" />
            Entwurf speichern
          </button>
          <button
            class="btn btn-success"
            :disabled="loading || !canSave"
            @click="saveReportSubmission('final')"
          >
            <span v-if="loading && pendingSaveStatus === 'final'" class="spinner-border spinner-border-sm me-1" />
            Final speichern
          </button>
        </div>
      </div>
    </div>

    <div class="card shadow-sm" v-if="saveWarnings.length">
      <div class="card-header">
        <h6 class="mb-0">Warnungen (advisory)</h6>
      </div>
      <div class="card-body">
        <ul class="mb-0">
          <li v-for="(warning, idx) in saveWarnings" :key="idx">{{ warning }}</li>
        </ul>
      </div>
    </div>

    <ReportArtifactsPanel :artifacts="persistedArtifacts" />

    <div class="card shadow-sm">
      <div class="card-header">
        <h6 class="mb-0">Vorschau Payload</h6>
      </div>
      <div class="card-body d-flex flex-column gap-3">
        <div>
          <div class="small text-muted mb-1">Indikationen</div>
          <pre class="small mb-0 bg-light p-2 rounded">{{ normalizedIndicationsPreview }}</pre>
        </div>
        <div>
          <div class="small text-muted mb-1">Abschnitts-Entwürfe</div>
          <pre class="small mb-0 bg-light p-2 rounded">{{ sectionDraftPreview }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue'
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue'
import ReportArtifactsPanel from '@/components/Reporting/ReportArtifactsPanel.vue'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'
import type {
  ReportSubmissionStatus,
  SaveReportSubmissionRequest,
  SaveReportSubmissionResponse
} from '@/types/api/reportSubmission'
import {
  formatDateOnly,
  mergeClassificationSelections,
  normalizeInterventions
} from '@/components/AssistedReporting/reportSubmissionUtils'
import type {
  PatientFindingApiClassification,
  PatientFindingApiIntervention
} from '@/components/AssistedReporting/reportSubmissionUtils'
import { usePatientStore } from '@/stores/patientStore'
import type { ReportTemplateSectionDraft } from '@/types/reportTemplate'

type PatientFindingApiRow = {
  id: number
  finding: number
  isActive?: boolean
  classifications?: Array<number | PatientFindingApiClassification>
  interventions?: Array<number | PatientFindingApiIntervention>
}

type PatientExaminationReportListItem = {
  id: number
  status: string
  version: number
  templateName?: string
  updatedAt?: string
}

const flow = useReportingFlowStore()
const patientStore = usePatientStore()
const examinationStore = useExaminationStore()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const saveWarnings = ref<string[]>([])
const lastSaveStatus = ref<ReportSubmissionStatus | null>(null)
const pendingSaveStatus = ref<ReportSubmissionStatus | null>(null)
const currentReportVersion = ref<number | null>(null)
const persistedArtifacts = ref<SaveReportSubmissionResponse['persistedArtifacts']>(null)
const historyContext = ref<Record<string, unknown> | null>(null)
const requirementGuidance = ref<Record<string, unknown> | null>(null)

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
const selectedPatient = computed(() =>
  flow.selectedPatientId ? patientStore.getPatientById(flow.selectedPatientId) : null
)

const templateStatusMessage = ref<string | null>(null)

const canSave = computed(() => !!flow.patientExaminationId && !!selectedTemplateName.value)

const normalizedIndications = computed<SaveReportSubmissionRequest['indications']>(() =>
  flow.indications
    .filter((row) => row.examinationIndicationId != null)
    .map((row) => ({
      examinationIndicationId: row.examinationIndicationId as number,
      indicationChoiceId: row.indicationChoiceId ?? undefined
    }))
)

const normalizedIndicationsPreview = computed(() =>
  JSON.stringify(normalizedIndications.value, null, 2)
)

const sectionDraftPreview = computed(() => JSON.stringify(flow.templateSectionDrafts || {}, null, 2))

watch(
  [selectedKbModule, selectedTemplateName],
  ([moduleName, templateName], [, previousTemplateName]) => {
    flow.setTemplateSelection({
      moduleName,
      templateName
    })
    if (templateName && previousTemplateName && templateName !== previousTemplateName) {
      flow.clearTemplateSectionDrafts()
    }
  }
)

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function getSectionDraft(sectionName: string): ReportTemplateSectionDraft {
  return (
    flow.templateSectionDrafts[sectionName] || {
      note: '',
      includePatientData: false,
      includeExaminationData: false
    }
  )
}

function onSectionDraftNote(sectionName: string, note: string) {
  flow.setTemplateSectionDraft(sectionName, { note })
}

function onSectionDraftToggle(
  sectionName: string,
  key: 'includePatientData' | 'includeExaminationData',
  value: boolean
) {
  flow.setTemplateSectionDraft(sectionName, { [key]: value })
}

function isSectionConfigured(sectionName: string): boolean {
  const draft = getSectionDraft(sectionName)
  return !!draft.note.trim() || draft.includePatientData || draft.includeExaminationData
}

function buildPatientDataPayload(): SaveReportSubmissionRequest['patientData'] {
  const patient = selectedPatient.value
  if (!patient) return {}
  return {
    patientBirthDate: formatDateOnly(patient.dob),
    patientGender: patient.gender || null,
    firstName: patient.firstName || null,
    lastName: patient.lastName || null,
    center: (patient as any).center || null
  }
}

function buildPatientContextText(): string {
  const patient = selectedPatient.value
  if (!patient) return ''
  const parts = [
    patient.firstName || null,
    patient.lastName || null,
    patient.gender || null,
    formatDateOnly(patient.dob)
  ].filter(Boolean)
  return parts.length ? `Patient: ${parts.join(' · ')}` : ''
}

function buildExaminationContextText(): string {
  if (!selectedExaminationDisplayName.value) return ''
  return `Untersuchung: ${selectedExaminationDisplayName.value}`
}

async function ensurePatientsLoaded() {
  if (!patientStore.patients.length) {
    await patientStore.fetchPatients()
  }
}

async function ensureExaminationsLoaded() {
  if (!examinationStore.exams.length) {
    await examinationStore.fetchExaminations()
  }
}

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

async function fetchNormalizedFindingsPayload(): Promise<SaveReportSubmissionRequest['findings']> {
  if (!flow.patientExaminationId) return []

  try {
    const res = await axiosInstance.get(
      r(`${endpoints.patient.patientFindings}?patient_examination=${flow.patientExaminationId}`)
    )
    const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data) as PatientFindingApiRow[]
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.finding && row.isActive !== false)
      .map((row) => ({
        finding: row.finding,
        classifications: mergeClassificationSelections(row.finding, row.classifications, {}),
        interventions: normalizeInterventions(row.interventions)
      }))
  } catch (e: any) {
    console.warn('Konnte patient-findings nicht laden, verwende Fallback:', e?.message || e)
  }

  try {
    const res = await axiosInstance.get(
      r(endpoints.examination.patientExaminationFindings(flow.patientExaminationId))
    )
    const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data) as Array<{ id?: number }>
    return (Array.isArray(rows) ? rows : [])
      .map((row) => Number(row?.id))
      .filter((id) => Number.isFinite(id))
      .map((findingId) => ({
        finding: findingId,
        classifications: [],
        interventions: []
      }))
  } catch (e: any) {
    console.warn('Fallback für Befunde fehlgeschlagen:', e?.message || e)
    return []
  }
}

function buildEditorPayload(): Record<string, unknown> {
  return {
    source: 'reporting_route_report_editor',
    routePatientExaminationId: route.params.patient_examination_id ?? null,
    lookupToken: flow.lookupToken,
    selectedRequirementSetIds: flow.selectedRequirementSetIds,
    indications: normalizedIndications.value,
    template: {
      moduleName: selectedKbModule.value,
      templateName: selectedTemplateName.value,
      sections: sectionBlocks.value.map((section) => ({
        name: section.name,
        title: section.title,
        subtitle: section.subtitle,
        draft: getSectionDraft(section.name)
      }))
    },
    savedAt: new Date().toISOString()
  }
}

function buildRenderedText(): string {
  const lines: string[] = []
  lines.push(`# ${selectedTemplateName.value || 'Unbenanntes Template'}`)
  for (const section of sectionBlocks.value) {
    const draft = getSectionDraft(section.name)
    const sectionLines: string[] = []
    if (draft.includePatientData) {
      const patientText = buildPatientContextText()
      if (patientText) sectionLines.push(patientText)
    }
    if (draft.includeExaminationData) {
      const examText = buildExaminationContextText()
      if (examText) sectionLines.push(examText)
    }
    if (draft.note.trim()) sectionLines.push(draft.note.trim())

    lines.push(`## ${section.title}`)
    if (sectionLines.length) lines.push(sectionLines.join('\n'))
  }
  return lines.join('\n\n')
}

async function loadLatestReportMeta() {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }
  loading.value = true
  clearMessages()
  try {
    const res = await axiosInstance.get(
      r(endpoints.report.patientExaminationReportsByPatientExamination(flow.patientExaminationId))
    )
    const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data) as PatientExaminationReportListItem[]
    const items = Array.isArray(rows) ? rows : []
    if (!items.length) {
      flow.setActiveReportId(null)
      currentReportVersion.value = null
      successMessage.value = 'Kein bestehender Bericht gefunden. Der nächste Save erstellt einen neuen Bericht.'
      return
    }
    const latest = items[0]
    flow.setActiveReportId(latest.id)
    currentReportVersion.value = latest.version ?? null
    if (latest.templateName) {
      await selectTemplateByName(latest.templateName)
    }
    successMessage.value = `Bericht #${latest.id} (Version ${latest.version}) geladen.`
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Laden bestehender Berichte.'
  } finally {
    loading.value = false
  }
}

async function saveReportSubmission(status: ReportSubmissionStatus) {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }
  if (!selectedTemplateName.value) {
    errorMessage.value = 'Template-Name ist erforderlich.'
    return
  }

  pendingSaveStatus.value = status
  loading.value = true
  clearMessages()

  try {
    await ensurePatientsLoaded()
    const findings = await fetchNormalizedFindingsPayload()

    const payload: SaveReportSubmissionRequest = {
      ...(flow.activeReportId ? { reportId: flow.activeReportId } : {}),
      ...(currentReportVersion.value ? { expectedVersion: currentReportVersion.value } : {}),
      patientExaminationId: flow.patientExaminationId,
      templateName: selectedTemplateName.value,
      status,
      editorPayload: buildEditorPayload(),
      renderedText: buildRenderedText(),
      patientData: buildPatientDataPayload(),
      indications: normalizedIndications.value,
      findings,
      selectedRequirementSetIds: flow.selectedRequirementSetIds
    }

    const res = await axiosInstance.post<SaveReportSubmissionResponse>(
      r(endpoints.report.saveReportSubmission),
      payload
    )
    const data = res.data

    flow.setActiveReportId(data.report.id)
    currentReportVersion.value = data.report.version
    lastSaveStatus.value = (data.report.status as ReportSubmissionStatus) || status
    saveWarnings.value = Array.isArray(data.warnings) ? data.warnings : []
    historyContext.value = (data.historyContext || null) as Record<string, unknown> | null
    requirementGuidance.value = (data.requirementGuidance || null) as Record<string, unknown> | null
    flow.setLastRequirementGuidance(requirementGuidance.value)
    if (requirementGuidance.value && typeof requirementGuidance.value === 'object') {
      const rg = requirementGuidance.value as Record<string, any>
      flow.patchLookupSnapshot({
        requirementStatus: rg.requirementStatus,
        requirementSetStatus: rg.requirementSetStatus,
        suggestedActions: rg.suggestedActions,
        candidateRequirementSetIds: rg.candidateRequirementSetIds,
        candidateRequirementSetConfidence: rg.candidateRequirementSetConfidence
      })
    }
    persistedArtifacts.value = data.persistedArtifacts || null

    successMessage.value = data.created
      ? `Bericht wurde erstellt (ID ${data.report.id}, Version ${data.report.version}).`
      : `Bericht wurde aktualisiert (ID ${data.report.id}, Version ${data.report.version}).`
  } catch (e: any) {
    const versionConflict = e?.response?.data?.expectedVersion
    if (typeof versionConflict === 'string') {
      errorMessage.value = `Versionskonflikt: ${versionConflict}`
    } else {
      errorMessage.value =
        e?.response?.data?.detail || e?.message || 'Fehler beim Speichern des Berichts.'
    }
  } finally {
    loading.value = false
    pendingSaveStatus.value = null
  }
}

onMounted(async () => {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.'
    return
  }
  await Promise.all([ensurePatientsLoaded(), ensureExaminationsLoaded()])
  await refreshTemplatesForExamination()
  await loadLatestReportMeta()
})
</script>
