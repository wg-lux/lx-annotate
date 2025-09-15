<template>
  <div class="patient-detail-view">
    <!-- Header with Actions -->
    <div class="detail-header">
      <div class="patient-header-info">
        <h2 class="patient-title">
          <i class="fas fa-user"></i>
          {{ patient.firstName }} {{ patient.lastName }}
        </h2>
        <span v-if="patient.isRealPerson" class="badge bg-success">
          <i class="fas fa-shield-alt"></i>
          Realer Patient
        </span>
        <span v-else class="badge bg-secondary">
          <i class="fas fa-user-secret"></i>
          Test-Patient
        </span>
      </div>
      
      <div class="detail-actions">
        <button 
          class="btn btn-secondary btn-sm"
          @click="$emit('close')"
          :disabled="loading"
        >
          <i class="fas fa-times"></i>
          Schließen
        </button>
        
        <button 
          class="btn btn-primary btn-sm"
          @click="showEditForm = true"
          :disabled="loading || showEditForm"
        >
          <i class="fas fa-edit"></i>
          Bearbeiten
        </button>
        
        <button 
          class="btn btn-outline-danger btn-sm"
          @click="checkDeletionSafety"
          :disabled="loading || showEditForm"
        >
          <i class="fas fa-trash"></i>
          Löschen
        </button>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="alert alert-danger">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
    </div>

    <div v-if="successMessage" class="alert alert-success">
      <i class="fas fa-check-circle"></i>
      {{ successMessage }}
    </div>

    <!-- Edit Form -->
    <div v-if="showEditForm" class="edit-section">
      <div class="card">
        <div class="card-header">
          <h4 class="card-title">
            <i class="fas fa-edit"></i>
            Patient bearbeiten
          </h4>
        </div>
        <div class="card-body">
          <PatientEditForm 
            :patient="patient"
            @patient-updated="onPatientUpdated"
            @patient-deleted="onPatientDeleted"
            @cancel="showEditForm = false"
          />
        </div>
      </div>
    </div>

    <!-- Patient Information Display -->
    <div v-else class="patient-info-display">
      <div class="row">
        <!-- Basic Information -->
        <div class="col-md-6">
          <div class="card info-card">
            <div class="card-header">
              <h5 class="card-title">
                <i class="fas fa-user"></i>
                Grunddaten
              </h5>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <label>Vorname:</label>
                  <span>{{ patient.firstName || 'Nicht angegeben' }}</span>
                </div>
                <div class="info-item">
                  <label>Nachname:</label>
                  <span>{{ patient.lastName || 'Nicht angegeben' }}</span>
                </div>
                <div class="info-item">
                  <label>Pseudonym:</label>
                  <span v-if="patient.pseudonymFirstName && patient.pseudonymLastName" class="pseudonym-names">
                    {{ patient.pseudonymFirstName }} {{ patient.pseudonymLastName }}
                    <button 
                      class="btn btn-outline-secondary btn-sm ms-2"
                      @click="regeneratePseudonym"
                      :disabled="generatingPseudonym"
                      title="Neue Pseudonamen generieren"
                    >
                      <span v-if="generatingPseudonym" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="fas fa-refresh"></i>
                      {{ generatingPseudonym ? 'Generiere...' : 'Neu' }}
                    </button>
                  </span>
                  <button 
                    v-else
                    class="btn btn-outline-primary btn-sm"
                    @click="generatePseudonym"
                    :disabled="generatingPseudonym"
                  >
                    <span v-if="generatingPseudonym" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="fas fa-user-secret"></i>
                    {{ generatingPseudonym ? 'Generiere...' : 'Pseudonym generieren' }}
                  </button>
                </div>
                <div class="info-item">
                  <label>Geburtsdatum:</label>
                  <span>
                    {{ formatDate(patient.dob) }}
                    <small v-if="patient.age" class="text-muted">({{ patient.age }} Jahre)</small>
                  </span>
                </div>
                <div class="info-item">
                  <label>Geschlecht:</label>
                  <span>{{ getGenderDisplay(patient.gender) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="col-md-6">
          <div class="card info-card">
            <div class="card-header">
              <h5 class="card-title">
                <i class="fas fa-address-book"></i>
                Kontaktdaten
              </h5>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <label>E-Mail:</label>
                  <span>
                    <a v-if="patient.email" :href="`mailto:${patient.email}`" class="link">
                      {{ patient.email }}
                    </a>
                    <span v-else class="text-muted">Nicht angegeben</span>
                  </span>
                </div>
                <div class="info-item">
                  <label>Telefon:</label>
                  <span>
                    <a v-if="patient.phone" :href="`tel:${patient.phone}`" class="link">
                      {{ patient.phone }}
                    </a>
                    <span v-else class="text-muted">Nicht angegeben</span>
                  </span>
                </div>
                <div class="info-item">
                  <label>Zentrum:</label>
                  <span>{{ getCenterDisplay(patient.center) }}</span>
                </div>
                <div class="info-item">
                  <label>Patient Hash:</label>
                  <div class="d-flex align-items-center gap-2">
                    <span class="font-mono">
                      {{ patient.patientHash ? (patient.patientHash.length >= 8 ? patient.patientHash.substring(0, 8) + '...' : patient.patientHash) : 'Nicht generiert' }}
                    </span>
                    <button 
                      class="btn btn-sm btn-outline-primary"
                      @click="generatePseudonym"
                      :disabled="generatingPseudonym"
                      title="Pseudonym-Hash generieren"
                    >
                      <span v-if="generatingPseudonym" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="fas fa-key me-1"></i>
                      {{ generatingPseudonym ? 'Generiere...' : (patient.patientHash ? 'Aktualisieren' : 'Generieren') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Information -->
      <div class="row mt-3">
        <div class="col-12">
          <div class="card info-card">
            <div class="card-header">
              <h5 class="card-title">
                <i class="fas fa-cog"></i>
                Systeminformationen
              </h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="info-item">
                    <label>Patient-ID:</label>
                    <span class="font-mono">{{ patient.id }}</span>
                  </div>
                  <div class="info-item">
                    <label>Datentyp:</label>
                    <span>
                      <span v-if="patient.isRealPerson" class="badge bg-success">
                        <i class="fas fa-shield-alt"></i>
                        Realer Patient
                      </span>
                      <span v-else class="badge bg-secondary">
                        <i class="fas fa-user-secret"></i>
                        Test-/Pseudo-Patient
                      </span>
                    </span>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="info-item">
                    <label>Erstellt am:</label>
                    <span>{{ formatDateTime(patient.createdAt) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Zuletzt geändert:</label>
                    <span>{{ formatDateTime(patient.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Deletion Safety Check Modal -->
    <div v-if="showDeletionModal" class="modal-overlay">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle text-warning"></i>
              Löschvorgang prüfen
            </h5>
          </div>
          <div class="modal-body">
            <div v-if="deletionCheck?.canDelete" class="alert alert-info">
              <i class="fas fa-info-circle"></i>
              <strong>Patient kann gelöscht werden.</strong>
              <p class="mb-0 mt-2">Sind Sie sicher, dass Sie diesen Patienten löschen möchten?</p>
            </div>
            
            <div v-else class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i>
              <strong>Patient kann nicht gelöscht werden.</strong>
              <ul class="mt-2 mb-0">
                <template>
                  <div class="patient-detail-view">
                    <!-- Header with Actions -->
                    <div class="detail-header">
                      <div class="patient-header-info">
                        <h2 class="patient-title">
                          <i class="fas fa-user"></i>
                          {{ patient.firstName }} {{ patient.lastName }}
                        </h2>
                        <span v-if="patient.isRealPerson" class="badge bg-success">
                          <i class="fas fa-shield-alt"></i>
                          Realer Patient
                        </span>
                        <span v-else class="badge bg-secondary">
                          <i class="fas fa-user-secret"></i>
                          Test-Patient
                        </span>
                      </div>
                      
                      <div class="detail-actions">
                        <button 
                          class="btn btn-secondary btn-sm"
                          @click="$emit('close')"
                          :disabled="loading"
                        >
                          <i class="fas fa-times"></i>
                          Schließen
                        </button>
                        
                        <button 
                          class="btn btn-primary btn-sm"
                          @click="showEditForm = true"
                          :disabled="loading || showEditForm"
                        >
                          <i class="fas fa-edit"></i>
                          Bearbeiten
                        </button>
                        
                        <button 
                          class="btn btn-outline-danger btn-sm"
                          @click="checkDeletionSafety"
                          :disabled="loading || showEditForm"
                        >
                          <i class="fas fa-trash"></i>
                          Löschen
                        </button>
                      </div>
                    </div>

                    <!-- Error/Success Messages -->
                    <div v-if="error" class="alert alert-danger">
                      <i class="fas fa-exclamation-triangle"></i>
                      {{ error }}
                    </div>

                    <div v-if="successMessage" class="alert alert-success">
                      <i class="fas fa-check-circle"></i>
                      {{ successMessage }}
                    </div>

                    <!-- Edit Form -->
                    <div v-if="showEditForm" class="edit-section">
                      <div class="card">
                        <div class="card-header">
                          <h4 class="card-title">
                            <i class="fas fa-edit"></i>
                            Patient bearbeiten
                          </h4>
                        </div>
                        <div class="card-body">
                          <PatientEditForm 
                            :patient="patient"
                            @patient-updated="onPatientUpdated"
                            @patient-deleted="onPatientDeleted"
                            @cancel="showEditForm = false"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Patient Information Display -->
                    <div v-else class="patient-info-display">
                      <div class="row">
                        <!-- Basic Information -->
                        <div class="col-md-6">
                          <div class="card info-card">
                            <div class="card-header">
                              <h5 class="card-title">
                                <i class="fas fa-user"></i>
                                Grunddaten
                              </h5>
                            </div>
                            <div class="card-body">
                              <div class="info-grid">
                                <div class="info-item">
                                  <label>Vorname:</label>
                                  <span>{{ patient.firstName || 'Nicht angegeben' }}</span>
                                </div>
                                <div class="info-item">
                                  <label>Nachname:</label>
                                  <span>{{ patient.lastName || 'Nicht angegeben' }}</span>
                                </div>
                                <div class="info-item">
                                  <label>Pseudonym:</label>
                                  <span v-if="patient.pseudonymFirstName && patient.pseudonymLastName" class="pseudonym-names">
                                    {{ patient.pseudonymFirstName }} {{ patient.pseudonymLastName }}
                                    <button 
                                      class="btn btn-outline-secondary btn-sm ms-2"
                                      @click="regeneratePseudonym"
                                      :disabled="generatingPseudonym"
                                      title="Neue Pseudonamen generieren"
                                    >
                                      <span v-if="generatingPseudonym" class="spinner-border spinner-border-sm me-1"></span>
                                      <i v-else class="fas fa-refresh"></i>
                                      {{ generatingPseudonym ? 'Generiere...' : 'Neu' }}
                                    </button>
                                  </span>
                                  <button 
                                    v-else
                                    class="btn btn-outline-primary btn-sm"
                                    @click="generatePseudonym"
                                    :disabled="generatingPseudonym"
                                  >
                                    <span v-if="generatingPseudonym" class="spinner-border spinner-border-sm me-1"></span>
                                    <i v-else class="fas fa-user-secret"></i>
                                    {{ generatingPseudonym ? 'Generiere...' : 'Pseudonym generieren' }}
                                  </button>
                                </div>
                                <div class="info-item">
                                  <label>Geburtsdatum:</label>
                                  <span>
                                    {{ formatDate(patient.dob) }}
                                    <small v-if="patient.age" class="text-muted">({{ patient.age }} Jahre)</small>
                                  </span>
                                </div>
                                <div class="info-item">
                                  <label>Geschlecht:</label>
                                  <span>{{ getGenderDisplay(patient.gender) }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Contact Information -->
                        <div class="col-md-6">
                          <div class="card info-card">
                            <div class="card-header">
                              <h5 class="card-title">
                                <i class="fas fa-address-book"></i>
                                Kontaktdaten
                              </h5>
                            </div>
                            <div class="card-body">
                              <div class="info-grid">
                                <div class="info-item">
                                  <label>E-Mail:</label>
                                  <span>
                                    <a v-if="patient.email" :href="`mailto:${patient.email}`" class="link">
                                      {{ patient.email }}
                                    </a>
                                    <span v-else class="text-muted">Nicht angegeben</span>
                                  </span>
                                </div>
                                <div class="info-item">
                                  <label>Telefon:</label>
                                  <span>
                                    <a v-if="patient.phone" :href="`tel:${patient.phone}`" class="link">
                                      {{ patient.phone }}
                                    </a>
                                    <span v-else class="text-muted">Nicht angegeben</span>
                                  </span>
                                </div>
                                <div class="info-item">
                                  <label>Zentrum:</label>
                                  <span>{{ getCenterDisplay(patient.center) }}</span>
                                </div>
                                <div class="info-item">
                                  <label>Patient Hash:</label>
                                  <span class="font-mono">
                                    {{ patient.patientHash ? (patient.patientHash.length >= 8 ? patient.patientHash.substring(0, 8) + '...' : patient.patientHash) : 'Nicht generiert' }}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- System Information -->
                      <div class="row mt-3">
                        <div class="col-12">
                          <div class="card info-card">
                            <div class="card-header">
                              <h5 class="card-title">
                                <i class="fas fa-cog"></i>
                                Systeminformationen
                              </h5>
                            </div>
                            <div class="card-body">
                              <div class="row">
                                <div class="col-md-6">
                                  <div class="info-item">
                                    <label>Patient-ID:</label>
                                    <span class="font-mono">{{ patient.id }}</span>
                                  </div>
                                  <div class="info-item">
                                    <label>Datentyp:</label>
                                    <span>
                                      <span v-if="patient.isRealPerson" class="badge bg-success">
                                        <i class="fas fa-shield-alt"></i>
                                        Realer Patient
                                      </span>
                                      <span v-else class="badge bg-secondary">
                                        <i class="fas fa-user-secret"></i>
                                        Test-/Pseudo-Patient
                                      </span>
                                    </span>
                                  </div>
                                </div>
                                <div class="col-md-6">
                                  <div class="info-item">
                                    <label>Erstellt am:</label>
                                    <span>{{ formatDateTime(patient.createdAt) }}</span>
                                  </div>
                                  <div class="info-item">
                                    <label>Zuletzt geändert:</label>
                                    <span>{{ formatDateTime(patient.updatedAt) }}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Deletion Safety Check Modal -->
                    <div v-if="showDeletionModal" class="modal-overlay">
                      <div class="modal-dialog">
                        <div class="modal-content">
                          <div class="modal-header">
                            <h5 class="modal-title">
                              <i class="fas fa-exclamation-triangle text-warning"></i>
                              Löschvorgang prüfen
                            </h5>
                          </div>
                          <div class="modal-body">
                            <div v-if="deletionCheck?.canDelete" class="alert alert-info">
                              <i class="fas fa-info-circle"></i>
                              <strong>Patient kann gelöscht werden.</strong>
                              <p class="mb-0 mt-2">Sind Sie sicher, dass Sie diesen Patienten löschen möchten?</p>
                            </div>
                            
                            <div v-else class="alert alert-warning">
                              <i class="fas fa-exclamation-triangle"></i>
                              <strong>Patient kann nicht gelöscht werden.</strong>
                              <ul class="mt-2 mb-0">
                                <li v-for="warning in deletionCheck?.warnings?.filter((w: string) => w)" :key="warning">
                                  {{ warning }}
                                </li>
                              </ul>
                            </div>

                            <div v-if="deletionCheck?.relatedObjects" class="mt-3">
                              <h6>Verknüpfte Objekte:</h6>
                              <div class="related-objects">
                                <div class="object-count">
                                  <i class="fas fa-stethoscope"></i>
                                  {{ deletionCheck.relatedObjects.examinations }} Untersuchung(en)
                                </div>
                                <div class="object-count">
                                  <i class="fas fa-search"></i>
                                  {{ deletionCheck.relatedObjects.findings }} Befund(e)
                                </div>
                                <div class="object-count">
                                  <i class="fas fa-video"></i>
                                  {{ deletionCheck.relatedObjects.videos }} Video(s)
                                </div>
                                <div class="object-count">
                                  <i class="fas fa-file-pdf"></i>
                                  {{ deletionCheck.relatedObjects.reports }} Bericht(e)
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="modal-footer">
                            <button 
                              type="button" 
                              class="btn btn-secondary"
                              @click="closeDeletionModal"
                              :disabled="deleting"
                            >
                              Abbrechen
                            </button>
                            <button 
                              v-if="deletionCheck?.canDelete"
                              type="button" 
                              class="btn btn-danger"
                              @click="confirmDeletion"
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
                import { ref, computed } from 'vue'
                import { usePatientStore, type Patient, type Gender, type Center } from '@/stores/patientStore'
                import { patientService } from '@/api/patientService'
                import PatientEditForm from './PatientEditForm.vue'
                import camelcaseKeys from 'camelcase-keys'

                // Interfaces
                interface RelatedObjects {
                  examinations: number
                  findings: number
                  videos: number
                  reports: number
                }

                interface DeletionCheck {
                  canDelete: boolean
                  warnings: string[]
                  relatedObjects: RelatedObjects
                }

                // Props
                interface Props {
                  patient: Patient
                }

                const props = defineProps<Props>()

                // Emits
                const emit = defineEmits<{
                  'patient-updated': [patient: Patient]
                  'patient-deleted': [patientId: number]
                  'close': []
                }>()

                // Composables
                const patientStore = usePatientStore()

                // Reactive state
                const loading = ref<boolean>(false)
                const error = ref<string>('')
                const successMessage = ref<string>('')
                const showEditForm = ref<boolean>(false)
                const showDeletionModal = ref<boolean>(false)
                const deleting = ref<boolean>(false)
                const deletionCheck = ref<DeletionCheck | null>(null)
                const generatingPseudonym = ref<boolean>(false)

                // Computed
                const genders = computed<Gender[]>(() => patientStore.genders)
                const centers = computed<Center[]>(() => patientStore.centers)

                // Methods
                const checkDeletionSafety = async (): Promise<void> => {
                  try {
                    loading.value = true
                    error.value = ''
                    
                    // Call the backend safety check endpoint
                    const response = await fetch(`/api/patients/${props.patient.id}/check_deletion_safety/`)
                    if (!response.ok) {
                      throw new Error('Fehler beim Prüfen der Löschbarkeit')
                    }
                    
                    deletionCheck.value = await response.json()
                    showDeletionModal.value = true
                    
                  } catch (err: any) {
                    error.value = err.message || 'Fehler beim Prüfen der Löschbarkeit'
                  } finally {
                    loading.value = false
                  }
                }

                const confirmDeletion = async (): Promise<void> => {
                  try {
                    deleting.value = true
                    
                    await patientService.deletePatient(props.patient.id!)
                    
                    successMessage.value = `Patient "${props.patient.firstName} ${props.patient.lastName}" wurde erfolgreich gelöscht.`
                    
                    emit('patient-deleted', props.patient.id!)
                    closeDeletionModal()
                    
                  } catch (err: any) {
                    error.value = err.message || 'Fehler beim Löschen des Patienten'
                  } finally {
                    deleting.value = false
                  }
                }

                const closeDeletionModal = (): void => {
                  showDeletionModal.value = false
                  deletionCheck.value = null
                }

                const onPatientUpdated = (updatedPatient: Patient): void => {
                  showEditForm.value = false
                  successMessage.value = `Patient wurde erfolgreich aktualisiert.`
                  emit('patient-updated', updatedPatient)
                  
                  // Clear success message after 5 seconds
                  setTimeout(() => {
                    successMessage.value = ''
                  }, 5000)
                }

                const onPatientDeleted = (patientId: number): void => {
                  showEditForm.value = false
                  emit('patient-deleted', patientId)
                }

                const formatDate = (dateString?: string | null): string => {
                  if (!dateString) return 'Nicht angegeben'
                  
                  try {
                    const date = new Date(dateString)
                    return date.toLocaleDateString('de-DE')
                  } catch {
                    return 'Ungültig'
                  }
                }

                const formatDateTime = (dateString?: string | null): string => {
                  if (!dateString) return 'Nicht angegeben'
                  
                  try {
                    const date = new Date(dateString)
                    return date.toLocaleString('de-DE')
                  } catch {
                    return 'Ungültig'
                  }
                }

                const getGenderDisplay = (genderValue?: string | null): string => {
                  if (!genderValue) return 'Nicht angegeben'
                  const gender = genders.value.find((g: Gender) => g.name === genderValue)
                  return gender?.nameDe || gender?.name || genderValue
                }

                const getCenterDisplay = (centerValue?: string | null): string => {
                  if (!centerValue) return 'Nicht zugeordnet'
                  const center = centers.value.find((c: Center) => c.name === centerValue)
                  return center?.nameDe || center?.name || centerValue
                }

                // Pseudonamen-Funktionalität
                const generatePseudonym = async (): Promise<void> => {
                  try {
                    generatingPseudonym.value = true
                    error.value = ''
                    
                    const response = await fetch(`/api/patients/${props.patient.id}/pseudonym/`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      }
                    })
                    
                    if (!response.ok) {
                      const errorData = await response.json()
                      let errorMessage = 'Fehler beim Generieren des Pseudonym-Hashes'
                      
                      if (errorData.missingFields?.length) {
                        errorMessage += `: Fehlende Felder: ${errorData.missingFields.join(', ')}`
                      } else if (errorData.detail) {
                        errorMessage += `: ${errorData.detail}`
                      }
                      
                      throw new Error(errorMessage)
                    }
                    
                    const data = await response.json()
                    
                    // Update patient data with new hash
                    const updatedPatient = {
                      ...props.patient,
                      patientHash: data.patientHash
                    }
                    
                    emit('patient-updated', updatedPatient)
                    successMessage.value = `Pseudonym-Hash erfolgreich generiert: ${data.patientHash.substring(0, 8)}...`

                    setTimeout(() => {
                      successMessage.value = ''
                    }, 3000)
                    
                  } catch (err: any) {
                    error.value = err.message || 'Fehler beim Generieren der Pseudonamen'
                  } finally {
                    generatingPseudonym.value = false
                  }
                }

                const regeneratePseudonym = async (): Promise<void> => {
                  try {
                    generatingPseudonym.value = true
                    error.value = ''
                    
                    // For regeneration, we call the same endpoint since it will return existing hash if already generated
                    // To force regeneration, we could add a query parameter, but for now just call the same endpoint
                    const response = await fetch(`/api/patients/${props.patient.id}/pseudonym/`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      }
                    })
                    
                    if (!response.ok) {
                      const errorData = await response.json()
                      let errorMessage = 'Fehler beim Regenerieren des Pseudonym-Hashes'
                      
                      if (errorData.missingFields?.length) {
                        errorMessage += `: Fehlende Felder: ${errorData.missingFields.join(', ')}`
                      } else if (errorData.detail) {
                        errorMessage += `: ${errorData.detail}`
                      }
                      
                      throw new Error(errorMessage)
                    }
                    
                    const data = await response.json()
                    
                    // Update patient data with hash
                    const updatedPatient = {
                      ...props.patient,
                      patientHash: data.patientHash
                    }
                    
                    emit('patient-updated', updatedPatient)
                    successMessage.value = `Pseudonym-Hash aktualisiert: ${data.patientHash.substring(0, 8)}...`

                    setTimeout(() => {
                      successMessage.value = ''
                    }, 3000)
                    
                  } catch (err: any) {
                    error.value = err.message || 'Fehler beim Regenerieren der Pseudonamen'
                  } finally {
                    generatingPseudonym.value = false
                  }
                }
                </script>

                <style scoped>
                .patient-detail-view {
                  max-width: 1000px;
                }

                .detail-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 2rem;
                  padding-bottom: 1rem;
                  border-bottom: 2px solid #e9ecef;
                }

                .patient-header-info {
                  display: flex;
                  align-items: center;
                  gap: 1rem;
                }

                .patient-title {
                  color: #2c3e50;
                  font-size: 1.5rem;
                  font-weight: 600;
                  margin: 0;
                }

                .patient-title i {
                  margin-right: 0.5rem;
                  color: #3498db;
                }

                .detail-actions {
                  display: flex;
                  gap: 0.5rem;
                }

                .edit-section {
                  margin-bottom: 2rem;
                }

                .info-card {
                  margin-bottom: 1.5rem;
                }

                .card-title {
                  color: #2c3e50;
                  font-size: 1.1rem;
                  font-weight: 600;
                  margin: 0;
                }

                .card-title i {
                  margin-right: 0.5rem;
                  color: #3498db;
                }

                .info-grid {
                  display: grid;
                  gap: 1rem;
                }

                .info-item {
                  display: flex;
                  flex-direction: column;
                  gap: 0.25rem;
                }

                .info-item label {
                  font-weight: 600;
                  color: #495057;
                  font-size: 0.9rem;
                }

                .info-item span {
                  color: #2c3e50;
                }

                .font-mono {
                  font-family: 'Courier New', monospace;
                  font-size: 0.9rem;
                }

                .link {
                  color: #3498db;
                  text-decoration: none;
                }

                .link:hover {
                  text-decoration: underline;
                }

                .badge {
                  font-size: 0.8rem;
                  padding: 0.5rem 0.75rem;
                }

                .badge i {
                  margin-right: 0.25rem;
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
                  max-width: 600px;
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

                .related-objects {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                  gap: 0.5rem;
                }

                .object-count {
                  padding: 0.5rem;
                  background: #f8f9fa;
                  border-radius: 4px;
                  font-size: 0.9rem;
                  text-align: center;
                }

                .object-count i {
                  margin-right: 0.5rem;
                  color: #6c757d;
                }

                .alert {
                  border-radius: 6px;
                  margin-bottom: 1rem;
                }

                .btn {
                  border-radius: 6px;
                  font-weight: 500;
                  transition: all 0.2s ease;
                }

                .btn-sm {
                  padding: 0.5rem 1rem;
                  font-size: 0.875rem;
                }

                @media (max-width: 768px) {
                  .detail-header {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                  }
                  
                  .patient-header-info {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                  }
                  
                  .detail-actions {
                    justify-content: center;
                  }
                  
                  .modal-dialog {
                    margin: 0.5rem;
                  }
                }
                </style>
              </ul>
            </div>

            <div v-if="deletionCheck?.relatedObjects" class="mt-3">
              <h6>Verknüpfte Objekte:</h6>
              <div class="related-objects">
                <div class="object-count">
                  <i class="fas fa-stethoscope"></i>
                  {{ deletionCheck.relatedObjects.examinations }} Untersuchung(en)
                </div>
                <div class="object-count">
                  <i class="fas fa-search"></i>
                  {{ deletionCheck.relatedObjects.findings }} Befund(e)
                </div>
                <div class="object-count">
                  <i class="fas fa-video"></i>
                  {{ deletionCheck.relatedObjects.videos }} Video(s)
                </div>
                <div class="object-count">
                  <i class="fas fa-file-pdf"></i>
                  {{ deletionCheck.relatedObjects.reports }} Bericht(e)
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary"
              @click="closeDeletionModal"
              :disabled="deleting"
            >
              Abbrechen
            </button>
            <button 
              v-if="deletionCheck?.canDelete"
              type="button" 
              class="btn btn-danger"
              @click="confirmDeletion"
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
import { ref, computed } from 'vue'
import { usePatientStore, type Patient, type Gender, type Center } from '@/stores/patientStore'
import { patientService, generatePatientPseudonym } from '@/api/patientService'
import PatientEditForm from './PatientEditForm.vue'
import axiosInstance from '@/api/axiosInstance'

// Props
interface Props {
  patient: Patient
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'patient-updated': [patient: Patient]
  'patient-deleted': [patientId: number]
  'close': []
}>()

// Composables
const patientStore = usePatientStore()

// Reactive state
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const showEditForm = ref(false)
const showDeletionModal = ref(false)
const deleting = ref(false)
const deletionCheck = ref<any>(null)
const generatingPseudonym = ref<boolean>(false)

// Computed
const genders = computed(() => patientStore.genders)
const centers = computed(() => patientStore.centers)


// Methods
const checkDeletionSafety = async () => {
  try {
    loading.value = true
    error.value = ''

    const currentPatient = patientStore.getCurrentPatient()

    if (!currentPatient || !currentPatient.id) {
      throw new Error('Aktueller Patient nicht gefunden')
    }
    const patientId = patientStore.resolveCurrentPatientId(currentPatient.id, true)!
    
    // Use axiosInstance instead of fetch
    const response = await axiosInstance.get(`/api/patients/${patientId}/check_deletion_safety/`)
    
    deletionCheck.value = response.data
    showDeletionModal.value = true
    
  } catch (err: any) {
    error.value = err.response?.data?.detail || err.message || 'Fehler beim Prüfen der Löschbarkeit'
  } finally {
    loading.value = false
  }
}

const confirmDeletion = async () => {
  try {
    deleting.value = true
    
    await patientService.deletePatient(props.patient.id!)
    
    successMessage.value = `Patient "${props.patient.firstName} ${props.patient.lastName}" wurde erfolgreich gelöscht.`
    
    emit('patient-deleted', props.patient.id!)
    closeDeletionModal()
    
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Löschen des Patienten'
  } finally {
    deleting.value = false
  }
}

const closeDeletionModal = () => {
  showDeletionModal.value = false
  deletionCheck.value = null
}

const onPatientUpdated = (updatedPatient: Patient) => {
  showEditForm.value = false
  successMessage.value = `Patient wurde erfolgreich aktualisiert.`
  emit('patient-updated', updatedPatient)
  
  // Clear success message after 5 seconds
  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
}

const onPatientDeleted = (patientId: number) => {
  showEditForm.value = false
  emit('patient-deleted', patientId)
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

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return 'Nicht angegeben'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleString('de-DE')
  } catch {
    return 'Ungültig'
  }
}

const getGenderDisplay = (genderValue?: string | null) => {
  if (!genderValue) return 'Nicht angegeben'
  const gender = genders.value.find(g => g.name === genderValue)
  return gender?.nameDe || gender?.name || genderValue
}

const getCenterDisplay = (centerValue?: string | null) => {
  if (!centerValue) return 'Nicht zugeordnet'
  const center = centers.value.find(c => c.name === centerValue)
  return center?.nameDe || center?.name || centerValue
}

const applyPatientHashUpdate = (hash: string) => {
  const updated = { ...props.patient, patientHash: hash }
  emit('patient-updated', updated)
}

// Pseudonym generation with robust patient ID resolution
const generatePseudonym = async (): Promise<void> => {
  try {
    generatingPseudonym.value = true
    error.value = ''
    
    const id = patientStore.resolveCurrentPatientId(props.patient?.id, true)!
    const data = await generatePatientPseudonym(id)

    // Map snake_case → camelCase locally
    applyPatientHashUpdate(data.patientHash)

    // Safe UI text (guard substring)
    const short = (data.patientHash && data.patientHash.length >= 8)
      ? data.patientHash.substring(0, 8) + '...'
      : data.patientHash || '—'

    successMessage.value = `Pseudonym-Hash erfolgreich generiert: ${short}`

    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (e: any) {
    const detail = e?.response?.data?.detail || e?.message || 'Unbekannter Fehler'
    const missing = e?.response?.data?.missingFields
    error.value = missing?.length
      ? `Fehlende Felder: ${missing.join(', ')}`
      : `Fehler beim Generieren des Pseudonym-Hashes: ${detail}`
  } finally {
    generatingPseudonym.value = false
  }
}

const regeneratePseudonym = async (): Promise<void> => {
  // same endpoint; backend is idempotent/deterministic
  await generatePseudonym()
}
</script>

<style scoped>
.patient-detail-view {
  max-width: 1000px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

.patient-header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.patient-title {
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.patient-title i {
  margin-right: 0.5rem;
  color: #3498db;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-section {
  margin-bottom: 2rem;
}

.info-card {
  margin-bottom: 1.5rem;
}

.card-title {
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.card-title i {
  margin-right: 0.5rem;
  color: #3498db;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.info-item span {
  color: #2c3e50;
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.link {
  color: #3498db;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.badge {
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
}

.badge i {
  margin-right: 0.25rem;
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
  max-width: 600px;
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

.related-objects {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.object-count {
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
}

.object-count i {
  margin-right: 0.5rem;
  color: #6c757d;
}

.alert {
  border-radius: 6px;
  margin-bottom: 1rem;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .patient-header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .detail-actions {
    justify-content: center;
  }
  
  .modal-dialog {
    margin: 0.5rem;
  }
}
</style>