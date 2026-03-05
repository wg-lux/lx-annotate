<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Befunderfassung</h5>
          <small class="text-muted">Befunde hinzufügen, Klassifikationen setzen, Lookup-Hinweise aktualisieren</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" :disabled="loading || !canInitializeLookup" @click="fetchLookupAll">
            Lookup laden
          </button>
          <button class="btn btn-primary btn-sm" :disabled="loading || !canInitializeLookup" @click="triggerRecompute">
            Lookup neu berechnen
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
          :findings-revision="flow.findingsRevision"
        />

        <div v-if="!flow.patientExaminationId || !flow.selectedExaminationId" class="alert alert-warning">
          Bitte zuerst das Fall-Setup abschließen (Patient + Untersuchung + PatientExamination).
        </div>

        <template v-else>
          <div v-if="!flow.lookupToken" class="alert alert-info d-flex justify-content-between align-items-center">
            <span>Keine aktive Lookup-Session. Initialisieren Sie die Session für diese Untersuchung.</span>
            <button class="btn btn-sm btn-outline-primary" :disabled="loading || !canInitializeLookup" @click="ensureLookupSession">
              Lookup initialisieren
            </button>
          </div>

          <div class="mb-3">
            <AddableFindingsDetail
              :examination-id="flow.selectedExaminationId || undefined"
              :patient-examination-id="flow.patientExaminationId || undefined"
              @finding-added="onFindingAddedToExamination"
              @finding-error="onFindingError"
            />
          </div>

          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-0">Verfügbare Befunde (Lookup)</h6>
                <small class="text-muted">Befunde aus der aktiven Lookup-Session</small>
              </div>
              <small class="text-muted">{{ availableFindings.length }} verfügbar</small>
            </div>
            <div class="card-body" style="max-height: 60vh; overflow: auto;">
              <div v-if="findingStore.loading || loading" class="text-muted small">Lade Befunde...</div>
              <div v-else-if="availableFindings.length" class="d-flex flex-column gap-3">
                <FindingsDetail
                  v-for="findingId in availableFindings"
                  :key="findingId"
                  :finding-id="findingId"
                  :patient-examination-id="flow.patientExaminationId || undefined"
                  :is-added-to-examination="isFindingAddedToExamination(findingId)"
                  @added-to-examination="onFindingAddedToExamination"
                  @classification-updated="onClassificationUpdated"
                  @error-occurred="onFindingDetailError"
                />
              </div>
              <div v-else class="text-muted">
                Keine Lookup-Befunde geladen. Bitte Lookup laden oder neu berechnen.
              </div>
            </div>
          </div>

          <div class="mt-3 p-3 bg-light rounded small">
            <div><strong>Letztes Befund-Ereignis:</strong> {{ flow.lastFindingsEvent ? formatFindingsEvent(flow.lastFindingsEvent) : 'keins' }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import AddableFindingsDetail from '@/components/RequirementReport/AddableFindingsDetail.vue'
import FindingsDetail from '@/components/RequirementReport/FindingsDetail.vue'
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue'
import { useLookupActions } from '@/composables/reporting/useLookupActions'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useFindingStore } from '@/stores/findingStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import { endpoints } from '@/types/api/endpoints'

type LookupFindingsState = {
  availableFindings?: number[]
  requiredFindings?: number[]
  requirementStatus?: Record<string, boolean>
  requirementSetStatus?: Record<string, boolean>
  suggestedActions?: Record<string, any[]>
  requirementsBySet?: Record<string, Array<{ id: number; name: string }>>
  selectedRequirementSetIds?: number[]
}

const flow = useReportingFlowStore()
const findingStore = useFindingStore()
const patientExaminationStore = usePatientExaminationStore()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lookupState = ref<LookupFindingsState | null>(null)
const lookupInitInFlight = ref<Promise<boolean> | null>(null)

function normalizeIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.trunc(entry))
  return Array.from(new Set(ids))
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), !!entry])
  )
}

function normalizeSuggestedActions(value: unknown): Record<string, any[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), Array.isArray(entry) ? entry : []])
  )
}

function normalizeRequirementsBySet(
  value: unknown
): Record<string, Array<{ id: number; name: string }>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const requirements = Array.isArray(entry)
        ? entry
            .map((requirement) => {
              if (!requirement || typeof requirement !== 'object') return null
              const id = Number((requirement as any).id)
              const name = String((requirement as any).name || '')
              if (!Number.isFinite(id) || !name) return null
              return { id, name }
            })
            .filter((requirement): requirement is { id: number; name: string } => !!requirement)
        : []
      return [String(key), requirements]
    })
  )
}

function normalizeLookupPartial(partial: Partial<LookupFindingsState>): Partial<LookupFindingsState> {
  const normalized: Partial<LookupFindingsState> = { ...partial }
  if ('availableFindings' in partial) {
    normalized.availableFindings = normalizeIdArray(partial.availableFindings)
  }
  if ('requiredFindings' in partial) {
    normalized.requiredFindings = normalizeIdArray(partial.requiredFindings)
  }
  if ('selectedRequirementSetIds' in partial) {
    normalized.selectedRequirementSetIds = normalizeIdArray(partial.selectedRequirementSetIds)
  }
  if ('requirementStatus' in partial) {
    normalized.requirementStatus = normalizeBooleanRecord(partial.requirementStatus)
  }
  if ('requirementSetStatus' in partial) {
    normalized.requirementSetStatus = normalizeBooleanRecord(partial.requirementSetStatus)
  }
  if ('suggestedActions' in partial) {
    normalized.suggestedActions = normalizeSuggestedActions(partial.suggestedActions)
  }
  if ('requirementsBySet' in partial) {
    normalized.requirementsBySet = normalizeRequirementsBySet(partial.requirementsBySet)
  }
  return normalized
}

