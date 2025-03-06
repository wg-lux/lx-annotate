<template>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Fallübersicht - Mockup</title>
  <!-- Include Bootstrap and Material Dashboard CSS as needed -->
  <link rel="stylesheet" href="path/to/bootstrap.css">
  <link rel="stylesheet" href="path/to/material-dashboard.css">
</head>
<body>
  <div class="container-fluid py-4">
    <h1>Fallübersicht</h1>

    <!-- Patienten Section -->
    <section class="patients-section mt-5">
      <h2>Patienten</h2>
      <button class="btn btn-primary mb-3">Patienten hinzufügen</button>
      
      <!-- Patient Form (Static) -->
      <div class="form-container mt-4">
        <h3>Neuer Patient</h3>
        <form>
          <div class="form-group">
            <label for="patientFirstName">Vorname:</label>
            <input type="text" id="patientFirstName" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="patientLastName">Nachname:</label>
            <input type="text" id="patientLastName" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="patientAge">Alter:</label>
            <input type="number" id="patientAge" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="patientComments">Kommentar:</label>
            <textarea id="patientComments" class="form-control"></textarea>
          </div>
          <div class="form-group">
            <label>Geschlecht:</label>
            <div>
              <label>
                <input type="radio" name="gender" value="weiblich" required> Weiblich
              </label>
              <label>
                <input type="radio" name="gender" value="männlich" required> Männlich
              </label>
              <label>
                <input type="radio" name="gender" value="divers" required> Divers
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-success mt-2">Patient speichern</button>
          <button type="button" class="btn btn-secondary mt-2">Beenden</button>
        </form>
      </div>
      
      <!-- Patienten Table (Static) -->
      <table class="table table-striped mt-4">
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
          <tr>
            <td>1</td>
            <td>Max</td>
            <td>Mustermann</td>
            <td>Männlich</td>
            <td>45</td>
            <td>Beispielkommentar</td>
            <td>
              <button class="btn btn-secondary btn-sm">Bearbeiten</button>
              <button class="btn btn-danger btn-sm">Löschen</button>
            </td>
          </tr>
          <!-- Weitere statische Einträge können hier eingefügt werden -->
        </tbody>
      </table>
    </section>
  </div>

  <div class="container mt-4">
    <div class="container-fluid py-4">
      <h2>Patientendaten</h2>
      <form>
        <!-- Patient Information -->
        <div class="mb-3">
          <label for="name" class="form-label">Name:</label>
          <input id="name" placeholder="Name" class="form-control">
        </div>
        <div class="mb-3">
          <label for="polypCount" class="form-label">Anzahl Polypen:</label>
          <input id="polypCount" type="number" placeholder="Anzahl der Polypen" class="form-control">
        </div>
        <div class="mb-3">
          <label for="comments" class="form-label">Kommentare:</label>
          <textarea id="comments" placeholder="Kommentare" class="form-control" rows="3"></textarea>
        </div>
        <hr>

        <!-- Center Selection -->
        <h3 class="mt-4">Zentrumsauswahl</h3>
        <div class="mb-3">
          <label for="centerSelect" class="form-label">Zentrum:</label>
          <select id="centerSelect" class="form-select">
            <option value="1">Würzburg</option>
            <option value="2">Regensburg</option>
            <option value="3">Hamburg</option>
            <option value="2">Stuttgart</option>
            <option value="2">Ludwigsburg</option>

            <!-- Weitere Zentren -->
          </select>
        </div>
        <hr>

        <!-- Examination Assignment -->
        <h3 class="mt-4">Untersuchung</h3>
        <div class="mb-3">
          <label for="examTypeSelect" class="form-label">Untersuchungstyp:</label>
          <select id="examTypeSelect" class="form-select">
            <option>Kolonoskopie</option>
          </select>
        </div>
        <hr>

        <!-- Finding -->
        <h3 class="mt-4">Befund</h3>
        <div class="mb-3">
          <label for="findingSelect" class="form-label">Befund auswählen:</label>
          <select id="findingSelect" class="form-select">
            <option>Kolonpolyp</option>
          </select>
        </div>
        <hr>

        <!-- Location Classification -->
        <h3 class="mt-4">Lokalisations-Klassifikation</h3>
        <div class="mb-3">
          <label for="locationClassificationSelect" class="form-label">Klassifikation wählen:</label>
          <select id="locationClassificationSelect" class="form-select">
            <option selected>Kolonoskopie default</option>
            <!-- Weitere Klassifikationen -->
          </select>
        </div>
        <div class="mb-3">
          <label for="locationChoiceSelect" class="form-label">Lokalisation wählen:</label>
          <select id="locationChoiceSelect" class="form-select">
            <option>Caecum</option>
            <option>Terminales Ileum</option>
            <option>Rechte Flexur</option>
            <option>Colon transversum</option>
            <option>Colon descendens</option>
            <option>Colon sigmoideum</option>
            <option>Rektum</option>
            <option>Analkanal</option>
          </select>
        </div>
        <hr>

        <!-- Morphology Classification -->
        <h3 class="mt-4">Morphologie-Klassifikation</h3>
        <div class="mb-3">
          <label for="morphologyClassificationSelect" class="form-label">Morphologie Klassifikation wählen:</label>
          <select id="morphologyClassificationSelect" class="form-select">
            <option>Größenklassifikation Kolonläsion (kategorisch)</option>
            <option>Formklassifikation Kolonläsion (kategorisch)</option>
            <option>Kolonläsion - Oberfläche intakt</option>
            <option>Kolonläsion - Planarität unbekannt</option>
            <option>Kolonläsion - Zirkularität</option>
            <option>NICE Typ 1</option>
            <option>NICE Typ 2</option>
            <option>NICE Typ 3</option>
            <option>Paris Is</option>
            <option>Paris Ip</option>
            <option>Paris IIa</option>
            <option>Paris IIb</option>
            <option>Paris IIc</option>
            <option>Paris III</option>
            <option>Paris IIa+IIc</option>
            <option>Paris IIb+IIc</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="morphologyChoiceSelect" class="form-label">Morphologie wählen:</label>
          <select id="morphologyChoiceSelect" class="form-select">
            <option disabled selected>Bitte wählen</option>
            <option>Diminutive (&lt; 6 mm)</option>
            <option>Small (6-9 mm)</option>
            <option>Intermediate (10-19 mm)</option>
            <option>Large (&gt; 19 mm)</option>
          </select>
        </div>
        <hr>

        <!-- Interventions -->
        <h3 class="mt-4">Intervention</h3>
        <p>Wähle eine oder mehrere Interventionen:</p>
        <div class="mb-3">
          <div class="form-check">
            <input type="checkbox" id="intervention1" class="form-check-input" value="cold-snare">
            <label for="intervention1" class="form-check-label">Kalte Schlingenpolypektomie</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention2" class="form-check-input" value="hot-snare">
            <label for="intervention2" class="form-check-label">Heiße Schlingenpolypektomie</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention3" class="form-check-input" value="injection-liftup">
            <label for="intervention3" class="form-check-label">Submuköse Lift-Injektion</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention4" class="form-check-input" value="injection-vasoactive">
            <label for="intervention4" class="form-check-label">Vasoaktive Injektion</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention5" class="form-check-input" value="biopsy">
            <label for="intervention5" class="form-check-label">Biopsie</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention6" class="form-check-input" value="emr">
            <label for="intervention6" class="form-check-label">Endoskopische Mukosaresektion (EMR)</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention7" class="form-check-input" value="esd">
            <label for="intervention7" class="form-check-label">Endoskopische Submukosadissektion (ESD)</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="intervention8" class="form-check-input" value="clip">
            <label for="intervention8" class="form-check-label">Clip-Applikation</label>
          </div>
        </div>
        <hr>

        <!-- Submit Button -->
        <div class="mb-3">
          <button type="submit" class="btn btn-danger">Finish &amp; Generate Report</button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>

</template>

<script>
import axios from 'axios';
import {reportService} from '@/api/reportService.js';
import {patientService} from '@/api/patientService.js';

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
