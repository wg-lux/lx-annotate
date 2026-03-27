<template>
  <div class="reporting-shell container-fluid py-4">
    <div class="card shadow-sm mb-3 reporting-context-card">
      <div class="card-body">
        <div class="d-flex flex-column flex-xl-row align-items-xl-start justify-content-between gap-3">
          <div class="reporting-context-main">
            <div class="small text-uppercase text-muted fw-semibold tracking-label">Berichtsarbeitsplatz</div>
            <h4 class="mb-2">Fallkontext und Arbeitsbereich</h4>
            <p class="text-muted mb-0">
              Wählen Sie zuerst eine Patientenuntersuchung. Danach führen die Arbeitsschritte von
              den Befunden bis zum fertigen Bericht.
            </p>
          </div>
          <div class="reporting-context-summary">
            <div class="context-summary-grid">
              <div class="context-summary-item">
                <span class="context-summary-label">Aktueller Schritt</span>
                <strong>{{ currentStepLabel }}</strong>
              </div>
              <div class="context-summary-item">
                <span class="context-summary-label">Patientenuntersuchung</span>
                <strong>{{ selectedPatientExaminationLabel }}</strong>
              </div>
              <div class="context-summary-item">
                <span class="context-summary-label">Berichtsvorlage</span>
                <strong>{{ selectedTemplateLabel }}</strong>
              </div>
              <div class="context-summary-item">
                <span class="context-summary-label">Entwurfsstatus</span>
                <strong>{{ draftSummaryLongLabel }}</strong>
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3 mt-3">
          <div class="context-case-select">
            <label class="form-label form-label-sm mb-1">Patientenuntersuchung wählen</label>
            <select
              class="form-select"
              data-testid="patient-examination-select"
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
          <div class="d-flex flex-wrap gap-2">
            <button
              class="btn btn-outline-secondary"
              :disabled="flow.mediaPreloadStatus === 'loading' || !flow.selectedPatientId"
              @click="refreshMediaPreload"
            >
              Medien aktualisieren
            </button>
            <button
              class="btn btn-outline-secondary"
              type="button"
              @click="isContextPanelOpen = !isContextPanelOpen"
            >
              {{ isContextPanelOpen ? 'Arbeitskontext ausblenden' : 'Arbeitskontext einblenden' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-3">
        <div class="card shadow-sm">
          <div class="card-header">
            <h6 class="mb-0">Arbeitsschritte</h6>
          </div>
          <div class="card-body p-3">
            <p class="small text-muted mb-3">
              Folgen Sie dem Ablauf von der Falldatenpflege bis zum Abschluss. Nicht verfügbare
              Schritte werden erst nach Auswahl einer Patientenuntersuchung freigeschaltet.
            </p>
            <div v-if="draftBootstrapError" class="alert alert-warning py-2 mb-3">
              {{ draftBootstrapError }}
            </div>
            <nav class="nav flex-column gap-1">
              <template v-for="item in navItems" :key="item.to">
                <RouterLink
                  v-if="!isStepDisabled(item)"
                  :to="item.to"
                  class="workflow-step-btn btn btn-sm text-start"
                  :class="isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive'"
                >
                  <span>{{ item.label }}</span>
                  <span class="workflow-step-meta">{{ stepStatusLabel(item) }}</span>
                </RouterLink>
                <div
                  v-else
                  class="workflow-step-btn btn btn-sm text-start is-disabled"
                >
                  <span>{{ item.label }}</span>
                  <span class="workflow-step-meta">{{ stepStatusLabel(item) }}</span>
                </div>
              </template>
            </nav>
          </div>
        </div>
      </div>

      <div class="col-lg-9">
        <div v-if="isContextPanelOpen" class="card shadow-sm mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">Arbeitskontext</h6>
              <small class="text-muted">Medien, Entwurfsstatus und letzte Dokumente</small>
            </div>
            <small class="text-muted">
              Medienstatus: <strong>{{ mediaPreloadLabel }}</strong>
            </small>
          </div>
          <div class="card-body">
            <div class="row g-3 mb-3">
              <div class="col-md-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-1">Entwurf</div>
                  <div class="small text-muted">
                    {{ draftSummaryLongLabel }}
                  </div>
                  <div class="small text-muted mt-1">
                    Patientenuntersuchung: {{ selectedPatientExaminationLabel }}
                  </div>
                  <div class="small text-muted mt-1">
                    Berichtsvorlage: {{ selectedTemplateLabel }}
                  </div>
                  <div v-if="draftBootstrapError" class="alert alert-warning py-2 mt-2 mb-0">
                    {{ draftBootstrapError }}
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-1">Medien-Preload</div>
                  <div class="small text-muted">
                    Status: <strong>{{ mediaPreloadLabel }}</strong>
                  </div>
                  <div v-if="flow.mediaPreloadError" class="alert alert-warning py-2 mt-2 mb-0">
                    {{ flow.mediaPreloadError }}
                  </div>
                  <div v-else class="small text-muted mt-2">
                    Letzte Medien und Dokumente helfen beim Arbeiten im Befund- und Berichtsschritt.
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-1">Nächster Schritt</div>
                  <div class="small text-muted">
                    {{ nextStepHint }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="flow.mediaPreload" class="row g-3">
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
            <div v-else class="small text-muted">
              Noch keine zuletzt geladenen Medien verfügbar.
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
import { findingsApi } from '@/api/findingsApi'
import { fetchPatientExaminationDraft } from '@/api/reportDraftApi'
import { buildReportTemplateRuntimePayload, fetchReportTemplatesByExamination } from '@/api/reportTemplatesApi'
import type { Finding } from '@/api/findings.contract'
import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate'
import { endpoints } from '@/types/api/endpoints'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { fetchPatientTimelineLatest, pickPreferredStream } from '@/api/reportingTimelineApi'

const route = useRoute()
const router = useRouter()
const flow = useReportingFlowStore()
const selectedVideoStreamUrl = ref<string | null>(null)
const selectedFrameStreamUrl = ref<string | null>(null)
const isContextPanelOpen = ref(true)
type PatientExaminationOption = {
  id: number
  label: string
  patientId: number | null
  examinationId: number | null
}

const patientExaminationOptions = ref<PatientExaminationOption[]>([])
const patientExaminationOptionsLoading = ref(false)
const patientExaminationOptionsError = ref<string | null>(null)
const draftBootstrapInFlight = ref<Promise<void> | null>(null)
const draftBootstrapError = ref<string | null>(null)
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
  { label: 'Berichtsvorlagen', to: '/reporting/template-builder', requiresPatientExamination: false },
  { label: 'Arbeitsliste', to: '/reporting', requiresPatientExamination: false },
  { label: 'Falldaten', to: '/reporting/case-setup', requiresPatientExamination: false },
  { label: 'Befunde', to: `/reporting/${pe.value}/findings`, requiresPatientExamination: true },
  { label: 'Bericht schreiben', to: `/reporting/${pe.value}/report-editor`, requiresPatientExamination: true },
  { label: 'Bilder auswählen', to: `/reporting/${pe.value}/frame-selector`, requiresPatientExamination: true },
  { label: 'Abschluss', to: `/reporting/${pe.value}/finalized`, requiresPatientExamination: true }
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

const draftSummaryLabel = computed(() => {
  const draft = flow.currentRuntimeDraft
  if (!draft) return 'leer'
  return draft.hydratedFrom === 'session_storage' || draft.hydratedFrom === 'draft_api'
    ? 'wiederhergestellt'
    : 'initialisiert'
})

const draftSummaryLongLabel = computed(() => {
  if (!flow.currentRuntimeDraft) return 'Noch kein Entwurf geladen'
  return draftSummaryLabel.value === 'wiederhergestellt'
    ? 'Entwurf wurde aus einem vorhandenen Stand wiederhergestellt'
    : 'Entwurf wurde für den aktuellen Fall vorbereitet'
})

const selectedPatientExaminationLabel = computed(() => {
  const selected = patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value)
    || patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId)
    || null
  if (selected) return selected.label
  return flow.patientExaminationId ? `#${flow.patientExaminationId}` : 'Noch nicht gewählt'
})

const selectedTemplateLabel = computed(() =>
  flow.selectedTemplateName || 'Noch keine Vorlage gewählt'
)

const currentStepLabel = computed(() => {
  const current = navItems.value.find((item) => isActive(item.to))
  return current?.label || 'Arbeitsbereich'
})

const mediaPreloadLabel = computed(() => {
  if (flow.mediaPreloadStatus === 'idle') return 'nicht geladen'
  if (flow.mediaPreloadStatus === 'loading') return 'wird geladen'
  if (flow.mediaPreloadStatus === 'error') return 'Fehler'
  return 'bereit'
})

const nextStepHint = computed(() => {
  if (!flow.patientExaminationId) {
    return 'Wählen Sie zuerst eine Patientenuntersuchung, um Befunde und Bericht zu bearbeiten.'
  }
  if (!flow.currentRuntimeDraft) {
    return 'Der Entwurf wird vorbereitet. Danach können Sie direkt mit den Befunden starten.'
  }
  if (route.path.includes('/report-editor')) {
    return 'Bericht prüfen, Text ergänzen und anschließend zum Abschluss wechseln.'
  }
  if (route.path.includes('/frame-selector')) {
    return 'Passende Bilder auswählen und danach den Bericht abschließen.'
  }
  return 'Beginnen Sie mit den Befunden und arbeiten Sie sich dann zum Bericht vor.'
})

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

function resolvePatientKey(raw: Record<string, any>, patientExaminationId: number): string {
  const patient = raw.patient && typeof raw.patient === 'object' ? raw.patient : null
  const patientHash =
    (typeof patient?.patient_hash === 'string' && patient.patient_hash.trim()) ||
    (typeof patient?.patientHash === 'string' && patient.patientHash.trim()) ||
    (typeof raw.patient_hash === 'string' && raw.patient_hash.trim()) ||
    (typeof raw.patientHash === 'string' && raw.patientHash.trim())
  if (patientHash) return patientHash
  const patientId = toPositiveInteger(patient?.id ?? raw.patient_id ?? raw.patientId)
  return patientId ? `patient_${patientId}` : `patient_examination_${patientExaminationId}`
}

function extractExaminers(raw: Record<string, any>): string[] {
  const candidates = [
    raw.examiners,
    raw.examiner_names,
    raw.examinerNames,
    raw.examination?.examiners,
    raw.examination?.examiner_names,
    raw.examination?.examinerNames
  ]

  const values = candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) return []
    return candidate
      .map((entry) => {
        if (typeof entry === 'string') {
          const normalized = entry.trim()
          return normalized || null
        }

        if (!entry || typeof entry !== 'object') return null
        const row = entry as Record<string, unknown>
        const examinerKey =
          (typeof row.examiner_hash === 'string' && row.examiner_hash.trim()) ||
          (typeof row.examinerHash === 'string' && row.examinerHash.trim()) ||
          (typeof row.username === 'string' && row.username.trim()) ||
          (typeof row.email === 'string' && row.email.trim()) ||
          (typeof row.display_name === 'string' && row.display_name.trim()) ||
          (typeof row.displayName === 'string' && row.displayName.trim()) ||
          (typeof row.full_name === 'string' && row.full_name.trim()) ||
          (typeof row.fullName === 'string' && row.fullName.trim()) ||
          (typeof row.name === 'string' && row.name.trim())
        if (examinerKey) return examinerKey

        const firstName =
          (typeof row.first_name === 'string' && row.first_name.trim()) ||
          (typeof row.firstName === 'string' && row.firstName.trim()) ||
          ''
        const lastName =
          (typeof row.last_name === 'string' && row.last_name.trim()) ||
          (typeof row.lastName === 'string' && row.lastName.trim()) ||
          ''
        const fullName = `${firstName} ${lastName}`.trim()
        if (fullName) return fullName

        const examinerId = toPositiveInteger(row.id)
        return examinerId ? `examiner_${examinerId}` : null
      })
      .filter((value): value is string => Boolean(value))
  })

  return Array.from(new Set(values))
}

