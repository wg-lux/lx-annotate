<template>
    <div class="addable-finding-card card mb-3 border-primary">
        <div class="card-header d-flex justify-content-between align-items-center bg-light">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-plus-circle text-primary"></i>
                <h6 class="card-title mb-0">Neuen Befund hinzufügen</h6>
            </div>
            <div class="d-flex gap-2">
                <button
                    class="btn btn-sm btn-primary"
                    @click="showFindingSelector = !showFindingSelector"
                    :disabled="loading"
                >
                    <i class="fas" :class="showFindingSelector ? 'fa-minus' : 'fa-plus'"></i>
                    {{ showFindingSelector ? 'Auswahl ausblenden' : 'Befund auswählen' }}
                </button>
            </div>
        </div>

        <div class="card-body">
            <!-- Finding Selector -->
            <div v-if="showFindingSelector" class="mb-3">
                <div class="finding-selector">
                    <label class="form-label">Verfügbare Befunde:</label>
                    
                    <!-- Debug Info -->
                    <div class="alert alert-info small mb-2">
                        <strong>Debug Info:</strong><br>
                        PatientExaminationId: {{ props.patientExaminationId || 'Nicht verfügbar' }}<br>
                        ExaminationId: {{ props.examinationId || 'Nicht verfügbar' }}<br>
                        Gefundene Befunde: {{ availableFindings.length }}
                    </div>
                    
                    <div v-if="availableFindings.length === 0" class="text-center py-3">
                        <i class="fas fa-info-circle fa-2x text-muted mb-2"></i>
                        <p class="text-muted">Keine Befunde verfügbar</p>
                        <small class="text-muted">Wählen Sie zuerst eine Untersuchung aus</small>
                    </div>
                    <div v-else class="row g-2">
                        <div
                            v-for="finding in availableFindings"
                            :key="finding.id"
                            class="col-md-6 col-lg-4"
                        >
                            <div
                                class="finding-option card h-100 cursor-pointer"
                                :class="{ 'border-primary bg-light': selectedFindingId === finding.id }"
                                @click="selectFinding(finding.id)"
                            >
                                <div class="card-body p-2">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="fas fa-search text-primary"></i>
                                        <span class="small fw-semibold">{{ finding.name }}</span>
                                    </div>
                                    <p v-if="finding.description" class="small text-muted mt-1 mb-0">
                                        {{ finding.description.length > 60 ? finding.description.substring(0, 60) + '...' : finding.description }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Selected Finding Configuration -->
            <div v-if="selectedFindingId" class="selected-finding-config">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">
                        <i class="fas fa-cog text-primary me-2"></i>
                        Befund konfigurieren
                    </h6>
                    <button
                        class="btn btn-sm btn-outline-secondary"
                        @click="clearSelection"
                        title="Auswahl zurücksetzen"
                    >
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Finding Details -->
                <div v-if="selectedFinding" class="mb-3">
                    <div class="alert alert-info">
                        <strong>{{ selectedFinding.name }}</strong>
                        <p v-if="selectedFinding.description" class="mb-0 small">
                            {{ selectedFinding.description }}
                        </p>
                    </div>
                </div>

                <!-- Classifications Configuration -->
                <div v-if="findingClassifications.length > 0" class="mb-3">
                    <h6>Klassifikationen:</h6>
                    <div class="classification-config-list">
                        <div
                            v-for="classification in findingClassifications"
                            :key="classification.id"
                            class="classification-config-item mb-3 p-3 border rounded"
                        >
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <strong>{{ classification.name }}</strong>
                                <div class="d-flex align-items-center gap-2">
                                    <span
                                        v-if="classification.required"
                                        class="badge bg-warning"
                                        title="Erforderlich"
                                    >
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </span>
                                    <span
                                        v-if="selectedChoices[classification.id]"
                                        class="badge bg-success"
                                        title="Ausgewählt"
                                    >
                                        <i class="fas fa-check"></i>
                                    </span>
                                </div>
                            </div>

                            <p v-if="classification.description" class="text-muted small mb-2">
                                {{ classification.description }}
                            </p>

                            <div class="mb-2">
                                <label class="form-label small">Auswahl:</label>
                                <select
                                    class="form-select form-select-sm"
                                    :value="selectedChoices[classification.id] || ''"
                                    @change="updateChoice(classification.id, $event)"
                                    :class="{
                                        'border-success': selectedChoices[classification.id],
                                        'border-warning': !selectedChoices[classification.id] && classification.required
                                    }"
                                >
                                    <option value="">Bitte wählen...</option>
                                    <!-- Show disabled option if no choices available -->
                                    <option
                                        v-if="!classification.choices || classification.choices.length === 0"
                                        value=""
                                        disabled
                                    >
                                        Keine Auswahlmöglichkeiten verfügbar
                                    </option>
                                    <!-- Show choices if available -->
                                    <option
                                        v-else
                                        v-for="choice in classification.choices"
                                        :key="choice.id"
                                        :value="choice.id"
                                    >
                                        {{ choice.name }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Classification Progress -->
                    <div class="classification-progress mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted">Klassifikationen:</small>
                            <small
                                class="fw-semibold"
                                :class="classificationProgress.complete ? 'text-success' : 'text-warning'"
                            >
                                {{ classificationProgress.selected }}/{{ classificationProgress.required }}
                            </small>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div
                                class="progress-bar"
                                :class="classificationProgress.complete ? 'bg-success' : 'bg-warning'"
                                :style="{ width: classificationProgress.percentage + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- Add Button -->
                <div class="text-end">
                    <button
                        class="btn btn-success"
                        @click="addFindingToExamination"
                        :disabled="loading || !canAddFinding"
                        :title="canAddFinding ? 'Befund zur Untersuchung hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen'"
                    >
                        <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                        <i class="fas fa-plus me-2"></i>
                        Befund hinzufügen
                    </button>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="!showFindingSelector" class="text-center py-4">
                <i class="fas fa-plus-circle fa-3x text-primary mb-3 opacity-50"></i>
                <p class="text-muted">Klicken Sie auf "Befund auswählen" um einen neuen Befund hinzuzufügen</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore, type Finding, type FindingClassification, type FindingClassificationChoice } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';

