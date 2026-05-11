<template>
  <div class="training-page container-fluid py-4 px-3 px-lg-4">
    <section class="training-hero">
      <div>
        <p class="training-eyebrow">AI Training</p>
        <h1 class="training-title">Model Training Control Pane</h1>
        <p class="training-intro">
          Start image classification runs or train the lx-anonymizer PHI-region detector
          from the frontend.
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
              <p>Pick the training target and parameters for the next backend job.</p>
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
            <div class="training-target-control" role="group" aria-label="Training target">
              <button
                v-for="option in trainingTargetOptions"
                :key="option.value"
                type="button"
                class="training-target-button"
                :class="{ 'training-target-button-active': form.trainingTarget === option.value }"
                :disabled="runPolling"
                @click="setTrainingTarget(option.value)"
              >
                <span>{{ option.label }}</span>
              </button>
            </div>

            <div v-if="errorMessage" class="alert alert-warning mb-3" role="alert">
              {{ errorMessage }}
            </div>

            <template v-if="form.trainingTarget === 'image_multilabel'">
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
            </template>

            <template v-else>
              <label class="training-field">
                <span>YOLO Dataset YAML</span>
                <input
                  v-model="form.datasetYaml"
                  type="text"
                  class="form-control"
                  data-test="phi-dataset-yaml-input"
                  :disabled="runPolling"
                  placeholder="/absolute/path/to/dataset.yaml"
                />
              </label>

              <label class="training-field">
                <span>Base Detector</span>
                <select
                  v-model="form.baseModel"
                  class="form-select"
                  data-test="phi-base-model-select"
                  :disabled="runPolling"
                >
                  <option
                    v-for="option in phiBaseModelOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <small class="text-muted mt-1">{{ selectedPhiBaseModelDescription }}</small>
              </label>

              <div class="training-grid">
                <label class="training-field">
                  <span>Epochs</span>
                  <input
                    v-model.number="form.epochs"
                    type="number"
                    min="1"
                    class="form-control"
                    data-test="phi-epochs-input"
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
                    data-test="phi-batch-size-input"
                    :disabled="runPolling"
                  />
                </label>

                <label class="training-field">
                  <span>Input Size</span>
                  <input
                    v-model.number="form.inputSize"
                    type="number"
                    min="32"
                    step="32"
                    class="form-control"
                    data-test="phi-input-size-input"
                    :disabled="runPolling"
                  />
                </label>
              </div>

              <div class="training-grid">
                <label class="training-field">
                  <span>Device</span>
                  <input
                    v-model="form.device"
                    type="text"
                    class="form-control"
                    data-test="phi-device-input"
                    :disabled="runPolling"
                    placeholder="auto"
                  />
                </label>

                <label class="training-field">
                  <span>Workers</span>
                  <input
                    v-model.number="form.workers"
                    type="number"
                    min="0"
                    class="form-control"
                    data-test="phi-workers-input"
                    :disabled="runPolling"
                  />
                </label>

                <label class="training-field">
                  <span>Patience</span>
                  <input
                    v-model.number="form.patience"
                    type="number"
                    min="0"
                    class="form-control"
                    data-test="phi-patience-input"
                    :disabled="runPolling"
                  />
                </label>
              </div>

              <div class="training-grid">
                <label class="training-field">
                  <span>Confidence</span>
                  <input
                    v-model.number="form.confidenceThreshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    class="form-control"
                    data-test="phi-confidence-input"
                    :disabled="runPolling"
                  />
                </label>

                <label class="training-field">
                  <span>NMS Threshold</span>
                  <input
                    v-model.number="form.nmsThreshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    class="form-control"
                    data-test="phi-nms-input"
                    :disabled="runPolling"
                  />
                </label>

                <label class="training-field">
                  <span>Class IDs</span>
                  <input
                    v-model="form.classIds"
                    type="text"
                    class="form-control"
                    data-test="phi-class-ids-input"
                    :disabled="runPolling"
                    placeholder="0,1"
                  />
                </label>
              </div>

              <label class="training-field">
                <span>Output Directory</span>
                <input
                  v-model="form.outputDir"
                  type="text"
                  class="form-control"
                  data-test="phi-output-dir-input"
                  :disabled="runPolling"
                  placeholder="/absolute/path/to/runs"
                />
              </label>

              <label class="training-field">
                <span>Run Name</span>
                <input
                  v-model="form.runName"
                  type="text"
                  class="form-control"
                  data-test="phi-run-name-input"
                  :disabled="runPolling"
                  placeholder="phi-detector-v1"
                />
              </label>

              <div class="form-check training-checkbox">
                <input
                  id="phi-export-onnx"
                  v-model="form.exportOnnx"
                  class="form-check-input"
                  type="checkbox"
                  data-test="phi-export-onnx-checkbox"
                  :disabled="runPolling"
                />
                <label class="form-check-label" for="phi-export-onnx">
                  Export ONNX for lx-anonymizer
                </label>
              </div>
            </template>

            <div class="actions-row">
              <button
                type="button"
                class="btn btn-primary"
                data-test="start-training-run"
                :disabled="runPolling || !canStartTraining"
                @click="startTraining"
              >
                {{ runPolling ? 'Training läuft…' : 'Training starten' }}
              </button>
            </div>
          </form>

          <div v-if="recentRuns.length" class="recent-runs" data-test="training-runs-list">
            <div class="recent-runs-header">
              <h3>Letzte Trainingsläufe</h3>
              <span>{{ recentRuns.length }} gespeichert</span>
            </div>
            <div class="recent-runs-table">
              <button
                v-for="run in recentRuns"
                :key="run.runId"
                type="button"
                class="recent-run-row"
                :class="{ 'recent-run-row-active': currentRun?.runId === run.runId }"
                @click="selectRun(run)"
              >
                <span>{{ runDatasetLabel(run) }}</span>
                <span>{{ runStatusLabel(run.status) }}</span>
                <span>{{ formatTimestamp(run.createdAt) }}</span>
              </button>
            </div>
          </div>
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
              <dt>Target</dt>
              <dd>{{ trainingTargetLabel(currentRun.trainingTarget) }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ runStatusLabel(currentRun.status) }}</dd>
            </div>
            <div>
              <dt>Dataset</dt>
              <dd>{{ runDatasetLabel(currentRun) }}</dd>
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
            <div v-for="[label, path] in artifactEntries" :key="label">
              <dt>{{ artifactLabel(label) }}</dt>
              <dd>{{ path }}</dd>
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
          <details class="training-log-details" open>
            <summary>Ausgabe anzeigen</summary>
            <pre class="training-log" data-test="training-run-log">{{ runOutputLog }}</pre>
          </details>
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
  fetchModelTrainingRuns,
  type PhiRegionDetectorTrainingDefaults,
  type ModelTrainingDatasetOption,
  type ModelTrainingOption,
  type ModelTrainingOptionsResponse,
  type ModelTrainingRunPayload,
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
const recentRuns = ref<ModelTrainingRunRecord[]>([])
const trainingTargetOptions = ref<ModelTrainingOption[]>([])
const datasetOptions = ref<ModelTrainingDatasetOption[]>([])
const backboneOptions = ref<ModelTrainingOption[]>([])
const featureModeOptions = ref<ModelTrainingOption[]>([])
const phiBaseModelOptions = ref<ModelTrainingOption[]>([])
const imageDefaults = ref<ModelTrainingOptionsResponse['defaults'] | null>(null)
const phiDefaults = ref<PhiRegionDetectorTrainingDefaults | null>(null)
const pollTimer = ref<number | null>(null)

