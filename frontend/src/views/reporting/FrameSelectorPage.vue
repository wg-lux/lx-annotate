<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Segment-Frame-Auswahl</h5>
          <small class="text-muted">
            Repräsentative Frames pro Segment auswählen und optional mit Befund verknüpfen
          </small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" :disabled="loading || !flow.patientExaminationId" @click="loadFrameSelectorState">
            Aktualisieren
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <LookupStatusPanel
          class="mb-3"
          :patient-examination-id="flow.patientExaminationId"
          :selected-examination-id="flow.selectedExaminationId"
          :lookup-token="flow.lookupToken"
        />

        <div class="card border mb-3">
          <div class="card-header bg-light">
            <h6 class="mb-0">Latest frames preload</h6>
          </div>
          <div class="card-body">
            <div v-if="latest_frames.length" class="d-flex flex-wrap gap-2">
              <button
                v-for="frame in latest_frames"
                :key="`${frame.videoId}-${frame.frameNumber}`"
                class="btn btn-outline-secondary btn-sm"
                @click="open_stream_url(frame.streamUrl)"
              >
                #{{ frame.frameNumber }} · {{ frame.category || 'fallback' }}
              </button>
            </div>
            <div v-else class="small text-muted">
              Keine vorab ausgewählten Frames verfügbar.
            </div>
          </div>
        </div>

        <div v-if="!flow.patientExaminationId" class="alert alert-warning">
          Bitte zuerst das Fall-Setup abschließen.
        </div>

        <template v-else>
          <div class="row g-3">
            <div class="col-lg-4">
              <div class="card border h-100">
                <div class="card-header bg-light">
                  <h6 class="mb-0">Segmente</h6>
                </div>
                <div class="card-body p-2">
                  <div class="mb-2 px-2 small text-muted">
                    {{ frameSelectorState?.count ?? 0 }} Segment(e)
                  </div>
                  <div class="list-group segment-list">
                    <button
                      v-for="segment in segments"
                      :key="segment.segmentId"
                      type="button"
                      class="list-group-item list-group-item-action text-start"
                      :class="{ active: selectedSegmentId === segment.segmentId }"
                      @click="selectedSegmentId = segment.segmentId"
                    >
                      <div class="fw-semibold">
                        {{ segment.labelName || `Segment ${segment.segmentId}` }}
                      </div>
                      <div class="small opacity-75">
                        Frames {{ segment.startFrameNumber }}-{{ segment.endFrameNumber }}
                      </div>
                      <div class="small opacity-75">
                        Auswahl: {{ segment.selectedFrameNumber ?? 'keine' }}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-8">
              <div class="card border h-100" v-if="selectedSegment">
                <div class="card-header d-flex justify-content-between align-items-center bg-light">
                  <div>
                    <h6 class="mb-0">
                      {{ selectedSegment.labelName || `Segment ${selectedSegment.segmentId}` }}
                    </h6>
                    <small class="text-muted">
                      Framebereich {{ selectedSegment.startFrameNumber }}-{{ selectedSegment.endFrameNumber }}
                    </small>
                  </div>
                  <span class="badge bg-secondary">
                    Ausgewählt: {{ selectedSegment.selectedFrameNumber ?? 'keine' }}
                  </span>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-7">
                      <div class="frame-preview rounded border p-3">
                        <div class="fw-semibold mb-2">Frame-Vorschau (Metadaten)</div>
                        <div v-if="selectedSegment.selectedFrame" class="small">
                          <div><strong>Frame-ID:</strong> {{ selectedSegment.selectedFrame.frameId }}</div>
                          <div><strong>Frame-Nummer:</strong> {{ selectedSegment.selectedFrame.frameNumber }}</div>
                          <div><strong>Zeitstempel:</strong> {{ selectedSegment.selectedFrame.timestamp ?? 'n/a' }}</div>
                          <div><strong>Datei:</strong> {{ selectedSegment.selectedFrame.relativePath || 'n/a' }}</div>
                          <div><strong>Extrahiert:</strong> {{ selectedSegment.selectedFrame.fileExists ? 'ja' : 'nein' }}</div>
                        </div>
                        <div v-else class="text-muted small">
                          Kein Frame ausgewählt.
                        </div>
                        <div class="mt-3 text-muted small">
                          Hinweis: Für eine echte Bildvorschau wäre ggf. ein dedizierter Frame-Stream hilfreich, falls
                          `relative_path` nicht direkt browserfähig ist.
                        </div>
                      </div>
                    </div>

                    <div class="col-md-5">
                      <div class="mb-3">
                        <label class="form-label">Frame manuell setzen</label>
                        <div class="input-group">
                          <input
                            v-model.number="manualFrameNumber"
                            class="form-control"
                            type="number"
                            :min="selectedSegment.startFrameNumber"
                            :max="selectedSegment.endFrameNumber"
                          />
                          <button class="btn btn-outline-primary" :disabled="loading" @click="setFrameManual">
                            Setzen
                          </button>
                        </div>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Befund anhängen (optional)</label>
                        <select v-model="selectedFindingIdForSegment" class="form-select" :disabled="loading">
                          <option :value="null">Unverändert lassen</option>
                          <option :value="CLEAR_FINDING_SENTINEL">Befund entfernen</option>
                          <option
                            v-for="finding in findings"
                            :key="finding.id"
                            :value="finding.id"
                          >
                            {{ finding.nameDe || finding.name || `Befund ${finding.id}` }}
                          </option>
                        </select>
                        <div class="small text-muted mt-1">
                          Aktuell: {{ selectedSegment.attachedFinding?.findingName || 'kein Befund' }}
                        </div>
                      </div>

                      <div class="d-grid gap-2">
                        <button class="btn btn-outline-secondary" :disabled="loading" @click="patchSegmentAction('random')">
                          Zufallsframe
                        </button>
                        <button class="btn btn-outline-secondary" :disabled="loading" @click="patchSegmentAction('step', -5)">
                          -5 Frames
                        </button>
                        <button class="btn btn-outline-secondary" :disabled="loading" @click="patchSegmentAction('step', 5)">
                          +5 Frames
                        </button>
                        <button class="btn btn-outline-danger" :disabled="loading" @click="patchSegmentAction('clear')">
                          Auswahl löschen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="card border h-100">
                <div class="card-body text-muted">
                  Kein Segment ausgewählt.
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Finding } from '@/api/findings.contract'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors'
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'