const availableFindings = computed<number[]>(() =>
  normalizeIdArray(lookupState.value?.availableFindings)
)
const canInitializeLookup = computed(() => !!flow.patientExaminationId)

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function formatApiError(e: any, fallback: string): string {
  return e?.response?.data?.detail || e?.response?.data?.error || e?.message || fallback
}

function applyLookup(partial: Partial<LookupFindingsState>) {
  const normalizedPartial = normalizeLookupPartial(partial)
  lookupState.value = { ...(lookupState.value || {}), ...normalizedPartial }
  flow.patchLookupSnapshot({
    requirementStatus: normalizedPartial.requirementStatus as any,
    requirementSetStatus: normalizedPartial.requirementSetStatus as any,
    suggestedActions: normalizedPartial.suggestedActions as any,
    requirementsBySet: normalizedPartial.requirementsBySet as any,
    selectedRequirementSetIds: normalizedPartial.selectedRequirementSetIds
  })
  if (Array.isArray(normalizedPartial.selectedRequirementSetIds)) {
    flow.setSelectedRequirementSetIds(normalizedPartial.selectedRequirementSetIds)
  }
}

const lookupActions = useLookupActions<LookupFindingsState>({
  flow,
  loading,
  errorMessage,
  successMessage,
  applyLookup,
  clearMessages
})

async function loadFindingsCatalog() {
  if (findingStore.findings.length === 0) {
    await findingStore.fetchFindings()
  }
}

async function fetchLookupAll() {
  const ensured = await ensureLookupSessionForCurrentPatientExamination()
  if (!ensured) return
  await lookupActions.fetchLookupAll({
    fallbackErrorMessage: 'Fehler beim Laden des Lookup-Zustands.'
  })
}

async function triggerRecompute() {
  const ensured = await ensureLookupSessionForCurrentPatientExamination()
  if (!ensured) return
  const result = await lookupActions.recomputeLookup({
    applyUpdates: true,
    refreshAfter: true,
    fallbackErrorMessage: 'Fehler bei der Lookup-Neuberechnung.'
  })
  if (result.ok) {
    successMessage.value = 'Lookup wurde nach Befundänderungen neu berechnet.'
  }
}

async function ensureLookupSessionForCurrentPatientExamination(): Promise<boolean> {
  if (flow.lookupToken) return true
  const patientExaminationId = flow.patientExaminationId
  if (!patientExaminationId) {
    errorMessage.value = 'Keine Patientenuntersuchung vorhanden. Bitte zuerst im Fall-Setup initialisieren.'
    return false
  }
  if (lookupInitInFlight.value) {
    return await lookupInitInFlight.value
  }

  const initPromise = (async () => {
    loading.value = true
    errorMessage.value = null
    flow.setSessionStatus('restarting')
    try {
      const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
        patientExaminationId
      })
      const token = String(initRes.data?.token || '')
      if (!token) {
        throw new Error('Lookup-Init lieferte kein Token.')
      }
      flow.setLookupSession({
        patientExaminationId,
        lookupToken: token,
        status: 'active'
      })
      return true
    } catch (e: any) {
      flow.setSessionStatus('expired')
      errorMessage.value = formatApiError(
        e,
        'Lookup-Session konnte nicht initialisiert werden.'
      )
      return false
    } finally {
      loading.value = false
      lookupInitInFlight.value = null
    }
  })()

  lookupInitInFlight.value = initPromise
  return await initPromise
}

async function ensureLookupSession() {
  await ensureLookupSessionForCurrentPatientExamination()
}

function isFindingAddedToExamination(findingId: number): boolean {
  if (!flow.patientExaminationId) return false
  const ids = findingStore.getFindingIdsByPatientExaminationId(flow.patientExaminationId)
  return ids.includes(findingId)
}

function onFindingAddedToExamination(
  findingIdOrData: number | { findingId: number; findingName?: string; selectedClassifications?: any[]; response?: any },
  findingName?: string
) {
  const findingId = typeof findingIdOrData === 'number' ? findingIdOrData : findingIdOrData.findingId
  const name =
    (typeof findingIdOrData === 'number' ? findingName : findingIdOrData.findingName) ||
    findingStore.getFindingById(findingId)?.name ||
    `Befund ${findingId}`

  flow.noteFindingAdded(findingId)
  successMessage.value = `Befund "${name}" wurde hinzugefügt.`

  // Refresh lookup advisory state after changes
  void triggerRecompute()
}

function onClassificationUpdated(findingId: number, classificationId: number, choiceId: number | null) {
  flow.noteClassificationUpdated(findingId, classificationId, choiceId)
  successMessage.value = `Klassifikation für Befund ${findingId} aktualisiert.`
  void triggerRecompute()
}

function onFindingError(message: string) {
  errorMessage.value = message
}

function onFindingDetailError(data: { error: string }) {
  errorMessage.value = data.error
}

function formatFindingsEvent(event: {
  type: 'finding_added' | 'classification_updated'
  at: string
  findingId: number
  classificationId?: number
  choiceId?: number | null
}) {
  const e = event
  if (e.type === 'finding_added') return `Befund ${e.findingId} hinzugefügt (${e.at})`
  return `Klassifikation geändert: Befund ${e.findingId}, Klassifikation ${e.classificationId}, Wahl ${e.choiceId ?? 'leer'} (${e.at})`
}

onMounted(async () => {
  if (flow.patientExaminationId) {
    patientExaminationStore.setCurrentPatientExaminationId(flow.patientExaminationId)
  }
  await loadFindingsCatalog()
  if (flow.patientExaminationId) {
    await fetchLookupAll()
  }
})
</script>
