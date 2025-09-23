<!--
/**
 * AddableFindingsDetail.vue
 * 
 * Component for managing medical findings within patient examinations.
 * Provides a comprehensive interface for viewing available findings,
 * adding new patient findings with proper classifications, and managing
 * existing findings with edit/delete capabilities.
 * 
 * Features:
 * - Tabbed interface: Available Findings / Added Findings
 * - Finding selection with search and filter capabilities
 * - Classification configuration for each finding
 * - Real-time validation of required classifications
 * - CRUD operations for patient findings
 * - Responsive design with Bootstrap styling
 * 
 * Component Structure:
 * - Finding Selector: Browse and select from available findings
 * - Classification Configuration: Set required and optional classifications
 * - Added Findings Management: View, edit, and delete existing patient findings
 * - Form Validation: Ensures all required fields are completed
 * 
 * Dependencies:
 * - findingStore: For managing global findings and classifications
 * - patientFindingStore: For patient-specific finding operations
 * - examinationStore: For current examination context
 * 
 * @component AddableFindingsDetail
 * @author LX Annotate Development Team
 * @version 2.0
 */
-->
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
                    <a class="nav-link" :class="{ active: activeTab === 'added' }" @click.prevent="switchToAddedTab" href="#">
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
                <!-- Debug Information -->
                <details class="mb-3">
                    <summary class="alert alert-info mb-0 cursor-pointer">🐛 Debug Information (Click to expand)</summary>
                    <div class="alert alert-info mb-0 mt-2">
                        <p><strong>AddedFindings Count:</strong> {{ addedFindings.length }}</p>
                        <p><strong>Current PatientExaminationId:</strong> {{ resolvedPatientExaminationId }}</p>
                        <p><strong>PatientFindingStore Count:</strong> {{ patientFindingStore.patientFindings.length }}</p>
                        <p><strong>Store Loading:</strong> {{ patientFindingStore.loading }}</p>
                        <p><strong>Store Error:</strong> {{ patientFindingStore.error || 'None' }}</p>
                        <details class="mt-2">
                            <summary>Raw Store Data</summary>
                            <pre>{{ JSON.stringify(patientFindingStore.patientFindings, null, 2) }}</pre>
                        </details>
                        <details class="mt-2">
                            <summary>Processed addedFindings</summary>
                            <pre>{{ JSON.stringify(addedFindings, null, 2) }}</pre>
                        </details>
                    </div>
                </details>
                
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
                                        <h6 class="card-title small fw-bold text-success">{{ finding.nameDe || finding.name || 'Unnamed Finding' }}</h6>
                                        <p v-if="finding.description" class="card-text small text-muted mb-2">
                                            {{ finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description }}
                                        </p>
                                        <span class="badge bg-info text-dark small">ID: {{ finding.id || 'No ID' }}</span>
                                        
                                        <!-- Classifications Display -->
                                        <div v-if="finding.patientClassifications && finding.patientClassifications.length > 0" class="mt-2">
                                            <small class="text-muted d-block mb-1">
                                                <i class="fas fa-tags me-1"></i>
                                                Klassifikationen ({{ finding.patientClassifications.length }}):
                                            </small>
                                            <div class="classification-list">
                                                <div 
                                                    v-for="classification in finding.patientClassifications" 
                                                    :key="classification.id"
                                                    class="classification-item mb-1"
                                                >
                                                    <span class="badge bg-light text-dark small border">
                                                        <strong>{{ classification.classification.name }}:</strong>
                                                        <span class="text-primary">{{ classification.choice.name }}</span>
                                                        <i v-if="!classification.is_active" class="fas fa-exclamation-triangle text-warning ms-1" title="Inactive"></i>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-else class="mt-2">
                                            <small class="text-muted">
                                                <i class="fas fa-info-circle me-1"></i>
                                                Keine Klassifikationen
                                            </small>
                                        </div>
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
/**
 * AddableFindingsDetail Component Script
 * 
 * TypeScript composition API setup for managing medical findings within
 * patient examinations. Handles finding selection, classification configuration,
 * and patient finding CRUD operations.
 * 
 * Key Functionality:
 * - Dynamic finding loading based on examination context
 * - Real-time classification validation and form management
 * - Integration with multiple Pinia stores for state management
 * - Reactive UI updates based on store state changes
 * - Error handling and user feedback
 */

