<template>
  <div class="reporting-shell container-fluid py-4">
    <section class="reporting-command-bar mb-3" aria-label="Reporting-Kontext">
      <div class="reporting-command-main">
        <div class="small text-uppercase text-muted fw-semibold tracking-label">Reporting</div>
        <h4 class="mb-3">Bericht erstellen</h4>
        <div class="context-case-select">
          <label class="form-label form-label-sm mb-1">Fall</label>
          <div class="d-flex flex-column flex-lg-row gap-2">
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
            <input
              ref="terminologyZipInput"
              class="visually-hidden"
              type="file"
              accept=".zip,application/zip"
              @change="importTerminologyZip"
            />
            <button
              class="btn btn-outline-secondary"
              type="button"
              :disabled="terminology.importing"
              @click="openTerminologyZipPicker"
            >
              <i class="ni ni-single-copy-04 me-1" aria-hidden="true"></i>
              {{
                terminology.importing ? 'Terminologie wird importiert…' : 'Terminologie importieren'
              }}
            </button>
            <ReportImportPanel @completed="handleReportImportCompleted" />
            <button
              class="btn btn-outline-secondary"
              :disabled="flow.mediaPreloadStatus === 'loading' || !flow.selectedPatientId"
              @click="refreshMediaPreload"
            >
              <i class="ni ni-refresh-02 me-1" aria-hidden="true"></i>
              Medien aktualisieren
            </button>
            <button
              class="btn btn-outline-secondary"
              type="button"
              @click="isContextPanelOpen = !isContextPanelOpen"
            >
              <i class="ni ni-settings-gear-65 me-1" aria-hidden="true"></i>
              {{ isContextPanelOpen ? 'Kontext ausblenden' : 'Kontext einblenden' }}
            </button>
          </div>
          <div v-if="patientExaminationOptionsError" class="small text-danger mt-1">
            {{ patientExaminationOptionsError }}
          </div>
        </div>
      </div>
      <div class="context-summary-grid">
        <div class="context-summary-item is-primary">
          <span class="context-summary-label">Jetzt</span>
          <strong>{{ currentStepLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Patient</span>
          <strong>{{ patientHeaderLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Geburtsdatum</span>
          <strong>{{ patientBirthDateLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Fall-ID</span>
          <strong>{{ caseIdLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Status</span>
          <strong>{{ caseStatusLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Untersuchungstyp</span>
          <strong>{{ examinationTypeLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Vorlage</span>
          <strong>{{ selectedTemplateLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Terminologie</span>
          <strong>{{ selectedTerminologyLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Entwurf</span>
          <strong>{{ draftSummaryLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Medien</span>
          <strong>{{ mediaPreloadLabel }}</strong>
        </div>
      </div>
      <div v-if="terminologyImportMessage" class="small text-muted mt-2">
        {{ terminologyImportMessage }}
      </div>
    </section>

    <div class="reporting-workspace-grid">
      <aside class="reporting-left-rail">
        <div class="card shadow-sm finding-status-panel">
          <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <div>
              <h6 class="mb-0">Befundstatus</h6>
              <small class="text-muted">{{ findingProgressSummary }}</small>
            </div>
            <span class="context-status-pill" :class="validationStatusPillClass">
              {{ validationStatusLabel }}
            </span>
          </div>
          <div class="card-body p-0">
            <div v-if="findingStatusSections.length" class="finding-status-list">
              <section
                v-for="section in findingStatusSections"
                :key="section.key"
                class="finding-status-section"
              >
                <div class="finding-status-section-title">{{ section.title }}</div>
                <RouterLink
                  v-for="row in section.rows"
                  :key="row.key"
                  :to="findingStatusTarget(row)"
                  class="finding-status-row"
                  :class="[
                    `is-${row.status}`,
                    { 'is-selected': row.normalizedKey === activeReferenceFindingKey }
                  ]"
                  @click="selectedReferenceFindingKey = row.normalizedKey"
                >
                  <span class="finding-status-icon" aria-hidden="true">
                    <i :class="row.iconClass"></i>
                  </span>
                  <span class="finding-status-copy">
                    <span class="finding-status-label">{{ row.label }}</span>
                    <span class="finding-status-meta">{{ row.statusLabel }}</span>
                  </span>
                  <span class="finding-status-count">{{ row.instanceCount }}</span>
                </RouterLink>
              </section>
            </div>
            <div v-else class="p-3 small text-muted">
              Noch kein Template oder lokaler Befundentwurf für die Statusliste geladen.
            </div>
          </div>
        </div>

        <div class="card shadow-sm workflow-panel">
          <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <h6 class="mb-0">Ablauf</h6>
            <span class="small text-muted">{{ currentStepLabel }}</span>
          </div>
          <div class="card-body p-3">
            <div v-if="draftBootstrapError" class="alert alert-warning py-2 mb-3">
              {{ draftBootstrapError }}
            </div>
            <nav class="nav flex-column gap-1">
              <template v-for="(item, index) in navItems" :key="item.to">
                <RouterLink
                  v-if="!isStepDisabled(item)"
                  :to="item.to"
                  class="workflow-step-btn btn btn-sm text-start"
                  :aria-current="isActive(item.to) ? 'page' : undefined"
                  :class="
                    isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive'
                  "
                >
                  <span class="workflow-step-index">{{ index + 1 }}</span>
                  <span class="workflow-step-copy">
                    <span>{{ item.label }}</span>
                    <span class="workflow-step-meta">{{ stepStatusLabel(item) }}</span>
                  </span>
                </RouterLink>
                <div v-else class="workflow-step-btn btn btn-sm text-start is-disabled">
                  <span class="workflow-step-index">{{ index + 1 }}</span>
                  <span class="workflow-step-copy">
                    <span>{{ item.label }}</span>
                    <span class="workflow-step-meta">{{ stepStatusLabel(item) }}</span>
                  </span>
                </div>
              </template>
            </nav>
          </div>
        </div>
      </aside>

      <main class="reporting-main-region">
        <div v-if="isContextPanelOpen" class="card shadow-sm mb-3 context-panel">
          <div class="card-header d-flex justify-content-between align-items-center gap-3">
            <div>
              <h6 class="mb-0">Arbeitskontext</h6>
              <small class="text-muted">Fallstatus, Medien und nächste Aktion</small>
            </div>
            <span class="context-status-pill" :class="`is-${flow.mediaPreloadStatus}`">
              {{ mediaPreloadLabel }}
            </span>
          </div>
          <div class="card-body">
            <div class="context-quick-grid mb-3">
              <div class="context-tile">
                <span>Entwurf</span>
                <strong>{{ draftSummaryLabel }}</strong>
                <small>{{ selectedPatientExaminationLabel }}</small>
                <small>{{ selectedTemplateLabel }}</small>
                <div v-if="draftBootstrapError" class="alert alert-warning py-2 mt-2 mb-0">
                  {{ draftBootstrapError }}
                </div>
              </div>
              <div class="context-tile">
                <span>Medien</span>
                <strong>{{ mediaPreloadLabel }}</strong>
                <div v-if="flow.mediaPreloadError" class="alert alert-warning py-2 mt-2 mb-0">
                  {{ flow.mediaPreloadError }}
                </div>
                <small v-else>{{
                  flow.mediaPreload ? 'Bericht, Video und Frames geladen' : 'Noch leer'
                }}</small>
              </div>
              <div class="context-tile">
                <span>Nächster Schritt</span>
                <strong>{{ nextStepHint }}</strong>
              </div>
            </div>
            <div v-if="flow.mediaPreload" class="row g-3">
              <div class="col-md-4">
                <div class="media-context-card">
                  <div class="fw-semibold mb-1">Bericht</div>
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
                        Bericht öffnen
                      </button>
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredReportDownload"
                        @click="openUrl(preferredReportDownload)"
                      >
                        Bericht herunterladen
                      </button>
                    </div>
                  </div>
                  <div v-else class="small text-muted">Kein Bericht verfügbar.</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="media-context-card">
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
                <div class="media-context-card">
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
      </main>

      <aside class="reporting-right-rail">
        <div class="card shadow-sm kb-reference-panel">
          <div class="card-header">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h6 class="mb-0">KB-Referenz</h6>
                <small class="text-muted">{{ kbReferenceSubtitle }}</small>
              </div>
              <span
                v-if="templateReferenceLoading || findingCatalogLoading"
                class="context-status-pill is-loading"
              >
                lädt
              </span>
            </div>
          </div>
          <div class="card-body">
            <div v-if="templateReferenceError" class="alert alert-warning py-2 small">
              {{ templateReferenceError }}
            </div>

            <template v-if="activeReferenceFinding">
              <div class="kb-focus-block mb-3">
                <span>Aktiver Befund</span>
                <strong>{{ activeReferenceFinding.label }}</strong>
                <small>{{ activeFindingDescription }}</small>
              </div>

              <div class="kb-reference-group">
                <h6>Klassifikationen</h6>
                <div v-if="activeReferenceClassifications.length" class="kb-classification-list">
                  <div
                    v-for="classification in activeReferenceClassifications"
                    :key="classification.key"
                    class="kb-classification-row"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ classification.label }}</strong>
                      <span
                        class="kb-classification-precedence"
                        :class="{ 'is-required': classification.required }"
                      >
                        {{ classification.required ? 'erforderlich' : 'optional' }}
                      </span>
                    </div>
                    <small v-if="classification.choicesLabel">
                      {{ classification.choicesLabel }}
                    </small>
                    <small v-if="classification.description">
                      {{ classification.description }}
                    </small>
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Keine Klassifikationen im aktuellen Template hinterlegt.
                </div>
              </div>

              <div class="kb-reference-group">
                <h6>PatientLedger</h6>
                <div v-if="activeFindingInstances.length" class="runtime-instance-list">
                  <div
                    v-for="instance in activeFindingInstances"
                    :key="instance.localId || instance.finding"
                    class="runtime-instance-row"
                  >
                    {{ formatRuntimeFindingInstance(instance) }}
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Keine lokale Instanz dieses Befunds im Entwurf.
                </div>
              </div>

              <div class="kb-reference-group">
                <h6>Regelhinweise</h6>
                <div v-if="activeAdviceRows.length" class="kb-advice-list">
                  <div
                    v-for="row in activeAdviceRows"
                    :key="row.key"
                    class="kb-advice-row"
                    :class="{ 'is-ok': row.ok, 'is-warning': !row.ok }"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ row.title }}</strong>
                      <span>{{ row.kind }}</span>
                    </div>
                    <small>{{ row.detail }}</small>
                    <small v-for="message in row.messages" :key="message">
                      {{ message }}
                    </small>
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Keine kontextbezogenen Laufzeitregeln für diesen Befund.
                </div>
              </div>

              <div v-if="activeSuggestedActions.length" class="kb-reference-group">
                <h6>Vorschläge</h6>
                <div class="kb-suggestion-list">
                  <div
                    v-for="suggestion in activeSuggestedActions"
                    :key="suggestion"
                    class="kb-suggestion-row"
                  >
                    {{ suggestion }}
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="small text-muted">
              Wählen Sie einen Fall mit Template, um die KB-Referenz zu sehen.
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { findingsApi } from '@/api/findingsApi'
import { fetchPatientExaminationDraft } from '@/api/reportDraftApi'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'
import {
  buildReportTemplateRuntimePayload,
  fetchReportTemplateByName,
  fetchReportTemplatesByExamination
} from '@/api/reportTemplatesApi'
import {
  getFindingDisplayName,
  mergeFindingClassifications,
  type Finding,
  type FindingClassification
} from '@/api/findings.contract'
import type {
  InterventionValidatorExecution,
  ReportTemplateFinding,
  ReportTemplatePayload,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimePayload,
  RuntimeValidationIssue,
  UnitValidatorExecution
} from '@/types/reportTemplate'
import { endpoints } from '@/types/api/endpoints'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useTerminologyStore } from '@/stores/terminologyStore'
import {
  fetchPatientTimelineLatest,
  pickPreferredReportStream,
  pickPreferredStream
} from '@/api/reportingTimelineApi'

const route = useRoute()
const router = useRouter()
const flow = useReportingFlowStore()
const terminology = useTerminologyStore()
const selectedVideoStreamUrl = ref<string | null>(null)
const selectedFrameStreamUrl = ref<string | null>(null)
const isContextPanelOpen = ref(true)
const terminologyLoadPromise = ref<Promise<void> | null>(null)
const terminologyZipInput = ref<HTMLInputElement | null>(null)
const terminologyImportMessage = ref('')
type PatientExaminationOption = {
  id: number
  label: string
  examinationName: string
  patientId: number | null
  examinationId: number | null
}

type FindingStatus = 'complete' | 'warning' | 'missing' | 'empty'

type FindingStatusRow = {
  key: string
  normalizedKey: string
  findingName: string
  label: string
  sectionKey: string
  sectionTitle: string
  anchorId: string
  required: boolean
  instanceCount: number
  status: FindingStatus
  statusLabel: string
  iconClass: string
  messages: string[]
  templateFinding: ReportTemplateFinding | null
}

type FindingStatusSection = {
  key: string
  title: string
  rows: FindingStatusRow[]
}

type KbClassificationReference = {
  key: string
  label: string
  required: boolean
  choicesLabel: string
  description: string
}

type KbAdviceRow = {
  key: string
  kind: string
  title: string
  detail: string
  ok: boolean
  messages: string[]
}

const patientExaminationOptions = ref<PatientExaminationOption[]>([])
const patientExaminationOptionsLoading = ref(false)
const patientExaminationOptionsError = ref<string | null>(null)
const draftBootstrapInFlight = ref<Promise<void> | null>(null)
const draftBootstrapError = ref<string | null>(null)
const patientExaminationDetail = ref<Record<string, any> | null>(null)
const templateReference = ref<ReportTemplatePayload | null>(null)
const templateReferenceLoading = ref(false)
const templateReferenceError = ref<string | null>(null)
const templateReferenceKey = ref<string | null>(null)
const selectedReferenceFindingKey = ref<string | null>(null)
const findingCatalog = ref<Finding[]>([])
const findingCatalogLoading = ref(false)
const routePatientExaminationId = computed<number | null>(() => {
  const parsed = Number(route.params.patient_examination_id)
  if (!Number.isFinite(parsed)) return null
  return parsed > 0 ? parsed : null
})
const selectedPatientExaminationId = computed(
  () => routePatientExaminationId.value ?? flow.patientExaminationId ?? ''
)

const pe = computed(() => flow.patientExaminationId || ':patient_examination_id')

const navItems = computed(() => [
  {
    label: 'Berichtsvorlagen',
    to: '/reporting/template-builder',
    requiresPatientExamination: false
  },
  { label: 'Arbeitsliste', to: '/reporting', requiresPatientExamination: false },
  { label: 'Falldaten', to: '/reporting/case-setup', requiresPatientExamination: false },
  { label: 'Befunde', to: `/reporting/${pe.value}/findings`, requiresPatientExamination: true },
  {
    label: 'Bericht schreiben',
    to: `/reporting/${pe.value}/report-editor`,
    requiresPatientExamination: true
  },
  {
    label: 'Bilder auswählen',
    to: `/reporting/${pe.value}/frame-selector`,
    requiresPatientExamination: true
  },
  {
    label: 'Report export',
    to: `/reporting/${pe.value}/report-export`,
    requiresPatientExamination: true
  },
  { label: 'Abschluss', to: `/reporting/${pe.value}/finalized`, requiresPatientExamination: true }
])

const preferredReportStream = computed(() =>
  pickPreferredReportStream(flow.mediaPreload?.latestReport?.streamOptions || [])
)

const preferredReportDownload = computed(() =>
  preferredReportStream.value
    ? `${preferredReportStream.value}${preferredReportStream.value.includes('?') ? '&' : '?'}download=1`
    : null
)

const preferredVideoStream = computed(() =>
  pickPreferredStream(flow.mediaPreload?.latestVideo?.streamOptions || [])
)

const activeKbModule = computed(() =>
  terminology.activeBundle
    ? terminology.activeModuleName
    : flow.selectedKbModule || 'report_template_examples'
)

const draftSummaryLabel = computed(() => {
  const draft = flow.currentRuntimeDraft
  if (!draft) return 'leer'
  return draft.hydratedFrom === 'session_storage' || draft.hydratedFrom === 'draft_api'
    ? 'wiederhergestellt'
    : 'initialisiert'
})

const selectedPatientExaminationLabel = computed(() => {
  const selected =
    patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
    patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
    null
  if (selected) return selected.label
  return flow.patientExaminationId ? `#${flow.patientExaminationId}` : 'Noch nicht gewählt'
})

const selectedTemplateLabel = computed(
  () => flow.selectedTemplateName || 'Noch keine Vorlage gewählt'
)

const selectedTerminologyLabel = computed(() => {
  const field = terminology.medicalFieldLabel
  const bundle = terminology.activeBundle ? terminology.activeBundleLabel : 'Standard-Terminologie'
  return `${field} · ${bundle}`
})

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

const selectedPatientExaminationOption = computed(() => {
  return (
    patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
    patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
    null
  )
})

const currentPayload = computed(() => flow.currentRuntimeDraft?.payload || null)

const caseIdLabel = computed(() =>
  flow.patientExaminationId ? `#${flow.patientExaminationId}` : 'Noch nicht gewählt'
)

const patientHeaderLabel = computed(() => {
  const timelinePatient = flow.mediaPreload?.patient || null
  const timelineName = [timelinePatient?.firstName, timelinePatient?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (timelineName) return timelineName
  if (timelinePatient?.patientHash) return timelinePatient.patientHash

  const detailPatient = readRecord(patientExaminationDetail.value?.patient)
  const detailName = [
    readString(detailPatient, 'firstName', 'first_name', 'givenName', 'given_name'),
    readString(detailPatient, 'lastName', 'last_name', 'familyName', 'family_name')
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (detailName) return detailName

  const detailHash = readString(
    detailPatient,
    'patientHash',
    'patient_hash',
    'hash',
    'pseudonym'
  )
  if (detailHash) return detailHash
  if (currentPayload.value?.patient) return currentPayload.value.patient
  return flow.selectedPatientId ? `Patient #${flow.selectedPatientId}` : 'Nicht gewählt'
})

const patientBirthDateLabel = computed(() => {
  const detailPatient = readRecord(patientExaminationDetail.value?.patient)
  const value =
    flow.mediaPreload?.patient?.dob ||
    readString(
      detailPatient,
      'dob',
      'dateOfBirth',
      'date_of_birth',
      'birthDate',
      'birth_date',
      'patientDob',
      'patient_dob'
    ) ||
    readString(
      patientExaminationDetail.value,
      'patientBirthDate',
      'patient_birth_date',
      'patientDob',
      'patient_dob'
    )
  return formatDateLabel(value) || 'Nicht verfügbar'
})

const examinationTypeLabel = computed(() => {
  return (
    selectedPatientExaminationOption.value?.examinationName ||
    readString(
      readRecord(patientExaminationDetail.value?.examination),
      'displayName',
      'display_name',
      'name'
    ) ||
    readString(patientExaminationDetail.value, 'examinationName', 'examination_name') ||
    currentPayload.value?.examination ||
    'Nicht gewählt'
  )
})

const caseStatusLabel = computed(() => {
  return (
    readString(
      patientExaminationDetail.value,
      'status',
      'workflowStatus',
      'workflow_status',
      'state'
    ) ||
    (flow.lastTemplateValidation
      ? flow.lastTemplateValidation.ok
        ? 'Befund valide'
        : 'Befund offen'
      : flow.currentRuntimeDraft
        ? 'Entwurf'
        : 'Nicht vorbereitet')
  )
})

const validationStatusLabel = computed(() => {
  if (!flow.lastTemplateValidation) return 'ungeprüft'
  return flow.lastTemplateValidation.ok ? 'valide' : 'offen'
})

const validationStatusPillClass = computed(() => {
  if (!flow.lastTemplateValidation) return 'is-idle'
  return flow.lastTemplateValidation.ok ? 'is-ready' : 'is-error'
})

const templateSectionsForReference = computed(() =>
  (templateReference.value?.reportSections || [])
    .slice()
    .sort((left, right) => (left.position || 0) - (right.position || 0))
)

const catalogFindingsByName = computed(() => {
  const entries = findingCatalog.value.map((finding) => [normalizeKey(finding.name), finding] as const)
  return new Map<string, Finding>(entries)
})

const validationIssueMessagesByFinding = computed(() => {
  const grouped = new Map<string, string[]>()
  const addMessages = (findingName: string, messages: string[]) => {
    const key = normalizeKey(findingName)
    const current = grouped.get(key) || []
    grouped.set(key, Array.from(new Set([...current, ...messages.filter(Boolean)])))
  }

  for (const validator of flow.lastTemplateValidation?.findingsValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length) messages.push(`Regel "${validator.name}" ist offen.`)
    addMessages(validator.finding, messages)
  }
  for (const validator of flow.lastTemplateValidation?.classificationValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length) messages.push(`Klassifikation "${validator.classification}" prüfen.`)
    addMessages(validator.finding, messages)
  }
  for (const validator of flow.lastTemplateValidation?.interventionValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length) messages.push(`Intervention "${validator.intervention}" prüfen.`)
    addMessages(validator.finding, messages)
  }
  for (const validator of flow.lastTemplateValidation?.unitValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length) messages.push(`Einheit "${validator.unit}" prüfen.`)
    addMessages(validator.finding, messages)
  }

  return grouped
})

const findingStatusRows = computed<FindingStatusRow[]>(() => {
  const rows: FindingStatusRow[] = []

  for (const section of templateSectionsForReference.value) {
    const sectionKey = normalizeKey(section.name)
    const sectionTitle = formatKnowledgeName(section.name)
    for (const templateFinding of section.findings || []) {
      rows.push(
        buildFindingStatusRow({
          findingName: templateFinding.finding,
          sectionKey,
          sectionTitle,
          required: !!templateFinding.required,
          templateFinding
        })
      )
    }
  }

  if (rows.length) return rows

  return (currentPayload.value?.patientFindings || []).map((finding) =>
    buildFindingStatusRow({
      findingName: finding.finding,
      sectionKey: 'runtime_draft',
      sectionTitle: 'Lokaler Entwurf',
      required: false,
      templateFinding: null
    })
  )
})

const findingStatusSections = computed<FindingStatusSection[]>(() => {
  const sections = new Map<string, FindingStatusSection>()
  for (const row of findingStatusRows.value) {
    if (!sections.has(row.sectionKey)) {
      sections.set(row.sectionKey, {
        key: row.sectionKey,
        title: row.sectionTitle,
        rows: []
      })
    }
    sections.get(row.sectionKey)?.rows.push(row)
  }
  return Array.from(sections.values())
})

const findingProgressSummary = computed(() => {
  const rows = findingStatusRows.value
  if (!rows.length) return 'Keine Befunde'
  const complete = rows.filter((row) => row.status === 'complete').length
  const open = rows.filter((row) => row.status === 'warning' || row.status === 'missing').length
  return open ? `${complete}/${rows.length} vollständig · ${open} offen` : `${complete}/${rows.length} vollständig`
})

const routeReferenceFindingKey = computed(() => {
  const hash = typeof route.hash === 'string' ? route.hash : ''
  const match = hash.match(/^#finding-(.+)$/)
  return match ? normalizeKey(match[1]) : null
})

const activeReferenceFindingKey = computed(() => {
  const availableKeys = new Set(findingStatusRows.value.map((row) => row.normalizedKey))
  if (selectedReferenceFindingKey.value && availableKeys.has(selectedReferenceFindingKey.value)) {
    return selectedReferenceFindingKey.value
  }
  if (routeReferenceFindingKey.value && availableKeys.has(routeReferenceFindingKey.value)) {
    return routeReferenceFindingKey.value
  }
  return (
    findingStatusRows.value.find((row) => row.status === 'warning' || row.status === 'missing')
      ?.normalizedKey ||
    findingStatusRows.value[0]?.normalizedKey ||
    null
  )
})

const activeReferenceFinding = computed(
  () => findingStatusRows.value.find((row) => row.normalizedKey === activeReferenceFindingKey.value) || null
)

const activeFindingInstances = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) return []
  return instancesForFinding(active.findingName)
})

const activeFindingCatalogDefinition = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) return null
  return catalogFindingsByName.value.get(normalizeKey(active.findingName)) || null
})

const activeFindingDescription = computed(() => {
  const description = activeFindingCatalogDefinition.value?.description?.trim()
  return description || 'Keine Beschreibung in der geladenen KB-Definition.'
})

const activeReferenceClassifications = computed<KbClassificationReference[]>(() => {
  const active = activeReferenceFinding.value
  if (!active) return []

  const templateClassifications = active.templateFinding?.classifications || []
  const catalogClassifications = mergeFindingClassifications(activeFindingCatalogDefinition.value)
  const catalogByName = new Map<string, FindingClassification>(
    catalogClassifications.map((classification) => [normalizeKey(classification.name), classification])
  )
  const templateKeys = templateClassifications.map((classification) =>
    normalizeKey(classification.classification)
  )
  const source =
    templateClassifications.length > 0
      ? templateClassifications.map((classification) => ({
          key: normalizeKey(classification.classification),
          name: classification.classification,
          required: !!classification.required
        }))
      : catalogClassifications.map((classification) => ({
          key: normalizeKey(classification.name),
          name: classification.name,
          required: !!classification.required
        }))

  return source
    .filter((classification, index, all) => {
      if (templateKeys.length && !templateKeys.includes(classification.key)) return false
      return all.findIndex((entry) => entry.key === classification.key) === index
    })
    .map((classification) => {
      const catalog = catalogByName.get(classification.key)
      const choices = (catalog?.choices || [])
        .map((choice) => choice.displayName || choice.name)
        .filter(Boolean)
      return {
        key: classification.key,
        label: catalog?.displayName || formatKnowledgeName(classification.name),
        required: classification.required,
        choicesLabel: choices.length ? `Werte: ${choices.join(', ')}` : '',
        description: catalog?.description || ''
      }
    })
})

const activeAdviceRows = computed<KbAdviceRow[]>(() => {
  const active = activeReferenceFinding.value
  if (!active) return []
  return [
    ...interventionAdviceRows(active.findingName),
    ...unitAdviceRows(active.findingName)
  ]
})

const activeSuggestedActions = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) return []
  const suggestions = [
    ...collectValidatorSuggestions(interventionValidatorsForFinding(active.findingName)),
    ...collectValidatorSuggestions(unitValidatorsForFinding(active.findingName)),
    ...collectIssueSuggestions(flow.lastTemplateValidation?.issues || [])
  ]
  return Array.from(new Set(suggestions))
})

const kbReferenceSubtitle = computed(() => {
  const moduleName = flow.selectedKbModule || activeKbModule.value
  const templateName = templateReference.value?.name || flow.selectedTemplateName
  if (!templateName) return `${moduleName} · kein Template`
  return `${moduleName} · ${templateName}`
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

function openTerminologyZipPicker() {
  terminologyImportMessage.value = ''
  terminologyZipInput.value?.click()
}

async function importTerminologyZip(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  terminologyImportMessage.value = ''
  try {
    await terminology.importBundle(file)
    terminologyImportMessage.value = 'Terminologiepaket importiert und geladen.'
  } catch (error: any) {
    terminologyImportMessage.value =
      terminology.error ||
      error?.response?.data?.detail ||
      error?.message ||
      'Terminologiepaket konnte nicht importiert werden.'
  } finally {
    input.value = ''
  }
}

function readRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function readString(
  record: Record<string, any> | null | undefined,
  ...keys: string[]
): string | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function formatKnowledgeName(value: string): string {
  const normalized = value.replace(/[_-]/g, ' ').trim()
  if (!normalized) return 'Unbenannt'
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('de-DE')
}

function findingAnchorId(findingName: string): string {
  return `finding-${normalizeKey(findingName)}`
}

function getFindingLabel(findingName: string): string {
  const finding = catalogFindingsByName.value.get(normalizeKey(findingName))
  return finding ? getFindingDisplayName(finding) : formatKnowledgeName(findingName)
}

function instancesForFinding(findingName: string): ReportTemplateRuntimePatientFindingInput[] {
  const key = normalizeKey(findingName)
  return (currentPayload.value?.patientFindings || []).filter(
    (finding) => normalizeKey(finding.finding) === key
  )
}

function requiredClassificationsMissing(
  templateFinding: ReportTemplateFinding | null,
  instances: ReportTemplateRuntimePatientFindingInput[]
): string[] {
  const required = (templateFinding?.classifications || []).filter(
    (classification) => classification.required
  )
  return required
    .filter((classification) => {
      const key = normalizeKey(classification.classification)
      return !instances.some((instance) =>
        instance.classificationChoices.some(
          (choice) =>
            normalizeKey(choice.classification) === key &&
            typeof choice.classificationChoice === 'string' &&
            choice.classificationChoice.trim()
        )
      )
    })
    .map((classification) => formatKnowledgeName(classification.classification))
}

function buildFindingStatusRow(params: {
  findingName: string
  sectionKey: string
  sectionTitle: string
  required: boolean
  templateFinding: ReportTemplateFinding | null
}): FindingStatusRow {
  const normalizedKey = normalizeKey(params.findingName)
  const instances = instancesForFinding(params.findingName)
  const validationMessages = validationIssueMessagesByFinding.value.get(normalizedKey) || []
  const missingClassifications = requiredClassificationsMissing(params.templateFinding, instances)
  const messages = Array.from(
    new Set([
      ...validationMessages,
      ...(params.required && !instances.length ? ['Dieser Befund ist im Template erforderlich.'] : []),
      ...(missingClassifications.length
        ? [`Erforderliche Klassifikationen fehlen: ${missingClassifications.join(', ')}.`]
        : [])
    ])
  )

  let status: FindingStatus = 'empty'
  if (params.required && !instances.length) status = 'missing'
  else if (validationMessages.length || missingClassifications.length) status = 'warning'
  else if (instances.length) status = 'complete'

  return {
    key: `${params.sectionKey}:${normalizedKey}`,
    normalizedKey,
    findingName: params.findingName,
    label: getFindingLabel(params.findingName),
    sectionKey: params.sectionKey,
    sectionTitle: params.sectionTitle,
    anchorId: findingAnchorId(params.findingName),
    required: params.required,
    instanceCount: instances.length,
    status,
    statusLabel: findingStatusLabel(status, params.required),
    iconClass: findingStatusIconClass(status),
    messages,
    templateFinding: params.templateFinding
  }
}

function findingStatusLabel(status: FindingStatus, required: boolean): string {
  if (status === 'complete') return 'vollständig'
  if (status === 'warning') return 'prüfen'
  if (status === 'missing') return 'fehlt'
  return required ? 'offen' : 'optional'
}

function findingStatusIconClass(status: FindingStatus): string {
  if (status === 'complete') return 'ni ni-check-bold'
  if (status === 'warning') return 'ni ni-alert-circle-exc'
  if (status === 'missing') return 'ni ni-fat-remove'
  return 'ni ni-fat-add'
}

function findingStatusTarget(row: FindingStatusRow) {
  const patientExaminationId = flow.patientExaminationId || routePatientExaminationId.value
  if (!patientExaminationId) return { path: route.path, hash: `#${row.anchorId}` }
  return {
    path: `/reporting/${patientExaminationId}/findings`,
    hash: `#${row.anchorId}`
  }
}

function validatorsForFinding<T extends { finding: string }>(
  validators: T[] | undefined,
  findingName: string
): T[] {
  const key = normalizeKey(findingName)
  return (validators || []).filter((validator) => normalizeKey(validator.finding) === key)
}

function interventionValidatorsForFinding(findingName: string): InterventionValidatorExecution[] {
  return validatorsForFinding(flow.lastTemplateValidation?.interventionValidators, findingName)
}

function unitValidatorsForFinding(findingName: string): UnitValidatorExecution[] {
  return validatorsForFinding(flow.lastTemplateValidation?.unitValidators, findingName)
}

function interventionAdviceRows(findingName: string): KbAdviceRow[] {
  return interventionValidatorsForFinding(findingName).map((validator) => ({
    key: `intervention:${validator.name}`,
    kind: 'Intervention',
    title: formatKnowledgeName(validator.intervention),
    detail: validator.ok ? 'Regel erfüllt' : `Erforderlich nach Regel "${validator.name}"`,
    ok: validator.ok,
    messages: validator.issues.map((issue) => issue.message)
  }))
}

function unitAdviceRows(findingName: string): KbAdviceRow[] {
  return unitValidatorsForFinding(findingName).map((validator) => ({
    key: `unit:${validator.name}`,
    kind: 'Einheit',
    title: validator.unit,
    detail: validator.ok
      ? `${formatKnowledgeName(validator.classification)} verwendet die erwartete Einheit.`
      : `${formatKnowledgeName(validator.classification)} erwartet "${validator.unit}".`,
    ok: validator.ok,
    messages: validator.issues.map((issue) => issue.message)
  }))
}

function collectIssueSuggestions(issues: RuntimeValidationIssue[]): string[] {
  return issues.flatMap((issue) => [
    ...extractStringList(issue.details?.suggestedActions),
    ...extractStringList(issue.details?.suggested_actions),
    ...extractStringList(issue.details?.recommendations)
  ])
}

function collectValidatorSuggestions(
  validators: Array<{ hint: Record<string, unknown>; issues: RuntimeValidationIssue[] }>
): string[] {
  return validators.flatMap((validator) => [
    ...extractStringList(validator.hint?.suggestedActions),
    ...extractStringList(validator.hint?.suggested_actions),
    ...extractStringList(validator.hint?.suggestions),
    ...extractStringList(validator.hint?.recommendations),
    ...collectIssueSuggestions(validator.issues)
  ])
}

function extractStringList(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      if (!entry || typeof entry !== 'object') return ''
      const record = entry as Record<string, unknown>
      return (
        (typeof record.label === 'string' && record.label.trim()) ||
        (typeof record.message === 'string' && record.message.trim()) ||
        (typeof record.action === 'string' && record.action.trim()) ||
        ''
      )
    })
    .filter((entry): entry is string => Boolean(entry))
}

function formatRuntimeFindingInstance(instance: ReportTemplateRuntimePatientFindingInput): string {
  if (!instance.classificationChoices.length) return 'Keine Klassifikation gesetzt'
  return instance.classificationChoices
    .map((choice) => {
      const descriptors = choice.descriptors
        .map((descriptor) => `${formatKnowledgeName(descriptor.classificationChoiceDescriptor)}: ${descriptor.descriptorValue}`)
        .join(', ')
      const base = `${formatKnowledgeName(choice.classification)} = ${formatKnowledgeName(choice.classificationChoice)}`
      return descriptors ? `${base} (${descriptors})` : base
    })
    .join(' · ')
}

function ensureTerminologyBundlesLoaded(): Promise<void> {
  if (terminology.activeBundle || terminology.bundles.length || terminology.error) {
    return Promise.resolve()
  }
  if (terminologyLoadPromise.value) return terminologyLoadPromise.value

  const task = terminology
    .loadBundles()
    .catch((error) => {
      console.error('Failed to load terminology bundles:', error)
    })
    .finally(() => {
      terminologyLoadPromise.value = null
    })
  terminologyLoadPromise.value = task
  return task
}

async function loadTemplateReferenceForSelection() {
  const moduleName = flow.selectedKbModule || activeKbModule.value
  const templateName = flow.selectedTemplateName
  if (!moduleName || !templateName) {
    templateReference.value = null
    templateReferenceKey.value = null
    templateReferenceError.value = null
    return
  }

  const nextKey = `${moduleName}:${templateName}`
  if (templateReferenceKey.value === nextKey && templateReference.value) return

  templateReferenceLoading.value = true
  templateReferenceError.value = null
  templateReferenceKey.value = nextKey
  try {
    const payload = await fetchReportTemplateByName(moduleName, templateName)
    if (templateReferenceKey.value !== nextKey) return
    templateReference.value = payload
  } catch (error: any) {
    if (templateReferenceKey.value !== nextKey) return
    templateReference.value = null
    templateReferenceError.value =
      error?.response?.data?.detail ||
      error?.message ||
      'KB-Referenz konnte nicht geladen werden.'
  } finally {
    if (templateReferenceKey.value === nextKey) {
      templateReferenceLoading.value = false
    }
  }
}

async function loadFindingCatalogForExamination(examinationId: number | null | undefined) {
  if (!examinationId) {
    findingCatalog.value = []
    return
  }
  findingCatalogLoading.value = true
  try {
    const rows = await findingsApi.getExaminationFindings(examinationId)
    findingCatalog.value = Array.isArray(rows) ? rows : []
  } catch {
    findingCatalog.value = []
  } finally {
    findingCatalogLoading.value = false
  }
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

function isGastroenterologyExaminationName(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  return [
    'gastro',
    'kolon',
    'colon',
    'colo',
    'rekt',
    'rect',
    'endoskop',
    'endoscop',
    'gastroskop',
    'gastroscop',
    'koloskop',
    'colonoscop',
    'colonoscopy',
    'magen',
    'darm',
    'duoden',
    'sigmo',
    'procto',
    'ösoph',
    'oesoph',
    'esoph',
    'egd',
    'ercp',
    'eus',
    'upper gi',
    'lower gi'
  ].some((keyword) => normalized.includes(keyword))
}

function isPatientExaminationAllowedForMedicalField(option: PatientExaminationOption): boolean {
  if (terminology.selectedMedicalField !== 'gastroenterology') return true
  return isGastroenterologyExaminationName(option.examinationName)
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
        (row): row is { examinationIndicationId: number; indicationChoiceId: number | null } =>
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

function stringField(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
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
    examinationName,
    patientId: toPositiveInteger(row.patient?.id ?? row.patient_id ?? row.patientId),
    examinationId: toPositiveInteger(row.examination?.id ?? row.examination_id ?? row.examinationId)
  }
}

function upsertPatientExaminationOption(option: {
  id: number
  label: string
  examinationName: string
  patientId: number | null
  examinationId: number | null
}) {
  if (!isPatientExaminationAllowedForMedicalField(option)) return
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
      .filter(isPatientExaminationAllowedForMedicalField)
      .sort((left: PatientExaminationOption, right: PatientExaminationOption) => right.id - left.id)
  } catch (error: any) {
    patientExaminationOptions.value = []
    patientExaminationOptionsError.value =
      error?.response?.data?.detail ||
      error?.message ||
      'Patientenuntersuchungen konnten nicht geladen werden.'
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
    if (response.data && typeof response.data === 'object') {
      patientExaminationDetail.value = response.data as Record<string, any>
    }
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
  const selectedOption =
    patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) ?? null

  flow.setPatientExaminationContext({
    patientExaminationId,
    selectedPatientId: selectedOption?.patientId ?? flow.selectedPatientId,
    selectedExaminationId: selectedOption?.examinationId ?? flow.selectedExaminationId
  })
  patientExaminationDetail.value = null
  selectedReferenceFindingKey.value = null

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
  patientExaminationDetail.value = detail

  const detailPatientId = extractPatientId(detail)
  const detailExaminationId = extractExaminationId(detail)
  flow.setCaseSelection({
    selectedPatientId: option?.patientId ?? detailPatientId ?? flow.selectedPatientId,
    selectedExaminationId:
      option?.examinationId ?? detailExaminationId ?? flow.selectedExaminationId
  })

  const examinationName = extractExaminationName(detail)
  const templates = examinationName
    ? await fetchReportTemplatesByExamination(activeKbModule.value, examinationName)
    : []
  const selectedTemplate =
    (flow.selectedTemplateName &&
      templates.find((template) => template.name === flow.selectedTemplateName)) ||
    templates[0] ||
    null

  const selectedExaminationId = option?.examinationId ?? detailExaminationId
  const catalogRows = selectedExaminationId
    ? await findingsApi.getExaminationFindings(selectedExaminationId)
    : []
  findingCatalog.value = Array.isArray(catalogRows) ? catalogRows : []
  const findingsById = new Map<number, Finding>(
    findingCatalog.value.map((finding) => [finding.id, finding])
  )

  const payload = await buildReportTemplateRuntimePayload({
    moduleName: activeKbModule.value,
    patientExaminationId,
    patient: resolvePatientKey(detail, patientExaminationId),
    examiners: extractExaminers(detail),
    examination: selectedTemplate?.examination || examinationName,
    getFindingById: (findingId) => findingsById.get(findingId)
  })

  flow.setTemplateSelection({
    moduleName: activeKbModule.value,
    templateName: selectedTemplate?.name || null
  })
  flow.setIndications(extractIndicationRows(detail))
  flow.setRuntimeDraft({
    draftId: `draft_${patientExaminationId}`,
    patientExaminationId,
    moduleName: activeKbModule.value,
    templateName: selectedTemplate?.name || null,
    payload: {
      ...payload,
      ...(extractDraftDate(detail) ? { date: extractDraftDate(detail) } : {})
    },
    hydratedFrom: 'backend_context',
    updatedAt: new Date().toISOString()
  })
}

async function hydrateRuntimeDraftFromDraftApi(patientExaminationId: number): Promise<boolean> {
  const response = await fetchPatientExaminationDraft(patientExaminationId)
  const draft = response?.draft && typeof response.draft === 'object' ? response.draft : {}
  const draftModuleName = stringField(draft, 'moduleName', 'module_name') || activeKbModule.value
  const draftTemplateName = stringField(draft, 'templateName', 'template_name')
  const updatedAt = response?.updatedAt ?? response?.updated_at ?? null
  if (!isRuntimePayload(draft.payload)) {
    flow.markDraftPersistenceHydrated(updatedAt)
    return false
  }

  flow.setTemplateSelection({
    moduleName: draftModuleName,
    templateName: draftTemplateName
  })
  flow.setRuntimeDraft({
    draftId: `draft_${patientExaminationId}`,
    patientExaminationId,
    moduleName: draftModuleName,
    templateName: draftTemplateName,
    payload: draft.payload,
    hydratedFrom: 'draft_api',
    updatedAt: updatedAt || new Date().toISOString()
  })
  flow.markDraftPersistenceHydrated(updatedAt)
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
      patientExaminationDetail.value = detail
      flow.setCaseSelection({
        selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
        selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
      })
      flow.setIndications(extractIndicationRows(detail))
      await loadFindingCatalogForExamination(extractExaminationId(detail) ?? flow.selectedExaminationId)
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
      patientExaminationDetail.value = detail
      flow.setCaseSelection({
        selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
        selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
      })
      flow.setIndications(extractIndicationRows(detail))
      await loadFindingCatalogForExamination(extractExaminationId(detail) ?? flow.selectedExaminationId)
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
      await ensureTerminologyBundlesLoaded()
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
    const payload = await fetchPatientTimelineLatest({
      patientId: flow.selectedPatientId,
      patientExaminationId
    })
    flow.setMediaPreload(payload)
    selectedVideoStreamUrl.value = pickPreferredStream(payload.latestVideo?.streamOptions || [])
    selectedFrameStreamUrl.value = payload.latestFrames[0]?.streamUrl || null
  } catch (error: any) {
    const status = error?.response?.status
    const detail = error?.response?.data?.detail || error?.message
    const message =
      status === 404
        ? 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
        : status === 400
          ? 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.'
          : status === 403
            ? 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.'
            : `Fehler beim Laden der Medien: ${detail || 'unbekannt'}`
    flow.setMediaPreloadError(message)
  }
}

async function handleReportImportCompleted(): Promise<void> {
  await refreshMediaPreload()
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
      patientExaminationDetail.value = null
      findingCatalog.value = []
    }

    if (patientExaminationId) {
      await ensureCurrentPatientExaminationOption(patientExaminationId)
      await hydrateDraftForRoutePatientExamination(patientExaminationId)
    }
  },
  { immediate: true }
)

