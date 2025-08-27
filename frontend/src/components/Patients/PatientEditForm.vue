<template>
  <div class="patient-edit-form">
    <form @submit.prevent="handleSubmit" class="edit-form">
      <!-- Form Grid -->
      <div class="form-grid">
        <!-- Basic Information Section -->
        <div class="form-section">
          <h5 class="section-title">
            <i class="fas fa-user"></i>
            Grunddaten
          </h5>
          
          <div class="form-group">
            <label for="firstName" class="form-label required">
              Vorname
            </label>
            <input
              id="firstName"
              v-model="form.firstName"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': errors.firstName }"
              required
              maxlength="100"
            >
            <div v-if="errors.firstName" class="invalid-feedback">
              {{ errors.firstName }}
            </div>
          </div>

          <div class="form-group">
            <label for="lastName" class="form-label required">
              Nachname
            </label>
            <input
              id="lastName"
              v-model="form.lastName"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': errors.lastName }"
              required
              maxlength="100"
            >
            <div v-if="errors.lastName" class="invalid-feedback">
              {{ errors.lastName }}
            </div>
          </div>

          <div class="form-group">
            <label for="dob" class="form-label">
              Geburtsdatum
            </label>
            <input
              id="dob"
              v-model="form.dob"
              type="date"
              class="form-control"
              :class="{ 'is-invalid': errors.dob }"
              :max="maxDate"
            >
            <div v-if="errors.dob" class="invalid-feedback">
              {{ errors.dob }}
            </div>
            <small class="form-text text-muted">
              Optional - Wird zur Altersberechnung verwendet
            </small>
          </div>

          <div class="form-group">
            <label for="gender" class="form-label">
              Geschlecht
            </label>
            <select
              id="gender"
              v-model="form.gender"
              class="form-select"
              :class="{ 'is-invalid': errors.gender }"
            >
              <option value="">Bitte wählen</option>
              <option
                v-for="gender in genders"
                :key="gender.id"
                :value="gender.name"
              >
                {{ gender.nameDe || gender.name }}
              </option>
            </select>
            <div v-if="errors.gender" class="invalid-feedback">
              {{ errors.gender }}
            </div>
          </div>
        </div>

        <!-- Contact Information Section -->
        <div class="form-section">
          <h5 class="section-title">
            <i class="fas fa-address-book"></i>
            Kontaktdaten
          </h5>

          <div class="form-group">
            <label for="email" class="form-label">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="form-control"
              :class="{ 'is-invalid': errors.email }"
              maxlength="254"
            >
            <div v-if="errors.email" class="invalid-feedback">
              {{ errors.email }}
            </div>
          </div>

          <div class="form-group">
            <label for="phone" class="form-label">
              Telefonnummer
            </label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              class="form-control"
              :class="{ 'is-invalid': errors.phone }"
              maxlength="20"
            >
            <div v-if="errors.phone" class="invalid-feedback">
              {{ errors.phone }}
            </div>
          </div>

          <div class="form-group">
            <label for="center" class="form-label">
              Zentrum
            </label>
            <select
              id="center"
              v-model="form.center"
              class="form-select"
              :class="{ 'is-invalid': errors.center }"
            >
              <option value="">Kein Zentrum zugeordnet</option>
              <option
                v-for="center in centers"
                :key="center.id"
                :value="center.name"
              >
                {{ center.nameDe || center.name }}
              </option>
            </select>
            <div v-if="errors.center" class="invalid-feedback">
              {{ errors.center }}
            </div>
          </div>

          <div class="form-group">
            <div class="form-check">
              <input
                id="isRealPerson"
                v-model="form.isRealPerson"
                class="form-check-input"
                type="checkbox"
              >
              <label class="form-check-label" for="isRealPerson">
                <strong>Realer Patient</strong>
                <small class="d-block text-muted">
                  Markieren Sie dies nur für echte Patientendaten
                </small>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="generalError" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Fehler:</strong> {{ generalError }}
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <div class="action-group">
          <button
            type="button"
            class="btn btn-secondary"
            @click="$emit('cancel')"
            :disabled="loading"
          >
            <i class="fas fa-times"></i>
            Abbrechen
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !isFormValid"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="fas fa-save me-2"></i>
            {{ loading ? 'Wird gespeichert...' : 'Speichern' }}
          </button>
        </div>

        <!-- Delete Button (separate from main actions) -->
        <div class="delete-section">
          <button
            type="button"
            class="btn btn-outline-danger"
            @click="showDeleteModal = true"
            :disabled="loading"
          >
            <i class="fas fa-trash"></i>
            Patient löschen
          </button>
        </div>
      </div>
    </form>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle text-danger"></i>
              Patient löschen bestätigen
            </h5>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i>
              <strong>Achtung!</strong> Diese Aktion kann nicht rückgängig gemacht werden.
            </div>
            
            <p>
              Möchten Sie den Patienten 
              <strong>{{ patient.firstName }} {{ patient.lastName }}</strong> 
              wirklich löschen?
            </p>

            <div v-if="deletionInfo" class="deletion-info">
              <h6>Auswirkungen:</h6>
              <ul class="mb-0">
                <li v-if="deletionInfo.examinations > 0">
                  {{ deletionInfo.examinations }} Untersuchung(en) werden gelöscht
                </li>
                <li v-if="deletionInfo.findings > 0">
                  {{ deletionInfo.findings }} Befund(e) werden gelöscht
                </li>
                <li v-if="deletionInfo.videos > 0">
                  {{ deletionInfo.videos }} Video(s) werden entfernt
                </li>
                <li v-if="deletionInfo.reports > 0">
                  {{ deletionInfo.reports }} Bericht(e) werden entfernt
                </li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="showDeleteModal = false"
              :disabled="deleting"
            >
              Abbrechen
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="confirmDelete"
              :disabled="deleting"
            >
              <span v-if="deleting" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="fas fa-trash me-2"></i>
              {{ deleting ? 'Wird gelöscht...' : 'Endgültig löschen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { usePatientStore, type Patient, type Gender, type Center } from '@/stores/patientStore'
import { patientService, type PatientFormData } from '@/api/patientService'

// Props
interface Props {
  patient: Patient
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'patient-updated': [patient: Patient]
  'patient-deleted': [patientId: number]
  'cancel': []
}>()

// Composables
const patientStore = usePatientStore()

// Reactive state
const loading = ref(false)
const deleting = ref(false)
const showDeleteModal = ref(false)
const generalError = ref('')
const deletionInfo = ref<any>(null)

// Form data
const form = reactive<PatientFormData>({
  id: props.patient.id || null,
  firstName: props.patient.firstName || '',
  lastName: props.patient.lastName || '',
  dob: props.patient.dob ? props.patient.dob.split('T')[0] : null,
  gender: props.patient.gender || null,
  center: props.patient.center || null,
  email: props.patient.email || '',
  phone: props.patient.phone || '',
  patientHash: props.patient.patientHash || '',
  comments: '', // Not used in this form
  isRealPerson: props.patient.isRealPerson ?? true
})

// Validation errors
const errors = reactive({
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  center: '',
  email: '',
  phone: '',
  patientHash: ''
})

// Computed
const genders = computed(() => patientStore.genders)
const centers = computed(() => patientStore.centers)

const maxDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return form.firstName.trim() && form.lastName.trim() && !Object.values(errors).some(error => error)
})

