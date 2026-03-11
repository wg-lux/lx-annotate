<template>
  <div class="assisted-reporting container-fluid py-4">
    <div v-if="successMessage" class="alert alert-success alert-dismissible">
      <strong>Erfolg:</strong> {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = null"></button>
    </div>

    <div v-if="error" class="alert alert-danger alert-dismissible">
      <strong>Fehler:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <MedicalBlock
      title="1. Patient &amp; Untersuchung"
      subtitle="Basisdaten für den Bericht"
      icon="person"
      :store="patientStore"
      :isComplete="!!lookupToken"
      :isActive="currentStep === 1"
      :loading="loading"
      @next="goToStep(2)"
    >
      <div class="row g-3">
        <div class="col-md-6">
          <label for="patient-select" class="form-label mb-1">Patient auswählen</label>
          <select id="patient-select" v-model="selectedPatientId" class="form-select" :disabled="isLoadingPatients || loading">
            <option :value="null" disabled>
              {{ isLoadingPatients ? 'Lade Patienten...' : 'Bitte wählen Sie einen Patienten' }}
            </option>
            <option v-for="patient in patients" :key="patient.id" :value="patient.id">
              {{ patient.displayName }}
            </option>
          </select>
          <small v-if="selectedPatientId" class="text-muted">Bei Patientenwechsel wird die Session zurückgesetzt.</small>
        </div>
        <div class="col-md-6">
          <label for="examination-select" class="form-label mb-1">Untersuchung auswählen</label>
          <select
            id="examination-select"
            v-model="selectedExaminationId"
            class="form-select"
            :disabled="isLoadingExaminations || !selectedPatientId || loading"
          >
            <option :value="null" disabled>
              {{ isLoadingExaminations ? 'Lade Untersuchungen...' : 'Bitte wählen Sie eine Untersuchung' }}
            </option>
            <option v-for="exam in examinationsDropdown" :key="exam.id" :value="exam.id">
              {{ exam.displayName }}
            </option>
          </select>
        </div>
        <div class="col-12">
          <div class="d-flex flex-wrap gap-2 mt-3">
            <button
              class="btn btn-primary"
              :disabled="!selectedPatientId || !selectedExaminationId || loading || !!lookupToken"
              @click="createPatientExaminationAndInitLookup"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <span v-if="!lookupToken">2. Anforderungsbericht starten</span>
              <span v-else>Anforderungsbericht aktiv</span>
            </button>
            <button class="btn btn-outline-secondary" type="button" @click="showCreatePatientModal = true">
              <i class="fas fa-user-plus me-1"></i>
              Neuer Patient
            </button>
          </div>
        </div>
        <div v-if="selectedPatientId" class="col-12">
          <div class="d-flex align-items-center gap-3 mt-2 flex-wrap">
            <span class="badge bg-info">
              <i class="fas fa-user"></i>
              Aktiv
            </span>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="patientStore.clearCurrentPatient()"
              title="Patientenauswahl zurücksetzen"
            >
              <i class="fas fa-times me-1"></i> Patient zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </MedicalBlock>

    <MedicalBlock
      title="2. Befundvorlage auswählen"
      subtitle="Anforderungen überprüfen"
      icon="widgets"
      iconBgClass="bg-gradient-warning"
      :store="requirementStore"
      :isComplete="requirementSets.length > 0"
      :isActive="currentStep === 2"
      @next="goToStep(3)"
    >
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">Report Template (Django API)</h6>
            <small class="text-muted">Quelle: {{ selectedKbModule }}</small>
          </div>
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="reportTemplateLoading"
            @click="fetchReportTemplateByName(selectedKbModule, selectedTemplateName)"
          >
            Neu laden
          </button>
        </div>
        <div class="card-body">
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label mb-1">Knowledge-Base Modul</label>
              <input v-model="selectedKbModule" class="form-control form-control-sm" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1">Report Template</label>
              <select
                v-model="selectedTemplateName"
                class="form-select form-select-sm"
                :disabled="reportTemplateLoading || !reportTemplateOptions.length"
              >
                <option v-if="!reportTemplateOptions.length" :value="selectedTemplateName">
                  Keine Templates für Untersuchung
                </option>
                <option
                  v-for="tpl in reportTemplateOptions"
                  :key="tpl.name"
                  :value="tpl.name"
                >
                  {{ tpl.name }}
                </option>
              </select>
              <small class="text-muted">
                {{ reportTemplateOptions.length }} Template(s) verfügbar
              </small>
            </div>
          </div>

          <div v-if="reportTemplateLoading" class="text-muted small">
            Lade Report Template...
          </div>
          <div v-else-if="reportTemplate">
            <p class="mb-2">
              <strong>{{ reportTemplate.name }}</strong>
              <span class="text-muted">({{ reportTemplate.examination }})</span>
            </p>
            <ul class="mb-2">
              <li v-for="section in reportTemplate.reportSections" :key="section.name">
                {{ section.position }} - {{ section.name }} ({{ section.findings.length }} Findings)
              </li>
            </ul>
            <small class="text-muted">
              Validators: {{ reportTemplate.validators.examinationValidators.length }} examination,
              {{ reportTemplate.validators.findingsValidators.length }} findings
            </small>

            <div class="mt-3 border-top pt-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Template-Abgleich mit API-Daten</h6>
                <small class="text-muted">
                  {{ templateDetailSummary.matchedFindings }} / {{ templateDetailSummary.totalFindings }} Findings gefunden
                </small>
              </div>

              <div v-if="templateDetailsLoading" class="text-muted small">
                Lade Detailabgleich...
              </div>
              <div v-else-if="!templateFindingDetails.length" class="text-muted small">
                Keine Detaildaten verfügbar.
              </div>
              <div v-else class="small">
                <div
                  v-for="detail in templateFindingDetails"
                  :key="`${detail.sectionName}::${detail.templateFindingName}`"
                  class="border rounded p-2 mb-2"
                >
                  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <strong>{{ detail.templateFindingName }}</strong>
                      <span class="text-muted ms-2">({{ detail.sectionName }})</span>
                    </div>
                    <span
                      class="badge"
                      :class="detail.matchedFinding ? 'bg-success' : 'bg-danger'"
                    >
                      {{ detail.matchedFinding ? 'Gefunden' : 'Nicht gefunden' }}
                    </span>
                  </div>

                  <div v-if="detail.matchedFinding" class="text-muted mt-1">
                    ID {{ detail.matchedFinding.id }} - {{ detail.matchedFinding.displayName }}
                    <span v-if="detail.matchedFinding.description">
                      - {{ detail.matchedFinding.description }}
                    </span>
                  </div>

                  <div class="mt-1">
                    <span class="text-muted">
                      Template Klassifikationen: {{ detail.requiredTemplateClassifications.length }} erforderlich /
                      {{ detail.templateClassifications.length }} gesamt
                    </span>
                    <span class="text-muted ms-3" v-if="detail.matchedFinding">
                      API Klassifikationen: {{ detail.apiClassifications.length }}
                    </span>
                    <span class="ms-3 badge" :class="detail.isAddedToPatientExamination ? 'bg-success' : 'bg-secondary'">
                      {{ detail.isAddedToPatientExamination ? 'Im Bericht erfasst' : 'Noch nicht erfasst' }}
                    </span>
                  </div>

                  <div
                    v-if="detail.missingRequiredClassifications.length"
                    class="text-danger mt-1"
                  >
                    Fehlende Pflicht-Klassifikationen:
                    {{ detail.missingRequiredClassifications.join(', ') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-muted small">
            Kein Report Template für die aktuelle Untersuchung gefunden.
          </div>
        </div>
      </div>

      <div v-if="!lookupToken" class="text-muted small">
        Starten Sie zunächst die Lookup-Session, um Requirement Sets zu sehen.
      </div>
      <div v-else class="card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">Requirement Sets anpassen</h6>
            <small class="text-muted">Token: {{ lookupToken }}</small>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-secondary" @click="fetchLookupAll" :disabled="loading">Aktualisieren</button>
            <button class="btn btn-sm btn-outline-info" @click="triggerRecompute" :disabled="loading || !lookupToken">Neu berechnen</button>
            <button class="btn btn-sm btn-outline-info" @click="manualRenewSession" :disabled="loading || !lookupToken">Session erneuern</button>
            <button class="btn btn-sm btn-outline-danger" @click="resetLookupSession" :disabled="loading">Session zurücksetzen</button>
          </div>
        </div>
        <div v-if="loading" class="card-body text-center">
          <div class="spinner-border" role="status"></div>
          <p class="text-muted mt-2 mb-0">Lädt Lookup-Daten...</p>
        </div>
        <div v-else class="card-body pre-scrollable" style="max-height: 55vh; overflow: auto;">
          <ul class="list-group list-group-flush">
            <li v-for="rs in requirementSets" :key="rs.id" class="list-group-item d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-semibold">{{ rs.name }}</span>
                  <span v-if="requirementStore.getRequirementSetEvaluationStatus(rs.id)" class="badge" :class="requirementStore.getRequirementSetEvaluationStatus(rs.id)?.met ? 'bg-success' : 'bg-warning'">
                    <i class="fas" :class="requirementStore.getRequirementSetEvaluationStatus(rs.id)?.met ? 'fa-check' : 'fa-exclamation-triangle'"></i>
                    {{ requirementStore.getRequirementSetEvaluationStatus(rs.id)?.met ? 'Erfüllt' : 'Nicht erfüllt' }}
                  </span>
                </div>
                <small class="text-muted d-block">Typ: {{ rs.type }}</small>
              </div>
              <div class="form-check form-switch ms-3">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="selectedRequirementSetIdSet.has(rs.id)"
                  @change="toggleRequirementSet(rs.id, ($event.target as HTMLInputElement).checked)"
                />
              </div>
            </li>
            <li v-if="!requirementSets.length" class="list-group-item text-muted">Keine Sets gefunden.</li>
          </ul>
          <div v-if="evaluationSummary && evaluationSummary.totalSets > 0" class="mt-3 p-3 bg-light rounded">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-semibold">Evaluierungsübersicht</span>
              <small class="text-muted">{{ evaluationSummary.completionPercentage }}% abgeschlossen</small>
            </div>
            <div class="progress mb-2" style="height: 10px;">
              <div
                class="progress-bar"
                :class="evaluationSummary.completionPercentage === 100 ? 'bg-success' : 'bg-info'"
                :style="{ width: evaluationSummary.completionPercentage + '%' }"
              ></div>
            </div>
            <small class="text-muted">{{ evaluationSummary.evaluatedSets }} / {{ evaluationSummary.totalSets }} Sets bewertet</small>
            <div class="mt-2">
              <button class="btn btn-sm btn-primary" @click="evaluateRequirementsOnChange" :disabled="loading">
                <i class="fas fa-sync me-1"></i> Alle evaluieren
              </button>
            </div>
          </div>
        </div>
        <div v-if="lookup && isDebug" class="mt-3 border rounded p-3 bg-white">
          <p class="text-muted mb-1"><strong>Debug</strong></p>
          <p class="mb-1"><strong>Patient Examination ID:</strong> {{ lookup.patientExaminationId || 'n/a' }}</p>
          <p class="mb-1"><strong>Lookup Token:</strong> {{ lookupToken || 'n/a' }}</p>
          <p class="mb-0"><strong>Verfügbare Findings:</strong> {{ availableFindings.length }}</p>
        </div>
      </div>
    </MedicalBlock>

    <MedicalBlock
      v-if="lookupToken"
      title="3. Befunde"
      subtitle="Klinische Beobachtungen erfassen"
      icon="biotech"
      iconBgClass="bg-gradient-primary"
      :isComplete="availableFindings.length > 0"
      :isActive="currentStep === 3"
      :extraParams="{ token: lookupToken }"
      @next="goToStep(4)"
    >
      <div class="mb-3" v-if="currentPatientExaminationId">
        <AddableFindingsDetail
          :examination-id="selectedExaminationId || undefined"
          :patient-examination-id="currentPatientExaminationId || undefined"
          @finding-added="onFindingAddedToExamination"
          @finding-error="(errorMsg) => error = errorMsg"
        />
      </div>
      <div class="card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">Verfügbare Befunde</h6>
            <small class="text-muted">Nutzen Sie die Liste, um Befunde der Lookup-Session zu prüfen.</small>
          </div>
          <div class="d-flex align-items-center gap-2">
            <small v-if="availableFindings.length" class="text-muted">{{ availableFindings.length }} verfügbar</small>
            <button class="btn btn-sm btn-outline-info" @click="loadFindingsData" :disabled="loading">
              <i class="fas fa-sync-alt me-1"></i> Befunde laden
            </button>
          </div>
        </div>
        <div class="card-body pre-scrollable" style="max-height: 55vh; overflow: auto;">
          <div v-if="findingsSectionLoading" class="text-center py-4">
            <div class="spinner-border" role="status"></div>
            <p class="text-muted mt-2 mb-0">Lade Befunde...</p>
          </div>
          <div v-else-if="availableFindings.length" class="findings-container">
            <FindingsDetail
              v-for="findingId in availableFindings"
              :key="findingId"
              :finding-id="findingId"
              :is-added-to-examination="isFindingAddedToExamination(findingId)"
              :patient-examination-id="lookup?.patientExaminationId || undefined"
              @added-to-examination="onFindingAddedToExamination"
              @classification-updated="onClassificationUpdated"
            />
          </div>
          <div v-else class="text-center py-4 text-muted">
            <i class="fas fa-info-circle fa-2x mb-2"></i>
            <p class="mb-0">Keine Befunde verfügbar.</p>
            <small>Wählen Sie eine Untersuchung aus, um Befunde zu laden.</small>
          </div>
        </div>
      </div>
    </MedicalBlock>

    <MedicalBlock
      v-if="lookupToken"
      title="4. Klassifikation"
      subtitle="Abschlussbewertung des Berichts"
      icon="fact_check"
      iconBgClass="bg-gradient-success"
      :isComplete="evaluationSummary?.completionPercentage === 100"
      :isActive="currentStep === 4"
      :showAction="false"
    >
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center gap-2 justify-content-between">
            <div class="small text-muted">
              <span v-if="currentReportId">Report #{{ currentReportId }}</span>
              <span v-if="currentReportId && currentReportVersion != null"> · Version {{ currentReportVersion }}</span>
              <span v-if="lastSaveStatus"> · Letzter Save: {{ lastSaveStatus }}</span>
              <span v-if="!currentReportId">Noch nicht gespeichert</span>
            </div>
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                :disabled="saveSubmissionLoading || !currentPatientExaminationId || !reportTemplate"
                @click="saveReportSubmission('draft')"
              >
                <span v-if="saveSubmissionLoading && lastSaveStatus === 'draft'" class="spinner-border spinner-border-sm me-1" />
                Entwurf speichern
              </button>
              <button
                class="btn btn-sm btn-success"
                :disabled="saveSubmissionLoading || !currentPatientExaminationId || !reportTemplate"
                @click="saveReportSubmission('final')"
              >
                <span v-if="saveSubmissionLoading && lastSaveStatus === 'final'" class="spinner-border spinner-border-sm me-1" />
                Final speichern
              </button>
            </div>
          </div>

          <div v-if="saveWarnings.length" class="mt-3">
            <div
              v-for="(warning, idx) in saveWarnings"
              :key="`save-warning-${idx}`"
              class="alert alert-warning py-2 mb-2"
            >
              {{ warning }}
            </div>
          </div>

          <div
            v-if="lastPersistedArtifacts?.pdfDownloadUrl || lastPersistedArtifacts?.pdfViewUrl"
            class="mt-2 d-flex flex-wrap gap-2"
          >
            <a
              v-if="lastPersistedArtifacts?.pdfViewUrl"
              class="btn btn-sm btn-outline-secondary"
              :href="lastPersistedArtifacts.pdfViewUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF Vorschau
            </a>
            <a
              v-if="lastPersistedArtifacts?.pdfDownloadUrl"
              class="btn btn-sm btn-outline-secondary"
              :href="lastPersistedArtifacts.pdfDownloadUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF Download
            </a>
          </div>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">Vorherige Berichte (anonymisiert)</h6>
            <small class="text-muted">Texte aus früheren Dokumenten des Patienten</small>
          </div>
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="previousReportTextsLoading || !selectedPatientId"
            @click="fetchPreviousReportTexts"
          >
            Aktualisieren
          </button>
        </div>
        <div class="card-body">
          <div v-if="previousReportTextsLoading" class="text-muted small">
            Lade vorherige Berichtstexte...
          </div>
          <div v-else-if="!previousReportTexts.length" class="text-muted small">
            Keine vorherigen Berichtstexte gefunden.
          </div>
          <div v-else class="d-flex flex-column gap-3">
            <div
              v-for="entry in previousReportTexts"
              :key="entry.id"
              class="border rounded p-3 bg-light"
            >
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <small class="text-muted">{{ formatTimelineDate(entry.createdAt) }}</small>
                <span v-if="entry.documentType" class="badge text-bg-secondary">{{ entry.documentType }}</span>
              </div>
              <small v-if="entry.patientExaminationId" class="text-muted d-block mb-2">
                PatientExamination #{{ entry.patientExaminationId }}
              </small>
              <div class="previous-report-text">{{ entry.text }}</div>
            </div>
          </div>
        </div>
      </div>

      <RequirementIssues
        :patient-examination-id="lookup?.patientExaminationId || null"
        :requirement-set-ids="selectedRequirementSetIds"
        :show-only-unmet="true"
      />
    </MedicalBlock>

    <div v-if="showCreatePatientModal" class="modal-overlay" @click="closeCreatePatientModal">
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Neuen Patienten erstellen</h5>
            <button type="button" class="btn-close" @click="closeCreatePatientModal"></button>
          </div>
          <div class="modal-body">
            <PatientAdder @patient-created="onPatientCreated" @cancel="closeCreatePatientModal" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { findingsApi } from '@/api/findingsApi';
import { usePatientStore } from '@/stores/patientStore';
import type { Patient } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useRequirementStore } from '@/stores/requirementStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import type { PatientExamination } from '@/stores/patientExaminationStore';
import PatientAdder from '@/components/CaseGenerator/PatientAdder.vue';
import MedicalBlock from './MedicalBlock.vue';
import FindingsDetail from '../RequirementReport/FindingsDetail.vue';
import AddableFindingsDetail from '../RequirementReport/AddableFindingsDetail.vue';
import RequirementIssues from '../RequirementReport/RequirementIssues.vue';
import { endpoints } from '@/types/api/endpoints';
import { useDebug } from '@/composables/useDebug';
import type {
  ReportSubmissionStatus,
  SaveReportSubmissionRequest,
  SaveReportSubmissionResponse
} from '@/types/api/reportSubmission';
import {
  formatDateOnly,
  mergeClassificationSelections,
  normalizeInterventions
} from './reportSubmissionUtils';
import {
  extractFindingId,
  getClassificationDisplayName,
  getFindingDisplayName,
  type Finding as ApiFindingLite,
  type FindingClassification as ApiFindingClassificationLite,
  type PatientFindingRow as PatientFindingApiRow
} from '@/api/findings.contract';
import type {
  PatientFindingApiClassification,
  PatientFindingApiIntervention
} from './reportSubmissionUtils';

// --- Types ---
type RequirementSetLite = { id: number; name: string; type: string };
type RequirementLite = { id: number; name: string };
type LookupDict = {
  patientExaminationId: number;
  requirementSets: RequirementSetLite[];
  availableFindings: number[];
  requiredFindings: number[];
  requirementDefaults: Record<string, any[]>;
  classificationChoices: Record<string, any[]>;
  requirementsBySet: Record<string, RequirementLite[]>;  // NEW
  requirementStatus: Record<string, boolean>;            // NEW
  requirementSetStatus: Record<string, boolean>;         // NEW
  suggestedActions: Record<string, any[]>;               // NEW
  selectedRequirementSetIds?: number[];
  selectedChoices?: Record<string, any>;
};

type ReportTemplateClassification = {
  classification: string;
  required: boolean;
};

type ReportTemplateFinding = {
  finding: string;
  required: boolean;
  multipleAllowed: boolean;
  classifications: ReportTemplateClassification[];
};

type ReportTemplateSection = {
  name: string;
  position: number;
  types: string[];
  findings: ReportTemplateFinding[];
};

type ReportTemplatePayload = {
  name: string;
  examination: string;
  reportSections: ReportTemplateSection[];
  validators: {
    examinationValidators: any[];
    findingsValidators: any[];
  };
};

type TemplateFindingDetail = {
  sectionName: string;
  templateFindingName: string;
  templateClassifications: string[];
  requiredTemplateClassifications: string[];
  apiClassifications: string[];
  missingRequiredClassifications: string[];
  isAddedToPatientExamination: boolean;
  matchedFinding: {
    id: number;
    displayName: string;
    description?: string;
  } | null;
};

type TimelineItemRow = {
  id?: number;
  mediaType?: string | null;
  createdAt?: string | null;
  documentType?: string | null;
  anonymizedText?: string | null;
  text?: string | null;
  patientExaminationId?: number | null;
  patientExamination?: { id?: number | null } | null;
};

type PreviousReportTextEntry = {
  id: number;
  mediaType: string | null;
  createdAt: string | null;
  documentType: string | null;
  patientExaminationId: number | null;
  text: string;
};

// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const requirementStore = useRequirementStore();
const patientExaminationStore = usePatientExaminationStore();
const patientFindingStore = usePatientFindingStore();
const {
  loading: findingSelectorsLoading,
  ensureCatalogLoaded,
  ensurePatientFindingsLoaded,
  getFindingById,
  getFindingNameById,
  getAttachedFindingIds,
  isFindingAttached
} = useFindingSelectors();

// --- API ---
const LOOKUP_BASE = '/api/lookup';
const REPORT_TEMPLATE_BASE = '/base_api/report-templates';
const { isDebug } = useDebug();

// --- Component State ---
const selectedPatientId = ref<number | null>(null);
const selectedExaminationId = ref<number | null>(null);
const currentPatientExaminationId = ref<number | null>(null);
const lookupToken = ref<string | null>(null);
const lookup = ref<LookupDict | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const showCreatePatientModal = ref(false);
const successMessage = ref<string | null>(null);
const isRestarting = ref(false); // Prevent infinite restart loops
const selectedKbModule = ref<string>('report_template_examples');
const selectedTemplateName = ref<string>('star_upper_gi_main');
const reportTemplate = ref<ReportTemplatePayload | null>(null);
const reportTemplateLoading = ref<boolean>(false);
const reportTemplateOptions = ref<ReportTemplatePayload[]>([]);
const autoSelectionAppliedKey = ref<string | null>(null);
const hasManualRequirementSelection = ref<boolean>(false);
const templateDetailsLoading = ref<boolean>(false);
const templateFindingDetails = ref<TemplateFindingDetail[]>([]);
const findingClassificationsCache = ref<Record<number, ApiFindingClassificationLite[]>>({});
const currentReportId = ref<number | null>(null);
const currentReportVersion = ref<number | null>(null);
const lastSaveStatus = ref<ReportSubmissionStatus | null>(null);
const saveSubmissionLoading = ref<boolean>(false);
const saveWarnings = ref<string[]>([]);
const lastHistoryContext = ref<Record<string, unknown> | null>(null);
const lastRequirementGuidance = ref<Record<string, unknown> | null>(null);
const lastPersistedArtifacts = ref<SaveReportSubmissionResponse['persistedArtifacts']>(null);
const localFindingClassificationSelections = ref<Record<number, Record<number, number>>>({});
const addedFindingIds = ref<Set<number>>(new Set());
const previousReportTextsLoading = ref<boolean>(false);
const previousReportTexts = ref<PreviousReportTextEntry[]>([]);

const currentStep = ref(1);
const goToStep = (step: number) => {
  currentStep.value = Math.min(Math.max(step, 1), 4);
};

// --- Computed from Store ---

const patients = computed(() => {
  const result = patientStore.patientsWithDisplayName;
  console.log('Patients with displayName:', result); // Zum Debuggen
  return result;
});
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => {
  const result = examinationStore.examinationsDropdown;
  console.log('Examinations dropdown:', result); // Debug: Check available examinations
  return result;
});
const isLoadingExaminations = computed(() => examinationStore.loading);

// --- Computed from Local State ---
const requirementSets = computed<RequirementSetLite[]>(() => {
  const sets = lookup.value?.requirementSets ?? [];
  console.log('Computing requirementSets:', sets); // Debug log
  return sets;
});
const selectedRequirementSetIds = computed<number[]>({
  get: () => lookup.value?.selectedRequirementSetIds ?? [],
  set: (val) => { if (lookup.value) lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed<number[]>(() => lookup.value?.availableFindings ?? []);
const findingsSectionLoading = computed(() => findingSelectorsLoading.value || loading.value);
const templateDetailSummary = computed(() => {
  const totalFindings = templateFindingDetails.value.length;
  const matchedFindings = templateFindingDetails.value.filter((d) => !!d.matchedFinding).length;
  return { totalFindings, matchedFindings };
});

const watchingLookup = ref(false);
watch(lookup, (newVal, oldVal) => {
  if (watchingLookup.value) return; // Prevent recursive calls
  watchingLookup.value = true;
  console.log('Lookup changed:', { newVal, oldVal });
  if (newVal && newVal.patientExaminationId !== currentPatientExaminationId.value) {
    currentPatientExaminationId.value = newVal.patientExaminationId;
    console.log('Updated currentPatientExaminationId to:', currentPatientExaminationId.value);
  }
  watchingLookup.value = false;
}, { deep: true });

const watchingRequirementSetIds = ref(false);
watch(selectedRequirementSetIds, (newVal, oldVal) => {
  if (watchingRequirementSetIds.value) return; // Prevent recursive calls
  watchingRequirementSetIds.value = true;
  console.log('Selected Requirement Set IDs changed:', { newVal, oldVal });
  if (newVal !== oldVal) {
    // Trigger evaluation when selected sets change
    requirementStore.setCurrentRequirementSetIds(newVal);
  }
  // Removed: requirementStore.deleteRequirementSetById(oldVal[0]); // This was incorrect and caused issues
  watchingRequirementSetIds.value = false;
});

const watchingPatientExaminationIds = ref(false);
watch(currentPatientExaminationId, (newVal, oldVal) => {
  if (watchingPatientExaminationIds.value) return; // Prevent recursive calls
  watchingPatientExaminationIds.value = true;
  console.log('Current Examination ID changed:', { newVal, oldVal });
  if (newVal !== oldVal) {
    // Trigger evaluation when examination changes
    patientExaminationStore.setCurrentPatientExaminationId(newVal);
  }
  watchingPatientExaminationIds.value = false;
});

const selectionsPretty = computed(() => JSON.stringify({
  token: lookupToken.value,
  selectedRequirementSetIds: selectedRequirementSetIds.value,
}, null, 2));

const normalizeKey = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const fetchFindingClassificationsCached = async (
  findingId: number
): Promise<ApiFindingClassificationLite[]> => {
  const cached = findingClassificationsCache.value[findingId];
  if (cached) return cached;

  const normalized = await findingsApi.getFindingClassifications(findingId);

  findingClassificationsCache.value = {
    ...findingClassificationsCache.value,
    [findingId]: normalized
  };
  return normalized;
};

const resolvePatientExaminationId = (): number | null => {
  if (lookup.value?.patientExaminationId) return lookup.value.patientExaminationId;
  return currentPatientExaminationId.value;
};

const refreshAddedFindingIds = async (): Promise<void> => {
  const patientExaminationId = resolvePatientExaminationId();
  if (!patientExaminationId) {
    addedFindingIds.value = new Set();
    return;
  }

  try {
    await ensurePatientFindingsLoaded(patientExaminationId);
    addedFindingIds.value = new Set<number>(getAttachedFindingIds(patientExaminationId));
  } catch (e) {
    console.warn('Failed to refresh added findings state:', axiosError(e));
  }
};

const getTimelinePatientExaminationId = (item: TimelineItemRow): number | null => {
  if (Number.isFinite(item.patientExaminationId)) return Number(item.patientExaminationId);
  const nestedId = Number(item.patientExamination?.id);
  return Number.isFinite(nestedId) ? nestedId : null;
};

const formatTimelineDate = (value: string | null): string => {
  if (!value) return 'ohne Datum';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString('de-DE');
};

const fetchPreviousReportTexts = async (): Promise<void> => {
  if (!selectedPatientId.value) {
    previousReportTexts.value = [];
    return;
  }

  previousReportTextsLoading.value = true;
  try {
    const timelineRes = await axiosInstance.get(
      r(endpoints.media.patientTimeline(selectedPatientId.value))
    );
    const rows = (Array.isArray(timelineRes.data?.results) ? timelineRes.data.results : timelineRes.data) as TimelineItemRow[];
    const currentExamId = currentPatientExaminationId.value;
    const entries = (Array.isArray(rows) ? rows : [])
      .map((item, index) => {
        const text = String(item?.anonymizedText || item?.text || '').trim();
        if (!text) return null;

        const mediaType = item?.mediaType ? String(item.mediaType).toLowerCase() : null;
        const looksLikeReport =
          !mediaType ||
          mediaType.includes('report') ||
          mediaType.includes('pdf') ||
          mediaType.includes('document');
        if (!looksLikeReport) return null;

        const patientExaminationId = getTimelinePatientExaminationId(item);
        const id = Number(item?.id);
        return {
          id: Number.isFinite(id) ? id : index + 1,
          mediaType,
          createdAt: item?.createdAt || null,
          documentType:
            typeof item?.documentType === 'string' && item.documentType.trim().length > 0
              ? item.documentType
              : null,
          patientExaminationId,
          text
        } as PreviousReportTextEntry;
      })
      .filter((entry): entry is PreviousReportTextEntry => !!entry)
      .filter((entry) => entry.patientExaminationId == null || entry.patientExaminationId !== currentExamId)
      .sort((a, b) => {
        const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTs - aTs;
      })
      .slice(0, 8);

    previousReportTexts.value = entries;
  } catch (e) {
    previousReportTexts.value = [];
    console.warn('Failed to fetch previous report texts:', axiosError(e));
  } finally {
    previousReportTextsLoading.value = false;
  }
};

const refreshTemplateFindingDetails = async (): Promise<void> => {
  if (!reportTemplate.value || !selectedExaminationId.value) {
    templateFindingDetails.value = [];
    return;
  }

  templateDetailsLoading.value = true;
  try {
    const examinationFindings = (await findingsApi.getExaminationFindings(
      selectedExaminationId.value
    )) as ApiFindingLite[];

    const byName = new Map<string, ApiFindingLite>();
    for (const finding of examinationFindings) {
      if (finding.name) byName.set(normalizeKey(finding.name), finding);
      if (finding.nameDe) byName.set(normalizeKey(finding.nameDe), finding);
    }

    let currentAddedFindingIds = new Set<number>(addedFindingIds.value);
    if (currentPatientExaminationId.value && currentAddedFindingIds.size === 0) {
      await refreshAddedFindingIds();
      currentAddedFindingIds = new Set<number>(addedFindingIds.value);
    }

    const details: TemplateFindingDetail[] = [];

    for (const section of reportTemplate.value.reportSections || []) {
      for (const finding of section.findings || []) {
        const templateName = finding.finding || '';
        const matched = byName.get(normalizeKey(templateName)) || null;
        const templateClassifications = (finding.classifications || []).map(
          (c) => c.classification
        );
        const requiredTemplateClassifications = (finding.classifications || [])
          .filter((c) => !!c.required)
          .map((c) => c.classification);

        let apiClassifications: string[] = [];
        if (matched) {
          const classes = await fetchFindingClassificationsCached(matched.id);
          apiClassifications = classes.map((c) => getClassificationDisplayName(c));
        }

        const apiClassificationKeySet = new Set(
          apiClassifications.map((name) => normalizeKey(name))
        );
        const missingRequiredClassifications = requiredTemplateClassifications.filter(
          (requiredName) => !apiClassificationKeySet.has(normalizeKey(requiredName))
        );

        details.push({
          sectionName: section.name,
          templateFindingName: templateName,
          templateClassifications,
          requiredTemplateClassifications,
          apiClassifications,
          missingRequiredClassifications,
          isAddedToPatientExamination:
            matched !== null &&
            currentAddedFindingIds.has(matched.id),
          matchedFinding: matched
            ? {
                id: matched.id,
                displayName: getFindingDisplayName(matched),
                description: matched.description
              }
            : null
        });
      }
    }

    templateFindingDetails.value = details;
  } catch (e) {
    templateFindingDetails.value = [];
    console.warn('Failed to enrich template detail data:', axiosError(e));
  } finally {
    templateDetailsLoading.value = false;
  }
};

const makeSelectionKey = (token: string | null, templateName: string): string =>
  `${token || 'no-token'}::${templateName}`;

const collectTemplateFindingNames = (template: ReportTemplatePayload): Set<string> => {
  const names = new Set<string>();
  for (const section of template.reportSections || []) {
    for (const finding of section.findings || []) {
      if (finding?.finding) {
        names.add(normalizeKey(finding.finding));
      }
    }
  }
  return names;
};

const getMatchingRequirementSetIdsFromTemplate = (
  template: ReportTemplatePayload
): number[] => {
  const findingNames = collectTemplateFindingNames(template);
  if (!findingNames.size) {
    return [];
  }

  const matching = (lookup.value?.requirementSets || []).filter((set) => {
    if (findingNames.has(normalizeKey(set.name)) || findingNames.has(normalizeKey(set.type || ''))) {
      return true;
    }

    const requirementsForSet = lookup.value?.requirementsBySet?.[String(set.id)] || [];
    return requirementsForSet.some((req: RequirementLite) =>
      findingNames.has(normalizeKey(req.name))
    );
  });

  return matching.map((s) => s.id);
};

const sameIdSet = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const aa = new Set(a);
  if (aa.size !== b.length) return false;
  for (const id of b) {
    if (!aa.has(id)) return false;
  }
  return true;
};

const applyTemplateToRequirementSelection = async (): Promise<void> => {
  if (!lookupToken.value || !reportTemplate.value || !lookup.value) return;
  if (hasManualRequirementSelection.value) return;

  const selectionKey = makeSelectionKey(lookupToken.value, reportTemplate.value.name);
  if (autoSelectionAppliedKey.value === selectionKey) return;

  const matchedSetIds = getMatchingRequirementSetIdsFromTemplate(reportTemplate.value);
  if (!matchedSetIds.length) {
    autoSelectionAppliedKey.value = selectionKey;
    return;
  }

  if (!sameIdSet(selectedRequirementSetIds.value, matchedSetIds)) {
    selectedRequirementSetIds.value = matchedSetIds;
    requirementStore.setCurrentRequirementSetIds(matchedSetIds);
    await patchLookup({ selectedRequirementSetIds: matchedSetIds });
    await triggerRecompute();
    await evaluateRequirementsOnChange();
  }

  autoSelectionAppliedKey.value = selectionKey;
};



// --- Finding Management Methods ---
const isFindingAddedToExamination = (findingId: number): boolean => {
  if (addedFindingIds.value.has(findingId)) return true;
  return isFindingAttached(lookup.value?.patientExaminationId ?? null, findingId);
};


const onFindingAddedToExamination = async (
  findingIdOrData: number | {
    findingId: number;
    findingName?: string;
    selectedClassifications: any[];
    response: any;
  },
  findingName?: string
) => {
  // Handle both old and new signatures
  let findingId: number;
  let name: string;
  let selectedClassifications: Array<{ classification: number; choice: number | null }> = [];
  let response: unknown = null;

  if (typeof findingIdOrData === 'number') {
    // Old signature: (findingId: number, findingName: string)
    findingId = findingIdOrData;
    name = getFindingNameById(findingId, findingName);
  } else {
    // New signature: (data: { findingId, findingName?, selectedClassifications, response })
    findingId = findingIdOrData.findingId;
    name = getFindingNameById(findingId, findingIdOrData.findingName);
    selectedClassifications = findingIdOrData.selectedClassifications || [];
    response = findingIdOrData.response;
  }

  console.log('Finding added to examination:', {
    findingId,
    name,
    selectedClassifications: selectedClassifications.length,
    hasResponse: !!response
  });

  // Enhanced success message with classification info
  const classificationCount = selectedClassifications.length;
  const message = classificationCount > 0
    ? `Befund "${name}" wurde erfolgreich hinzugefügt mit ${classificationCount} Klassifikation${classificationCount !== 1 ? 'en' : ''}!`
    : `Befund "${name}" wurde erfolgreich hinzugefügt!`;

  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = null;
  }, 5000); // Longer display for more detailed message

  await refreshAddedFindingIds();
  await refreshTemplateFindingDetails();
  await fetchPreviousReportTexts();

  // Trigger requirement evaluation after finding is added
  setTimeout(() => {
    evaluateRequirementsOnChange();
  }, 500); // Small delay to ensure finding is fully added
};

const onClassificationUpdated = (findingId: number, classificationId: number, choiceId: number | null) => {
  // Handle when a classification choice is updated
  console.log('Classification updated:', { findingId, classificationId, choiceId });

  const next = { ...localFindingClassificationSelections.value };
  const findingSelections = { ...(next[findingId] || {}) };
  if (choiceId == null) {
    delete findingSelections[classificationId];
  } else {
    findingSelections[classificationId] = choiceId;
  }
  if (Object.keys(findingSelections).length) {
    next[findingId] = findingSelections;
  } else {
    delete next[findingId];
  }
  localFindingClassificationSelections.value = next;

  // Get finding and classification names for better user feedback
  const findingName = getFindingNameById(findingId);

  // Show success message
  const message = choiceId
    ? `Klassifikation für "${findingName}" wurde erfolgreich ausgewählt!`
    : `Klassifikation für "${findingName}" wurde zurückgesetzt!`;

  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = null;
  }, 3000);

  // Trigger requirement evaluation after classification update
  setTimeout(() => {
    evaluateRequirementsOnChange();
  }, 300); // Small delay to ensure update is processed
};

