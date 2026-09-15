<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 class="mb-0">Berichtsvorlagen</h5>
          <small class="text-muted">
            Vorlagen laden, prüfen und als neue Berichtsvorlage speichern.
          </small>
        </div>
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="catalogLoading"
            @click="reloadWorkspace"
          >
            Arbeitsbereich neu laden
          </button>
          <button
            class="btn btn-success btn-sm"
            :disabled="saving"
            @click="showSavePrompt = true"
          >
            Template speichern
          </button>
          <button
            class="btn btn-outline-success btn-sm"
            :disabled="
              lifecycleLoading ||
              !templateName ||
              !builderReadiness?.canPublish ||
              lifecycleStatus === 'published'
            "
            @click="publishTemplate"
          >
            Veröffentlichen
          </button>
          <button
            class="btn btn-outline-warning btn-sm"
            :disabled="lifecycleLoading || !templateName || lifecycleStatus !== 'published'"
            @click="unpublishTemplate"
          >
            Entveröffentlichen
          </button>
        </div>
      </div>
      <div class="card-body">
        <div
          v-if="errorMessage"
          class="alert alert-danger py-2 mb-3"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="successMessage"
          class="alert alert-success py-2 mb-3"
        >
          {{ successMessage }}
        </div>
        <div class="alert alert-secondary py-2 small mb-0">
          Änderungen in diesem Bereich werden erst nach dem Speichern dauerhaft übernommen.
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-xl-5">
        <div class="card shadow-sm h-100">
          <div class="card-header">
            <h6 class="mb-0">Vorlagenübersicht</h6>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Vorlagenmodul</label>
                <input
                  v-model="moduleName"
                  class="form-control"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label">Untersuchung</label>
                <select
                  v-model="examination"
                  class="form-select"
                >
                  <option
                    value=""
                    disabled
                  >
                    Untersuchung wählen
                  </option>
                  <option
                    v-for="item in examinationOptions"
                    :key="item.name"
                    :value="item.name"
                  >
                    {{ item.label }}
                  </option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Gespeicherte Vorlage</label>
                <select
                  v-model="templateName"
                  class="form-select"
                  :disabled="templatesLoading || !templateOptions.length"
                >
                  <option
                    value=""
                    disabled
                  >
                    Vorlage wählen
                  </option>
                  <option
                    v-for="item in templateOptions"
                    :key="item.name"
                    :value="item.name"
                  >
                    {{ getReportTemplateDisplayName(item, 'de') }}
                  </option>
                </select>
              </div>
              <div class="col-12 d-flex flex-wrap gap-2">
                <button
                  class="btn btn-outline-primary btn-sm"
                  :disabled="templatesLoading || !examination"
                  @click="refreshTemplateOptions"
                >
                  Templates laden
                </button>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="templateLoading || !templateName"
                  @click="loadSelectedTemplate"
                >
                  Template laden
                </button>
                <button
                  class="btn btn-outline-warning btn-sm"
                  :disabled="definitionLoading || !templateName"
                  @click="runDefinitionValidation"
                >
                  Struktur validieren
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  :disabled="definitionLoading || !templateName"
                  @click="refreshReadiness"
                >
                  Readiness prüfen
                </button>
              </div>
            </div>

            <div class="mt-4">
              <h6 class="text-uppercase text-muted small mb-2">Verfügbare Inhalte</h6>
              <div class="small text-muted">
                {{ examinationOptions.length }} Untersuchungen, {{ findingOptions.length }} Befunde,
                {{ classificationOptions.length }} Klassifikationen
              </div>
            </div>

            <div
              v-if="selectedTemplate"
              class="mt-4 border-top pt-3"
            >
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <div>
                  <strong>{{ selectedTemplate.name }}</strong>
                  <div class="small text-muted">{{ selectedTemplate.examination }}</div>
                </div>
                <span class="badge text-bg-secondary">
                  {{ selectedTemplate.reportSections.length }} Sektion(en)
                </span>
              </div>
              <ul class="list-group list-group-flush small">
                <li
                  v-for="section in selectedTemplate.reportSections"
                  :key="section.name"
                  class="list-group-item px-0"
                >
                  <div class="d-flex justify-content-between gap-2">
                    <span>{{ section.position }}. {{ section.name }}</span>
                    <span class="text-muted">{{ section.findings.length }} Befunde</span>
                  </div>
                </li>
              </ul>
              <div class="small text-muted mt-2">
                {{ selectedTemplate.validators.findingsValidators.length }} Befundregeln,
                {{ selectedTemplate.validators.examinationValidators.length }} Untersuchungsregeln
              </div>
              <div
                class="mt-3 border rounded p-2 small"
                data-testid="template-readiness"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <strong>Readiness</strong>
                  <span
                    class="badge"
                    :class="builderReadiness?.canPublish ? 'text-bg-success' : 'text-bg-warning'"
                  >
                    {{ builderReadiness?.canPublish ? 'bereit zur Veröffentlichung' : 'offen' }}
                  </span>
                </div>
                <div class="text-muted">Status: {{ lifecycleStatus || 'unbekannt' }}</div>
                <ul
                  v-if="builderReadiness?.errors.length"
                  class="text-danger mb-0 mt-2"
                >
                  <li
                    v-for="error in builderReadiness.errors"
                    :key="error"
                  >
                    {{ error }}
                  </li>
                </ul>
                <ul
                  v-if="builderReadiness?.warnings.length"
                  class="text-warning mb-0 mt-2"
                >
                  <li
                    v-for="warning in builderReadiness.warnings"
                    :key="warning"
                  >
                    {{ warning }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xl-7">
        <div class="card shadow-sm h-100">
          <div
            class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2"
          >
            <div>
              <h6 class="mb-0">Laufende Prüfung</h6>
              <small class="text-muted"
                >Prüft die aktuelle Eingabe gegen die ausgewählte Vorlage.</small
              >
            </div>
            <button
              class="btn btn-success btn-sm"
              :disabled="runtimeLoading || !selectedTemplate"
              @click="runRuntimeValidation"
            >
              Eingabe prüfen
            </button>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Patientenkennung</label>
                <input
                  v-model="runtimePatient"
                  class="form-control"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label">Vorlagenversion</label>
                <input
                  :value="runtimeKnowledgeBaseVersion"
                  class="form-control"
                  readonly
                />
              </div>
              <div class="col-12">
                <label class="form-label">Untersuchende</label>
                <input
                  v-model="runtimeExaminersInput"
                  class="form-control"
                  placeholder="Kommagetrennte Namen"
                />
              </div>
            </div>

            <div class="mt-4 d-flex justify-content-between align-items-center">
              <h6 class="mb-0">Patientenbefunde</h6>
              <button
                class="btn btn-outline-secondary btn-sm"
                @click="addRuntimeFinding"
              >
                Befund hinzufügen
              </button>
            </div>

            <div
              v-if="!runtimeFindings.length"
              class="text-muted small mt-2"
            >
              Noch keine Befunde für die Prüfung erfasst.
            </div>

            <div
              v-for="(finding, findingIndex) in runtimeFindings"
              :key="finding.id"
              class="border rounded p-3 mt-3"
            >
              <div class="row g-3">
                <div class="col-md-8">
                  <label class="form-label form-label-sm">Befund</label>
                  <select
                    v-model="finding.finding"
                    class="form-select form-select-sm"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Befund wählen
                    </option>
                    <option
                      v-for="item in findingOptions"
                      :key="item.name"
                      :value="item.name"
                    >
                      {{ item.label }}
                    </option>
                  </select>
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <button
                    class="btn btn-outline-danger btn-sm w-100"
                    @click="removeRuntimeFinding(findingIndex)"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h6 class="text-uppercase text-muted small mb-0">Klassifikationswerte</h6>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    @click="addRuntimeClassificationChoice(findingIndex)"
                  >
                    Wert hinzufügen
                  </button>
                </div>

                <div
                  v-for="(choice, choiceIndex) in finding.classificationChoices"
                  :key="choice.id"
                  class="row g-2 align-items-end border rounded p-2 mb-2 bg-light-subtle"
                >
                  <div class="col-md-4">
                    <label class="form-label form-label-sm">Klassifikation</label>
                    <select
                      v-model="choice.classification"
                      class="form-select form-select-sm"
                    >
                      <option
                        value=""
                        disabled
                      >
                        Klassifikation waehlen
                      </option>
                      <option
                        v-for="item in classificationOptions"
                        :key="item.name"
                        :value="item.name"
                      >
                        {{ item.label }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label form-label-sm">Wertname</label>
                    <input
                      v-model="choice.classificationChoice"
                      class="form-control form-control-sm"
                      placeholder="z. B. Größe_mm"
                    />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label form-label-sm">Zusatzfeld</label>
                    <input
                      v-model="choice.descriptorName"
                      class="form-control form-control-sm"
                      placeholder="optional"
                    />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label form-label-sm">Wert</label>
                    <input
                      v-model="choice.descriptorValue"
                      class="form-control form-control-sm"
                      placeholder="optional"
                    />
                  </div>
                  <div class="col-md-1 d-flex align-items-end">
                    <button
                      class="btn btn-outline-danger btn-sm w-100"
                      @click="removeRuntimeClassificationChoice(findingIndex, choiceIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <h6 class="mb-2">Vorschau der Prüfungsdaten</h6>
              <pre class="small bg-light p-3 rounded mb-0">{{ runtimePayloadPreview }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-xl-5">
        <div class="card shadow-sm h-100">
          <div class="card-header">
            <h6 class="mb-0">Strukturvalidierung</h6>
          </div>
          <div class="card-body">
            <div
              v-if="!definitionValidationResult"
              class="text-muted small"
            >
              Noch keine Strukturprüfung ausgeführt.
            </div>
            <template v-else>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span
                  class="badge"
                  :class="definitionValidationResult.ok ? 'text-bg-success' : 'text-bg-danger'"
                >
                  {{ definitionValidationResult.ok ? 'OK' : 'Fehler' }}
                </span>
                <small class="text-muted">
                  {{ definitionValidationResult.graph.nodes.length }} Knoten /
                  {{ definitionValidationResult.graph.edges.length }} Kanten
                </small>
              </div>
              <div
                v-if="!definitionValidationResult.issues.length"
                class="text-muted small"
              >
                Keine Strukturprobleme gemeldet.
              </div>
              <ul
                v-else
                class="list-group list-group-flush small"
              >
                <li
                  v-for="(issue, index) in definitionValidationResult.issues"
                  :key="`def-issue-${index}`"
                  class="list-group-item px-0"
                >
                  <div class="d-flex justify-content-between gap-2">
                    <span>{{ issue.message }}</span>
                    <span
                      class="badge"
                      :class="issue.level === 'warning' ? 'text-bg-warning' : 'text-bg-danger'"
                    >
                      {{ issue.level === 'warning' ? 'Warnung' : 'Fehler' }}
                    </span>
                  </div>
                  <div
                    v-if="issue.nodeId"
                    class="text-muted"
                  >
                    {{ issue.nodeId }}
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>

      <div class="col-xl-7">
        <div class="card shadow-sm h-100">
          <div class="card-header">
            <h6 class="mb-0">Ergebnis der Eingabeprüfung</h6>
          </div>
          <div class="card-body">
            <div
              v-if="!runtimeValidationResult"
              class="text-muted small"
            >
              Noch keine Eingabeprüfung ausgeführt.
            </div>
            <template v-else>
              <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span
                  class="badge"
                  :class="runtimeValidationResult.ok ? 'text-bg-success' : 'text-bg-danger'"
                >
                  {{ runtimeValidationResult.ok ? 'Validiert' : 'Fehlgeschlagen' }}
                </span>
                <span class="text-muted small">
                  {{ runtimeValidationResult.evaluatedFindingsCount }} Befund(e) geprüft
                </span>
              </div>

              <div
                v-if="runtimeValidationResult.issues.length"
                class="mb-3"
              >
                <h6 class="text-uppercase text-muted small mb-2">Hinweise</h6>
                <ul class="list-group list-group-flush small">
                  <li
                    v-for="(issue, index) in runtimeValidationResult.issues"
                    :key="`rt-issue-${index}`"
                    class="list-group-item px-0"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <span>{{ issue.message }}</span>
                      <span
                        class="badge"
                        :class="issue.level === 'warning' ? 'text-bg-warning' : 'text-bg-danger'"
                      >
                        {{ issue.code }}
                      </span>
                    </div>
                    <div
                      v-if="issue.validatorName"
                      class="text-muted"
                    >
                      {{
                        issue.validatorKind === 'template'
                          ? 'Vorlage'
                          : issue.validatorKind === 'examination_validator'
                            ? 'Untersuchungsregel'
                            : 'Befundregel'
                      }}: {{ issue.validatorName }}
                    </div>
                  </li>
                </ul>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Befundregeln</h6>
                  <div
                    v-if="!runtimeValidationResult.findingsValidators.length"
                    class="text-muted small"
                  >
                    Keine Befundregeln ausgewertet.
                  </div>
                  <div
                    v-for="validator in runtimeValidationResult.findingsValidators"
                    :key="validator.name"
                    class="border rounded p-2 mb-2 small"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ validator.name }}</strong>
                      <span
                        class="badge"
                        :class="validator.ok ? 'text-bg-success' : 'text-bg-danger'"
                      >
                        {{ validator.ok ? 'OK' : 'Fehler' }}
                      </span>
                    </div>
                    <div class="text-muted">
                      {{ validator.finding }} · {{ validator.operator }} · Treffer
                      {{ validator.matchedOccurrences }}
                    </div>
                    <div
                      v-if="validator.missingRequiredClassifications.length"
                      class="text-danger"
                    >
                      Fehlende Klassifikationen:
                      {{ validator.missingRequiredClassifications.join(', ') }}
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Untersuchungsregeln</h6>
                  <div
                    v-if="!runtimeValidationResult.examinationValidators.length"
                    class="text-muted small"
                  >
                    Keine Untersuchungsregeln ausgewertet.
                  </div>
                  <div
                    v-for="validator in runtimeValidationResult.examinationValidators"
                    :key="validator.name"
                    class="border rounded p-2 mb-2 small"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ validator.name }}</strong>
                      <span
                        class="badge"
                        :class="validator.ok ? 'text-bg-success' : 'text-bg-danger'"
                      >
                        {{ validator.ok ? 'OK' : 'Fehler' }}
                      </span>
                    </div>
                    <div class="text-muted">
                      {{ validator.findingValidatorStatus.length }} Befundabhängigkeiten /
                      {{ validator.examinationValidatorStatus.length }} Untersuchungsabhängigkeiten
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h6 class="mb-0">Vorlage bearbeiten</h6>
          <small class="text-muted"
            >Hier können Aufbau, Sektionen und Regeln einer Berichtsvorlage bearbeitet
            werden.</small
          >
        </div>
        <div class="small text-muted">{{ sections.length }} Sektion(en)</div>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Vorlagenname</label>
            <input
              v-model="templateName"
              class="form-control"
              placeholder="z. B. colonoscopy_clinic_standard"
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Dateiname</label>
            <input
              v-model="fileName"
              class="form-control"
              placeholder="z. B. clinic_colonoscopy_template_v1"
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Beschreibung</label>
            <input
              v-model="templateDescription"
              class="form-control"
            />
          </div>
        </div>

        <ReportTemplateBrandingEditor
          v-model:sections="sections"
          :template-name="templateName"
          :examination="examination"
        />

        <ReportTemplateSectionsEditor
          v-model="sections"
          :finding-options="findingOptions"
          :classification-options="classificationOptions"
        />
      </div>
    </div>

    <div
      v-if="showSavePrompt"
      class="modal d-block"
      tabindex="-1"
      style="background: rgba(0, 0, 0, 0.35)"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Vorlage speichern</h5>
            <button
              type="button"
              class="btn-close"
              @click="showSavePrompt = false"
            />
          </div>
          <div class="modal-body">
            <label class="form-label">Dateiname</label>
            <input
              v-model="fileName"
              class="form-control"
            />
            <div class="form-text">Die Datei wird im ausgewählten Vorlagenmodul gespeichert.</div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-outline-secondary"
              @click="showSavePrompt = false"
            >
              Abbrechen
            </button>
            <button
              class="btn btn-success"
              :disabled="saving || !canSave"
              @click="saveTemplate"
            >
              <span
                v-if="saving"
                class="spinner-border spinner-border-sm me-1"
              />
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import ReportTemplateSectionsEditor from '@/components/Reporting/ReportTemplateSectionsEditor.vue'
import ReportTemplateBrandingEditor from '@/components/Reporting/ReportTemplateBrandingEditor.vue'
import {
  fetchReportTemplateByName,
  fetchReportTemplatePreviewByName,
  fetchBuilderReportTemplatesByExamination,
  getReportTemplateDisplayName,
  validateReportTemplateDefinition,
  validateReportTemplateRuntime
} from '@/api/reportTemplatesApi'
import { fetchKnowledgeBaseGraphSnapshot } from '@/api/knowledgeBaseGraphApi'
import {
  saveReportTemplateDefinition,
  fetchReportTemplateReadiness,
  publishReportTemplate,
  unpublishReportTemplate,
  type ReportTemplateBuilderReadiness,
  type ReportTemplateBuilderSection
} from '@/api/reportTemplateBuilderApi'
import type {
  ReportTemplateDefinitionValidationResult,
  ReportTemplatePayload,
  ReportTemplateRuntimePayload,
  ReportTemplateRuntimeValidationResult
} from '@/types/reportTemplate'
import { getCoreConceptLocalizedName, type CoreConceptCollection } from '@/types/coreConcepts'
import { reportingApiErrorMessage } from './reportingError'
import { reportTemplateLifecycleContextKey } from './reportTemplateLifecycleContext'
import { requireUniqueReportingExaminationName } from './reportingExaminationResolution'

