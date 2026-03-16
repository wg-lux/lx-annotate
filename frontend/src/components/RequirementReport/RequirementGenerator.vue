<template>
  <div class="requirement-generator container-fluid py-4">


    <CaseSetupPanel
      :selected-patient-id="selectedPatientId"
      :selected-examination-id="selectedExaminationId"
      :selected-patient-display-name="selectedPatientDisplayName"
      :selected-examination-display-name="selectedExaminationDisplayName"
      :patients="patients"
      :examinations-dropdown="examinationsDropdown"
      :is-loading-patients="isLoadingPatients"
      :is-loading-examinations="isLoadingExaminations"
      :loading="loading"
      :has-active-session="!!lookupToken"
      @update:selected-patient-id="selectedPatientId = $event"
      @update:selected-examination-id="selectedExaminationId = $event"
      @create-case="createPatientExaminationAndInitLookup"
    />

    <div v-if="error" class="alert alert-danger alert-dismissible">
      <strong>Fehler:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <div v-if="lookup" class="row g-3">
      <div v-if="lookup && isDebug" class="col-12">
        <div class="card">
          <div class="card-header">
            <h2 class="h6 mb-0">Debug: Technische Falldaten</h2>
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

      <RequirementSelectionPanel
        :loading="loading"
        :case-active="!!lookupToken"
        :selected-patient-display-name="selectedPatientDisplayName"
        :selected-examination-display-name="selectedExaminationDisplayName"
        :selected-requirement-set-ids="selectedRequirementSetIds"
        :selected-requirement-set-id-set="selectedRequirementSetIdSet"
        :requirement-sets="requirementSets"
        :unmet-requirement-count="unmetRequirementCount"
        :suggested-action-count="suggestedActionCount"
        :next-step-message="nextStepMessage"
        :candidate-requirement-set-ids="candidateRequirementSetIds"
        :candidate-requirement-set-confidence="candidateRequirementSetConfidence"
        :suggested-action-entries="suggestedActionEntries"
        :evaluation-summary="evaluationSummary"
        :requirement-set-status="requirementSetEvaluationMap"
        @refresh="fetchLookupAll"
        @recompute="triggerRecompute"
        @reset-session="resetLookupSession"
        @apply-recommended="applyRecommendedRequirementSets"
        @select-all="selectAllRequirementSets"
        @clear-selection="clearRequirementSetSelection"
        @evaluate-all="evaluateRequirementsOnChange"
        @evaluate-set="evaluateRequirementSet"
        @toggle-set="toggleRequirementSet"
      />

      <KnowledgeBaseValidationPanel
        :loading="loading"
        :findings-section-loading="findingsSectionLoading"
        :available-findings="availableFindings"
        :is-debug="isDebug"
        @refresh-findings="loadFindingsData"
      >
        <template #adder>
          <AddableFindingsDetail
            :examination-id="selectedExaminationId || undefined"
            :patient-examination-id="currentPatientExaminationId || undefined"
            @finding-added="onFindingAddedToExamination"
            @finding-error="(errorMsg) => error = errorMsg"
          />
        </template>
        <template #findings>
          <FindingsDetail
            v-for="findingId in availableFindings"
            :key="findingId"
            :finding-id="findingId"
            :is-added-to-examination="isFindingAddedToExamination(findingId)"
            :patient-examination-id="lookup?.patientExaminationId || undefined"
            @added-to-examination="onFindingAddedToExamination"
            @classification-updated="onClassificationUpdated"
          />
        </template>
        <template #issues>
          <RequirementIssues
            v-if="lookup"
            :patient-examination-id="lookup.patientExaminationId || null"
            :requirement-set-ids="selectedRequirementSetIds"
            :show-only-unmet="true"
          />
        </template>
        <template #debug>
          <div class="card">
            <div class="card-header">
              <h2 class="h6 mb-0">Debug: Technische Falldaten</h2>
            </div>
            <div class="card-body">
              <strong>Debug Info:</strong><br>
              Daten geladen: {{ !!lookup }}<br>
              Requirement sets count: {{ requirementSets.length }}<br>
              Rohdaten: <pre>{{ JSON.stringify(lookup, null, 2) }}</pre>
            </div>
          </div>
        </template>
      </KnowledgeBaseValidationPanel>
    </div>


    <!-- Success Alert -->
    <div v-if="successMessage" class="alert alert-success alert-dismissible">
      <strong>Erfolg:</strong> {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = null"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import { endpoints } from '@/types/api/endpoints';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useRequirementStore } from '@/stores/requirementStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import type { PatientExamination } from '@/stores/patientExaminationStore';
import CaseSetupPanel from './CaseSetupPanel.vue';
import FindingsDetail from './FindingsDetail.vue';
import AddableFindingsDetail from './AddableFindingsDetail.vue';
import RequirementIssues from './RequirementIssues.vue';
import RequirementSelectionPanel from './RequirementSelectionPanel.vue';
import KnowledgeBaseValidationPanel from './KnowledgeBaseValidationPanel.vue';
import { useDebug } from '@/composables/useDebug';

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
  candidateRequirementSetIds?: number[];
  candidateRequirementSetConfidence?: number | null;
  selectedRequirementSetIds?: number[];
  selectedChoices?: Record<string, any>;
};

// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const requirementStore = useRequirementStore();
const patientExaminationStore = usePatientExaminationStore();
const {
  loading: findingSelectorsLoading,
  ensureCatalogLoaded,
  ensurePatientFindingsLoaded,
  getFindingById,
  getFindingNameById,
  isFindingAttached
} = useFindingSelectors();

// --- API ---
const LOOKUP_BASE = '/api/lookup';
const { isDebug } = useDebug();

function debugLog(...args: unknown[]) {
  if (isDebug) {
    console.log(...args);
  }
}

function extractIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.split('T')[0];
}

// --- Component State ---
const selectedPatientId = ref<number | null>(null);
const selectedExaminationId = ref<number | null>(null);
const currentPatientExaminationId = ref<number | null>(null);
const lookupToken = ref<string | null>(null);
const lookup = ref<LookupDict | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const successMessage = ref<string | null>(null);
const isRestarting = ref(false); // Prevent infinite restart loops

// --- Computed from Store ---

const patients = computed(() => {
  const result = patientStore.patientsWithDisplayName
    .filter(
      (
        entry
      ): entry is typeof entry & {
        id: number;
      } => typeof entry.id === 'number'
    )
    .map((entry) => ({
      id: entry.id,
      displayName: entry.displayName
    }));
  debugLog('Patients with displayName:', result);
  return result;
});
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => {
  const result = examinationStore.examinationsDropdown;
  debugLog('Examinations dropdown:', result);
  return result;
});
const isLoadingExaminations = computed(() => examinationStore.loading);
const selectedPatientDisplayName = computed(() => {
  const patient = patients.value.find((entry) => entry.id === selectedPatientId.value);
  return patient?.displayName || 'Nicht ausgewählt';
});
const selectedExaminationDisplayName = computed(() => {
  const exam = examinationsDropdown.value.find((entry) => entry.id === selectedExaminationId.value);
  return exam?.displayName || 'Nicht ausgewählt';
});