const loadFindingsData = async () => {
  // Load all findings data if not already loaded
  await ensureCatalogLoaded();
  await ensurePatientFindingsLoaded(resolvePatientExaminationId());
  await refreshAddedFindingIds();
};

// --- Requirement Evaluation Methods ---

// Evaluate requirements when findings are added/removed
const evaluateRequirementsOnChange = async () => {
  if (!lookup.value || !lookupToken.value) {
    console.log('Skipping evaluation: lookup or token not available');
    return;
  }

  if (!lookup.value.patientExaminationId) {
    console.log('Skipping evaluation: patientExaminationId not available in lookup', lookup.value);
    return;
  }

  try {
    console.log('Evaluating requirements based on current lookup data...');

    // Use the requirement store to evaluate from lookup data
    await requirementStore.evaluateFromLookupData(lookup.value);

    // Update UI with evaluation results
    console.log('Requirements evaluated successfully');

    // Show success message
    successMessage.value = 'Anforderungen wurden erfolgreich evaluiert!';
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);

  } catch (err) {
    console.error('Error evaluating requirements:', err);
    error.value = 'Fehler bei der Evaluierung der Anforderungen: ' + (err instanceof Error ? err.message : String(err));
  }
};

// Evaluate specific requirement set
const evaluateRequirementSet = async (requirementSetId: number) => {
  if (!lookup.value || !lookupToken.value) return;

  try {
    console.log('Evaluating requirement set:', requirementSetId);

    // Use the requirement store to evaluate specific requirement set
    await requirementStore.evaluateRequirementSet(requirementSetId, lookup.value.patientExaminationId);

    console.log('Requirement set evaluated successfully');

  } catch (err) {
    console.error('Error evaluating requirement set:', err);
    error.value = 'Fehler bei der Evaluierung des Anforderungssets: ' + (err instanceof Error ? err.message : String(err));
  }
};