import { ref, computed, onMounted, watch } from 'vue';
import { debounce } from 'lodash-es';
import { useFindingStore, type Finding, type FindingClassification, type FindingClassificationChoice } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';
import { deepMutable } from '@/utils/deepMutable';

// Store instances
const patientExaminationStore = usePatientExaminationStore();
const findingClassificationStore = useFindingClassificationStore();
const findingStore = useFindingStore();
const patientFindingStore = usePatientFindingStore();
const examinationStore = useExaminationStore();

// Get current patient examination ID from store
const patientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();
patientExaminationStore.setCurrentPatientExaminationId(patientExaminationId);

/**
 * Component Props
 * 
 * @interface Props
 * @property {number} [patientExaminationId] - Optional patient examination ID override
 * @property {number} [examinationId] - Optional examination ID for context
 */
interface Props {
    patientExaminationId?: number;
    examinationId?: number;
}

const props = withDefaults(defineProps<Props>(), {
    patientExaminationId: undefined,
    examinationId: undefined
});

/**
 * Watcher for patient examination ID changes
 * 
 * Monitors changes to the current patient examination ID and triggers
 * data reloading when the ID changes, ensuring UI stays synchronized
 * with the current examination context.
 */
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

/**
 * Component Events
 * 
 * @event finding-added - Emitted when a finding is successfully added
 * @param {number} findingId - The ID of the added finding
 * @param {string} findingName - The name of the added finding
 * 
 * @event finding-error - Emitted when an error occurs during finding operations
 * @param {string} error - The error message describing what went wrong
 */
const emit = defineEmits<{
  'finding-added': [findingId: number, findingName: string]
  'finding-error': [error: string]
}>();

/**
 * Component Reactive State
 * 
 * Manages the local state for the component including UI state,
 * selected findings, and classification configurations.
 */
// UI State
const loading = ref(false);
const activeTab = ref<'available' | 'added'>('available');
const showFindingSelector = ref(false);

// Finding Selection State
const selectedFindingId = ref<number | null>(null);
const findingClassifications = ref<FindingClassification[]>([]);
const selectedChoices = ref<Record<number, number>>({});
// State for mutable finding management
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
type MutableFinding = Mutable<Finding>;
type EnhancedFinding = MutableFinding & {
  patientFindingId?: number;
  patientClassifications?: Array<{
    id: number;
    classification: {
      id: number;
      name: string;
      description?: string;
    };
    choice: {
      id: number;
      name: string;
      description?: string;
    };
    is_active: boolean;
  }>;
};
const availableExaminationFindings = ref<Finding[]>([]);
const addedFindings = ref<EnhancedFinding[]>([]);

/**
 * Computed Properties
 * 
 * Reactive computed values that automatically update based on component state
 * and store changes, providing derived data for the template and methods.
 */

/**
 * Resolved patient examination ID
 * 
 * Returns the patient examination ID from props if provided,
 * otherwise falls back to the store value.
 */
const resolvedPatientExaminationId = computed(
  () => props.patientExaminationId ?? patientExaminationStore.getCurrentPatientExaminationId()
);

/**
 * Available findings for the current examination
 * 
 * Returns the list of findings that can be added to the current examination.
 * This is filtered based on the examination context.
 */
const availableFindings = computed(() => {
    return availableExaminationFindings.value;
});

/**
 * Fetched added findings (computed async)
 * 
 * Asynchronously computes the findings that have already been added
 * to the current patient examination.
 */
const fetchedAddedFindings = computed(async () => {
    const currentPatientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();
    if (!currentPatientExaminationId) return [];
    const findings = await findingStore.fetchFindingsByPatientExamination(currentPatientExaminationId);
    return findings || [];
});

/**
 * Currently selected finding
 * 
 * Returns the Finding object for the currently selected finding ID,
 * searching through available findings and classification store.
 */
const selectedFinding = computed((): Finding | undefined => {
    if (!selectedFindingId.value) return undefined;
    return availableFindings.value.find(f => f.id === selectedFindingId.value) || 
           findingClassificationStore.getFindingById(selectedFindingId.value);
});

/**
 * Validation: All required classifications selected
 * 
 * Checks if all required classifications for the selected finding
 * have been properly configured by the user.
 */
