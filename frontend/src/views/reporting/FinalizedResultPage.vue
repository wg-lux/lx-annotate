<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Abgeschlossener Bericht</h5>
          <small class="text-muted">Bericht prüfen, als PDF öffnen oder herunterladen.</small>
        </div>
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="loading"
          @click="loadLatestFinalizedState"
        >
          Aktualisieren
        </button>
      </div>
      <div class="card-body">
        <div
          v-if="errorMessage"
          class="alert alert-danger py-2"
        >{{ errorMessage }}</div>
        <div
          v-if="successMessage"
          class="alert alert-success py-2"
        >{{ successMessage }}</div>

        <div
          v-if="loading"
          class="text-muted"
        >Lade Abschlussdaten …</div>
        <div
          v-else-if="!latestReport"
          class="alert alert-info mb-0"
        >
          Kein Bericht für diese Patientenuntersuchung gefunden.
        </div>
        <template v-else>
          <div class="row g-3 mb-3">
            <div class="col-md-3">
              <div class="small text-muted">Status</div>
              <div>
                <span
                  class="badge"
                  :class="statusClass"
                >{{
                  reportStatusLabel(latestReport.status)
                }}</span>
              </div>
            </div>
            <div class="col-md-3">
              <div class="small text-muted">Version</div>
              <div>{{ reportVersionLabel(latestReport.version) }}</div>
            </div>
            <div class="col-md-3">
              <div class="small text-muted">Aktualisiert</div>
              <div>{{ formatGermanReportTimestamp(latestReport.updatedAt || latestReport.createdAt) }}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <a
              v-if="pdfViewUrl"
              class="btn btn-outline-dark btn-sm"
              :href="pdfViewUrl"
              target="_blank"
              rel="noopener"
            >
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

          <div
            v-if="!pdfViewUrl && !pdfDownloadUrl && !patientTimelineUrl"
            class="alert alert-warning mt-3 mb-0"
          >
            Es sind noch keine Artefakt-Links verfügbar.
          </div>
          <details
            class="mt-3 small text-muted"
            data-testid="finalized-technical-details"
          >
            <summary>Technische Angaben</summary>
            <div class="mt-2">Berichtsreferenz: {{ latestReport.id }}</div>
            <div>Untersuchungsreferenz: {{ patientExaminationId ?? 'nicht verfügbar' }}</div>
            <div>Dokumenttyp: {{ reportDocumentType || 'nicht verfügbar' }}</div>
          </details>
        </template>
      </div>
    </div>

    <div class="alert alert-secondary mb-0">
      Änderungen können über „Bericht bearbeiten“ im Reporting-Ablauf vorgenommen werden.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'
import { buildPdfStreamUrl } from '@/utils/mediaUrls'
import { reportingApiErrorMessage } from './reportingError'
import { parseReportListPayload, type ReportListRow } from './reportListPayload'
import {
  formatGermanReportTimestamp,
  reportStatusBadgeClass,
  reportStatusLabel,
  reportVersionLabel
} from './reportingPresentation'

type ReportDetailRow = {
  id: number
  documentType?: string | null
  document_type?: string | null
  persistedArtifacts?: {
    pdfViewUrl?: string | null
    pdfDownloadUrl?: string | null
    patientTimelineUrl?: string | null
    pdfId?: number | null
    documentType?: string | null
    document_type?: string | null
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
  if (Number.isFinite(param) && param > 0) {
    return param
  }
  return flow.patientExaminationId
})

const statusClass = computed(() => reportStatusBadgeClass(latestReport.value?.status))

const persistedArtifacts = computed(() => latestReportDetail.value?.persistedArtifacts || null)

const reportDocumentType = computed<string | null>(() => {
  const fromArtifacts =
    (
      persistedArtifacts.value
    )?.documentType ||
    (
      persistedArtifacts.value
    )?.document_type
  if (typeof fromArtifacts === 'string' && fromArtifacts.trim().length > 0) {
    return fromArtifacts
  }
  const fromDetail =
    latestReportDetail.value?.documentType || latestReportDetail.value?.document_type
  if (typeof fromDetail === 'string' && fromDetail.trim().length > 0) {
    return fromDetail
  }
  return null
})

const fallbackPdfId = computed<number | null>(() => {
  if (typeof persistedArtifacts.value?.pdfId === 'number') {
    return persistedArtifacts.value.pdfId
  }
  if (typeof latestReportDetail.value?.persistedPdfArtifactId === 'number') {
    return latestReportDetail.value.persistedPdfArtifactId
  }
  return null
})

const pdfViewUrl = computed(() => {
  if (persistedArtifacts.value?.pdfViewUrl) {
    return persistedArtifacts.value.pdfViewUrl
  }
  if (fallbackPdfId.value) {
    return buildPdfStreamUrl(fallbackPdfId.value, 'raw')
  }
  return null
})

const pdfDownloadUrl = computed(() => {
  if (persistedArtifacts.value?.pdfDownloadUrl) {
    return persistedArtifacts.value.pdfDownloadUrl
  }
  if (fallbackPdfId.value) {
    return buildPdfStreamUrl(fallbackPdfId.value, 'raw', { download: 1 })
  }
  return null
})

function withPatientExaminationFilter(url: string): string {
  if (!patientExaminationId.value) {
    return url
  }
  if (url.includes('patient_examination_id=')) {
    return url
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}patient_examination_id=${String(patientExaminationId.value)}`
}

const patientTimelineUrl = computed(() => {
  if (persistedArtifacts.value?.patientTimelineUrl) {
    return withPatientExaminationFilter(persistedArtifacts.value.patientTimelineUrl)
  }
  if (flow.selectedPatientId) {
    return withPatientExaminationFilter(
      `/${r(endpoints.media.patientTimeline(flow.selectedPatientId))}`
    )
  }
  return null
})

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
    const listRes = await axiosInstance.get<unknown>(
      r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId.value))
    )
    const items = parseReportListPayload(listRes.data)
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
    successMessage.value = 'Der abgeschlossene Bericht wurde geladen.'
  } catch (e: unknown) {
    errorMessage.value = reportingApiErrorMessage(e, 'Fehler beim Laden der Finalisierungsdaten.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadLatestFinalizedState()
})
</script>