// Methods
const validateForm = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })

  let isValid = true

  // Validate required fields
  if (!form.firstName.trim()) {
    errors.firstName = 'Vorname ist erforderlich'
    isValid = false
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Nachname ist erforderlich'
    isValid = false
  }

  // Validate email format
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Ungültige E-Mail-Adresse'
    isValid = false
  }

  // Validate date
  if (form.dob) {
    const birthDate = new Date(form.dob)
    const today = new Date()
    if (birthDate > today) {
      errors.dob = 'Geburtsdatum kann nicht in der Zukunft liegen'
      isValid = false
    }
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    loading.value = true
    generalError.value = ''

    const patientData = patientService.formatPatientData(form)
    const updatedPatient = await patientService.updatePatient(props.patient.id!, patientData)

    emit('patient-updated', updatedPatient)
  } catch (err: any) {
    console.error('Error updating patient:', err)
    
    if (err.response?.data) {
      // Handle validation errors from backend
      const backendErrors = err.response.data
      if (typeof backendErrors === 'object') {
        Object.keys(backendErrors).forEach(key => {
          if (key in errors) {
            errors[key as keyof typeof errors] = Array.isArray(backendErrors[key]) 
              ? backendErrors[key][0] 
              : backendErrors[key]
          }
        })
      }
      generalError.value = backendErrors.detail || backendErrors.message || 'Fehler beim Aktualisieren des Patienten'
    } else {
      generalError.value = err.message || 'Unbekannter Fehler beim Aktualisieren des Patienten'
    }
  } finally {
    loading.value = false
  }
}

const confirmDelete = async () => {
  try {
    deleting.value = true
    
    await patientService.deletePatient(props.patient.id!)
    
    emit('patient-deleted', props.patient.id!)
    showDeleteModal.value = false
    
  } catch (err: any) {
    console.error('Error deleting patient:', err)
    generalError.value = err.message || 'Fehler beim Löschen des Patienten'
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}

const loadDeletionInfo = async () => {
  try {
    // This would call the safety check endpoint to get deletion impact
    const response = await fetch(`/api/patients/${props.patient.id}/check_deletion_safety/`)
    if (response.ok) {
      const data = await response.json()
      deletionInfo.value = data.related_objects
    }
  } catch (error) {
    console.error('Error loading deletion info:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadDeletionInfo()
})
</script>

<style scoped>
.patient-edit-form {
  max-width: 800px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.section-title i {
  margin-right: 0.5rem;
  color: #3498db;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.form-label.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control,
.form-select {
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.form-control:focus,
.form-select:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

.form-control.is-invalid,
.form-select.is-invalid {
  border-color: #dc3545;
}

.invalid-feedback {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-check {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.form-check-input {
  margin-top: 0.25rem;
}

.form-check-label {
  flex: 1;
}

.form-text {
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 2px solid #e9ecef;
}

.action-group {
  display: flex;
  gap: 1rem;
}

.delete-section {
  display: flex;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3498db;
  border-color: #3498db;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  border-color: #2980b9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
}

.btn-outline-danger {
  color: #dc3545;
  border-color: #dc3545;
}

.btn-outline-danger:hover:not(:disabled) {
  background: #dc3545;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.alert-danger {
  background: #f8d7da;
  border: 1px solid #f5c2c7;
  color: #721c24;
}

.alert-warning {
  background: #fff3cd;
  border: 1px solid #ffecb5;
  color: #664d03;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-dialog {
  max-width: 500px;
  width: 90%;
  margin: 1rem;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.deletion-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.deletion-info h6 {
  margin-bottom: 0.5rem;
  color: #495057;
}

.deletion-info ul {
  color: #6c757d;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .action-group {
    order: 2;
    justify-content: center;
  }
  
  .delete-section {
    order: 1;
    justify-content: center;
  }
  
  .modal-dialog {
    margin: 0.5rem;
  }
}
</style>