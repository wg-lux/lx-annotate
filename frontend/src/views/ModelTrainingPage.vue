<template>
  <div class="training-page container-fluid py-4 px-3 px-lg-4">
    <section class="training-hero">
      <div>
        <p class="training-eyebrow">AI Training</p>
        <h1 class="training-title">Image Multilabel Model Training</h1>
        <p class="training-intro">
          Start a training run from the selected AI dataset and choose both the model backbone
          and the feature training mode directly from the frontend.
        </p>
      </div>
      <div class="training-status-chip" :class="statusChipClass">
        {{ statusChipLabel }}
      </div>
    </section>

    <div class="row g-4 align-items-start">
      <div class="col-12 col-xl-7">
        <section class="training-card">
          <div class="card-header-row">
            <div>
              <h2>Training Run</h2>
              <p>Pick the dataset, backbone, and feature strategy for the next training job.</p>
            </div>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="loading || runPolling"
              @click="loadPage"
            >
              Neu laden
            </button>
          </div>

          <div v-if="loading" class="loading-state">
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line-short"></div>
            <div class="skeleton-line"></div>
          </div>

          <form v-else class="training-form" @submit.prevent="startTraining">
            <div v-if="errorMessage" class="alert alert-warning mb-3" role="alert">
              {{ errorMessage }}
            </div>

            <label class="training-field">
              <span>AI Dataset</span>
              <select
                v-model="form.datasetId"
                class="form-select"
                data-test="training-dataset-select"
                :disabled="runPolling"
              >
                <option value="">Datensatz auswählen</option>
                <option
                  v-for="dataset in datasetOptions"
                  :key="dataset.id"
                  :value="String(dataset.id)"
                >
                  {{ dataset.label }} (ID: {{ dataset.id }})
                </option>
              </select>
              <small class="text-muted mt-1">
                Nur aktive Image-Multilabel-Datensätze werden angeboten.
              </small>
            </label>

            <label class="training-field">
              <span>Model Backbone</span>
              <select
                v-model="form.backboneName"
                class="form-select"
                data-test="training-backbone-select"
                :disabled="runPolling"
              >
                <option v-for="option in backboneOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <small class="text-muted mt-1">{{ selectedBackboneDescription }}</small>
            </label>

            <label class="training-field">
              <span>Feature Strategy</span>
              <select
                v-model="form.featureMode"
                class="form-select"
                data-test="training-feature-mode-select"
                :disabled="runPolling"
              >
                <option
                  v-for="option in featureModeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <small class="text-muted mt-1">{{ selectedFeatureModeDescription }}</small>
            </label>

            <div class="training-grid">
              <label class="training-field">
                <span>Epochs</span>
                <input
                  v-model.number="form.epochs"
                  type="number"
                  min="1"
                  class="form-control"
                  data-test="training-epochs-input"
                  :disabled="runPolling"
                />
              </label>

              <label class="training-field">
                <span>Batch Size</span>
                <input
                  v-model.number="form.batchSize"
                  type="number"
                  min="1"
                  class="form-control"
                  data-test="training-batch-size-input"
                  :disabled="runPolling"
                />
              </label>

              <label class="training-field">
                <span>LabelSet Version</span>
                <input
                  v-model.number="form.labelsetVersion"
                  type="number"
                  min="1"
                  class="form-control"
                  data-test="training-labelset-version-input"
                  :disabled="runPolling"
                />
              </label>
            </div>

            <label class="training-field">
              <span>Backbone Checkpoint</span>
              <input
                v-model="form.backboneCheckpoint"
                type="text"
                class="form-control"
                data-test="training-backbone-checkpoint-input"
                :disabled="runPolling"
                placeholder="/absolute/path/to/checkpoint.pth"
              />
              <small class="text-muted mt-1">
                Optional. Used only if the chosen backbone supports checkpoint loading.
              </small>
            </label>

            <div class="form-check training-checkbox">
              <input
                id="treat-unlabeled-as-negative"
                v-model="form.treatUnlabeledAsNegative"
                class="form-check-input"
                type="checkbox"
                :disabled="runPolling"
              />
              <label class="form-check-label" for="treat-unlabeled-as-negative">
                Treat unlabeled entries as negatives
              </label>
            </div>

            <div class="actions-row">
              <button
                type="button"
                class="btn btn-primary"
                data-test="start-training-run"
                :disabled="runPolling || !form.datasetId"
                @click="startTraining"
              >
                {{ runPolling ? 'Training läuft…' : 'Training starten' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div class="col-12 col-xl-5">
        <aside class="training-card training-card-contrast">
          <h2>Run Status</h2>
          <p class="status-intro">
            Current state of the latest run started from this page.
          </p>

          <dl v-if="currentRun" class="training-summary">
            <div>
              <dt>Run ID</dt>
              <dd>{{ currentRun.runId }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ currentRun.status }}</dd>
            </div>
            <div>
              <dt>Dataset</dt>
              <dd>{{ currentRun.datasetName || `ID ${currentRun.datasetId}` }}</dd>
            </div>
            <div>
              <dt>Backbone</dt>
              <dd>{{ currentRun.backboneName }}</dd>
            </div>
            <div>
              <dt>Feature Mode</dt>
              <dd>{{ currentRun.featureMode }}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{{ formatTimestamp(currentRun.createdAt) }}</dd>
            </div>
            <div v-if="currentRun.finishedAt">
              <dt>Finished</dt>
              <dd>{{ formatTimestamp(currentRun.finishedAt) }}</dd>
            </div>
            <div v-if="currentRun.result?.modelPath">
              <dt>Model Path</dt>
              <dd>{{ currentRun.result.modelPath }}</dd>
            </div>
            <div v-if="currentRun.result?.metaPath">
              <dt>Meta Path</dt>
              <dd>{{ currentRun.result.metaPath }}</dd>
            </div>
          </dl>
          <p v-else class="text-muted mb-0">Noch kein Training gestartet.</p>

          <div v-if="runErrorMessage" class="alert alert-danger mt-3 mb-0" role="alert">
            {{ runErrorMessage }}
          </div>
        </aside>

        <aside class="training-card mt-4">
          <div class="card-header-row">
            <div>
              <h2>Output Log</h2>
              <p>Captured command output from the current run.</p>
            </div>
          </div>
          <pre class="training-log" data-test="training-run-log">{{ currentRun?.stdout || 'No output yet.' }}</pre>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  createModelTrainingRun,
  fetchModelTrainingOptions,
  fetchModelTrainingRun,
  type ModelTrainingDatasetOption,
  type ModelTrainingOption,
  type ModelTrainingRunRecord
} from '@/api/modelTrainingApi'
import { useToastStore } from '@/stores/toastStore'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const toast = useToastStore()

