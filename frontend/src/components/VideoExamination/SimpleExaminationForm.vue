<template>
  <div class="simple-examination-form">
    <!-- Examination Type Selection -->
    <div class="mb-3">
      <label class="form-label">Untersuchungstyp:</label>
      <select 
        v-model.number="selectedExaminationId" 
        @change="onExaminationChange" 
        class="form-select"
        :disabled="loading"
      >
        <option :value="null">Bitte Untersuchungstyp wählen...</option>
        <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
          {{ exam.name }}
        </option>
      </select>
    </div>

    <!-- Show examination details after selection -->
    <div v-if="selectedExamination && examinationDataLoaded" class="examination-details">
      
      <!-- Finding Selection -->
      <div class="mb-3">
        <label class="form-label">Befund:</label>
        <select v-model="selectedFinding" @change="onFindingChange" class="form-select">
          <option value="">-- Befund wählen --</option>
          <option v-for="finding in availableFindings" :key="finding.id" :value="finding.id">
            {{ finding.name_de || finding.name }}
          </option>
        </select>
      </div>

      <!-- Show classification cards if finding is selected -->
      <div v-if="selectedFinding && currentFindingData" class="classification-section">
        
        <!-- Location Classifications -->
        <div v-if="locationClassifications.length > 0" class="mb-4">
          <h6 class="mb-3">Lokalisierung</h6>
          <div class="classification-cards">
            <ClassificationCard
              v-for="classification in locationClassifications"
              :key="`location-${classification.id}`"
              :label="classification.name_de || classification.name"
              :options="getLocationChoicesForClassification(classification.id)"
              :model-value="getSelectedLocationChoices(classification.id)"
              @update:model-value="updateLocationChoices(classification.id, $event)"
              :compact="true"
              :single-select="false"
            />
          </div>
        </div>

        <!-- Morphology Classifications -->
        <div v-if="morphologyClassifications.length > 0" class="mb-4">
          <h6 class="mb-3">Morphologie</h6>
          <div class="classification-cards">
            <ClassificationCard
              v-for="classification in morphologyClassifications"
              :key="`morphology-${classification.id}`"
              :label="classification.name_de || classification.name"
              :options="getMorphologyChoicesForClassification(classification.id)"
              :model-value="getSelectedMorphologyChoices(classification.id)"
              @update:model-value="updateMorphologyChoices(classification.id, $event)"
              :compact="true"
              :single-select="false"
            />
          </div>
        </div>

        <!-- Notes -->
        <div class="mb-3">
          <label class="form-label">Notizen:</label>
          <textarea 
            v-model="notes" 
            class="form-control" 
            rows="3" 
            placeholder="Zusätzliche Bemerkungen..."
          ></textarea>
        </div>

        <!-- Save Button -->
        <div class="d-grid">
          <button @click="saveExamination" class="btn btn-primary" :disabled="!canSave">
            Untersuchung speichern
          </button>
        </div>

        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="alert alert-warning mt-3">
          <small class="text-muted">Fehlende Angaben:</small>
          <ul class="mb-0 mt-1">
            <li v-for="error in validationErrors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </div>
      <small v-else class="text-muted">Keine Interventionen für dieses Finding verfügbar.</small>
    </div>

      <!-- Help text when no finding selected -->
      <div v-else-if="selectedExamination && availableFindings.length === 0" class="alert alert-info">
        <i class="material-icons me-2">info</i>
        Keine Befunde verfügbar für diesen Untersuchungstyp.
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-3">
      <div class="spinner-border spinner-border-sm" role="status">
        <span class="visually-hidden">Lädt...</span>
      </div>
      <span class="ms-2">Lade Untersuchungsdaten...</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="alert alert-danger">
      <i class="material-icons me-2">error</i>
      {{ error }}
    </div>
  </div>
</template>

<script>
import axiosInstance, { r } from '@/api/axiosInstance';
import ClassificationCard from '../Examination/ClassificationCard.vue';

