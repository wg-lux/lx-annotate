<template>
    <div class="container-fluid py-4">
      <h1>Fallübersicht</h1>
  
      <!-- Error Message -->
      <div v-if="patientStore.error" class="alert alert-danger" role="alert">
        {{ patientStore.error }}
        <button type="button" class="close" @click="patientStore.clearError()" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
  
      <!-- Loading Indicator -->
      <div v-if="patientStore.loading" class="text-center my-4">
        <div class="spinner-border" role="status">
          <span class="sr-only">Laden...</span>
        </div>
      </div>
  
      <!-- Patients Section -->
      <section class="patients-section mt-5">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2>Patienten ({{ patientStore.patientCount }})</h2>
          <button class="btn btn-primary" @click="openPatientForm()" :disabled="patientStore.loading">
            <i class="fas fa-plus"></i> Patienten hinzufügen
          </button>
        </div>
        
        <!-- Patient Form -->
        <div v-if="showPatientForm" class="form-container mt-4">
          <h3>{{ editingPatient ? 'Patient bearbeiten' : 'Neuer Patient' }}</h3>
          
          <!-- Form Validation Errors -->
          <div v-if="formErrors.length > 0" class="alert alert-warning">
            <ul class="mb-0">
              <li v-for="error in formErrors" :key="error">{{ error }}</li>
            </ul>
          </div>
  
          <form @submit.prevent="submitPatientForm">
            <!-- Persönliche Daten -->
            <div class="form-section">
              <h4>Persönliche Daten</h4>
              
              <div class="form-row">
                <div class="form-group col-md-6">
                  <label for="patientFirstName">Vorname *:</label>
                  <input 
                    v-model="patientForm.first_name"
                    type="text"
                    id="patientFirstName"
                    class="form-control"
                    :disabled="patientStore.loading"
                    required
                  />
                </div>
                <div class="form-group col-md-6">
                  <label for="patientLastName">Nachname *:</label>
                  <input 
                    v-model="patientForm.last_name"
                    type="text"
                    id="patientLastName"
                    class="form-control"
                    :disabled="patientStore.loading"
                    required
                  />
                </div>
              </div>
  
              <div class="form-row">
                <div class="form-group col-md-6">
                  <label for="patientDob">Geburtsdatum:</label>
                  <input 
                    v-model="patientForm.dob"
                    type="date"
                    id="patientDob"
                    class="form-control"
                    :disabled="patientStore.loading"
                    @change="updateCalculatedAge"
                  />
                  <small v-if="calculatedAge" class="form-text text-muted">
                    Alter: {{ calculatedAge }} Jahre
                  </small>
                </div>
                <div class="form-group col-md-6">
                  <label>Geschlecht:</label>
                  <div class="gender-options">
                    <div class="form-check form-check-inline" v-for="gender in patientStore.genders" :key="gender.id">
                      <input 
                        v-model="patientForm.gender"
                        :value="gender.id"
                        type="radio"
                        :id="`gender-${gender.id}`"
                        class="form-check-input"
                        :disabled="patientStore.loading"
                      />
                      <label :for="`gender-${gender.id}`" class="form-check-label">
                        {{ gender.name_de || gender.name }}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Kontaktdaten -->
            <div class="form-section">
              <h4>Kontaktdaten</h4>
              
              <div class="form-row">
                <div class="form-group col-md-6">
                  <label for="patientEmail">E-Mail:</label>
                  <input 
                    type="email" 
                    id="patientEmail" 
                    v-model="patientForm.email" 
                    class="form-control"
                    :disabled="patientStore.loading"
                  />
                </div>
                <div class="form-group col-md-6">
                  <label for="patientPhone">Telefon:</label>
                  <input 
                    type="tel" 
                    id="patientPhone" 
                    v-model="patientForm.phone" 
                    class="form-control"
                    :disabled="patientStore.loading"
                  />
                </div>
              </div>
            </div>
  
            <!-- Zentrum und System -->
            <div class="form-section">
              <h4>Zentrum und System</h4>
              
              <div class="form-row">
                <div class="form-group col-md-6">
                  <label for="patientCenter">Zentrum:</label>
                  <select 
                    id="patientCenter" 
                    v-model="patientForm.center" 
                    class="form-control"
                    :disabled="patientStore.loading"
                  >
                    <option :value="null">-- Zentrum auswählen --</option>
                    <option v-for="center in patientStore.centers" :key="center.id" :value="center.id">
                      {{ center.name_de || center.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group col-md-6">
                  <label for="patientHash">Patient Hash:</label>
                  <input 
                    type="text" 
                    id="patientHash" 
                    v-model="patientForm.patient_hash" 
                    class="form-control"
                    placeholder="Optional - wird automatisch generiert"
                    :disabled="patientStore.loading"
                  />
                  <small class="form-text text-muted">
                    Eindeutige Identifikation für Pseudonymisierung
                  </small>
                </div>
              </div>
            </div>
  
            <!-- Zusätzliche Informationen -->
            <div class="form-section">
              <h4>Zusätzliche Informationen</h4>
              
              <div class="form-group">
                <label for="patientComments">Kommentar:</label>
                <textarea 
                  id="patientComments" 
                  v-model="patientForm.comments" 
                  class="form-control" 
                  rows="3"
                  placeholder="Zusätzliche Notizen oder Bemerkungen..."
                  :disabled="patientStore.loading"
                ></textarea>
              </div>
            </div>
  
            <div class="form-actions">
              <button type="submit" class="btn btn-success" :disabled="patientStore.loading">
                <span v-if="patientStore.loading" class="spinner-border spinner-border-sm mr-2" role="status"></span>
                Patient speichern
              </button>
              <button type="button" class="btn btn-secondary ml-2" @click="closePatientForm" :disabled="patientStore.loading">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
  
        <!-- Patient Table -->
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead class="thead-primary">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geburtsdatum</th>
                <th>Alter</th>
                <th>Geschlecht</th>
                <th>E-Mail</th>
                <th>Telefon</th>
                <th>Zentrum</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="patient in patientStore.patientsWithAge" :key="patient.id">
                <td>{{ patient.id }}</td>
                <td>{{ patient.first_name }} {{ patient.last_name }}</td>
                <td>{{ formatDate(patient.dob) }}</td>
                <td>{{ patient.age ?? '-' }}</td>
                <td>{{ patientStore.getGenderDisplayName(patient.gender?.toString() ?? null) }}</td>
                <td>{{ patient.email || '-' }}</td>
                <td>{{ patient.phone || '-' }}</td>
                <td>{{ patientStore.getCenterDisplayName(patient.center?.toString() ?? null) }}</td>
                <td>
                  <button 
                    class="btn btn-secondary btn-sm mr-1" 
                    @click="openPatientForm(patient)"
                    :disabled="patientStore.loading"
                  >
                    <i class="fas fa-edit"></i> Bearbeiten
                  </button>
                  <button 
                    class="btn btn-danger btn-sm" 
                    @click="deletePatient(patient.id!)"
                    :disabled="patientStore.loading"
                  >
                    <i class="fas fa-trash"></i> Löschen
                  </button>
                </td>
              </tr>
              <tr v-if="patientStore.patients.length === 0 && !patientStore.loading">
                <td colspan="9" class="text-center text-muted">
                  Keine Patienten gefunden. Klicken Sie auf "Patienten hinzufügen" um den ersten Patienten anzulegen.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { usePatientStore } from '@/stores/patientStore'
  import type { Patient, PatientFormData } from '@/api/patientService'
  
  // Store
  const patientStore = usePatientStore()
  
  // Local state
  const showPatientForm = ref(false)
  const editingPatient = ref<Patient | null>(null)
  const formErrors = ref<string[]>([])
  
  const patientForm = ref<PatientFormData>({
    id: null,
    first_name: '',
    last_name: '',
    dob: '',
    gender: null,
    center: null,
    email: '',
    phone: '',
    patient_hash: '',
    comments: ''
  })
  
  // Computed
  const calculatedAge = computed(() => {
    if (!patientForm.value.dob) return null
    return patientStore.calculatePatientAge(patientForm.value.dob)
  })
  
  // Methods
  const openPatientForm = (patient?: Patient) => {
    if (patient) {
      editingPatient.value = patient
      patientForm.value = { 
        id: patient.id || null,
        first_name: patient.first_name,
        last_name: patient.last_name,
        dob: patient.dob || '',
        gender: patient.gender || null,
        center: patient.center || null,
        email: patient.email || '',
        phone: patient.phone || '',
        patient_hash: patient.patient_hash || '',
        comments: patient.comments || ''
      }
    } else {
      editingPatient.value = null
      resetPatientForm()
    }
    showPatientForm.value = true
    formErrors.value = []
  }
  
  const closePatientForm = () => {
    showPatientForm.value = false
    editingPatient.value = null
    resetPatientForm()
    formErrors.value = []
  }
  
  const resetPatientForm = () => {
    patientForm.value = {
      id: null,
      first_name: '',
      last_name: '',
      dob: '',
      gender: null,
      center: null,
      email: '',
      phone: '',
      patient_hash: '',
      comments: ''
    }
  }
  
  const submitPatientForm = async () => {
    // Validate form
    const validation = patientStore.validatePatientForm(patientForm.value)
    if (!validation.isValid) {
      formErrors.value = validation.errors
      return
    }
  
    formErrors.value = []
  
    try {
      const formattedData = patientStore.formatPatientForSubmission(patientForm.value)
      
      if (editingPatient.value) {
        await patientStore.updatePatient(editingPatient.value.id!, formattedData)
      } else {
        await patientStore.createPatient(formattedData)
      }
      
      closePatientForm()
    } catch (error) {
      console.error('Error saving patient:', error)
      // Error is handled by the store and displayed in the template
    }
  }
  
  const deletePatient = async (id: number) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Patienten löschen möchten?')) {
      return
    }
  
    try {
      await patientStore.deletePatient(id)
    } catch (error) {
      console.error('Error deleting patient:', error)
      // Error is handled by the store and displayed in the template
    }
  }
  
  const updateCalculatedAge = () => {
    // Trigger reactivity for calculated age
    // The computed property will automatically recalculate
  }
  
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('de-DE')
    } catch {
      return '-'
    }
  }
  
  // Lifecycle
  onMounted(async () => {
    try {
      await Promise.all([
        patientStore.fetchPatients(),
        patientStore.initializeLookupData()
      ])
    } catch (error) {
      console.error('Error initializing component:', error)
    }
  })
  </script>
  
  <style scoped>
  .form-container {
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 2rem;
    background-color: #f8f9fa;
    margin-bottom: 2rem;
  }
  
  .form-section {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #dee2e6;
  }
  
  .form-section:last-child {
    border-bottom: none;
  }
  
  .form-section h4 {
    color: #495057;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    font-weight: 500;
    color: #495057;
    margin-bottom: 0.5rem;
  }
  
  .form-control {
    border-radius: 4px;
    border: 1px solid #ced4da;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  
  .form-control:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
  
  .form-control:disabled {
    background-color: #f8f9fa;
    opacity: 0.7;
  }
  
  .gender-options {
    padding-top: 0.5rem;
  }
  
  .form-check-inline {
    margin-right: 1rem;
  }
  
  .form-actions {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #dee2e6;
  }
  
  .table-responsive {
    margin-top: 2rem;
  }
  
  .table {
    margin-top: 1rem;
  }
  
  .thead-dark th {
    background-color: #343a40;
    border-color: #454d55;
  }
  
  .btn-sm {
    font-size: 0.875rem;
  }
  
  .text-muted {
    font-size: 0.875rem;
  }
  
  .spinner-border-sm {
    width: 1rem;
    height: 1rem;
  }
  
  .close {
    padding: 0.25rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
    color: #000;
    text-shadow: 0 1px 0 #fff;
    opacity: .5;
  }
  
  .close:hover {
    opacity: .75;
  }
  
  @media (max-width: 768px) {
    .form-container {
      padding: 1rem;
    }
    
    .table-responsive {
      font-size: 0.875rem;
    }
    
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
  }
  </style>
