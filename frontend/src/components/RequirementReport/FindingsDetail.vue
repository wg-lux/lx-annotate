<template>
    <div class="finding-card card mb-3">

        
        <div class="card-body">
            <div v-if="loading" class="text-center">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                Lade Details...
            </div>
            
            <div v-else-if="!finding" class="text-center text-muted">
                <p>Finding-Daten werden geladen...</p>
                <small>Finding ID: {{ findingId }}</small>
            </div>
            
            <div v-else>
                <!-- Basic Finding Info -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>ID:</strong> {{ finding.id }}</p>
                        <p><strong>Name (DE):</strong> {{ finding.nameDe || 'N/A' }}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Beschreibung:</strong></p>
                        <p class="text-muted">{{ finding.description || 'Keine Beschreibung verfügbar' }}</p>
                    </div>
                </div>

                <!-- Classifications with Choices Dropdown -->
                <div v-if="classifications.length" class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">Klassifikationen:</h6>
                        <small
                            class="text-muted"
                            :class="classificationStatus.complete ? 'text-success' : 'text-warning'"
                        >
                            <i class="fas" :class="classificationStatus.complete ? 'fa-check-circle' : 'fa-exclamation-triangle'"></i>
                            {{ classificationStatus.selected }}/{{ classificationStatus.required }} erforderlich
                        </small>
                    </div>
                    <div v-for="classification in classifications" :key="classification.id" class="classification-item mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="flex-grow-1">
                                <strong>{{ classification.name }}</strong>
                                <div v-if="classification.required" class="badge bg-warning ms-2">Erforderlich</div>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <!-- Status-Indikator -->
                                <span
                                    v-if="selectedChoices[classification.id]"
                                    class="badge bg-success"
                                    title="Ausgewählt"
                                >
                                    <i class="fas fa-check"></i>
                                </span>
                                <span
                                    v-else-if="classification.required"
                                    class="badge bg-warning"
                                    title="Nicht ausgewählt"
                                >
                                    <i class="fas fa-exclamation-triangle"></i>
                                </span>
                            </div>
                        </div>

                        <!-- Beschreibung -->
                        <p v-if="classification.description" class="text-muted small mb-2">
                            {{ classification.description }}
                        </p>

                        <!-- Auswahl-Dropdown -->
                        <div v-if="classification.choices && classification.choices.length" class="mb-2">
                            <label class="form-label small mb-1">Auswahl:</label>
                            <select
                                class="form-select form-select-sm"
                                :value="selectedChoices[classification.id] || ''"
                                @change="updateChoice(classification.id, $event)"
                                :class="getSelectClass(classification.id, classification.required)"
                            >
                                <option value="">Bitte wählen...</option>
                                <option
                                    v-for="(choice, index) in classification.choices"
                                    :key="getChoiceKey(choice, index)"
                                    :value="getChoiceValue(choice)"
                                >
                                    {{ getChoiceLabel(choice) }}
                                </option>
                            </select>
                        </div>

                        <!-- Ausgewählte Wahl anzeigen -->
                        <div v-if="selectedChoices[classification.id]" class="selected-choice-alert alert alert-success py-1 px-2 mb-0">
                            <small>
                                <i class="fas fa-check-circle"></i>
                                <strong>Ausgewählt:</strong> {{ getSelectedChoiceLabel(classification.id) }}
                            </small>
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
        </div>

        <!-- Zusammenfassung der ausgewählten Klassifikationen -->
        <div v-if="Object.keys(selectedChoices).length > 0" class="selected-classifications-summary mt-3 p-3 bg-light rounded">
            <h6 class="mb-2">
                <i class="fas fa-list-check"></i>
                Ausgewählte Klassifikationen ({{ Object.keys(selectedChoices).filter(id => selectedChoices[Number(id)]).length }})
            </h6>
            <div class="row">
                <div v-for="classification in classifications" :key="classification.id" class="col-md-6 mb-2">
                    <div v-if="selectedChoices[classification.id]" class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">{{ classification.name }}:</small>
                        <span class="badge bg-success">{{ getSelectedChoiceLabel(classification.id) }}</span>
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
                <div>Selected: {{ debugInfo.selectedClassifications }}</div>
                <div>Store Findings: {{ debugInfo.findingStoreFindingsCount }}</div>
                <div>Finding from Store: {{ !!debugInfo.findingFromStore }}</div>
                <div>Classifications Loaded: {{ debugInfo.classificationsLoaded }}</div>
                <div>Has All Required: {{ debugInfo.hasAllRequired }}</div>
            </small>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore, type Finding, type FindingClassification } from '../../stores/findingStore';
import { useExaminationStore } from '@/stores/examinationStore';
import axiosInstance from '@/api/axiosInstance';

const findingStore = useFindingStore();
const examinationStore = useExaminationStore();

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
const selectedChoices = ref<Record<number, any>>({});