// Get evaluation status for a requirement set
const getRequirementSetEvaluationStatus = (requirementSetId: number) => {
  return requirementStore.getRequirementSetEvaluationStatus(requirementSetId);
};

// Get evaluation status for a specific requirement
const getRequirementEvaluationStatus = (requirementId: number) => {
  return requirementStore.getRequirementEvaluationStatus(requirementId);
};

// Computed properties for evaluation status
const evaluationSummary = computed(() => {
  if (!lookup.value) return null;

  const totalSets = requirementSets.value.length;
  const evaluatedSets = requirementSets.value.filter(rs =>
    requirementStore.getRequirementSetEvaluationStatus(rs.id)
  ).length;

  return {
    totalSets,
    evaluatedSets,
    completionPercentage: totalSets > 0 ? Math.round((evaluatedSets / totalSets) * 100) : 0
  };
});

// --- Methods ---
function axiosError(e: any): string {
  if (e?.response?.data?.detail) return e.response.data.detail;
  if (e?.message) return e.message;
  return 'Unbekannter Fehler';
}

const buildPatientDataPayload = (): SaveReportSubmissionRequest['patientData'] => {
  const patient = selectedPatientId.value ? patientStore.getPatientById(selectedPatientId.value) : null;
  if (!patient) return {};

  return {
    patientBirthDate: formatDateOnly(patient.dob),
    patientGender: patient.gender || null,
    firstName: patient.firstName || null,
    lastName: patient.lastName || null,
    center: (patient as any).center || null
  };
};