const hasAllRequiredClassifications = computed(() => {
    if (!findingClassifications.value.length) return true;

    return findingClassifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});

/**
 * Can add finding validation
 * 
 * Determines if the current state allows adding a finding to the patient.
 * Checks for selected finding, required classifications, and valid context.
 */
const canAddFinding = computed(() => Boolean(
  selectedFindingId.value &&
  hasAllRequiredClassifications.value &&
  resolvedPatientExaminationId.value &&
  !loading.value
));

/**
 * Classification completion progress
 * 
 * Calculates the progress of required classification selection,
 * providing data for progress indicators in the UI.
 */
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

/**
 * Component Methods
 * 
 * Functions that handle user interactions, data loading, and business logic
 * for managing findings and their classifications.
 */

/**
 * Loads added findings for the current examination
 * 
 * Fetches patient findings from the store and converts them to mutable
 * format using deepMutable utility to handle readonly constraints.
 */
async function loadAddedFindingsForCurrentExam() {
  const id = patientExaminationStore.getCurrentPatientExaminationId();
  if (!id) {
    addedFindings.value = [];
    return;
  }
  
  await patientFindingStore.fetchPatientFindings(id);
  
  // 🐛 PROBLEM DEBUG: PatientFinding hat möglicherweise keine Finding-Daten
  console.log('🔍 [AddableFindingsDetail] Debug PatientFindings:', patientFindingStore.patientFindings);
  
  addedFindings.value = patientFindingStore.patientFindings.map(pf => {
    console.log('🔍 [AddableFindingsDetail] PatientFinding:', pf);
    console.log('🔍 [AddableFindingsDetail] Finding in PatientFinding:', pf.finding);
    
    let finding = pf.finding;
    
    // 🔧 FIX: Wenn nur Finding-ID vorhanden, lade vollständiges Finding
    if (typeof finding === 'number' || (finding && !finding.name && !finding.nameDe)) {
      const findingId = typeof finding === 'number' ? finding : finding.id;
      console.log('🔄 [AddableFindingsDetail] Loading complete finding for ID:', findingId);
      
      // Suche im FindingClassificationStore
      const completeFinding = findingClassificationStore.getFindingById(findingId);
      if (completeFinding) {
        finding = completeFinding;
        console.log('✅ [AddableFindingsDetail] Found complete finding:', finding);
      } else {
        console.warn('⚠️ [AddableFindingsDetail] Complete finding not found for ID:', findingId);
        return null;
      }
    }
    
    // Prüfe, ob pf.finding existiert und vollständig ist
    if (!finding || !finding.id) {
      console.error('❌ [AddableFindingsDetail] PatientFinding has no valid finding data:', pf);
      return null;
    }
    
    return deepMutable(finding) as MutableFinding;
  }).filter((finding): finding is MutableFinding => finding !== null); // Type guard für null-Filterung
  
  // 🔧 ENHANCE: Klassifikationen zu den Findings hinzufügen
  const enhancedFindings: EnhancedFinding[] = patientFindingStore.patientFindings.map(pf => {
    // Hole das korrespondierende Finding aus der gefilterten Liste
    const correspondingFinding = addedFindings.value.find(f => {
      const pfFindingId = typeof pf.finding === 'number' ? pf.finding : pf.finding?.id;
      return f.id === pfFindingId;
    });
    
    if (correspondingFinding) {
      const enhanced: EnhancedFinding = {
        ...correspondingFinding,
        patientFindingId: pf.id,
        patientClassifications: pf.classifications?.map(cls => ({
          id: cls.id,
          classification: {
            id: cls.classification.id,
            name: cls.classification.name || 'Unnamed Classification',
            description: cls.classification.description
          },
          choice: {
            id: cls.classification_choice.id,
            name: cls.classification_choice.name,
            description: undefined // FindingClassificationChoice doesn't have description
          },
          is_active: cls.is_active
        })) || []
      };
      
      console.log('🔧 [AddableFindingsDetail] Enhanced finding with classifications:', {
        findingId: enhanced.id,
        name: enhanced.name,
        classificationsCount: enhanced.patientClassifications?.length || 0,
        rawClassifications: pf.classifications,
        patientFindingId: pf.id
      });
      
      return enhanced;
    }
    
    return correspondingFinding;
  }).filter((finding): finding is EnhancedFinding => finding !== null);
  
  addedFindings.value = enhancedFindings;
  
  console.log('✅ [AddableFindingsDetail] Final addedFindings:', addedFindings.value);
}

