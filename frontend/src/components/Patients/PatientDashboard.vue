<template>
  <div class="patient-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">
        <i class="fas fa-users"></i>
        Patienten-Dashboard
      </h1>
      <div class="header-actions">
        <button 
          class="btn btn-primary" 
          @click="showCreateForm = true"
          :disabled="loading"
        >
          <i class="fas fa-plus"></i>
          Neuer Patient
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-danger alert-dismissible">
      <strong>Fehler:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = ''"></button>
    </div>

    <!-- Success Alert -->
    <div v-if="successMessage" class="alert alert-success alert-dismissible">
      <strong>Erfolg:</strong> {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = ''"></button>
    </div>

    <!-- Loading Spinner -->
    <div v-if="loading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Laden...</span>
      </div>
      <p>Lade Patientendaten...</p>
    </div>

    <!-- Patient Creation Form -->
    <div v-if="showCreateForm && !loading" class="card form-card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fas fa-user-plus"></i>
          Neuen Patienten erstellen
        </h3>
      </div>
      <div class="card-body">
        <PatientCreateForm 
          @patient-created="onPatientCreated"
          @cancel="showCreateForm = false"
        />
      </div>
    </div>

    <!-- Patient List -->
    <div v-if="!loading && !showCreateForm" class="card patients-card">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h3 class="card-title mb-0">
            <i class="fas fa-list"></i>
            Patienten ({{ patients.length }})
          </h3>
          <div class="search-box">
            <input 
              v-model="searchTerm"
              type="text"
              class="form-control"
              placeholder="Patienten suchen..."
            >
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- Patient Cards Grid -->
        <div v-if="filteredPatients.length > 0" class="patients-grid">
          <div 
            v-for="patient in filteredPatients" 
            :key="patient.id"
            class="patient-card"
            @click="selectPatient(patient)"
            :class="{ 'selected': selectedPatient?.id === patient.id }"
          >
            <div class="patient-card-header">
              <h5 class="patient-name">
                {{ patient.firstName }} {{ patient.lastName }}
              </h5>
              <span class="patient-id">ID: {{ patient.id }}</span>
            </div>
            <div class="patient-card-body">
              <div class="patient-info">
                <div class="info-item">
                  <i class="fas fa-birthday-cake"></i>
                  <span>{{ formatDate(patient.dob) }}</span>
                  <small v-if="patient.age">({{ patient.age }} Jahre)</small>
                </div>
                <div class="info-item" v-if="patient.gender">
                  <i class="fas fa-venus-mars"></i>
                  <span>{{ getGenderName(patient.gender) }}</span>
                </div>
                <div class="info-item" v-if="patient.center">
                  <i class="fas fa-hospital"></i>
                  <span>{{ getCenterName(patient.center) }}</span>
                </div>
                <div class="info-item" v-if="patient.email">
                  <i class="fas fa-envelope"></i>
                  <span>{{ patient.email }}</span>
                </div>
              </div>
            </div>
            <div class="patient-card-footer">
              <small class="text-muted">
                Klicken für Details
              </small>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="empty-state">
          <i class="fas fa-users fa-3x text-muted"></i>
          <h4>Keine Patienten gefunden</h4>
          <p class="text-muted">
            {{ searchTerm ? 'Keine Patienten entsprechen der Suche.' : 'Erstellen Sie den ersten Patienten.' }}
          </p>
          <button 
            v-if="!searchTerm"
            class="btn btn-primary"
            @click="showCreateForm = true"
          >
            <i class="fas fa-plus"></i>
            Ersten Patienten erstellen
          </button>
        </div>
      </div>
    </div>

    <!-- Patient Detail View -->
    <div v-if="selectedPatient && !showCreateForm && !loading" class="patient-detail-section">
      <PatientDetailView 
        :patient="selectedPatient"
        @patient-updated="onPatientUpdated"
        @patient-deleted="onPatientDeleted"
        @close="selectedPatient = null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatientStore, type Patient, type Gender, type Center } from '@/stores/patientStore'
import { patientService } from '@/api/patientService'
import PatientCreateForm from './PatientCreateForm.vue'
import PatientDetailView from './PatientDetailView.vue'

// Composables
const patientStore = usePatientStore()

// Reactive state
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const showCreateForm = ref(false)
const selectedPatient = ref<Patient | null>(null)
const searchTerm = ref('')

// Computed
const patients = computed(() => patientStore.patients)
const genders = computed(() => patientStore.genders)
const centers = computed(() => patientStore.centers)

const filteredPatients = computed(() => {
  if (!searchTerm.value) return patients.value
  
  const term = searchTerm.value.toLowerCase()
  return patients.value.filter(patient => 
    patient.firstName?.toLowerCase().includes(term) ||
    patient.lastName?.toLowerCase().includes(term) ||
    patient.email?.toLowerCase().includes(term) ||
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(term)
  )
})

// Methods
const loadData = async () => {
  try {
    loading.value = true
    error.value = ''
    
    await Promise.all([
      loadPatients(),
      loadLookupData()
    ])
    
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Laden der Daten'
    console.error('Error loading dashboard data:', err)
  } finally {
    loading.value = false
  }
}

const loadPatients = async () => {
  const patientsData = await patientService.getPatients()
  patientStore.patients = patientsData
}
const loadLookupData = async () => {
  try {
    // Load genders and centers if not already loaded
    if (genders.value.length === 0) {
      const gendersData = await patientService.getGenders()
      patientStore.genders = gendersData
    }
    
    if (centers.value.length === 0) {
      const centersData = await patientService.getCenters()
      patientStore.centers = centersData
    }
  } catch (error) {
    console.error('Error loading lookup data:', error)
    // Either re-throw to show error to user or implement fallback
    // throw new Error('Fehler beim Laden der Nachschlagedaten')
  }
}

const selectPatient = (patient: Patient) => {
  selectedPatient.value = patient
}

const onPatientCreated = (patient: Patient) => {
  showCreateForm.value = false
  selectedPatient.value = patient
  
  successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich erstellt!`
  
  // Clear success message after 5 seconds
  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
}

const onPatientUpdated = (patient: Patient) => {
  selectedPatient.value = patient
  
  // Update in patients list
  const index = patientStore.patients.findIndex(p => p.id === patient.id)
  if (index !== -1) {
    patientStore.patients[index] = patient
  }
  
  successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich aktualisiert!`
  
  // Clear success message after 5 seconds
  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
}

const onPatientDeleted = (patientId: number) => {
  // Remove patient from store
  const index = patientStore.patients.findIndex(p => p.id === patientId)
  if (index !== -1) {
    const deletedPatient = patientStore.patients[index]
    patientStore.patients.splice(index, 1)
    
    successMessage.value = `Patient "${deletedPatient.firstName} ${deletedPatient.lastName}" wurde erfolgreich gelöscht!`
  }
  
  // Close detail view
  selectedPatient.value = null
  
  // Clear success message after 5 seconds
  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Nicht angegeben'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE')
  } catch {
    return 'Ungültig'
  }
}

