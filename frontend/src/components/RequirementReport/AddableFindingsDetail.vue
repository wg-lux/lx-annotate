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
 * - CRUD operations for pa;
      // Use adapter for safe processing
      const processedClassifications = adaptPatientClassifications(patientClassifications, pf.finding);
      
      return processedClassifications;
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
                            <pre class="small">{{ JSON.stringify(patientFindingStore.patientFindings.slice(0, 1), null, 2) }}</pre>
                <p class="small text-muted mt-2">Showing first PatientFinding only. Total: {{ patientFindingStore.patientFindings.length }}</p>
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
                                        <div v-if="finding.patientClassifications" class="mt-2">
                                            <small class="text-muted d-block mb-1">
                                                <i class="fas fa-tags me-1"></i>
                                                Klassifikationen ({{ finding.patientClassifications.length }}):
                                            </small>
                                            <div class="classification-list">
                                                <div 
                                                    v-for="(classification, idx) in finding.patientClassifications" 
                                                    :key="`pc-${finding.id}-${idx}-${idx}`"
                                                    class="classification-item mb-1"
                                                >
                                                    <span class="badge bg-light text-dark small border">
                                                        <strong>{{ classification.classification?.name ?? 'Unknown' }}:</strong>
                                                        <span class="text-primary">{{ classification.choice?.name ?? 'Unknown Choice' }}</span>
                                                        <i v-if="classification.is_active === false" class="fas fa-exclamation-triangle text-warning ms-1" title="Inactive"></i>
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
import { filterNecessaryFindings } from '@/utils/findingFilters';
import type { SafePatientClassification } from '@/adapters/patientFinding';

// Type Guards for Classification Shape Detection
type ClassificationDefinition = { id: number; name: string; choices?: any[] };
type PatientClassificationRaw = { 
    id: number;
    finding: number;
    classification: { id: number; name?: string; description?: string }, 
    classification_choice: { id: number; name?: string }
    is_active?: boolean;
    subcategories?: any;
    numerical_descriptors?: any;
};

const isPatientClassification = (x: any): x is PatientClassificationRaw => 
    !!x?.classification?.id && !!x?.classification_choice?.id;

const isClassificationDefinition = (x: any): x is ClassificationDefinition => 
    !!x?.id && typeof x?.name === 'string' && (!x.choices || Array.isArray(x.choices));

// Direct store data access - no complex filtering needed

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
  patientClassifications?: SafePatientClassification[];
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
const resolvedPatientExaminationId = computed(() => {
  const resolved = props.patientExaminationId ?? patientExaminationStore.getCurrentPatientExaminationId();
  console.log('🔍 [DEBUG] resolvedPatientExaminationId:', resolved);
  return resolved;
});

/**
 * Available findings for the current examination
 * 
 * Returns the list of findings that can be added to the current examination.
 * This is filtered based on the examination context.
 */
const availableFindings = computed(() => {
    console.log('🔍 [DEBUG] availableFindings computed - availableExaminationFindings.value:', availableExaminationFindings.value);
    console.log('🔍 [DEBUG] availableFindings computed - count:', availableExaminationFindings.value.length);
    if (availableExaminationFindings.value.length > 0) {
        console.log('🔍 [DEBUG] availableFindings computed - erste 3 Findings:', availableExaminationFindings.value.slice(0, 3));
    }
    return availableExaminationFindings.value;
});

/**
 * Necessary findings (computed from availableFindings)
 * 
 * Returns findings that have at least one required classification.
 * Uses the filterNecessaryFindings utility for consistent logic.
 */
const necessaryFindings = computed(() => filterNecessaryFindings(availableFindings.value));

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
 * Fetches patient findings from the store and converts them to enhanced
 * format with proper finding details and classifications.
 */