watch(
  () => terminology.selectedMedicalField,
  async () => {
    if (flow.selectedPatientId) {
      await fetchPatientExaminationOptions(flow.selectedPatientId)
    }
  }
)

watch(
  [() => flow.selectedKbModule, () => flow.selectedTemplateName, activeKbModule],
  async () => {
    selectedReferenceFindingKey.value = null
    await loadTemplateReferenceForSelection()
  },
  { immediate: true }
)

watch(
  () => flow.selectedExaminationId,
  async (examinationId) => {
    await loadFindingCatalogForExamination(examinationId)
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

onMounted(() => {
  ensureTerminologyBundlesLoaded()
})
</script>

<style scoped>
.reporting-shell {
  position: relative;
  isolation: isolate;
}

.reporting-shell .row > [class*='col-'] {
  min-width: 0;
}

.reporting-workspace-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr) minmax(17rem, 22rem);
  gap: 1rem;
  align-items: start;
}

.reporting-left-rail,
.reporting-right-rail,
.reporting-main-region {
  min-width: 0;
}

.reporting-left-rail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reporting-right-rail,
.workflow-panel {
  position: sticky;
  top: 1rem;
}

.reporting-shell .card,
.reporting-command-bar {
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(20, 31, 48, 0.06);
  overflow: hidden;
}

