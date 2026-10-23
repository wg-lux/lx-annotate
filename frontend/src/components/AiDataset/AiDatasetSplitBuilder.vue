<template>
  <section
    class="card mb-4"
    aria-labelledby="split-heading"
  >
    <div class="card-body">
      <h2
        id="split-heading"
        class="h5"
      >
        Training, Validierung &amp; Test
      </h2>
      <p class="text-muted">
        Patienten bleiben zusammen. Der Test-Bucket bleibt in allen Folds unverändert; jeder übrige
        Patient wird genau einmal zur Validierung verwendet.
      </p>
      <form
        class="row g-3 align-items-end"
        data-test="split-form"
        @submit.prevent="createPlan"
      >
        <div class="col-md-4">
          <label
            for="split-name"
            class="form-label"
            >Name des Split-Plans</label
          >
          <input
            id="split-name"
            v-model="config.name"
            class="form-control"
            required
            maxlength="120"
          />
        </div>
        <div class="col-6 col-md-2">
          <label
            for="split-k"
            class="form-label"
            >Folds (k)</label
          >
          <input
            id="split-k"
            v-model.number="config.k"
            class="form-control"
            type="number"
            min="2"
            max="20"
            step="1"
            required
          />
        </div>
        <div class="col-6 col-md-2">
          <label
            for="split-test"
            class="form-label"
            >Test-Anteil (%)</label
          >
          <input
            id="split-test"
            v-model.number="config.testPercent"
            class="form-control"
            type="number"
            min="1"
            max="50"
            step="1"
            required
          />
        </div>
        <div class="col-6 col-md-2">
          <label
            for="split-seed"
            class="form-label"
            >Zufalls-Seed</label
          >
          <input
            id="split-seed"
            v-model.number="config.seed"
            class="form-control"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
          />
        </div>
        <div class="col-6 col-md-2">
          <button
            class="btn btn-primary w-100"
            :disabled="saving || loading || !datasetId || !validConfig"
          >
            {{ saving ? 'Speichern…' : 'Buckets erstellen' }}
          </button>
        </div>
      </form>
      <p class="small text-muted mt-3">
        Der Test-Anteil bezieht sich auf ganze Patienten und wird gerundet (mindestens einer). Alle
        angehängten Frame- und Segmentannotationen werden berücksichtigt, unabhängig von den
        Anzeigefiltern. Gespeichert wird die aktuelle Mitgliedschaft; spätere Änderungen am
        Datensatz erfordern einen neuen Plan. Labels werden nicht automatisch stratifiziert.
      </p>
      <div
        v-if="errorMessage"
        class="alert alert-danger"
        role="alert"
      >
        {{ errorMessage }}
      </div>
      <div
        v-if="successMessage"
        class="alert alert-success"
        role="status"
      >
        {{ successMessage }}
      </div>
      <p
        v-if="loading"
        role="status"
      >
        Split-Pläne werden geladen…
      </p>
      <div
        v-else-if="plans.length > 0"
        class="row g-3 mb-3"
      >
        <div class="col-md-8">
          <label
            for="split-plan"
            class="form-label"
            >Gespeicherter Plan</label
          >
          <select
            id="split-plan"
            v-model.number="selectedPlanId"
            class="form-select"
          >
            <option
              v-for="plan in plans"
              :key="plan.id"
              :value="plan.id"
            >
              {{ plan.config.name }} · {{ plan.config.k }} Folds · #{{ plan.id }}
            </option>
          </select>
        </div>
        <div class="col-md-4">
          <label
            for="split-fold"
            class="form-label"
            >Fold anzeigen</label
          >
          <select
            id="split-fold"
            v-model.number="selectedFold"
            class="form-select"
          >
            <option
              v-for="fold in selectedPlan?.folds ?? []"
              :key="fold.index"
              :value="fold.index"
            >
              Fold {{ fold.index + 1 }}
            </option>
          </select>
        </div>
      </div>
      <p
        v-else-if="!errorMessage"
        class="text-muted"
      >
        Noch keine Split-Pläne für diesen Datensatz.
      </p>
      <template v-if="selectedPlan && !loading">
        <p
          class="small text-muted"
          data-test="split-provenance"
        >
          {{ selectedPlan.config.k }} Folds · Test-Ziel {{ selectedPlan.config.testPercent }} % ·
          Seed {{ selectedPlan.config.seed }} ·
          {{ new Date(selectedPlan.createdAt).toLocaleString('de-DE') }}
        </p>
        <div
          class="row g-3"
          data-test="split-buckets"
        >
          <div
            v-for="bucket in buckets"
            :key="bucket.label"
            class="col-md-4"
          >
            <div
              class="card h-100 overflow-hidden bucket-box"
              :class="bucket.border"
            >
              <div
                class="bucket-fill"
                :class="bucket.color"
                :style="{ height: `${String(percentage(bucket.counts.patientCount))}%` }"
                aria-hidden="true"
              ></div>
              <div class="card-body position-relative">
                <h3 class="h6">{{ bucket.label }}</h3>
                <div class="fs-3 fw-bold">
                  {{ percentage(bucket.counts.patientCount).toFixed(1) }} %
                </div>
                <p class="mb-2">
                  {{ bucket.counts.patientCount }} / {{ selectedPlan.total.patientCount }} Patienten
                </p>
                <div
                  class="progress mb-3"
                  role="progressbar"
                  :aria-label="bucket.label"
                  :aria-valuenow="bucket.counts.patientCount"
                  :aria-valuemax="selectedPlan.total.patientCount"
                  :aria-valuemin="0"
                >
                  <div
                    class="progress-bar"
                    :class="bucket.color"
                    :style="{ width: `${String(percentage(bucket.counts.patientCount))}%` }"
                  ></div>
                </div>
                <div>
                  {{ bucket.counts.videoCount }} Videos · {{ bucket.counts.frameCount }} Frames
                </div>
                <div>
                  {{ bucket.counts.imageAnnotationCount }} Frame-Annotationen ·
                  {{ bucket.counts.segmentCount }} Segmente
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import axios from 'axios'
import {
  createDatasetSplitPlan,
  fetchDatasetSplitPlans,
  type DatasetSplitPlan,
  type SplitConfig
} from '@/api/aiDatasetSplitApi'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const props = defineProps<{ datasetId: string }>()
const logger = createRuntimeLogger('ai-dataset-splits')
const config = ref<SplitConfig>({ name: '', k: 5, testPercent: 20, seed: 42 })
const plans = ref<DatasetSplitPlan[]>([])
const selectedPlanId = ref<number | null>(null)
const selectedFold = ref(0)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let generation = 0

