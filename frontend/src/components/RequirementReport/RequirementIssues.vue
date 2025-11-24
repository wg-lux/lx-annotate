<template>
  <div class="container-fluid" v-if="visible">
    <div v-if="loading" class="alert alert-info">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Anforderungen werden geprüft...
    </div>


    <div v-else-if="hasIssues" class="alert alert-warning">
      <strong>Um den Report abzuschließen, müssen die folgenden Voraussetzungen erfüllt sein:</strong>

      <!-- Gruppiert nach Requirement-Set -->
      <div v-for="(group, setName) in groupedIssues" :key="setName" class="mt-3">
        <h6 class="mb-1">
          <i class="fas fa-folder-open me-1"></i>
          {{ setName }}
        </h6>
        <ul class="mb-0 ps-3">
          <li v-for="issue in group" :key="issue.requirement_name">
            <span class="fw-semibold">{{ issue.requirement_name }}</span>
            <span class="text-muted"> – {{ issue.details }}</span>
            <span v-if="issue.error" class="text-danger">
              (Fehler: {{ issue.error }})
            </span>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="alert alert-success">
      <strong>Alle ausgewählten Anforderungen sind erfüllt.</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
const url = r('evaluate-requirements/')
interface RequirementResult {
  requirement_set_id: number | null
  requirement_set_name: string
  requirement_name: string
  met: boolean
  details: string
  error: string | null
}

interface EvaluateResponse {
  ok: boolean
  errors: string[]
  meta: {
    patientExaminationId: number | null
    setsEvaluated: number
    requirementsEvaluated: number
    status: 'ok' | 'partial' | 'failed'
  }
  results: RequirementResult[]
}

const props = defineProps<{
  patientExaminationId: number | null | undefined
  requirementSetIds?: number[] | null
  /** show only unmet or errored requirements (default = true) */
  showOnlyUnmet?: boolean
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const results = ref<RequirementResult[]>([])

// fetcher
async function fetchRequirements() {
  if (!props.patientExaminationId) {
    results.value = []
    return
  }

  loading.value = true
  error.value = null
  try {
    const payload: Record<string, any> = {
      patient_examination_id: props.patientExaminationId,
    }
    if (props.requirementSetIds && props.requirementSetIds.length > 0) {
      payload.requirement_set_ids = props.requirementSetIds
    }

    const { data } = await axiosInstance.post<EvaluateResponse>(
      url,
      payload,
    )

    // Store all results; we filter later
    results.value = data.results ?? []

    // High-level backend errors can be shown as banner
    if (!data.ok && data.errors?.length) {
      error.value = data.errors.join(' | ')
    }
  } catch (e: any) {
    error.value =
      e?.response?.data?.detail ||
      e?.message ||
      'Unbekannter Fehler bei der Anforderungsprüfung'
  } finally {
    loading.value = false
  }
}

// visible at all only if we have a PE id
const visible = computed(() => !!props.patientExaminationId)

// filter for issues (unmet or errored)
const issueList = computed(() =>
  (props.showOnlyUnmet ?? true)
    ? results.value.filter((r) => !r.met || r.error)
    : results.value,
)

const hasIssues = computed(() => issueList.value.length > 0)

// group by requirement_set_name
const groupedIssues = computed<Record<string, RequirementResult[]>>(() => {
  const groups: Record<string, RequirementResult[]> = {}
  for (const res of issueList.value) {
    const key = res.requirement_set_name || 'Allgemein'
    if (!groups[key]) groups[key] = []
    groups[key].push(res)
  }
  return groups
})

// reload when PE or selected sets change
watch(
  () => [props.patientExaminationId, props.requirementSetIds],
  () => {
    if (visible.value) {
      fetchRequirements()
    } else {
      results.value = []
    }
  },
  { deep: true, immediate: true },
)

// allow parent to trigger reload manually
defineExpose({ reload: fetchRequirements })
</script>