type SegmentFrameItem = {
  segmentId: number
  videoId: number
  labelId?: number | null
  labelName?: string | null
  startFrameNumber: number
  endFrameNumber: number
  segmentDurationSeconds?: number | null
  selectedFrameNumber?: number | null
  selectedFrame?: {
    frameId?: number | null
    frameNumber?: number | null
    timestamp?: number | string | null
    relativePath?: string | null
    fileExists?: boolean
  } | null
  controls?: {
    randomFrameNumber?: number | null
    stepBackward5FrameNumber?: number | null
    stepForward5FrameNumber?: number | null
  } | null
  attachedFinding?: {
    patientFindingId?: number | null
    findingId?: number | null
    findingName?: string | null
  } | null
  selectionMeta?: {
    updatedAt?: string | null
    selectionSource?: string | null
  } | null
}

type SegmentFrameSelectorState = {
  patientExaminationId: number
  reportId: number
  reportStatus?: string
  reportTemplateName?: string
  autoCreatedReport?: boolean
  storageKey?: string
  count: number
  results: SegmentFrameItem[]
}

const CLEAR_FINDING_SENTINEL = -1

const flow = useReportingFlowStore()
const {
  catalogFindings,
  ensureCatalogLoaded
} = useFindingSelectors()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const frameSelectorState = ref<SegmentFrameSelectorState | null>(null)
const selectedSegmentId = ref<number | null>(null)
const manualFrameNumber = ref<number | null>(null)
const selectedFindingIdForSegment = ref<number | null>(null)

