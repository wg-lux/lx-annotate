<template>
  <div class="patient-create-form">
    <form @submit.prevent="handleSubmit">
      <!-- Basic Information -->
      <div class="form-section">
        <h4>
          <i class="fas fa-user"></i>
          Grunddaten
        </h4>
        
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="firstName" class="required">Vorname</label>
              <input 
                v-model="form.first_name"
                type="text"
                id="firstName"
                class="form-control"
                :class="{ 'is-invalid': errors.first_name }"
                required
                placeholder="Vorname eingeben"
              />
              <div v-if="errors.first_name" class="invalid-feedback">
                {{ errors.first_name }}
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="form-group">
              <label for="lastName" class="required">Nachname</label>
              <input 
                v-model="form.last_name"
                type="text"
                id="lastName"
                class="form-control"
                :class="{ 'is-invalid': errors.last_name }"
                required
                placeholder="Nachname eingeben"
              />
              <div v-if="errors.last_name" class="invalid-feedback">
                {{ errors.last_name }}
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="dob">Geburtsdatum</label>
              <input 
                v-model="form.dob"
                type="date"
                id="dob"
                class="form-control"
                :class="{ 'is-invalid': errors.dob }"
              />
              <div v-if="errors.dob" class="invalid-feedback">
                {{ errors.dob }}
              </div>
              <small v-if="calculatedAge" class="form-text text-muted">
                Alter: {{ calculatedAge }} Jahre
              </small>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="form-group">
              <label for="gender">Geschlecht</label>
              <select 
                v-model="form.gender"
                id="gender"
                class="form-control"
                :class="{ 'is-invalid': errors.gender }"
              >
                <option value="">Bitte wählen</option>
                <option 
                  v-for="gender in genders" 
                  :key="gender.id" 
                  :value="gender.name"
                >
                  {{ gender.name_de || gender.name }}
                </option>
              </select>
              <div v-if="errors.gender" class="invalid-feedback">
                {{ errors.gender }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="form-section">
        <h4>
          <i class="fas fa-address-book"></i>
          Kontaktdaten
        </h4>
        
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="email">E-Mail</label>
              <input 
                v-model="form.email"
                type="email"
                id="email"
                class="form-control"
                :class="{ 'is-invalid': errors.email }"
                placeholder="email@beispiel.de"
              />
              <div v-if="errors.email" class="invalid-feedback">
                {{ errors.email }}
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="form-group">
              <label for="phone">Telefon</label>
              <input 
                v-model="form.phone"
                type="tel"
                id="phone"
                class="form-control"
                :class="{ 'is-invalid': errors.phone }"
                placeholder="+49 123 456789"
              />
              <div v-if="errors.phone" class="invalid-feedback">
                {{ errors.phone }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Organization -->
      <div class="form-section">
        <h4>
          <i class="fas fa-hospital"></i>
          Organisation
        </h4>
        
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="center">Zentrum</label>
              <select 
                v-model="form.center"
                id="center"
                class="form-control"
                :class="{ 'is-invalid': errors.center }"
              >
                <option value="">Bitte wählen</option>
                <option 
                  v-for="center in centers" 
                  :key="center.id" 
                  :value="center.name"
                >
                  {{ center.name_de || center.name }}
                </option>
              </select>
              <div v-if="errors.center" class="invalid-feedback">
                {{ errors.center }}
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="form-group">
              <label>
                <input 
                  v-model="form.is_real_person"
                  type="checkbox"
                  class="form-check-input me-2"
                />
                Reale Person
              </label>
              <small class="form-text text-muted d-block">
                Aktiviert für echte Patienten, deaktiviert für Testdaten
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <!-- General Error Message -->
        <div v-if="errors.general" class="alert alert-danger w-100 mb-3">
          <strong>Fehler:</strong> {{ errors.general }}
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="loading || !isFormValid"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fas fa-save me-2"></i>
          {{ loading ? 'Wird gespeichert...' : 'Patient erstellen' }}
        </button>
        
        <button 
          type="button" 
          class="btn btn-secondary ms-2"
          @click="$emit('cancel')"
          :disabled="loading"
        >
          <i class="fas fa-times me-2"></i>
          Abbrechen
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatientStore, type Patient, type PatientFormData, type Gender, type Center } from '@/stores/patientStore'
import { patientService } from '@/api/patientService'

// Emits
const emit = defineEmits<{
  'patient-created': [patient: Patient]
  'cancel': []
}>()

// Composables
const patientStore = usePatientStore()

// Reactive state
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref<PatientFormData>({
  id: null,
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

// Computed
const genders = computed(() => patientStore.genders)
const centers = computed(() => patientStore.centers)

const calculatedAge = computed(() => {
  if (!form.value.dob) return null
  
  try {
    const birthDate = new Date(form.value.dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age >= 0 ? age : null
  } catch {
    return null
  }
})

const isFormValid = computed(() => {
  return form.value.first_name.trim() !== '' && 
         form.value.last_name.trim() !== '' &&
         Object.keys(errors.value).length === 0
})

// Methods
const validateForm = () => {
  errors.value = {}
  
  // Required fields
  if (!form.value.first_name?.trim()) {
    errors.value.first_name = 'Vorname ist erforderlich'
  }
  
  if (!form.value.last_name?.trim()) {
    errors.value.last_name = 'Nachname ist erforderlich'
  }
  
  // Date validation
  if (form.value.dob) {
    const birthDate = new Date(form.value.dob)
    const today = new Date()
    
    if (birthDate > today) {
      errors.value.dob = 'Geburtsdatum kann nicht in der Zukunft liegen'
    }
  }
  
  // Email validation
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Ungültige E-Mail-Adresse'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  console.log('=== FORM SUBMIT START ===')
  console.log('handleSubmit aufgerufen!', { 
    formValid: isFormValid.value, 
    loading: loading.value,
    formData: form.value 
  })
  
  if (!validateForm()) {
    console.log('❌ Validierung fehlgeschlagen:', errors.value)
    return
  }
  
  let formattedData: any = null
  
  try {
    loading.value = true
    errors.value = {} // Reset errors
    console.log('✅ Validation passed, sende Daten:', form.value)
    
    // Format data for submission using patientStore method
    formattedData = patientStore.formatPatientForSubmission(form.value)
    console.log('📋 Formatierte Daten für API:', formattedData)
    
    // Log the exact URL that will be called
    console.log('🌐 API-Aufruf wird gestartet...')
    console.log('URL:', `/api/patients/`)
    console.log('Full URL wird zu:', `${window.location.origin}/api/patients/`)
    
    // Use patientStore instead of patientService for consistency
    const newPatient = await patientStore.createPatient(null, formattedData)
    console.log('🎉 Patient erfolgreich erstellt:', newPatient)
    
    // Reset form
    form.value = {
      id: null,
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
    
    // Emit event with the created patient
    emit('patient-created', newPatient)
    console.log('📤 Event patient-created ausgelöst mit:', newPatient)
    console.log('=== FORM SUBMIT SUCCESS ===')
    
  } catch (error: any) {
    console.log('=== FORM SUBMIT ERROR ===')
    console.error('❌ KOMPLETTES ERROR-OBJEKT:', error)
    console.error('❌ ERROR STACK:', error.stack)
    console.error('❌ ERROR NAME:', error.name)
    console.error('❌ ERROR MESSAGE:', error.message)
    
    // Handle different error types
    if (error.message && error.message.includes('HTTP error!')) {
      // This is from our fetch-based patientStore
      errors.value.general = 'Server-Fehler beim Erstellen des Patienten. Prüfen Sie Ihre Verbindung.'
    } else {
      errors.value.general = error.message || 'Unbekannter Fehler beim Erstellen des Patienten'
    }
    
    // Zusätzliche Debugging-Informationen
    console.error('🔍 Zusätzliche Debug-Infos:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      formattedData: formattedData,
      timestamp: new Date().toISOString()
    })
  } finally {
    loading.value = false
    console.log('🏁 Loading beendet, finaler Zustand:', { 
      loading: loading.value, 
      errors: errors.value,
      hasErrors: Object.keys(errors.value).length > 0
    })
  }
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
  }
}

// Lifecycle
onMounted(() => {

  loadLookupData()
})
</script>

<style scoped>
.patient-create-form {
  max-width: 800px;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 1rem;
}

.form-section h4 {
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.form-section h4 i {
  margin-right: 0.5rem;
  color: #3498db;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.5rem;
  display: block;
}

.form-group label.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control {
  border-radius: 6px;
  border: 1px solid #ced4da;
  padding: 0.75rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.form-control.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.invalid-feedback {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #dc3545;
}

.form-check-input {
  margin-right: 0.5rem;
}

.form-text {
  font-size: 0.875rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.form-actions {
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  align-items: center;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  border-color: #3498db;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  border-color: #2980b9;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
  border-color: #545b62;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>