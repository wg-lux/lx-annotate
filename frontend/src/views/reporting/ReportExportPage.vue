<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center gap-3">
        <div>
          <h5 class="mb-0">Report export</h5>
          <small class="text-muted">PDF-Bericht mit ausgewählten Bildern erstellen.</small>
        </div>
        <button class="btn btn-outline-secondary btn-sm" :disabled="loadingReport" @click="loadLatestReport">
          Aktualisieren
        </button>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">Vorname</label>
            <input v-model.trim="patient.firstName" class="form-control" autocomplete="off" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Nachname</label>
            <input v-model.trim="patient.lastName" class="form-control" autocomplete="off" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Geburtsdatum</label>
            <input v-model="patient.dob" class="form-control" type="date" autocomplete="off" />
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <div class="small text-muted">PatientExamination-ID</div>
            <div class="fw-semibold">{{ patientExaminationId ?? 'n/a' }}</div>
          </div>
          <div class="col-md-4">
            <div class="small text-muted">Report-ID</div>
            <div class="fw-semibold">{{ selectedReportId ?? 'n/a' }}</div>
          </div>
          <div class="col-md-4">
            <div class="small text-muted">Status</div>
            <div>
              <span class="badge" :class="reportStatusClass">{{ latestReport?.status || 'n/a' }}</span>
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary" :disabled="!canMakeReport || generating" @click="onMakeReport">
            <span v-if="generating" class="spinner-border spinner-border-sm me-1" />
            Make report
          </button>
          <RouterLink
            v-if="patientExaminationId"
            class="btn btn-outline-secondary"
            :to="`/reporting/${patientExaminationId}/frame-selector`"
          >
            Bilder auswählen
          </RouterLink>
          <RouterLink
            v-if="patientExaminationId"
            class="btn btn-outline-secondary"
            :to="`/reporting/${patientExaminationId}/finalized`"
          >
            Abschluss
          </RouterLink>
        </div>

        <div v-if="warnings.length" class="alert alert-warning py-2 mt-3 mb-0">
          <div v-for="warning in warnings" :key="warning">{{ warning }}</div>
        </div>
      </div>
    </div>

    <div v-if="persistedArtifacts" class="card shadow-sm">
      <div class="card-header">
        <h6 class="mb-0">PDF-Artefakt</h6>
      </div>
      <div class="card-body">
        <div class="d-flex flex-wrap gap-2 mb-3">
          <a
            v-if="persistedArtifacts.pdfViewUrl"
            class="btn btn-outline-dark btn-sm"
            :href="persistedArtifacts.pdfViewUrl"
            target="_blank"
            rel="noopener"
          >
            PDF öffnen
          </a>
          <a
            v-if="persistedArtifacts.pdfDownloadUrl"
            class="btn btn-outline-primary btn-sm"
            :href="persistedArtifacts.pdfDownloadUrl"
            target="_blank"
            rel="noopener"
          >
            PDF herunterladen
          </a>
          <a
            v-if="persistedArtifacts.patientTimelineUrl"
            class="btn btn-outline-secondary btn-sm"
            :href="timelineUrl"
            target="_blank"
            rel="noopener"
          >
            Patienten-Timeline
          </a>
        </div>

        <div class="small text-muted">
          {{ includedFrameCount }} Bild(er) im PDF berücksichtigt.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { makeReport, type PersistedReportArtifacts } from '@/api/reportExportApi'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'

type ReportListRow = {
  id: number
  status?: string | null
  version?: number | null
  updatedAt?: string | null
}

const route = useRoute()
const flow = useReportingFlowStore()

const loadingReport = ref(false)
const generating = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const warnings = ref<string[]>([])
const latestReport = ref<ReportListRow | null>(null)
const persistedArtifacts = ref<PersistedReportArtifacts | null>(null)
const includedFrameCount = ref(0)

const patient = ref({
  firstName: '',
  lastName: '',
  dob: ''
})

const patientExaminationId = computed<number | null>(() => {
  const param = Number(route.params.patient_examination_id)
  if (Number.isFinite(param) && param > 0) return param
  return flow.patientExaminationId
})

const selectedReportId = computed(() => latestReport.value?.id ?? flow.activeReportId ?? null)

const canMakeReport = computed(
  () =>
    !!patientExaminationId.value &&
    !!patient.value.firstName &&
    !!patient.value.lastName &&
    !!patient.value.dob
)

const reportStatusClass = computed(() => {
  const status = (latestReport.value?.status || '').toLowerCase()
  if (status === 'final') return 'bg-success'
  if (status === 'draft') return 'bg-warning text-dark'
  return 'bg-secondary'
})

const timelineUrl = computed(() => {
  const url = persistedArtifacts.value?.patientTimelineUrl
  if (!url || !patientExaminationId.value || url.includes('patient_examination_id=')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}patient_examination_id=${patientExaminationId.value}`
})

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
  warnings.value = []
}

async function loadLatestReport() {
  if (!patientExaminationId.value) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }

  loadingReport.value = true
  clearMessages()
  try {
    const res = await axiosInstance.get(
      r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId.value))
    )
    const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data) as ReportListRow[]
    const items = Array.isArray(rows) ? rows : []
    latestReport.value = items[0] || null
    if (latestReport.value?.id) {
      flow.setActiveReportId(latestReport.value.id)
    }
    if (!latestReport.value) {
      successMessage.value = 'Kein Bericht für diesen Fall vorhanden.'
    }
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.detail || e?.message || 'Bericht konnte nicht geladen werden.'
  } finally {
    loadingReport.value = false
  }
}

async function onMakeReport() {
  if (!patientExaminationId.value) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }
  if (!canMakeReport.value) {
    errorMessage.value = 'Vorname, Nachname und Geburtsdatum sind erforderlich.'
    return
  }

  generating.value = true
  clearMessages()
  persistedArtifacts.value = null
  includedFrameCount.value = 0
  try {
    const data = await makeReport({
      patientExaminationId: patientExaminationId.value,
      reportId: selectedReportId.value,
      patient: patient.value,
      maxFrames: 12
    })
    latestReport.value = {
      id: data.report.id,
      status: data.report.status,
      version: data.report.version
    }
    flow.setActiveReportId(data.report.id)
    persistedArtifacts.value = data.persistedArtifacts || null
    includedFrameCount.value = data.includedFrameCount || 0
    warnings.value = Array.isArray(data.warnings) ? data.warnings : []
    successMessage.value = `PDF-Bericht #${data.report.id} wurde erstellt.`
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.detail || e?.message || 'PDF-Bericht konnte nicht erstellt werden.'
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  void loadLatestReport()
})
</script>
