<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center gap-3">
        <div>
          <h5 class="mb-0">Bericht exportieren</h5>
          <small class="text-muted"
            >Als formatiertes PDF mit Bildern oder als übersichtliche Textdatei.</small
          >
        </div>
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="loadingReport"
          @click="loadLatestReport"
        >
          Aktualisieren
        </button>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>
        <div v-if="!hasVerifiedTemplateContext" class="alert alert-info py-2">
          Für den PDF-Export ist ein verifizierter Entwurf mit einer zur aktiven Terminologie
          passenden veröffentlichten Berichtsvorlage erforderlich. Die erfassten Befunde bleiben
          erhalten.
        </div>
        <div v-if="latestReport && !hasTextReport" class="alert alert-info py-2">
          Für den TXT-Export muss der Bericht zuerst im Berichtseditor gespeichert werden.
        </div>

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
          <div class="col-md-6">
            <div class="small text-muted">Status</div>
            <div>
              <span class="badge" :class="reportStatusClass">{{
                reportStatusLabel(latestReport?.status)
              }}</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="small text-muted">Berichtsstand</div>
            <div class="fw-semibold">{{ reportVersionLabel(latestReport?.version) }}</div>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button
            class="btn btn-primary"
            :disabled="!canMakeReport || generating"
            @click="onMakeReport"
          >
            <span v-if="generating" class="spinner-border spinner-border-sm me-1" />
            PDF-Bericht erstellen
          </button>
          <button
            class="btn btn-outline-primary"
            type="button"
            :disabled="!canDownloadText"
            data-testid="download-text-report"
            @click="onDownloadTextReport"
          >
            TXT herunterladen
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
        <div class="export-format-notes mt-3" aria-label="Verfügbare Exportformate">
          <div>
            <strong>PDF</strong>
            <span>Layoutierter Bericht mit den ausgewählten Befundbildern.</span>
          </div>
          <div>
            <strong>TXT</strong>
            <span>UTF-8-Text mit Patientenkontext und dem gespeicherten Berichtstext.</span>
          </div>
        </div>
        <details class="mt-3 small text-muted" data-testid="export-technical-details">
          <summary>Technische Angaben</summary>
          <div class="mt-2">Berichtsreferenz: {{ selectedReportId ?? 'nicht verfügbar' }}</div>
          <div>Untersuchungsreferenz: {{ patientExaminationId ?? 'nicht verfügbar' }}</div>
        </details>
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

        <div class="small text-muted">{{ includedFrameCount }} Bild(er) im PDF berücksichtigt.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { makeReport, type PersistedReportArtifacts } from '@/api/reportExportApi'
import { isVerifiedRuntimeDraftForBundle, useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useTerminologyStore } from '@/stores/terminologyStore'
import { endpoints } from '@/types/api/endpoints'
import { reportingApiErrorMessage } from './reportingError'
import { parseReportListPayload, type ReportListRow } from './reportListPayload'
import { formatReportingTextDocument, reportingTextFilename } from './reportingTextExport'
import {
  reportStatusBadgeClass,
  reportStatusLabel,
  reportVersionLabel
} from './reportingPresentation'

const route = useRoute()
const flow = useReportingFlowStore()
const terminology = useTerminologyStore()

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

const hasVerifiedTemplateContext = computed(() =>
  isVerifiedRuntimeDraftForBundle(
    flow.currentRuntimeDraft,
    terminology.activeBundle,
    patientExaminationId.value
  )
)

const canMakeReport = computed(
  () =>
    hasVerifiedTemplateContext.value &&
    !!patientExaminationId.value &&
    !!patient.value.firstName &&
    !!patient.value.lastName &&
    !!patient.value.dob
)

const hasPatientIdentity = computed(
  () => !!patient.value.firstName && !!patient.value.lastName && !!patient.value.dob
)

const hasTextReport = computed(() => Boolean(latestReport.value?.renderedText?.trim()))
const canDownloadText = computed(() => hasPatientIdentity.value && hasTextReport.value)

