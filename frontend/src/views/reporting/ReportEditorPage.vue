<template>
  <div class="d-flex flex-column gap-3">
    <section class="report-editor-toolbar" aria-label="Berichtseditor">
      <div class="report-workspace-title">
        <div class="small text-uppercase text-muted fw-semibold tracking-label">Bericht</div>
        <h5 class="mb-2">Bericht schreiben</h5>
        <div class="report-editor-facts">
          <span>{{ reportPatientLabel }}</span>
          <span>{{ selectedExaminationDisplayName || 'Untersuchung fehlt' }}</span>
          <span>{{ selectedTemplateDisplayName }}</span>
        </div>
      </div>
      <div class="report-workspace-actions">
        <div
          class="report-status-pill"
          :class="lastSaveStatus === 'final' ? 'is-final' : 'is-draft'"
        >
          {{
            lastSaveStatus === 'final' ? 'Final' : flow.activeReportId ? 'Entwurf' : 'Neuer Bericht'
          }}
        </div>
        <RouterLink class="btn btn-outline-secondary btn-sm" to="/reporting/case-setup">
          Fall wechseln
        </RouterLink>
      </div>
    </section>

    <section class="report-workspace-surface">
      <div class="report-workspace-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <div v-if="sectionCompletionSummary.totalSections" class="report-readiness-strip mb-3">
          <div class="readiness-item is-primary">
            <span>Vollständigkeit</span>
            <strong>
              {{ sectionCompletionSummary.completedSections }}/{{
                sectionCompletionSummary.totalSections
              }}
            </strong>
          </div>
          <div class="readiness-item" :class="{ 'has-warning': missingRequiredCount > 0 }">
            <span>Noch offen</span>
            <strong>{{ missingRequiredCount }}</strong>
          </div>
          <div class="readiness-item">
            <span>Bericht</span>
            <strong>{{ reportWordCount }} Wörter</strong>
          </div>
        </div>

        <div class="report-editor-layout">
          <div class="report-editor-main">
            <MedicalBlock
              title="Vorlage"
              :subtitle="selectedExaminationDisplayName || 'Untersuchung fehlt'"
              icon="ni ni-single-copy-04"
              icon-bg-class="bg-gradient-primary"
              :is-complete="!!selectedTemplateName"
              :is-active="true"
              :show-action="false"
              :loading="loading || templateLoading"
            >
              <template #default>
                <div class="row g-3 mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Modul</label>
                    <input
                      class="form-control"
                      :value="selectedKbModule || 'Keine aktive Terminologie'"
                      readonly
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Untersuchung</label>
                    <input
                      class="form-control"
                      :value="selectedExaminationDisplayName || ''"
                      readonly
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Vorlage</label>
                    <select
                      class="form-select"
                      :value="selectedTemplateName || ''"
                      disabled
                      title="Vorlagen werden im Reporting-Kontext oberhalb der Seite gewechselt."
                    >
                      <option value="" disabled>
                        {{ templateLoading ? 'Vorlagen laden...' : 'Vorlage wählen' }}
                      </option>
                      <option
                        v-for="template in templateOptions"
                        :key="template.name"
                        :value="template.name"
                      >
                        {{ getReportTemplateDisplayName(template, flow.selectedReportLanguage) }}
                      </option>
                    </select>
                    <div class="form-text">Vorlage oben im Reporting-Kontext wechseln.</div>
                  </div>
                </div>

                <div class="d-flex flex-wrap gap-2">
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    :disabled="loading || templateLoading || !selectedExaminationName"
                    @click="refreshTemplatesForCurrentContext"
                  >
                    Vorlagen laden
                  </button>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    :disabled="loading"
                    @click="loadLatestReportForCurrentContext"
                  >
                    Letzten Bericht laden
                  </button>
                </div>
                <div v-if="templateErrorMessage" class="alert alert-danger py-2 mt-3 mb-0">
                  {{ templateErrorMessage }}
                </div>
                <div v-if="templateStatusMessage" class="alert alert-success py-2 mt-3 mb-0">
                  {{ templateStatusMessage }}
                </div>
                <div
                  v-if="findingCatalogError || coreConceptsError"
                  class="alert alert-warning py-2 mt-3 mb-0"
                >
                  {{ findingCatalogError || coreConceptsError }}
                </div>
              </template>
            </MedicalBlock>

            <div v-if="!sectionBlocks.length" class="alert alert-info">
              Die erfassten Befunde bleiben verfügbar. Wählen Sie für Berichtstext,
              Vollständigkeitsprüfung und Abschluss eine kompatible veröffentlichte Vorlage aus.
            </div>
            <div v-else-if="!currentRuntimeDraft || !currentPayload" class="alert alert-warning">
              Der Befundentwurf wird vorbereitet. Diese Ansicht aktualisiert sich automatisch.
            </div>

            <MedicalBlock
              v-for="section in sectionBlocks"
              :key="section.name"
              :title="section.title"
              :subtitle="section.subtitle"
              icon="ni ni-single-copy-04"
              icon-bg-class="bg-gradient-info"
              :is-complete="isSectionConfigured(section.name)"
              :is-active="section.position === 0"
              :show-action="false"
              :loading="loading"
            >
              <template #default>
                <div class="section-status-row mb-3">
                  <span>{{ section.findings.length }} Befunde</span>
                  <span>{{ section.requiredFindingsCount }} erforderlich</span>
                  <span>{{ section.requiredClassificationsCount }} Pflicht-Klassifikationen</span>
                </div>
                <div class="mb-3">
                  <div class="fw-semibold small mb-1">Aktueller Inhalt</div>
                  <div
                    v-if="getSectionPreview(section.name).findingSummaries.length"
                    class="section-preview-box small"
                  >
                    <div
                      v-for="summary in getSectionPreview(section.name).findingSummaries"
                      :key="summary"
                      class="mb-1"
                    >
                      {{ summary }}
                    </div>
                  </div>
                  <div v-else class="small text-muted">Noch keine Befunde in diesem Abschnitt.</div>
                </div>

                <div class="d-flex flex-wrap gap-3 mb-3 section-toggle-row">
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :checked="getSectionDraft(section.name).includePatientData"
                      :disabled="loading"
                      @change="
                        onSectionDraftToggle(
                          section.name,
                          'includePatientData',
                          ($event.target as HTMLInputElement).checked
                        )
                      "
                    />
                    <label class="form-check-label">Patientendaten einbeziehen</label>
                  </div>
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :checked="getSectionDraft(section.name).includeExaminationData"
                      :disabled="loading"
                      @change="
                        onSectionDraftToggle(
                          section.name,
                          'includeExaminationData',
                          ($event.target as HTMLInputElement).checked
                        )
                      "
                    />
                    <label class="form-check-label">Untersuchungsdaten einbeziehen</label>
                  </div>
                </div>

                <label class="form-label">Notiz</label>
                <textarea
                  class="form-control"
                  rows="4"
                  placeholder="Text für diesen Abschnitt"
                  :disabled="loading"
                  :value="getSectionDraft(section.name).note"
                  @input="
                    onSectionDraftNote(section.name, ($event.target as HTMLTextAreaElement).value)
                  "
                />
              </template>
            </MedicalBlock>

            <IndicationsEditor
              class="mb-4"
              :rows="flow.indications"
              :indication-options="indicationOptionsForEditor"
              :disabled="loading"
              :options-loading="indicationOptionsLoading"
              :options-error="indicationOptionsError"
              @update-row="(idx, patch) => flow.updateIndicationRow(idx, patch)"
              @add-row="flow.addIndicationRow()"
              @remove-row="(idx) => flow.removeIndicationRow(idx)"
              @refresh-options="loadIndicationsForCurrentContext"
            />

            <MedicalBlock
              title="Berichtstext"
              subtitle="Der gespeicherte Befundbericht kann frei bearbeitet werden."
              icon="ni ni-single-copy-04"
              icon-bg-class="bg-gradient-primary"
              :is-complete="!!renderedReportPreview.trim()"
              :is-active="true"
              :show-action="false"
              :loading="loading"
            >
              <template #default>
                <label class="form-label" for="report-rendered-text">Texteditor</label>
                <textarea
                  id="report-rendered-text"
                  class="form-control report-text-editor"
                  data-testid="report-text-editor"
                  rows="18"
                  :disabled="loading"
                  :value="renderedReportPreview"
                  @input="onRenderedReportInput(($event.target as HTMLTextAreaElement).value)"
                />
                <div class="d-flex justify-content-between align-items-center gap-2 mt-2">
                  <small class="text-muted">
                    Änderungen werden als Berichtstext gespeichert; Abschnittsnotizen bleiben
                    separat editierbar.
                  </small>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    type="button"
                    :disabled="loading || !reportTextManuallyEdited"
                    @click="resetRenderedReportText"
                  >
                    Aus Vorlage neu erzeugen
                  </button>
                </div>
              </template>
            </MedicalBlock>

            <div v-if="sectionCompletionSummary.totalSections" class="alert alert-info py-3">
              <div class="fw-semibold mb-1">Vollständigkeitsübersicht</div>
              <div class="small mb-2">
                {{ sectionCompletionSummary.completedSections }} von
                {{ sectionCompletionSummary.totalSections }} Abschnitten vollständig ·
                {{ sectionCompletionSummary.totalMissingFindings }} fehlende Pflichtbefunde ·
                {{ sectionCompletionSummary.totalMissingClassifications }} fehlende
                Pflicht-Klassifikationen
              </div>
              <div
                v-if="!sectionCompletionSummary.incompleteSections.length"
                class="small text-success"
              >
                Keine fehlenden Pflichtbefunde oder Pflicht-Klassifikationen im aktuellen Entwurf.
              </div>
              <ul v-else class="small mb-0 ps-3">
                <li
                  v-for="section in sectionCompletionSummary.incompleteSections"
                  :key="section.name"
                >
                  <strong>{{ section.title }}</strong>
                  <span v-if="section.missingFindings.length">
                    · Befunde fehlen: {{ section.missingFindings.join(', ') }}
                  </span>
                  <span v-if="section.missingClassifications.length">
                    · Klassifikationen fehlen:
                    {{ section.missingClassifications.join(', ') }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <aside class="report-preview-panel">
            <div class="report-preview-card">
              <div class="report-preview-toolbar">
                <div>
                  <div class="small text-uppercase text-muted fw-semibold tracking-label">
                    Vorschau
                  </div>
                  <h6 class="mb-0">{{ selectedTemplateDisplayName }}</h6>
                </div>
                <span class="report-status-pill compact" :class="canSave ? 'is-draft' : 'is-muted'">
                  {{ reportWordCount }} Wörter
                </span>
              </div>

              <div class="report-preview-meta">
                <div>
                  <span>Patient</span>
                  <strong>{{ reportPatientLabel }}</strong>
                </div>
                <div>
                  <span>Untersuchung</span>
                  <strong>{{ selectedExaminationDisplayName || 'Nicht gewählt' }}</strong>
                </div>
              </div>

              <details class="report-technical-details">
                <summary>Technische Berichtsdetails</summary>
                <div>
                  <span>Berichtsreferenz</span>
                  <strong>{{ flow.activeReportId || 'Noch nicht vergeben' }}</strong>
                </div>
              </details>

              <div class="report-preview-sheet">
                <pre>{{ renderedReportPreview }}</pre>
              </div>

              <div class="report-preview-footer">
                <button
                  class="btn btn-outline-primary"
                  :disabled="loading || !canSave"
                  @click="saveReportSubmission('draft')"
                >
                  <span
                    v-if="loading && pendingSaveStatus === 'draft'"
                    class="spinner-border spinner-border-sm me-1"
                  />
                  Entwurf speichern
                </button>
                <button
                  class="btn btn-success"
                  :disabled="loading || !canSave"
                  @click="saveReportSubmission('final')"
                >
                  <span
                    v-if="loading && pendingSaveStatus === 'final'"
                    class="spinner-border spinner-border-sm me-1"
                  />
                  Final speichern
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <div v-if="saveWarnings.length" class="card shadow-sm">
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

    <details v-if="isDebug" class="card shadow-sm">
      <summary class="card-header">
        <div class="d-flex justify-content-between align-items-center gap-2">
          <span class="fw-semibold">Technische Details</span>
          <small class="text-muted">Metadaten und Payload</small>
        </div>
      </summary>
      <div class="card-body d-flex flex-column gap-3">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Aktive Report-ID</label>
            <input class="form-control" :value="flow.activeReportId ?? ''" readonly />
          </div>
          <div class="col-md-4">
            <label class="form-label">Berichtsversion</label>
            <input class="form-control" :value="currentReportVersion ?? ''" readonly />
          </div>
          <div class="col-md-4">
            <label class="form-label">Letzter Speicherstatus</label>
            <input class="form-control" :value="lastSaveStatus ?? ''" readonly />
          </div>
        </div>
        <div class="small text-muted">
          Entwurf:
          {{
            currentRuntimeDraft?.hydratedFrom === 'session_storage' ||
            currentRuntimeDraft?.hydratedFrom === 'draft_api'
              ? 'wiederhergestellt'
              : currentRuntimeDraft
                ? 'initialisiert'
                : 'leer'
          }}
          · Persistenz: {{ flow.draftPersistenceStatus }}
          <span v-if="flow.lastPersistedDraftAt">
            · Gespeichert: {{ new Date(flow.lastPersistedDraftAt).toLocaleTimeString('de-DE') }}
          </span>
        </div>
        <div v-if="flow.draftPersistenceError" class="alert alert-warning py-2 mb-0">
          {{ flow.draftPersistenceError }}
        </div>
        <div>
          <div class="small text-muted mb-1">Entwurfs-Befunde</div>
          <pre class="small mb-0 bg-light p-2 rounded">{{ runtimeFindingsPreview }}</pre>
        </div>
        <div>
          <div class="small text-muted mb-1">Indikationen</div>
          <pre class="small mb-0 bg-light p-2 rounded">{{ normalizedIndicationsPreview }}</pre>
        </div>
        <div>
          <div class="small text-muted mb-1">Abschnitts-Entwürfe</div>
          <pre class="small mb-0 bg-light p-2 rounded">{{ sectionDraftPreview }}</pre>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axiosInstance, { dtypesApi, r } from '@/api/axiosInstance'
import { findingsApi } from '@/api/findingsApi'
import {
  getFindingDisplayName,
  mergeFindingClassifications,
  type Finding
} from '@/api/findings.contract'
import { describeReportTemplateTitle, getReportTemplateDisplayName } from '@/api/reportTemplatesApi'
import { fetchExaminationReportingContext } from '@/api/knowledgeBaseGraphApi'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue'
import ReportArtifactsPanel from '@/components/Reporting/ReportArtifactsPanel.vue'
import { useDebug } from '@/composables/useDebug'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useTerminologyStore } from '@/stores/terminologyStore'
import { endpoints } from '@/types/api/endpoints'
import type {
  ReportSubmissionStatus,
  SaveReportSubmissionRequest,
  SaveReportSubmissionResponse
} from '@/types/api/reportSubmission'
import { formatDateOnly } from '@/components/AssistedReporting/reportSubmissionUtils'
import { usePatientStore } from '@/stores/patientStore'
import type {
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateSectionDraft
} from '@/types/reportTemplate'
import {
  getCoreConceptLocalizedName,
  type CoreConceptBase,
  type CoreConceptCollection
} from '@/types/coreConcepts'
import { reportingApiError, reportingApiErrorMessage } from './reportingError'
import {
  requireResolvedReportingExamination,
  resolveReportingExamination
} from './reportingExaminationResolution'
import {
  normalizeReportingIndicationOptions,
  type ReportingIndicationChoiceOption,
  type ReportingIndicationOption
} from './reportingIndicationContract'

