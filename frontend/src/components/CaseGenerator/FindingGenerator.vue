<template>
    <div class="container-fluid py-4">
    <h1>Fallübersicht</h1>

    <!-- Patients Section -->
    <section class="patients-section mt-5">
      <h2>Patienten</h2>
      <button class="btn btn-primary mb-3" @click="openPatientForm()">Patienten hinzufügen</button>
      <!-- Patient Form -->
      <div v-if="showPatientForm" class="form-container mt-4">
        <h3>{{ editingPatient ? 'Patient bearbeiten' : 'Neuer Patient' }}</h3>
        <form @submit.prevent="submitPatientForm">
          <div class="form-group">
            <label for="patientFirstName">Vorname:</label>
            <input type="text" id="patientFirstName" v-model="patientForm.first_name" placeholder="Thomas" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="patientLastName">Nachname:</label>
            <input type="text" id="patientLastName" v-model="patientForm.last_name" placeholder="Lux" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="patientAge">Alter:</label>
            <input type="number" id="patientAge" v-model="patientForm.age" placeholder="30" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="patientComments" placeholder = "Endoskopie zur Diagnose">Kommentar:</label>
            <textarea id="patientComments" v-model="patientForm.comments" class="form-control"></textarea>
          </div>
          <div class="form-group">
            <label>Geschlecht:</label>
            <div>
              <label>
                <input type="radio" :value="1" v-model="patientForm.gender" required /> Weiblich
              </label>
              <label>
                <input type="radio" :value="2" v-model="patientForm.gender" required /> Männlich
              </label>
              <label>
                <input type="radio" :value="3" v-model="patientForm.gender" required /> Divers
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-success mt-2">Patient speichern</button>
          <button type="button" class="btn btn-secondary mt-2" @click="closePatientForm">Beenden</button>
        </form>
      </div>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Vorname</th>
            <th>Nachname</th>
            <th>Geschlecht</th>
            <th>Alter</th>
            <th>Kommentar</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="patient in patients" :key="patient.id">
            <td>{{ patient.id }}</td>
            <td>{{ patient.first_name }}</td>
            <td>{{ patient.last_name }}</td>
            <td>{{ patient.gender }}</td>
            <td>{{ patient.age }}</td>
            <td>{{ patient.comments }}</td>
            <td>
              <button class="btn btn-secondary btn-sm" @click="openPatientForm(patient)">Bearbeiten</button>
              <button class="btn btn-danger btn-sm" @click="deletePatient(patient.id)">Löschen</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
  <div class="container mt-4">
    <div class="container-fluid py-4">
      <div>
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
                checked="checked"
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
              <option>Würzburg</option>
              <option>Hamburg</option>
              <option>Regensburg</option>
              <option>Ludwigsburg</option>
              <option>Stuttgart</option>
            </select>
          </div>
  
          <hr />
  
           Examination Assignment 
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
  
          <div class="row">
          <!-- Location Classification Section -->
          <div class="col-md-6">
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
          </div>

          <!-- Finding Selection Section -->
          <div class="col-md-6">
            <h3 class="mt-4">Finding</h3>
            <div class="mb-3">
              <label for="findingSelect" class="form-label">Finding wählen:</label>
              <select
                v-model="formData.findingId"
                id="findingSelect"
                class="form-select"
                @change="loadInterventions"
              >
                <option disabled value="">Bitte wählen</option>
                <option
                  v-for="finding in availableFindings"
                  :key="finding.id"
                  :value="finding.id"
                >
                  {{ finding.name }}
                </option>
              </select>
            </div>

            <!-- Interventions Section -->
            <div v-if="availableInterventions.length > 0" class="mb-3">
              <label class="form-label">Verfügbare Interventionen:</label>
              <div class="intervention-list">
                <div
                  v-for="intervention in availableInterventions"
                  :key="intervention.id"
                  class="form-check"
                >
                  <input
                    :id="`intervention-${intervention.id}`"
                    v-model="formData.selectedInterventions"
                    :value="intervention.id"
                    type="checkbox"
                    class="form-check-input"
                  />
                  <label :for="`intervention-${intervention.id}`" class="form-check-label">
                    {{ intervention.name }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
  
          <hr />
  
          <!-- Submit Button -->
          <div class="mb-3">
            <button type="submit" id="saveData" class="btn btn-danger">
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
import { useReportService } from '@/api/reportService'
import {patientService} from '@/api/patientService';

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
      patients: [],
      showPatientForm: false,
      editingPatient: null,
      patientForm: {
        id: null,
        first_name: '',
        last_name: '',
        age: null,
        comments: '',
        gender: null
      },
      errorMessage: '',
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
    async loadPatients() {
      try {
        this.patients = await patientService.getPatients();
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    },
    openPatientForm(patient = null) {
      if (patient) {
        this.editingPatient = patient;
        this.patientForm = { ...patient };
      } else {
        this.editingPatient = null;
        this.patientForm = { id: null, first_name: '', last_name: '', age: null, comments: '', gender: null };
      }
      this.showPatientForm = true;
    },
    closePatientForm() {
      this.showPatientForm = false;
      this.editingPatient = null;
      this.patientForm = { id: null, first_name: '', last_name: '', age: null, comments: '', gender: null };
    },
    async submitPatientForm() {
      try {
        if (this.editingPatient) {
          const response = await patientService.updatePatient(this.patientForm.id, this.patientForm);
          const index = this.patients.findIndex(p => p.id === this.patientForm.id);
          if (index !== -1) {
            this.$set(this.patients, index, response.data);
          }
        } else {
          const newPatient = await patientService.addPatient(this.patientForm);
          this.patients.push(newPatient.data);
        }
        this.closePatientForm();
      } catch (error) {
        console.error('Error saving patient:', error);
      }
    },
    async deletePatient(id) {
      try {
        await patientService.deletePatient(id);
        this.patients = this.patients.filter(patient => patient.id !== id);
      } catch (error) {
        console.error('Error deleting patient:', error);
      }
    },
    async loadCenters() {
      try {
        this.centers = await reportService.getCenters();
      } catch (error) {
        console.error('Error loading centers:', error);
      }
    },
     async loadExaminations() {
      console.log("loadExaminations");
      try {
        this.examinations = await reportService.getExaminations();
        console.log(this.examinations);
      } catch (error) {
        console.error('Error loading examinations:', error);
      }
    },

    async loadFindings() {
      try {
        this.findings = await reportService.getFindings();
      } catch (error) {
        console.error('Error loading findings:', error);
      }
    },
    async loadLocationClassifications() {
      try {
        this.locationClassifications = await reportService.getLocationClassifications();
      } catch (error) {
        console.error('Error loading location classifications:', error);
      }
    },
    async loadLocationClassificationChoices() {
      try {
        this.locationClassificationChoices = await reportService.getLocationClassificationChoices();
      } catch (error) {
        console.error('Error loading location classification choices:', error);
      }
    },
    async loadMorphologyClassifications() {
      try {
        this.morphologyClassifications = await reportService.getMorphologyClassifications();
      } catch (error) {
        console.error('Error loading morphology classifications:', error);
      }
    },
    async loadMorphologyClassificationChoices() {
      try {
        this.morphologyClassificationChoices = await reportService.getMorphologyClassificationChoices();
      } catch (error) {
        console.error('Error loading morphology classification choices:', error);
      }
    },
    async loadInterventions() {
      try {
        this.interventions = await reportService.getInterventions();
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
