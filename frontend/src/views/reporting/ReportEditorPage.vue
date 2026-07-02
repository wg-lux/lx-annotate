<template>
  <div class="d-flex flex-column gap-3">
    <section class="report-editor-toolbar" aria-label="Berichtseditor">
      <div class="report-workspace-title">
        <div class="small text-uppercase text-muted fw-semibold tracking-label">Bericht</div>
        <h5 class="mb-2">Bericht schreiben</h5>
        <div class="report-editor-facts">
          <span>{{ reportPatientLabel }}</span>
          <span>{{ selectedExaminationDisplayName || 'Untersuchung fehlt' }}</span>
          <span>{{ selectedTemplateName || 'Vorlage fehlt' }}</span>
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
                      :value="selectedKbModule"
                      :disabled="loading || templateLoading"
                      @change="onModuleChange(($event.target as HTMLInputElement).value)"
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
                      :disabled="loading || templateLoading || !templateOptions.length"
                      @change="
                        onTemplateSelectionChange(($event.target as HTMLSelectElement).value)
                      "
                    >
                      <option value="" disabled>
                        {{ templateLoading ? 'Vorlagen laden...' : 'Vorlage wählen' }}
                      </option>
                      <option
                        v-for="template in templateOptions"
                        :key="template.name"
                        :value="template.name"
                      >
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
                    Vorlagen laden
                  </button>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    :disabled="loading"
                    @click="loadLatestReportMeta"
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
              </template>
            </MedicalBlock>

            <div v-if="!sectionBlocks.length" class="alert alert-info">
              Bitte eine Vorlage auswählen.
            </div>
            <div v-else-if="!currentRuntimeDraft || !currentPayload" class="alert alert-warning">
              Kein aktiver Entwurf geladen.
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
              @refresh-options="loadIndicationCatalog"
            />

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
                  <h6 class="mb-0">{{ selectedTemplateName || 'Unbenannte Vorlage' }}</h6>
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
                <div>
                  <span>Bericht-ID</span>
                  <strong>{{ flow.activeReportId ? `#${flow.activeReportId}` : 'Neu' }}</strong>
                </div>
              </div>

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
import axiosInstance, { r } from '@/api/axiosInstance'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue'
import ReportArtifactsPanel from '@/components/Reporting/ReportArtifactsPanel.vue'
import { useDebug } from '@/composables/useDebug'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
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

type PatientExaminationReportListItem = {
  id: number
  status: string
  version: number
  templateName?: string
  updatedAt?: string
}

type IndicationChoiceOption = {
  id: number
  label: string
}

type IndicationOption = {
  id: number
  label: string
  choices: IndicationChoiceOption[]
}

const flow = useReportingFlowStore()
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
const indicationOptions = ref<IndicationOption[]>([])
const indicationOptionsLoading = ref(false)
const indicationOptionsError = ref<string | null>(null)

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
    examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) ||
    null
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
const currentRuntimeDraft = computed(() => flow.currentRuntimeDraft)
const currentPayload = computed(() => currentRuntimeDraft.value?.payload || null)
const renderedReportPreview = computed(() => buildRenderedText())
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
  return [name || `Patient #${patient.id}`, ...details].join(' · ')
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