const fetchNormalizedFindingsPayload = async (): Promise<SaveReportSubmissionRequest['findings']> => {
  if (!currentPatientExaminationId.value) return [];

  try {
    const rows = (await findingsApi.listPatientFindings(
      currentPatientExaminationId.value
    )) as PatientFindingApiRow[];
    const normalizedRows: Array<SaveReportSubmissionRequest['findings'][number] | null> = (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const findingId = extractFindingId(row?.finding);
        const isInactive = row?.isActive === false || (row as { is_active?: boolean })?.is_active === false;
        if (findingId == null || isInactive) return null;
        return {
          finding: findingId,
          classifications: mergeClassificationSelections(
            findingId,
            row.classifications,
            localFindingClassificationSelections.value
          ),
          interventions: normalizeInterventions(row.interventions)
        };
      });
    return normalizedRows.filter((row): row is SaveReportSubmissionRequest['findings'][number] => row !== null);
  } catch (e) {
    console.warn('Failed to fetch patient-findings for report save, falling back to examination findings:', axiosError(e));
  }

  try {
    const res = await axiosInstance.get(
      r(endpoints.examination.patientExaminationFindings(currentPatientExaminationId.value))
    );
    const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data) as Array<{ id?: number }>;
    return (Array.isArray(rows) ? rows : [])
      .map((row) => Number(row?.id))
      .filter((id) => Number.isFinite(id))
      .map((findingId) => ({
        finding: findingId,
        classifications: mergeClassificationSelections(
          findingId,
          undefined,
          localFindingClassificationSelections.value
        ),
        interventions: []
      }));
  } catch (e) {
    console.warn('Fallback findings fetch also failed:', axiosError(e));
    return [];
  }
};

