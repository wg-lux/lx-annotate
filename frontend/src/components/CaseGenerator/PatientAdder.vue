<template>
    <div>
      <form @submit.prevent="handleSubmit">
        <!-- Patient Information -->
        <h2>Patientendaten</h2>
        
        <label for="firstName">Vorname: *</label>
        <input 
          v-model="formData.first_name" 
          id="firstName" 
          type="text"
          required
          placeholder="Vorname eingeben" 
        />

        <label for="lastName">Nachname: *</label>
        <input 
          v-model="formData.last_name" 
          id="lastName" 
          type="text"
          required
          placeholder="Nachname eingeben" 
        />

        <label for="dob">Geburtsdatum:</label>
        <input 
          v-model="formData.dob" 
          id="dob" 
          type="date"
          placeholder="YYYY-MM-DD" 
        />

        <label for="email">E-Mail:</label>
        <input 
          v-model="formData.email" 
          id="email" 
          type="email"
          placeholder="email@beispiel.de" 
        />

        <label for="phone">Telefon:</label>
        <input 
          v-model="formData.phone" 
          id="phone" 
          type="tel"
          placeholder="Telefonnummer" 
        />

        <div>
          <label>Geschlecht:</label>
          <select v-model="formData.gender" id="genderSelect">
            <option value="">Bitte wählen</option>
            <option v-for="gender in genders" :key="gender.id" :value="gender.name">
              {{ gender.name_de || gender.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="centerSelect">Zentrum:</label>
          <select v-model="formData.center" id="centerSelect">
            <option value="">Bitte wählen</option>
            <option v-for="center in centers" :key="center.id" :value="center.name">
              {{ center.name_de || center.name }}
            </option>
          </select>
        </div>

        <div>
          <label>
            <input type="checkbox" v-model="formData.is_real_person" />
            Reale Person (abgehakt = ja, nicht abgehakt = Testdaten)
          </label>
        </div>

        <hr />

        <!-- Submit Button -->
        <button type="submit" :disabled="loading" class="btn btn-primary">
          {{ loading ? 'Wird gespeichert...' : 'Patient erstellen' }}
        </button>
        
        <div v-if="errorMessage" class="alert alert-danger mt-2">
          {{ errorMessage }}
        </div>
        
        <div v-if="successMessage" class="alert alert-success mt-2">
          {{ successMessage }}
        </div>
      </form>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePatientStore, type PatientFormData } from '@/stores/patientStore'
import { createApiClient } from '@/api/client'

// Store und API Client
const patientStore = usePatientStore()
const apiClient = createApiClient()

// Reactive state
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Form data mit korrekten Feldnamen und Typen
const formData = ref<PatientFormData>({
  first_name: '',
  last_name: '',
  dob: null,
  email: '',
  phone: '',
  gender: null,
  center: null,
  patient_hash: '',
  comments: '',
  is_real_person: true
})

// Computed properties für Store-Daten
const genders = ref(patientStore.genders)
const centers = ref(patientStore.centers)

// Methods
const resetForm = () => {
  formData.value = {
    first_name: '',
    last_name: '',
    dob: null,
    email: '',
    phone: '',
    gender: null,
    center: null,
    patient_hash: '',
    comments: '',
    is_real_person: true
  }
}

const handleSubmit = async () => {
  try {
    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    // Validation
    if (!formData.value.first_name?.trim()) {
      throw new Error('Vorname ist erforderlich')
    }
    if (!formData.value.last_name?.trim()) {
      throw new Error('Nachname ist erforderlich')
    }

    // Create patient using store with formatted data
    const formattedData = patientStore.formatPatientForSubmission(formData.value)
    const newPatient = await patientStore.createPatient(apiClient, formattedData)
    
    successMessage.value = `Patient "${newPatient.first_name} ${newPatient.last_name}" wurde erfolgreich erstellt!`
    
    // Reset form after successful creation
    resetForm()
    
  } catch (error: any) {
    errorMessage.value = error.message || 'Fehler beim Erstellen des Patienten'
    console.error('Error creating patient:', error)
  } finally {
    loading.value = false
  }
}

// Load required data on component mount
onMounted(async () => {
  try {
    // Load genders and centers for dropdowns
    await Promise.all([
      patientStore.fetchGenders(apiClient),
      patientStore.fetchCenters(apiClient)
    ])
  } catch (error) {
    console.error('Error loading dropdown data:', error)
    errorMessage.value = 'Fehler beim Laden der Auswahloptionen'
  }
})
</script>

<style scoped>
h2 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #333;
}

label {
  display: block;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

select,
input[type='date'],
input[type='email'],
input[type='tel'],
input[type='text'] {
  display: block;
  margin-bottom: 0.5rem;
  width: 100%;
  max-width: 400px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

input[type='checkbox'] {
  margin-right: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: 0.75rem;
  margin-top: 1rem;
  border-radius: 4px;
  max-width: 400px;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

hr {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid #ddd;
}
</style>