const getGenderName = (genderValue?: string | null) => {
  if (!genderValue) return 'Nicht angegeben'
  const gender = genders.value.find(g => g.name === genderValue)
  return gender?.name_de || gender?.name || genderValue
}

const getCenterName = (centerValue?: string | null) => {
  if (!centerValue) return 'Nicht zugeordnet'
  const center = centers.value.find(c => c.name === centerValue)
  return center?.name_de || center?.name || centerValue
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.patient-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-title {
  color: #2c3e50;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
}

.dashboard-title i {
  margin-right: 0.5rem;
  color: #3498db;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.form-card {
  margin-bottom: 2rem;
}

.card-title {
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.card-title i {
  margin-right: 0.5rem;
  color: #3498db;
}

.search-box {
  min-width: 300px;
}

.patients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.patient-card {
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.patient-card:hover {
  border-color: #3498db;
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.2);
  transform: translateY(-2px);
}

.patient-card.selected {
  border-color: #3498db;
  background: #f8fafb;
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.patient-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e9ecef;
}

.patient-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.patient-id {
  font-size: 0.85rem;
  color: #6c757d;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.patient-card-body {
  margin-bottom: 1rem;
}

.patient-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #495057;
}

.info-item i {
  width: 16px;
  color: #6c757d;
}

.info-item small {
  color: #6c757d;
  margin-left: 0.25rem;
}

.patient-card-footer {
  padding-top: 0.75rem;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state i {
  margin-bottom: 1rem;
}

.empty-state h4 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-container .spinner-border {
  margin-bottom: 1rem;
}

.patient-detail-section {
  margin-top: 2rem;
}

.alert {
  border-radius: 8px;
  margin-bottom: 1rem;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3498db;
  border-color: #3498db;
}

.btn-primary:hover {
  background: #2980b9;
  border-color: #2980b9;
  transform: translateY(-1px);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  opacity: 0.7;
}

.btn-close:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .patient-dashboard {
    padding: 1rem;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .patients-grid {
    grid-template-columns: 1fr;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .patient-card {
    padding: 1rem;
  }
  
  .patient-card-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>