.reporting-command-bar {
  display: grid;
  grid-template-columns: minmax(22rem, 1.15fr) minmax(20rem, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: #fff;
}

.reporting-command-main {
  min-width: 0;
}

.tracking-label {
  letter-spacing: 0.08em;
}

.context-case-select {
  width: 100%;
}

.context-case-select .form-select {
  min-width: min(100%, 20rem);
}

.context-case-select .btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.context-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.625rem;
  align-content: start;
}

.context-summary-item,
.context-tile,
.media-context-card {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.context-summary-item.is-primary {
  background: #172234;
  color: #fff;
  border-color: #172234;
}

.context-summary-label,
.context-tile span {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #66768c;
  margin-bottom: 0.2rem;
}

.context-summary-item.is-primary .context-summary-label {
  color: #c9d5e4;
}

.context-summary-item strong,
.context-tile strong {
  display: block;
  color: inherit;
  overflow-wrap: anywhere;
  line-height: 1.3;
}

.context-tile {
  display: flex;
  min-height: 7rem;
  flex-direction: column;
  gap: 0.2rem;
  background: #fff;
}

.context-tile small {
  color: #5c6878;
  overflow-wrap: anywhere;
}

.context-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.context-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  color: #334155;
  background: #eef2f7;
  border: 1px solid #d7dee8;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.context-status-pill.is-ready {
  color: #0f5132;
  background: #d1e7dd;
  border-color: #badbcc;
}