type PatientExaminationReportListItem = {
  id: number
  status: string
  version: number
  templateName?: string
  updatedAt?: string
  renderedText?: string
}

type EditorContext = {
  generation: number
  patientExaminationId: number
  selectedExaminationId: number | null
  bundleKey: string
}

const flow = useReportingFlowStore()
const terminology = useTerminologyStore()
const patientStore = usePatientStore()
const examinationStore = useExaminationStore()
const route = useRoute()
const { isDebug } = useDebug()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const saveWarnings = ref<string[]>([])
const lastSaveStatus = ref<ReportSubmissionStatus | null>(null)
const pendingSaveStatus = ref<ReportSubmissionStatus | null>(null)
const currentReportVersion = ref<number | null>(null)
const persistedArtifacts = ref<SaveReportSubmissionResponse['persistedArtifacts']>(null)
const historyContext = ref<Record<string, unknown> | null>(null)
const manuallyEditedReportText = ref('')
const reportTextManuallyEdited = ref(false)
const findingCatalog = ref<Finding[]>([])
const findingCatalogError = ref<string | null>(null)
const coreConcepts = ref<CoreConceptCollection | null>(null)
const coreConceptsError = ref<string | null>(null)
const indicationOptions = ref<ReportingIndicationOption[]>([])
const indicationOptionsLoading = ref(false)
const indicationOptionsError = ref<string | null>(null)

