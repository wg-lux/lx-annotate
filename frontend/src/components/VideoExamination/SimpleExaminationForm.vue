<template>
  <div class="examination-form">
    <h6 class="mb-3">Untersuchungsformular</h6>

    <!-- Loading/Error States -->
    <div v-if="loading" class="alert alert-info">Lade Daten...</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

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

    <!-- Finding Selection (Level 1) -->
    <div v-if="selectedExaminationId" class="mb-3">
      <label class="form-label">Finding:</label>
      <select 
        v-model.number="selectedFindingId" 
        @change="onFindingChange" 
        class="form-select"
        :disabled="loading || !findings.length"
      >
        <option :value="null">Bitte Finding wählen...</option>
        <option v-for="finding in findings" :key="finding.id" :value="finding.id">
          {{ finding.name }}
        </option>
      </select>
    </div>

    <!-- Location Classification Selection (Level 2a) -->
    <div v-if="selectedFindingId" class="mb-3">
      <label class="form-label">Lokalisationsklassifikation:</label>
      <select 
        v-model.number="selectedLocationClassificationId" 
        @change="onLocationClassificationChange" 
        class="form-select"
        :disabled="loading || !locationClassifications.length"
      >
        <option :value="null">Bitte Lokalisationsklassifikation wählen...</option>
        <option v-for="lc in locationClassifications" :key="lc.id" :value="lc.id">
          {{ lc.name }}
        </option>
      </select>
    </div>

    <!-- Location Choice Selection (Level 3a) -->
    <div v-if="selectedLocationClassificationId" class="mb-3">
      <label class="form-label">Lokalisation:</label>
      <select 
        v-model.number="selectedLocationChoiceId" 
        class="form-select"
        :disabled="loading || !locationChoices.length"
      >
        <option :value="null">Bitte Lokalisation wählen...</option>
        <option v-for="choice in locationChoices" :key="choice.id" :value="choice.id">
          {{ choice.name }}
        </option>
      </select>
    </div>

    <!-- Morphology Classification Selection (Level 2b) -->
    <div v-if="selectedFindingId" class="mb-3">
      <label class="form-label">Morphologieklassifikation:</label>
      <select 
        v-model.number="selectedMorphologyClassificationId" 
        @change="onMorphologyClassificationChange" 
        class="form-select"
        :disabled="loading || !morphologyClassifications.length"
      >
        <option :value="null">Bitte Morphologieklassifikation wählen...</option>
        <option v-for="mc in morphologyClassifications" :key="mc.id" :value="mc.id">
          {{ mc.name }}
        </option>
      </select>
    </div>

    <!-- Morphology Choice Selection (Level 3b) -->
    <div v-if="selectedMorphologyClassificationId" class="mb-3">
      <label class="form-label">Morphologie:</label>
      <select 
        v-model.number="selectedMorphologyChoiceId" 
        class="form-select"
        :disabled="loading || !morphologyChoices.length"
      >
        <option :value="null">Bitte Morphologie wählen...</option>
        <option v-for="choice in morphologyChoices" :key="choice.id" :value="choice.id">
          {{ choice.name }}
        </option>
      </select>
    </div>

    <!-- Interventions Selection -->
    <div v-if="selectedFindingId" class="mb-3">
      <label class="form-label">Interventionen:</label>
      <div v-if="interventions.length > 0" class="form-check-group">
        <div v-for="intervention in interventions" :key="intervention.id" class="form-check">
          <input 
            type="checkbox" 
            :id="`intervention-${intervention.id}`"
            v-model="selectedInterventions" 
            :value="intervention.id" 
            class="form-check-input"
          />
          <label :for="`intervention-${intervention.id}`" class="form-check-label">
            {{ intervention.name }}
          </label>
        </div>
      </div>
      <small v-else class="text-muted">Keine Interventionen für dieses Finding verfügbar.</small>
    </div>

    <!-- Comments/Notes -->
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
      <button 
        @click="saveExamination" 
        :disabled="!canSave || loading" 
        class="btn btn-primary"
      >
        {{ loading ? 'Speichere...' : 'Untersuchung speichern' }}
      </button>
    </div>

    <!-- Current Selection Summary -->
    <div v-if="hasSelections" class="mt-3 p-3 bg-light rounded">
      <h6>Aktuelle Auswahl:</h6>
      <ul class="list-unstyled mb-0">
        <li v-if="selectedExamination"><strong>Untersuchung:</strong> {{ selectedExamination.name }}</li>
        <li v-if="selectedFinding"><strong>Finding:</strong> {{ selectedFinding.name }}</li>
        <li v-if="selectedLocationClassification"><strong>Lokalisationsklassifikation:</strong> {{ selectedLocationClassification.name }}</li>
        <li v-if="selectedLocationChoice"><strong>Lokalisation:</strong> {{ selectedLocationChoice.name }}</li>
        <li v-if="selectedMorphologyClassification"><strong>Morphologieklassifikation:</strong> {{ selectedMorphologyClassification.name }}</li>
        <li v-if="selectedMorphologyChoice"><strong>Morphologie:</strong> {{ selectedMorphologyChoice.name }}</li>
        <li v-if="selectedInterventions.length > 0">
          <strong>Interventionen:</strong> 
          {{ interventions.filter(i => selectedInterventions.includes(i.id)).map(i => i.name).join(', ') }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import axiosInstance, { r } from '@/api/axiosInstance';

export default {
  name: 'SimpleExaminationForm',
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
      loading: false,
      error: null,
      
      // Data arrays
      examinations: [],
      findings: [],
      locationClassifications: [],
      locationChoices: [],
      morphologyClassifications: [],
      morphologyChoices: [],
      interventions: [],
      
      // Selected IDs
      selectedExaminationId: null,
      selectedFindingId: null,
      selectedLocationClassificationId: null,
      selectedLocationChoiceId: null,
      selectedMorphologyClassificationId: null,
      selectedMorphologyChoiceId: null,
      selectedInterventions: [],
      
      // Form data
      notes: ''
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
      return this.selectedExaminationId && this.selectedFindingId;
    },
    hasSelections() {
      return this.selectedExaminationId || this.selectedFindingId || this.selectedLocationClassificationId || 
             this.selectedMorphologyClassificationId || this.selectedInterventions.length > 0;
    }
  },
  methods: {
    async loadExaminations() {
      try {
        this.loading = true;
        this.error = null;
        const response = await axiosInstance.get(r('examinations/'));
        this.examinations = response.data;
      } catch (error) {
        this.error = 'Fehler beim Laden der Untersuchungstypen: ' + error.message;
        console.error('Error loading examinations:', error);
      } finally {
        this.loading = false;
      }
    },

    async onExaminationChange() {
      this.resetLowerLevels('examination');
      
      if (!this.selectedExaminationId) return;
      
      try {
        this.loading = true;
        this.error = null;
        
        // Load findings and location classifications for this examination
        const [findingsResponse, locationClassResponse] = await Promise.all([
          axiosInstance.get(r(`examination/${this.selectedExaminationId}/findings/`)),
          axiosInstance.get(r(`examination/${this.selectedExaminationId}/location-classifications/`))
        ]);
        
        this.findings = findingsResponse.data;
        this.locationClassifications = locationClassResponse.data;
        
        // Try to load morphology classifications (might not exist for all examinations)
        try {
          const morphologyResponse = await axiosInstance.get(r(`examination/${this.selectedExaminationId}/morphology-classifications/`));
          this.morphologyClassifications = morphologyResponse.data;
        } catch (err) {
          console.warn('Morphology classifications not available for this examination:', err);
          this.morphologyClassifications = [];
        }
        
      } catch (error) {
        this.error = 'Fehler beim Laden der Findings: ' + error.message;
        console.error('Error loading findings:', error);
      } finally {
        this.loading = false;
      }
    },

    async onFindingChange() {
      this.resetLowerLevels('finding');
      
      if (!this.selectedFindingId || !this.selectedExaminationId) return;
      
      try {
        this.loading = true;
        this.error = null;
        
        // Load interventions for this finding
        const response = await axiosInstance.get(
          r(`examination/${this.selectedExaminationId}/finding/${this.selectedFindingId}/interventions/`)
        );
        this.interventions = response.data;
        
      } catch (error) {
        this.error = 'Fehler beim Laden der Interventionen: ' + error.message;
        console.error('Error loading interventions:', error);
      } finally {
        this.loading = false;
      }
    },

    async onLocationClassificationChange() {
      this.resetLowerLevels('locationClassification');
      
      if (!this.selectedLocationClassificationId || !this.selectedExaminationId) return;
      
      try {
        this.loading = true;
        this.error = null;
        
        // Load location choices for this classification
        const response = await axiosInstance.get(
          r(`examination/${this.selectedExaminationId}/location-classification/${this.selectedLocationClassificationId}/choices/`)
        );
        this.locationChoices = response.data;
        
      } catch (error) {
        this.error = 'Fehler beim Laden der Lokalisationen: ' + error.message;
        console.error('Error loading location choices:', error);
      } finally {
        this.loading = false;
      }
    },

    async onMorphologyClassificationChange() {
      this.resetLowerLevels('morphologyClassification');
      
      if (!this.selectedMorphologyClassificationId || !this.selectedExaminationId) return;
      
      try {
        this.loading = true;
        this.error = null;
        
        // Load morphology choices for this classification
        const response = await axiosInstance.get(
          r(`examination/${this.selectedExaminationId}/morphology-classification/${this.selectedMorphologyClassificationId}/choices/`)
        );
        this.morphologyChoices = response.data;
        
      } catch (error) {
        this.error = 'Fehler beim Laden der Morphologien: ' + error.message;
        console.error('Error loading morphology choices:', error);
      } finally {
        this.loading = false;
      }
    },

    resetLowerLevels(fromLevel) {
      switch (fromLevel) {
        case 'examination':
          this.selectedFindingId = null;
          this.findings = [];
          this.locationClassifications = [];
          this.morphologyClassifications = [];
          // Fall through
        case 'finding':
          this.selectedLocationClassificationId = null;
          this.selectedMorphologyClassificationId = null;
          this.locationChoices = [];
          this.morphologyChoices = [];
          this.interventions = [];
          this.selectedInterventions = [];
          // Fall through
        case 'locationClassification':
          this.selectedLocationChoiceId = null;
          this.locationChoices = [];
          break;
        case 'morphologyClassification':
          this.selectedMorphologyChoiceId = null;
          this.morphologyChoices = [];
          break;
      }
    },

    async saveExamination() {
      if (!this.canSave) return;
      
      try {
        this.loading = true;
        this.error = null;
        
        const examinationData = {
          videoId: this.videoId,
          timestamp: this.videoTimestamp,
          examinationTypeId: this.selectedExaminationId,
          findingId: this.selectedFindingId,
          locationClassificationId: this.selectedLocationClassificationId || null,
          locationChoiceId: this.selectedLocationChoiceId || null,
          morphologyClassificationId: this.selectedMorphologyClassificationId || null,
          morphologyChoiceId: this.selectedMorphologyChoiceId || null,
          interventionIds: this.selectedInterventions,
          notes: this.notes || null
        };
        
        const response = await axiosInstance.post(r('examinations/'), examinationData);
        
        this.$emit('examination-saved', response.data);
        this.resetForm();
        
      } catch (error) {
        this.error = 'Fehler beim Speichern: ' + error.message;
        console.error('Error saving examination:', error);
      } finally {
        this.loading = false;
      }
    },

    resetForm() {
      this.selectedExaminationId = null;
      this.selectedFindingId = null;
      this.selectedLocationClassificationId = null;
      this.selectedLocationChoiceId = null;
      this.selectedMorphologyClassificationId = null;
      this.selectedMorphologyChoiceId = null;
      this.selectedInterventions = [];
      this.notes = '';
      
      this.findings = [];
      this.locationClassifications = [];
      this.locationChoices = [];
      this.morphologyClassifications = [];
      this.morphologyChoices = [];
      this.interventions = [];
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

.bg-light {
  background-color: #f8f9fa !important;
}
</style>