<template>
  <div class="universal-report-viewer">
    <!-- Header mit Status-Informationen -->
    <div class="viewer-header">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Report Viewer</h5>
        <div class="viewer-status">
          <span 
            v-if="isUrlAvailable" 
            class="badge bg-success"
            :title="`URL gültig bis: ${urlExpiresAt?.toLocaleString()}`"
          >
            Aktiv ({{ formatTimeUntilExpiry() }})
          </span>
          <span v-else-if="isUrlExpired" class="badge bg-warning">
            URL abgelaufen
          </span>
          <span v-else class="badge bg-secondary">
            Keine URL
          </span>
        </div>
      </div>
      
      <!-- Aktions-Buttons -->
      <div class="viewer-actions mb-3">
        <button 
          class="btn btn-primary btn-sm me-2"
          @click="handleRefreshUrl"
          :disabled="loading || !reportId"
        >
          <i class="bi bi-arrow-clockwise"></i>
          URL erneuern
        </button>
        
        <button 
          class="btn btn-outline-secondary btn-sm me-2"
          @click="handleValidateUrl"
          :disabled="loading || !secureUrl"
        >
          <i class="bi bi-check-circle"></i>
          URL prüfen
        </button>
        
        <button 
          v-if="secureUrl && !isUrlExpired"
          class="btn btn-outline-info btn-sm"
          @click="openInNewTab"
        >
          <i class="bi bi-box-arrow-up-right"></i>
          In neuem Tab öffnen
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Lade...</span>
      </div>
      <p class="mt-2">Lade Report-Daten...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <h6 class="alert-heading">
        <i class="bi bi-exclamation-triangle"></i>
        Fehler beim Laden
      </h6>
      <p class="mb-0">{{ error }}</p>
      <hr>
      <button 
        class="btn btn-outline-danger btn-sm"
        @click="handleRetry"
      >
        Erneut versuchen
      </button>
    </div>

    <!-- File Viewer -->
    <div v-else-if="isUrlAvailable" class="file-viewer">
      <!-- PDF Viewer -->
      <div v-if="fileType === 'pdf'" class="pdf-viewer">
        <iframe
          :src="secureUrl + '#toolbar=1&navpanes=0&scrollbar=1'"
          width="100%"
          :height="viewerHeight"
          frameborder="0"
          class="pdf-frame"
          @load="onFrameLoad"
          @error="onFrameError"
        >
          <p>
            Ihr Browser unterstützt keine eingebetteten PDFs. 
            <a :href="secureUrl" target="_blank" rel="noopener noreferrer">
              Datei in neuem Tab öffnen
            </a>
          </p>
        </iframe>
      </div>

      <!-- Image Viewer -->
      <div v-else-if="isImageFile" class="image-viewer text-center">
        <img 
          :src="secureUrl"
          :alt="currentReport?.report_meta?.casenumber || 'Report Image'"
          class="img-fluid"
          style="max-height: 80vh;"
          @load="onImageLoad"
          @error="onImageError"
        />
      </div>

      <!-- Generic File Download -->
      <div v-else class="file-download text-center py-4">
        <div class="mb-3">
          <i class="bi bi-file-earmark-text display-1 text-muted"></i>
        </div>
        <h6>Datei verfügbar</h6>
        <p class="text-muted">
          {{ currentReport?.secure_file_url?.original_filename || 'Unbekannte Datei' }}
          <span v-if="currentReport?.secure_file_url?.file_size">
            ({{ formatFileSize(currentReport.secure_file_url.file_size) }})
          </span>
        </p>
        <a 
          :href="secureUrl"
          class="btn btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i class="bi bi-download"></i>
          Datei herunterladen
        </a>
      </div>
    </div>

    <!-- No File State -->
    <div v-else class="no-file-state text-center py-5">
      <i class="bi bi-file-earmark-x display-1 text-muted"></i>
      <h6 class="mt-3">Keine Datei verfügbar</h6>
      <p class="text-muted">
        {{ reportId ? 'Für diesen Report ist keine Datei hinterlegt.' : 'Bitte wählen Sie einen Report aus.' }}
      </p>
    </div>

    <!-- Report Meta Information (Optional) -->
    <div v-if="showMetaInfo && currentReport" class="report-meta mt-3">
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">Report-Informationen</h6>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <small class="text-muted">Patient:</small>
              <p class="mb-2">
                {{ currentReport.report_meta.patient_first_name }} 
                {{ currentReport.report_meta.patient_last_name }}
              </p>
            </div>
            <div class="col-md-6">
              <small class="text-muted">Fall-Nr.:</small>
              <p class="mb-2">{{ currentReport.report_meta.casenumber || 'N/A' }}</p>
            </div>
            <div class="col-md-6">
              <small class="text-muted">Untersuchungsdatum:</small>
              <p class="mb-2">
                {{ formatDate(currentReport.report_meta.examination_date) }}
              </p>
            </div>
            <div class="col-md-6">
              <small class="text-muted">Status:</small>
              <span 
                :class="`badge bg-${getStatusColor(currentReport.status)}`"
              >
                {{ getStatusLabel(currentReport.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useFileUrl } from '@/composables/useFileUrl'
import type { ReportData } from '@/types/report'

// Props
interface Props {
  reportId?: number
  fileType?: string
  viewerHeight?: string
  showMetaInfo?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // in minutes
}

const props = withDefaults(defineProps<Props>(), {
  fileType: 'pdf',
  viewerHeight: '600px',
  showMetaInfo: false,
  autoRefresh: true,
  refreshInterval: 30
})

// Emits
const emit = defineEmits<{
  reportLoaded: [report: ReportData]
  urlExpired: []
  error: [error: string]
}>()

// File URL Composable
const {
  loading,
  error,
  currentReport,
  secureUrl,
  urlExpiresAt,
  isUrlExpired,
  timeUntilExpiry,
  isUrlAvailable,
  loadReportWithSecureUrl,
  generateSecureUrl,
  validateCurrentUrl,
  refreshUrl,
  clearCurrentUrl,
  formatTimeUntilExpiry
} = useFileUrl()

// Local reactive state
const autoRefreshTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Computed properties
const isImageFile = computed(() => {
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(props.fileType.toLowerCase())
})

// Watchers
watch(() => props.reportId, async (newReportId, oldReportId) => {
  if (newReportId && newReportId !== oldReportId) {
    await loadReport(newReportId)
  } else if (!newReportId) {
    clearCurrentUrl()
  }
}, { immediate: true })

watch(isUrlExpired, (expired) => {
  if (expired) {
    emit('urlExpired')
  }
})

watch(currentReport, (report) => {
  if (report) {
    emit('reportLoaded', report)
  }
})

watch(error, (errorMsg) => {
  if (errorMsg) {
    emit('error', errorMsg)
  }
})

// Auto-refresh setup
watch(() => props.autoRefresh, (enabled) => {
  if (enabled) {
    setupAutoRefresh()
  } else {
    clearAutoRefresh()
  }
})

// Methods
async function loadReport(reportId: number) {
  try {
    await loadReportWithSecureUrl(reportId)
    if (props.autoRefresh) {
      setupAutoRefresh()
    }
  } catch (err) {
    console.error('Fehler beim Laden des Reports:', err)
  }
}

async function handleRefreshUrl() {
  if (!props.reportId) return
  
  try {
    await refreshUrl(props.reportId, props.fileType)
  } catch (err) {
    console.error('Fehler beim Erneuern der URL:', err)
  }
}

async function handleValidateUrl() {
  const isValid = await validateCurrentUrl()
  if (!isValid) {
    console.warn('URL ist nicht mehr gültig')
  }
}

async function handleRetry() {
  if (props.reportId) {
    await loadReport(props.reportId)
  }
}

function openInNewTab() {
  if (secureUrl.value) {
    window.open(secureUrl.value, '_blank', 'noopener,noreferrer')
  }
}

function setupAutoRefresh() {
  clearAutoRefresh()
  
  if (props.autoRefresh && props.reportId) {
    const intervalMs = props.refreshInterval * 60 * 1000 // Convert to milliseconds
    autoRefreshTimer.value = setInterval(() => {
      if (props.reportId) {
        refreshUrl(props.reportId, props.fileType)
      }
    }, intervalMs)
  }
}

function clearAutoRefresh() {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// Event handlers
function onFrameLoad() {
  console.log('PDF erfolgreich geladen')
}

function onFrameError() {
  console.error('Fehler beim Laden des PDFs')
}

function onImageLoad() {
  console.log('Bild erfolgreich geladen')
}

function onImageError() {
  console.error('Fehler beim Laden des Bildes')
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return dateString
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

// Lifecycle
onMounted(() => {
  if (props.reportId) {
    loadReport(props.reportId)
  }
})

// Cleanup
defineExpose({
  loadReport,
  refreshUrl: handleRefreshUrl,
  validateUrl: handleValidateUrl,
  clearReport: clearCurrentUrl
})
</script>

<style scoped>
.universal-report-viewer {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: #fff;
}

.viewer-header {
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.viewer-status .badge {
  font-size: 0.75rem;
}

.pdf-frame {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}

.image-viewer img {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.no-file-state,
.file-download {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.report-meta .card {
  border: 1px solid #e9ecef;
}

.report-meta .card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .viewer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .viewer-actions .btn {
    flex: 1;
    min-width: 120px;
  }
}
</style>