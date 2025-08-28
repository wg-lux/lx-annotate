<template>
    <div class="finding-card card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
                <h5 class="card-title mb-0">{{ finding?.name || 'Undefinierter Befund' }}</h5>
                <span
                    v-if="isAddedToExamination"
                    class="badge bg-success"
                    title="Bereits zur Untersuchung hinzugefügt"
                >
                    <i class="fas fa-check-circle"></i> Hinzugefügt
                </span>
            </div>
            <div class="d-flex gap-2">
                <button 
                    v-if="!isAddedToExamination"
                    class="btn btn-sm"
                    :class="hasAllRequiredClassifications ? 'btn-outline-primary' : 'btn-outline-warning'"
                    @click="addToExamination"
                    :disabled="loading || !hasAllRequiredClassifications"
                    :title="hasAllRequiredClassifications ? 'Befund hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen'"
                >
                    <i class="fas" :class="hasAllRequiredClassifications ? 'fa-plus' : 'fa-exclamation-triangle'"></i>
                    {{ hasAllRequiredClassifications ? 'Hinzufügen' : 'Klassifikation erforderlich' }}
                </button>
                <button
                    v-else
                    class="btn btn-sm btn-success"
                    disabled
                >
                    <i class="fas fa-check"></i> Hinzugefügt
                </button>
            </div>
        </div>
        
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
                    <div v-for="classification in classifications" :key="classification.id" class="classification-item mb-3 p-2 border rounded">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong>{{ classification.name }}</strong>
                            <div class="d-flex align-items-center gap-1">
                                <span v-if="classification.required" class="badge bg-warning">Erforderlich</span>
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

                        <!-- Choices Dropdown -->
                        <div v-if="classification.choices && classification.choices.length" class="mb-2">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="form-label small mb-0">Auswahl:</label>
                                <div class="d-flex align-items-center gap-1">
                                    <span
                                        v-if="selectedChoices[classification.id]"
                                        class="badge bg-success"
                                        title="Klassifikation ausgewählt"
                                    >
                                        <i class="fas fa-check"></i>
                                    </span>
                                    <span
                                        v-else-if="classification.required"
                                        class="badge bg-warning"
                                        title="Erforderliche Klassifikation nicht ausgewählt"
                                    >
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </span>
                                </div>
                            </div>
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
                                <option
                                    v-for="(choice, index) in classification.choices"
                                    :key="getChoiceKey(choice, index)"
                                    :value="getChoiceValue(choice)"
                                >
                                    {{ getChoiceLabel(choice) }}
                                </option>
                            </select>
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore, type Finding, type FindingClassification } from '../../stores/findingStore';
import axiosInstance from '@/api/axiosInstance';

const findingStore = useFindingStore();

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
  'added-to-examination': [findingId: number]
  'classification-updated': [findingId: number, classificationId: number, choiceId: number | null]
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

// Methods
const loadClassifications = async () => {
    if (!props.findingId) return;
    
    try {
        loading.value = true;
        classifications.value = await findingStore.fetchFindingClassifications(props.findingId);
    } catch (error) {
        console.error('Error loading classifications:', error);
    } finally {
        loading.value = false;
    }
};

const updateChoice = (classificationId: number, event: Event) => {
    const target = event.target as HTMLSelectElement;
    const choiceId = target.value ? parseInt(target.value) : null;

    selectedChoices.value[classificationId] = choiceId;

    // Emit event to parent component about classification update
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

const addToExamination = async () => {
    if (!props.patientExaminationId || !props.findingId) {
        console.error('Missing patientExaminationId or findingId');
        return;
    }

    try {
        loading.value = true;
        
        // Add finding to examination
        await axiosInstance.post('/api/patient-finding/create/', {
            patientExamination: props.patientExaminationId,
            finding: props.findingId,
            // Add selected choices if any
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        });
        
        // Emit event to parent to update the added status
        emit('added-to-examination', props.findingId);
        
        console.log('Finding added to examination successfully');
    } catch (error) {
        console.error('Error adding finding to examination:', error);
    } finally {
        loading.value = false;
    }
};

// Lifecycle
onMounted(() => {
    loadClassifications();
});

// Watch for finding changes
watch(() => props.findingId, () => {
    loadClassifications();
}, { immediate: true });

// Watch for finding data availability
watch(() => findingStore.findings, () => {
    // Reload classifications when findings data is available
    if (findingStore.findings.length > 0) {
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
</style>