<template>
  <div class="simple-examination-form">
    <div class="mb-3">
      <label class="form-label">Untersuchungstyp:</label>
      <select v-model="selectedExamination" @change="loadExaminationData" class="form-select">
        <option value="">Bitte wählen...</option>
        <option v-for="exam in availableExaminations" :key="exam.id" :value="exam.id">
          {{ exam.name }}
        </option>
      </select>
    </div>

    <div v-if="selectedExamination" class="examination-details">
      <!-- Location Classifications -->
      <div class="mb-3">
        <label class="form-label">Lokalisierung:</label>
        <select v-model="selectedLocation" class="form-select">
          <option value="">-- Lokalisierung wählen --</option>
          <option v-for="location in locationClassifications" :key="location.id" :value="location.id">
            {{ location.name }}
          </option>
        </select>
      </div>

      <!-- Findings -->
      <div class="mb-3">
        <label class="form-label">Befunde:</label>
        <select v-model="selectedFinding" @change="loadInterventions" class="form-select">
          <option value="">-- Befund wählen --</option>
          <option v-for="finding in findings" :key="finding.id" :value="finding.id">
            {{ finding.name }}
          </option>
        </select>
      </div>

      <!-- Interventions (if finding is selected) -->
      <div v-if="selectedFinding && interventions.length > 0" class="mb-3">
        <label class="form-label">Interventionen:</label>
        <div v-for="intervention in interventions" :key="intervention.id" class="form-check">
          <input 
            type="checkbox" 
            :id="`intervention-${intervention.id}`"
            v-model="selectedInterventions"
            :value="intervention.id"
            class="form-check-input"
          >
          <label :for="`intervention-${intervention.id}`" class="form-check-label">
            {{ intervention.name }}
          </label>
        </div>
      </div>

      <!-- Notes -->
      <div class="mb-3">
        <label class="form-label">Notizen:</label>
        <textarea v-model="notes" class="form-control" rows="3" placeholder="Zusätzliche Bemerkungen..."></textarea>
      </div>

      <!-- Save Button -->
      <div class="d-grid">
        <button @click="saveExamination" class="btn btn-primary" :disabled="!canSave">
          Untersuchung speichern
        </button>
      </div>

      <!-- Selected Items Summary -->
      <div v-if="hasSelections" class="mt-3 p-2 bg-light rounded">
        <small class="text-muted">Ausgewählt:</small>
        <ul class="mb-0 mt-1">
          <li v-if="selectedLocation">Lokalisierung: {{ getLocationName(selectedLocation) }}</li>
          <li v-if="selectedFinding">Befund: {{ getFindingName(selectedFinding) }}</li>
          <li v-if="selectedInterventions.length > 0">
            Interventionen: {{ selectedInterventions.map(id => getInterventionName(id)).join(', ') }}
          </li>
        </ul>
      </div>
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
      required: true
    },
    videoId: {
      type: [Number, String],
      default: null
    }
  },
  emits: ['examination-saved'],
  data() {
    return {
      availableExaminations: [],
      selectedExamination: null,
      locationClassifications: [],
      findings: [],
      interventions: [],
      selectedLocation: null,
      selectedFinding: null,
      selectedInterventions: [],
      notes: ''
    };
  },
  computed: {
    canSave() {
      return this.selectedExamination && 
             (this.selectedLocation || this.selectedFinding) &&
             this.videoId !== null;  // Ensure we have a valid video ID
    },
    hasSelections() {
      return this.selectedLocation || this.selectedFinding || this.selectedInterventions.length > 0;
    }
  },
  watch: {
    videoId() {
      this.resetForm();
      this.selectedExamination = null;
    }
  },
  methods: {
    async loadExaminations() {
      try {
        const response = await axiosInstance.get(r('examinations/'));
        this.availableExaminations = response.data;
      } catch (error) {
        console.error('Error loading examinations:', error);
      }
    },
    async loadExaminationData() {
      if (!this.selectedExamination) return;

      try {
        // Load location classifications
        const locationResponse = await axiosInstance.get(r(`examination/${this.selectedExamination}/location-classifications/`));
        this.locationClassifications = locationResponse.data;

        // Load findings
        const findingsResponse = await axiosInstance.get(r(`examination/${this.selectedExamination}/findings/`));
        this.findings = findingsResponse.data;

        // Reset selections
        this.selectedLocation = null;
        this.selectedFinding = null;
        this.selectedInterventions = [];
        this.interventions = [];
      } catch (error) {
        console.error('Error loading examination data:', error);
      }
    },
    async loadInterventions() {
      if (!this.selectedExamination || !this.selectedFinding) return;

      try {
        const response = await axiosInstance.get(r(`examination/${this.selectedExamination}/finding/${this.selectedFinding}/interventions/`));
        this.interventions = response.data;
        this.selectedInterventions = [];
      } catch (error) {
        console.error('Error loading interventions:', error);
      }
    },
    async saveExamination() {
      if (!this.canSave || !this.videoId) return;

      const examinationData = {
        video_id: this.videoId,
        examination_type_id: this.selectedExamination,
        timestamp: this.videoTimestamp,
        location_classification_id: this.selectedLocation,
        finding_id: this.selectedFinding,
        intervention_ids: this.selectedInterventions,
        notes: this.notes,
        created_at: new Date().toISOString()
      };

      try {
        const response = await axiosInstance.post(r('video-examinations/'), examinationData);
        this.$emit('examination-saved', response.data);
        
        // Reset form
        this.resetForm();
        
        // Show success feedback
        alert('Untersuchung erfolgreich gespeichert!');
      } catch (error) {
        console.error('Error saving examination:', error);
        alert('Fehler beim Speichern der Untersuchung');
      }
    },
    resetForm() {
      this.selectedLocation = null;
      this.selectedFinding = null;
      this.selectedInterventions = [];
      this.notes = '';
    },
    // Helper functions for display names
    getLocationName(id) {
      return this.locationClassifications.find(l => l.id === id)?.name || '';
    },
    getFindingName(id) {
      return this.findings.find(f => f.id === id)?.name || '';
    },
    getInterventionName(id) {
      return this.interventions.find(i => i.id === id)?.name || '';
    }
  },
  mounted() {
    this.loadExaminations();
  }
};
</script>

<style scoped>
.simple-examination-form {
  max-height: 600px;
  overflow-y: auto;
}

.examination-details {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
  margin-top: 1rem;
}

.form-check {
  margin-bottom: 0.5rem;
}

.bg-light {
  background-color: #f8f9fa !important;
}
</style>