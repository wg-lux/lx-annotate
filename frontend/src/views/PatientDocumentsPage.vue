<template>
  <main class="container-fluid py-4 patient-resource-page">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <div class="small text-uppercase text-muted fw-semibold">Patientenakte</div>
        <h1 class="h3 mb-1">Dokumente von {{ patientName }}</h1>
        <p class="text-muted mb-0">
          Alle PDF-Dokumente, Textberichte und Videos – auch wiederholte Aufnahmen derselben Untersuchung.
        </p>
      </div>
      <nav class="d-flex flex-wrap align-items-start gap-2" aria-label="Patientennavigation">
        <RouterLink class="btn btn-outline-secondary" to="/patienten">Patienten</RouterLink>
        <RouterLink
          class="btn btn-outline-primary"
          :to="{ name: 'Patientenmedikation', params: { patientId } }"
        >
          Medikation
        </RouterLink>
        <RouterLink
          class="btn btn-primary"
          :to="{ path: '/reporting', query: { patient_id: patientId } }"
        >
          Reporting
        </RouterLink>
      </nav>
    </div>

    <div v-if="loading" class="card card-body text-center" role="status">
      <div class="spinner-border text-primary mx-auto mb-2"></div>
      Dokumente werden geladen…
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-else-if="documents.length === 0" class="card card-body text-center text-muted">
      Für diesen Patienten sind keine Dokumente vorhanden.
    </div>
    <div v-else class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2 class="h5 mb-0">Dokumente</h2>
        <span class="badge bg-primary">{{ documents.length }}</span>
      </div>
      <div class="list-group list-group-flush">
        <article
          v-for="document in documents"
          :key="`${document.mediaType}-${document.id}`"
          class="list-group-item py-3"
          data-testid="patient-document"
        >
          <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
            <div>
              <div class="fw-semibold">{{ documentTitle(document) }}</div>
              <div class="small text-muted">
                {{ formatDate(document.examinationDate || document.timestamp) }}
                <span v-if="document.patientExaminationId">
                  · Untersuchung #{{ document.patientExaminationId }}
                </span>
                <span v-if="caseLabel(document)"> · {{ caseLabel(document) }}</span>
              </div>
            </div>
            <a
              v-if="preferredStream(document)"
              class="btn btn-outline-primary btn-sm align-self-start"
              :href="preferredStream(document)!"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ document.mediaType === 'video' ? 'Abspielen' : 'Öffnen' }}
            </a>
            <span v-else class="small text-muted">Keine Datei verfügbar</span>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchPatientTimeline,
  pickPreferredStream,
  pickPreferredReportStream,
  type PatientTimelineItem,
  type PatientTimelinePayload
} from '@/api/reportingTimelineApi'
import { fetchPatientCases, type PatientCase } from '@/api/casesApi'

const props = defineProps<{ patientId: number }>()
const loading = ref(true)
const error = ref('')
const timeline = ref<PatientTimelinePayload | null>(null)
const cases = ref<PatientCase[]>([])

const patientName = computed(() => {
  const patient = timeline.value?.patient
  const name = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ')
  return name || `Patient #${props.patientId}`
})

const documents = computed(() =>
  timeline.value?.results || []
)

function preferredStream(document: PatientTimelineItem): string | null {
  return document.mediaType === 'video'
    ? pickPreferredStream(document.streamOptions || [])
    : pickPreferredReportStream(document.streamOptions || [])
}

function documentTitle(document: PatientTimelineItem): string {
  if (document.documentType) return document.documentType
  if (document.mediaType === 'full_report') return 'Untersuchungsbericht'
  if (document.mediaType === 'video') {
    return document.fileName?.split('/').pop() || `Video #${document.id}`
  }
  return document.fileName?.split('/').pop() || `PDF #${document.id}`
}

function caseLabel(document: PatientTimelineItem): string | null {
  if (!document.patientExaminationId) return null
  const patientCase = cases.value.find((candidate) =>
    candidate.patientExaminations.some(
      (examination) => examination.id === document.patientExaminationId
    )
  )
  return patientCase ? `Fall ${patientCase.caseId}` : 'Keinem Fall zugeordnet'
}

function formatDate(value: string | null): string {
  if (!value) return 'Datum nicht verfügbar'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Datum nicht verfügbar' : date.toLocaleDateString('de-DE')
}

onMounted(async () => {
  try {
    const [timelineResult, caseResult] = await Promise.all([
      fetchPatientTimeline(props.patientId),
      fetchPatientCases({ patientId: props.patientId })
    ])
    timeline.value = timelineResult
    cases.value = caseResult
  } catch (caught: unknown) {
    error.value =
      caught instanceof Error && caught.message
        ? caught.message
        : 'Dokumente konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.patient-resource-page {
  max-width: 1200px;
}
</style>