const buildEditorPayloadForSubmission = () => ({
  source: 'assisted_reporting',
  lookupToken: lookupToken.value,
  selectedRequirementSetIds: selectedRequirementSetIds.value,
  templateName: reportTemplate.value?.name || null,
  savedAt: new Date().toISOString()
});

const buildRenderedTextForSubmission = (): string => {
  // No structured report text editor is wired here yet; keep rendered text empty for now.
  return '';
};

async function saveReportSubmission(status: ReportSubmissionStatus) {
  if (!currentPatientExaminationId.value) {
    error.value = 'Keine Patientenuntersuchung ausgewählt.';
    return;
  }
  if (!reportTemplate.value?.name) {
    error.value = 'Kein Report-Template ausgewählt.';
    return;
  }

  error.value = null;
  saveSubmissionLoading.value = true;
  lastSaveStatus.value = status;

  try {
    const findings = await fetchNormalizedFindingsPayload();
    const payload: SaveReportSubmissionRequest = {
      ...(currentReportId.value ? { reportId: currentReportId.value } : {}),
      ...(currentReportVersion.value ? { expectedVersion: currentReportVersion.value } : {}),
      patientExaminationId: currentPatientExaminationId.value,
      templateName: reportTemplate.value.name,
      status,
      editorPayload: buildEditorPayloadForSubmission(),
      renderedText: buildRenderedTextForSubmission(),
      patientData: buildPatientDataPayload(),
      indications: [],
      findings,
      selectedRequirementSetIds: selectedRequirementSetIds.value
    };

    const res = await axiosInstance.post<SaveReportSubmissionResponse>(
      r(endpoints.report.saveReportSubmission),
      payload
    );
    const data = res.data;

    currentReportId.value = data.report.id;
    currentReportVersion.value = data.report.version;
    lastSaveStatus.value = (data.report.status as ReportSubmissionStatus) || status;
    saveWarnings.value = Array.isArray(data.warnings) ? data.warnings : [];
    lastHistoryContext.value = (data.historyContext || null) as Record<string, unknown> | null;
    lastRequirementGuidance.value = (data.requirementGuidance || null) as Record<string, unknown> | null;
    lastPersistedArtifacts.value = data.persistedArtifacts || null;

    const verb = data.created ? 'erstellt' : 'aktualisiert';
    successMessage.value = `Bericht wurde als ${status === 'final' ? 'final' : 'Entwurf'} ${verb} (Version ${data.report.version}).`;
    setTimeout(() => {
      if (successMessage.value?.includes('Bericht wurde')) successMessage.value = null;
    }, 4000);
  } catch (e: any) {
    const versionConflictMessage = e?.response?.data?.expectedVersion;
    if (typeof versionConflictMessage === 'string' && versionConflictMessage.toLowerCase().includes('version conflict')) {
      error.value = `Versionskonflikt beim Speichern: ${versionConflictMessage}`;
    } else {
      error.value = `Fehler beim Speichern des Berichts: ${axiosError(e)}`;
    }
  } finally {
    saveSubmissionLoading.value = false;
  }
}