const patientExaminationStore = usePatientExaminationStore();

const patientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();

interface Props {
    patientExaminationId?: number;
    examinationId?: number;
}

const props = withDefaults(defineProps<Props>(), {
    patientExaminationId: undefined,
    examinationId: undefined
});

watch(() => patientExaminationStore.getCurrentPatientExaminationId, (newId) => {
    if (newId && !props.patientExaminationId) {
        // This is generally not recommended as it can lead to synchronization issues.
        // The component should ideally receive the ID via props.
        // This watcher acts as a fallback to sync with the store if the prop is not provided.
        console.warn('[AddableFindingsDetail] Syncing patientExaminationId from store as prop was not provided. New ID:', newId);
        // We will trigger the logic that depends on patientExaminationId changing.
        loadFindingsAndClassificationsNew();
    }
}, { immediate: true });

const emit = defineEmits<{
  'finding-added': [findingId: number, findingName: string]
  'finding-error': [error: string]
}>();

const findingStore = useFindingStore();
const patientFindingStore = usePatientFindingStore();

// Component State
const loading = ref(false);
const showFindingSelector = ref(false);
const selectedFindingId = ref<number | null>(null);
const findingClassifications = ref<FindingClassification[]>([]);
const selectedChoices = ref<Record<number, number>>({});
const availableExaminationFindings = ref<Finding[]>([]);

// Computed Properties
const availableFindings = computed(() => {
    return availableExaminationFindings.value;
});

