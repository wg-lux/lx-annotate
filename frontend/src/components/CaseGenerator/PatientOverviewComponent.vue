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
            <input type="text" id="patientFirstName" v-model="patientForm.first_name" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="patientLastName">Nachname:</label>
            <input type="text" id="patientLastName" v-model="patientForm.last_name" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="patientAge">Alter:</label>
            <input type="number" id="patientAge" v-model="patientForm.age" class="form-control" required />
          </div>
          <div class="form-group">
            <label for="patientComments">Kommentar:</label>
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
</template>

<script>
import { patientService } from '@/api/patientService';

export default {
  name: 'CasesOverview',
  data() {
    return {
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
      errorMessage: ''
    };
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
    }
  },
  mounted() {
    this.loadPatients();
  }
};
</script>

<style scoped>
.table {
  margin-top: 1rem;
}
.form-container {
  border: 1px solid #000;
  padding: 1rem;
  background-color: #f9f9f9;
  max-width: 500px;
}
.form-group {
  margin-bottom: 1rem;
  border: 1px solid #000;
}
</style>