.context-status-pill.is-loading {
  color: #084298;
  background: #cfe2ff;
  border-color: #b6d4fe;
}

.context-status-pill.is-error {
  color: #842029;
  background: #f8d7da;
  border-color: #f5c2c7;
}

.context-status-pill.is-idle {
  color: #334155;
  background: #eef2f7;
  border-color: #d7dee8;
}

.reporting-shell .card-header {
  background: #fff;
  color: #172234;
  border-bottom: 1px solid #d9e0ea;
}

.reporting-shell .card-body {
  background: #fff;
  color: #1f2a37;
}

.reporting-shell .text-muted {
  color: #4b5565 !important;
}

.reporting-shell .workflow-step-btn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  white-space: normal;
  text-decoration: none;
  font-weight: 600;
  line-height: 1.3;
  border-width: 1px;
  border-style: solid;
}

.workflow-step-index {
  display: inline-flex;
  flex: 0 0 1.75rem;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #172234;
  font-weight: 800;
}

.workflow-step-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.15rem;
}

.reporting-shell .workflow-step-btn.is-inactive {
  color: #1f2a37 !important;
  background-color: #fff;
  border-color: #d4dbe7;
}

.reporting-shell .workflow-step-btn.is-inactive:hover,
.reporting-shell .workflow-step-btn.is-inactive:focus-visible {
  color: #111827 !important;
  background-color: #eef4fb;
  border-color: #b9c7da;
}

