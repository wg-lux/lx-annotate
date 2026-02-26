<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Template & Anforderungssets</h5>
          <small class="text-muted">Lookup-Zustand laden, Sets auswählen, Neuberechnung auslösen</small>
        </div>
        <LookupActionsBar
          :loading="loading"
          :has-lookup-token="!!flow.lookupToken"
          :show-parts="true"
          @refresh="fetchLookupAll"
          @load-parts="fetchLookupParts(['requirementSets','selectedRequirementSetIds','requirementSetStatus','suggestedActions'])"
          @recompute="triggerRecompute"
        />
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">PatientExamination-ID</label>
            <input class="form-control" :value="flow.patientExaminationId ?? ''" readonly />
          </div>
          <div class="col-md-8">
            <label class="form-label">Lookup-Token</label>
            <input class="form-control" :value="flow.lookupToken ?? ''" readonly />
          </div>
        </div>

        <div class="small text-muted mb-3">
          Route-Parameter `patient_examination_id`: {{ route.params.patient_examination_id }}
        </div>

        <div v-if="!flow.lookupToken" class="alert alert-warning mb-0">
          Keine Lookup-Session vorhanden. Bitte zuerst das Fall-Setup abschließen.
        </div>

        <div v-else>
          <RequirementSetSelectionList
            :items="requirementSets"
            :selected-id-set="selectedRequirementSetIdSet"
            :loading="loading"
            :requirement-set-status="lookup?.requirementSetStatus || {}"
            @toggle="toggleRequirementSet"
          />

          <div class="mt-3 p-3 bg-light rounded">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-semibold">Ausgewählte Set-IDs</span>
              <code>{{ flow.selectedRequirementSetIds.join(', ') || 'keine' }}</code>
            </div>
          </div>

          <div v-if="lookup?.suggestedActions && Object.keys(lookup.suggestedActions).length" class="mt-3">
            <h6 class="mb-2">Empfohlene Aktionen (Lookup)</h6>
            <pre class="small bg-light rounded p-2 mb-0">{{ prettySuggestedActions }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance from '@/api/axiosInstance'
import LookupActionsBar from '@/components/Reporting/LookupActionsBar.vue'
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue'
import { useLookupActions } from '@/composables/reporting/useLookupActions'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

type RequirementSetLite = { id: number; name: string; type: string }
type RequirementLite = { id: number; name: string }
type LookupDict = {
  patientExaminationId: number
  requirementSets: RequirementSetLite[]
  requirementsBySet: Record<string, RequirementLite[]>
  requirementStatus: Record<string, boolean>
  requirementSetStatus: Record<string, boolean>
  suggestedActions: Record<string, any[]>
  selectedRequirementSetIds?: number[]
}

const route = useRoute()
const flow = useReportingFlowStore()

const lookup = ref<LookupDict | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const requirementSets = computed<RequirementSetLite[]>(() => lookup.value?.requirementSets ?? [])
const selectedRequirementSetIdSet = computed(() => new Set(flow.selectedRequirementSetIds))
const prettySuggestedActions = computed(() =>
  JSON.stringify(lookup.value?.suggestedActions || {}, null, 2)
)

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function applyLookup(partial: Partial<LookupDict>) {
  if (!lookup.value) {
    lookup.value = partial as LookupDict
  } else {
    lookup.value = { ...lookup.value, ...partial }
  }
  if (Array.isArray(partial.selectedRequirementSetIds)) {
    flow.setSelectedRequirementSetIds(partial.selectedRequirementSetIds)
  }
}

const lookupActions = useLookupActions<LookupDict>({
  flow,
  loading,
  errorMessage,
  successMessage,
  applyLookup,
  clearMessages
})

async function fetchLookupAll() {
  await lookupActions.fetchLookupAll()
}

async function fetchLookupParts(keys: string[]) {
  const result = await lookupActions.fetchLookupParts(keys)
  if (result.ok) {
    successMessage.value = 'Teilstatus aus Lookup geladen.'
  }
}

async function toggleRequirementSet(id: number, checked: boolean) {
  if (loading.value) return
  clearMessages()
  const next = new Set(flow.selectedRequirementSetIds)
  if (checked) next.add(id)
  else next.delete(id)
  const ids = Array.from(next)

  try {
    const patchResult = await lookupActions.patchLookupParts(
      { selectedRequirementSetIds: ids },
      { fallbackErrorMessage: 'Fehler beim Speichern der Anforderungssets.' }
    )
    if (!patchResult.ok) return
    flow.setSelectedRequirementSetIds(ids)
    if (lookup.value) lookup.value = { ...lookup.value, selectedRequirementSetIds: ids }
    await fetchLookupParts(['selectedRequirementSetIds', 'requirementSetStatus'])
    successMessage.value = 'Anforderungssets gespeichert.'
  } catch (e: any) {
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Speichern der Anforderungssets.'
  }
}

async function triggerRecompute() {
  const result = await lookupActions.recomputeLookup({
    applyUpdates: true,
    refreshAfter: true,
    fallbackErrorMessage: 'Fehler bei der Neuberechnung.'
  })
  if (result.ok) {
    successMessage.value = 'Lookup wurde erfolgreich neu berechnet.'
  }
}

onMounted(async () => {
  if (
    flow.patientExaminationId &&
    Number(route.params.patient_examination_id) !== flow.patientExaminationId
  ) {
    errorMessage.value =
      'Warnung: Route-Parameter und gespeicherte Patientenuntersuchung stimmen nicht überein.'
  }
  if (flow.lookupToken) {
    await fetchLookupAll()
  }
})
</script>