type RuntimeClassificationChoiceDraft = {
  id: string
  classification: string
  classificationChoice: string
  descriptorName: string
  descriptorValue: string
}

type RuntimeFindingDraft = {
  id: string
  finding: string
  classificationChoices: RuntimeClassificationChoiceDraft[]
}

const lifecycleContext = inject(reportTemplateLifecycleContextKey, null)
const moduleName = ref(lifecycleContext?.activeModuleName.value || '')
const templateName = ref('')
const examination = ref('')
const templateDescription = ref('')
const fileName = ref('')
const sections = ref<ReportTemplateBuilderSection[]>([])
const showSavePrompt = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const catalogLoading = ref(false)
const templatesLoading = ref(false)
const templateLoading = ref(false)
const definitionLoading = ref(false)
const runtimeLoading = ref(false)
const lifecycleLoading = ref(false)
const coreConcepts = ref<CoreConceptCollection | null>(null)
const templateOptions = ref<ReportTemplatePayload[]>([])
const selectedTemplate = ref<ReportTemplatePayload | null>(null)
const definitionValidationResult = ref<ReportTemplateDefinitionValidationResult | null>(null)
const runtimeValidationResult = ref<ReportTemplateRuntimeValidationResult | null>(null)
const builderReadiness = ref<ReportTemplateBuilderReadiness | null>(null)
const lifecycleStatus = ref<'draft' | 'published' | null>(null)
let templateOptionsRequestGeneration = 0
let selectedTemplateRequestGeneration = 0
let definitionRequestGeneration = 0
let lifecycleRequestGeneration = 0
let runtimeRequestGeneration = 0
let saveRequestGeneration = 0

