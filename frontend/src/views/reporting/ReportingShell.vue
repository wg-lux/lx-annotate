<template>
  <div class="reporting-shell container-fluid py-4">
    <div class="row g-3">
      <div class="col-lg-3">
        <div class="card shadow-sm">
          <div class="card-header">
            <h6 class="mb-0">Berichts-Workflow</h6>
          </div>
          <div class="card-body p-2">
            <h6 class="mb-0">Medien-Preload</h6>
            <div class="small text-muted mt-2">
              Status:
              <strong>{{ flow.mediaPreloadStatus }}</strong>
            </div>
            <div v-if="flow.mediaPreloadError" class="alert alert-warning py-2 mt-2 mb-0">
              {{ flow.mediaPreloadError }}
            </div>
            <div class="d-grid mt-2">
              <button
                class="btn btn-outline-secondary btn-sm"
                :disabled="flow.mediaPreloadStatus === 'loading' || !flow.selectedPatientId"
                @click="refreshMediaPreload"
              >
                Aktualisieren
              </button>
            </div>
          </div>
          <div class="card-body p-2">
            <div class="small text-muted px-2 mb-2">
              Fallkontext: <strong>{{ flow.sessionStatus }}</strong>
            </div>
            <div class="small text-muted px-2 mb-3">
              PE: {{ flow.patientExaminationId || 'n/a' }} · aktiv: {{ flow.lookupToken ? 'ja' : 'nein' }}
            </div>
            <div class="px-2 mb-3">
              <label class="form-label form-label-sm mb-1">Patientenuntersuchung wählen</label>
              <select
                class="form-select form-select-sm"
                :value="selectedPatientExaminationId"
                :disabled="patientExaminationOptionsLoading || !patientExaminationOptions.length"
                @change="onPatientExaminationSelect(($event.target as HTMLSelectElement).value)"
              >
                <option value="">
                  {{
                    patientExaminationOptionsLoading
                      ? 'Patientenuntersuchungen werden geladen...'
                      : patientExaminationOptions.length
                        ? 'Bitte Patientenuntersuchung wählen'
                        : 'Keine Patientenuntersuchungen verfügbar'
                  }}
                </option>
                <option
                  v-for="option in patientExaminationOptions"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>
              </select>
              <div v-if="patientExaminationOptionsError" class="small text-danger mt-1">
                {{ patientExaminationOptionsError }}
              </div>
            </div>
            <nav class="nav flex-column gap-1">
              <RouterLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="workflow-step-btn btn btn-sm text-start"
                :class="isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive'"
              >
                {{ item.label }}
              </RouterLink>
            </nav>
          </div>
        </div>
      </div>

      <div class="col-lg-9">
        <div v-if="flow.mediaPreload" class="card shadow-sm mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Letzte Assets</h6>
            <small class="text-muted">Patient {{ flow.mediaPreload.patient.id }}</small>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-1">Report</div>
                  <div v-if="flow.mediaPreload.latestReport" class="small">
                    <div>ID: {{ flow.mediaPreload.latestReport.id }}</div>
                    <div>Typ: {{ flow.mediaPreload.latestReport.documentType || 'n/a' }}</div>
                    <div class="mt-2 d-flex flex-wrap gap-2">
                      <button
                        v-for="option in flow.mediaPreload.latestReport.streamOptions"
                        :key="`report-${option.type}`"
                        class="btn btn-outline-secondary btn-sm"
                        @click="openUrl(option.url)"
                      >
                        {{ option.type }}
                      </button>
                    </div>
                    <div class="mt-2 d-grid gap-2">
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredReportStream"
                        @click="openUrl(preferredReportStream)"
                      >
                        Report streamen
                      </button>
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredReportDownload"
                        @click="openUrl(preferredReportDownload)"
                      >
                        Report herunterladen
                      </button>
                    </div>
                  </div>
                  <div v-else class="small text-muted">Kein Report verfügbar.</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-1">Video</div>
                  <div v-if="flow.mediaPreload.latestVideo" class="small">
                    <div>ID: {{ flow.mediaPreload.latestVideo.id }}</div>
                    <div class="mt-2 d-flex flex-wrap gap-2">
                      <button
                        v-for="option in flow.mediaPreload.latestVideo.streamOptions"
                        :key="`video-${option.type}`"
                        class="btn btn-outline-secondary btn-sm"
                        @click="selectVideoStream(option.url)"
                      >
                        {{ option.type }}
                      </button>
                    </div>
                    <div class="mt-2 d-grid gap-2">
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredVideoStream"
                        @click="selectVideoStream(preferredVideoStream)"
                      >
                        Video streamen
                      </button>
                    </div>
                    <video
                      v-if="selectedVideoStreamUrl"
                      class="w-100 mt-2 rounded border"
                      controls
                      :src="selectedVideoStreamUrl"
                    />
                  </div>
                  <div v-else class="small text-muted">Kein Video verfügbar.</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-1">Frames</div>
                  <div v-if="flow.mediaPreload.latestFrames.length" class="small d-grid gap-2">
                    <button
                      v-for="frame in flow.mediaPreload.latestFrames"
                      :key="`${frame.videoId}-${frame.frameNumber}`"
                      class="btn btn-outline-secondary btn-sm text-start"
                      @click="selectFrameStream(frame.streamUrl)"
                    >
                      #{{ frame.frameNumber }} · {{ frame.category || 'fallback' }}
                    </button>
                    <img
                      v-if="selectedFrameStreamUrl"
                      class="img-fluid rounded border mt-1"
                      :src="selectedFrameStreamUrl"
                      alt="Selected frame stream preview"
                    />
                  </div>
                  <div v-else class="small text-muted">Keine Frames verfügbar.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { fetchPatientTimelineLatest, pickPreferredStream } from '@/api/reportingTimelineApi'