async function loadAddedFindingsForCurrentExam() {
  const id = patientExaminationStore.getCurrentPatientExaminationId();
  if (!id) {
    addedFindings.value = [];
    return;
  }
  
  await patientFindingStore.fetchPatientFindings(id);
  
  console.log('🔍 [AddableFindingsDetail] Raw store data:', patientFindingStore.patientFindings);
  
  // 🔧 COMPLETE REWRITE: Handle the actual store structure
  const enhancedFindings: EnhancedFinding[] = [];
  
  for (const pf of patientFindingStore.patientFindings) {
    console.log('� [AddableFindingsDetail] Processing PatientFinding:', {
      id: pf.id,
      findingRef: pf.finding,
      classificationsCount: pf.classifications?.length || 0
    });
    
    // 1️⃣ Get the complete Finding object
    let completeFinding: Finding | undefined;
    const findingId = typeof pf.finding === 'number' ? pf.finding : pf.finding?.id;
    
    if (typeof pf.finding === 'object' && pf.finding?.name) {
      // Finding object is complete
      completeFinding = pf.finding as Finding;
      console.log('✅ [AddableFindingsDetail] Using complete finding from store');
    } else if (findingId) {
      // Finding is just an ID, need to fetch complete object
      completeFinding = findingClassificationStore.getFindingById(findingId);
      console.log('🔄 [AddableFindingsDetail] Fetched finding by ID:', findingId, completeFinding?.name);
    }
    
    if (!completeFinding) {
      console.warn('⚠️ [AddableFindingsDetail] Could not resolve finding for:', findingId);
      continue;
    }
    
    // 2️⃣ Use PatientFinding classifications directly from store
    const patientClassifications = pf.classifications || [];
    
    console.log('🔍 [DEBUG] Using PatientFinding classifications:', {
      findingId: completeFinding.id,
      findingName: completeFinding.name,
      classificationsCount: patientClassifications.length,
      firstClassification: patientClassifications[0]
    });
    
    // 3️⃣ Use PatientFinding classifications directly - they already have the correct structure
    const displayClassifications: SafePatientClassification[] = patientClassifications.map((pc: any) => ({
      id: pc.id,
      finding: completeFinding.id,
      classification: {
        id: pc.classification.id,
        name: pc.classification.name,
        description: pc.classification.description
      },
      choice: {
        id: pc.classification_choice.id,
        name: pc.classification_choice.name
      },
      is_active: pc.is_active,
      subcategories: pc.subcategories || {},
      numerical_descriptors: pc.numerical_descriptors || {}
    }));
    
    const enhanced: EnhancedFinding = {
      ...deepMutable(completeFinding),
      patientFindingId: pf.id,
      patientClassifications: displayClassifications
    };
    
    enhancedFindings.push(enhanced);
    
    console.log('✅ [AddableFindingsDetail] Created enhanced finding:', {
      id: enhanced.id,
      name: enhanced.name || enhanced.nameDe,
      patientFindingId: enhanced.patientFindingId,
      patientClassificationsCount: enhanced.patientClassifications?.length || 0
    });
  }
  
  addedFindings.value = enhancedFindings;
  console.log('✅ [AddableFindingsDetail] Final enhanced findings:', enhancedFindings.length);
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
        
        // 🎯 IMMEDIATE UI FEEDBACK: Create patient classifications for immediate display
        const defs = findingClassifications.value; // definitions for selected finding
        const immediatePatientClassifications: SafePatientClassification[] = defs
          .filter(d => d?.id && selectedChoices.value[d.id])
          .map(d => {
            try {
              return {
                id: -1, // temporary ID
                finding: selectedFindingId.value!,
                classification: { 
                  id: d?.id ?? -1, 
                  name: d?.name ?? 'Unnamed Classification', 
                  description: d?.description ?? undefined
                },
                choice: {
                  id: selectedChoices.value[d.id] ?? -1,
                  name: d?.choices?.find(c => c?.id === selectedChoices.value[d.id])?.name ?? String(selectedChoices.value[d.id] ?? 'Unknown')
                },
                is_active: true,
                subcategories: {},
                numerical_descriptors: {}
              };
            } catch (error) {
              console.error('🚨 [AddableFindingsDetail] Error creating immediate classification:', { error, definition: d });
              return null;
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        // Füge direkt zur lokalen Liste hinzu (sofortige UI-Update)
        const newFindingId = newPatientFinding.finding.id;
        const createdFinding = findingClassificationStore.getFindingById(newFindingId);
        if (createdFinding) {
            console.log('📋 Found created finding in store, using store version');
            
            // 🔒 Use the complete finding's classifications from store
            const serverPatientClassifications = (createdFinding as any).classifications || [];
            const displayServerClassifications: SafePatientClassification[] = [];
            
            serverPatientClassifications.forEach((classification: any) => {
              if (classification.choices && Array.isArray(classification.choices)) {
                classification.choices.forEach((choice: any) => {
                  displayServerClassifications.push({
                    id: choice.id,
                    finding: createdFinding.id,
                    classification: {
                      id: classification.id,
                      name: classification.name || 'Unnamed Classification',
                      description: classification.description
                    },
                    choice: {
                      id: choice.id,
                      name: choice.name || 'Unknown Choice'
                    },
                    is_active: true,
                    subcategories: choice.subcategories || {},
                    numerical_descriptors: choice.numerical_descriptors || {}
                  });
                });
              }
            });

            const enhancedCreatedFinding: EnhancedFinding = {
                ...deepMutable(createdFinding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: displayServerClassifications.length > 0 
                  ? displayServerClassifications
                  : immediatePatientClassifications
            };
            addedFindings.value.push(enhancedCreatedFinding);
        } else {
            console.log('📋 Created finding not found in store, using response data');
            const enhancedResponseFinding: EnhancedFinding = {
                ...deepMutable(newPatientFinding.finding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: immediatePatientClassifications
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
        const findings = response?.data || [];
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
    
    console.log('🔍 [DEBUG] Props:', { examinationId: props.examinationId, patientExaminationId: props.patientExaminationId });
    
    // Priorisiere props.examinationId, falls verfügbar
    let examId = props.examinationId;
    if (!examId && props.patientExaminationId) {
      // Hole Examination ID aus PatientExamination
      const patientExamination = patientExaminationStore.getPatientExaminationById(props.patientExaminationId);
      console.log('🔍 [DEBUG] PatientExamination gefunden:', patientExamination);
      console.log('🔍 [DEBUG] Examination in PatientExamination:', patientExamination?.examination);
      examId = patientExamination?.examination?.id;
      console.log('🔍 [DEBUG] Extrahierte examId:', examId);
    }
    
    if (!examId) {
      console.warn('⚠️ Keine Examination ID verfügbar für Findings-Laden');
      return;
    }
    
    console.log('🔄 [DEBUG] Lade Findings für Examination ID:', examId);
    
    // Verwende den korrigierten Store-Aufruf
    const findings = await examinationStore.loadFindingsForExamination(examId);
    const safeFindings = Array.isArray(findings) ? findings : [];
    availableExaminationFindings.value = safeFindings.map((f: any) => deepMutable(f)) as unknown as Finding[];
    
    console.log('📋 [DEBUG] Geladene Findings für examinationId:', examId, 'findings count:', findings.length);
    console.log('📋 [DEBUG] Findings Details:', findings);
  } catch (error) {
    console.error('❌ Error loading available findings:', error);
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