type TrainingTarget = 'image_multilabel' | 'phi_region_detector'

const form = reactive({
  trainingTarget: 'image_multilabel' as TrainingTarget,
  datasetId: '',
  datasetYaml: '',
  outputDir: '',
  baseModel: 'yolov8n.pt',
  runName: '',
  backboneName: 'gastro_rn50',
  featureMode: 'freeze_backbone',
  epochs: 10,
  batchSize: 32,
  inputSize: 640,
  device: 'auto',
  workers: 4,
  patience: 25,
  exportOnnx: true,
  confidenceThreshold: 0.35,
  nmsThreshold: 0.45,
  classIds: '',
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

const selectedPhiBaseModelDescription = computed(() => {
  return phiBaseModelOptions.value.find((option) => option.value === form.baseModel)?.description ?? ''
})

const canStartTraining = computed(() => {
  if (form.trainingTarget === 'phi_region_detector') {
    return Boolean(form.datasetYaml.trim())
  }
  return Boolean(form.datasetId)
})

const statusChipLabel = computed(() => {
  if (!currentRun.value) return loading.value ? 'Lade Optionen' : 'Bereit'
  return runStatusLabel(currentRun.value.status)
})

const statusChipClass = computed(() => {
  return {
    'training-status-running':
      currentRun.value?.status === 'queued' || currentRun.value?.status === 'running',
    'training-status-success': currentRun.value?.status === 'completed',
    'training-status-failed':
      currentRun.value?.status === 'failed' || currentRun.value?.status === 'lost'
  }
})

const artifactEntries = computed(() => {
  const entries = Object.entries(currentRun.value?.artifactPaths ?? {})
  return entries.filter(([key]) => {
    return !['model_path', 'meta_path', 'modelPath', 'metaPath'].includes(key) || !currentRun.value?.result
  })
})

const runOutputLog = computed(() => {
  const output = [currentRun.value?.stdout, currentRun.value?.stderr]
    .filter((value) => value && value.trim())
    .join('\n')
  return output || 'No output yet.'
})

function isRunActive(run: ModelTrainingRunRecord): boolean {
  return run.status === 'queued' || run.status === 'running'
}

function runStatusLabel(status: ModelTrainingRunRecord['status']): string {
  if (status === 'queued') return 'In Warteschlange'
  if (status === 'running') return 'Training läuft'
  if (status === 'completed') return 'Training abgeschlossen'
  if (status === 'lost') return 'Ergebnis verloren'
  return 'Training fehlgeschlagen'
}

function trainingTargetLabel(target: ModelTrainingRunRecord['trainingTarget']): string {
  if (target === 'phi_region_detector') return 'PHI Region Detector'
  return 'Image Multilabel Model'
}

function runDatasetLabel(run: ModelTrainingRunRecord): string {
  if (run.datasetName) return run.datasetName
  if (run.datasetId) return `ID ${run.datasetId}`
  return 'External dataset'
}

function artifactLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

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

function applyImageTrainingDefaults(defaults: ModelTrainingOptionsResponse['defaults']): void {
  form.backboneName = defaults.backboneName
  form.featureMode = defaults.featureMode
  form.epochs = defaults.epochs
  form.batchSize = defaults.batchSize
  form.labelsetVersion = defaults.labelsetVersion
  form.backboneCheckpoint = defaults.backboneCheckpoint ?? ''
  form.treatUnlabeledAsNegative = defaults.treatUnlabeledAsNegative
}

function applyPhiDefaults(defaults: PhiRegionDetectorTrainingDefaults, includeShared = false): void {
  form.datasetYaml = defaults.datasetYaml
  form.outputDir = defaults.outputDir
  form.baseModel = defaults.baseModel
  form.runName = defaults.runName
  if (includeShared) {
    form.epochs = defaults.epochs
    form.batchSize = defaults.batchSize
  }
  form.inputSize = defaults.inputSize
  form.device = defaults.device
  form.workers = defaults.workers
  form.patience = defaults.patience
  form.exportOnnx = defaults.exportOnnx
  form.confidenceThreshold = defaults.confidenceThreshold
  form.nmsThreshold = defaults.nmsThreshold
  form.classIds = defaults.classIds
}

function setTrainingTarget(value: string): void {
  if (value === 'image_multilabel' || value === 'phi_region_detector') {
    form.trainingTarget = value
    errorMessage.value = ''
    if (value === 'phi_region_detector' && phiDefaults.value) {
      applyPhiDefaults(phiDefaults.value, true)
    } else if (value === 'image_multilabel' && imageDefaults.value) {
      applyImageTrainingDefaults(imageDefaults.value)
    }
  }
}

async function loadPage(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  runErrorMessage.value = ''
  stopPolling()

  try {
    const [options, runs] = await Promise.all([
      fetchModelTrainingOptions(),
      fetchModelTrainingRuns()
    ])
    trainingTargetOptions.value = options.trainingTargets
    datasetOptions.value = options.aiDatasets
    backboneOptions.value = options.backbones
    featureModeOptions.value = options.featureModes
    phiBaseModelOptions.value = options.phiRegionDetector.baseModels
    imageDefaults.value = options.defaults
    phiDefaults.value = options.phiRegionDetector.defaults
    recentRuns.value = runs
    applyImageTrainingDefaults(options.defaults)
    applyDefaults()
    applyPhiDefaults(options.phiRegionDetector.defaults)
    const activeRun = runs.find(isRunActive) ?? runs[0] ?? null
    currentRun.value = activeRun
    runErrorMessage.value =
      activeRun && (activeRun.status === 'failed' || activeRun.status === 'lost')
        ? activeRun.error || 'Training fehlgeschlagen.'
        : ''
    runPolling.value = activeRun ? isRunActive(activeRun) : false
    if (activeRun && isRunActive(activeRun)) {
      startPolling(activeRun.runId)
    }
  } catch (error) {
    console.error('Failed to load model training page:', error)
    errorMessage.value = 'Die Trainingsoptionen oder gespeicherten Läufe konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function refreshRun(runId: string): Promise<void> {
  try {
    const run = await fetchModelTrainingRun(runId)
    currentRun.value = run
    recentRuns.value = [run, ...recentRuns.value.filter((entry) => entry.runId !== run.runId)]

    if (run.status === 'completed') {
      runPolling.value = false
      stopPolling()
      toast.success({ text: 'Training abgeschlossen.' })
    } else if (run.status === 'failed' || run.status === 'lost') {
      runPolling.value = false
      stopPolling()
      runErrorMessage.value = run.error || 'Training fehlgeschlagen.'
      toast.error({ text: run.status === 'lost' ? 'Trainingsergebnis verloren.' : 'Training fehlgeschlagen.' })
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
  runPolling.value = true
  pollTimer.value = window.setInterval(() => {
    void refreshRun(runId)
  }, 2000)
}

function selectRun(run: ModelTrainingRunRecord): void {
  currentRun.value = run
  runErrorMessage.value = run.error || ''
  if (isRunActive(run)) {
    startPolling(run.runId)
  } else {
    runPolling.value = false
    stopPolling()
  }
}

async function startTraining(): Promise<void> {
  runErrorMessage.value = ''
  errorMessage.value = ''

  try {
    const payload: ModelTrainingRunPayload =
      form.trainingTarget === 'phi_region_detector'
        ? {
            trainingTarget: form.trainingTarget,
            datasetYaml: form.datasetYaml.trim(),
            outputDir: form.outputDir.trim(),
            baseModel: form.baseModel,
            runName: form.runName.trim() || null,
            epochs: form.epochs,
            batchSize: form.batchSize,
            inputSize: form.inputSize,
            device: form.device.trim() || 'auto',
            workers: form.workers,
            patience: form.patience,
            exportOnnx: form.exportOnnx,
            confidenceThreshold: form.confidenceThreshold,
            nmsThreshold: form.nmsThreshold,
            classIds: form.classIds.trim()
          }
        : {
            datasetId: Number(form.datasetId),
            backboneName: form.backboneName,
            featureMode: form.featureMode,
            epochs: form.epochs,
            batchSize: form.batchSize,
            labelsetVersion: form.labelsetVersion,
            treatUnlabeledAsNegative: form.treatUnlabeledAsNegative,
            backboneCheckpoint: form.backboneCheckpoint.trim() || null
          }
    const run = await createModelTrainingRun(payload)

    currentRun.value = run
    recentRuns.value = [run, ...recentRuns.value.filter((entry) => entry.runId !== run.runId)]
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

.training-target-control {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
}

.training-target-button {
  border: 1px solid rgba(47, 111, 148, 0.2);
  border-radius: 0.5rem;
  background: #fff;
  color: #17324d;
  padding: 0.8rem 0.9rem;
  font-weight: 700;
  text-align: left;
}

.training-target-button-active {
  border-color: #2f6f94;
  background: #eef7fb;
  color: #1d587a;
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

.recent-runs {
  margin-top: 1.5rem;
  border-top: 1px solid rgba(47, 111, 148, 0.16);
  padding-top: 1.25rem;
}

.recent-runs-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.recent-runs-header h3 {
  margin: 0;
  font-size: 1rem;
}

.recent-runs-header span {
  color: #6c8092;
  font-size: 0.85rem;
}

.recent-runs-table {
  display: grid;
  gap: 0.5rem;
}

.recent-run-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(8rem, 0.8fr) minmax(9rem, 0.8fr);
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  border: 1px solid rgba(47, 111, 148, 0.14);
  border-radius: 0.5rem;
  background: #fff;
  color: #17324d;
  padding: 0.65rem 0.75rem;
  text-align: left;
}

.recent-run-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.recent-run-row-active {
  border-color: #2f6f94;
  background: #eef7fb;
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

.training-log-details summary {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 0.75rem;
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

  .recent-run-row {
    grid-template-columns: 1fr;
  }
}
</style>