const reportStatusClass = computed(() => reportStatusBadgeClass(latestReport.value?.status))

const timelineUrl = computed<string | undefined>(() => {
  const url = persistedArtifacts.value?.patientTimelineUrl
  if (!url) return undefined
  if (!patientExaminationId.value || url.includes('patient_examination_id=')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}patient_examination_id=${String(patientExaminationId.value)}`
})

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
  warnings.value = []
}

function hydratePatientIdentity() {
  const timelinePatient = flow.mediaPreload?.patient
  if (!timelinePatient) return
  if (!patient.value.firstName) patient.value.firstName = timelinePatient.firstName || ''
  if (!patient.value.lastName) patient.value.lastName = timelinePatient.lastName || ''
  if (!patient.value.dob) patient.value.dob = timelinePatient.dob || ''
}

function onDownloadTextReport() {
  const report = latestReport.value
  const renderedText = report?.renderedText?.trim()
  if (!report || !renderedText) {
    errorMessage.value =
      'TXT-Export ist erst möglich, nachdem der Bericht im Berichtseditor gespeichert wurde.'
    return
  }
  if (!hasPatientIdentity.value) {
    errorMessage.value = 'Vorname, Nachname und Geburtsdatum sind für den TXT-Export erforderlich.'
    return
  }

  clearMessages()
  try {
    const exportInput = {
      firstName: patient.value.firstName,
      lastName: patient.value.lastName,
      dob: patient.value.dob,
      examination: flow.currentRuntimeDraft?.payload.examination || 'Nicht angegeben',
      templateName: report.templateName || flow.selectedTemplateName,
      status: reportStatusLabel(report.status),
      version: report.version,
      updatedAt: report.updatedAt,
      renderedText
    }
    const blob = new Blob(['\uFEFF', formatReportingTextDocument(exportInput)], {
      type: 'text/plain;charset=utf-8'
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = reportingTextFilename(report.id)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
    successMessage.value = 'Der TXT-Bericht wurde heruntergeladen.'
  } catch (error: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      error,
      'TXT-Bericht konnte nicht heruntergeladen werden.'
    )
  }
}

async function loadLatestReport() {
  if (!patientExaminationId.value) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }

  loadingReport.value = true
  clearMessages()
  try {
    const res = await axiosInstance.get<unknown>(
      r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId.value))
    )
    const items = parseReportListPayload(res.data)
    latestReport.value = items.at(0) ?? null
    if (latestReport.value !== null) {
      flow.setActiveReportId(latestReport.value.id)
    }
    if (!latestReport.value) {
      successMessage.value = 'Kein Bericht für diesen Fall vorhanden.'
    }
  } catch (e: unknown) {
    errorMessage.value = reportingApiErrorMessage(e, 'Bericht konnte nicht geladen werden.')
  } finally {
    loadingReport.value = false
  }
}

async function onMakeReport() {
  if (!patientExaminationId.value) {
    errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.'
    return
  }
  if (!hasVerifiedTemplateContext.value) {
    errorMessage.value =
      'PDF-Export ist erst nach Auswahl und Prüfung einer kompatiblen Berichtsvorlage möglich.'
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
      ...(latestReport.value ?? {}),
      id: data.report.id,
      status: data.report.status,
      version: data.report.version
    }
    flow.setActiveReportId(data.report.id)
    persistedArtifacts.value = data.persistedArtifacts || null
    includedFrameCount.value = data.includedFrameCount || 0
    warnings.value = Array.isArray(data.warnings) ? data.warnings : []
    successMessage.value = 'Der PDF-Bericht wurde erstellt.'
  } catch (e: unknown) {
    errorMessage.value = reportingApiErrorMessage(e, 'PDF-Bericht konnte nicht erstellt werden.')
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  hydratePatientIdentity()
  void loadLatestReport()
})
</script>

<style scoped>
.export-format-notes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.75rem;
}

.export-format-notes > div {
  display: grid;
  gap: 0.15rem;
  padding: 0.75rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-light-bg-subtle);
}

.export-format-notes span {
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
}
</style>
