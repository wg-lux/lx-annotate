<template>
    <div class="addable-finding-card card mb-3 border-primary">
        <div class="card-header d-flex justify-content-between align-items-center bg-light">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-plus-circle text-primary"></i>
                <h6 class="card-title mb-0">Befunde verwalten</h6>
            </div>
            <ul class="nav nav-tabs card-header-tabs">
                <li class="nav-item">
                    <a class="nav-link" :class="{ active: activeTab === 'available' }" @click.prevent="activeTab = 'available'" href="#">
                        <i class="fas fa-list me-1"></i> Verfügbare Befunde
                        <span class="badge rounded-pill bg-primary ms-1">{{ availableFindings.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{ active: activeTab === 'added' }" @click.prevent="activeTab = 'added'" href="#">
                        <i class="fas fa-check-circle me-1"></i> Hinzugefügte Befunde
                        <span class="badge rounded-pill bg-success ms-1">{{ addedFindings.length }}</span>
                    </a>
                </li>
            </ul>
        </div>

        <div class="card-body">
            <!-- Tab: Verfügbare Befunde -->
            <div v-show="activeTab === 'available'">
                <div class="d-flex justify-content-end mb-3">
                    <button
                        class="btn btn-sm btn-primary"
                        @click="showFindingSelector = !showFindingSelector"
                        :disabled="loading"
                    >
                        <i class="fas" :class="showFindingSelector ? 'fa-minus' : 'fa-plus'"></i>
                        {{ showFindingSelector ? 'Auswahl ausblenden' : 'Befund auswählen' }}
                    </button>
                </div>

                <!-- Finding Selector -->
                <div v-if="showFindingSelector" class="mb-3 finding-selector">
                    <label class="form-label fw-bold">Verfügbare Befunde:</label>
                    <div v-if="availableFindings.length === 0" class="text-center py-3 text-muted">
                        <i class="fas fa-info-circle fa-2x mb-2"></i>
                        <p>Keine Befunde für diese Untersuchung verfügbar.</p>
                    </div>
                    <div v-else class="row g-3">
                        <div
                            v-for="finding in availableFindings"
                            :key="finding.id"
                            class="col-12 col-sm-6 col-md-4"
                        >
                            <div
                                class="finding-option card h-100 cursor-pointer"
                                :class="{ 'border-primary shadow-sm': selectedFindingId === finding.id }"
                                @click="selectFinding(finding.id)"
                            >
                                <div class="card-body p-3">
                                    <h6 class="card-title small fw-bold">{{ finding.nameDe || finding.name }}</h6>
                                    <p v-if="finding.description" class="card-text small text-muted mb-0">
                                        {{ finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Selected Finding Configuration -->
                <div v-if="selectedFindingId" class="selected-finding-config mt-4 p-4 border rounded bg-light">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                            <i class="fas fa-cog text-primary me-2"></i>
                            Befund konfigurieren: <strong>{{ selectedFinding?.nameDe || selectedFinding?.name }}</strong>
                        </h6>
                        <button class="btn btn-sm btn-outline-secondary" @click="clearSelection" title="Auswahl zurücksetzen">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Classifications Configuration -->
                    <div v-if="findingClassifications.length > 0" class="mb-3">
                        <h6>Klassifikationen:</h6>
                        <div class="classification-config-list">
                            <div v-for="classification in findingClassifications" :key="classification.id" class="classification-config-item mb-3 p-3 border rounded">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <strong>{{ classification.name }}</strong>
                                    <div class="d-flex align-items-center gap-2">
                                        <span v-if="classification.required" class="badge bg-warning text-dark" title="Erforderlich">
                                            <i class="fas fa-exclamation-triangle"></i> Erforderlich
                                        </span>
                                        <span v-if="selectedChoices[classification.id]" class="badge bg-success" title="Ausgewählt">
                                            <i class="fas fa-check"></i> Ausgewählt
                                        </span>
                                    </div>
                                </div>
                                <p v-if="classification.description" class="text-muted small mb-2">{{ classification.description }}</p>
                                <select class="form-select form-select-sm" :value="selectedChoices[classification.id] || ''" @change="updateChoice(classification.id, $event)" :class="{ 'border-success': selectedChoices[classification.id], 'border-warning': !selectedChoices[classification.id] && classification.required }">
                                    <option value="">Bitte wählen...</option>
                                    <option v-if="!classification.choices || classification.choices.length === 0" value="" disabled>Keine Auswahl</option>
                                    <option v-else v-for="choice in classification.choices" :key="choice.id" :value="choice.id">{{ choice.name }}</option>
                                </select>
                            </div>
                        </div>
                        <!-- Classification Progress -->
                        <div class="classification-progress">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Erforderliche Klassifikationen:</small>
                                <small class="fw-semibold" :class="classificationProgress.complete ? 'text-success' : 'text-warning'">
                                    {{ classificationProgress.selected }}/{{ classificationProgress.required }}
                                </small>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar" :class="classificationProgress.complete ? 'bg-success' : 'bg-warning'" :style="{ width: classificationProgress.percentage + '%' }"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Add Button -->
                    <div class="text-end mt-3">
                        <button class="btn btn-success" @click="addFindingToExamination" :disabled="loading || !canAddFinding" :title="canAddFinding ? 'Befund zur Untersuchung hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen'">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                            <i class="fas fa-plus me-2"></i>
                            Befund hinzufügen
                        </button>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else-if="!showFindingSelector" class="text-center py-5 text-muted">
                    <i class="fas fa-plus-circle fa-3x mb-3 opacity-50"></i>
                    <p>Klicken Sie auf "Befund auswählen", um einen neuen Befund hinzuzufügen.</p>
                </div>
            </div>

            <!-- Tab: Hinzugefügte Befunde -->
            <div v-show="activeTab === 'added'">
                <div v-if="addedFindings.length === 0" class="text-center py-5 text-muted">
                    <i class="fas fa-folder-open fa-3x mb-3"></i>
                    <p>Noch keine Befunde zu dieser Untersuchung hinzugefügt.</p>
                </div>
                <div v-else class="row g-3">
                    <div v-for="finding in addedFindings" :key="finding.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
                        <div class="card h-100 border-success">
                            <div class="card-body p-3">
                                <div class="d-flex align-items-start gap-2">
                                    <i class="fas fa-check-circle text-success mt-1"></i>
                                    <div class="flex-grow-1">
                                        <h6 class="card-title small fw-bold text-success">{{ finding.nameDe || finding.name }}</h6>
                                        <p v-if="finding.description" class="card-text small text-muted mb-2">
                                            {{ finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description }}
                                        </p>
                                        <span class="badge bg-info text-dark small">ID: {{ finding.id }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { type Finding, type FindingClassification } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';

const patientExaminationStore = usePatientExaminationStore();
const findingClassificationStore = useFindingClassificationStore();


interface Props {
    patientExaminationId?: number;
    examinationId?: number;
}

const props = withDefaults(defineProps<Props>(), {
    patientExaminationId: undefined,
    examinationId: undefined
});

watch(
  () => patientExaminationStore.getCurrentPatientExaminationId(),
  (newId) => {
    if (newId && !props.patientExaminationId) {
      console.warn('[AddableFindingsDetail] Syncing patientExaminationId...');
      loadFindingsAndClassificationsNew();
    }
  },
  { immediate: true }
);


const emit = defineEmits<{
  'finding-added': [findingId: number, findingName: string]
  'finding-error': [error: string]
}>();

const patientFindingStore = usePatientFindingStore();
const examinationStore = useExaminationStore();

// Component State
const loading = ref(false);
const activeTab = ref<'available' | 'added'>('available');
const showFindingSelector = ref(false);
const selectedFindingId = ref<number | null>(null);
const findingClassifications = ref<FindingClassification[]>([]);
const selectedChoices = ref<Record<number, number>>({});
const availableExaminationFindings = ref<Finding[]>([]);
const addedFindings = ref<Finding[]>([]);

// Computed Properties
const effectivePatientExaminationId = computed<number | null>(() => {
    if (props.patientExaminationId) return props.patientExaminationId;
    return patientExaminationStore.getCurrentPatientExaminationId();
});

const availableFindings = computed(() => {
    return availableExaminationFindings.value;
});

function normalizeFindingsList(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Finding => {
    if (!entry || typeof entry !== 'object') return false;
    return Number.isFinite(Number((entry as any).id));
  });
}

function dedupeFindings(findings: Finding[]): Finding[] {
  return Array.from(new Map(findings.map((finding) => [finding.id, finding])).values());
}

async function createPatientFindingWithFallback(payload: {
  patientExamination: number
  finding: number
  classifications: Array<{ classification: number; choice: number }>
}) {
  const createAction = (patientFindingStore as any)?.createPatientFinding;
  if (typeof createAction === 'function') {
    return await createAction(payload);
  }
  const response = await axiosInstance.post('/api/patient-findings/', payload);
  return response.data;
}

async function loadAddedFindingsForCurrentExam() {
  const id = effectivePatientExaminationId.value;
  if (!id) {
    addedFindings.value = [];
    return;
  }
  await patientFindingStore.fetchPatientFindings(id);
  const findings = patientFindingStore.patientFindings.map((pf) => pf?.finding);
  addedFindings.value = dedupeFindings(normalizeFindingsList(findings));
}

watch(effectivePatientExaminationId, async (newId) => {
  if (newId) {
    await loadAddedFindingsForCurrentExam();
  } else {
    addedFindings.value = [];
  }
}, { immediate: true });

const selectedFinding = computed((): Finding | undefined => {
    if (!selectedFindingId.value) return undefined;
    return availableFindings.value.find(f => f.id === selectedFindingId.value) || 
           findingClassificationStore.getFindingById(selectedFindingId.value);
});

const hasAllRequiredClassifications = computed(() => {
    if (!findingClassifications.value.length) return true;

    return findingClassifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});

const canAddFinding = computed(() => {
  return Boolean(
         selectedFindingId.value &&
         hasAllRequiredClassifications.value &&
         effectivePatientExaminationId.value &&
         !loading.value
  );
});

const classificationProgress = computed(() => {
    const required = findingClassifications.value.filter(c => c.required).length;
    const selected = findingClassifications.value.filter(c =>
        c.required && selectedChoices.value[c.id]
    ).length;

    return {
        required,
        selected,
        complete: selected === required,
        percentage: required > 0 ? Math.round((selected / required) * 100) : 100
    };
});

// Methods
const selectFinding = async (findingId: number) => {
    selectedFindingId.value = findingId;
    showFindingSelector.value = false;

    // Load classifications for the selected finding
    await loadFindingClassifications(findingId);
};

const clearSelection = () => {
    selectedFindingId.value = null;
    findingClassifications.value = [];
    selectedChoices.value = {};
};

const loadFindingClassifications = async (findingId: number) => {
    try {
        loading.value = true;
        const classifications = findingClassificationStore.getClassificationsForFinding(findingId);
        findingClassifications.value = Array.isArray(classifications) ? classifications : [];
    } catch (error) {
        console.error('Error loading classifications:', error);
        emit('finding-error', 'Fehler beim Laden der Klassifikationen');
    } finally {
        loading.value = false;
    }
};

const updateChoice = (classificationId: number, event: Event) => {
    const target = event.target as HTMLSelectElement;
    const choiceId = target.value ? parseInt(target.value) : undefined;

    if (choiceId) {
        selectedChoices.value[classificationId] = choiceId;
    } else {
        delete selectedChoices.value[classificationId];
    }
};

const addFindingToExamination = async () => {
    if (!canAddFinding.value || !selectedFinding.value || !effectivePatientExaminationId.value || !selectedFindingId.value) {
        
        return;
    }

    try {
        loading.value = true;

        // Prepare the data for the patient finding store
        const findingData = {
            patientExamination: effectivePatientExaminationId.value,
            finding: selectedFindingId.value,
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        };

        const newPatientFinding = await createPatientFindingWithFallback(findingData);
        const resolvedFindingId = Number(
          newPatientFinding?.finding?.id ?? newPatientFinding?.finding ?? selectedFindingId.value
        );
        const findingId = Number.isFinite(resolvedFindingId) ? resolvedFindingId : selectedFindingId.value;
        const createdFinding = findingClassificationStore.getFindingById(findingId) || selectedFinding.value;
        if (createdFinding && !addedFindings.value.some((entry) => entry.id === createdFinding.id)) {
            addedFindings.value.push(createdFinding);
        }
        await loadAddedFindingsForCurrentExam();
        const findingName = selectedFinding.value.nameDe || selectedFinding.value.name;
        emit('finding-added', findingId, findingName);

        // Reset the component state
        clearSelection();
        showFindingSelector.value = false;

    } catch (error: any) {
        console.error('Error adding finding to examination:', error);
        const errorMessage = patientFindingStore.error ||
                           error.response?.data?.error ||
                           error.response?.data?.detail ||
                           error.message ||
                           'Fehler beim Hinzufügen des Befunds';
        emit('finding-error', errorMessage);
    } finally {
        loading.value = false;
    }
};

const loadFindingsAndClassifications = async (examinationId: number) => {
    try {
        loading.value = true;
        
        // Load findings for the examination
        if (findingClassificationStore.getAllFindings.length === 0) {
            // Findings will be loaded from API below
        }

        // Load findings from the API
        const response = await axiosInstance.get(`/api/examinations/${examinationId}/findings/`);
        const findings = normalizeFindingsList(response.data);
        findingClassificationStore.setClassificationChoicesFromLookup(findings);
        availableExaminationFindings.value = dedupeFindings(findings);

        console.log('Loaded findings for examination:', findings.length);
        
    } catch (error) {
        console.error('Error loading examination data:', error);
        emit('finding-error', 'Fehler beim Laden der Untersuchungsdaten');
    } finally {
        loading.value = false;
    }
};

// Neue Methode: Lade Befunde basierend auf der PatientExamination
const loadAvailableFindingsForPatientExamination = async () => {
  try {
    loading.value = true;
    
    // Priorisiere props.examinationId, falls verfügbar
    let examId = props.examinationId;
    if (!examId && effectivePatientExaminationId.value) {
      // Hole Examination ID aus PatientExamination
      const patientExamination = patientExaminationStore.getPatientExaminationById(effectivePatientExaminationId.value);
      examId = patientExamination?.examination?.id;
    }
    
    if (!examId) {
      console.warn('Keine Examination ID verfügbar für Findings-Laden');
      return;
    }
    
    // Verwende den korrigierten Store-Aufruf
    const findings = normalizeFindingsList(await examinationStore.loadFindingsForExamination(examId));
    availableExaminationFindings.value = dedupeFindings(findings);
    
    console.log('📋 [AddableFindingsDetail] Loaded findings for examinationId:', examId, 'findings count:', findings.length);
  } catch (error) {
    console.error('Error loading available findings:', error);
    emit('finding-error', 'Fehler beim Laden der verfügbaren Befunde');
  } finally {
    loading.value = false;
  }
};

const loadFindingsAndClassificationsNew = async () => {
    await loadAvailableFindingsForPatientExamination();
    if (props.examinationId) {
        await loadFindingsAndClassifications(props.examinationId);
    }
};

// Watchers
watch(() => props.patientExaminationId, async () => {
    if (props.patientExaminationId) {
        await loadFindingsAndClassificationsNew();
    }
}, { immediate: true });

watch(() => props.examinationId, async () => {
    if (props.examinationId) {
        await loadAvailableFindingsForPatientExamination();
    }
}, { immediate: true });

// Load initial data
onMounted(async () => {
    await loadFindingsAndClassificationsNew();
});
</script>
