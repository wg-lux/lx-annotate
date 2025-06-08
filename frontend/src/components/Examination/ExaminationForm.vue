<template>
  <div class="examination-view">
    <div class="exam-header">
      <div class="form-row">
        <!-- Examination Selection -->
        <div class="form-group">
          <label for="examination-select">Untersuchung:</label>
          <select 
            id="examination-select"
            v-model="selectedExaminationId" 
            @change="onExaminationChange"
            class="form-control"
          >
            <option :value="null">Untersuchung auswählen...</option>
            <option 
              v-for="examination in availableExaminations" 
              :key="examination.id" 
              :value="examination.id"
            >
              {{ examination.name_de || examination.name }}
            </option>
          </select>
        </div>

        <!-- Finding Selection -->
        <div class="form-group" v-if="selectedExaminationId">
          <label for="finding-select">Befund:</label>
          <select 
            id="finding-select"
            v-model="selectedFindingId" 
            @change="onFindingChange"
            class="form-control"
          >
            <option :value="null">Befund auswählen...</option>
            <option 
              v-for="finding in availableFindings" 
              :key="finding.id" 
              :value="finding.id"
            >
              {{ finding.name_de || finding.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="exam-body" v-if="selectedFindingId && findingDataLoaded">
      <!-- Sidebar: Category tabs -->
      <div class="categories-panel">
        <div class="category-tabs">
          <button 
            :class="['tab-button', { active: activeTab === 'location' }]"
            @click="activeTab = 'location'"
          >
            Lokalisation
            <span class="required-indicator" v-if="hasRequiredLocationClassifications">*</span>
          </button>
          <button 
            :class="['tab-button', { active: activeTab === 'morphology' }]"
            @click="activeTab = 'morphology'"
          >
            Morphologie
            <span class="required-indicator" v-if="hasRequiredMorphologyClassifications">*</span>
          </button>
        </div>
      </div>

      <!-- Editor column -->
      <div class="editor-panel">
        <!-- Location Classifications -->
        <div v-if="activeTab === 'location'" class="category-editor">
          <h3>Lokalisation</h3>
          <div class="card-container">
            <ClassificationCard
              v-for="classification in locationClassifications"
              :key="`location-${classification.id}`"
              :label="classification.name_de || classification.name"
              :options="classification.choices.map((choice: LocationClassificationChoice) => ({ id: choice.id, name: choice.name_de || choice.name }))"
              :model-value="getSelectedLocationChoicesForClassification(classification.id)"
              @update:model-value="updateLocationChoicesForClassification(classification.id, $event)"
              :compact="true"
              :single-select="false"
              :class="{ 'border-warning': isRequiredLocationClassification(classification.id) && !hasSelectedLocationChoiceForClassification(classification.id) }"
            />
          </div>
        </div>

        <!-- Morphology Classifications -->
        <div v-if="activeTab === 'morphology'" class="category-editor">
          <h3>Morphologie</h3>
          <div class="card-container">
            <ClassificationCard
              v-for="classification in morphologyClassifications"
              :key="`morphology-${classification.id}`"
              :label="classification.name_de || classification.name"
              :options="classification.choices.map((choice: MorphologyClassificationChoice) => ({ id: choice.id, name: choice.name_de || choice.name }))"
              :model-value="getSelectedMorphologyChoicesForClassification(classification.id)"
              @update:model-value="updateMorphologyChoicesForClassification(classification.id, $event)"
              :compact="true"
              :single-select="false"
              :class="{ 'border-warning': isRequiredMorphologyClassification(classification.id) && !hasSelectedMorphologyChoiceForClassification(classification.id) }"
            />
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions" v-if="selectedFindingId">
          <!-- Validation Errors -->
          <div v-if="validationErrors.length > 0" class="alert alert-warning">
            <ul class="mb-0">
              <li v-for="error in validationErrors" :key="error">{{ error }}</li>
            </ul>
          </div>

          <!-- Notes Section -->
          <div class="form-group">
            <label for="notes">Notizen (optional):</label>
            <textarea 
              id="notes"
              v-model="notes"
              class="form-control"
              rows="3"
              placeholder="Zusätzliche Bemerkungen..."
            />
          </div>

          <!-- Save Button -->
          <div class="button-group">
            <button 
              @click="saveFinding" 
              :disabled="!canSave"
              class="btn btn-primary"
            >
              Befund speichern
            </button>
            <button 
              @click="resetForm" 
              class="btn btn-secondary"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <div v-if="!selectedExaminationId" class="help-text">
      <p>Wählen Sie zunächst eine Untersuchung aus, um zu beginnen.</p>
    </div>
    <div v-else-if="!selectedFindingId" class="help-text">
      <p>Wählen Sie einen Befund aus, um die Klassifikationen zu bearbeiten.</p>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import type { 
  Examination, 
  Finding, 
  LocationClassification, 
  MorphologyClassification,
  LocationClassificationChoice,
  MorphologyClassificationChoice
} from '@/stores/examinationStore';
import ClassificationCard from './ClassificationCard.vue';

// Props
interface Props {
  videoTimestamp?: number | null;
  videoId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  videoTimestamp: null,
  videoId: null
});

// Emits
const emit = defineEmits<{
  'examination-saved': [data: any]
}>();

// Store
const examinationStore = useExaminationStore();

// Extended interfaces for internal use
interface ExtendedLocationClassification extends LocationClassification {
  required?: boolean;
}

interface ExtendedMorphologyClassification extends MorphologyClassification {
  required?: boolean;
}

// Reactive state
const locationClassifications = ref<ExtendedLocationClassification[]>([]);
const morphologyClassifications = ref<ExtendedMorphologyClassification[]>([]);

// Current finding data structure - store selected choice IDs for each classification
const selectedLocationChoices = ref<number[]>([]);
const selectedMorphologyChoices = ref<number[]>([]);

// Form state
const notes = ref<string>('');
const findingDataLoaded = ref<boolean>(false);

// Local state
const activeTab = ref<'location' | 'morphology'>('location');

// Computed values from store
const availableExaminations = computed(() => examinationStore.examinations);
const availableFindings = computed(() => examinationStore.availableFindings);
const loading = computed(() => examinationStore.loading);
const error = computed(() => examinationStore.error);

// Local computed values
const selectedExaminationId = computed({
  get: () => examinationStore.selectedExaminationId,
  set: (value) => {
    if (value) {
      examinationStore.setSelectedExamination(value);
      onExaminationChange();
    }
  }
});

const selectedFindingId = computed({
  get: () => examinationStore.selectedFindingId,
  set: (value) => {
    if (value) {
      examinationStore.setSelectedFinding(value);
      onFindingChange();
    }
  }
});

const hasRequiredLocationClassifications = computed(() => {
  return locationClassifications.value.some(c => c.required === true);
});

const hasRequiredMorphologyClassifications = computed(() => {
  return morphologyClassifications.value.some(c => c.required === true);
});

const validationErrors = computed(() => {
  const errors: string[] = [];
  
  if (!selectedExaminationId.value) {
    errors.push('Untersuchung erforderlich');
  }
  
  if (!selectedFindingId.value) {
    errors.push('Befund erforderlich');
  }
  
  // Check required location classifications
  for (const classification of locationClassifications.value) {
    if (classification.required) {
      const hasChoice = classification.choices?.some((choice: LocationClassificationChoice) => 
        selectedLocationChoices.value.includes(choice.id)
      );
      if (!hasChoice) {
        errors.push(`Bitte wählen Sie eine Option für ${classification.name_de || classification.name}`);
      }
    }
  }

  // Check required morphology classifications
  for (const classification of morphologyClassifications.value) {
    if (classification.required) {
      const hasChoice = classification.choices?.some((choice: MorphologyClassificationChoice) => 
        selectedMorphologyChoices.value.includes(choice.id)
      );
      if (!hasChoice) {
        errors.push(`Bitte wählen Sie eine Option für ${classification.name_de || classification.name}`);
      }
    }
  }
  
  return errors;
});

const canSave = computed(() => 
  validationErrors.value.length === 0 && 
  selectedExaminationId.value !== null &&
  selectedFindingId.value !== null
);

// Methods
async function onExaminationChange(): Promise<void> {
  if (selectedExaminationId.value) {
    // Reset finding-related state
    selectedFindingId.value = null;
    selectedLocationChoices.value = [];
    selectedMorphologyChoices.value = [];
    findingDataLoaded.value = false;
    activeTab.value = 'location';
  }
}

async function onFindingChange(): Promise<void> {
  if (selectedFindingId.value) {
    try {
      // Load classifications for the selected finding
      const result = await examinationStore.loadFindingClassifications(selectedFindingId.value);
      
      // Update local state with classification data including required flags
      locationClassifications.value = result.locationClassifications.map(c => ({
        ...c,
        required: c.required || false
      }));
      
      morphologyClassifications.value = result.morphologyClassifications.map(c => ({
        ...c,
        required: c.required || false
      }));
      
      findingDataLoaded.value = true;
      
      // Reset selections when finding changes
      selectedLocationChoices.value = [];
      selectedMorphologyChoices.value = [];
      activeTab.value = 'location';
      
    } catch (err) {
      console.error('Error loading finding classifications:', err);
      findingDataLoaded.value = false;
    }
  }
}

function isRequiredLocationClassification(classificationId: number): boolean {
  const classification = locationClassifications.value.find(c => c.id === classificationId);
  return classification?.required || false;
}

function isRequiredMorphologyClassification(classificationId: number): boolean {
  const classification = morphologyClassifications.value.find(c => c.id === classificationId);
  return classification?.required || false;
}

function getSelectedLocationChoicesForClassification(classificationId: number): number[] {
  const classification = locationClassifications.value.find(c => c.id === classificationId);
  if (!classification) return [];
  
  return selectedLocationChoices.value.filter(choiceId =>
    classification.choices && classification.choices.some((choice: LocationClassificationChoice) => choice.id === choiceId)
  );
}

function getSelectedMorphologyChoicesForClassification(classificationId: number): number[] {
  const classification = morphologyClassifications.value.find(c => c.id === classificationId);
  if (!classification) return [];
  
  return selectedMorphologyChoices.value.filter(choiceId =>
    classification.choices && classification.choices.some((choice: MorphologyClassificationChoice) => choice.id === choiceId)
  );
}

function updateLocationChoicesForClassification(classificationId: number, choiceIds: number[]): void {
  const classification = locationClassifications.value.find(c => c.id === classificationId);
  if (!classification) return;
  
  // Remove all choices from this classification
  const otherChoices = selectedLocationChoices.value.filter(choiceId =>
    !classification.choices || !classification.choices.some((choice: LocationClassificationChoice) => choice.id === choiceId)
  );
  
  // Add new choices
  selectedLocationChoices.value = [...otherChoices, ...choiceIds];
  
  // Update store
  examinationStore.updateLocationChoices(selectedLocationChoices.value);
}

function updateMorphologyChoicesForClassification(classificationId: number, choiceIds: number[]): void {
  const classification = morphologyClassifications.value.find(c => c.id === classificationId);
  if (!classification) return;
  
  // Remove all choices from this classification
  const otherChoices = selectedMorphologyChoices.value.filter(choiceId =>
    !classification.choices || !classification.choices.some((choice: MorphologyClassificationChoice) => choice.id === choiceId)
  );
  
  // Add new choices
  selectedMorphologyChoices.value = [...otherChoices, ...choiceIds];
  
  // Update store
  examinationStore.updateMorphologyChoices(selectedMorphologyChoices.value);
}

function hasSelectedLocationChoiceForClassification(classificationId: number): boolean {
  return getSelectedLocationChoicesForClassification(classificationId).length > 0;
}

function hasSelectedMorphologyChoiceForClassification(classificationId: number): boolean {
  return getSelectedMorphologyChoicesForClassification(classificationId).length > 0;
}

async function saveFinding(): Promise<void> {
  if (!canSave.value) return;

  try {
    // Update store with current notes
    examinationStore.updateNotes(notes.value);
    
    // Save through store
    const result = await examinationStore.savePatientFinding(props.videoId || undefined, props.videoTimestamp || undefined);
    
    if (result) {
      emit('examination-saved', result);
      
      // Reset form
      resetForm();
      
      console.log('Patient finding saved successfully:', result);
    }
  } catch (err) {
    console.error('Error saving patient finding:', err);
  }
}

function resetForm(): void {
  examinationStore.resetForm();
  selectedLocationChoices.value = [];
  selectedMorphologyChoices.value = [];
  notes.value = '';
  activeTab.value = 'location';
  findingDataLoaded.value = false;
}

// Load data on mount
onMounted(() => {
  examinationStore.loadExaminations();
});
</script>

<style scoped>
.examination-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.exam-header {
  margin-bottom: 30px;
}

.exam-header h2 {
  margin-bottom: 20px;
  color: #333;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.exam-body {
  display: flex;
  gap: 20px;
  min-height: 500px;
}

.categories-panel {
  width: 200px;
  flex-shrink: 0;
}

.category-tabs {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tab-button {
  padding: 12px 15px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
}

.tab-button:hover {
  background: #e9ecef;
}

.tab-button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.required-indicator {
  color: #dc3545;
  font-weight: bold;
  margin-left: 5px;
}

.editor-panel {
  flex: 1;
}

.category-editor h3 {
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.card-container {
  display: grid;
  gap: 15px;
}

.form-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.alert {
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.alert-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.alert-danger {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert ul {
  margin: 0;
  padding-left: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.help-text {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  margin-top: 50px;
}

.border-warning {
  border-color: #ffc107 !important;
  border-width: 2px !important;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
  
  .exam-body {
    flex-direction: column;
  }
  
  .categories-panel {
    width: 100%;
  }
  
  .category-tabs {
    flex-direction: row;
    overflow-x: auto;
  }
  
  .tab-button {
    white-space: nowrap;
    min-width: 120px;
  }
}
</style>