function applyLookup(partial: Partial<LookupDict>) {
  if (!lookup.value) {
    lookup.value = partial as LookupDict;
  } else {
    lookup.value = { ...lookup.value, ...partial };
  }
}

async function fetchReportTemplateByName(moduleName: string, templateName: string) {
  reportTemplateLoading.value = true;
  try {
    const res = await axiosInstance.get(
      `${REPORT_TEMPLATE_BASE}/${moduleName}/${templateName}`
    );
    reportTemplate.value = res.data as ReportTemplatePayload;
    if (
      reportTemplate.value &&
      !reportTemplateOptions.value.some((t) => t.name === reportTemplate.value!.name)
    ) {
      reportTemplateOptions.value = [reportTemplate.value, ...reportTemplateOptions.value];
    }
    await refreshTemplateFindingDetails();
  } catch (e) {
    reportTemplate.value = null;
    templateFindingDetails.value = [];
    console.warn('Failed to fetch report template by name:', axiosError(e));
  } finally {
    reportTemplateLoading.value = false;
  }
}

async function fetchReportTemplateByExamination(
  moduleName: string,
  examinationName: string
) {
  if (!examinationName) {
    reportTemplate.value = null;
    reportTemplateOptions.value = [];
    return;
  }

  reportTemplateLoading.value = true;
  try {
    const res = await axiosInstance.get(
      `${REPORT_TEMPLATE_BASE}/by-examination/${moduleName}/${encodeURIComponent(examinationName)}`
    );
    const templates = Array.isArray(res.data)
      ? (res.data as ReportTemplatePayload[])
      : [];
    reportTemplateOptions.value = templates;

    const selected = templates.find((t) => t.name === selectedTemplateName.value);
    reportTemplate.value = selected || (templates.length ? templates[0] : null);
    if (reportTemplate.value) {
      selectedTemplateName.value = reportTemplate.value.name;
    }
    await refreshTemplateFindingDetails();
  } catch (e) {
    reportTemplate.value = null;
    reportTemplateOptions.value = [];
    templateFindingDetails.value = [];
    console.warn('Failed to fetch report template by examination:', axiosError(e));
  } finally {
    reportTemplateLoading.value = false;
  }
}

const onTemplateSelectionChange = async () => {
  if (!selectedTemplateName.value) {
    reportTemplate.value = null;
    return;
  }
  const local = reportTemplateOptions.value.find(
    (t) => t.name === selectedTemplateName.value
  );
  if (local) {
    reportTemplate.value = local;
    return;
  }
  await fetchReportTemplateByName(selectedKbModule.value, selectedTemplateName.value);
};

async function createPatientExaminationAndInitLookup() {
  if (isRestarting.value) {
    console.log('Restart already in progress, skipping createPatientExaminationAndInitLookup...');
    return;
  }
  
  if (!selectedPatientId.value || !selectedExaminationId.value) {
    console.error('Missing required selections:', {
      selectedPatientId: selectedPatientId.value,
      selectedExaminationId: selectedExaminationId.value
    });
    error.value = "Bitte wählen Sie sowohl einen Patienten als auch eine Untersuchung aus.";
    return;
  }

  const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
  if (!selectedExam) {
    console.error('Selected examination not found in dropdown:', {
      selectedExaminationId: selectedExaminationId.value,
      availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
    });
    error.value = "Ausgewählte Untersuchung nicht gefunden.";
    return;
  }

  console.log('Creating PatientExamination with:', {
    patientId: selectedPatientId.value,
    examinationName: selectedExam.name,
    examinationId: selectedExam.id
  });

  error.value = null;
  loading.value = true;
  try {
    // Step 1: Create PatientExamination
    const formattedDate = new Date().toISOString().split('T')[0];
    
    // Get the selected patient to obtain the patient hash
    const selectedPatient = patientStore.getPatientById(selectedPatientId.value!);
    if (!selectedPatient) {
      throw new Error('Selected patient not found');
    }
    
    // Get the selected examination name
    const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
    if (!selectedExam) {
      throw new Error('Selected examination not found');
    }
    
    // Format patient birth date for backend (ISO date format)
    const formattedBirthDate = selectedPatient.dob 
      ? new Date(selectedPatient.dob).toISOString().split('T')[0] 
      : null;
    
    const peRes = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
      patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
      examination: selectedExam.name,
      date_start: formattedDate, // Fixed field name
      // 🎯 NEW: Include patient birth date and gender for age calculation
      patient_birth_date: formattedBirthDate,
      patient_gender: selectedPatient.gender || null,
    });

    patientExaminationStore.addPatientExamination(peRes.data as PatientExamination);

    console.log('PatientExamination created:', peRes.data);
    currentPatientExaminationId.value = peRes.data.id;

    // Step 2: Init lookup with the new PatientExamination ID
    const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
      patientExaminationId: currentPatientExaminationId.value
    });
    lookupToken.value = initRes.data.token;
    
    console.log('Lookup initialized with token:', lookupToken.value);
    
    // Start heartbeat for token renewal
    startHeartbeat();
    
    // Step 3: Load findings data
    await loadFindingsData();
    
    // Step 4: Fetch all lookup data (without recomputation)
    await fetchLookupAll();
    
    currentStep.value = Math.max(currentStep.value, 2);
    
    // Step 5: No automatic recompute - let user select requirement sets first
  } catch (e) {
    error.value = axiosError(e);
  } finally {
    loading.value = false;
  }
}

