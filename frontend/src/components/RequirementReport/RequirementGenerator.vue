
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
              <label for="patient-select">Patient auswählen</label>
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
                  {{ patient.display_name }}
                </option>
              </select>
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
                  {{ exam.display_name }}
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
      <!-- Requirement Sets -->
      <div class="col-12 col-xl-6">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h2 class="h5 mb-0">3. Requirement Sets anpassen</h2>
              <small class="text-muted">Token: {{ lookupToken }}</small>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="fetchLookupAll" :disabled="loading">
                Aktualisieren
            </button>
          </div>
          <div class="card-body">
            <ul class="list-group list-group-flush">
              <li v-for="rs in requirementSets" :key="rs.id" class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <span class="fw-semibold">{{ rs.name }}</span>
                  <small class="text-muted d-block">type: {{ rs.type }}</small>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox"
                         :checked="selectedRequirementSetIdSet.has(rs.id)"
                         @change="toggleRequirementSet(rs.id, ($event.target as HTMLInputElement).checked)" />
                </div>
              </li>
              <li v-if="!requirementSets.length" class="list-group-item text-muted">Keine Sets gefunden.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Debugging -->
      <div class="col-12 col-xl-6">
        <div class="card h-100">
           <div class="card-header">
                <h2 class="h5 mb-0">Verfügbare Befunde</h2>
            </div>
            <div class="card-body">
                <ul v-if="availableFindings.length" class="list-group list-group-flush">
                    <li v-for="findingId in availableFindings" :key="findingId" class="list-group-item">
                        Befund ID: {{ findingId }}
                    </li>
                </ul>
                <p v-else class="text-muted">Keine Befunde verfügbar für die Auswahl.</p>
            </div>
        </div>
      </div>
    </div>
    <div v-if="lookup" class="row g-3 mt-3">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h2 class="h5 mb-0">Debug-Informationen</h2>
                </div>
                <div class="card-body">
                    <pre class="bg-light p-2 rounded"><code>{{ selectionsPretty }}</code></pre>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import type { Patient } from '@/stores/patientStore';

// --- Types ---
type RequirementSetLite = { id: number; name: string; type: string };
type LookupDict = {
  patient_examination_id: number;
  requirement_sets: RequirementSetLite[];
  availableFindings: number[];
  requiredFindings: number[];
  requirementDefaults: Record<string, any[]>;
  classificationChoices: Record<string, any[]>;
  selectedRequirementSetIds?: number[];
  selectedChoices?: Record<string, any>;
};

// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();

// --- API ---
const LOOKUP_BASE = '/lookup';

// --- Component State ---
const selectedPatientId = ref<number | null>(null);
const selectedExaminationId = ref<number | null>(null);
const currentPatientExaminationId = ref<number | null>(null);
const lookupToken = ref<string | null>(null);
const lookup = ref<LookupDict | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

// --- Computed from Store ---
const patients = computed(() => patientStore.patientsWithDisplayName);
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => examinationStore.examinationsDropdown);
const isLoadingExaminations = computed(() => examinationStore.loading);

// --- Computed from Local State ---
const requirementSets = computed<RequirementSetLite[]>(() => lookup.value?.requirement_sets ?? []);
const selectedRequirementSetIds = computed<number[]>({
  get: () => lookup.value?.selectedRequirementSetIds ?? [],
  set: (val) => { if (lookup.value) lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed<number[]>(() => lookup.value?.availableFindings ?? []);

const selectionsPretty = computed(() => JSON.stringify({
  token: lookupToken.value,
  selectedRequirementSetIds: selectedRequirementSetIds.value,
}, null, 2));

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
  if (!selectedPatientId.value || !selectedExaminationId.value) return;

  const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
  if (!selectedExam) {
    error.value = "Ausgewählte Untersuchung nicht gefunden.";
    return;
  }

  error.value = null;
  loading.value = true;
  try {
    // Step 1: Create PatientExamination
    const formattedDate = new Date().toISOString().split('T')[0];
    const peRes = await axiosInstance.post('/api/patient-examinations/create/', {
      patient: selectedPatientId.value, // Patient ID is likely correct as per serializer
      examination: selectedExam.name, // The serializer expects the name
      date_start: formattedDate, // Format date to YYYY-MM-DD
    });


    currentPatientExaminationId.value = peRes.data.id;

    // Step 2: Init lookup with the new PatientExamination ID
    const initRes = await axiosInstance.post(`api${LOOKUP_BASE}/init/`, {
      patient_examination_id: currentPatientExaminationId.value
    });
    lookupToken.value = initRes.data.token;
    
    // Step 3: Fetch all lookup data
    await fetchLookupAll();
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
    const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/all/`);
    applyLookup(res.data);
  } catch (e) {
    error.value = axiosError(e);
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
  } catch (e) {
    error.value = axiosError(e);
  } finally {
    loading.value = false;
  }
}

async function patchLookup(updates: Record<string, any>) {
  if (!lookupToken.value) return;
  await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates });
  await fetchLookupParts(['availableFindings', 'requiredFindings']);
}

function toggleRequirementSet(id: number, on: boolean) {
  const s = new Set(selectedRequirementSetIds.value);
  if (on) s.add(id); else s.delete(id);
  selectedRequirementSetIds.value = Array.from(s);
  patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
}

// --- Watchers ---
watch(selectedExaminationId, (newId) => {
  examinationStore.setSelectedExamination(newId);
  if (newId) {
    examinationStore.loadFindingsForExamination(newId);
  }
});

// --- Lifecycle ---
onMounted(() => {
  patientStore.fetchPatients();
  examinationStore.fetchExaminations();
});
</script>



<style scoped>
/* small UI niceties */
.vr {
  width: 1px;
  align-self: stretch;
  background-color: rgba(0,0,0,.1);
}
</style>
