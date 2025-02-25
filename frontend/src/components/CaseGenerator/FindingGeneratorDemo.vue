<template>
  <div class="container mt-4">
    <div class="container">
      <div class="container bg-gradient-primary text-white">
        <h2 class="mb-0">Patientendaten</h2>
      </div>
      <div class="container">
        <form @submit.prevent="handleSubmit">
          <!-- Patient Information -->
          <div class="mb-3">
            <label for="name" class="form-label">Name:</label>
            <input
              v-model="formData.name"
              id="name"
              placeholder="Enter name"
              class="form-control"
            />
          </div>
          <div class="mb-3">
            <label for="polypCount" class="form-label">Anzahl Polypen:</label>
            <input
              v-model="formData.polypCount"
              id="polypCount"
              type="number"
              placeholder="Anzahl der Polypen"
              class="form-control"
            />
          </div>
          <div class="mb-3">
            <label for="comments" class="form-label">Kommentare:</label>
            <textarea
              v-model="formData.comments"
              id="comments"
              placeholder="Comments"
              class="form-control"
              rows="3"
            ></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label d-block">Geschlecht:</label>
            <div class="form-check form-check-inline">
              <input
                type="radio"
                id="genderFemale"
                name="gender"
                value="female"
                v-model="formData.gender"
                class="form-check-input"
              />
              <label for="genderFemale" class="form-check-label">Weiblich</label>
            </div>
            <div class="form-check form-check-inline">
              <input
                type="radio"
                id="genderMale"
                name="gender"
                value="male"
                v-model="formData.gender"
                class="form-check-input"
              />
              <label for="genderMale" class="form-check-label">Männlich</label>
            </div>
            <div class="form-check form-check-inline">
              <input
                type="radio"
                id="genderDivers"
                name="gender"
                value="divers"
                v-model="formData.gender"
                class="form-check-input"
              />
              <label for="genderDivers" class="form-check-label">Divers</label>
            </div>
          </div>
  
          <hr />
  
          <!-- Center Selection -->
          <h3 class="mt-4">Zentrumsauswahl</h3>
          <div class="mb-3">
            <label for="centerSelect" class="form-label">Zentrum:</label>
            <select v-model="formData.centerId" id="centerSelect" class="form-select">
              <option disabled value="">Bitte wählen</option>
              <option v-for="center in centers" :key="center.id" :value="center.id">
                {{ center.name }}
              </option>
            </select>
          </div>
  
          <hr />
  
          <!-- Examination Assignment -->
          <h3 class="mt-4">Untersuchung</h3>
          <div class="mb-3">
            <label for="examTypeSelect" class="form-label">Untersuchungstyp:</label>
            <select v-model="formData.examinationId" id="examTypeSelect" class="form-select">
              <option disabled value="">Bitte wählen</option>
              <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
                {{ exam.name }}
              </option>
            </select>
          </div>
  
          <hr />
  
          <!-- Finding -->
          <h3 class="mt-4">Befund</h3>
          <div class="mb-3">
            <label for="findingSelect" class="form-label">Befund auswählen:</label>
            <select v-model="formData.findingId" id="findingSelect" class="form-select">
              <option disabled value="">Bitte wählen</option>
              <option v-for="finding in findings" :key="finding.id" :value="finding.id">
                {{ finding.name }}
              </option>
            </select>
          </div>
  
          <hr />
  
          <!-- Location Classification -->
          <h3 class="mt-4">Lokalisations-Klassifikation</h3>
          <div class="mb-3">
            <label for="locationClassificationSelect" class="form-label">Klassifikation wählen:</label>
            <select
              v-model="formData.locationClassificationId"
              id="locationClassificationSelect"
              class="form-select"
              @change="loadLocationChoices"
            >
              <option disabled value="">Bitte wählen</option>
              <option
                v-for="locClass in locationClassifications"
                :key="locClass.id"
                :value="locClass.id"
              >
                {{ locClass.name }}
              </option>
            </select>
          </div>
          <div class="mb-3">
            <label for="locationChoiceSelect" class="form-label">Lokalisation wählen:</label>
            <select
              v-model="formData.locationChoiceId"
              id="locationChoiceSelect"
              class="form-select"
              :disabled="filteredLocationChoices.length === 0"
            >
              <option disabled value="">Bitte wählen</option>
              <option
                v-for="choice in filteredLocationChoices"
                :key="choice.id"
                :value="choice.id"
              >
                {{ choice.name }}
              </option>
            </select>
          </div>
  
          <hr />
  
          <!-- Morphology Classification -->
          <h3 class="mt-4">Morphologie-Klassifikation</h3>
          <div class="mb-3">
            <label for="morphologyClassificationSelect" class="form-label">Klassifikation wählen:</label>
            <select
              v-model="formData.morphologyClassificationId"
              id="morphologyClassificationSelect"
              class="form-select"
              @change="loadMorphologyChoices"
            >
              <option disabled value="">Bitte wählen</option>
              <option
                v-for="morphClass in morphologyClassifications"
                :key="morphClass.id"
                :value="morphClass.id"
              >
                {{ morphClass.name }}
              </option>
            </select>
          </div>
          <div class="mb-3">
            <label for="morphologyChoiceSelect" class="form-label">Morphologie wählen:</label>
            <select
              v-model="formData.morphologyChoiceId"
              id="morphologyChoiceSelect"
              class="form-select"
              :disabled="filteredMorphologyChoices.length === 0"
            >
              <option disabled value="">Bitte wählen</option>
              <option
                v-for="choice in filteredMorphologyChoices"
                :key="choice.id"
                :value="choice.id"
              >
                {{ choice.name }}
              </option>
            </select>
          </div>
  
          <hr />
  
          <!-- Interventions -->
          <h3 class="mt-4">Intervention</h3>
          <p>Wähle eine oder mehrere Interventionen:</p>
          <div class="mb-3">
            <div
              v-for="intervention in interventions"
              :key="intervention.id"
              class="form-check"
            >
              <input
                type="checkbox"
                :value="intervention.id"
                v-model="formData.selectedInterventions"
                class="form-check-input"
                :id="'intervention-' + intervention.id"
              />
              <label :for="'intervention-' + intervention.id" class="form-check-label">
                {{ intervention.name }}
              </label>
            </div>
          </div>
  
          <hr />
  
          <!-- Submit Button -->
          <div class="mb-3">
            <button type="submit" id="saveData" class="btn btn-primary">
              Finish &amp; Generate Report
            </button>
            <div v-if="errorMessage" class="alert alert-danger mt-2">
              {{ errorMessage }}
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      // Data loaded from the backend
      centers: [],
      examinations: [],
      findings: [],
      locationClassifications: [],
      locationClassificationChoices: [],
      morphologyClassifications: [],
      morphologyClassificationChoices: [],
      interventions: [],
  
      // Form data
      formData: {
        name: '',
        polypCount: '',
        comments: '',
        gender: '',
        centerId: '',
        examinationId: '',
        findingId: '',
        locationClassificationId: '',
        locationChoiceId: '',
        morphologyClassificationId: '',
        morphologyChoiceId: '',
        selectedInterventions: []
      },
      errorMessage: ''
    };
  },
  computed: {
    filteredLocationChoices() {
      const classificationId = parseInt(this.formData.locationClassificationId, 10);
      return this.locationClassificationChoices.filter(
        (choice) => choice.classificationId === classificationId
      );
    },
    filteredMorphologyChoices() {
      const classificationId = parseInt(this.formData.morphologyClassificationId, 10);
      return this.morphologyClassificationChoices.filter(
        (choice) => choice.classificationId === classificationId
      );
    }
  },
  methods: {
    async loadCenters() {
      try {
        const response = await axios.get('api/centers/');
        this.centers = response.data;
      } catch (error) {
        console.error('Error loading centers:', error);
      }
    },
    async loadExaminations() {
      try {
        const response = await axios.get('api/examinations/');
        this.examinations = response.data;
      } catch (error) {
        console.error('Error loading examinations:', error);
      }
    },
    async loadFindings() {
      try {
        const response = await axios.get('api/findings/');
        this.findings = response.data;
      } catch (error) {
        console.error('Error loading findings:', error);
      }
    },
    async loadLocationClassifications() {
      try {
        const response = await axios.get('api/location-classifications/');
        this.locationClassifications = response.data;
      } catch (error) {
        console.error('Error loading location classifications:', error);
      }
    },
    async loadLocationClassificationChoices() {
      try {
        const response = await axios.get('api/location-classification-choices/');
        this.locationClassificationChoices = response.data;
      } catch (error) {
        console.error('Error loading location classification choices:', error);
      }
    },
    async loadMorphologyClassifications() {
      try {
        const response = await axios.get('api/morphology-classifications/');
        this.morphologyClassifications = response.data;
      } catch (error) {
        console.error('Error loading morphology classifications:', error);
      }
    },
    async loadMorphologyClassificationChoices() {
      try {
        const response = await axios.get('api/morphology-classification-choices/');
        this.morphologyClassificationChoices = response.data;
      } catch (error) {
        console.error('Error loading morphology classification choices:', error);
      }
    },
    async loadInterventions() {
      try {
        const response = await axios.get('api/interventions/');
        this.interventions = response.data;
      } catch (error) {
        console.error('Error loading interventions:', error);
      }
    },
    loadLocationChoices() {
      this.formData.locationChoiceId = '';
    },
    loadMorphologyChoices() {
      this.formData.morphologyChoiceId = '';
    },
    getCookie(name) {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    },
    async handleSubmit() {
      if (!this.formData.name.trim()) {
        this.errorMessage = 'Name cannot be empty. Please enter a name.';
        return;
      }
      if (!this.formData.centerId) {
        this.errorMessage = 'Please select a center.';
        return;
      }
      if (!this.formData.examinationId) {
        this.errorMessage = 'Please select an examination type.';
        return;
      }
      if (!this.formData.findingId) {
        this.errorMessage = 'Please select a finding.';
        return;
      }
      this.errorMessage = '';
  
      const csrfToken = this.getCookie('csrftoken');
      const payload = { ...this.formData };
  
      try {
        const response = await axios.post(
          'api/save-workflow-data/',
          payload,
          {
            headers: {
              'X-CSRFToken': csrfToken,
              'Content-Type': 'application/json'
            }
          }
        );
        if (response.data.status === 'success') {
          alert('Workflow data saved successfully!');
        } else {
          alert('Failed to save data.');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  },
  async mounted() {
    await Promise.all([
      this.loadCenters(),
      this.loadExaminations(),
      this.loadFindings(),
      this.loadLocationClassifications(),
      this.loadLocationClassificationChoices(),
      this.loadMorphologyClassifications(),
      this.loadMorphologyClassificationChoices(),
      this.loadInterventions()
    ]);
  }
};
</script>

<style scoped>
/* You can add additional custom styles or overrides here */
.card {
  border: none;
  box-shadow: 0 4px 7px -1px rgba(0, 0, 0, 0.11),
              0 2px 4px -1px rgba(0, 0, 0, 0.07);
}

.card-header {
  padding: 1rem 1.5rem;
}

.card-body {
  padding: 1.5rem;
}

.alert {
  font-size: 0.875rem;
}
</style>
