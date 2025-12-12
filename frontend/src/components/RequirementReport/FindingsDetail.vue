<template>
    <div class="finding-card card mb-3">

        
        <div class="card-body">
            <div v-if="loading" class="text-center">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                Lade Details...
            </div>
            
            <div v-else-if="!loading && finding" class="text-center text-muted">
                                <!-- Basic Finding Info -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>ID:</strong> {{ finding.id }}</p>
                        <p><strong>Name (DE):</strong> {{ findingsInfo.findingName || 'N/A' }}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Beschreibung:</strong></p>
                        <p class="text-muted">{{ findingsInfo.findingDescription || 'Keine Beschreibung verfügbar' }}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Data Source:</strong> {{ findingsInfo.dataSource }}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Klassifikationen gesamt:</strong> {{ findingsInfo.totalClassifications }} ({{ findingsInfo.requiredClassifications }} erforderlich)</p>
                        <p v-if="findingsInfo.classificationsLoaded">Die Klassifikationen wurden erfolgreich geladen.</p>
                        <p v-else>Die Klassifikationen konnten nicht geladen werden.</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Erforderliche Klassifikationen:</strong> {{ findingsInfo.requiredClassifications }}</p>
                    </div>

                </div>

                <!-- Classifications (nur erforderliche anzeigen) -->
                <div v-if="requiredClassifications.length > 0" class="mb-3">
                    <h6>Erforderliche Klassifikationen:</h6>
                    <div class="classification-list">
                        <div
                            v-for="classification in requiredClassifications"
                            :key="classification.id"
                            class="classification-item mb-2 p-2 border rounded bg-light"
                        >
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>{{ classification.name }}</strong>
                                    <div v-if="classification.description" class="text-muted small">
                                        {{ classification.description }}
                                    </div>
                                </div>
                                <div class="badge bg-warning">Erforderlich</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Finding Types -->
                <div v-if="finding.findingTypes && finding.findingTypes.length" class="mb-2">
                    <strong>Typen:</strong>
                    <div class="d-flex flex-wrap gap-1 mt-1">
                        <span v-for="type in finding.findingTypes" :key="type" class="badge bg-secondary">
                            {{ type }}
                        </span>
                    </div>
                </div>

                <!-- Finding Interventions -->
                <div v-if="finding.findingInterventions && finding.findingInterventions.length" class="mb-2">
                    <strong>Interventionen:</strong>
                    <div class="d-flex flex-wrap gap-1 mt-1">
                        <span v-for="intervention in finding.findingInterventions" :key="intervention" class="badge bg-info">
                            {{ intervention }}
                        </span>
                    </div>
                </div>
            </div>
            <div v-else>
                <p>Befunde konnten nicht geladen werden...</p>
                <small>Finding ID: {{ findingId }}</small>
                <button v-if="examinationId" class="btn btn-primary mt-2" @click="safeLoadFindingsAndClassifications">Erneut versuchen</button>
            </div>
        </div>


        <!-- Zusammenfassung der erforderlichen Klassifikationen -->
        <div v-if="requiredClassifications.length > 0" class="selected-classifications-summary mt-3 p-3 bg-light rounded">
            <h6 class="mb-2">
                <i class="fas fa-list-check"></i>
                Erforderliche Klassifikationen ({{ requiredClassifications.length }})
            </h6>
            <div class="row">
                <div v-for="classification in requiredClassifications" :key="classification.id" class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">{{ classification.name }}:</small>
                        <span class="badge bg-warning">Erforderlich</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Debug Info -->
        <div v-if="debugInfo.findingId" class="mt-3 p-2 bg-light border rounded">
            <h6 class="mb-2">🐛 Debug Info:</h6>
            <small class="text-muted">
                <div>Finding ID: {{ debugInfo.findingId }}</div>
                <div>Finding Name: {{ debugInfo.findingName || 'Not loaded' }}</div>
                <div>Classifications: {{ debugInfo.totalClassifications }} ({{ debugInfo.requiredClassifications }} required)</div>
                <div>Classifications Loaded: {{ debugInfo.classificationsLoaded }}</div>
                <div>Data Source: {{ debugInfo.dataSource }}</div>
            </small>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore, type Finding, type FindingClassification } from '../../stores/findingStore';
import { useExaminationStore } from '@/stores/examinationStore';
import axiosInstance from '@/api/axiosInstance';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';

const findingStore = useFindingStore();
const examinationStore = useExaminationStore();
const findingClassificationStore = useFindingClassificationStore();