const {
  moduleName: selectedKbModule,
  selectedTemplateName,
  selectedTemplate,
  templateOptions,
  sectionBlocks,
  loading: templateLoading,
  errorMessage: templateErrorMessage,
  applyTemplateOptions,
  selectTemplateByName,
  setModuleName,
  setRequestContext
} = useReportTemplates({
  initialModuleName: terminology.activeBundle ? terminology.activeModuleName : '',
  initialTemplateName: flow.selectedTemplateName,
  language: computed(() => flow.selectedReportLanguage)
})

const selectedExaminationResolution = computed(() =>
  resolveReportingExamination({
    catalog: examinationStore.examinationsDropdown,
    selectedExaminationId: flow.selectedExaminationId,
    examinationName: flow.currentRuntimeDraft?.payload.examination
  })
)
const selectedExamination = computed(() =>
  selectedExaminationResolution.value.status === 'resolved'
    ? selectedExaminationResolution.value.examination
    : null
)
const resolvedSelectedExaminationId = computed(
  () => selectedExamination.value?.id ?? flow.selectedExaminationId
)
const selectedExaminationName = computed(() => selectedExamination.value?.name || null)
const selectedExaminationDisplayName = computed(
  () => selectedExamination.value?.displayName || selectedExaminationName.value || null
)
const selectedPatient = computed(() =>
  flow.selectedPatientId ? patientStore.getPatientById(flow.selectedPatientId) : null
)
const selectedTemplateDisplayName = computed(() => {
  if (!selectedTemplateName.value) return 'Ohne Berichtsvorlage'
  return selectedTemplate.value
    ? getReportTemplateDisplayName(selectedTemplate.value, flow.selectedReportLanguage)
    : describeReportTemplateTitle(selectedTemplateName.value)
})

const templateStatusMessage = ref<string | null>(null)
let editorContextGeneration = 0
let reportSaveGeneration = 0

function captureEditorContext(): EditorContext | null {
  if (!flow.patientExaminationId) return null
  return {
    generation: editorContextGeneration,
    patientExaminationId: flow.patientExaminationId,
    selectedExaminationId: resolvedSelectedExaminationId.value,
    bundleKey: terminology.activeBundleKey
  }
}