// Computed
const finding = computed((): Finding | undefined => {
    return findingStore.getFindingById(props.findingId);
});

const hasAllRequiredClassifications = computed(() => {
    if (!classifications.value.length) return true;

    return classifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});

const classificationStatus = computed(() => {
    const requiredCount = classifications.value.filter(c => c.required).length;
    const selectedCount = classifications.value.filter(c => c.required && selectedChoices.value[c.id]).length;

    return {
        required: requiredCount,
        selected: selectedCount,
        complete: selectedCount === requiredCount
    };
});

// Debug-Informationen
const debugInfo = computed(() => ({
    findingId: props.findingId,
    findingName: finding.value?.name,
    totalClassifications: classifications.value.length,
    requiredClassifications: classifications.value.filter(c => c.required).length,
    selectedClassifications: Object.keys(selectedChoices.value).filter(id => selectedChoices.value[Number(id)]).length,
    selectedChoices: selectedChoices.value,
    hasAllRequired: hasAllRequiredClassifications.value,
    findingStoreFindingsCount: findingStore.findings.length,
    findingFromStore: findingStore.getFindingById(props.findingId),
    classificationsLoaded: classifications.value.length > 0
}));

// Methods
const loadClassifications = async () => {
    console.log('🔍 [FindingsDetail] loadClassifications called with findingId:', props.findingId);
    
    if (!props.findingId) {
        console.warn('⚠️ [FindingsDetail] No findingId provided');
        return;
    }
    
    try {
        loading.value = true;
        console.log('⏳ [FindingsDetail] Loading classifications for findingId:', props.findingId);
        
        classifications.value = await findingStore.fetchFindingClassifications(props.findingId);
        
        console.log('✅ [FindingsDetail] Classifications loaded:', classifications.value.length, 'items');
        console.log('📋 [FindingsDetail] Classifications data:', classifications.value);
        
    } catch (error) {
        console.error('❌ [FindingsDetail] Error loading classifications:', error);
    } finally {
        loading.value = false;
    }
};

const updateChoice = (classificationId: number, event: Event) => {
    const target = event.target as HTMLSelectElement;
    const choiceId = target.value ? parseInt(target.value) : null;

    selectedChoices.value[classificationId] = choiceId;

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

const getChoiceKey = (choice: any, index: number): string => {
    if (typeof choice === 'object' && choice.id) {
        return choice.id.toString();
    }
    return `choice-${index}`;
};

const getChoiceValue = (choice: any): string => {
    if (typeof choice === 'object' && choice.id) {
        return choice.id.toString();
    }
    return choice.toString();
};

const getChoiceLabel = (choice: any): string => {
    if (typeof choice === 'object' && choice.name) {
        return choice.name;
    }
    return choice.toString();
};

const getSelectedChoiceLabel = (classificationId: number): string => {
    const choiceId = selectedChoices.value[classificationId];
    if (!choiceId) return '';
    
    const classification = classifications.value.find(c => c.id === classificationId);
    if (!classification?.choices) return '';
    
    const choice = classification.choices.find(c => 
        (typeof c === 'object' ? c.id : c) == choiceId
    );

    if (choice === null || choice === undefined) {
        return '';
    }
    
    return typeof choice === 'object' && choice.name ? choice.name : choice.toString();
};

const getSelectedChoiceObject = (classificationId: number): any => {
    const choiceId = selectedChoices.value[classificationId];
    if (!choiceId) return null;
    
    const classification = classifications.value.find(c => c.id === classificationId);
    if (!classification?.choices) return null;
    
    return classification.choices.find(c => 
        (typeof c === 'object' ? c.id : c) == choiceId
    );
};

const getSelectClass = (classificationId: number, required: boolean = false): string => {
    const baseClass = 'form-select form-select-sm';
    const hasSelection = selectedChoices.value[classificationId];
    
    if (hasSelection) {
        return `${baseClass} border-success`;
    } else if (required) {
        return `${baseClass} border-warning`;
    }
    
    return baseClass;
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
    
    loadClassifications();
});

// Watch for finding changes
watch(() => props.findingId, (newVal, oldVal) => {
    console.log('👀 [FindingsDetail] findingId changed:', { oldVal, newVal });
    loadClassifications();
}, { immediate: true });

// Watch for finding data availability
watch(() => findingStore.findings, (newVal, oldVal) => {
    console.log('📊 [FindingsDetail] findingStore.findings changed:', { 
        oldCount: oldVal?.length || 0, 
        newCount: newVal?.length || 0,
        findingId: props.findingId,
        findingExists: !!findingStore.getFindingById(props.findingId)
    });
    
    // Reload classifications when findings data is available
    if (findingStore.findings.length > 0) {
        console.log('🔄 [FindingsDetail] Reloading classifications due to findings data change');
        loadClassifications();
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