/**
 * Debounced function to load added findings
 * 
 * Prevents multiple rapid API calls when patient examination ID changes
 * by debouncing the loadAddedFindingsForCurrentExam function.
 */
const debouncedLoadFindings = debounce(async (newId: number | null) => {
  if (newId) {
    console.log('🔄 [AddableFindingsDetail] Loading findings for PE:', newId);
    await loadAddedFindingsForCurrentExam();
  }
}, 150); // 150ms debounce

/**
 * Watcher for patient examination ID changes
 * 
 * Automatically reloads added findings when the patient examination changes,
 * ensuring the UI shows the correct findings for the current context.
 * Uses debouncing to prevent multiple rapid API calls.
 */
watch(
  () => patientExaminationStore.getCurrentPatientExaminationId(),
  debouncedLoadFindings,
  { immediate: true }
);

/**
 * Selects a finding and loads its classifications
 * 
 * Handles user selection of a finding from the available list,
 * hides the selector, and loads the required classifications.
 * 
 * @param {number} findingId - The ID of the finding to select
 */
const selectFinding = async (findingId: number) => {
    selectedFindingId.value = findingId;
    showFindingSelector.value = false;

    // Load classifications for the selected finding
    await loadFindingClassifications(findingId);
};

/**
 * Clears the current finding selection
 * 
 * Resets all selection state including the selected finding,
 * its classifications, and user choices. Used when user
 * wants to start over or cancel current selection.
 */
const clearSelection = () => {
    selectedFindingId.value = null;
    findingClassifications.value = [];
    selectedChoices.value = {};
};

/**
 * Loads classifications for a specific finding
 * 
 * Fetches the available classifications from the store for the given
 * finding ID. Handles loading state and error scenarios.
 * 
 * @param {number} findingId - The ID of the finding to load classifications for
 */
const loadFindingClassifications = async (findingId: number) => {
    try {
        loading.value = true;
        findingClassifications.value = findingClassificationStore.getClassificationsForFinding(findingId);
    } catch (error) {
        console.error('Error loading classifications:', error);
        emit('finding-error', 'Fehler beim Laden der Klassifikationen');
    } finally {
        loading.value = false;
    }
};

/**
 * Updates classification choice selection
 * 
 * Handles user selection of classification choices from dropdown menus.
 * Updates the selectedChoices reactive object and manages form validation.
 * 
 * @param {number} classificationId - The ID of the classification being updated
 * @param {Event} event - The change event from the select element
 */
const updateChoice = (classificationId: number, event: Event) => {
    const target = event.target as HTMLSelectElement;
    const choiceId = target.value ? parseInt(target.value) : undefined;

    if (choiceId) {
        selectedChoices.value[classificationId] = choiceId;
    } else {
        delete selectedChoices.value[classificationId];
    }
};

/**
 * Adds the configured finding to the patient examination
 * 
 * Validates the current state, prepares the finding data with classifications,
 * and submits it to the patient finding store. Handles success/error states
 * and emits appropriate events for parent components.
 */