type BuilderRequestIdentity = Readonly<{
  moduleName: string
  moduleVersion: string
  templateName: string
}>

function captureBuilderRequestIdentity(): BuilderRequestIdentity | null {
  const identity = Object.freeze({
    moduleName: moduleName.value.trim(),
    moduleVersion: lifecycleContext?.activeModuleVersion.value.trim() || '',
    templateName: templateName.value.trim()
  })
  return identity.moduleName && identity.moduleVersion && identity.templateName ? identity : null
}

function isBuilderRequestIdentityCurrent(identity: BuilderRequestIdentity): boolean {
  return (
    moduleName.value.trim() === identity.moduleName &&
    lifecycleContext?.activeModuleVersion.value.trim() === identity.moduleVersion &&
    templateName.value.trim() === identity.templateName
  )
}

const runtimePatient = ref('frontend_test_patient')
const runtimeKnowledgeBaseVersion = computed(
  () => lifecycleContext?.activeModuleVersion.value.trim() || ''
)
const runtimeExaminersInput = ref('')
const runtimeFindings = ref<RuntimeFindingDraft[]>([])

const examinationOptions = computed(() =>
  (coreConcepts.value?.examination || [])
    .filter((entry) => entry.name.trim())
    .map((entry) => ({ name: entry.name.trim(), label: getCoreConceptLocalizedName(entry, 'de') }))
)