.reporting-shell .workflow-step-btn.is-active {
  color: #fff !important;
  background-color: #172234 !important;
  border-color: #172234 !important;
  box-shadow: 0 6px 14px rgba(16, 24, 40, 0.2);
}

.reporting-shell .workflow-step-btn.is-disabled {
  color: #7b8796 !important;
  background-color: #f4f6f9 !important;
  border-color: #d6dce7 !important;
  cursor: not-allowed;
}

.reporting-shell .workflow-step-btn.is-disabled .workflow-step-index {
  color: #8792a2;
}

.workflow-step-meta {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.82;
}

.reporting-shell .workflow-step-btn:focus-visible {
  outline: 2px solid #8bb7f0;
  outline-offset: 1px;
}

.media-context-card {
  height: 100%;
  background: #fff;
}

.finding-status-list {
  display: flex;
  flex-direction: column;
}

.finding-status-section {
  border-bottom: 1px solid #e5ebf2;
}

.finding-status-section:last-child {
  border-bottom: 0;
}

.finding-status-section-title {
  padding: 0.65rem 0.85rem 0.35rem;
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.finding-status-row {
  display: grid;
  grid-template-columns: 1.65rem minmax(0, 1fr) auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.55rem 0.85rem;
  color: #1f2a37;
  text-decoration: none;
  border-left: 3px solid transparent;
}

.finding-status-row:hover,
.finding-status-row:focus-visible,
.finding-status-row.is-selected {
  background: #f3f7fb;
  color: #111827;
}

.finding-status-row.is-complete {
  border-left-color: #198754;
}

.finding-status-row.is-warning,
.finding-status-row.is-missing {
  border-left-color: #f0ad4e;
}

.finding-status-icon {
  display: inline-flex;
  width: 1.5rem;
  height: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #4b5565;
  background: #eef2f7;
  font-size: 0.75rem;
}

.finding-status-row.is-complete .finding-status-icon {
  color: #0f5132;
  background: #d1e7dd;
}

.finding-status-row.is-warning .finding-status-icon,
.finding-status-row.is-missing .finding-status-icon {
  color: #7a4d00;
  background: #fff3cd;
}

.finding-status-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.05rem;
}