const addFindingToExamination = async () => {
    if (!canAddFinding.value || !selectedFinding.value || !resolvedPatientExaminationId.value || !selectedFindingId.value) {
        
        return;
    }

    try {
        loading.value = true;

        // Prepare the data for the patient finding store
        const findingData = {
            patientExamination: resolvedPatientExaminationId.value,
            finding: selectedFindingId.value,
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        };

        // Use patientFindingStore to create the patient finding - should be linked to the patient examination!
        patientFindingStore.setCurrentPatientExaminationId(resolvedPatientExaminationId.value)

        const newPatientFinding = await patientFindingStore.createPatientFinding(findingData);

        // WICHTIG: Store sollte automatisch aktualisiert werden, aber erzwinge lokale UI-Update
        console.log('✅ Finding created, updating UI directly');
        
        // Füge direkt zur lokalen Liste hinzu (sofortige UI-Update)
        const newFindingId = newPatientFinding.finding.id;
        const createdFinding = findingClassificationStore.getFindingById(newFindingId);
        if (createdFinding) {
            console.log('📋 Found created finding in store, using store version');
            const enhancedCreatedFinding: EnhancedFinding = {
                ...deepMutable(createdFinding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: newPatientFinding.classifications?.map(cls => ({
                    id: cls.id,
                    classification: {
                        id: cls.classification.id,
                        name: cls.classification.name || 'Unnamed Classification',
                        description: cls.classification.description
                    },
                    choice: {
                        id: cls.classification_choice.id,
                        name: cls.classification_choice.name,
                        description: undefined
                    },
                    is_active: cls.is_active
                })) || []
            };
            addedFindings.value.push(enhancedCreatedFinding);
        } else {
            console.log('📋 Created finding not found in store, using response data');
            const enhancedResponseFinding: EnhancedFinding = {
                ...deepMutable(newPatientFinding.finding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: newPatientFinding.classifications?.map(cls => ({
                    id: cls.id,
                    classification: {
                        id: cls.classification.id,
                        name: cls.classification.name || 'Unnamed Classification',
                        description: cls.classification.description
                    },
                    choice: {
                        id: cls.classification_choice.id,
                        name: cls.classification_choice.name,
                        description: undefined
                    },
                    is_active: cls.is_active
                })) || []
            };
            addedFindings.value.push(enhancedResponseFinding);
        }
        
        // ENTFERNT: await loadAddedFindingsForCurrentExam() - verhindert doppelte API calls
        const findingName = selectedFinding.value.nameDe || selectedFinding.value.name;
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

/**
 * Switches to the added findings tab and ensures data is loaded
 */
const switchToAddedTab = async () => {
    console.log('🔄 [AddableFindingsDetail] Switching to added findings tab');
    console.log('🔍 [AddableFindingsDetail] Current addedFindings count before load:', addedFindings.value.length);
    
    activeTab.value = 'added';
    
    // Force reload of added findings when switching to tab
    await loadAddedFindingsForCurrentExam();
    
    console.log('🔍 [AddableFindingsDetail] addedFindings count after load:', addedFindings.value.length);
};

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
    if (!examId && props.patientExaminationId) {
      // Hole Examination ID aus PatientExamination
      const patientExamination = patientExaminationStore.getPatientExaminationById(props.patientExaminationId);
      examId = patientExamination?.examination?.id;
    }
    
    if (!examId) {
      console.warn('Keine Examination ID verfügbar für Findings-Laden');
      return;
    }
    
    // Verwende den korrigierten Store-Aufruf
    const findings = await examinationStore.loadFindingsForExamination(examId);
    availableExaminationFindings.value = findings.map((f: any) => deepMutable(f)) as unknown as Finding[];
    
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

/**
 * Debounced function to load findings and classifications
 * 
 * Prevents multiple rapid API calls when component props change.
 */
const debouncedLoadFindingsAndClassifications = debounce(async () => {
  await loadFindingsAndClassificationsNew();
}, 100);

// Watchers with debouncing to prevent excessive API calls
watch(() => props.patientExaminationId, async () => {
    if (props.patientExaminationId) {
        console.log('🔄 [AddableFindingsDetail] patientExaminationId prop changed:', props.patientExaminationId);
        await debouncedLoadFindingsAndClassifications();
    }
}, { immediate: true });

watch(() => props.examinationId, async () => {
    if (props.examinationId) {
        console.log('🔄 [AddableFindingsDetail] examinationId prop changed:', props.examinationId);
        await loadAvailableFindingsForPatientExamination();
    }
}, { immediate: true });

// Load initial data
onMounted(async () => {
    console.log('🚀 [AddableFindingsDetail] Component mounted');
    console.log('🔍 [AddableFindingsDetail] Props:', {
        patientExaminationId: props.patientExaminationId,
        examinationId: props.examinationId
    });
    console.log('🔍 [AddableFindingsDetail] Store state at mount:', {
        currentPatientExaminationId: patientExaminationStore.getCurrentPatientExaminationId(),
        findingClassificationStoreFindings: findingClassificationStore.getAllFindings.length,
        patientFindingStoreCount: patientFindingStore.patientFindings.length
    });
    
    await loadFindingsAndClassificationsNew();
});
</script>