const findingOptions = computed(() =>
  (coreConcepts.value?.finding || [])
    .filter((entry) => entry.name.trim())
    .map((entry) => ({ name: entry.name.trim(), label: getCoreConceptLocalizedName(entry, 'de') }))
)

const classificationOptions = computed(() =>
  (coreConcepts.value?.classification || [])
    .filter((entry) => entry.name.trim())
    .map((entry) => ({ name: entry.name.trim(), label: getCoreConceptLocalizedName(entry, 'de') }))
)

const canSave = computed(
  () =>
    !!templateName.value.trim() &&
    !!examination.value.trim() &&
    !!fileName.value.trim() &&
    sections.value.length > 0
)

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function setError(message: string) {
  errorMessage.value = message
}

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function readinessFromTemplate(
  template: ReportTemplatePayload | null
): ReportTemplateBuilderReadiness | null {
  const readiness = template?.identity.readiness
  if (!readiness) {
    return null
  }
  return {
    canPublish: readiness.canPublish === true,
    lifecycleStatus: template.identity.lifecycleStatus || 'draft',
    errors: readiness.blockingIssues,
    warnings: readiness.warnings,
    raw: readiness.raw
  }
}

function syncSelectedTemplateMetadata() {
  const option = templateOptions.value.find((item) => item.name === templateName.value) || null
  lifecycleStatus.value = option?.identity.lifecycleStatus || null
  builderReadiness.value = readinessFromTemplate(option)
  if (selectedTemplate.value?.name !== option?.name) {
    selectedTemplate.value = null
  }
}

