<template>
  <div class="container-fluid py-4 anonymization-evaluation">
    <section class="evaluation-header mb-3">
      <div>
        <h1 class="evaluation-title mb-1">Anonymization Evaluation</h1>
        <div class="evaluation-counts" aria-label="Sensitive metadata totals">
          <span class="badge bg-primary">Videos {{ videoTotal }}</span>
          <span class="badge bg-danger">PDFs {{ pdfTotal }}</span>
          <span class="badge bg-secondary">Shown {{ records.length }}</span>
        </div>
      </div>
      <button
        class="btn btn-outline-primary btn-sm"
        type="button"
        :disabled="loading"
        @click="loadSensitiveMetadata"
      >
        <i class="ni ni-bold-right me-1" :class="{ 'loading-icon': loading }"></i>
        Refresh
      </button>
    </section>

    <section class="sensitive-meta-panel" aria-labelledby="sensitive-meta-heading">
      <div class="panel-header">
        <h2 id="sensitive-meta-heading" class="panel-title mb-0">
          Extracted lx-anonymizer metadata
        </h2>
        <span v-if="loading" class="text-muted small">Loading...</span>
      </div>

      <div v-if="errorMessage" class="alert alert-danger mb-0" role="alert">
        {{ errorMessage }}
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0 sensitive-meta-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>ID</th>
              <th>First name</th>
              <th>Last name</th>
              <th>DOB</th>
              <th>Case number</th>
              <th>Exam date</th>
              <th>Gender</th>
              <th>Center</th>
              <th>Verified</th>
              <th>Text</th>
              <th>Anonymized text</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="12" class="text-center text-muted py-4">
                Loading SensitiveMeta rows...
              </td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="12" class="text-center text-muted py-4">No SensitiveMeta rows found.</td>
            </tr>
            <template v-else>
              <tr v-for="meta in records" :key="`${meta.mediaType}-${meta.id}`">
                <td>
                  <span class="badge" :class="mediaBadgeClass(meta.mediaType)">
                    {{ mediaLabel(meta.mediaType) }}
                  </span>
                </td>
                <td>
                  <code>{{ meta.id }}</code>
                </td>
                <td>{{ displayValue(meta.patientFirstName) }}</td>
                <td>{{ displayValue(meta.patientLastName) }}</td>
                <td>{{ formatDate(meta.patientDobDisplay || meta.patientDob) }}</td>
                <td>{{ displayValue(meta.casenumber) }}</td>
                <td>{{ formatDate(meta.examinationDateDisplay || meta.examinationDate) }}</td>
                <td>{{ displayValue(meta.patientGenderName) }}</td>
                <td>{{ displayValue(meta.centerName) }}</td>
                <td>
                  <span
                    class="badge"
                    :class="meta.isVerified ? 'bg-success' : 'bg-warning text-dark'"
                  >
                    {{ meta.isVerified ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="text-preview-cell">
                  <details v-if="meta.text" class="text-preview">
                    <summary>{{ truncateText(meta.text) }}</summary>
                    <pre>{{ meta.text }}</pre>
                  </details>
                  <span v-else class="text-muted">Not available</span>
                </td>
                <td class="text-preview-cell">
                  <details v-if="meta.anonymizedText" class="text-preview">
                    <summary>{{ truncateText(meta.anonymizedText) }}</summary>
                    <pre>{{ meta.anonymizedText }}</pre>
                  </details>
                  <span v-else class="text-muted">Not available</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

type MediaType = 'video' | 'pdf'

interface SensitiveMetadataRecord {
  id: number
  mediaType: MediaType
  casenumber?: string | null
  patientFirstName?: string | null
  patientLastName?: string | null
  patientDob?: string | null
  patientDobDisplay?: string | null
  examinationDate?: string | null
  examinationDateDisplay?: string | null
  patientGenderName?: string | null
  centerName?: string | null
  isVerified?: boolean
  text?: string | null
  anonymizedText?: string | null
}

type SensitiveMetadataApiRecord = Omit<SensitiveMetadataRecord, 'mediaType'>

interface PaginatedResponse<T> {
  count?: number
  results?: T[]
}

const records = ref<SensitiveMetadataRecord[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const videoTotal = ref(0)
const pdfTotal = ref(0)

function responseRows(
  data: PaginatedResponse<SensitiveMetadataApiRecord> | SensitiveMetadataApiRecord[]
): SensitiveMetadataApiRecord[] {
  if (Array.isArray(data)) {
    return data
  }

  return data.results || []
}

function responseCount(
  data: PaginatedResponse<SensitiveMetadataApiRecord> | SensitiveMetadataApiRecord[],
  fallbackCount: number
): number {
  return Array.isArray(data) ? fallbackCount : (data.count ?? fallbackCount)
}

async function fetchSensitiveMetadata(mediaType: MediaType): Promise<{
  rows: SensitiveMetadataRecord[]
  total: number
}> {
  const { data } = await axiosInstance.get<
    PaginatedResponse<SensitiveMetadataApiRecord> | SensitiveMetadataApiRecord[]
  >(r(endpoints.media.sensitiveMetadataList), {
    params: {
      content_type: mediaType,
      ordering: '-id'
    }
  })

  const rows = responseRows(data).map((record) => ({
    ...record,
    mediaType
  }))

  return {
    rows,
    total: responseCount(data, rows.length)
  }
}

async function loadSensitiveMetadata(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const [videoResponse, pdfResponse] = await Promise.all([
      fetchSensitiveMetadata('video'),
      fetchSensitiveMetadata('pdf')
    ])

    records.value = [...videoResponse.rows, ...pdfResponse.rows]
    videoTotal.value = videoResponse.total
    pdfTotal.value = pdfResponse.total
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'SensitiveMeta data could not be loaded.'
    records.value = []
    videoTotal.value = 0
    pdfTotal.value = 0
  } finally {
    loading.value = false
  }
}

function mediaLabel(mediaType: MediaType): string {
  return mediaType === 'video' ? 'Video' : 'PDF'
}

function mediaBadgeClass(mediaType: MediaType): string {
  return mediaType === 'video' ? 'bg-primary' : 'bg-danger'
}

function displayValue(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  return String(value)
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Not available'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('de-DE')
}

function truncateText(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 80) {
    return normalized
  }

  return `${normalized.slice(0, 77)}...`
}

onMounted(() => {
  void loadSensitiveMetadata()
})
</script>

<style scoped>
.anonymization-evaluation {
  --evaluation-border: rgba(35, 42, 62, 0.14);
  --evaluation-muted-bg: #f8fafc;
  color: #232a3e;
}

.evaluation-header,
.panel-header {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.evaluation-header {
  border-bottom: 1px solid var(--evaluation-border);
  padding-bottom: 0.85rem;
}

.evaluation-title {
  font-size: 1.4rem;
  font-weight: 700;
}

.evaluation-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.sensitive-meta-panel {
  background: #fff;
  border: 1px solid var(--evaluation-border);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  background: var(--evaluation-muted-bg);
  border-bottom: 1px solid var(--evaluation-border);
  padding: 0.85rem 1rem;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
}

.sensitive-meta-table {
  min-width: 1360px;
}

.sensitive-meta-table th {
  background: var(--evaluation-muted-bg);
  color: #4b5563;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.sensitive-meta-table td,
.sensitive-meta-table th {
  border-color: rgba(35, 42, 62, 0.1);
  vertical-align: top;
}

.text-preview-cell {
  max-width: 280px;
}

.text-preview summary {
  cursor: pointer;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-preview pre {
  background: #f5f7fb;
  border: 1px solid rgba(35, 42, 62, 0.1);
  border-radius: 6px;
  color: #232a3e;
  font-family: inherit;
  font-size: 0.82rem;
  margin: 0.5rem 0 0;
  max-height: 12rem;
  overflow: auto;
  padding: 0.65rem;
  white-space: pre-wrap;
}

.loading-icon {
  animation: evaluation-spin 0.9s linear infinite;
}

@keyframes evaluation-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .evaluation-header,
  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