async function fetchLookupAll() {
  if (!lookupToken.value) return;
  error.value = null;
  loading.value = true;
  try {
    const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/all/?skip_recompute=true`);
    console.log('Lookup API response:', res.data); // Debug log
    applyLookup(res.data);
  } catch (e: any) {
    // Handle token expiration
    if (e?.response?.status === 404) {
      error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
      lookupToken.value = null;
      lookup.value = null;
      stopHeartbeat();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
      
      // Try to automatically restart the session
      const restarted = await restartLookupSession();
      if (!restarted) {
        error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
      }
    } else {
      error.value = axiosError(e);
    }
  } finally {
    loading.value = false;
  }
}

async function fetchLookupParts(keys: string[]) {
  if (!lookupToken.value || !keys.length) return;
  error.value = null;
  loading.value = true;
  const qs = encodeURIComponent(keys.join(','));
  try {
    const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=${qs}`);
    applyLookup(res.data);
  } catch (e: any) {
    // Handle token expiration
    if (e?.response?.status === 404) {
      error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
      lookupToken.value = null;
      lookup.value = null;
      stopHeartbeat();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
      
      // Try to automatically restart the session
      const restarted = await restartLookupSession();
      if (!restarted) {
        error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
      }
    } else {
      error.value = axiosError(e);
    }
  } finally {
    loading.value = false;
  }
}

async function patchLookup(updates: Record<string, any>) {
  if (!lookupToken.value) return;
  try {
    await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates });
    await fetchLookupParts(['availableFindings', 'requiredFindings']);
  } catch (e: any) {
    // Handle token expiration
    if (e?.response?.status === 404) {
      error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie erneut.';
      lookupToken.value = null;
      lookup.value = null;
      stopHeartbeat();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
    } else {
      error.value = axiosError(e);
    }
  }
}

function toggleRequirementSet(id: number, on: boolean) {
  hasManualRequirementSelection.value = true;
  const s = new Set(selectedRequirementSetIds.value);
  if (on) s.add(id); else s.delete(id);
  selectedRequirementSetIds.value = Array.from(s);
  patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
  requirementStore.setCurrentRequirementSetIds(selectedRequirementSetIds.value);
  
  // Trigger recomputation when requirement sets change
  if (lookupToken.value) {
    triggerRecompute();
  }
}

async function triggerRecompute() {
  if (patientStore.currentPatient && patientStore.currentPatient.id !== selectedPatientId.value) {
    console.warn('Selected patient ID does not match patient store name. Reloading...');
    // Reload Token Value to update Requirment Sets etc. to seleccted patient
  }
  if (!lookupToken.value) return;

  try {
    console.log('Triggering recomputation for selected requirement sets:', selectedRequirementSetIds.value);
    const res = await axiosInstance.post(`${LOOKUP_BASE}/${lookupToken.value}/recompute/`);
    console.log('Recompute response:', res.data);

    // Update local lookup data with recomputed results
    if (res.data.updates) {
      applyLookup(res.data.updates);
    }

    // Fetch fresh data to get the complete updated state
    await fetchLookupAll();

    // Trigger requirement evaluation after recomputation
    if (selectedRequirementSetIds.value.length > 0) {
      await evaluateRequirementsOnChange();
    }
  } catch (e: any) {
    console.error('Error during recomputation:', e);
    error.value = 'Fehler bei der Neuberechnung: ' + axiosError(e);
  }
}

function closeCreatePatientModal() {
  showCreatePatientModal.value = false;
  // Store-Fehler löschen beim Schließen
  patientStore.clearError();
}

function onPatientCreated(patient: Patient) {
  // Patient wurde erfolgreich erstellt - automatisch auswählen
  selectedPatientId.value = patient.id || null;
  
  // Modal schließen
  showCreatePatientModal.value = false;
  
  // Store-Fehler löschen (falls vorhanden)
  patientStore.clearError();
  
  // Erfolgsmeldung anzeigen
  successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich erstellt und ausgewählt!`;
  
  // Nach 5 Sekunden ausblenden
  setTimeout(() => {
    successMessage.value = null;
  }, 5000);
}

async function validateToken(): Promise<boolean> {
  if (!lookupToken.value) return false;
  
  try {
    // Try to fetch a small part to validate token
    await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`);
    return true;
  } catch (e: any) {
    if (e?.response?.status === 404) {
      // Token expired - trigger restart
      console.log('Token validation failed with 404, attempting restart...');
      lookupToken.value = null;
      lookup.value = null;
      error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
      
      // Try to restart the session
      const restarted = await restartLookupSession();
      if (!restarted) {
        error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
      }
      return false;
    }
    return false;
  }
}

async function renewLookupSession() {
  if (!lookupToken.value || !currentPatientExaminationId.value) return;
  
  try {
    // Renew the token by updating it with current data
    const currentData = lookup.value;
    if (currentData) {
      await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { 
        updates: currentData 
      });
    }
  } catch (e: any) {
    console.warn('Failed to renew lookup sitzung:', e);
    // Don't show error to user, just log it
  }
}