const indicationOptionsForEditor = computed<IndicationOption[]>(() => {
  const optionsById = new Map<number, IndicationOption>()

  const upsert = (option: IndicationOption) => {
    const existing = optionsById.get(option.id)
    if (!existing) {
      optionsById.set(option.id, {
        id: option.id,
        label: option.label || `Indikation #${option.id}`,
        choices: option.choices.slice()
      })
      return
    }
    existing.label = existing.label || option.label || `Indikation #${option.id}`
    const choiceById = new Map<number, IndicationChoiceOption>()
    for (const choice of existing.choices) {
      choiceById.set(choice.id, choice)
    }
    for (const choice of option.choices) {
      choiceById.set(choice.id, {
        id: choice.id,
        label: choice.label || `Auswahl #${choice.id}`
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
        label: `Unbekannte Indikation (#${indicationId})`,
        choices: []
      })
    }
    const choiceId = row.indicationChoiceId
    if (choiceId == null) continue
    const option = optionsById.get(indicationId)
    if (!option) continue
    if (!option.choices.some((choice) => choice.id === choiceId)) {
      option.choices = [
        { id: choiceId, label: `Unbekannte Auswahl (#${choiceId})` },
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

const sectionDraftPreview = computed(() =>
  JSON.stringify(flow.templateSectionDrafts || {}, null, 2)
)
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
      .map((definition) => definition.finding)

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
          missingClassificationSet.add(`${definition.finding}: ${classification.classification}`)
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

watch(
  [() => flow.patientExaminationId, () => flow.selectedExaminationId],
  (
    [nextPatientExaminationId, nextExaminationId],
    [previousPatientExaminationId, previousExaminationId]
  ) => {
    if (
      nextPatientExaminationId === previousPatientExaminationId &&
      nextExaminationId === previousExaminationId
    ) {
      return
    }
    void loadIndicationCatalog()
  }
)

function normalizePositiveId(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const id = Math.trunc(parsed)
  return id > 0 ? id : null
}

function normalizeDisplayLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

function normalizeChoiceOptions(value: unknown): IndicationChoiceOption[] {
  if (!Array.isArray(value)) return []
  const choiceById = new Map<number, IndicationChoiceOption>()
  for (const entry of value) {
    if (entry && typeof entry === 'object') {
      const row = entry as Record<string, unknown>
      const id = normalizePositiveId(
        row.id ??
          row.choiceId ??
          row.choice_id ??
          row.indicationChoiceId ??
          row.indication_choice_id
      )
      if (id == null) continue
      const label =
        normalizeDisplayLabel(
          row.label ?? row.name ?? row.displayName ?? row.name_de ?? row.nameDe
        ) || `Auswahl #${id}`
      choiceById.set(id, { id, label })
      continue
    }
    const id = normalizePositiveId(entry)
    if (id == null) continue
    choiceById.set(id, { id, label: `Auswahl #${id}` })
  }
  return Array.from(choiceById.values())
}

function normalizeChoiceOptionsFromClassifications(value: unknown): IndicationChoiceOption[] {
  if (!Array.isArray(value)) return []
  const aggregated: IndicationChoiceOption[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    aggregated.push(...normalizeChoiceOptions(row.choices))
  }
  const deduped = new Map<number, IndicationChoiceOption>()
  for (const choice of aggregated) {
    deduped.set(choice.id, choice)
  }
  return Array.from(deduped.values())
}

function normalizeIndicationOptions(value: unknown): IndicationOption[] {
  if (!Array.isArray(value)) return []
  const indicationById = new Map<number, IndicationOption>()
  for (const entry of value) {
    if (entry && typeof entry === 'object') {
      const row = entry as Record<string, unknown>
      const id = normalizePositiveId(
        row.id ??
          row.indicationId ??
          row.indication_id ??
          row.examinationIndicationId ??
          row.examination_indication_id
      )
      if (id == null) continue
      const label =
        normalizeDisplayLabel(
          row.label ?? row.name ?? row.displayName ?? row.name_de ?? row.nameDe
        ) || `Indikation #${id}`
      const choices = [
        ...normalizeChoiceOptions(row.choices),
        ...normalizeChoiceOptions(row.indicationChoices),
        ...normalizeChoiceOptions(row.indication_choices),
        ...normalizeChoiceOptionsFromClassifications(row.classifications)
      ]
      const choiceById = new Map<number, IndicationChoiceOption>()
      for (const choice of choices) {
        choiceById.set(choice.id, choice)
      }
      indicationById.set(id, {
        id,
        label,
        choices: Array.from(choiceById.values())
      })
      continue
    }
    const id = normalizePositiveId(entry)
    if (id == null) continue
    indicationById.set(id, {
      id,
      label: `Indikation #${id}`,
      choices: []
    })
  }
  return Array.from(indicationById.values())
}

function upsertIndicationOption(
  optionsById: Map<number, IndicationOption>,
  option: IndicationOption
) {
  const existing = optionsById.get(option.id)
  if (!existing) {
    optionsById.set(option.id, {
      id: option.id,
      label: option.label || `Indikation #${option.id}`,
      choices: option.choices.slice()
    })
    return
  }

  if (!existing.label || existing.label.startsWith('Unbekannte')) {
    existing.label = option.label || existing.label || `Indikation #${option.id}`
  }

  const choiceById = new Map<number, IndicationChoiceOption>()
  for (const choice of existing.choices) {
    choiceById.set(choice.id, choice)
  }
  for (const choice of option.choices) {
    choiceById.set(choice.id, {
      id: choice.id,
      label: choice.label || `Auswahl #${choice.id}`
    })
  }
  existing.choices = Array.from(choiceById.values())
}

function extractOptionsFromPayload(payload: unknown, optionsById: Map<number, IndicationOption>) {
  if (!payload || typeof payload !== 'object') return
  const data = payload as Record<string, unknown>
  const nestedExamination =
    data.examination && typeof data.examination === 'object'
      ? (data.examination as Record<string, unknown>)
      : null

  const indicationCandidates: unknown[] = [
    data.indications,
    data.examinationIndications,
    data.examination_indications,
    data.examination_indication_options,
    nestedExamination?.indications,
    nestedExamination?.examinationIndications,
    nestedExamination?.examination_indications,
    nestedExamination?.examination_indication_options
  ]

  for (const candidate of indicationCandidates) {
    for (const option of normalizeIndicationOptions(candidate)) {
      upsertIndicationOption(optionsById, option)
    }
  }

  const topLevelChoiceCandidates: unknown[] = [
    data.indicationChoices,
    data.indication_choices,
    nestedExamination?.indicationChoices,
    nestedExamination?.indication_choices
  ]

  for (const candidate of topLevelChoiceCandidates) {
    if (Array.isArray(candidate)) {
      for (const row of candidate) {
        if (!row || typeof row !== 'object') continue
        const value = row as Record<string, unknown>
        const indicationId = normalizePositiveId(
          value.examinationIndicationId ??
            value.examination_indication_id ??
            value.indicationId ??
            value.indication_id
        )
        const choiceId = normalizePositiveId(
          value.id ??
            value.choiceId ??
            value.choice_id ??
            value.indicationChoiceId ??
            value.indication_choice_id
        )
        if (indicationId == null || choiceId == null) continue
        const label =
          normalizeDisplayLabel(
            value.label ?? value.name ?? value.displayName ?? value.name_de ?? value.nameDe
          ) || `Auswahl #${choiceId}`
        const option = optionsById.get(indicationId)
        if (!option) continue
        if (!option.choices.some((choice) => choice.id === choiceId)) {
          option.choices.push({ id: choiceId, label })
        }
      }
      continue
    }

    if (!candidate || typeof candidate !== 'object') continue
    for (const [key, choices] of Object.entries(candidate as Record<string, unknown>)) {
      const indicationId = normalizePositiveId(key)
      if (indicationId == null) continue
      const option = optionsById.get(indicationId)
      if (!option) continue
      const normalizedChoices = normalizeChoiceOptions(choices)
      for (const choice of normalizedChoices) {
        if (!option.choices.some((existingChoice) => existingChoice.id === choice.id)) {
          option.choices.push(choice)
        }
      }
    }
  }
}

async function loadIndicationCatalog() {
  const patientExaminationId = flow.patientExaminationId
  const selectedExaminationId = flow.selectedExaminationId

  if (!patientExaminationId && !selectedExaminationId) {
    indicationOptions.value = []
    indicationOptionsError.value = null
    indicationOptionsLoading.value = false
    return
  }

  indicationOptionsLoading.value = true
  indicationOptionsError.value = null

  const optionsById = new Map<number, IndicationOption>()
  const loadErrors: string[] = []

  if (patientExaminationId) {
    try {
      const detailRes = await axiosInstance.get(
        r(endpoints.examination.patientExaminationDetail(patientExaminationId))
      )
      extractOptionsFromPayload(detailRes.data, optionsById)
    } catch {
      loadErrors.push('patient-examination')
    }
  }

  if (selectedExaminationId) {
    try {
      const examRes = await axiosInstance.get(
        r(`${endpoints.router.examinations}${selectedExaminationId}/`)
      )
      extractOptionsFromPayload(examRes.data, optionsById)
    } catch {
      loadErrors.push('examination-detail')
    }
  }

  if (selectedExaminationId && !optionsById.size) {
    try {
      const listRes = await axiosInstance.get(r(endpoints.router.examinations))
      const rows = (
        Array.isArray(listRes.data?.results) ? listRes.data.results : listRes.data
      ) as unknown[]
      const selectedRow = Array.isArray(rows)
        ? rows.find(
            (entry) =>
              !!entry &&
              typeof entry === 'object' &&
              normalizePositiveId((entry as Record<string, unknown>).id) === selectedExaminationId
          )
        : null
      if (selectedRow) {
        extractOptionsFromPayload(selectedRow, optionsById)
      }
    } catch {
      loadErrors.push('examination-list')
    }
  }

  indicationOptions.value = Array.from(optionsById.values())
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

function formatRuntimeFindingSummary(finding: ReportTemplateRuntimePatientFindingInput): string {
  const classifications = finding.classificationChoices
    .map((choice) => {
      const descriptorText = choice.descriptors.length
        ? ` (${choice.descriptors
            .map(
              (descriptor) =>
                `${descriptor.classificationChoiceDescriptor}: ${String(descriptor.descriptorValue)}`
            )
            .join(', ')})`
        : ''
      return `${choice.classification}: ${choice.classificationChoice}${descriptorText}`
    })
    .join(' · ')

  return classifications ? `${finding.finding} -> ${classifications}` : finding.finding
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

async function refreshTemplatesForExamination() {
  templateStatusMessage.value = null
  const examName = selectedExaminationName.value
  if (!examName) return
  const templates = (await fetchTemplatesByExamination(examName)) || []
  if (templates.length) {
    templateStatusMessage.value = `${templates.length} Vorlage(n) für "${examName}" geladen.`
  } else {
    templateStatusMessage.value = `Keine Vorlagen für "${examName}" gefunden.`
  }
}

function onModuleChange(next: string) {
  setModuleName(next.trim() || 'report_template_examples')
  void refreshTemplatesForExamination()
}

function onTemplateSelectionChange(name: string) {
  void selectTemplateByName(name || null)
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
    routePatientExaminationId: route.params.patient_examination_id ?? null,
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
    savedAt: new Date().toISOString()
  }
}

function buildRenderedText(): string {
  const fallbackAnonymizedText = flow.mediaPreload?.latestReport?.anonymizedText?.trim() || ''
  const lines: string[] = []
  lines.push(`# ${selectedTemplateName.value || 'Unbenannte Vorlage'}`)
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
    const rows = (
      Array.isArray(res.data?.results) ? res.data.results : res.data
    ) as PatientExaminationReportListItem[]
    const items = Array.isArray(rows) ? rows : []
    if (!items.length) {
      flow.setActiveReportId(null)
      currentReportVersion.value = null
      successMessage.value =
        'Kein bestehender Bericht gefunden. Das nächste Speichern erstellt einen neuen Bericht.'
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
    errorMessage.value = 'Vorlage ist erforderlich.'
    return
  }

  pendingSaveStatus.value = status
  loading.value = true
  clearMessages()
  flow.setSavingFinalReport(status === 'final')

  try {
    await ensurePatientsLoaded()
    const findings = buildDraftFindingsPayload()

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
      findings
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
    flow.setSavingFinalReport(false)
    loading.value = false
    pendingSaveStatus.value = null
  }
}

onMounted(async () => {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.'
    return
  }
  if (!flow.currentRuntimeDraft) {
    errorMessage.value = 'Kein Entwurf geladen. Bitte zuerst die klinische Dokumentation öffnen.'
    return
  }
  await Promise.all([ensurePatientsLoaded(), ensureExaminationsLoaded()])
  await loadIndicationCatalog()
  await refreshTemplatesForExamination()
  await loadLatestReportMeta()
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