// --- Computed from Local State ---
const requirementSets = computed<RequirementSetLite[]>(() => {
  const sets = lookup.value?.requirementSets ?? [];
  debugLog('Computing requirementSets:', sets);
  return sets;
});
const selectedRequirementSetIds = computed<number[]>({
  get: () => lookup.value?.selectedRequirementSetIds ?? [],
  set: (val) => { if (lookup.value) lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed<number[]>(() => lookup.value?.availableFindings ?? []);
const findingsSectionLoading = computed(() => findingSelectorsLoading.value || loading.value);
const candidateRequirementSetIds = computed<number[]>(() => lookup.value?.candidateRequirementSetIds ?? []);
const candidateRequirementSetConfidence = computed<number | null>(() =>
  typeof lookup.value?.candidateRequirementSetConfidence === 'number'
    ? lookup.value.candidateRequirementSetConfidence
    : null
);
const unmetRequirementCount = computed(() => {
  const status = lookup.value?.requirementStatus ?? {};
  return Object.values(status).filter((entry) => entry === false).length;
});
const suggestedActionEntries = computed(() => {
  if (!lookup.value?.suggestedActions) return [];
  return Object.entries(lookup.value.suggestedActions).map(([requirementId, actions]) => {
    const firstAction = Array.isArray(actions) ? actions[0] : null;
    const requirementLabel =
      Object.values(lookup.value?.requirementsBySet ?? {})
        .flat()
        .find((item) => String(item.id) === requirementId)?.name || `Requirement ${requirementId}`;
    return {
      requirementId,
      requirementLabel,
      summary:
        firstAction?.note ||
        firstAction?.reason ||
        firstAction?.finding_name ||
        'Weitere Eingaben erforderlich'
    };
  });
});
const suggestedActionCount = computed(() => suggestedActionEntries.value.length);
const nextStepMessage = computed(() => {
  if (!selectedPatientId.value || !selectedExaminationId.value) {
    return 'Patient und Untersuchung auswählen, dann den Fall anlegen.';
  }
  if (!lookup.value) {
    return 'Anforderungsbericht erstellen, damit die Wissensbasis die Falldaten prüfen kann.';
  }
  if (!selectedRequirementSetIds.value.length) {
    return candidateRequirementSetIds.value.length
      ? 'Empfohlene Requirement-Sets aus der Knowledge Base übernehmen oder gezielt auswählen.'
      : 'Requirement-Sets auswählen, um die KB-Validierung zu starten.';
  }
  if (unmetRequirementCount.value > 0) {
    return 'Offene KB-Anforderungen abarbeiten oder die Validierung erneut ausführen.';
  }
  return 'Alle aktuell ausgewählten Anforderungen sind erfüllt. Befunde können weiter ergänzt oder der Report abgeschlossen werden.';
});

const watchingLookup = ref(false);
watch(lookup, (newVal, oldVal) => {
  if (watchingLookup.value) return; // Prevent recursive calls
  watchingLookup.value = true;
  debugLog('Lookup changed:', { newVal, oldVal });
  if (newVal && newVal.patientExaminationId !== currentPatientExaminationId.value) {
    currentPatientExaminationId.value = newVal.patientExaminationId;
    debugLog('Updated currentPatientExaminationId to:', currentPatientExaminationId.value);
  }
  watchingLookup.value = false;
}, { deep: true });

const watchingRequirementSetIds = ref(false);
watch(selectedRequirementSetIds, (newVal, oldVal) => {
  if (watchingRequirementSetIds.value) return; // Prevent recursive calls
  watchingRequirementSetIds.value = true;
  debugLog('Selected Requirement Set IDs changed:', { newVal, oldVal });
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
  debugLog('Current Examination ID changed:', { newVal, oldVal });
  if (newVal !== oldVal) {
    // Trigger evaluation when examination changes
    patientExaminationStore.setCurrentPatientExaminationId(newVal);
  }
  watchingPatientExaminationIds.value = false;
});



// --- Finding Management Methods ---
const isFindingAddedToExamination = (findingId: number): boolean => {
  return isFindingAttached(lookup.value?.patientExaminationId ?? null, findingId);
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

  debugLog('Finding added to examination:', {
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
  debugLog('Classification updated:', { findingId, classificationId, choiceId });

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
  await ensurePatientFindingsLoaded(lookup.value?.patientExaminationId ?? currentPatientExaminationId.value);
};

// --- Requirement Evaluation Methods ---

// Evaluate requirements when findings are added/removed
const evaluateRequirementsOnChange = async () => {
  if (!lookup.value || !lookupToken.value) {
    debugLog('Skipping evaluation: case data or token not available');
    return;
  }

  if (!lookup.value.patientExaminationId) {
    debugLog('Skipping evaluation: patientExaminationId not available in case data', lookup.value);
    return;
  }

  try {
    debugLog('Evaluating requirements based on current case data...');

    // Use the requirement store to evaluate from lookup data
    await requirementStore.evaluateFromLookupData(lookup.value);

    // Update UI with evaluation results
    debugLog('Requirements evaluated successfully');

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
    debugLog('Evaluating requirement set:', requirementSetId);

    // Use the requirement store to evaluate specific requirement set
    await requirementStore.evaluateRequirementSet(requirementSetId, lookup.value.patientExaminationId);

    debugLog('Requirement set evaluated successfully');

  } catch (err) {
    console.error('Error evaluating requirement set:', err);
    error.value = 'Fehler bei der Evaluierung des Anforderungssets: ' + (err instanceof Error ? err.message : String(err));
  }
};

// Get evaluation status for a requirement set
const getRequirementSetEvaluationStatus = (requirementSetId: number) => {
  return requirementStore.getRequirementSetEvaluationStatus(requirementSetId);
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
const requirementSetEvaluationMap = computed(() =>
  Object.fromEntries(
    requirementSets.value.map((rs) => [rs.id, getRequirementSetEvaluationStatus(rs.id)])
  ) as Record<number, { met: boolean; metRequirementsCount: number; totalRequirementsCount: number } | null>
);

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
    debugLog('Restart already in progress, skipping createPatientExaminationAndInitLookup...');
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

  debugLog('Creating PatientExamination with:', {
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
    const formattedBirthDate = extractIsoDate(selectedPatient.dob);
    
    const peRes = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
      patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
      examination: selectedExam.name,
      date_start: formattedDate, // Fixed field name
      // 🎯 NEW: Include patient birth date and gender for age calculation
      patient_birth_date: formattedBirthDate,
      patient_gender: selectedPatient.gender || null,
    });

    patientExaminationStore.addPatientExamination(peRes.data as PatientExamination);

    debugLog('PatientExamination created:', peRes.data);
    currentPatientExaminationId.value = peRes.data.id;

    // Step 2: Init lookup with the new PatientExamination ID
    const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
      patientExaminationId: currentPatientExaminationId.value
    });
    lookupToken.value = initRes.data.token;
    
    debugLog('Lookup initialized with token:', lookupToken.value);
    
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
    debugLog('Lookup API response:', res.data);
    applyLookup(res.data);
  } catch (e: any) {
    // Handle token expiration
    if (e?.response?.status === 404) {
      error.value = 'Der technische Fallkontext ist abgelaufen. Ein neuer Stand wird vorbereitet...';
      lookupToken.value = null;
      lookup.value = null;
      stopHeartbeat();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
      
      // Try to automatically restart the session
      const restarted = await restartLookupSession();
      if (!restarted) {
        error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
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
      error.value = 'Der technische Fallkontext ist abgelaufen. Ein neuer Stand wird vorbereitet...';
      lookupToken.value = null;
      lookup.value = null;
      stopHeartbeat();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
      
      // Try to automatically restart the session
      const restarted = await restartLookupSession();
      if (!restarted) {
        error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
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
      error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
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

function updateRequirementSelection(ids: number[]) {
  selectedRequirementSetIds.value = Array.from(new Set(ids));
  patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
  requirementStore.setCurrentRequirementSetIds(selectedRequirementSetIds.value);
  if (lookupToken.value) {
    triggerRecompute();
  }
}

function applyRecommendedRequirementSets() {
  if (!candidateRequirementSetIds.value.length) return;
  updateRequirementSelection(candidateRequirementSetIds.value);
}

function selectAllRequirementSets() {
  updateRequirementSelection(requirementSets.value.map((set) => set.id));
}

function clearRequirementSetSelection() {
  updateRequirementSelection([]);
}

async function triggerRecompute() {
  if (patientStore.currentPatient && patientStore.currentPatient.id !== selectedPatientId.value) {
    console.warn('Selected patient ID does not match patient store name. Reloading...');
    // Reload Token Value to update Requirment Sets etc. to seleccted patient
  }
  if (!lookupToken.value) return;

  try {
    debugLog('Triggering recomputation for selected requirement sets:', selectedRequirementSetIds.value);
    const res = await axiosInstance.post(`${LOOKUP_BASE}/${lookupToken.value}/recompute/`);
    debugLog('Recompute response:', res.data);

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

async function validateToken(): Promise<boolean> {
  if (!lookupToken.value) return false;
  
  try {
    // Try to fetch a small part to validate token
    await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`);
    return true;
  } catch (e: any) {
    if (e?.response?.status === 404) {
      // Token expired - trigger restart
      debugLog('Token validation failed with 404, attempting restart...');
      lookupToken.value = null;
      lookup.value = null;
      error.value = 'Der technische Fallkontext ist abgelaufen. Ein neuer Stand wird vorbereitet...';
      
      // Try to restart the session
      const restarted = await restartLookupSession();
      if (!restarted) {
        error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
      }
      return false;
    }
    return false;
  }
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
  debugLog('Resetting session for new patient...');

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

  debugLog('Session reset complete for new patient');
}

async function restartLookupSession(): Promise<boolean> {
  if (isRestarting.value) {
    debugLog('Restart already in progress, skipping...');
    return false;
  }
  
  debugLog('Attempting to restart lookup session...');
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
      debugLog('Reusing existing patient examination:', currentPatientExaminationId.value);
      debugLog('selectedPatientId:', selectedPatientId.value);
      debugLog('selectedExaminationId:', selectedExaminationId.value);
      
      const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
        patientExaminationId: currentPatientExaminationId.value
      });
      lookupToken.value = initRes.data.token;
      
      // Start heartbeat for token renewal
      startHeartbeat();
      
      // Fetch all lookup data
      await fetchLookupAll();
      
      successMessage.value = 'Der Fallkontext wurde erfolgreich neu aufgebaut.';
      setTimeout(() => {
        successMessage.value = null;
      }, 3000);
      
      return true;
    } else {
      // No existing patient examination, create new one
      debugLog('No existing patient examination, creating new one');
      debugLog('currentPatientExaminationId:', currentPatientExaminationId.value);
      debugLog('selectedPatientId:', selectedPatientId.value);
      debugLog('selectedExaminationId:', selectedExaminationId.value);
      
      if (!selectedPatientId.value || !selectedExaminationId.value) {
        error.value = 'Der Fallkontext konnte nicht automatisch neu aufgebaut werden: Patient oder Untersuchung fehlt.';
        return false;
      }
      
      await createPatientExaminationAndInitLookup();
      return true;
    }
  } catch (e: any) {
    console.error('Failed to restart lookup session:', e);
    error.value = 'Fehler beim Neuaufbau des Fallkontexts: ' + axiosError(e);
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
  debugLog('Examination selection changed:', {
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
  debugLog('Patient selection changed:', {
    oldPatientId,
    newPatientId,
    currentExaminationsCount: examinationsDropdown.value.length
  });

  // Reset examination selection when patient changes
  selectedExaminationId.value = null;

  // If patient actually changed (not just initialized), reset the session
  if (oldPatientId && newPatientId !== oldPatientId) {
    debugLog('Patient changed, resetting session for new overview...');
    await resetSessionForNewPatient();
  }
});

// Watch for changes in selected requirement sets to trigger evaluation
watch(selectedRequirementSetIds, async (newIds, oldIds) => {
  if (newIds.length !== oldIds.length && lookup.value) {
    debugLog('Requirement set selection changed, triggering evaluation...');
    await evaluateRequirementsOnChange();
  }
}, { deep: true });

// Watch for lookup data changes to trigger evaluation
watch(lookup, async (newLookup, oldLookup) => {
  if (newLookup && newLookup !== oldLookup && selectedRequirementSetIds.value.length > 0) {
    debugLog('Lookup data changed, triggering evaluation...');
    // Debounce evaluation to avoid excessive API calls
    setTimeout(() => {
      evaluateRequirementsOnChange();
    }, 1000);
  }
}, { deep: true });

// Watch for lookup data changes to load requirement sets
watch(lookup, (newLookup) => {
  if (newLookup && newLookup.requirementsBySet) {
    debugLog('Loading requirement sets from lookup data...');
    requirementStore.loadRequirementSetsFromLookup(newLookup);
  }
}, { immediate: true });

// --- Lifecycle ---
onMounted(async () => {
  debugLog('Component mounted, starting data loading...');

  try {
    // Patienten und Untersuchungen laden
    await Promise.all([
      patientStore.fetchPatients(),
      examinationStore.fetchExaminations()
    ]);

    debugLog('Data loading completed:', {
      patientsCount: patients.value.length,
      examinationsCount: examinationsDropdown.value.length
    });

    // Nachschlagedaten für Patientenerstellung laden
    await patientStore.initializeLookupData();

    // Validate existing token if present (e.g., after page reload)
    if (lookupToken.value) {
      debugLog('Validating existing token:', lookupToken.value);
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
  } catch (e) {
    console.error('Error during initial reporting setup:', e);
    error.value = 'Fehler beim Laden der Falldaten: ' + axiosError(e);
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

.workflow-stat {
  height: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  background: linear-gradient(180deg, rgba(248, 249, 250, 0.95), rgba(255, 255, 255, 1));
}

.workflow-stat__label {
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6c757d;
}

.workflow-stat__value {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
}

.workflow-callout {
  padding: 0.9rem 1rem;
  border-left: 4px solid #0d6efd;
  border-radius: 0.5rem;
  background: rgba(13, 110, 253, 0.08);
  color: #183153;
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