function isEditorContextCurrent(context?: EditorContext): boolean {
  return (
    !context ||
    (context.generation === editorContextGeneration &&
      context.patientExaminationId === flow.patientExaminationId &&
      context.selectedExaminationId === resolvedSelectedExaminationId.value &&
      context.bundleKey === terminology.activeBundleKey)
  )
}

function isReportSaveOperationCurrent(context: EditorContext, generation: number): boolean {
  return generation === reportSaveGeneration && isEditorContextCurrent(context)
}

function requireReportSubmissionStatus(value: string): ReportSubmissionStatus {
  if (value === 'draft' || value === 'final') return value
  throw new Error(`Unbekannter Berichtstatus: ${value || '(leer)'}`)
}

function refreshTemplatesForCurrentContext() {
  const context = captureEditorContext()
  if (context) void refreshTemplatesForExamination(context)
}

function loadLatestReportForCurrentContext() {
  const context = captureEditorContext()
  if (context) void loadLatestReportMeta(context)
}

function loadIndicationsForCurrentContext() {
  const context = captureEditorContext()
  if (context) void loadIndicationCatalog(context)
}

const currentRuntimeDraft = computed(() => flow.currentRuntimeDraft)
const currentPayload = computed(() => currentRuntimeDraft.value?.payload || null)
const findingsByName = computed(
  () => new Map(findingCatalog.value.map((finding) => [finding.name, finding]))
)
const draftMatchesSelectedTemplate = computed(() => {
  const draft = currentRuntimeDraft.value
  const template = selectedTemplate.value
  const activeBundle = terminology.activeBundle
  if (!draft || !template || draft.templateName !== template.name) return false
  if (!activeBundle) return false
  if (draft.verificationStatus === 'unverified') return false
  if (draft.moduleName !== selectedKbModule.value) return false
  const draftKnowledgeBaseVersion =
    draft.templateIdentity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
  if (draft.moduleName !== activeBundle.moduleName) return false
  if (draftKnowledgeBaseVersion !== activeBundle.version) return false
  const currentTemplateHash = template.identity.templateHash || null
  const currentTemplateVersion = template.identity.templateVersion || null
  return !(
    (currentTemplateHash && draft.templateIdentity?.templateHash !== currentTemplateHash) ||
    (currentTemplateVersion && draft.templateIdentity?.templateVersion !== currentTemplateVersion)
  )
})
const canSave = computed(
  () =>
    !!flow.patientExaminationId &&
    !!selectedTemplateName.value &&
    draftMatchesSelectedTemplate.value
)
const renderedReportPreview = computed(() =>
  reportTextManuallyEdited.value ? manuallyEditedReportText.value : buildGeneratedReportText()
)
const reportWordCount = computed(() => {
  const words = renderedReportPreview.value
    .replace(/[#*-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return words.length
})
const reportPatientLabel = computed(() => {
  const patient = selectedPatient.value
  if (!patient) return 'Nicht gewählt'
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim()
  const details = [patient.gender, formatDateOnly(patient.dob)].filter(Boolean)
  return [name || 'Patient ausgewählt', ...details].join(' · ')
})

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

const indicationOptionsForEditor = computed<ReportingIndicationOption[]>(() => {
  const optionsById = new Map<number, ReportingIndicationOption>()

  const upsert = (option: ReportingIndicationOption) => {
    const existing = optionsById.get(option.id)
    if (!existing) {
      optionsById.set(option.id, {
        id: option.id,
        label: option.label || 'Bezeichnung nicht verfügbar',
        choices: option.choices.slice()
      })
      return
    }
    existing.label = existing.label || option.label || 'Bezeichnung nicht verfügbar'
    const choiceById = new Map<number, ReportingIndicationChoiceOption>()
    for (const choice of existing.choices) {
      choiceById.set(choice.id, choice)
    }
    for (const choice of option.choices) {
      choiceById.set(choice.id, {
        id: choice.id,
        label: choice.label || 'Bezeichnung nicht verfügbar'
      })
    }
    existing.choices = Array.from(choiceById.values())
  }

  for (const option of indicationOptions.value) {
    upsert({
      id: option.id,
      label: option.label,
      choices: option.choices.slice()
    })
  }

  for (const row of flow.indications) {
    const indicationId = row.examinationIndicationId
    if (indicationId == null) continue
    if (!optionsById.has(indicationId)) {
      upsert({
        id: indicationId,
        label: 'Gespeicherte Indikation nicht mehr verfügbar',
        choices: []
      })
    }
    const choiceId = row.indicationChoiceId
    if (choiceId == null) continue
    const option = optionsById.get(indicationId)
    if (!option) continue
    if (!option.choices.some((choice) => choice.id === choiceId)) {
      option.choices = [
        { id: choiceId, label: 'Gespeicherte Auswahl nicht mehr verfügbar' },
        ...option.choices
      ]
    }
  }

  return Array.from(optionsById.values())
    .map((option) => ({
      ...option,
      choices: option.choices
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }))
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }))
})

const sectionDraftPreview = computed(() => JSON.stringify(flow.templateSectionDrafts, null, 2))
const runtimeFindingsPreview = computed(() =>
  JSON.stringify(currentPayload.value?.patientFindings || [], null, 2)
)

const sectionCompletionSummary = computed(() => {
  const sections = sectionBlocks.value.map((section) => {
    const sectionFindings = getSectionDraftFindings(section.name)
    const missingFindings = section.findings
      .filter((definition) => definition.required)
      .filter(
        (definition) => !sectionFindings.some((entry) => entry.finding === definition.finding)
      )
      .map((definition) => getFindingLabel(definition.finding))

    const missingClassificationSet = new Set<string>()
    for (const definition of section.findings) {
      const matchingFindings = sectionFindings.filter(
        (entry) => entry.finding === definition.finding
      )
      if (!matchingFindings.length) continue

      for (const classification of definition.classifications.filter((entry) => entry.required)) {
        const presentInAnyFinding = matchingFindings.some((entry) =>
          entry.classificationChoices.some(
            (choice) => choice.classification === classification.classification
          )
        )
        if (!presentInAnyFinding) {
          missingClassificationSet.add(
            `${getFindingLabel(definition.finding)}: ${getClassificationLabel(
              definition.finding,
              classification.classification
            )}`
          )
        }
      }
    }

    const missingClassifications = Array.from(missingClassificationSet.values())

    return {
      name: section.name,
      title: section.title,
      missingFindings,
      missingClassifications,
      isComplete: !missingFindings.length && !missingClassifications.length
    }
  })

  return {
    totalSections: sections.length,
    completedSections: sections.filter((section) => section.isComplete).length,
    totalMissingFindings: sections.reduce(
      (sum, section) => sum + section.missingFindings.length,
      0
    ),
    totalMissingClassifications: sections.reduce(
      (sum, section) => sum + section.missingClassifications.length,
      0
    ),
    incompleteSections: sections.filter((section) => !section.isComplete)
  }
})

