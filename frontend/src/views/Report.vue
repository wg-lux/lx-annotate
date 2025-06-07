<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <!-- Header -->
        <div class="card mb-4">
          <div class="card-header pb-0">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <h4 class="mb-0">Report-Übersicht</h4>
                <p class="text-muted mb-0">Alle verfügbaren Reports anzeigen und verwalten</p>
              </div>
              <div class="btn-group">
                <button 
                  class="btn btn-outline-secondary btn-sm"
                  @click="refreshReports"
                  :disabled="loading"
                >
                  <i class="material-icons">refresh</i> Aktualisieren
                </button>
                <button 
                  class="btn btn-primary btn-sm"
                  @click="toggleFilters"
                >
                  <i class="material-icons">filter_list</i> Filter
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Section -->
        <div v-if="showFilters" class="card mb-4">
          <div class="card-header">
            <h6 class="mb-0">Filter & Suche</h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3">
                <label class="form-label">Status</label>
                <select v-model="filters.status" class="form-select form-select-sm">
                  <option value="">Alle Status</option>
                  <option value="pending">Ausstehend</option>
                  <option value="approved">Genehmigt</option>
                  <option value="rejected">Abgelehnt</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Dateityp</label>
                <select v-model="filters.file_type" class="form-select form-select-sm">
                  <option value="">Alle Typen</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Bild</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Patient</label>
                <input 
                  v-model="filters.patient_name" 
                  type="text" 
                  class="form-control form-control-sm"
                  placeholder="Name oder Fallnummer..."
                >
              </div>
              <div class="col-md-3">
                <label class="form-label">Aktionen</label>
                <div class="btn-group d-block">
                  <button 
                    class="btn btn-primary btn-sm me-2"
                    @click="applyFilters"
                    :disabled="loading"
                  >
                    Anwenden
                  </button>
                  <button 
                    class="btn btn-outline-secondary btn-sm"
                    @click="clearFilters"
                  >
                    Zurücksetzen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reports Table -->
        <div class="card">
          <div class="card-header">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                Reports 
                <span v-if="reportList.length > 0" class="badge bg-secondary ms-2">
                  {{ reportList.length }}{{ totalReports > reportList.length ? ` von ${totalReports}` : '' }}
                </span>
              </h6>
              <div class="d-flex align-items-center">
                <span class="text-muted me-3">{{ pageSize }} pro Seite</span>
                <div class="btn-group" v-if="totalPages > 1">
                  <button 
                    class="btn btn-outline-secondary btn-sm"
                    @click="previousPage"
                    :disabled="currentPage <= 1 || loading"
                  >
                    ‹
                  </button>
                  <span class="btn btn-outline-secondary btn-sm disabled">
                    {{ currentPage }} / {{ totalPages }}
                  </span>
                  <button 
                    class="btn btn-outline-secondary btn-sm"
                    @click="nextPage"
                    :disabled="currentPage >= totalPages || loading"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-body p-0">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Lade Reports...</span>
              </div>
              <p class="mt-2 text-muted">Reports werden geladen...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="alert alert-danger m-3" role="alert">
              <h6 class="alert-heading">
                <i class="material-icons">error</i> Fehler beim Laden
              </h6>
              <p class="mb-2">{{ error }}</p>
              <button 
                class="btn btn-outline-danger btn-sm"
                @click="retryLoad"
              >
                Erneut versuchen
              </button>
            </div>

            <!-- Empty State -->
            <div v-else-if="reportList.length === 0" class="text-center py-5">
              <i class="material-icons text-muted" style="font-size: 48px;">description</i>
              <h6 class="mt-3">Keine Reports gefunden</h6>
              <p class="text-muted">
                {{ hasActiveFilters ? 'Keine Reports entsprechen den aktuellen Filterkriterien.' : 'Es sind noch keine Reports verfügbar.' }}
              </p>
              <button v-if="hasActiveFilters" class="btn btn-outline-primary" @click="clearFilters">
                Filter zurücksetzen
              </button>
            </div>

            <!-- Reports Table -->
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="bg-light">
                  <tr>
                    <th scope="col" class="border-0">ID</th>
                    <th scope="col" class="border-0">Patient</th>
                    <th scope="col" class="border-0">Fallnummer</th>
                    <th scope="col" class="border-0">Status</th>
                    <th scope="col" class="border-0">Typ</th>
                    <th scope="col" class="border-0">Datum</th>
                    <th scope="col" class="border-0 text-end">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="report in reportList" :key="report.id" class="align-middle">
                    <td>
                      <span class="fw-bold text-primary">#{{ report.id }}</span>
                    </td>
                    <td>
                      <div class="d-flex flex-column">
                        <span class="fw-medium">
                          {{ formatPatientName(report.report_meta) }}
                        </span>
                        <small class="text-muted">
                          {{ formatDate(report.report_meta.patient_dob) }}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span class="badge bg-light text-dark">
                        {{ report.report_meta.casenumber || 'N/A' }}
                      </span>
                    </td>
                    <td>
                      <span 
                        :class="`badge bg-${getStatusColor(report.status)}`"
                      >
                        {{ getStatusLabel(report.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="d-flex align-items-center">
                        <i 
                          :class="`material-icons me-1 text-${getFileTypeColor(report.file_type)}`"
                          style="font-size: 18px;"
                        >
                          {{ getFileTypeIcon(report.file_type) }}
                        </i>
                        <span class="text-uppercase small">
                          {{ report.file_type || 'N/A' }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="d-flex flex-column">
                        <span class="small">{{ formatDateTime(report.updated_at) }}</span>
                        <small class="text-muted">
                          Erstellt: {{ formatDate(report.created_at) }}
                        </small>
                      </div>
                    </td>
                    <td class="text-end">
                      <div class="btn-group">
                        <router-link 
                          :to="{ name: 'ReportDetail', params: { id: report.id } }"
                          class="btn btn-outline-primary btn-sm"
                          :title="`Report ${report.id} anzeigen`"
                        >
                          <i class="material-icons" style="font-size: 16px;">visibility</i>
                          Anzeigen
                        </router-link>
                        <router-link 
                          :to="{ name: 'ReportDetail', params: { id: report.id } }"
                          class="btn btn-primary btn-sm"
                          :title="`Report ${report.id} bearbeiten`"
                        >
                          <i class="material-icons" style="font-size: 16px;">edit</i>
                          Bearbeiten
                        </router-link>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Debug Info (nur in Entwicklung) -->
        <div v-if="showDebugInfo && debugInfo.length > 0" class="card mt-4">
          <div class="card-header">
            <h6 class="mb-0">Debug-Informationen</h6>
          </div>
          <div class="card-body">
            <div class="list-group">
              <div 
                v-for="(info, index) in debugInfo" 
                :key="index"
                :class="`list-group-item ${info.success ? 'list-group-item-success' : 'list-group-item-warning'}`"
              >
                <strong>{{ info.source }}:</strong> {{ info.message }}
                <small v-if="info.details" class="d-block text-muted mt-1">
                  {{ info.details }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import reportListService, { type ReportListItem, type ReportListResponse } from '@/api/reportListService'

// Router
const router = useRouter()

// Reactive state
const loading = ref(false)
const error = ref('')
const reportList = ref<ReportListItem[]>([])
const totalReports = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = ref(20)
const showFilters = ref(false)
const showDebugInfo = ref(import.meta.env.DEV) // Nur in Entwicklung
const debugInfo = ref<Array<{ source: string; message: string; success: boolean; details?: string }>>([])

// Filters
const filters = reactive({
  status: '' as '' | 'pending' | 'approved' | 'rejected',
  file_type: '',
  patient_name: '',
  casenumber: '',
  date_from: '',
  date_to: ''
})

// Computed properties
const hasActiveFilters = computed(() => {
  return Object.values(filters).some(value => value !== '')
})

// Methods
async function loadReports(page: number = 1) {
  loading.value = true
  error.value = ''
  debugInfo.value = []

  try {
    let response: ReportListResponse

    // Versuche zuerst die neue API
    try {
      if (hasActiveFilters.value) {
        // Filtere leere Werte heraus und konvertiere Typen korrekt
        const cleanFilters: {
          status?: 'pending' | 'approved' | 'rejected'
          file_type?: string
          patient_name?: string
          casenumber?: string
          date_from?: string
          date_to?: string
          page?: number
          page_size?: number
        } = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== '') {
            if (key === 'status' && (value === 'pending' || value === 'approved' || value === 'rejected')) {
              acc.status = value
            } else if (key !== 'status') {
              acc[key as keyof typeof acc] = value as any
            }
          }
          return acc
        }, {} as any)

        cleanFilters.page = page
        cleanFilters.page_size = pageSize.value

        response = await reportListService.getFilteredReports(cleanFilters)
      } else {
        response = await reportListService.getReports(page, pageSize.value)
      }

      debugInfo.value.push({
        source: 'Neue API',
        message: `${response.results.length} Reports geladen`,
        success: true,
        details: `Seite ${page}, Total: ${response.count}`
      })

      reportList.value = response.results
      totalReports.value = response.count
      currentPage.value = page
      totalPages.value = Math.ceil(response.count / pageSize.value)

    } catch (apiError) {
      console.warn('Neue API nicht verfügbar, versuche Legacy-API:', apiError)
      
      debugInfo.value.push({
        source: 'Neue API',
        message: 'Nicht verfügbar',
        success: false,
        details: String(apiError)
      })

      // Fallback auf Legacy-API
      const legacyReports = await reportListService.getLegacyReports()
      
      debugInfo.value.push({
        source: 'Legacy API',
        message: `${legacyReports.length} Reports geladen`,
        success: true
      })

      // Simuliere Paginierung für Legacy-Daten
      const startIndex = (page - 1) * pageSize.value
      const endIndex = startIndex + pageSize.value
      
      reportList.value = legacyReports.slice(startIndex, endIndex)
      totalReports.value = legacyReports.length
      currentPage.value = page
      totalPages.value = Math.ceil(legacyReports.length / pageSize.value)
    }

  } catch (err: any) {
    console.error('Fehler beim Laden der Reports:', err)
    error.value = err.message || 'Unbekannter Fehler beim Laden der Reports'
    
    debugInfo.value.push({
      source: 'Fehler',
      message: error.value,
      success: false
    })
  } finally {
    loading.value = false
  }
}

async function refreshReports() {
  await loadReports(currentPage.value)
}

async function retryLoad() {
  await loadReports(1)
}

function toggleFilters() {
  showFilters.value = !showFilters.value
}

async function applyFilters() {
  currentPage.value = 1
  await loadReports(1)
}

function clearFilters() {
  Object.keys(filters).forEach(key => {
    // @ts-ignore
    filters[key] = ''
  })
  applyFilters()
}

async function nextPage() {
  if (currentPage.value < totalPages.value) {
    await loadReports(currentPage.value + 1)
  }
}

async function previousPage() {
  if (currentPage.value > 1) {
    await loadReports(currentPage.value - 1)
  }
}

// Utility functions
function formatPatientName(meta: ReportListItem['report_meta']): string {
  if (meta.patient_first_name || meta.patient_last_name) {
    return `${meta.patient_first_name || ''} ${meta.patient_last_name || ''}`.trim()
  }
  return 'Unbekannter Patient'
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return 'Ungültiges Datum'
  }
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'N/A'
  
  try {
    return new Date(dateString).toLocaleString('de-DE')
  } catch {
    return 'Ungültiges Datum'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    case 'pending': return 'warning'
    default: return 'secondary'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved': return 'Genehmigt'
    case 'rejected': return 'Abgelehnt'
    case 'pending': return 'Ausstehend'
    default: return 'Unbekannt'
  }
}

function getFileTypeIcon(fileType?: string): string {
  switch (fileType?.toLowerCase()) {
    case 'pdf': return 'picture_as_pdf'
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'image'
    case 'text':
    case 'txt': return 'description'
    default: return 'description'
  }
}

function getFileTypeColor(fileType?: string): string {
  switch (fileType?.toLowerCase()) {
    case 'pdf': return 'danger'
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'info'
    case 'text':
    case 'txt': return 'secondary'
    default: return 'secondary'
  }
}

// Lifecycle
onMounted(async () => {
  console.log('Report Overview mounted - lade Reports...')
  await loadReports(1)
})
</script>

<style scoped>
.card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: none;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.table th {
  font-weight: 600;
  color: #6c757d;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  vertical-align: middle;
  font-size: 0.875rem;
}

.btn-group .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.badge {
  font-size: 0.75rem;
}

.spinner-border {
  width: 2rem;
  height: 2rem;
}

@media (max-width: 768px) {
  .btn-group {
    flex-direction: column;
  }
  
  .btn-group .btn {
    margin-bottom: 0.25rem;
  }
  
  .table-responsive {
    font-size: 0.8rem;
  }
}
</style>