const examinationId = computed(() => examinationStore.selectedExaminationId || undefined);

interface Props {
    findingId: number;
    isAddedToExamination?: boolean;
    patientExaminationId?: number;
}

const props = withDefaults(defineProps<Props>(), {
    isAddedToExamination: false,
    patientExaminationId: undefined
});

const emit = defineEmits<{
  'added-to-examination': [data: {
    findingId: number;
    findingName?: string;
    selectedClassifications: any[];
    response: any;
  }];
  'classification-updated': [findingId: number, classificationId: number, choiceId: number | null];
  'error-occurred': [data: {
    findingId: number;
    error: string;
    selectedClassifications: number;
  }];
}>();

const loading = ref(false);
const classifications = ref<FindingClassification[]>([]);

// Computed
const finding = computed((): Finding | undefined => {
    // First try findingClassificationStore (where AddableFindingsDetail stores data)
    const findingFromClassificationStore = findingClassificationStore.getFindingById(props.findingId);
    if (findingFromClassificationStore) {
        return findingFromClassificationStore;
    }
    
    // Fallback to findingStore
    return findingStore.getFindingById(props.findingId);
});


const requiredClassifications = computed(() => {
    return classifications.value.filter(classification => classification.required);
});

// Debug-Informationen
const debugInfo = computed(() => {
    const findingFromClassificationStore = findingClassificationStore.getFindingById(props.findingId);
    const findingFromFindingStore = findingStore.getFindingById(props.findingId);
    const dataSource = findingFromClassificationStore ? 'findingClassificationStore' : (findingFromFindingStore ? 'findingStore' : 'none');
    
    return {
        findingId: props.findingId,
        findingName: finding.value?.nameDe || finding.value?.name,
        totalClassifications: classifications.value.length,
        requiredClassifications: requiredClassifications.value.length,
        classificationsLoaded: classifications.value.length > 0,
        dataSource: dataSource
    };
});

const findingsInfo = computed(() => {
    const findingFromClassificationStore = findingClassificationStore.getFindingById(props.findingId);
    const findingFromFindingStore = findingStore.getFindingById(props.findingId);
    const dataSource = findingFromClassificationStore ? 'findingClassificationStore' : (findingFromFindingStore ? 'findingStore' : 'none');
    
    return {
        findingId: props.findingId,
        findingName: finding.value?.nameDe || finding.value?.name,
        findingDescription: finding.value?.description || 'Keine Beschreibung verfügbar',
        totalClassifications: classifications.value.length,
        requiredClassifications: requiredClassifications.value.length,
        classificationsLoaded: classifications.value.length > 0,
        dataSource: dataSource
    };
});

const loadFindingsAndClassifications = async (examinationId: number) => {
    try {
        loading.value = true;
        
        // Load findings for the examination
        if (findingClassificationStore.getAllFindings.length === 0) {
            // Findings will be loaded from API below
        }

        // Load findings from the API
        const response = await axiosInstance.get(`/api/examinations/${examinationId}/findings`);
        const findings = response.data;
        findingClassificationStore.setClassificationChoicesFromLookup(findings);

        console.log('Loaded findings for examination:', findings.length);
        
    } catch (error) {
        console.error('Error loading examination data:', error);
        emit('error-occurred', {
            findingId: props.findingId,
            error: 'Fehler beim Laden der Untersuchungsdaten',
            selectedClassifications: 0
        });
    } finally {
        loading.value = false;
    }
};

const loadClassifications = async () => {
    if (!props.findingId) {
        console.log('📋 [FindingsDetail] No findingId provided, skipping classifications load');
        return;
    }
    
    try {
        loading.value = true;
        
        // Get classifications from the store
        const findingClassifications = findingClassificationStore.getClassificationsForFinding(props.findingId);
        
        if (findingClassifications.length > 0) {
            classifications.value = findingClassifications;
            console.log('📋 [FindingsDetail] Loaded classifications from store:', findingClassifications.length);
        } else {
            // Try to get from finding data if available
            const finding = findingClassificationStore.getFindingById(props.findingId);
            if (finding?.FindingClassifications) {
                classifications.value = finding.FindingClassifications;
                console.log('📋 [FindingsDetail] Loaded classifications from finding data:', finding.FindingClassifications.length);
            } else {
                console.warn('📋 [FindingsDetail] No classifications found for finding:', props.findingId);
                classifications.value = [];
            }
        }
        
    } catch (error) {
        console.error('Error loading classifications:', error);
        classifications.value = [];
    } finally {
        loading.value = false;
    }
};