const missingRequiredCount = computed(
  () =>
    sectionCompletionSummary.value.totalMissingFindings +
    sectionCompletionSummary.value.totalMissingClassifications
)

watch(
  [selectedKbModule, selectedTemplateName, selectedTemplate],
  ([moduleName, templateName, template], [, previousTemplateName]) => {
    flow.setTemplateSelection({
      moduleName,
      templateName,
      templateIdentity: template?.identity || null
    })
    if (templateName && previousTemplateName && templateName !== previousTemplateName) {
      flow.clearTemplateSectionDrafts()
      resetRenderedReportText()
    }
  }
)

watch(
  () => flow.selectedKbModule,
  (moduleName) => {
    if (moduleName === selectedKbModule.value) return
    setModuleName(moduleName)
    void refreshTemplatesForExamination()
  }
)

watch(
  () => terminology.activeBundleKey,
  async () => {
    setModuleName(
      terminology.activeBundle ? terminology.activeModuleName : '',
      terminology.activeBundleKey
    )
    if (terminology.activeBundle) await refreshTemplatesForExamination()
  }
)

watch(selectedKbModule, () => {
  void refreshTemplatesForExamination()
})

function normalizePositiveId(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const id = Math.trunc(parsed)
  return id > 0 ? id : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function readListPayload(value: unknown): unknown[] {
  if (isUnknownArray(value)) return value
  const results = readRecord(value).results
  if (isUnknownArray(results)) return results
  throw new TypeError('Reporting list response must contain an array.')
}

function requireReportListItem(value: unknown): PatientExaminationReportListItem {
  const row = readRecord(value)
  const id = normalizePositiveId(row.id)
  const version = normalizePositiveId(row.version)
  if (id === null || version === null || typeof row.status !== 'string') {
    throw new Error('Die Berichtsliste enthält einen ungültigen Eintrag.')
  }
  return {
    id,
    version,
    status: row.status,
    ...(typeof row.templateName === 'string' ? { templateName: row.templateName } : {}),
    ...(typeof row.updatedAt === 'string' ? { updatedAt: row.updatedAt } : {}),
    ...(typeof row.renderedText === 'string' ? { renderedText: row.renderedText } : {})
  }
}

async function loadIndicationCatalog(context?: EditorContext) {
  const patientExaminationId = context?.patientExaminationId ?? flow.patientExaminationId
  const selectedExaminationId = context?.selectedExaminationId ?? flow.selectedExaminationId

  if (!patientExaminationId && !selectedExaminationId) {
    indicationOptions.value = []
    indicationOptionsError.value = null
    indicationOptionsLoading.value = false
    return
  }

  indicationOptionsLoading.value = true
  indicationOptionsError.value = null

  const indicationPayloads: unknown[] = []
  const loadErrors: string[] = []

  if (patientExaminationId) {
    try {
      const detailRes = await axiosInstance.get(
        r(endpoints.examination.patientExaminationDetail(patientExaminationId))
      )
      indicationPayloads.push(detailRes.data)
    } catch {
      loadErrors.push('patient-examination')
    }
  }

  if (selectedExaminationId) {
    try {
      const pathSuffix = patientExaminationId
        ? `examinations/${String(selectedExaminationId)}/indications/?patient_examination_id=${String(patientExaminationId)}`
        : `examinations/${String(selectedExaminationId)}/indications/`
      const indicationRes = await axiosInstance.get<unknown>(dtypesApi(pathSuffix))
      indicationPayloads.push(indicationRes.data)
    } catch {
      loadErrors.push('indication-catalog')
    }

    try {
      const examRes = await axiosInstance.get(
        r(`${endpoints.router.examinations}${String(selectedExaminationId)}/`)
      )
      indicationPayloads.push(examRes.data)
    } catch {
      loadErrors.push('examination-detail')
    }
  }

  if (selectedExaminationId && !normalizeReportingIndicationOptions(indicationPayloads).length) {
    try {
      const listRes = await axiosInstance.get<unknown>(r(endpoints.router.examinations))
      const rows = readListPayload(listRes.data)
      const selectedRow = rows.find(
        (entry) => normalizePositiveId(readRecord(entry).id) === selectedExaminationId
      )
      if (selectedRow) {
        indicationPayloads.push(selectedRow)
      }
    } catch {
      loadErrors.push('examination-list')
    }
  }

  if (!isEditorContextCurrent(context)) return
  indicationOptions.value = normalizeReportingIndicationOptions(indicationPayloads)
    .map((option) => ({
      ...option,
      choices: option.choices
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }))
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }))

  if (!indicationOptions.value.length && loadErrors.length) {
    indicationOptionsError.value =
      'Indikationsoptionen konnten aus der aktuellen Backend-Antwort nicht abgeleitet werden.'
  }

  indicationOptionsLoading.value = false
}

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function getSectionDraft(sectionName: string): ReportTemplateSectionDraft {
  return (
    flow.templateSectionDrafts[sectionName] ?? {
      note: '',
      includePatientData: false,
      includeExaminationData: false
    }
  )
}

function onSectionDraftNote(sectionName: string, note: string) {
  flow.setTemplateSectionDraft(sectionName, { note })
}

function onRenderedReportInput(value: string) {
  manuallyEditedReportText.value = value
  reportTextManuallyEdited.value = true
}

function resetRenderedReportText() {
  manuallyEditedReportText.value = ''
  reportTextManuallyEdited.value = false
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
    center:
      'center' in patient && typeof patient.center === 'string' ? patient.center || null : null
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
  const examinationName = selectedExaminationName.value
  if (!examinationName) return ''
  const label = localizedConceptLabel(coreConcepts.value?.examination, examinationName)
  const heading = flow.selectedReportLanguage === 'de' ? 'Untersuchung' : 'Examination'
  return `${heading}: ${label || selectedExaminationDisplayName.value || ''}`
}

