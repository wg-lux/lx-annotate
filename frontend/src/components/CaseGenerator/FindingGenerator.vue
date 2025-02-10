<template>
    <div>
      <form @submit.prevent="handleSubmit">
        <!-- Patient Information -->
        <h2>Patientendaten</h2>
        <label for="name">Name:</label>
        <input v-model="formData.name" id="name" placeholder="Enter name" />
  
        <label for="polypCount">Anzahl Polypen:</label>
        <input v-model="formData.polypCount" id="polypCount" type="number" placeholder="Anzahl der Polypen" />
  
        <label for="comments">Kommentare:</label>
        <textarea v-model="formData.comments" id="comments" placeholder="Comments"></textarea>
  
        <div>
          <label>Geschlecht:</label>
          <input type="radio" id="genderFemale" name="gender" value="female" v-model="formData.gender" /> Weiblich
          <input type="radio" id="genderMale" name="gender" value="male" v-model="formData.gender" /> Männlich
          <input type="radio" id="genderDivers" name="gender" value="divers" v-model="formData.gender" /> Divers
        </div>
  
        <hr />
  
        <!-- Center Selection -->
        <h2>Zentrumsauswahl</h2>
        <label for="centerSelect">Zentrum:</label>
        <select v-model="formData.centerId" id="centerSelect">
          <option disabled value="">Bitte wählen</option>
          <option v-for="center in centers" :key="center.id" :value="center.id">
            {{ center.name }}
          </option>
        </select>
  
        <hr />
  
        <!-- Examination Assignment -->
        <h2>Untersuchung</h2>
        <label for="examTypeSelect">Untersuchungstyp:</label>
        <select v-model="formData.examinationId" id="examTypeSelect">
          <option disabled value="">Bitte wählen</option>
          <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
            {{ exam.name }}
          </option>
        </select>
  
        <hr />
  
        <!-- Finding -->
        <h2>Befund</h2>
        <label for="findingSelect">Befund auswählen:</label>
        <select v-model="formData.findingId" id="findingSelect">
          <option disabled value="">Bitte wählen</option>
          <option v-for="finding in findings" :key="finding.id" :value="finding.id">
            {{ finding.name }}
          </option>
        </select>
  
        <hr />
  
        <!-- Location Classification -->
        <h2>Lokalisations-Klassifikation</h2>
        <label for="locationClassificationSelect">Klassifikation wählen:</label>
        <select
          v-model="formData.locationClassificationId"
          id="locationClassificationSelect"
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
  
        <label for="locationChoiceSelect">Lokalisation wählen:</label>
        <select
          v-model="formData.locationChoiceId"
          id="locationChoiceSelect"
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
  
        <hr />
  
        <!-- Morphology Classification -->
        <h2>Morphologie-Klassifikation</h2>
        <label for="morphologyClassificationSelect">Klassifikation wählen:</label>
        <select
          v-model="formData.morphologyClassificationId"
          id="morphologyClassificationSelect"
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
  
        <label for="morphologyChoiceSelect">Morphologie wählen:</label>
        <select
          v-model="formData.morphologyChoiceId"
          id="morphologyChoiceSelect"
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
  
        <hr />
  
        <!-- Interventions -->
        <h2>Intervention</h2>
        <p>Wähle eine oder mehrere Interventionen:</p>
        <div v-for="intervention in interventions" :key="intervention.id">
          <label>
            <input
              type="checkbox"
              :value="intervention.id"
              v-model="formData.selectedInterventions"
            />
            {{ intervention.name }}
          </label>
        </div>
  
        <hr />
  
        <!-- Submit Button -->
        <button type="submit" id="saveData">Finish &amp; Generate Report</button>
        <div v-if="errorMessage" class="alert alert-danger mt-2">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  
  export default {
    data() {
      return {
        // Data that will be loaded from the Django backend
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
      // Dynamically filter location choices based on the classification selected
      filteredLocationChoices() {
        const classificationId = parseInt(this.formData.locationClassificationId, 10);
        return this.locationClassificationChoices.filter(
          (choice) => choice.classificationId === classificationId
        );
      },
      // Dynamically filter morphology choices
      filteredMorphologyChoices() {
        const classificationId = parseInt(this.formData.morphologyClassificationId, 10);
        return this.morphologyClassificationChoices.filter(
          (choice) => choice.classificationId === classificationId
        );
      }
    },
    methods: {
      // --- Data Loaders with Axios ---
      async loadCenters() {
        try {
          const response = await axios.get('api/centers/');
          this.centers = response.data; // Expecting a JSON array of centers
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
          const response = await axios.get('api//location-classifications/');
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
  
      // Called on classification change
      loadLocationChoices() {
        this.formData.locationChoiceId = '';
      },
      loadMorphologyChoices() {
        this.formData.morphologyChoiceId = '';
      },
  
      // Utility to get CSRF token
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
  
      // Submit Handler using Axios
      async handleSubmit() {
        // Basic validation example
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
        // Reset error message if all required fields are filled
        this.errorMessage = '';
  
        const csrfToken = this.getCookie('csrftoken');
  
        // Build payload from the formData
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
          
          // Check backend response
          if (response.data.status === 'success') {
            alert('Workflow data saved successfully!');
            // Possibly reset form data or navigate to a report view
          } else {
            alert('Failed to save data.');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    },
    async mounted() {
      // Load all data in parallel or sequentially as you see fit.
      // Example of parallel loading:
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
  h2 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  label {
    display: block;
    margin-top: 0.5rem;
  }
  select,
  input[type='number'],
  input[type='text'],
  textarea {
    display: block;
    margin-bottom: 0.5rem;
    width: 100%;
    max-width: 400px;
  }
  input[type='radio'] {
    margin: 0 0.25rem 0 1rem;
  }
  .alert {
    color: #d9534f;
  }
  </style>
  