const loading = ref(true)
const runPolling = ref(false)
const errorMessage = ref('')
const runErrorMessage = ref('')
const currentRun = ref<ModelTrainingRunRecord | null>(null)
const datasetOptions = ref<ModelTrainingDatasetOption[]>([])
const backboneOptions = ref<ModelTrainingOption[]>([])
const featureModeOptions = ref<ModelTrainingOption[]>([])
const pollTimer = ref<number | null>(null)

const form = reactive({
  datasetId: '',
  backboneName: 'gastro_rn50',
  featureMode: 'freeze_backbone',
  epochs: 10,
  batchSize: 32,
  labelsetVersion: 2,
  backboneCheckpoint: '',
  treatUnlabeledAsNegative: true
})

const selectedBackboneDescription = computed(() => {
  return backboneOptions.value.find((option) => option.value === form.backboneName)?.description ?? ''
})

const selectedFeatureModeDescription = computed(() => {
  return featureModeOptions.value.find((option) => option.value === form.featureMode)?.description ?? ''
})

const statusChipLabel = computed(() => {
  if (!currentRun.value) return loading.value ? 'Lade Optionen' : 'Bereit'
  if (currentRun.value.status === 'queued') return 'In Warteschlange'
  if (currentRun.value.status === 'running') return 'Training läuft'
  if (currentRun.value.status === 'completed') return 'Training abgeschlossen'
  return 'Training fehlgeschlagen'
})

const statusChipClass = computed(() => {
  return {
    'training-status-running':
      currentRun.value?.status === 'queued' || currentRun.value?.status === 'running',
    'training-status-success': currentRun.value?.status === 'completed',
    'training-status-failed': currentRun.value?.status === 'failed'
  }
})