function localizedConceptLabel(
  concepts: CoreConceptBase[] | undefined,
  conceptName: string
): string | null {
  const concept = concepts?.find((entry) => entry.name === conceptName)
  if (!concept) return null
  return getCoreConceptLocalizedName(concept, flow.selectedReportLanguage, concept.name)
}

function getFindingDefinition(findingName: string): Finding | null {
  return findingsByName.value.get(findingName) || null
}

function getFindingLabel(findingName: string): string {
  const localized = localizedConceptLabel(coreConcepts.value?.finding, findingName)
  if (localized) return localized
  const definition = getFindingDefinition(findingName)
  return definition ? getFindingDisplayName(definition) : findingName
}

function getClassificationLabel(findingName: string, classificationName: string): string {
  const localized = localizedConceptLabel(coreConcepts.value?.classification, classificationName)
  if (localized) return localized
  const definition = getFindingDefinition(findingName)
  const classification = mergeFindingClassifications(definition).find(
    (entry) => entry.name === classificationName
  )
  return classification?.displayName || classificationName
}

function getClassificationChoiceLabel(
  findingName: string,
  classificationName: string,
  choiceName: string
): string {
  const localized = localizedConceptLabel(coreConcepts.value?.classificationChoice, choiceName)
  if (localized) return localized
  const definition = getFindingDefinition(findingName)
  const classification = mergeFindingClassifications(definition).find(
    (entry) => entry.name === classificationName
  )
  const choice = classification?.choices.find((entry) => entry.name === choiceName)
  return choice?.displayName || choiceName
}

function getDescriptorLabel(descriptorName: string): string {
  const localized = localizedConceptLabel(
    coreConcepts.value?.classificationChoiceDescriptor,
    descriptorName
  )
  if (localized) return localized
  return descriptorName.replace(/_/g, ' ')
}

function formatDescriptorValue(descriptorName: string, value: unknown): string {
  const descriptor = coreConcepts.value?.classificationChoiceDescriptor.find(
    (entry) => entry.name === descriptorName
  )
  const unit = descriptor?.unit
    ? coreConcepts.value?.unit.find((entry) => entry.name === descriptor.unit)
    : null
  const abbreviation = unit?.abbreviation?.trim() || ''
  const label = getDescriptorLabel(descriptorName)
  const suffix =
    abbreviation && !label.toLocaleLowerCase('de').includes(abbreviation.toLocaleLowerCase('de'))
      ? ` ${abbreviation}`
      : ''
  return `${label}: ${String(value)}${suffix}`
}

function formatRuntimeFindingSummary(finding: ReportTemplateRuntimePatientFindingInput): string {
  const classifications = finding.classificationChoices
    .map((choice) => {
      const descriptorText = choice.descriptors.length
        ? ` (${choice.descriptors
            .map((descriptor) =>
              formatDescriptorValue(
                descriptor.classificationChoiceDescriptor,
                descriptor.descriptorValue
              )
            )
            .join(', ')})`
        : ''
      return `${getClassificationLabel(finding.finding, choice.classification)}: ${getClassificationChoiceLabel(
        finding.finding,
        choice.classification,
        choice.classificationChoice
      )}${descriptorText}`
    })
    .join(' · ')

  const findingLabel = getFindingLabel(finding.finding)
  return classifications ? `${findingLabel}: ${classifications}` : findingLabel
}

function getSectionDraftFindings(sectionName: string): ReportTemplateRuntimePatientFindingInput[] {
  const section = sectionBlocks.value.find((entry) => entry.name === sectionName)
  const payload = currentPayload.value
  if (!section || !payload) return []
  const allowedFindings = new Set(section.findings.map((finding) => finding.finding))
  return payload.patientFindings.filter((finding) => allowedFindings.has(finding.finding))
}