const selectedFinding = computed((): Finding | undefined => {
    if (!selectedFindingId.value) return undefined;
    return availableFindings.value.find(f => f.id === selectedFindingId.value) || 
           findingStore.getFindingById(selectedFindingId.value);
});

const hasAllRequiredClassifications = computed(() => {
    if (!findingClassifications.value.length) return true;

    return findingClassifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});

const canAddFinding = computed(() => {
    return selectedFindingId.value &&
           hasAllRequiredClassifications.value &&
           props.patientExaminationId &&
           !loading.value;
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
        findingClassifications.value = await findingStore.fetchFindingClassifications(findingId);
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
    if (!canAddFinding.value || !selectedFinding.value || !props.patientExaminationId || !selectedFindingId.value) {
        return;
    }

    try {
        loading.value = true;

        // Prepare the data for the patient finding store
        const findingData = {
            patientExamination: props.patientExaminationId,
            finding: selectedFindingId.value,
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        };

        // Use patientFindingStore to create the patient finding
        const newPatientFinding = await patientFindingStore.createPatientFinding(findingData);

        const findingName = selectedFinding.value.name;
        emit('finding-added', selectedFindingId.value, findingName);

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
        if (findingStore.findings.length === 0) {
            await findingStore.fetchFindings();
        }
        
        // Load classifications for the examination
        const classifications = await findingStore.fetchExaminationClassifications(examinationId);
        
        // For now, we'll use all findings since examination-specific filtering 
        // would require additional logic to match findings with classifications
        console.log('Loaded classifications for examination:', classifications);
        
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
        
        // Erst die PatientExamination holen, um die examinationId zu bekommen
        if (props.patientExaminationId) {
            const response = await axiosInstance.get(`/api/patient-examinations/${props.patientExaminationId}/`);
            const patientExamination = response.data;
            
            if (patientExamination.id) {
                // Dann die verfügbaren Befunde für diese Examination laden
                const examinationId = patientExamination.getCurrentExaminationId;
                const findingsResponse = await axiosInstance.get(`/api/examinations/${patientExamination.id}/findings/`);
                availableExaminationFindings.value = findingsResponse.data;
                
                console.log('📋 [AddableFindingsDetail] Loaded findings for patientExaminationId:', props.patientExaminationId, 'examinationId:', examinationId, 'findings count:', availableExaminationFindings.value.length);
            }
        } else if (props.examinationId) {
            // Fallback: Direkt über die examinationId laden
            const findingsResponse = await axiosInstance.get(`/api/examinations/${props.examinationId}/findings/`);
            availableExaminationFindings.value = findingsResponse.data;
            
            console.log('📋 [AddableFindingsDetail] Loaded findings for examinationId:', props.examinationId, 'findings count:', availableExaminationFindings.value.length);
        } else {
            const patientExaminationId = patientExaminationStore.getCurrentPatientExaminationId;
            const findingsResponse = await axiosInstance.get(`/api/patient-examinations/${patientExaminationId}/findings/`);
            availableExaminationFindings.value = findingsResponse.data;
            console.log('📋 [AddableFindingsDetail] Loaded findings for patientExaminationId from store:', patientExaminationId, 'findings count:', availableExaminationFindings.value.length);
        }
        
    } catch (error) {
        console.error('Error loading available findings:', error);
        emit('finding-error', 'Fehler beim Laden der verfügbaren Befunde');
    } finally {
        loading.value = false;
    }
};

const loadFindingsAndClassificationsNew = async () => {
    await loadAvailableFindingsForPatientExamination();
};

// Watchers
watch(() => props.patientExaminationId, async () => {
    if (props.patientExaminationId) {
        await loadFindingsAndClassificationsNew();
    }
}, { immediate: true });

watch(() => props.examinationId, async () => {
    if (props.examinationId && !props.patientExaminationId) {
        await loadFindingsAndClassificationsNew();
    }
}, { immediate: true });

// Load initial data
onMounted(async () => {
    await loadFindingsAndClassificationsNew();
});
</script>