function stopPolling(): void {
  if (pollTimer.value !== null) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function applyDefaults(): void {
  const preferredDataset = datasetOptions.value.find((dataset) => dataset.isActive) ?? datasetOptions.value[0]
  if (!form.datasetId && preferredDataset) {
    form.datasetId = String(preferredDataset.id)
  }
}

async function loadPage(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  runErrorMessage.value = ''

  try {
    const options = await fetchModelTrainingOptions()
    datasetOptions.value = options.aiDatasets
    backboneOptions.value = options.backbones
    featureModeOptions.value = options.featureModes
    form.backboneName = options.defaults.backboneName
    form.featureMode = options.defaults.featureMode
    form.epochs = options.defaults.epochs
    form.batchSize = options.defaults.batchSize
    form.labelsetVersion = options.defaults.labelsetVersion
    form.backboneCheckpoint = options.defaults.backboneCheckpoint ?? ''
    form.treatUnlabeledAsNegative = options.defaults.treatUnlabeledAsNegative
    applyDefaults()
  } catch (error) {
    console.error('Failed to load model training options:', error)
    errorMessage.value = 'Die Trainingsoptionen konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function refreshRun(runId: string): Promise<void> {
  try {
    const run = await fetchModelTrainingRun(runId)
    currentRun.value = run

    if (run.status === 'completed') {
      runPolling.value = false
      stopPolling()
      toast.success({ text: 'Training abgeschlossen.' })
    } else if (run.status === 'failed') {
      runPolling.value = false
      stopPolling()
      runErrorMessage.value = run.error || 'Training fehlgeschlagen.'
      toast.error({ text: 'Training fehlgeschlagen.' })
    }
  } catch (error) {
    console.error('Failed to refresh training run:', error)
    runPolling.value = false
    stopPolling()
    runErrorMessage.value = 'Der Trainingsstatus konnte nicht aktualisiert werden.'
  }
}

function startPolling(runId: string): void {
  stopPolling()
  pollTimer.value = window.setInterval(() => {
    void refreshRun(runId)
  }, 2000)
}

async function startTraining(): Promise<void> {
  runErrorMessage.value = ''

  try {
    const run = await createModelTrainingRun({
      datasetId: Number(form.datasetId),
      backboneName: form.backboneName,
      featureMode: form.featureMode,
      epochs: form.epochs,
      batchSize: form.batchSize,
      labelsetVersion: form.labelsetVersion,
      treatUnlabeledAsNegative: form.treatUnlabeledAsNegative,
      backboneCheckpoint: form.backboneCheckpoint.trim() || null
    })

    currentRun.value = run
    runPolling.value = true
    toast.success({ text: 'Training gestartet.' })
    startPolling(run.runId)
    void refreshRun(run.runId)
  } catch (error) {
    console.error('Failed to start training run:', error)
    runErrorMessage.value = 'Der Trainingslauf konnte nicht gestartet werden.'
    toast.error({ text: 'Training konnte nicht gestartet werden.' })
  }
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

onMounted(() => {
  void loadPage()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.training-page {
  color: #17324d;
}

.training-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.training-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  font-weight: 700;
  color: #2f6f94;
  margin-bottom: 0.35rem;
}

.training-title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 700;
}

.training-intro {
  margin-top: 0.75rem;
  max-width: 50rem;
  color: #587086;
}

.training-status-chip {
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: #edf3f7;
  color: #17324d;
  font-weight: 600;
}

.training-status-running {
  background: #fff3cd;
  color: #7a5a00;
}

.training-status-success {
  background: #d7f5e5;
  color: #176c49;
}

.training-status-failed {
  background: #f9d7d7;
  color: #8f2020;
}

.training-card {
  background: linear-gradient(180deg, #ffffff 0%, #f5f8fb 100%);
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: 0 20px 55px rgba(16, 38, 58, 0.08);
  border: 1px solid rgba(47, 111, 148, 0.12);
}

.training-card-contrast {
  background: linear-gradient(180deg, #17324d 0%, #224f71 100%);
  color: #f7fbff;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.card-header-row h2,
.training-card-contrast h2 {
  margin: 0;
}

.card-header-row p,
.status-intro {
  margin: 0.35rem 0 0;
  color: #6c8092;
}

.training-card-contrast .status-intro {
  color: rgba(247, 251, 255, 0.72);
}

.training-form {
  display: grid;
  gap: 1rem;
}

.training-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

.training-field {
  display: grid;
  gap: 0.45rem;
  font-weight: 600;
}

.training-checkbox {
  margin-top: 0.25rem;
}

.actions-row {
  display: flex;
  justify-content: flex-start;
  margin-top: 0.5rem;
}

.training-summary {
  display: grid;
  gap: 0.9rem;
  margin: 0;
}

.training-summary div {
  display: grid;
  gap: 0.2rem;
}

.training-summary dt {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.72;
}

.training-summary dd {
  margin: 0;
  font-weight: 600;
  word-break: break-word;
}

.training-log {
  margin: 0;
  min-height: 18rem;
  max-height: 30rem;
  overflow: auto;
  border-radius: 1rem;
  padding: 1rem;
  background: #0f2030;
  color: #d8f1ff;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.loading-state {
  display: grid;
  gap: 0.85rem;
}

.skeleton-line {
  height: 0.95rem;
  border-radius: 999px;
  background: linear-gradient(90deg, #e7eef4 0%, #dce7ef 50%, #e7eef4 100%);
}

.skeleton-line-short {
  width: 65%;
}

@media (max-width: 767px) {
  .training-hero {
    flex-direction: column;
  }
}
</style>
