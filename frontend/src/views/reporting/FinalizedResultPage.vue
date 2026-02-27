<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Finalisierung / Artefakte</h5>
          <small class="text-muted">Finalen Bericht laden, PDF öffnen und Timeline aufrufen.</small>
        </div>
        <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadLatestFinalizedState">
          Aktualisieren
        </button>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">PatientExamination-ID</label>
            <input class="form-control" :value="patientExaminationId ?? ''" readonly />
          </div>
          <div class="col-md-6">
            <label class="form-label">Report-ID</label>
            <input class="form-control" :value="latestReport?.id ?? ''" readonly />
          </div>
        </div>

        <div v-if="loading" class="text-muted">Lade Finalisierungsdaten...</div>
        <div v-else-if="!latestReport" class="alert alert-info mb-0">
          Kein Bericht für diese Patientenuntersuchung gefunden.
        </div>
        <template v-else>
          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <div class="small text-muted">Status</div>
              <div><span class="badge" :class="statusClass">{{ latestReport.status || 'unknown' }}</span></div>
            </div>
            <div class="col-md-4">
              <div class="small text-muted">Version</div>
              <div>{{ latestReport.version ?? 'n/a' }}</div>
            </div>
            <div class="col-md-4">
              <div class="small text-muted">Aktualisiert</div>
              <div>{{ formatTimestamp(latestReport.updatedAt || latestReport.createdAt) }}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <a v-if="pdfViewUrl" class="btn btn-outline-dark btn-sm" :href="pdfViewUrl" target="_blank" rel="noopener">
              PDF öffnen
            </a>
            <a
              v-if="pdfDownloadUrl"
              class="btn btn-outline-primary btn-sm"
              :href="pdfDownloadUrl"
              target="_blank"
              rel="noopener"
            >
              PDF herunterladen
            </a>
            <a
              v-if="patientTimelineUrl"
              class="btn btn-outline-secondary btn-sm"
              :href="patientTimelineUrl"
              target="_blank"
              rel="noopener"
            >
              Patienten-Timeline
            </a>
          </div>

          <div v-if="!pdfViewUrl && !pdfDownloadUrl && !patientTimelineUrl" class="alert alert-warning mt-3 mb-0">
            Es sind noch keine Artefakt-Links verfügbar.
          </div>
        </template>
      </div>
    </div>

    <div class="alert alert-secondary mb-0">
      Alternativ kann der Bericht im Editor unter <code>/reporting/&lt;id&gt;/report-editor</code> erneut gespeichert werden.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'

type ReportListRow = {
  id: number
  status?: string | null
  version?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type ReportDetailRow = {
  id: number
  persistedArtifacts?: {
    pdfViewUrl?: string | null
    pdfDownloadUrl?: string | null
    patientTimelineUrl?: string | null
    pdfId?: number | null
  } | null
  persistedPdfArtifactId?: number | null
}

const flow = useReportingFlowStore()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const latestReport = ref<ReportListRow | null>(null)
const latestReportDetail = ref<ReportDetailRow | null>(null)

const patientExaminationId = computed<number | null>(() => {
  const param = Number(route.params.patient_examination_id)
  if (Number.isFinite(param) && param > 0) return param
  return flow.patientExaminationId
})

const statusClass = computed(() => {
  const status = (latestReport.value?.status || '').toLowerCase()
  if (status === 'final') return 'bg-success'
  if (status === 'draft') return 'bg-warning text-dark'
  return 'bg-secondary'
})

const persistedArtifacts = computed(() => latestReportDetail.value?.persistedArtifacts || null)

const fallbackPdfId = computed<number | null>(() => {
  if (typeof persistedArtifacts.value?.pdfId === 'number') return persistedArtifacts.value.pdfId
  if (typeof latestReportDetail.value?.persistedPdfArtifactId === 'number') {
    return latestReportDetail.value.persistedPdfArtifactId
  }
  return null
})

const pdfViewUrl = computed(() => {
  if (persistedArtifacts.value?.pdfViewUrl) return persistedArtifacts.value.pdfViewUrl
  if (fallbackPdfId.value) return `/${r(endpoints.media.pdfStream(fallbackPdfId.value))}?type=raw`
  return null
})

const pdfDownloadUrl = computed(() => {
  if (persistedArtifacts.value?.pdfDownloadUrl) return persistedArtifacts.value.pdfDownloadUrl
  if (fallbackPdfId.value) return `/${r(endpoints.media.pdfStream(fallbackPdfId.value))}?type=raw&download=1`
  return null
})

const patientTimelineUrl = computed(() => {
  if (persistedArtifacts.value?.patientTimelineUrl) return persistedArtifacts.value.patientTimelineUrl
  if (flow.selectedPatientId) return `/${r(endpoints.media.patientTimeline(flow.selectedPatientId))}`
  return null
})

function formatTimestamp(value?: string | null): string {
  if (!value) return 'n/a'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString()
}

async function loadLatestFinalizedState() {
  if (!patientExaminationId.value) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }

  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  latestReport.value = null
  latestReportDetail.value = null

  try {
    const listRes = await axiosInstance.get(
      r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId.value))
    )
    const rows = (Array.isArray(listRes.data?.results) ? listRes.data.results : listRes.data) as ReportListRow[]
    const items = Array.isArray(rows) ? rows : []
    if (!items.length) {
      successMessage.value = 'Es ist noch kein Bericht vorhanden.'
      return
    }

    latestReport.value = items[0]
    flow.setActiveReportId(items[0].id)

    const detailRes = await axiosInstance.get(
      r(endpoints.report.patientExaminationReportById(items[0].id))
    )
    latestReportDetail.value = (detailRes.data || null) as ReportDetailRow | null
    successMessage.value = `Bericht #${items[0].id} geladen.`
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Laden der Finalisierungsdaten.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadLatestFinalizedState()
})
</script>