function defaultRuntimeClassificationChoice(): RuntimeClassificationChoiceDraft {
  return {
    id: uid('runtime_choice'),
    classification: '',
    classificationChoice: '',
    descriptorName: '',
    descriptorValue: ''
  }
}

function defaultRuntimeFinding(): RuntimeFindingDraft {
  return {
    id: uid('runtime_finding'),
    finding: '',
    classificationChoices: []
  }
}

function addRuntimeFinding() {
  runtimeFindings.value = [...runtimeFindings.value, defaultRuntimeFinding()]
}

function removeRuntimeFinding(index: number) {
  runtimeFindings.value.splice(index, 1)
}

function addRuntimeClassificationChoice(findingIndex: number) {
  runtimeFindings.value[findingIndex]?.classificationChoices.push(
    defaultRuntimeClassificationChoice()
  )
}

function removeRuntimeClassificationChoice(findingIndex: number, choiceIndex: number) {
  runtimeFindings.value[findingIndex]?.classificationChoices.splice(choiceIndex, 1)
}

function coerceDescriptorValue(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  if (trimmed === 'true') {
    return true
  }
  if (trimmed === 'false') {
    return false
  }
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric) && trimmed !== '') {
    return numeric
  }
  return trimmed
}

const runtimePayload = computed<ReportTemplateRuntimePayload>(() => ({
  patient: runtimePatient.value.trim() || 'frontend_test_patient',
  examiners: runtimeExaminersInput.value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
  examination: selectedTemplate.value?.examination || examination.value,
  knowledgeBaseModule: moduleName.value,
  knowledgeBaseVersion: runtimeKnowledgeBaseVersion.value || null,
  patientFindings: runtimeFindings.value
    .filter((finding) => !!finding.finding.trim())
    .map((finding) => ({
      finding: finding.finding.trim(),
      classificationChoices: finding.classificationChoices
        .filter((choice) => !!choice.classification.trim())
        .map((choice) => ({
          classification: choice.classification.trim(),
          classificationChoice: choice.classificationChoice.trim() || choice.classification.trim(),
          descriptors:
            choice.descriptorName.trim() && choice.descriptorValue.trim()
              ? [
                  {
                    classificationChoiceDescriptor: choice.descriptorName.trim(),
                    descriptorValue: coerceDescriptorValue(choice.descriptorValue)
                  }
                ]
              : []
        }))
    }))
}))