const findings = computed<readonly Finding[]>(() => catalogFindings.value)
const latest_frames = computed(() => flow.mediaPreload?.latestFrames || [])
const segments = computed<SegmentFrameItem[]>(() => frameSelectorState.value?.results || [])
const selectedSegment = computed<SegmentFrameItem | null>(
  () => segments.value.find((s) => s.segmentId === selectedSegmentId.value) || null
)

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function open_stream_url(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function selectorUrl(): string | null {
  if (!flow.patientExaminationId) return null
  return r(endpoints.report.segmentFrameSelector(flow.patientExaminationId, flow.activeReportId ?? undefined))
}

async function ensureFindingsLoaded() {
  await ensureCatalogLoaded()
}

function syncSelectionDefaults() {
  if (!segments.value.length) {
    selectedSegmentId.value = null
    manualFrameNumber.value = null
    selectedFindingIdForSegment.value = null
    return
  }

  if (!selectedSegmentId.value || !segments.value.some((s) => s.segmentId === selectedSegmentId.value)) {
    selectedSegmentId.value = segments.value[0]?.segmentId ?? null
  }

  const seg = selectedSegment.value
  if (!seg) return
  manualFrameNumber.value =
    seg.selectedFrameNumber ??
    latest_frames.value[0]?.frameNumber ??
    seg.startFrameNumber
  selectedFindingIdForSegment.value = seg.attachedFinding?.findingId ?? null
}

async function loadFrameSelectorState() {
  const url = selectorUrl()
  if (!url) {
    errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.'
    return
  }

  loading.value = true
  clearMessages()
  try {
    const res = await axiosInstance.get(url)
    frameSelectorState.value = res.data as SegmentFrameSelectorState
    if (frameSelectorState.value?.reportId) {
      flow.setActiveReportId(frameSelectorState.value.reportId)
    }
    syncSelectionDefaults()
    successMessage.value = 'Segment-Frame-Status geladen.'
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Laden der Segment-Frame-Auswahl.'
  } finally {
    loading.value = false
  }
}

function buildPatchBody(base: Record<string, unknown>): Record<string, unknown> | null {
  if (!flow.patientExaminationId || !selectedSegment.value) return null
  const body: Record<string, unknown> = {
    patientExaminationId: flow.patientExaminationId,
    ...(flow.activeReportId ? { reportId: flow.activeReportId } : {}),
    segmentId: selectedSegment.value.segmentId,
    ...base
  }

  if (selectedFindingIdForSegment.value === CLEAR_FINDING_SENTINEL) {
    body.findingId = null
  } else if (typeof selectedFindingIdForSegment.value === 'number') {
    body.findingId = selectedFindingIdForSegment.value
  }
  return body
}

async function patchSegmentAction(action: 'random' | 'step' | 'clear', step?: number) {
  const body = buildPatchBody({
    action,
    ...(typeof step === 'number' ? { step } : {})
  })
  if (!body) {
    errorMessage.value = 'Kein Segment ausgewählt.'
    return
  }
  loading.value = true
  clearMessages()
  try {
    const res = await axiosInstance.patch(r(endpoints.report.segmentFrameSelectorBase), body)
    frameSelectorState.value = res.data as SegmentFrameSelectorState
    if (frameSelectorState.value?.reportId) {
      flow.setActiveReportId(frameSelectorState.value.reportId)
    }
    syncSelectionDefaults()
    successMessage.value = 'Segment aktualisiert.'
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Aktualisieren des Segments.'
  } finally {
    loading.value = false
  }
}

async function setFrameManual() {
  if (!selectedSegment.value) {
    errorMessage.value = 'Kein Segment ausgewählt.'
    return
  }
  const frameNumber = Number(manualFrameNumber.value)
  if (!Number.isFinite(frameNumber)) {
    errorMessage.value = 'Bitte eine gültige Frame-Nummer eingeben.'
    return
  }

  const body = buildPatchBody({
    action: 'set',
    frameNumber
  })
  if (!body) return

  loading.value = true
  clearMessages()
  try {
    const res = await axiosInstance.patch(r(endpoints.report.segmentFrameSelectorBase), body)
    frameSelectorState.value = res.data as SegmentFrameSelectorState
    if (frameSelectorState.value?.reportId) {
      flow.setActiveReportId(frameSelectorState.value.reportId)
    }
    syncSelectionDefaults()
    successMessage.value = 'Frame manuell gesetzt.'
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Setzen des Frames.'
  } finally {
    loading.value = false
  }
}

watch(selectedSegment, (segment) => {
  if (!segment) return
  manualFrameNumber.value = segment.selectedFrameNumber ?? segment.startFrameNumber
  selectedFindingIdForSegment.value = segment.attachedFinding?.findingId ?? null
})

onMounted(async () => {
  await ensureFindingsLoaded()
  if (flow.patientExaminationId) {
    await loadFrameSelectorState()
  } else {
    errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.'
  }
})
</script>

<style scoped>
.segment-list {
  max-height: 60vh;
  overflow: auto;
}

.frame-preview {
  min-height: 220px;
  background:
    linear-gradient(180deg, rgba(248, 249, 250, 1) 0%, rgba(233, 236, 239, 1) 100%);
}
</style>