function getSectionPreview(sectionName: string) {
  const findings = getSectionDraftFindings(sectionName)
  return {
    findings,
    findingSummaries: findings.map(formatRuntimeFindingSummary)
  }
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

async function loadFindingCatalog(context?: EditorContext) {
  if (isEditorContextCurrent(context)) findingCatalogError.value = null
  const examinationId = context?.selectedExaminationId ?? flow.selectedExaminationId
  if (!examinationId) {
    if (!isEditorContextCurrent(context)) return
    findingCatalog.value = []
    return
  }
  try {
    const findings = await findingsApi.getExaminationFindings(examinationId)
    if (!isEditorContextCurrent(context)) return
    findingCatalog.value = findings
  } catch {
    if (!isEditorContextCurrent(context)) return
    findingCatalog.value = []
    findingCatalogError.value =
      'Die deutschen Befundbezeichnungen konnten nicht geladen werden. Bitte erneut versuchen.'
  }
}

async function refreshTemplatesForExamination(context?: EditorContext) {
  if (isEditorContextCurrent(context)) {
    templateStatusMessage.value = null
    coreConceptsError.value = null
  }
  const bundle = terminology.activeBundle
  if (!bundle || !selectedKbModule.value) {
    if (isEditorContextCurrent(context)) {
      coreConcepts.value = null
      applyTemplateOptions([])
      templateStatusMessage.value =
        'Vorlagen werden angeboten, sobald eine Terminologie aktiviert wurde.'
    }
    return
  }
  const examName = selectedExaminationName.value
  if (!examName) return
  try {
    const projection = await fetchExaminationReportingContext(
      bundle.moduleName,
      bundle.version,
      examName
    )
    if (!isEditorContextCurrent(context)) return
    coreConcepts.value = projection.concepts
    applyTemplateOptions(projection.reportTemplates)
    templateStatusMessage.value = projection.reportTemplates.length
      ? `${String(projection.reportTemplates.length)} Vorlage(n) für "${examName}" geladen.`
      : `Keine Vorlagen für "${examName}" gefunden.`
  } catch (error: unknown) {
    if (!isEditorContextCurrent(context)) return
    coreConcepts.value = null
    applyTemplateOptions([])
    coreConceptsError.value = reportingApiErrorMessage(
      error,
      'Der versionierte Reporting-Kontext konnte nicht geladen werden.'
    )
  }
}

function buildDraftFindingsPayload(): SaveReportSubmissionRequest['findings'] {
  const payload = currentPayload.value
  if (!payload) return []
  return payload.patientFindings.map((finding) => ({
    finding: finding.finding,
    classifications: finding.classificationChoices.map((choice) => ({
      classification: choice.classification,
      classificationChoice: choice.classificationChoice
    })),
    interventions: []
  }))
}

function buildEditorPayload(): Record<string, unknown> {
  return {
    source: 'reporting_route_report_editor',
    routePatientExaminationId: route.params.patient_examination_id,
    indications: normalizedIndications.value,
    template: {
      moduleName: selectedKbModule.value,
      templateName: selectedTemplateName.value,
      sections: sectionBlocks.value.map((section) => ({
        name: section.name,
        title: section.title,
        subtitle: section.subtitle,
        draft: getSectionDraft(section.name),
        findings: getSectionPreview(section.name).findings
      }))
    },
    runtimeDraftPayload: currentPayload.value,
    reportLanguage: flow.selectedReportLanguage,
    reportTextMode: reportTextManuallyEdited.value ? 'manual' : 'generated',
    savedAt: new Date().toISOString()
  }
}

function buildGeneratedReportText(): string {
  const fallbackAnonymizedText = flow.mediaPreload?.latestReport?.anonymizedText?.trim() || ''
  const lines: string[] = []
  lines.push(`# ${selectedTemplateDisplayName.value}`)
  let hasStructuredContent = false
  for (const section of sectionBlocks.value) {
    const draft = getSectionDraft(section.name)
    const sectionPreview = getSectionPreview(section.name)
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
    if (sectionPreview.findingSummaries.length) {
      sectionLines.push(...sectionPreview.findingSummaries.map((summary) => `- ${summary}`))
    }
    if (sectionLines.length) hasStructuredContent = true

    lines.push(`## ${section.title}`)
    if (sectionLines.length) lines.push(sectionLines.join('\n'))
  }
  if (!hasStructuredContent && fallbackAnonymizedText) {
    return fallbackAnonymizedText
  }
  return lines.join('\n\n')
}

async function loadLatestReportMeta(context?: EditorContext) {
  const patientExaminationId = context?.patientExaminationId ?? flow.patientExaminationId
  if (!patientExaminationId) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }
  loading.value = true
  clearMessages()
  try {
    const res = await axiosInstance.get<unknown>(
      r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId))
    )
    if (!isEditorContextCurrent(context)) return
    const items = readListPayload(res.data).map(requireReportListItem)
    if (!items.length) {
      flow.setActiveReportId(null)
      currentReportVersion.value = null
      successMessage.value =
        'Kein bestehender Bericht gefunden. Das nächste Speichern erstellt einen neuen Bericht.'
      return
    }
    const latest = items[0]
    flow.setActiveReportId(latest.id)
    currentReportVersion.value = latest.version
    if (latest.templateName) {
      await selectTemplateByName(latest.templateName)
      if (!isEditorContextCurrent(context)) return
    }
    if (typeof latest.renderedText === 'string') {
      manuallyEditedReportText.value = latest.renderedText
      reportTextManuallyEdited.value = true
    }
    successMessage.value = `Der Bericht wurde geladen (Version ${String(latest.version)}).`
  } catch (e: unknown) {
    if (!isEditorContextCurrent(context)) return
    errorMessage.value = reportingApiErrorMessage(e, 'Fehler beim Laden bestehender Berichte.')
  } finally {
    if (isEditorContextCurrent(context)) loading.value = false
  }
}

function resolveSaveSubmissionContext(): (EditorContext & { templateName: string }) | null {
  const context = captureEditorContext()
  if (!context) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return null
  }
  const templateName = selectedTemplateName.value
  if (!canSave.value || !templateName) {
    errorMessage.value =
      'Speichern ist erst mit einer verifizierten, zur aktiven Terminologie passenden Vorlage möglich.'
    return null
  }
  return { ...context, templateName }
}

function buildSaveSubmissionPayload(
  status: ReportSubmissionStatus,
  context: EditorContext & { templateName: string },
  findings: SaveReportSubmissionRequest['findings']
): SaveReportSubmissionRequest {
  return {
    ...(flow.activeReportId ? { reportId: flow.activeReportId } : {}),
    ...(currentReportVersion.value ? { expectedVersion: currentReportVersion.value } : {}),
    patientExaminationId: context.patientExaminationId,
    templateName: context.templateName,
    templateVersion: currentRuntimeDraft.value?.templateIdentity?.templateVersion || '',
    templateHash: currentRuntimeDraft.value?.templateIdentity?.templateHash || '',
    status,
    editorPayload: buildEditorPayload(),
    renderedText: renderedReportPreview.value,
    patientData: buildPatientDataPayload(),
    indications: normalizedIndications.value,
    findings
  }
}

async function saveReportSubmission(status: ReportSubmissionStatus) {
  const context = resolveSaveSubmissionContext()
  if (!context) return
  const operationGeneration = ++reportSaveGeneration

  pendingSaveStatus.value = status
  loading.value = true
  clearMessages()
  flow.setSavingFinalReport(status === 'final')

  try {
    await ensurePatientsLoaded()
    if (!isReportSaveOperationCurrent(context, operationGeneration)) return
    const findings = buildDraftFindingsPayload()

    const payload = buildSaveSubmissionPayload(status, context, findings)

    const res = await axiosInstance.post<SaveReportSubmissionResponse>(
      r(endpoints.report.saveReportSubmission),
      payload
    )
    if (!isReportSaveOperationCurrent(context, operationGeneration)) return
    const data = res.data

    flow.setActiveReportId(data.report.id)
    currentReportVersion.value = data.report.version
    lastSaveStatus.value = requireReportSubmissionStatus(data.report.status)
    saveWarnings.value = Array.isArray(data.warnings) ? data.warnings : []
    historyContext.value = data.historyContext || null
    persistedArtifacts.value = data.persistedArtifacts || null

    successMessage.value = data.created
      ? `Der Bericht wurde erstellt (Version ${String(data.report.version)}).`
      : `Der Bericht wurde aktualisiert (Version ${String(data.report.version)}).`
  } catch (e: unknown) {
    if (!isReportSaveOperationCurrent(context, operationGeneration)) return
    const versionConflict = reportingApiError(e).response?.data?.expectedVersion
    if (typeof versionConflict === 'string') {
      errorMessage.value = `Versionskonflikt: ${versionConflict}`
    } else {
      errorMessage.value = reportingApiErrorMessage(e, 'Fehler beim Speichern des Berichts.')
    }
  } finally {
    if (operationGeneration === reportSaveGeneration) {
      flow.setSavingFinalReport(false)
      loading.value = false
      pendingSaveStatus.value = null
    }
  }
}

let initializedContextKey: string | null = null
let initializationInFlightKey: string | null = null