const runtimePayloadPreview = computed(() => JSON.stringify(runtimePayload.value, null, 2))

function activeModuleVersion(): string {
  return lifecycleContext?.activeModuleVersion.value.trim() || ''
}

function clearCatalogSelection(): void {
  coreConcepts.value = null
  examination.value = ''
  templateOptions.value = []
  selectedTemplate.value = null
}

function isCoreConceptRequestCurrent(module: string, version: string): boolean {
  return moduleName.value.trim() === module && activeModuleVersion() === version
}

function applyCoreConceptGraph(graph: Awaited<ReturnType<typeof fetchKnowledgeBaseGraphSnapshot>>) {
  coreConcepts.value = graph.concepts
  const shellExamination = lifecycleContext?.activeExaminationName.value.trim() || ''
  if (shellExamination) {
    examination.value = requireUniqueReportingExaminationName(
      coreConcepts.value.examination,
      shellExamination
    ).name
    return
  }
  if (!examination.value && examinationOptions.value.length) {
    examination.value = examinationOptions.value[0]?.name || ''
  }
}

async function loadCoreConcepts() {
  const requestedModuleName = moduleName.value.trim()
  const requestedModuleVersion = activeModuleVersion()
  if (!requestedModuleName) {
    clearCatalogSelection()
    return
  }
  if (!requestedModuleVersion) {
    clearCatalogSelection()
    setError('Für die Graph-Auflösung wird eine exakte Terminologieversion benötigt.')
    return
  }

  catalogLoading.value = true
  try {
    const graph = await fetchKnowledgeBaseGraphSnapshot(requestedModuleName, requestedModuleVersion)
    if (!isCoreConceptRequestCurrent(requestedModuleName, requestedModuleVersion)) {
      return
    }
    applyCoreConceptGraph(graph)
  } catch (error: unknown) {
    if (!isCoreConceptRequestCurrent(requestedModuleName, requestedModuleVersion)) {
      return
    }
    clearCatalogSelection()
    setError(reportingApiErrorMessage(error, 'Core concepts konnten nicht geladen werden.'))
  } finally {
    if (isCoreConceptRequestCurrent(requestedModuleName, requestedModuleVersion)) {
      catalogLoading.value = false
    }
  }
}

type TemplateOptionsRequest = Readonly<{
  moduleName: string
  moduleVersion: string
  examination: string
  generation: number
}>

function isTemplateOptionsRequestCurrent(request: TemplateOptionsRequest): boolean {
  const matchesIdentity =
    moduleName.value.trim() === request.moduleName &&
    activeModuleVersion() === request.moduleVersion &&
    examination.value.trim() === request.examination
  return request.generation === templateOptionsRequestGeneration && matchesIdentity
}

function assertTemplatesMatchRequest(
  templates: ReportTemplatePayload[],
  request: TemplateOptionsRequest
): void {
  const hasMismatch = templates.some((template) => {
    const matchesModule = template.identity.moduleName === request.moduleName
    const matchesVersion = template.identity.knowledgeBaseVersion === request.moduleVersion
    return !matchesModule || !matchesVersion
  })
  if (hasMismatch) {
    throw new Error('Die Vorlagenantwort gehört nicht zur angeforderten Terminologieversion.')
  }
}

function hasCompleteTemplateOptionsRequest(request: TemplateOptionsRequest): boolean {
  return Boolean(request.moduleName && request.moduleVersion && request.examination)
}

async function refreshTemplateOptions() {
  const request: TemplateOptionsRequest = Object.freeze({
    moduleName: moduleName.value.trim(),
    moduleVersion: activeModuleVersion(),
    examination: examination.value.trim(),
    generation: ++templateOptionsRequestGeneration
  })
  if (!hasCompleteTemplateOptionsRequest(request)) {
    templateOptions.value = []
    selectedTemplate.value = null
    return
  }

  templatesLoading.value = true
  try {
    const templates = await fetchBuilderReportTemplatesByExamination(
      request.moduleName,
      request.moduleVersion,
      request.examination
    )
    if (!isTemplateOptionsRequestCurrent(request)) {
      return
    }
    assertTemplatesMatchRequest(templates, request)
    templateOptions.value = templates
    if (!templateOptions.value.some((item) => item.name === templateName.value)) {
      templateName.value = templateOptions.value[0]?.name || ''
    }
    syncSelectedTemplateMetadata()
  } catch (error: unknown) {
    if (request.generation !== templateOptionsRequestGeneration) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Templates konnten nicht geladen werden.'))
  } finally {
    if (request.generation === templateOptionsRequestGeneration) {
      templatesLoading.value = false
    }
  }
}

type SelectedTemplateRequest = BuilderRequestIdentity & Readonly<{ generation: number }>

function isSelectedTemplateRequestCurrent(request: SelectedTemplateRequest): boolean {
  return (
    request.generation === selectedTemplateRequestGeneration &&
    isBuilderRequestIdentityCurrent(request)
  )
}