const route = useRoute()
const router = useRouter()
const flow = useReportingFlowStore()
const selectedVideoStreamUrl = ref<string | null>(null)
const selectedFrameStreamUrl = ref<string | null>(null)
type PatientExaminationOption = {
  id: number
  label: string
  patientId: number | null
  examinationId: number | null
}

const patientExaminationOptions = ref<PatientExaminationOption[]>([])
const patientExaminationOptionsLoading = ref(false)
const patientExaminationOptionsError = ref<string | null>(null)
const routePatientExaminationId = computed<number | null>(() => {
  const parsed = Number(route.params.patient_examination_id)
  if (!Number.isFinite(parsed)) return null
  return parsed > 0 ? parsed : null
})
const selectedPatientExaminationId = computed(() =>
  routePatientExaminationId.value ?? flow.patientExaminationId ?? ''
)

const pe = computed(() => flow.patientExaminationId || ':patient_examination_id')

const navItems = computed(() => [
  { label: 'Arbeitsliste', to: '/reporting' },
  { label: 'Fall-Setup', to: '/reporting/case-setup' },
  { label: 'Klinische Dokumentation', to: `/reporting/${pe.value}/findings` },
  { label: 'Berichtseditor', to: `/reporting/${pe.value}/report-editor` },
  { label: 'Frame-Auswahl', to: `/reporting/${pe.value}/frame-selector` },
  { label: 'Finalisierung', to: `/reporting/${pe.value}/finalized` }
])

const preferredReportStream = computed(() =>
  pickPreferredStream(flow.mediaPreload?.latestReport?.streamOptions || [])
)

const preferredReportDownload = computed(() =>
  preferredReportStream.value ? `${preferredReportStream.value}${preferredReportStream.value.includes('?') ? '&' : '?'}download=1` : null
)

const preferredVideoStream = computed(() =>
  pickPreferredStream(flow.mediaPreload?.latestVideo?.streamOptions || [])
)

function openUrl(url: string | null) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function selectVideoStream(url: string | null) {
  selectedVideoStreamUrl.value = url
}