.finding-status-label {
  overflow: hidden;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.finding-status-meta,
.finding-status-count {
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.finding-status-count {
  min-width: 1.25rem;
  text-align: right;
}

.kb-reference-panel {
  max-height: calc(100vh - 2rem);
}

.kb-reference-panel .card-body {
  overflow: auto;
  max-height: calc(100vh - 6rem);
}

.kb-focus-block,
.kb-classification-row,
.runtime-instance-row,
.kb-advice-row,
.kb-suggestion-row {
  min-width: 0;
  padding: 0.7rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.kb-focus-block span {
  display: block;
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kb-focus-block strong,
.kb-focus-block small,
.kb-classification-row small,
.kb-advice-row small {
  display: block;
  overflow-wrap: anywhere;
}

.kb-reference-group {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 1rem;
}

.kb-reference-group h6 {
  margin: 0;
  color: #172234;
  font-size: 0.82rem;
}

.kb-classification-list,
.runtime-instance-list,
.kb-advice-list,
.kb-suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.kb-classification-precedence {
  flex: 0 0 auto;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kb-classification-precedence.is-required {
  color: #842029;
}

.runtime-instance-row,
.kb-suggestion-row {
  color: #334155;
  font-size: 0.82rem;
  line-height: 1.35;
}

.kb-advice-row {
  border-left: 3px solid #f0ad4e;
}

.kb-advice-row.is-ok {
  border-left-color: #198754;
}

.kb-advice-row > div span {
  color: #66768c;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 1199.98px) {
  .reporting-command-bar {
    grid-template-columns: 1fr;
  }

  .reporting-workspace-grid {
    grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
  }

  .reporting-right-rail {
    grid-column: 1 / -1;
    position: static;
  }

  .kb-reference-panel {
    max-height: none;
  }

  .kb-reference-panel .card-body {
    max-height: none;
  }
}

@media (max-width: 991.98px) {
  .reporting-shell {
    padding-inline: 0.5rem;
  }

  .reporting-workspace-grid {
    grid-template-columns: 1fr;
  }

  .reporting-right-rail,
  .workflow-panel {
    position: static;
  }

  .context-quick-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 575.98px) {
  .context-case-select .btn {
    width: 100%;
  }
}
</style>