function manualRenewSession() {
  if (!lookupToken.value) return;
  loading.value = true;
  error.value = null;
  axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`)
    .then(() => {
      return axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates: {} });
    })
    .then(() => {
      fetchLookupAll();
    })
    .catch((e: any) => {
      error.value = axiosError(e);
      if (e?.response?.status === 404) {
        // Token expired
        lookupToken.value = null;
        lookup.value = null;
        error.value = 'Lookup-Session ist abgelaufen. Bitte starten Sie erneut.';
        stopHeartbeat();
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

function resetLookupSession() {
  lookupToken.value = null;
  lookup.value = null;
  currentPatientExaminationId.value = null;
  addedFindingIds.value = new Set();
  currentReportId.value = null;
  currentReportVersion.value = null;
  lastSaveStatus.value = null;
  saveWarnings.value = [];
  lastHistoryContext.value = null;
  lastRequirementGuidance.value = null;
  lastPersistedArtifacts.value = null;
  error.value = null;
  successMessage.value = null;
  stopHeartbeat();
  
  // Clear localStorage
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
}

async function resetSessionForNewPatient(): Promise<void> {
  console.log('Resetting session for new patient...');

  // Clear current session state
  lookupToken.value = null;
  lookup.value = null;
  currentPatientExaminationId.value = null;
  addedFindingIds.value = new Set();
  previousReportTexts.value = [];
  currentReportId.value = null;
  currentReportVersion.value = null;
  lastSaveStatus.value = null;
  saveWarnings.value = [];
  lastHistoryContext.value = null;
  lastRequirementGuidance.value = null;
  lastPersistedArtifacts.value = null;
  error.value = null;
  successMessage.value = null;
  stopHeartbeat();

  // Clear localStorage
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);

  // Clear requirement store state
  requirementStore.reset();

  console.log('Session reset complete for new patient');
}

async function restartLookupSession(): Promise<boolean> {
  if (isRestarting.value) {
    console.log('Restart already in progress, skipping...');
    return false;
  }
  
  console.log('Attempting to restart lookup session...');
  isRestarting.value = true;
  
  try {
    // Reset current session state
    lookupToken.value = null;
    lookup.value = null;
    stopHeartbeat();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we have an existing patient examination
    if (currentPatientExaminationId.value && selectedPatientId.value && selectedExaminationId.value) {
      // Reuse existing patient examination - just reinitialize lookup
      console.log('Reusing existing patient examination:', currentPatientExaminationId.value);
      console.log('selectedPatientId:', selectedPatientId.value);
      console.log('selectedExaminationId:', selectedExaminationId.value);
      
      const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
        patientExaminationId: currentPatientExaminationId.value
      });
      lookupToken.value = initRes.data.token;
      
      // Start heartbeat for token renewal
      startHeartbeat();
      
      // Fetch all lookup data
      await fetchLookupAll();
      
      successMessage.value = 'Lookup-Session wurde erfolgreich neu gestartet!';
      setTimeout(() => {
        successMessage.value = null;
      }, 3000);
      
      return true;
    } else {
      // No existing patient examination, create new one
      console.log('No existing patient examination, creating new one');
      console.log('currentPatientExaminationId:', currentPatientExaminationId.value);
      console.log('selectedPatientId:', selectedPatientId.value);
      console.log('selectedExaminationId:', selectedExaminationId.value);
      
      if (!selectedPatientId.value || !selectedExaminationId.value) {
        error.value = 'Kann Session nicht automatisch neu starten: Patient oder Untersuchung fehlt.';
        return false;
      }
      
      await createPatientExaminationAndInitLookup();
      return true;
    }
  } catch (e: any) {
    console.error('Failed to restart lookup session:', e);
    error.value = 'Fehler beim Neustart der Lookup-Session: ' + axiosError(e);
    return false;
  } finally {
    isRestarting.value = false;
  }
}

// --- Heartbeat for token renewal ---
let heartbeatInterval: number | null = null;

function startHeartbeat() {
  if (heartbeatInterval) return;
  
  // Renew session every 15 minutes (quarter of TTL to be safe)
  heartbeatInterval = window.setInterval(async () => {
    if (lookupToken.value && !isRestarting.value) {
      // Validate token (this will trigger restart if needed)
      await validateToken();
    }
  }, 15 * 60 * 1000); // 15 minutes
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// --- Session management ---
const sessionWarningShown = ref(false);

function showSessionExpiryWarning() {
  if (!sessionWarningShown.value && lookupToken.value) {
    error.value = 'Hinweis: Ihre Lookup-Session läuft bald ab. Speichern Sie Ihre Arbeit.';
    sessionWarningShown.value = true;
    
    // Clear warning after 10 seconds
    setTimeout(() => {
      if (error.value === 'Hinweis: Ihre Lookup-Session läuft bald ab. Speichern Sie Ihre Arbeit.') {
        error.value = null;
      }
      sessionWarningShown.value = false;
    }, 10000);
  }
}

// --- Token persistence ---
const TOKEN_STORAGE_KEY = 'lookupToken';
const PATIENT_EXAM_STORAGE_KEY = 'currentPatientExaminationId';

// Load token from localStorage on component creation
const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
const savedPatientExamId = localStorage.getItem(PATIENT_EXAM_STORAGE_KEY);

if (savedToken) {
  lookupToken.value = savedToken;
}
if (savedPatientExamId) {
  currentPatientExaminationId.value = parseInt(savedPatientExamId);
}

// Save token to localStorage whenever it changes
watch(lookupToken, (newToken) => {
  if (newToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
});

watch(currentPatientExaminationId, (newId) => {
  if (newId) {
    localStorage.setItem(PATIENT_EXAM_STORAGE_KEY, newId.toString());
  } else {
    localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
    currentReportId.value = null;
    currentReportVersion.value = null;
    lastSaveStatus.value = null;
    saveWarnings.value = [];
    lastHistoryContext.value = null;
    lastRequirementGuidance.value = null;
    lastPersistedArtifacts.value = null;
  }
});

watch(
  currentPatientExaminationId,
  async (newId) => {
    if (newId) {
      await refreshAddedFindingIds();
      await refreshTemplateFindingDetails();
      await fetchPreviousReportTexts();
    } else {
      addedFindingIds.value = new Set();
    }
  },
  { immediate: true }
);

// --- Watchers ---
watch(selectedExaminationId, (newId) => {
  console.log('Examination selection changed:', {
    newId,
    selectedPatientId: selectedPatientId.value,
    availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
  });
  autoSelectionAppliedKey.value = null;
  hasManualRequirementSelection.value = false;
  examinationStore.setSelectedExamination(newId);
  if (newId) {
    examinationStore.loadFindingsForExamination(newId);
    const selectedExam = examinationsDropdown.value.find(exam => exam.id === newId);
    if (selectedExam?.name) {
      fetchReportTemplateByExamination(selectedKbModule.value, selectedExam.name);
    }
  } else {
    reportTemplate.value = null;
  }
});

watch(selectedPatientId, async (newPatientId, oldPatientId) => {
  console.log('Patient selection changed:', {
    oldPatientId,
    newPatientId,
    currentExaminationsCount: examinationsDropdown.value.length
  });

  // Reset examination selection when patient changes
  selectedExaminationId.value = null;

  // If patient actually changed (not just initialized), reset the session
  if (oldPatientId && newPatientId !== oldPatientId) {
    console.log('Patient changed, resetting session for new overview...');
    await resetSessionForNewPatient();
    autoSelectionAppliedKey.value = null;
    hasManualRequirementSelection.value = false;
  }

  if (newPatientId) {
    await fetchPreviousReportTexts();
  } else {
    previousReportTexts.value = [];
  }
});

// Watch for changes in selected requirement sets to trigger evaluation
watch(selectedRequirementSetIds, async (newIds, oldIds) => {
  if (newIds.length !== oldIds.length && lookup.value) {
    console.log('Requirement set selection changed, triggering evaluation...');
    await evaluateRequirementsOnChange();
  }
}, { deep: true });

// Watch for lookup data changes to trigger evaluation
watch(lookup, async (newLookup, oldLookup) => {
  if (newLookup && newLookup !== oldLookup && selectedRequirementSetIds.value.length > 0) {
    console.log('Lookup data changed, triggering evaluation...');
    // Debounce evaluation to avoid excessive API calls
    setTimeout(() => {
      evaluateRequirementsOnChange();
    }, 1000);
  }
}, { deep: true });

// Watch for lookup data changes to load requirement sets
watch(lookup, (newLookup) => {
  if (newLookup && newLookup.requirementsBySet) {
    console.log('Loading requirement sets from lookup data...');
    requirementStore.loadRequirementSetsFromLookup(newLookup);
    void applyTemplateToRequirementSelection();
  }
}, { immediate: true });

watch(reportTemplate, () => {
  void applyTemplateToRequirementSelection();
  void refreshTemplateFindingDetails();
});

watch(selectedTemplateName, async () => {
  await onTemplateSelectionChange();
});

watch(lookupToken, () => {
  autoSelectionAppliedKey.value = null;
  hasManualRequirementSelection.value = false;
});

// --- Lifecycle ---
onMounted(async () => {
  console.log('Component mounted, starting data loading...');
  
  // Patienten und Untersuchungen laden
  await Promise.all([
    patientStore.fetchPatients(),
    examinationStore.fetchExaminations()
  ]);
  
  console.log('Data loading completed:', {
    patientsCount: patients.value.length,
    examinationsCount: examinationsDropdown.value.length
  });
  
  // Nachschlagedaten für Patientenerstellung laden
  await patientStore.initializeLookupData();
  
  // Validate existing token if present (e.g., after page reload)
  if (lookupToken.value) {
    console.log('Validating existing token:', lookupToken.value);
    const isValid = await validateToken();
    if (!isValid) {
      lookupToken.value = null;
      lookup.value = null;
      currentPatientExaminationId.value = null; // Clear this too
      stopHeartbeat();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
    } else {
      // Token is valid, fetch current data and start heartbeat
      await fetchLookupAll();
      startHeartbeat();
    }
  }

  // Load findings data on component mount
  await loadFindingsData();
  await fetchReportTemplateByName(selectedKbModule.value, selectedTemplateName.value);
  await refreshAddedFindingIds();
  if (selectedPatientId.value) {
    await fetchPreviousReportTexts();
  }
});

onUnmounted(() => {
  stopHeartbeat();
});
</script>
<style scoped>
/* small UI niceties */

.vr {
  width: 1px;
  align-self: stretch;
  background-color: rgba(0,0,0,.1);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-dialog {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.modal-content {
  padding: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #dee2e6;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-body {
  padding: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.5;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  opacity: 0.75;
}

.btn-close::before {
  content: '×';
}

.alert-dismissible .btn-close {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  padding: 0.75rem 1.25rem;
}

/* FindingsDetail component styles */
.findings-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.previous-report-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
  max-height: 220px;
  overflow: auto;
}

/* Enhanced animations and transitions */
.card {
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.btn {
  transition: all 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

/* Status indicators */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.status-indicator.success {
  color: #198754;
}

.status-indicator.warning {
  color: #ffc107;
}

.status-indicator.error {
  color: #dc3545;
}

/* Loading states */
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

/* Form improvements */
.form-select:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.form-control:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}
</style>
