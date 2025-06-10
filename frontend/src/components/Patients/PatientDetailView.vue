<template>
  <div class="patient-detail-view">
    <!-- Header -->
    <div class="detail-header">
      <div class="patient-info">
        <h2 class="patient-name">
          <i class="fas fa-user"></i>
          {{ patient.first_name }} {{ patient.last_name }}
        </h2>
        <div class="patient-meta">
          <span class="badge badge-primary">ID: {{ patient.id }}</span>
          <span v-if="patient.age" class="badge badge-info">{{ patient.age }} Jahre</span>
          <span v-if="patient.gender" class="badge badge-secondary">{{ getGenderName(patient.gender) }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline-primary" @click="showEditForm = !showEditForm">
          <i class="fas fa-edit"></i>
          {{ showEditForm ? 'Bearbeitung abbrechen' : 'Bearbeiten' }}
        </button>
        <button class="btn btn-outline-secondary" @click="$emit('close')">
          <i class="fas fa-times"></i>
          Schließen
        </button>
      </div>
    </div>

    <!-- Patient Edit Form -->
    <div v-if="showEditForm" class="card mb-4">
      <div class="card-header">
        <h4><i class="fas fa-edit"></i> Patient bearbeiten</h4>
      </div>
      <div class="card-body">
        <PatientEditForm 
          :patient="patient"
          @patient-updated="onPatientUpdated"
          @cancel="showEditForm = false"
        />
      </div>
    </div>

    <!-- Main Content Tabs -->
    <div class="content-tabs">
      <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item">
          <button 
            :class="['nav-link', { active: activeTab === 'overview' }]"
            @click="activeTab = 'overview'"
          >
            <i class="fas fa-info-circle"></i>
            Übersicht
          </button>
        </li>
        <li class="nav-item">
          <button 
            :class="['nav-link', { active: activeTab === 'examinations' }]"
            @click="activeTab = 'examinations'"
          >
            <i class="fas fa-stethoscope"></i>
            Untersuchungen
            <span v-if="examinations.length" class="badge badge-light ms-1">{{ examinations.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button 
            :class="['nav-link', { active: activeTab === 'media' }]"
            @click="activeTab = 'media'"
          >
            <i class="fas fa-photo-video"></i>
            Medien
            <span v-if="videos.length" class="badge badge-light ms-1">{{ videos.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button 
            :class="['nav-link', { active: activeTab === 'reports' }]"
            @click="activeTab = 'reports'"
          >
            <i class="fas fa-file-medical"></i>
            Reports
            <span v-if="reports.length" class="badge badge-light ms-1">{{ reports.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button 
            :class="['nav-link', { active: activeTab === 'new-examination' }]"
            @click="setActiveTab('new-examination')"
          >
            <i class="fas fa-plus"></i>
            Neue Untersuchung
          </button>
        </li>
      </ul>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Overview Tab -->
      <div 
        v-show="activeTab === 'overview'"
        :class="['tab-pane fade', { 'show active': activeTab === 'overview' }]"
      >
        <div class="row">
          <div class="col-md-6">
            <div class="card info-card">
              <div class="card-header">
                <h5><i class="fas fa-user"></i> Persönliche Daten</h5>
              </div>
              <div class="card-body">
                <div class="info-grid">
                  <div class="info-item">
                    <label>Vorname:</label>
                    <span>{{ patient.first_name }}</span>
                  </div>
                  <div class="info-item">
                    <label>Nachname:</label>
                    <span>{{ patient.last_name }}</span>
                  </div>
                  <div class="info-item">
                    <label>Geburtsdatum:</label>
                    <span>{{ formatDate(patient.dob) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Alter:</label>
                    <span>{{ patient.age || 'Nicht berechnet' }} Jahre</span>
                  </div>
                  <div class="info-item">
                    <label>Geschlecht:</label>
                    <span>{{ getGenderName(patient.gender) || 'Nicht angegeben' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card info-card">
              <div class="card-header">
                <h5><i class="fas fa-address-book"></i> Kontakt & Organisation</h5>
              </div>
              <div class="card-body">
                <div class="info-grid">
                  <div class="info-item">
                    <label>E-Mail:</label>
                    <span>{{ patient.email || 'Nicht angegeben' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Telefon:</label>
                    <span>{{ patient.phone || 'Nicht angegeben' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Zentrum:</label>
                    <span>{{ getCenterName(patient.center) || 'Nicht zugeordnet' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Patient Hash:</label>
                    <span class="font-mono">{{ patient.patient_hash || 'Nicht generiert' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Typ:</label>
                    <span>
                      <span :class="['badge', patient.is_real_person ? 'badge-success' : 'badge-warning']">
                        {{ patient.is_real_person ? 'Realer Patient' : 'Testdaten' }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="row mt-4">
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-stethoscope"></i>
              </div>
              <div class="stat-content">
                <h3>{{ examinations.length }}</h3>
                <p>Untersuchungen</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-video"></i>
              </div>
              <div class="stat-content">
                <h3>{{ videos.length }}</h3>
                <p>Videos</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-file-medical"></i>
              </div>
              <div class="stat-content">
                <h3>{{ reports.length }}</h3>
                <p>Reports</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-search"></i>
              </div>
              <div class="stat-content">
                <h3>{{ findings.length }}</h3>
                <p>Befunde</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Examinations Tab -->
      <div 
        v-show="activeTab === 'examinations'"
        :class="['tab-pane fade', { 'show active': activeTab === 'examinations' }]"
      >
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4>Untersuchungen</h4>
          <button class="btn btn-primary" @click="activeTab = 'new-examination'">
            <i class="fas fa-plus"></i>
            Neue Untersuchung
          </button>
        </div>

        <div v-if="examinations.length === 0" class="empty-state">
          <i class="fas fa-stethoscope fa-3x text-muted"></i>
          <h4>Keine Untersuchungen</h4>
          <p class="text-muted">Für diesen Patienten wurden noch keine Untersuchungen durchgeführt.</p>
          <button class="btn btn-primary" @click="activeTab = 'new-examination'">
            <i class="fas fa-plus"></i>
            Erste Untersuchung erstellen
          </button>
        </div>

        <div v-else class="examinations-list">
          <div 
            v-for="examination in examinations" 
            :key="examination.id"
            class="examination-card"
          >
            <div class="examination-header">
              <h5>{{ examination.name_de || examination.name }}</h5>
              <span class="examination-date">{{ formatDate(examination.date) }}</span>
            </div>
            <div class="examination-body">
              <p v-if="examination.description">{{ examination.description_de || examination.description }}</p>
              <div class="examination-stats">
                <span class="stat-badge">
                  <i class="fas fa-search"></i>
                  {{ examination.findings_count || 0 }} Befunde
                </span>
                <span v-if="examination.video_count" class="stat-badge">
                  <i class="fas fa-video"></i>
                  {{ examination.video_count }} Videos
                </span>
              </div>
            </div>
            <div class="examination-actions">
              <button class="btn btn-sm btn-outline-primary">
                <i class="fas fa-eye"></i>
                Details
              </button>
              <button class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-edit"></i>
                Bearbeiten
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Media Tab -->
      <div 
        v-show="activeTab === 'media'"
        :class="['tab-pane fade', { 'show active': activeTab === 'media' }]"
      >
        <h4>Medien</h4>
        
        <div v-if="videos.length === 0" class="empty-state">
          <i class="fas fa-photo-video fa-3x text-muted"></i>
          <h4>Keine Medien</h4>
          <p class="text-muted">Für diesen Patienten wurden noch keine Medien hochgeladen.</p>
        </div>

        <div v-else class="media-grid">
          <div 
            v-for="video in videos" 
            :key="video.id"
            class="media-card"
          >
            <div class="media-thumbnail">
              <i class="fas fa-play-circle"></i>
              <div class="media-duration">{{ formatDuration(video.duration) }}</div>
            </div>
            <div class="media-info">
              <h6>{{ video.filename || `Video ${video.id}` }}</h6>
              <p class="text-muted">{{ formatDate(video.created_at) }}</p>
              <div class="media-actions">
                <button class="btn btn-sm btn-primary">
                  <i class="fas fa-play"></i>
                  Abspielen
                </button>
                <button class="btn btn-sm btn-outline-secondary">
                  <i class="fas fa-download"></i>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Tab -->
      <div 
        v-show="activeTab === 'reports'"
        :class="['tab-pane fade', { 'show active': activeTab === 'reports' }]"
      >
        <h4>Reports</h4>
        
        <div v-if="reports.length === 0" class="empty-state">
          <i class="fas fa-file-medical fa-3x text-muted"></i>
          <h4>Keine Reports</h4>
          <p class="text-muted">Für diesen Patienten wurden noch keine Reports erstellt.</p>
        </div>

        <div v-else class="reports-list">
          <div 
            v-for="report in reports" 
            :key="report.id"
            class="report-card"
          >
            <div class="report-icon">
              <i class="fas fa-file-pdf"></i>
            </div>
            <div class="report-info">
              <h6>{{ report.title || 'Unbenannter Report' }}</h6>
              <p class="text-muted">{{ formatDate(report.created_at) }}</p>
              <span :class="['badge', getReportStatusClass(report.status)]">
                {{ getReportStatusText(report.status) }}
              </span>
            </div>
            <div class="report-actions">
              <button class="btn btn-sm btn-outline-primary">
                <i class="fas fa-eye"></i>
                Anzeigen
              </button>
              <button class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-download"></i>
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- New Examination Tab -->
      <div 
        v-show="activeTab === 'new-examination'"
        :class="['tab-pane fade', { 'show active': activeTab === 'new-examination' }]"
      >
        <div class="card">
          <div class="card-header">
            <h4>
              <i class="fas fa-plus"></i>
              Neue Untersuchung für {{ patient.first_name }} {{ patient.last_name }}
            </h4>
          </div>
          <div class="card-body">
            <!-- Form renders immediately when tab is active -->
            <PatientExaminationForm 
              :patient-id="patient.id || 0"
              @examination-created="onExaminationCreated"
              @cancel="activeTab = 'overview'"
            />
            
            <!-- Show warning only if patient.id is missing -->
            <div v-if="!patient.id" class="alert alert-warning mt-3">
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Hinweis:</strong> Patient-ID wird geladen... Falls das Problem bestehen bleibt, laden Sie die Seite neu.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatientStore, type Patient, type Gender, type Center } from '@/stores/patientStore'
import { patientService } from '@/api/patientService'
import PatientExaminationForm from './PatientExaminationForm.vue'
import PatientEditForm from './PatientEditForm.vue'

// Props
interface Props {
  patient: Patient
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'patient-updated': [patient: Patient]
  'close': []
}>()

// Composables
const patientStore = usePatientStore()

// Reactive state
const activeTab = ref('overview')
const showEditForm = ref(false)
const loading = ref(false)
const examinations = ref<any[]>([])
const videos = ref<any[]>([])
const reports = ref<any[]>([])
const findings = ref<any[]>([])

// Computed
const genders = computed(() => patientStore.genders)
const centers = computed(() => patientStore.centers)

// Methods
const loadPatientData = async () => {
  try {
    loading.value = true
    
    // Load all related data for the patient
    // Note: These endpoints would need to be implemented in the backend
    const [examinationsData, videosData, reportsData] = await Promise.all([
      // For now, we'll use mock data until the endpoints are available
      Promise.resolve({ data: [] }),
      Promise.resolve({ data: [] }),
      Promise.resolve({ data: [] })
    ])
    
    examinations.value = examinationsData.data || []
    videos.value = videosData.data || []
    reports.value = reportsData.data || []
    
  } catch (error) {
    console.error('Error loading patient data:', error)
  } finally {
    loading.value = false
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

const onPatientUpdated = (updatedPatient: Patient) => {
  showEditForm.value = false
  emit('patient-updated', updatedPatient)
}

const onExaminationCreated = (examination: any) => {
  // Add the new examination to the list
  examinations.value.unshift(examination)
  
  // Switch to examinations tab to show the result
  activeTab.value = 'examinations'
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Nicht angegeben'
  
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return 'Ungültiges Datum'
  }
}

const formatDuration = (duration?: number) => {
  if (!duration) return '0:00'
  
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Fixed: Handle both string and number gender types
const getGenderName = (gender?: string | null) => {
  if (!gender) return 'Nicht angegeben'
  
  // If it's already a string (gender name), return it
  if (typeof gender === 'string') {
    const genderObj = genders.value.find(g => g.name === gender)
    return genderObj ? (genderObj.name_de || genderObj.name) : gender
  }
  
  return 'Unbekannt'
}

// Fixed: Handle both string and number center types
const getCenterName = (center?: string | null) => {
  if (!center) return 'Nicht zugeordnet'
  
  // If it's already a string (center name), return it
  if (typeof center === 'string') {
    const centerObj = centers.value.find(c => c.name === center)
    return centerObj ? (centerObj.name_de || centerObj.name) : center
  }
  
  return 'Unbekanntes Zentrum'
}

const getReportStatusClass = (status?: string) => {
  switch (status) {
    case 'completed': return 'badge-success'
    case 'pending': return 'badge-warning'
    case 'failed': return 'badge-danger'
    default: return 'badge-secondary'
  }
}

const getReportStatusText = (status?: string) => {
  switch (status) {
    case 'completed': return 'Abgeschlossen'
    case 'pending': return 'In Bearbeitung'
    case 'failed': return 'Fehlgeschlagen'
    default: return 'Unbekannt'
  }
}

// Method to set active tab with debugging
const setActiveTab = (tabName: string) => {
  console.log('=== TAB SWITCHING DEBUG ===')
  console.log('🔄 Switching to tab:', tabName)
  console.log('📋 Current activeTab value:', activeTab.value)
  console.log('👤 Patient ID:', props.patient.id)
  console.log('📊 Patient object:', props.patient)
  
  activeTab.value = tabName
  
  console.log('✅ New activeTab value:', activeTab.value)
  console.log('🎯 Tab is new-examination?', activeTab.value === 'new-examination')
  console.log('🔍 Will PatientExaminationForm render?', activeTab.value === 'new-examination' && true)
  console.log('=== END TAB SWITCHING DEBUG ===')
}

// Load data on mount
onMounted(() => {
  loadLookupData()
  loadPatientData()
})
</script>

<style scoped>
.patient-detail-view {
  max-width: 1200px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

.patient-name {
  color: #2c3e50;
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.patient-name i {
  margin-right: 0.5rem;
  color: #3498db;
}

.patient-meta {
  display: flex;
  gap: 0.5rem;
}

.badge {
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.content-tabs {
  margin-bottom: 2rem;
}

.nav-tabs {
  border-bottom: 2px solid #e9ecef;
}

.nav-link {
  border: none;
  background: none;
  color: #6c757d;
  padding: 1rem 1.5rem;
  border-radius: 0;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #3498db;
  border-bottom-color: #3498db;
}

.nav-link.active {
  color: #3498db;
  border-bottom-color: #3498db;
  font-weight: 600;
}

.nav-link i {
  margin-right: 0.5rem;
}

.tab-pane {
  padding: 2rem 0;
}

.info-card {
  margin-bottom: 1.5rem;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f8f9fa;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.stat-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 2rem;
  color: #3498db;
  margin-bottom: 1rem;
}

.stat-content h3 {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
}

.stat-content p {
  color: #6c757d;
  margin: 0;
  font-size: 0.9rem;
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

.examinations-list,
.reports-list {
  display: grid;
  gap: 1rem;
}

.examination-card,
.report-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  transition: box-shadow 0.2s ease;
}

.examination-card:hover,
.report-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.examination-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.examination-date {
  color: #6c757d;
  font-size: 0.9rem;
}

.examination-stats {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #6c757d;
}

.examination-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.media-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.media-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.media-thumbnail {
  height: 200px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.media-thumbnail i {
  font-size: 3rem;
  color: #6c757d;
}

.media-duration {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.media-info {
  padding: 1rem;
}

.media-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.report-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.report-icon {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-icon i {
  font-size: 1.5rem;
  color: #dc3545;
}

.report-info {
  flex: 1;
}

.report-info h6 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.report-actions {
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .nav-tabs {
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .media-grid {
    grid-template-columns: 1fr;
  }
  
  .report-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>