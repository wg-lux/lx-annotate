<template>
  <div class="requirement-generator container-fluid py-4">
    <div v-if="patientStore.error || error || examinationStore.error" class="alert alert-danger">
      <p v-if="patientStore.error">Patienten-Store Fehler: {{ patientStore.error }}</p>
      <p v-if="examinationStore.error">Untersuchungs-Store Fehler: {{ examinationStore.error }}</p>
      <p v-if="error">Lookup Fehler: {{ error }}</p>
    </div>

    <!-- Patient and Examination Selection -->
    <div class="card mb-3">
      <div class="card-header">
        <h2 class="h5 mb-0">1. Patient und Untersuchung auswählen</h2>
      </div>
      <div class="card-body">
        <div class="row align-items-end">
          <!-- Patient Selection -->
          <div class="col-md-6">
            <div class="form-group">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label for="patient-select">Patient auswählen</label>
                <div v-if="selectedPatientId" class="d-flex align-items-center gap-2">
                  <span class="badge bg-info">
                    <i class="fas fa-user"></i> Aktiv
                  </span>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    @click="patientStore.clearCurrentPatient()"
                    title="Patientenauswahl zurücksetzen"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <select
                id="patient-select"
                v-model="selectedPatientId"
                class="form-control"
                :disabled="isLoadingPatients || loading"
              >
                <option :value="null" disabled>
                  {{ isLoadingPatients ? 'Lade Patienten...' : 'Bitte wählen Sie einen Patienten' }}
                </option>
                <option v-for="patient in patients" :key="patient.id" :value="patient.id">
                  {{ patient.displayName }}
                </option>
              </select>
              <div v-if="selectedPatientId" class="mt-2">
                <small class="text-muted">
                  <i class="fas fa-info-circle"></i>
                  Bei Patientenwechsel wird automatisch eine neue Übersicht generiert.
                </small>
              </div>
            </div>
          </div>
          <!-- Examination Selection -->
          <div class="col-md-6">
            <div class="form-group">
              <label for="examination-select">Untersuchung auswählen</label>
              <select
                id="examination-select"
                v-model="selectedExaminationId"
                class="form-control"
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
          </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                 <button
                    class="btn btn-primary"
                    :disabled="!selectedPatientId || !selectedExaminationId || loading || !!lookupToken"
                    @click="createPatientExaminationAndInitLookup"
                  >
                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span v-if="!lookupToken">2. Anforderungsbericht erstellen</span>
                    <span v-else>Anforderungsbericht bereits aktiv</span>
                  </button>
            </div>
        </div>
      </div>
    </div>

    <!-- Lookup Data Display -->
    <div v-if="lookup" class="row g-3">
      <!-- Debug Info -->
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h2 class="h6 mb-0">Debug: Aktuelle Lookup-Daten</h2>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-4">
                <strong>Patient Examination ID:</strong> {{ lookup.patientExaminationId || 'Nicht verfügbar' }}
              </div>
              <div class="col-md-4">
                <strong>Token:</strong> {{ lookupToken }}
              </div>
              <div class="col-md-4">
                <strong>Requirement Sets:</strong> {{ requirementSets.length }}
              </div>
            </div>
            <div class="row mt-2">
              <div class="col-md-6">
                <strong>Ausgewählte Sets:</strong> {{ selectedRequirementSetIds.join(', ') || 'Keine' }}
              </div>
              <div class="col-md-6">
                <strong>Verfügbare Findings:</strong> {{ availableFindings.length }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Requirement Sets -->
      <div class="col-12 col-xl-6">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h2 class="h5 mb-0">3. Requirement Sets anpassen</h2>
              <small class="text-muted">Token: {{ lookupToken }}</small>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" @click="fetchLookupAll" :disabled="loading">
                Aktualisieren
              </button>
              <button class="btn btn-sm btn-outline-info" @click="triggerRecompute" :disabled="loading || !lookupToken">
                Neu berechnen
              </button>
              <button class="btn btn-sm btn-outline-info" @click="manualRenewSession" :disabled="loading || !lookupToken">
                Session erneuern
              </button>
              <button class="btn btn-sm btn-outline-danger" @click="resetLookupSession" :disabled="loading || !lookupToken">
                Session zurücksetzen
              </button>
            </div>
          </div>
          <div v-if="lookup" class="row g-3 mt-3 card-body pre-scrollable" style="max-height: 70vh; overflow: auto;">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h2 class="h5 mb-0">Befunde in der aktuellen Untersuchung</h2>
                    </div>
                    <div class="card-body">
                      <!-- AddableFindingsDetail Component für CRUD-Funktionalität -->
                      <AddableFindingsDetail
                          :examination-id="selectedExaminationId || undefined"
                          :patient-examination-id="currentPatientExaminationId || undefined"
                          @finding-added="onFindingAddedToExamination"
                          @finding-error="(errorMsg) => error = errorMsg"
                      />
                    </div>
                </div>
            </div>
        </div>

                    <ul class="list-group list-group-flush">
              <li v-for="rs in requirementSets" :key="rs.id" class="list-group-item d-flex justify-content-between align-items-center">
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-semibold">{{ rs.name }}</span>
                    <div class="d-flex align-items-center gap-2">
                      <!-- Evaluation Status Badge -->
                      <template v-if="getRequirementSetEvaluationStatus(rs.id)">
                        <span
                          class="badge"
                          :class="getRequirementSetEvaluationStatus(rs.id)!.met ? 'bg-success' : 'bg-warning'"
                        >
                          <i class="fas" :class="getRequirementSetEvaluationStatus(rs.id)!.met ? 'fa-check' : 'fa-exclamation-triangle'"></i>
                          {{ getRequirementSetEvaluationStatus(rs.id)!.met ? 'Erfüllt' : 'Nicht erfüllt' }}
                        </span>
                      </template>
                      <!-- Evaluate Button -->
                      <button
                        class="btn btn-sm btn-outline-info"
                        @click="evaluateRequirementSet(rs.id)"
                        :disabled="loading"
                        title="Anforderungsset evaluieren"
                      >
                        <i class="fas fa-calculator"></i>
                      </button>
                    </div>
                  </div>
                  <small class="text-muted d-block">type: {{ rs.type }}</small>
                  <!-- Evaluation Details -->
                  <div v-if="getRequirementSetEvaluationStatus(rs.id)" class="mt-2">
                    <small class="text-muted">
                      Erfüllte Anforderungen: {{ getRequirementSetEvaluationStatus(rs.id)?.metRequirementsCount }} /
                      {{ getRequirementSetEvaluationStatus(rs.id)?.totalRequirementsCount }}
                    </small>
                  </div>
                </div>
                <div class="form-check form-switch ms-3">
                  <input class="form-check-input" type="checkbox"
                         :checked="selectedRequirementSetIdSet.has(rs.id)"
                         @change="toggleRequirementSet(rs.id, ($event.target as HTMLInputElement).checked)" />
                </div>
              </li>
              <li v-if="!requirementSets.length" class="list-group-item text-muted">Keine Sets gefunden.</li>
            </ul>

            <!-- Evaluation Summary -->
            <div v-if="evaluationSummary && evaluationSummary.totalSets > 0" class="mt-3 p-3 bg-light rounded">
              <h6 class="mb-2">Evaluierungsübersicht</h6>
              <div class="progress mb-2" style="height: 10px;">
                <div
                  class="progress-bar"
                  :class="evaluationSummary.completionPercentage === 100 ? 'bg-success' : 'bg-info'"
                  :style="{ width: evaluationSummary.completionPercentage + '%' }"
                ></div>
              </div>
              <small class="text-muted">
                {{ evaluationSummary.evaluatedSets }} von {{ evaluationSummary.totalSets }} Sets evaluiert
                ({{ evaluationSummary.completionPercentage }}%)
              </small>
              <div class="mt-2">
                <button
                  class="btn btn-sm btn-primary"
                  @click="evaluateRequirementsOnChange"
                  :disabled="loading"
                >
                  <i class="fas fa-sync"></i>
                  Alle evaluieren
                </button>
              </div>
            </div>

          <div class="card-body">
            <!-- Debug output -->
            <div class="mb-3" v-if="lookup">
              <strong>Debug Info:</strong><br>
              Lookup exists: {{ !!lookup }}<br>
              Requirement sets count: {{ requirementSets.length }}<br>
              Raw lookup data: <pre>{{ JSON.stringify(lookup, null, 2) }}</pre>
            </div>
            

          </div>
        </div>
      </div>

      <!-- Available Findings -->
      <div class="col-12 col-xl-6">
        <div class="card h-100">
           <div class="card-header d-flex justify-content-between align-items-center">
                <h2 class="h5 mb-0">Um die Untersuchung abzuschließen, müssen die folgenden Befunde vorhanden sein.</h2>
                <p class="text-muted mb-0">Hinweis: Ändern Sie die Klassifikationen auf ihr bevorzugtes Format.</p>
                <div v-if="availableFindings.length > 0" class="d-flex align-items-center gap-2">
                  <small class="text-muted">{{ availableFindings.length }} verfügbar</small>
                  <button
                    class="btn btn-sm btn-outline-info"
                    @click="loadFindingsData()"
                    :disabled="loading"
                    title="Befunde aktualisieren"
                  >
                    <i class="fas fa-sync-alt"></i>
                  </button>
                </div>
            </div>
            <div class="card-body pre-scrollable" style="max-height: 70vh; overflow: auto;">
                <div v-if="findingStore.loading" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Lade Befunde...</p>
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
                <div v-else class="text-center py-4">
                  <i class="fas fa-info-circle fa-2x text-muted mb-3"></i>
                  <p class="text-muted">Keine Befunde verfügbar für die Auswahl.</p>
                  <small class="text-muted">Wählen Sie eine Untersuchung aus, um verfügbare Befunde zu laden.</small>
                </div>
            </div>
        </div>alert
      </div>
    </div>


    <!-- Success Alert -->
    <div v-if="successMessage" class="alert alert-success alert-dismissible">
      <strong>Erfolg:</strong> {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = null"></button>
    </div>

    <!-- Patient Creation Modal -->
    <div v-if="showCreatePatientModal" class="modal-overlay" @click="closeCreatePatientModal">
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Neuen Patienten erstellen</h5>
            <button type="button" class="btn-close" @click="closeCreatePatientModal"></button>
          </div>
          <div class="modal-body">
            <PatientAdder 
              @patient-created="onPatientCreated" 
              @cancel="closeCreatePatientModal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { Ref } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { usePatientStore } from '@/stores/patientStore';
import type { Patient } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingStore } from '@/stores/findingStore';
import { useRequirementStore } from '@/stores/requirementStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import type { PatientExamination } from '@/stores/patientExaminationStore';
import PatientAdder from '@/components/CaseGenerator/PatientAdder.vue';
import FindingsDetail from './FindingsDetail.vue';
import AddableFindingsDetail from './AddableFindingsDetail.vue';

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

// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const findingStore = useFindingStore();
const requirementStore = useRequirementStore();
const patientExaminationStore = usePatientExaminationStore();

// --- API ---
const LOOKUP_BASE = '/api/lookup';

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



// --- Finding Management Methods ---
const isFindingAddedToExamination = (findingId: number): boolean => {
  if (!lookup.value) return false;
  const currentFindingIds = findingStore.getFindingIdsByPatientExaminationId(lookup.value.patientExaminationId);
  if (currentFindingIds.includes(findingId)) return true;
  return false;
};


const onFindingAddedToExamination = (
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
  let selectedClassifications: any[] = [];
  let response: any = null;

  if (typeof findingIdOrData === 'number') {
    // Old signature: (findingId: number, findingName: string)
    findingId = findingIdOrData;
    name = findingName || findingStore.getFindingById(findingId)?.name || `Befund ${findingId}`;
  } else {
    // New signature: (data: { findingId, findingName?, selectedClassifications, response })
    findingId = findingIdOrData.findingId;
    name = findingIdOrData.findingName || findingStore.getFindingById(findingId)?.name || `Befund ${findingId}`;
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

  // Trigger requirement evaluation after finding is added
  setTimeout(() => {
    evaluateRequirementsOnChange();
  }, 500); // Small delay to ensure finding is fully added
};

const onClassificationUpdated = (findingId: number, classificationId: number, choiceId: number | null) => {
  // Handle when a classification choice is updated
  console.log('Classification updated:', { findingId, classificationId, choiceId });

  // Get finding and classification names for better user feedback
  const finding = findingStore.getFindingById(findingId);
  const findingName = finding?.name || `Befund ${findingId}`;

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
  if (findingStore.findings.length === 0) {
    await findingStore.fetchFindings();
  }
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

function applyLookup(partial: Partial<LookupDict>) {
  if (!lookup.value) {
    lookup.value = partial as LookupDict;
  } else {
    lookup.value = { ...lookup.value, ...partial };
  }
}

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
    
    const peRes = await axiosInstance.post('/api/patient-examinations/', {
      patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
      examination: selectedExam.name,
      date_start: formattedDate, // Fixed field name
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
  }
});

// --- Watchers ---
watch(selectedExaminationId, (newId) => {
  console.log('Examination selection changed:', {
    newId,
    selectedPatientId: selectedPatientId.value,
    availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
  });
  examinationStore.setSelectedExamination(newId);
  if (newId) {
    examinationStore.loadFindingsForExamination(newId);
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
  }
}, { immediate: true });

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