function selectFrameStream(url: string | null) {
  selectedFrameStreamUrl.value = url
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizePatientExaminationOption(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, any>
  const id = toPositiveInteger(row.id)
  if (id === null) return null
  const examinationName =
    (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
    (typeof row.examination?.name === 'string' && row.examination.name.trim()) ||
    (typeof row.examination === 'string' && row.examination.trim()) ||
    'Untersuchung'
  const dateStartRaw =
    typeof row.date_start === 'string'
      ? row.date_start
      : typeof row.dateStart === 'string'
        ? row.dateStart
        : ''
  const dateLabel = dateStartRaw ? new Date(dateStartRaw).toLocaleDateString('de-DE') : ''
  return {
    id,
    label: dateLabel ? `#${id} · ${examinationName} · ${dateLabel}` : `#${id} · ${examinationName}`,
    patientId: toPositiveInteger(row.patient?.id ?? row.patient_id ?? row.patientId),
    examinationId: toPositiveInteger(row.examination?.id ?? row.examination_id ?? row.examinationId)
  }
}

function upsertPatientExaminationOption(option: {
  id: number
  label: string
  patientId: number | null
  examinationId: number | null
}) {
  const next = patientExaminationOptions.value.slice()
  const index = next.findIndex((entry) => entry.id === option.id)
  if (index >= 0) next[index] = option
  else next.push(option)
  patientExaminationOptions.value = next.sort(
    (left: PatientExaminationOption, right: PatientExaminationOption) => right.id - left.id
  )
}

async function fetchPatientExaminationOptions(patientId: number) {
  patientExaminationOptionsLoading.value = true
  patientExaminationOptionsError.value = null
  try {
    const response = await axiosInstance.get(r(endpoints.examination.patientExaminationList), {
      params: { patient_id: patientId }
    })
    const rows = Array.isArray(response.data?.results)
      ? response.data.results
      : Array.isArray(response.data)
        ? response.data
        : []
    patientExaminationOptions.value = rows
      .map(normalizePatientExaminationOption)
      .filter(
        (
          option: ReturnType<typeof normalizePatientExaminationOption>
        ): option is PatientExaminationOption => option !== null
      )
      .sort(
        (left: PatientExaminationOption, right: PatientExaminationOption) => right.id - left.id
      )
  } catch (error: any) {
    patientExaminationOptions.value = []
    patientExaminationOptionsError.value =
      error?.response?.data?.detail || error?.message || 'Patientenuntersuchungen konnten nicht geladen werden.'
  } finally {
    patientExaminationOptionsLoading.value = false
  }
}

async function ensureCurrentPatientExaminationOption(patientExaminationId: number) {
  const exists = patientExaminationOptions.value.some((entry) => entry.id === patientExaminationId)
  if (exists) return
  try {
    const response = await axiosInstance.get(
      r(endpoints.examination.patientExaminationDetail(patientExaminationId))
    )
    const option = normalizePatientExaminationOption(response.data)
    if (option) upsertPatientExaminationOption(option)
  } catch {
    // Keep the selector usable even if detail hydration fails.
  }
}

function getNavigationTargetForPatientExamination(patientExaminationId: number): string {
  const match = route.path.match(/^\/reporting\/[^/]+\/(.+)$/)
  return match
    ? `/reporting/${patientExaminationId}/${match[1]}`
    : `/reporting/${patientExaminationId}/findings`
}

async function onPatientExaminationSelect(rawValue: string) {
  const patientExaminationId = toPositiveInteger(rawValue)
  if (patientExaminationId === null) return
  const selectedOption = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) ?? null

  flow.setCaseSelection({
    selectedPatientId: selectedOption?.patientId ?? flow.selectedPatientId,
    selectedExaminationId: selectedOption?.examinationId ?? flow.selectedExaminationId
  })
  flow.setLookupSession({
    patientExaminationId,
    lookupToken: null,
    status: 'idle'
  })

  await router.push(getNavigationTargetForPatientExamination(patientExaminationId))
}

async function refreshMediaPreload() {
  if (!flow.selectedPatientId) {
    flow.clearMediaPreload()
    return
  }
  const patientExaminationId = routePatientExaminationId.value || flow.patientExaminationId
  flow.setMediaPreloadLoading()
  try {
    const payload = await fetchPatientTimelineLatest(
      {
        patientId: flow.selectedPatientId,
        patientExaminationId
      }
    )
    flow.setMediaPreload(payload)
    selectedVideoStreamUrl.value = pickPreferredStream(payload.latestVideo?.streamOptions || [])
    selectedFrameStreamUrl.value = payload.latestFrames[0]?.streamUrl || null
  } catch (error: any) {
    const status = error?.response?.status
    const detail = error?.response?.data?.detail || error?.message
    const message = status === 404
      ? 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
      : status === 400
        ? 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.'
        : status === 403
          ? 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.'
          : `Fehler beim Laden des Medien-Preloads: ${detail || 'unbekannt'}`
    flow.setMediaPreloadError(message)
  }
}

function isActive(path: string): boolean {
  return route.path === path
}

watch(
  [() => flow.selectedPatientId, routePatientExaminationId],
  async ([patientId, patientExaminationId]) => {
    if (patientId) {
      await fetchPatientExaminationOptions(patientId)
    } else {
      patientExaminationOptions.value = []
      patientExaminationOptionsError.value = null
    }

    if (patientExaminationId) {
      await ensureCurrentPatientExaminationOption(patientExaminationId)
    }
  },
  { immediate: true }
)

watch(
  [() => flow.selectedPatientId, () => flow.patientExaminationId, routePatientExaminationId],
  async ([patientId]) => {
    if (!patientId) {
      flow.clearMediaPreload()
      return
    }
    await refreshMediaPreload()
  },
  { immediate: true }
)
</script>

<style scoped>
.reporting-shell {
  position: relative;
  isolation: isolate;
}

.reporting-shell .row > [class*='col-'] {
  min-width: 0;
}

.reporting-shell .card {
  border: 1px solid #d6dce7;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.reporting-shell .card-header {
  background: linear-gradient(180deg, #f9fbff, #eef3fb);
  color: #172234;
  border-bottom: 1px solid #d6dce7;
}

.reporting-shell .card-body {
  background: #fff;
  color: #1f2a37;
}

.reporting-shell .text-muted {
  color: #4b5565 !important;
}

.reporting-shell .workflow-step-btn {
  display: block;
  width: 100%;
  white-space: normal;
  text-decoration: none;
  font-weight: 600;
  line-height: 1.3;
  border-width: 1px;
  border-style: solid;
}

.reporting-shell .workflow-step-btn.is-inactive {
  color: #1f2a37 !important;
  background-color: #f7f9fc;
  border-color: #cbd5e1;
}

.reporting-shell .workflow-step-btn.is-inactive:hover,
.reporting-shell .workflow-step-btn.is-inactive:focus-visible {
  color: #111827 !important;
  background-color: #e8eef7;
  border-color: #b6c4d8;
}

.reporting-shell .workflow-step-btn.is-active {
  color: #fff !important;
  background-color: #243247 !important;
  border-color: #243247 !important;
  box-shadow: 0 6px 14px rgba(16, 24, 40, 0.24);
}

.reporting-shell .workflow-step-btn:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 1px;
}

@media (max-width: 991.98px) {
  .reporting-shell {
    padding-inline: 0.5rem;
  }
}
</style>