function assertTemplateMatchesRequest(
  template: ReportTemplatePayload | null,
  request: SelectedTemplateRequest
): asserts template is ReportTemplatePayload {
  if (!template) {
    throw new Error('Ungültiges Format der Berichtsvorlage.')
  }
  const matchesModule = template.identity.moduleName === request.moduleName
  const matchesVersion = template.identity.knowledgeBaseVersion === request.moduleVersion
  if (!matchesModule || !matchesVersion) {
    throw new Error('Die Vorlagenantwort gehört nicht zur angeforderten Terminologieversion.')
  }
}

function applySelectedTemplate(template: ReportTemplatePayload): void {
  selectedTemplate.value = template
  lifecycleStatus.value = template.identity.lifecycleStatus
  builderReadiness.value = readinessFromTemplate(template)
  examination.value = template.examination || examination.value
  runtimeValidationResult.value = null
  definitionValidationResult.value = null
}

async function loadSelectedTemplate() {
  if (!templateName.value) {
    return
  }
  const request: SelectedTemplateRequest = Object.freeze({
    moduleName: moduleName.value.trim(),
    moduleVersion: activeModuleVersion(),
    templateName: templateName.value,
    generation: ++selectedTemplateRequestGeneration
  })
  if (!request.moduleName || !request.moduleVersion) {
    return
  }
  templateLoading.value = true
  try {
    const fetchTemplate =
      lifecycleStatus.value === 'draft'
        ? fetchReportTemplatePreviewByName
        : fetchReportTemplateByName
    const template = await fetchTemplate(
      request.moduleName,
      request.moduleVersion,
      request.templateName
    )
    if (!isSelectedTemplateRequestCurrent(request)) {
      return
    }
    assertTemplateMatchesRequest(template, request)
    applySelectedTemplate(template)
  } catch (error: unknown) {
    if (request.generation !== selectedTemplateRequestGeneration) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Vorlage konnte nicht geladen werden.'))
  } finally {
    if (request.generation === selectedTemplateRequestGeneration) {
      templateLoading.value = false
    }
  }
}