async function initializeEditorContext() {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.'
    return
  }
  if (!flow.currentRuntimeDraft) {
    errorMessage.value =
      'Der Befundentwurf wird vorbereitet. Diese Ansicht aktualisiert sich automatisch.'
    return
  }
  const generation = editorContextGeneration
  const patientExaminationId = flow.patientExaminationId
  const bundleKey = terminology.activeBundleKey
  const contextKey = `${String(patientExaminationId)}:${flow.currentRuntimeDraft.payload.examination}:${bundleKey}`
  if (initializedContextKey === contextKey || initializationInFlightKey === contextKey) return
  initializationInFlightKey = contextKey
  errorMessage.value = null
  let context: EditorContext | undefined
  try {
    await Promise.all([ensurePatientsLoaded(), ensureExaminationsLoaded()])
    if (
      generation !== editorContextGeneration ||
      patientExaminationId !== flow.patientExaminationId ||
      bundleKey !== terminology.activeBundleKey
    ) {
      return
    }
    requireResolvedReportingExamination({
      catalog: examinationStore.examinationsDropdown,
      selectedExaminationId: flow.selectedExaminationId,
      examinationName: flow.currentRuntimeDraft.payload.examination
    })
    context = captureEditorContext() || undefined
    if (!context) return
    await Promise.all([loadFindingCatalog(context), refreshTemplatesForExamination(context)])
    if (!isEditorContextCurrent(context)) return
    await loadIndicationCatalog(context)
    if (!isEditorContextCurrent(context)) return
    await loadLatestReportMeta(context)
    if (isEditorContextCurrent(context)) initializedContextKey = contextKey
  } catch (error: unknown) {
    if (!isEditorContextCurrent(context)) return
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Der Berichtseditor konnte nicht vollständig vorbereitet werden. Bitte erneut versuchen.'
    )
  } finally {
    if (initializationInFlightKey === contextKey) initializationInFlightKey = null
  }
}

watch(
  [
    () => flow.patientExaminationId,
    () => flow.selectedExaminationId,
    resolvedSelectedExaminationId,
    () => Boolean(flow.currentRuntimeDraft),
    () => terminology.activeBundleKey
  ],
  () => {
    editorContextGeneration += 1
    reportSaveGeneration += 1
    flow.setSavingFinalReport(false)
    loading.value = false
    pendingSaveStatus.value = null
    initializedContextKey = null
    setRequestContext(
      `${terminology.activeBundleKey}:${String(flow.patientExaminationId || '')}:${String(flow.selectedExaminationId || '')}`
    )
    void initializeEditorContext()
  },
  { immediate: true }
)

onMounted(async () => {
  await initializeEditorContext()
})
</script>

<style scoped>
.report-workspace-surface {
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(20, 31, 48, 0.06);
  background: #fff;
}

.report-workspace-body {
  padding: 1rem;
}

.report-editor-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(20, 31, 48, 0.06);
}

.tracking-label {
  letter-spacing: 0.08em;
}

.report-workspace-title {
  min-width: 0;
}

.report-editor-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.report-editor-facts span {
  max-width: min(100%, 22rem);
  padding: 0.25rem 0.55rem;
  border: 1px solid #d9e0ea;
  border-radius: 999px;
  color: #334155;
  background: #f8fafc;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-workspace-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.report-readiness-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.readiness-item {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.readiness-item.is-primary {
  color: #fff;
  background: #172234;
  border-color: #172234;
}

.readiness-item.has-warning {
  color: #842029;
  background: #f8d7da;
  border-color: #f5c2c7;
}

.readiness-item span {
  display: block;
  margin-bottom: 0.2rem;
  color: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.78;
}

.readiness-item strong {
  display: block;
  overflow-wrap: anywhere;
  line-height: 1.25;
}

.report-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
  gap: 1.25rem;
  align-items: start;
}

.report-editor-main {
  min-width: 0;
}

.section-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-status-row span {
  padding: 0.25rem 0.55rem;
  border: 1px solid #d9e0ea;
  border-radius: 999px;
  color: #334155;
  background: #f8fafc;
  font-size: 0.78rem;
  font-weight: 700;
}

.section-preview-box {
  padding: 0.75rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.report-text-editor {
  min-height: 28rem;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.55;
}

.section-toggle-row {
  padding: 0.75rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #fff;
}

.report-preview-panel {
  position: sticky;
  top: 1rem;
}

.report-preview-card {
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  background: #f7f9fc;
  box-shadow: 0 10px 24px rgba(20, 35, 60, 0.08);
  overflow: hidden;
}

.report-preview-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.75rem;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
}

.report-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}

.report-status-pill.compact {
  min-height: 1.75rem;
}

.report-status-pill.is-draft {
  color: #664d03;
  background: #fff3cd;
  border-color: #ffecb5;
}

.report-status-pill.is-final {
  color: #0f5132;
  background: #d1e7dd;
  border-color: #badbcc;
}

.report-status-pill.is-muted {
  color: #495057;
  background: #e9ecef;
  border-color: #dee2e6;
}

.report-preview-meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #e9ecef;
}

.report-preview-meta div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.8rem;
}

.report-preview-meta span {
  color: #6c757d;
}

.report-preview-meta strong {
  min-width: 0;
  text-align: right;
  color: #212529;
}

.report-technical-details {
  padding: 0 1rem 0.875rem;
  border-bottom: 1px solid #e9ecef;
  color: #6c757d;
  font-size: 0.8rem;
}

.report-technical-details summary {
  width: fit-content;
  cursor: pointer;
}

.report-technical-details div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.report-technical-details strong {
  color: #212529;
}

.report-preview-sheet {
  max-height: min(68vh, 780px);
  overflow: auto;
  margin: 1rem;
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #e3e7ee;
  border-radius: 6px;
}

.report-preview-sheet pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2933;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.95rem;
  line-height: 1.65;
}

.report-preview-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 0 1rem 1rem;
}

.report-preview-footer .btn {
  margin-bottom: 0;
}

@media (max-width: 1199.98px) {
  .report-editor-layout {
    grid-template-columns: 1fr;
  }

  .report-preview-panel {
    position: static;
    order: -1;
  }
}

@media (max-width: 575.98px) {
  .report-editor-toolbar,
  .report-workspace-actions,
  .report-preview-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .report-readiness-strip {
    grid-template-columns: 1fr;
  }

  .report-editor-facts span {
    max-width: 100%;
    white-space: normal;
  }

  .report-preview-footer {
    grid-template-columns: 1fr;
  }
}
</style>
