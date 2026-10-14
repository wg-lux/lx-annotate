<template>
  <div class="patient-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">
        <i class="ni ni-circle-08 dashboard-heading-icon"></i>
        Patienten-Dashboard
      </h1>
      <div class="header-actions">
        <button
          class="btn btn-primary"
          :disabled="loading"
          @click="showCreateForm = true"
        >
          <i class="ni ni-fat-add"></i>
          Neuer Patient
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="alert alert-danger alert-dismissible"
    >
      <strong>Fehler:</strong> {{ error }}
      <button
        type="button"
        class="btn-close"
        @click="error = ''"
      ></button>
    </div>

    <!-- Success Alert -->
    <div
      v-if="successMessage"
      class="alert alert-success alert-dismissible"
    >
      <strong>Erfolg:</strong> {{ successMessage }}
      <button
        type="button"
        class="btn-close"
        @click="successMessage = ''"
      ></button>
    </div>

    <!-- Loading Spinner -->
    <div
      v-if="loading"
      class="loading-container"
    >
      <div
        class="spinner-border text-primary"
        role="status"
      >
        <span class="visually-hidden">Laden...</span>
      </div>
      <p>Lade Patientendaten...</p>
    </div>

    <!-- Patient Creation Form -->
    <div
      v-if="showCreateForm && !loading"
      class="card form-card"
    >
      <div class="card-header">
        <h3 class="card-title">
          <i class="ni ni-fat-add card-heading-icon"></i>
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
    <div
      v-if="!loading && !showCreateForm"
      class="card patients-card"
    >
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h3 class="card-title mb-0">
            <i class="ni ni-single-copy-04 card-heading-icon"></i>
            Patienten ({{ patients.length }})
          </h3>
          <div class="search-box">
            <input
              v-model="searchTerm"
              type="text"
              class="form-control"
              placeholder="Patienten suchen..."
            />
          </div>
        </div>
      </div>
      <div class="card-body">
        <PatientKanban
          ref="board"
          :search-term="searchTerm"
          @select="selectPatient"
        />
      </div>
    </div>

    <!-- Patient Detail View -->
    <div
      v-if="selectedPatient && !showCreateForm && !loading"
      class="patient-detail-section"
    >
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
import { usePatientStore, type Patient } from '@/stores/patientStore'
import { patientService } from '@/api/patientService'
import PatientCreateForm from './PatientCreateForm.vue'
import PatientDetailView from './PatientDetailView.vue'
import PatientKanban from './PatientKanban.vue'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('patient-dashboard')

// Composables
const patientStore = usePatientStore()
const board = ref<InstanceType<typeof PatientKanban> | null>(null)

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

// Methods
const loadData = async () => {
  try {
    loading.value = true
    error.value = ''

    await loadLookupData()
  } catch (err: unknown) {
    error.value = err instanceof Error && err.message ? err.message : 'Fehler beim Laden der Daten'
    logger.error('dashboard-load-failed', err, {
      operation: 'load',
      outcome: 'rejected'
    })
  } finally {
    loading.value = false
  }
}

const loadLookupData = async () => {
  // Lookup failures propagate to loadData so the dashboard's visible error state owns them.
  if (genders.value.length === 0) {
    const gendersData = await patientService.getGenders()
    patientStore.genders = gendersData
  }

  if (centers.value.length === 0) {
    const centersData = await patientService.getCenters()
    patientStore.centers = centersData
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
  void board.value?.refresh()
  selectedPatient.value = patient

  // Update in patients list
  const index = patientStore.patients.findIndex((p) => p.id === patient.id)
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
  void board.value?.refresh()
  // Remove patient from store
  const index = patientStore.patients.findIndex((p) => p.id === patientId)
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

// Lifecycle
onMounted(async () => {
  await loadData()
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

.dashboard-title .dashboard-heading-icon {
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

.card-title .card-heading-icon {
  margin-right: 0.5rem;
  color: #3498db;
}

.search-box {
  min-width: 300px;
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

  .search-box {
    min-width: auto;
  }
}
</style>