export default {
  name: 'SimpleExaminationForm',
  components: {
    ClassificationCard
  },
  props: {
    videoTimestamp: {
      type: Number,
      default: 0
    },
    videoId: {
      type: Number,
      required: true
    }
  },
  emits: ['examination-saved'],
  data() {
    return {
      // Available data
      availableExaminations: [],
      availableFindings: [],
      locationClassifications: [],
      morphologyClassifications: [],
      
      // Current selections
      selectedExamination: null,
      selectedFinding: null,
      
      // Current finding data
      currentFindingData: null,
      
      // Form state
      notes: '',
      loading: false,
      error: null,
      examinationDataLoaded: false
    };
  },
  computed: {
    selectedExamination() {
      return this.examinations.find(e => e.id === this.selectedExaminationId) || null;
    },
    selectedFinding() {
      return this.findings.find(f => f.id === this.selectedFindingId) || null;
    },
    selectedLocationClassification() {
      return this.locationClassifications.find(lc => lc.id === this.selectedLocationClassificationId) || null;
    },
    selectedLocationChoice() {
      return this.locationChoices.find(lc => lc.id === this.selectedLocationChoiceId) || null;
    },
    selectedMorphologyClassification() {
      return this.morphologyClassifications.find(mc => mc.id === this.selectedMorphologyClassificationId) || null;
    },
    selectedMorphologyChoice() {
      return this.morphologyChoices.find(mc => mc.id === this.selectedMorphologyChoiceId) || null;
    },
    canSave() {
      return this.selectedExamination && 
             this.selectedFinding &&
             this.currentFindingData &&
             this.videoId !== null &&
             this.validationErrors.length === 0;
    },
    
    validationErrors() {
      const errors = [];
      
      if (!this.selectedExamination) {
        errors.push('Untersuchungstyp erforderlich');
      }
      
      if (!this.selectedFinding) {
        errors.push('Befund erforderlich');
      }
      
      // Check for required location classifications
      if (this.currentFindingData) {
        const requiredLocationClassifications = this.locationClassifications.filter(c => c.required);
        for (const classification of requiredLocationClassifications) {
          const hasSelection = this.getSelectedLocationChoices(classification.id).length > 0;
          if (!hasSelection) {
            errors.push(`${classification.name_de || classification.name} erforderlich`);
          }
        }
        
        // Check for required morphology classifications
        const requiredMorphologyClassifications = this.morphologyClassifications.filter(c => c.required);
        for (const classification of requiredMorphologyClassifications) {
          const hasSelection = this.getSelectedMorphologyChoices(classification.id).length > 0;
          if (!hasSelection) {
            errors.push(`${classification.name_de || classification.name} erforderlich`);
          }
        }
      }
      
      return errors;
    }
  },
  watch: {
    videoId() {
      this.resetForm();
    }
  },
  methods: {
    async loadExaminations() {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axiosInstance.get(r('examinations/'));
        this.availableExaminations = response.data || [];
        
        console.log('Loaded examinations:', this.availableExaminations);
      } catch (error) {
        this.error = 'Fehler beim Laden der Untersuchungstypen: ' + error.message;
        console.error('Error loading examinations:', error);
        this.error = 'Fehler beim Laden der Untersuchungstypen';
      } finally {
        this.loading = false;
      }
    },

    async loadExaminationData() {
      if (!this.selectedExamination) {
        this.examinationDataLoaded = false;
        return;
      }
    },

    async onExaminationChange() {
      this.resetLowerLevels('examination');
      
      if (!this.selectedExaminationId) return;
      
      try {
        this.loading = true;
        this.error = null;
        
        // Load findings
        const findingsResponse = await axiosInstance.get(r('findings/'));
        this.availableFindings = findingsResponse.data || [];
        
        // Load classifications
        const [locationResponse, morphologyResponse] = await Promise.all([
          axiosInstance.get(r('location-classifications/')),
          axiosInstance.get(r('morphology-classifications/'))
        ]);
        
        this.locationClassifications = locationResponse.data || [];
        this.morphologyClassifications = morphologyResponse.data || [];
        
        console.log('Loaded examination data:', {
          findings: this.availableFindings.length,
          locationClassifications: this.locationClassifications.length,
          morphologyClassifications: this.morphologyClassifications.length
        });
        
        this.examinationDataLoaded = true;
        
        // Reset selections
        this.selectedFinding = null;
        this.currentFindingData = null;
        
      } catch (error) {
        console.error('Error loading examination data:', error);
        this.error = 'Fehler beim Laden der Untersuchungsdaten';
        this.examinationDataLoaded = false;
      } finally {
        this.loading = false;
      }
    },

    onFindingChange() {
      if (this.selectedFinding) {
        // Initialize finding data
        this.currentFindingData = {
          findingId: this.selectedFinding,
          selectedLocationChoices: [],
          selectedMorphologyChoices: []
        };
      } else {
        this.currentFindingData = null;
      }
    },

    getLocationChoicesForClassification(classificationId) {
      const classification = this.locationClassifications.find(c => c.id === classificationId);
      if (!classification || !classification.choices) return [];
      
      return classification.choices.map(choice => ({
        id: choice.id,
        name: choice.name_de || choice.name
      }));
    },

    getMorphologyChoicesForClassification(classificationId) {
      const classification = this.morphologyClassifications.find(c => c.id === classificationId);
      if (!classification || !classification.choices) return [];
      
      return classification.choices.map(choice => ({
        id: choice.id,
        name: choice.name_de || choice.name
      }));
    },

    getSelectedLocationChoices(classificationId) {
      if (!this.currentFindingData) return [];
      
      const classification = this.locationClassifications.find(c => c.id === classificationId);
      if (!classification) return [];
      
      return this.currentFindingData.selectedLocationChoices.filter(choiceId =>
        classification.choices && classification.choices.some(choice => choice.id === choiceId)
      );
    },

    getSelectedMorphologyChoices(classificationId) {
      if (!this.currentFindingData) return [];
      
      const classification = this.morphologyClassifications.find(c => c.id === classificationId);
      if (!classification) return [];
      
      return this.currentFindingData.selectedMorphologyChoices.filter(choiceId =>
        classification.choices && classification.choices.some(choice => choice.id === choiceId)
      );
    },

    updateLocationChoices(classificationId, choiceIds) {
      if (!this.currentFindingData) return;
      
      const classification = this.locationClassifications.find(c => c.id === classificationId);
      if (!classification) return;
      
      // Remove all choices from this classification
      const otherChoices = this.currentFindingData.selectedLocationChoices.filter(choiceId =>
        !classification.choices || !classification.choices.some(choice => choice.id === choiceId)
      );
      
      // Add new choices
      this.currentFindingData.selectedLocationChoices = [...otherChoices, ...choiceIds];
    },

    updateMorphologyChoices(classificationId, choiceIds) {
      if (!this.currentFindingData) return;
      
      const classification = this.morphologyClassifications.find(c => c.id === classificationId);
      if (!classification) return;
      
      // Remove all choices from this classification
      const otherChoices = this.currentFindingData.selectedMorphologyChoices.filter(choiceId =>
        !classification.choices || !classification.choices.some(choice => choice.id === choiceId)
      );
      
      // Add new choices
      this.currentFindingData.selectedMorphologyChoices = [...otherChoices, ...choiceIds];
    },

    async saveExamination() {
      if (!this.canSave || !this.videoId) return;

      const examinationData = {
        video_id: this.videoId,
        examination_type_id: this.selectedExamination,
        finding_id: this.selectedFinding,
        timestamp: this.videoTimestamp,
        location_choices: this.currentFindingData.selectedLocationChoices,
        morphology_choices: this.currentFindingData.selectedMorphologyChoices,
        notes: this.notes,
        created_at: new Date().toISOString()
      };

      try {
        this.loading = true;
        const response = await axiosInstance.post(r('video-examinations/'), examinationData);
        
        this.$emit('examination-saved', response.data);
        this.resetForm();
        
        // Show success feedback
        console.log('Examination saved successfully:', response.data);
        
      } catch (error) {
        this.error = 'Fehler beim Speichern: ' + error.message;
        console.error('Error saving examination:', error);
      } finally {
        this.loading = false;
      }
    },

    resetForm() {
      this.selectedExamination = null;
      this.selectedFinding = null;
      this.currentFindingData = null;
      this.notes = '';
      this.examinationDataLoaded = false;
      this.error = null;
    }
  },

  mounted() {
    this.loadExaminations();
  }
};
</script>

<style scoped>
.examination-form {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.form-check-group {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 0.5rem;
}

.classification-section {
  margin-top: 1.5rem;
}

.classification-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-check {
  margin-bottom: 0.25rem;
}

.form-check:last-child {
  margin-bottom: 0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
}

.alert-warning {
  background-color: #fff3cd;
  border-color: #ffeaa7;
  color: #856404;
}

.alert-danger {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

.bg-light {
  background-color: #f8f9fa !important;
}

h6 {
  color: #495057;
  font-weight: 600;
}
</style>