function extractExaminationName(raw: Record<string, any>): string {
  return (
    (typeof raw.examination?.name === 'string' && raw.examination.name.trim()) ||
    (typeof raw.examination_name === 'string' && raw.examination_name.trim()) ||
    (typeof raw.examination === 'string' && raw.examination.trim()) ||
    ''
  )
}

function extractPatientId(raw: Record<string, any>): number | null {
  return toPositiveInteger(raw.patient?.id ?? raw.patient_id ?? raw.patientId)
}

function extractExaminationId(raw: Record<string, any>): number | null {
  return toPositiveInteger(raw.examination?.id ?? raw.examination_id ?? raw.examinationId)
}

function extractDraftDate(raw: Record<string, any>): string | null {
  const value =
    (typeof raw.date_start === 'string' && raw.date_start) ||
    (typeof raw.dateStart === 'string' && raw.dateStart) ||
    (typeof raw.date === 'string' && raw.date) ||
    null
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function extractIndicationRows(raw: Record<string, any>) {
  const nestedExamination =
    raw.examination && typeof raw.examination === 'object'
      ? (raw.examination as Record<string, unknown>)
      : null

  const candidates = [
    raw.indications,
    raw.examination_indications,
    raw.examinationIndications,
    nestedExamination?.indications,
    nestedExamination?.examination_indications,
    nestedExamination?.examinationIndications
  ]

  const rows = candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) return []
    return candidate
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const row = entry as Record<string, unknown>
        const examinationIndicationId = toPositiveInteger(
          row.examinationIndicationId ??
            row.examination_indication_id ??
            row.indicationId ??
            row.indication_id ??
            row.id
        )
        const indicationChoiceId = toPositiveInteger(
          row.indicationChoiceId ??
            row.indication_choice_id ??
            row.choiceId ??
            row.choice_id ??
            (row.choice as Record<string, unknown> | undefined)?.id
        )
        if (examinationIndicationId == null) return null
        return {
          examinationIndicationId,
          indicationChoiceId
        }
      })
      .filter(
        (
          row
        ): row is { examinationIndicationId: number; indicationChoiceId: number | null } =>
          row !== null
      )
  })

  if (!rows.length) {
    return [{ examinationIndicationId: null, indicationChoiceId: null }]
  }

  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = `${row.examinationIndicationId}:${row.indicationChoiceId ?? 'null'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isRuntimePayload(value: unknown): value is ReportTemplateRuntimePayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    typeof payload.patient === 'string' &&
    Array.isArray(payload.examiners) &&
    typeof payload.examination === 'string' &&
    Array.isArray(payload.patientFindings)
  )
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

  flow.setPatientExaminationContext({
    patientExaminationId,
    selectedPatientId: selectedOption?.patientId ?? flow.selectedPatientId,
    selectedExaminationId: selectedOption?.examinationId ?? flow.selectedExaminationId
  })

  await router.push(getNavigationTargetForPatientExamination(patientExaminationId))
}

async function bootstrapRuntimeDraft(
  patientExaminationId: number,
  option: PatientExaminationOption | null
) {
  const detailResponse = await axiosInstance.get(
    r(endpoints.examination.patientExaminationDetail(patientExaminationId))
  )
  const detail =
    detailResponse.data && typeof detailResponse.data === 'object'
      ? (detailResponse.data as Record<string, any>)
      : {}

  const detailPatientId = extractPatientId(detail)
  const detailExaminationId = extractExaminationId(detail)
  flow.setCaseSelection({
    selectedPatientId: option?.patientId ?? detailPatientId ?? flow.selectedPatientId,
    selectedExaminationId: option?.examinationId ?? detailExaminationId ?? flow.selectedExaminationId
  })

  const examinationName = extractExaminationName(detail)
  const templates = examinationName
    ? await fetchReportTemplatesByExamination(flow.selectedKbModule, examinationName)
    : []
  const selectedTemplate =
    (flow.selectedTemplateName &&
      templates.find((template) => template.name === flow.selectedTemplateName)) ||
    templates[0] ||
    null

  const selectedExaminationId =
    option?.examinationId ??
    detailExaminationId
  const findingCatalog = selectedExaminationId
    ? await findingsApi.getExaminationFindings(selectedExaminationId)
    : []
  const findingsById = new Map<number, Finding>(
    (Array.isArray(findingCatalog) ? findingCatalog : []).map((finding) => [finding.id, finding])
  )

  const payload = await buildReportTemplateRuntimePayload({
    moduleName: flow.selectedKbModule,
    patientExaminationId,
    patient: resolvePatientKey(detail, patientExaminationId),
    examiners: extractExaminers(detail),
    examination: selectedTemplate?.examination || examinationName,
    getFindingById: (findingId) => findingsById.get(findingId)
  })

  flow.setTemplateSelection({
    moduleName: flow.selectedKbModule,
    templateName: selectedTemplate?.name || null
  })
  flow.setIndications(extractIndicationRows(detail))
  flow.setRuntimeDraft({
    draftId: `draft_${patientExaminationId}`,
    patientExaminationId,
    moduleName: flow.selectedKbModule,
    templateName: selectedTemplate?.name || null,
    payload: {
      ...payload,
      ...(extractDraftDate(detail) ? { date: extractDraftDate(detail) } : {})
    },
    hydratedFrom: 'backend_context',
    updatedAt: new Date().toISOString()
  })
}

async function hydrateRuntimeDraftFromDraftApi(
  patientExaminationId: number
): Promise<boolean> {
  const response = await fetchPatientExaminationDraft(patientExaminationId)
  const draft = response?.draft && typeof response.draft === 'object'
    ? response.draft
    : {}
  if (!isRuntimePayload(draft.payload)) {
    flow.markDraftPersistenceHydrated(response?.updated_at ?? null)
    return false
  }

  flow.setTemplateSelection({
    moduleName:
      typeof draft.module_name === 'string' && draft.module_name.trim()
        ? draft.module_name
        : flow.selectedKbModule,
    templateName:
      typeof draft.template_name === 'string' && draft.template_name.trim()
        ? draft.template_name
        : null
  })
  flow.setRuntimeDraft({
    draftId: `draft_${patientExaminationId}`,
    patientExaminationId,
    moduleName:
      typeof draft.module_name === 'string' && draft.module_name.trim()
        ? draft.module_name
        : flow.selectedKbModule,
    templateName:
      typeof draft.template_name === 'string' && draft.template_name.trim()
        ? draft.template_name
        : null,
    payload: draft.payload,
    hydratedFrom: 'draft_api',
    updatedAt: response?.updated_at || new Date().toISOString()
  })
  flow.markDraftPersistenceHydrated(response?.updated_at ?? null)
  return true
}

async function ensureRuntimeDraft(patientExaminationId: number) {
  const existingDraft =
    flow.runtimeDraftsByPatientExaminationId[String(patientExaminationId)] || null
  if (existingDraft) {
    try {
      const detailResponse = await axiosInstance.get(
        r(endpoints.examination.patientExaminationDetail(patientExaminationId))
      )
      const detail =
        detailResponse.data && typeof detailResponse.data === 'object'
          ? (detailResponse.data as Record<string, any>)
          : {}
      flow.setCaseSelection({
        selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
        selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
      })
      flow.setIndications(extractIndicationRows(detail))
    } catch {
      // Keep the local draft usable even if detail hydration fails.
    }
    flow.setTemplateSelection({
      moduleName: existingDraft.moduleName,
      templateName: existingDraft.templateName
    })
    return
  }

  const restoredFromDraftApi = await hydrateRuntimeDraftFromDraftApi(patientExaminationId)
  if (restoredFromDraftApi) {
    try {
      const detailResponse = await axiosInstance.get(
        r(endpoints.examination.patientExaminationDetail(patientExaminationId))
      )
      const detail =
        detailResponse.data && typeof detailResponse.data === 'object'
          ? (detailResponse.data as Record<string, any>)
          : {}
      flow.setCaseSelection({
        selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
        selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
      })
      flow.setIndications(extractIndicationRows(detail))
    } catch {
      // Keep persisted draft usable even if detail hydration fails.
    }
    return
  }

  const option =
    patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null
  await bootstrapRuntimeDraft(patientExaminationId, option)
  flow.markDraftPersistenceHydrated(null)
}

async function hydrateDraftForRoutePatientExamination(patientExaminationId: number) {
  if (draftBootstrapInFlight.value) {
    await draftBootstrapInFlight.value
    return
  }

  const option =
    patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null
  if (
    flow.patientExaminationId !== patientExaminationId ||
    (option?.patientId ?? flow.selectedPatientId) !== flow.selectedPatientId ||
    (option?.examinationId ?? flow.selectedExaminationId) !== flow.selectedExaminationId
  ) {
    flow.setPatientExaminationContext({
      patientExaminationId,
      selectedPatientId: option?.patientId ?? flow.selectedPatientId,
      selectedExaminationId: option?.examinationId ?? flow.selectedExaminationId,
      preserveTemplateSelection: true
    })
  }

  const task = (async () => {
    draftBootstrapError.value = null
    try {
      await ensureRuntimeDraft(patientExaminationId)
    } catch (error: any) {
      draftBootstrapError.value =
        error?.response?.data?.detail ||
        error?.message ||
        'Der lokale Reporting-Entwurf konnte nicht initialisiert werden.'
    } finally {
      draftBootstrapInFlight.value = null
    }
  })()

  draftBootstrapInFlight.value = task
  await task
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

function isStepDisabled(item: { requiresPatientExamination?: boolean }) {
  return Boolean(item.requiresPatientExamination && !flow.patientExaminationId)
}

function stepStatusLabel(item: { to: string; requiresPatientExamination?: boolean }) {
  if (isActive(item.to)) return 'Aktuell'
  if (isStepDisabled(item)) return 'Fall wählen'
  if (item.requiresPatientExamination) return 'Bereit'
  return 'Verfügbar'
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
      await hydrateDraftForRoutePatientExamination(patientExaminationId)
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

.reporting-context-card .card-body {
  padding: 1.25rem;
}

.tracking-label {
  letter-spacing: 0.08em;
}

.reporting-context-main {
  max-width: 38rem;
}

.reporting-context-summary {
  min-width: min(100%, 36rem);
}

.context-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.context-summary-item {
  padding: 0.8rem 0.9rem;
  border: 1px solid #d6dce7;
  border-radius: 0.75rem;
  background: #f9fbff;
}

.context-summary-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #617086;
  margin-bottom: 0.25rem;
}

.context-case-select {
  width: min(100%, 28rem);
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
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

.reporting-shell .workflow-step-btn.is-disabled {
  color: #7b8796 !important;
  background-color: #f4f6f9 !important;
  border-color: #d6dce7 !important;
  cursor: not-allowed;
}

.workflow-step-meta {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.82;
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