async function runDefinitionValidation() {
  const identity = captureBuilderRequestIdentity()
  if (!identity) {
    return
  }
  const requestGeneration = ++definitionRequestGeneration
  definitionLoading.value = true
  try {
    const result = await validateReportTemplateDefinition(
      identity.moduleName,
      identity.moduleVersion,
      identity.templateName
    )
    if (
      requestGeneration !== definitionRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    definitionValidationResult.value = result
    successMessage.value = `Strukturprüfung für "${identity.templateName}" abgeschlossen.`
  } catch (error: unknown) {
    if (
      requestGeneration !== definitionRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Strukturprüfung fehlgeschlagen.'))
  } finally {
    if (requestGeneration === definitionRequestGeneration) {
      definitionLoading.value = false
    }
  }
}

async function refreshReadiness() {
  const identity = captureBuilderRequestIdentity()
  if (!identity) {
    return
  }
  const requestGeneration = ++definitionRequestGeneration
  definitionLoading.value = true
  try {
    const readiness = await fetchReportTemplateReadiness(
      identity.moduleName,
      identity.moduleVersion,
      identity.templateName
    )
    if (
      requestGeneration !== definitionRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    builderReadiness.value = readiness
    lifecycleStatus.value = readiness.lifecycleStatus
  } catch (error: unknown) {
    if (
      requestGeneration !== definitionRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Readiness-Prüfung fehlgeschlagen.'))
  } finally {
    if (requestGeneration === definitionRequestGeneration) {
      definitionLoading.value = false
    }
  }
}

function isLifecycleRequestCurrent(
  requestGeneration: number,
  identity: BuilderRequestIdentity
): boolean {
  return (
    requestGeneration === lifecycleRequestGeneration && isBuilderRequestIdentityCurrent(identity)
  )
}

async function publishTemplate() {
  const identity = captureBuilderRequestIdentity()
  if (!identity || !builderReadiness.value?.canPublish) {
    return
  }
  const requestGeneration = ++lifecycleRequestGeneration
  lifecycleLoading.value = true
  clearMessages()
  try {
    const result = await publishReportTemplate(
      identity.moduleName,
      identity.moduleVersion,
      identity.templateName
    )
    if (!isLifecycleRequestCurrent(requestGeneration, identity)) {
      return
    }
    lifecycleStatus.value = result.lifecycleStatus
    builderReadiness.value = result.readiness
    successMessage.value = `Vorlage "${identity.templateName}" wurde veröffentlicht.`
    await refreshTemplateOptions()
    await lifecycleContext?.notifyLifecycleChanged({
      moduleName: identity.moduleName,
      moduleVersion: identity.moduleVersion,
      templateName: identity.templateName,
      examination: examination.value,
      lifecycleStatus: result.lifecycleStatus
    })
  } catch (error: unknown) {
    if (!isLifecycleRequestCurrent(requestGeneration, identity)) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Vorlage konnte nicht veröffentlicht werden.'))
  } finally {
    if (requestGeneration === lifecycleRequestGeneration) {
      lifecycleLoading.value = false
    }
  }
}

async function unpublishTemplate() {
  const identity = captureBuilderRequestIdentity()
  if (!identity || lifecycleStatus.value !== 'published') {
    return
  }
  const requestGeneration = ++lifecycleRequestGeneration
  lifecycleLoading.value = true
  clearMessages()
  try {
    const result = await unpublishReportTemplate(
      identity.moduleName,
      identity.moduleVersion,
      identity.templateName
    )
    if (
      requestGeneration !== lifecycleRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    lifecycleStatus.value = result.lifecycleStatus
    builderReadiness.value = result.readiness
    successMessage.value = `Vorlage "${identity.templateName}" wurde entveröffentlicht.`
    await lifecycleContext?.notifyLifecycleChanged({
      moduleName: identity.moduleName,
      moduleVersion: identity.moduleVersion,
      templateName: identity.templateName,
      examination: examination.value,
      lifecycleStatus: result.lifecycleStatus
    })
  } catch (error: unknown) {
    if (
      requestGeneration !== lifecycleRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Vorlage konnte nicht entveröffentlicht werden.'))
  } finally {
    if (requestGeneration === lifecycleRequestGeneration) {
      lifecycleLoading.value = false
    }
  }
}

async function runRuntimeValidation() {
  const identity = captureBuilderRequestIdentity()
  if (!selectedTemplate.value || !identity) {
    setError('Bitte zuerst eine gespeicherte Vorlage laden.')
    return
  }

  const requestGeneration = ++runtimeRequestGeneration
  runtimeLoading.value = true
  try {
    const result = await validateReportTemplateRuntime(
      identity.moduleName,
      identity.moduleVersion,
      identity.templateName,
      runtimePayload.value
    )
    if (
      requestGeneration !== runtimeRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    runtimeValidationResult.value = result
    successMessage.value = `Eingabeprüfung für "${identity.templateName}" abgeschlossen.`
  } catch (error: unknown) {
    if (
      requestGeneration !== runtimeRequestGeneration ||
      !isBuilderRequestIdentityCurrent(identity)
    ) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Eingabeprüfung fehlgeschlagen.'))
  } finally {
    if (requestGeneration === runtimeRequestGeneration) {
      runtimeLoading.value = false
    }
  }
}

async function reloadWorkspace() {
  clearMessages()
  await loadCoreConcepts()
  await refreshTemplateOptions()
  if (templateName.value) {
    await loadSelectedTemplate()
  }
}

async function saveTemplate() {
  const identity = captureBuilderRequestIdentity()
  if (!canSave.value || !identity) {
    return
  }
  const requestGeneration = ++saveRequestGeneration
  saving.value = true
  clearMessages()
  try {
    const result = await saveReportTemplateDefinition({
      moduleName: identity.moduleName,
      moduleVersion: identity.moduleVersion,
      fileName: fileName.value,
      templateName: templateName.value,
      examination: examination.value,
      description: templateDescription.value,
      sections: sections.value
    })
    if (requestGeneration !== saveRequestGeneration || !isBuilderRequestIdentityCurrent(identity)) {
      return
    }
    successMessage.value = `Vorlage "${result.templateName}" wurde in ${result.fileName} gespeichert.`
    lifecycleStatus.value = result.lifecycleStatus
    builderReadiness.value = result.readiness
    showSavePrompt.value = false
    await refreshTemplateOptions()
    await loadSelectedTemplate()
  } catch (error: unknown) {
    if (requestGeneration !== saveRequestGeneration || !isBuilderRequestIdentityCurrent(identity)) {
      return
    }
    setError(reportingApiErrorMessage(error, 'Vorlage konnte nicht gespeichert werden.'))
  } finally {
    if (requestGeneration === saveRequestGeneration) {
      saving.value = false
    }
  }
}

watch(moduleName, async () => {
  clearMessages()
  await loadCoreConcepts()
  await refreshTemplateOptions()
})

watch(templateName, syncSelectedTemplateMetadata)

if (lifecycleContext) {
  watch(lifecycleContext.activeModuleName, (nextModuleName) => {
    if (nextModuleName && nextModuleName !== moduleName.value) {
      moduleName.value = nextModuleName
    }
  })
  watch(lifecycleContext.activeModuleVersion, async () => {
    await loadCoreConcepts()
    await refreshTemplateOptions()
  })
  watch(lifecycleContext.activeExaminationName, (nextExaminationName) => {
    const normalizedName = nextExaminationName.trim()
    if (!normalizedName || normalizedName === examination.value) {
      return
    }
    try {
      examination.value = requireUniqueReportingExaminationName(
        coreConcepts.value?.examination || [],
        normalizedName
      ).name
    } catch (error: unknown) {
      setError(reportingApiErrorMessage(error, 'Untersuchung konnte nicht aufgelöst werden.'))
    }
  })
}

watch(examination, async (next, prev) => {
  if (!next || next === prev) {
    return
  }
  await refreshTemplateOptions()
})

onMounted(async () => {
  await loadCoreConcepts()
  await refreshTemplateOptions()
  if (templateName.value) {
    await loadSelectedTemplate()
  }
})
</script>