const validConfig = computed(
  () =>
    config.value.name.trim().length > 0 &&
    Number.isInteger(config.value.k) &&
    config.value.k >= 2 &&
    config.value.k <= 20 &&
    Number.isInteger(config.value.testPercent) &&
    config.value.testPercent >= 1 &&
    config.value.testPercent <= 50 &&
    Number.isInteger(config.value.seed) &&
    config.value.seed >= 0 &&
    config.value.seed <= 2147483647
)
const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value))
const buckets = computed(() => {
  const plan = selectedPlan.value
  const fold = plan?.folds.find((item) => item.index === selectedFold.value)
  if (!plan || !fold) {
    return []
  }
  return [
    { label: 'Training', counts: fold.training, color: 'bg-primary', border: 'border-primary' },
    {
      label: 'Validierung',
      counts: fold.validation,
      color: 'bg-success',
      border: 'border-success'
    },
    { label: 'Test (fest)', counts: plan.test, color: 'bg-warning', border: 'border-warning' }
  ]
})
function percentage(count: number): number {
  const total = selectedPlan.value?.total.patientCount ?? 0
  return total > 0 ? (100 * count) / total : 0
}
function reportError(error: unknown, fallback: string): void {
  logger.error('split-request-failed', error)
  const data: unknown = axios.isAxiosError<unknown>(error) ? error.response?.data : undefined
  errorMessage.value =
    typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
      ? data.detail
      : fallback
}
async function loadPlans(): Promise<void> {
  const current = ++generation
  plans.value = []
  selectedPlanId.value = null
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = false
  loading.value = Boolean(props.datasetId)
  if (!props.datasetId) {
    return
  }
  try {
    const result = await fetchDatasetSplitPlans(props.datasetId)
    if (current !== generation) {
      return
    }
    plans.value = result
    selectedPlanId.value = result.at(0)?.id ?? null
  } catch (error) {
    if (current === generation) {
      reportError(error, 'Split-Pläne konnten nicht geladen werden.')
    }
  } finally {
    if (current === generation) {
      loading.value = false
    }
  }
}
async function createPlan(): Promise<void> {
  if (!props.datasetId || saving.value || loading.value || !validConfig.value) {
    return
  }
  const current = generation
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const plan = await createDatasetSplitPlan(props.datasetId, { ...config.value })
    if (current !== generation) {
      return
    }
    plans.value = [plan, ...plans.value]
    selectedPlanId.value = plan.id
    successMessage.value = 'Split-Plan gespeichert.'
  } catch (error) {
    if (current === generation) {
      reportError(error, 'Split-Plan konnte nicht erstellt werden.')
    }
  } finally {
    if (current === generation) {
      saving.value = false
    }
  }
}
watch(
  () => props.datasetId,
  () => {
    void loadPlans()
  },
  { immediate: true }
)
watch(selectedPlanId, () => {
  selectedFold.value = 0
})
onBeforeUnmount(() => {
  generation++
})
</script>

<style scoped>
.bucket-box {
  min-height: 230px;
  background: #fff;
}
.bucket-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0.12;
  transition: height 0.3s ease;
}
.progress {
  height: 0.5rem;
  background: #e4e8ec;
}
@media (prefers-reduced-motion: reduce) {
  .bucket-fill {
    transition: none;
  }
}
</style>