// Safe wrapper for loading with examination ID check
const safeLoadFindingsAndClassifications = async () => {
    // Just load classifications from the store - data should already be available from AddableFindingsDetail
    await loadClassifications();
};

const updateChoice = (classificationId: number, event: Event) => {
    const target = event.target as HTMLSelectElement;
    const choiceId = target.value ? parseInt(target.value) : null;

    // Animation für Update-Feedback
    const classificationElement = target.closest('.classification-item');
    if (classificationElement) {
        classificationElement.classList.add('updated');
        setTimeout(() => {
            classificationElement.classList.remove('updated');
        }, 500);
    }

    // Emit event mit zusätzlichen Informationen
    emit('classification-updated', props.findingId, classificationId, choiceId);
};

// Lifecycle
onMounted(() => {
    console.log('🚀 [FindingsDetail] Component mounted with props:', {
        findingId: props.findingId,
        patientExaminationId: props.patientExaminationId,
        isAddedToExamination: props.isAddedToExamination,
        findingStoreFindingsCount: findingStore.findings.length,
        findingFromStore: findingStore.getFindingById(props.findingId)
    });

    safeLoadFindingsAndClassifications();
});

watch(() => props.findingId, (newVal, oldVal) => {
    console.log('👀 [FindingsDetail] findingId changed:', { oldVal, newVal });
    safeLoadFindingsAndClassifications();
}, { immediate: true });

// Watch for finding data availability in findingClassificationStore
watch(() => findingClassificationStore.getFindingById(props.findingId), (newFinding: Finding | undefined, oldFinding: Finding | undefined) => {
    if (newFinding) {
        console.log('🔄 [FindingsDetail] Finding data now available in findingClassificationStore, loading classifications', { findingId: newFinding.id });
        loadClassifications();
    }
}, { immediate: true });

// Watch for finding data availability
watch(() => findingStore.findings, (newVal, oldVal) => {
    console.log('📊 [FindingsDetail] findingStore.findings changed:', { 
        oldCount: oldVal?.length || 0, 
        newCount: newVal?.length || 0,
        findingId: props.findingId
    });
    
    // Reload classifications when findings data is available
    if (newVal && newVal.length > 0) {
        console.log('🔄 [FindingsDetail] Reloading classifications due to findings data change');
        safeLoadFindingsAndClassifications();
    }
}, { immediate: true });
</script>

<style scoped>
.finding-card {
    transition: all 0.3s ease;
}

.finding-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    transform: translateY(-2px);
}

.classification-item {
    background-color: #f8f9fa;
    transition: all 0.2s ease;
}

.classification-item:hover {
    background-color: #e9ecef;
}

.badge {
    font-size: 0.75rem;
}

.form-select-sm {
    font-size: 0.875rem;
}

.form-select-sm.border-success {
    border-color: #198754 !important;
    box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25);
}

.form-select-sm.border-warning {
    border-color: #ffc107 !important;
    box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}

/* Animation for status changes */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.finding-card.updated {
    animation: fadeIn 0.3s ease-out;
}

/* Better spacing for status badges */
.card-header .badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
}

/* Improve button states */
.btn-success:disabled {
    opacity: 0.8;
}

.btn-outline-primary:hover {
    transform: scale(1.02);
}
/* Verbesserte Klassifikations-Darstellung */
.classification-item {
    background-color: #f8f9fa;
    transition: all 0.2s ease;
    position: relative;
}

.classification-item:hover {
    background-color: #e9ecef;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.selected-choice-alert {
    background-color: rgba(25, 135, 84, 0.1);
    border: 1px solid rgba(25, 135, 84, 0.2);
    border-radius: 4px;
    font-size: 0.875rem;
}

.form-select-sm.border-success {
    border-color: #198754 !important;
    box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25);
}

.form-select-sm.border-warning {
    border-color: #ffc107 !important;
    box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}

@keyframes highlight {
    0% { background-color: #d1ecf1; }
    100% { background-color: #f8f9fa; }
}

/* Animation für Auswahl-Updates */
.classification-item.updated {
    animation: highlight 0.5s ease-out;
}

/* Styles für die Zusammenfassung der ausgewählten Klassifikationen */
.selected-classifications-summary {
    border: 1px solid #007bff;
    background-color: #e7f1ff;
}

.selected-classifications-summary h6 {
    color: #0056b3;
}

.selected-classifications-summary .badge {
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
}
</style>