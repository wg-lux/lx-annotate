<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Anforderungsprüfung (Hinweise)</h5>
          <small class="text-muted">Advisory-only Darstellung unerfüllter Anforderungen und empfohlener Aktionen</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" :disabled="loading || !flow.lookupToken" @click="fetchLookupAll">
            Lookup laden
          </button>
          <button class="btn btn-primary btn-sm" :disabled="loading || !flow.lookupToken" @click="triggerRecompute">
            Neu berechnen
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>
        <LookupStatusPanel
          class="mb-3"
          :patient-examination-id="flow.patientExaminationId"
          :session-status="flow.sessionStatus"
          :findings-revision="flow.findingsRevision"
        />

        <RequirementAdvisoryPanel
          :failed-requirement-sets="failedRequirementSets"
          :failed-requirements="failedRequirements"
          :suggested-actions="suggestedActions"
          :candidate-confidence="candidateConfidence"
          :lookup-raw="lookupRaw"
          :requirement-guidance-raw="requirementGuidanceRaw"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue'
import RequirementAdvisoryPanel from '@/components/Reporting/RequirementAdvisoryPanel.vue'
import { useLookupActions } from '@/composables/reporting/useLookupActions'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

type LookupReviewState = {
  requirementStatus?: Record<string, boolean>
  requirementSetStatus?: Record<string, boolean>
  suggestedActions?: Record<string, any[]>
  requirementsBySet?: Record<string, Array<{ id: number; name: string }>>
  selectedRequirementSetIds?: number[]
  candidateRequirementSetIds?: number[]
  candidateRequirementSetConfidence?: number | null
}

const flow = useReportingFlowStore()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const reviewState = computed<LookupReviewState>(() => {
  const fromLookup = flow.lookupSnapshot || {}
  const fromGuidance =
    (flow.lastRequirementGuidance && typeof flow.lastRequirementGuidance === 'object'
      ? (flow.lastRequirementGuidance as Record<string, any>)
      : {}) || {}
  return {
    ...fromLookup,
    requirementStatus: fromGuidance.requirementStatus ?? fromLookup.requirementStatus,
    requirementSetStatus: fromGuidance.requirementSetStatus ?? fromLookup.requirementSetStatus,
    suggestedActions: fromGuidance.suggestedActions ?? fromLookup.suggestedActions,
    candidateRequirementSetIds:
      fromGuidance.candidateRequirementSetIds ?? fromLookup.candidateRequirementSetIds,
    candidateRequirementSetConfidence:
      fromGuidance.candidateRequirementSetConfidence ?? fromLookup.candidateRequirementSetConfidence
  }
})

const failedRequirementSets = computed(() =>
  Object.entries(reviewState.value.requirementSetStatus || {})
    .filter(([, ok]) => ok === false)
    .map(([id]) => id)
)

const failedRequirements = computed(() =>
  Object.entries(reviewState.value.requirementStatus || {})
    .filter(([, ok]) => ok === false)
    .map(([id]) => id)
)

const suggestedActions = computed<Record<string, any[]>>(() => reviewState.value.suggestedActions || {})
const candidateConfidence = computed<number | null>(
  () => (typeof reviewState.value.candidateRequirementSetConfidence === 'number'
    ? reviewState.value.candidateRequirementSetConfidence
    : null)
)
const lookupRaw = computed(() => JSON.stringify(flow.lookupSnapshot || {}, null, 2))
const requirementGuidanceRaw = computed(() =>
  flow.lastRequirementGuidance ? JSON.stringify(flow.lastRequirementGuidance, null, 2) : ''
)

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function patchFromLookup(data: any) {
  flow.patchLookupSnapshot({
    requirementStatus: data?.requirementStatus,
    requirementSetStatus: data?.requirementSetStatus,
    suggestedActions: data?.suggestedActions,
    requirementsBySet: data?.requirementsBySet,
    selectedRequirementSetIds: data?.selectedRequirementSetIds,
    candidateRequirementSetIds: data?.candidateRequirementSetIds,
    candidateRequirementSetConfidence: data?.candidateRequirementSetConfidence
  })
  if (Array.isArray(data?.selectedRequirementSetIds)) {
    flow.setSelectedRequirementSetIds(data.selectedRequirementSetIds)
  }
}

const lookupActions = useLookupActions<LookupReviewState>({
  flow,
  loading,
  errorMessage,
  successMessage,
  applyLookup: patchFromLookup,
  clearMessages
})

async function fetchLookupAll() {
  const result = await lookupActions.fetchLookupAll({
    fallbackErrorMessage: 'Fehler beim Laden der Lookup-Hinweise.'
  })
  if (result.ok) {
    successMessage.value = 'Lookup-Hinweise geladen.'
  }
}

async function triggerRecompute() {
  const result = await lookupActions.recomputeLookup({
    applyUpdates: true,
    refreshAfter: true,
    fallbackErrorMessage: 'Fehler bei der Neuberechnung.'
  })
  if (result.ok) {
    successMessage.value = 'Lookup-Hinweise wurden neu berechnet.'
  }
}

onMounted(async () => {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.'
    return
  }
  if (flow.lookupToken) {
    await fetchLookupAll()
  }
})
</script>
