<template>
  <div class="container-fluid py-4">
    <h1>Fallübersicht</h1>

    <!-- Reports Section -->
    <section class="reports-section">
      <h2>Untersuchungen</h2>
      <button class="btn btn-primary mb-3" @click="openReportForm()">Add Report</button>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.id">
            <td>{{ report.id }}</td>
            <td>{{ report.title }}</td>
            <td>{{ report.description }}</td>
            <td>
              <button class="btn btn-secondary btn-sm" @click="openReportForm(report)">Edit</button>
              <button class="btn btn-danger btn-sm" @click="deleteReport(report.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Patients Section -->
    <section class="patients-section mt-5">
      <h2>Patienten</h2>
      <button class="btn btn-primary mb-3" @click="openPatientForm()">Patienten hinzufügen</button>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Geschlecht</th>
            <th>Kommentar</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="patient in patients" :key="patient.id">
            <td>{{ patient.id }}</td>
            <td>{{ patient.name }}</td>
            <td>{{ patient.gender }}</td>
            <td>{{ patient.comments }}</td>
            <td>
              <button class="btn btn-secondary btn-sm" @click="openPatientForm(patient)">Edit</button>
              <button class="btn btn-danger btn-sm" @click="deletePatient(patient.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Report Form (inline demo; you could also use a modal) -->
    <div v-if="showReportForm" class="form-container mt-4">
      <h3>{{ editingReport ? 'Edit Report' : 'Add Report' }}</h3>
      <form @submit.prevent="submitReportForm">
        <div class="form-group">
          <label for="reportTitle">Title:</label>
          <input type="text" id="reportTitle" v-model="reportForm.title" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="reportDescription">Description:</label>
          <textarea id="reportDescription" v-model="reportForm.description" class="form-control" required></textarea>
        </div>
        <button type="submit" class="btn btn-success mt-2">Save Report</button>
        <button type="button" class="btn btn-secondary mt-2" @click="closeReportForm">Cancel</button>
      </form>
    </div>

    <!-- Patient Form (inline demo; you could also use a modal) -->
    <div v-if="showPatientForm" class="form-container mt-4">
      <h3>{{ editingPatient ? 'Edit Patient' : 'Add Patient' }}</h3>
      <form @submit.prevent="submitPatientForm">
        <div class="form-group">
          <label for="patientName">Name:</label>
          <input type="text" id="patientName" v-model="patientForm.name" class="form-control" required />
        </div>

        <div class="form-group">
          <label for="patientComments">Comments:</label>
          <textarea id="patientComments" v-model="patientForm.comments" class="form-control"></textarea>
        </div>
        <div class="form-group">
          <label>Gender:</label>
          <div>
            <label>
              <input type="radio" value="female" v-model="patientForm.gender" required /> Weiblich
            </label>
            <label>
              <input type="radio" value="male" v-model="patientForm.gender" required /> Männlich
            </label>
            <label>
              <input type="radio" value="divers" v-model="patientForm.gender" required /> Divers
            </label>
          </div>
        </div>
        <button type="submit" class="btn btn-success mt-2">Patient speichern</button>
        <button type="button" class="btn btn-secondary mt-2" @click="closePatientForm">Cancel</button>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'CasesOverview',
  data() {
    return {
      reports: [],
      patients: [],
      // Report form handling
      showReportForm: false,
      editingReport: null,
      reportForm: {
        id: null,
        title: '',
        description: ''
      },
      // Patient form handling
      showPatientForm: false,
      editingPatient: null,
      patientForm: {
        id: null,
        name: '',
        polypCount: '',
        comments: '',
        gender: ''
      },
      errorMessage: ''
    };
  },
  methods: {
    // --- Loading Data ---
    async loadReports() {
      try {
        const response = await axios.get('api/reports/');
        this.reports = response.data;
      } catch (error) {
        console.error('Error loading reports:', error);
      }
    },
    async loadPatients() {
      try {
        const response = await axios.get('api/patients/');
        this.patients = response.data;
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    },

    // --- Report CRUD Operations ---
    openReportForm(report = null) {
      if (report) {
        this.editingReport = report;
        this.reportForm = { ...report };
      } else {
        this.editingReport = null;
        this.reportForm = { id: null, title: '', description: '' };
      }
      this.showReportForm = true;
    },
    closeReportForm() {
      this.showReportForm = false;
      this.editingReport = null;
      this.reportForm = { id: null, title: '', description: '' };
    },
    async submitReportForm() {
      try {
        if (this.editingReport) {
          // Update report
          const response = await axios.put(`api/reports/${this.reportForm.id}/`, this.reportForm);
          const index = this.reports.findIndex(r => r.id === this.reportForm.id);
          if (index !== -1) {
            this.$set(this.reports, index, response.data);
          }
        } else {
          // Create new report
          const response = await axios.post('api/reports/', this.reportForm);
          this.reports.push(response.data);
        }
        this.closeReportForm();
      } catch (error) {
        console.error('Error saving report:', error);
      }
    },
    async deleteReport(id) {
      try {
        await axios.delete(`api/reports/${id}/`);
        this.reports = this.reports.filter(report => report.id !== id);
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    },

    // --- Patient CRUD Operations ---
    openPatientForm(patient = null) {
      if (patient) {
        this.editingPatient = patient;
        this.patientForm = { ...patient };
      } else {
        this.editingPatient = null;
        this.patientForm = { id: null, name: '', polypCount: '', comments: '', gender: '' };
      }
      this.showPatientForm = true;
    },
    closePatientForm() {
      this.showPatientForm = false;
      this.editingPatient = null;
      this.patientForm = { id: null, name: '', polypCount: '', comments: '', gender: '' };
    },
    async submitPatientForm() {
      try {
        if (this.editingPatient) {
          // Update patient
          const response = await axios.put(`api/patients/${this.patientForm.id}/`, this.patientForm);
          const index = this.patients.findIndex(p => p.id === this.patientForm.id);
          if (index !== -1) {
            this.$set(this.patients, index, response.data);
          }
        } else {
          // Create new patient
          const response = await axios.post('api/patients/', this.patientForm);
          this.patients.push(response.data);
        }
        this.closePatientForm();
      } catch (error) {
        console.error('Error saving patient:', error);
      }
    },
    async deletePatient(id) {
      try {
        await axios.delete(`api/patients/${id}/`);
        this.patients = this.patients.filter(patient => patient.id !== id);
      } catch (error) {
        console.error('Error deleting patient:', error);
      }
    }
  },
  mounted() {
    // Load both reports and patients when the component mounts
    this.loadReports();
    this.loadPatients();
  }
};
</script>

<style scoped>
.table {
  margin-top: 1rem;
}
.form-container {
  border: 1px solid #ccc;
  padding: 1rem;
  background-color: #f9f9f9;
  max-width: 500px;
}
.form-group {
  margin-bottom: 1rem;
}
</style>
