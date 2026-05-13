<template>
  <div class="dataset-settings-page container-fluid py-4 px-3 px-lg-4">
    <section class="page-heading">
      <div>
        <p class="section-kicker">KI-Datensatz</p>
        <h1>Training-Manifest</h1>
        <p class="heading-copy">
          Verwalten Sie Datensätze und prüfen Sie die Manifest-Konfiguration für das Modelltraining.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="loadingOptions || buildingManifest || creatingDataset"
        data-test="reload-options"
        @click="loadOptions"
      >
        Neu laden
      </button>
    </section>

    <div class="settings-layout">
      <section class="settings-panel">
        <div class="panel-heading">
          <h2>Datensatz</h2>
          <span
            class="status-chip"
            :class="{ 'status-chip-busy': loadingOptions || buildingManifest || creatingDataset }"
          >
            {{ statusLabel }}
          </span>
        </div>

        <form class="create-dataset-panel" data-test="create-dataset-form" @submit.prevent="createDataset">
          <div>
            <h3>Neuen Datensatz erstellen</h3>
            <p>Erstellt einen leeren Datensatz und wählt ihn direkt für die Manifest-Vorschau aus.</p>
          </div>
          <div class="create-dataset-grid">
            <label class="field-group">
              <span>Name</span>
              <input
                v-model="createDatasetForm.name"
                class="form-control"
                data-test="new-dataset-name-input"
                :disabled="loadingOptions || buildingManifest || creatingDataset"
                placeholder="z. B. Koloskopie Training Mai 2026"
                maxlength="255"
              />
            </label>

            <label class="field-group">
              <span>Datensatztyp</span>
              <select
                v-model="createDatasetForm.datasetType"
                class="form-select"
                data-test="new-dataset-type-select"
                :disabled="loadingOptions || buildingManifest || creatingDataset"
              >
                <option value="image">Bilddatensatz</option>
                <option value="video">Video-Segmentdatensatz</option>
              </select>
            </label>

            <button
              type="submit"
              class="btn btn-outline-primary create-dataset-button"
              data-test="create-dataset-button"
              :disabled="!canCreateDataset"
            >
              {{ creatingDataset ? 'Datensatz wird erstellt...' : 'Datensatz erstellen' }}
            </button>
          </div>
        </form>

        <div v-if="createdDatasetMessage" class="alert alert-success mb-0 mt-3" role="status">
          {{ createdDatasetMessage }}
        </div>

        <div class="settings-grid">
          <label class="field-group">
            <span>KI-Datensatz</span>
            <select
              v-model="selectedDatasetId"
              class="form-select"
              data-test="dataset-select"
              :disabled="loadingOptions || buildingManifest || creatingDataset"
            >
              <option value="">Datensatz auswählen</option>
              <option v-for="dataset in datasetOptions" :key="dataset.id" :value="String(dataset.id)">
                {{ dataset.label }} - {{ datasetTypeLabel(dataset.datasetType) }} - ID {{ dataset.id }}
              </option>
            </select>
          </label>

          <label class="field-group">
            <span>Label-Set</span>
            <select
              v-model="form.labelSetId"
              class="form-select"
              data-test="label-set-select"
              :disabled="loadingOptions || buildingManifest || creatingDataset"
            >
              <option value="">Automatisch erkennen</option>
              <option v-for="group in labelSetOptions" :key="group.id" :value="String(group.id)">
                {{ group.name }} v{{ group.version }} - {{ group.labelCount }} Labels
              </option>
            </select>
          </label>

          <label class="field-group">
            <span>Aktuelle Vorverarbeitung</span>
            <select
              v-model="form.preprocessingStrategy"
              class="form-select"
              data-test="preprocessing-strategy-select"
              :disabled="buildingManifest || creatingDataset"
            >
              <option value="preserve_dimensions_black_mask">Dimensionen mit schwarzer Maske beibehalten</option>
              <option value="crop_to_endoscope_roi">Endoskop-ROI zuschneiden</option>
            </select>
          </label>

          <label class="field-group">
            <span>Modelleingabe</span>
            <select
              v-model="form.recommendedModelInputStrategy"
              class="form-select"
              data-test="model-input-strategy-select"
              :disabled="buildingManifest || creatingDataset"
            >
              <option value="crop_to_endoscope_roi">Endoskop-ROI zuschneiden</option>
              <option value="preserve_dimensions_black_mask">Dimensionen mit schwarzer Maske beibehalten</option>
            </select>
          </label>

          <label class="field-group">
            <span>Informationsquellen</span>
            <input
              v-model="informationSourceInput"
              class="form-control"
              data-test="information-source-input"
              :disabled="buildingManifest || creatingDataset"
              placeholder="manual_annotation, prediction"
            />
          </label>

          <div class="check-column">
            <label class="check-row">
              <input
                v-model="form.treatUnlabeledAsNegative"
                class="form-check-input"
                type="checkbox"
                data-test="unknowns-negative-checkbox"
                :disabled="buildingManifest || creatingDataset"
              />
              <span>Unbekannte als negativ trainieren</span>
            </label>
            <label class="check-row">
              <input
                v-model="form.checkFrameFormat"
                class="form-check-input"
                type="checkbox"
                data-test="check-frame-format-checkbox"
                :disabled="buildingManifest || creatingDataset"
              />
              <span>Frame-Format prüfen</span>
            </label>
            <label class="check-row">
              <input
                v-model="form.includeFilePaths"
                class="form-check-input"
                type="checkbox"
                data-test="include-file-paths-checkbox"
                :disabled="buildingManifest || creatingDataset"
              />
              <span>Lokale Dateipfade einschließen</span>
            </label>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-warning mb-0 mt-3" role="alert">
          {{ errorMessage }}
        </div>

        <div class="actions-row">
          <button
            type="button"
            class="btn btn-primary"
            data-test="build-training-manifest"
            :disabled="buildingManifest || creatingDataset || !selectedDatasetId"
            @click="buildManifest"
          >
            {{ buildingManifest ? 'Manifest wird erstellt...' : 'Manifest-Vorschau erstellen' }}
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="buildingManifest || creatingDataset"
            @click="resetManifest"
          >
            Ergebnis zurücksetzen
          </button>
        </div>
      </section>

      <section class="settings-panel summary-panel">
        <div class="panel-heading">
          <h2>Manifest-Zusammenfassung</h2>
          <span v-if="manifestPreview" class="status-chip status-chip-ready" data-test="manifest-ready">
            {{ manifestPreview.summary.sampleCount }} Beispiele
          </span>
        </div>

        <div v-if="!manifestPreview" class="empty-state">
          Noch keine Manifest-Vorschau vorhanden.
        </div>

        <template v-else>
          <div class="summary-grid" data-test="manifest-summary">
            <div class="metric-tile">
              <span>Labels</span>
              <strong>{{ manifestPreview.summary.labelCount }}</strong>
            </div>
            <div class="metric-tile">
              <span>Beispiele</span>
              <strong>{{ manifestPreview.summary.sampleCount }}</strong>
            </div>
            <div class="metric-tile">
              <span>Frame-Prüfung</span>
              <strong>{{ frameFormatLabel }}</strong>
            </div>
            <div class="metric-tile">
              <span>Crop-Vorlagen</span>
              <strong>{{ cropTemplateCount }}</strong>
            </div>
          </div>

          <dl class="format-list" data-test="frame-format-summary">
            <div>
              <dt>Format</dt>
              <dd>{{ frameFormatDetail }}</dd>
            </div>
            <div>
              <dt>Vorverarbeitung</dt>
              <dd>{{ strategyLabel(manifestPreview.summary.frameFormat.preprocessingStrategy) }}</dd>
            </div>
            <div>
              <dt>Modelleingabe</dt>
              <dd>{{ strategyLabel(manifestPreview.summary.frameFormat.recommendedModelInputStrategy) }}</dd>
            </div>
          </dl>

          <details class="manifest-json">
            <summary>lx-ai-core-Payload</summary>
            <pre data-test="lx-ai-core-manifest-json">{{ lxAiCoreManifestJson }}</pre>
          </details>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildAiDatasetTrainingManifest,
  createAiDataset,
  fetchAiDatasetLabelSets,
  fetchAiDatasetOptions,
  type AiDatasetModelType,
  type AiDatasetType,
  type AiDatasetFrameFormatStrategy,
  type AiDatasetLabelSetOption,
  type AiDatasetOption,
  type AiDatasetTrainingManifestConfig,
  type AiDatasetTrainingManifestPreview
} from '@/api/aiDatasetApi'
import { computed, onMounted, reactive, ref } from 'vue'

const datasetOptions = ref<AiDatasetOption[]>([])
const labelSetOptions = ref<AiDatasetLabelSetOption[]>([])
const selectedDatasetId = ref('')
const loadingOptions = ref(true)
const buildingManifest = ref(false)
const creatingDataset = ref(false)
const errorMessage = ref('')
const createdDatasetMessage = ref('')
const manifestPreview = ref<AiDatasetTrainingManifestPreview | null>(null)
const informationSourceInput = ref('')

const createDatasetForm = reactive<{
  name: string
  datasetType: AiDatasetType
}>({
  name: '',
  datasetType: 'image'
})

const form = reactive<AiDatasetTrainingManifestConfig>({
  labelSetId: '',
  treatUnlabeledAsNegative: false,
  includeFilePaths: false,
  checkFrameFormat: true,
  preprocessingStrategy: 'preserve_dimensions_black_mask',
  recommendedModelInputStrategy: 'crop_to_endoscope_roi',
  informationSourceNames: null
})

const canCreateDataset = computed(() => {
  return (
    createDatasetForm.name.trim().length > 0 &&
    !loadingOptions.value &&
    !buildingManifest.value &&
    !creatingDataset.value
  )
})

const statusLabel = computed(() => {
  if (loadingOptions.value) return 'Optionen werden geladen'
  if (creatingDataset.value) return 'Datensatz wird erstellt'
  if (buildingManifest.value) return 'Vorschau wird erstellt'
  return 'Bereit'
})

const frameFormatLabel = computed(() => {
  const status = manifestPreview.value?.summary.frameFormat.status
  if (status === 'passed') return 'Bestanden'
  if (status === 'failed') return 'Fehlgeschlagen'
  return 'Nicht geprüft'
})

const frameFormatDetail = computed(() => {
  const frameFormat = manifestPreview.value?.summary.frameFormat
  if (!frameFormat || frameFormat.status === 'not_checked') return 'Nicht geprüft'
  const dimensions =
    frameFormat.expectedWidth && frameFormat.expectedHeight
      ? `${frameFormat.expectedWidth} x ${frameFormat.expectedHeight}`
      : 'Unbekannte Dimensionen'
  return `${frameFormat.expectedImageFormat || 'Unbekanntes Format'} - ${dimensions} - ${
    frameFormat.expectedMode || 'Unbekannter Modus'
  }`
})

const cropTemplateCount = computed(() => {
  const templates = manifestPreview.value?.summary.frameFormat.cropTemplatesByVideoUuid ?? {}
  return Object.values(templates).filter((template) => Array.isArray(template)).length
})

const lxAiCoreManifestJson = computed(() => {
  if (!manifestPreview.value) return ''
  return JSON.stringify(manifestPreview.value.lxAiCoreManifest, null, 2)
})

function strategyLabel(strategy: AiDatasetFrameFormatStrategy): string {
  if (strategy === 'crop_to_endoscope_roi') return 'Endoskop-ROI zuschneiden'
  return 'Dimensionen mit schwarzer Maske beibehalten'
}

function datasetTypeLabel(datasetType: AiDatasetType | string): string {
  if (datasetType === 'image') return 'Bild'
  if (datasetType === 'video') return 'Video'
  return datasetType
}

function aiModelTypeForDatasetType(datasetType: AiDatasetType): AiDatasetModelType {
  if (datasetType === 'video') return 'video_segment_classification'
  return 'image_multilabel_classification'
}

function normalizedInformationSourceNames(): string[] | null {
  const names = informationSourceInput.value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  return names.length ? names : null
}

async function loadOptions(): Promise<void> {
  loadingOptions.value = true
  errorMessage.value = ''
  try {
    const [datasets, labelSets] = await Promise.all([
      fetchAiDatasetOptions(),
      fetchAiDatasetLabelSets()
    ])
    datasetOptions.value = datasets
    labelSetOptions.value = labelSets
    if (!selectedDatasetId.value) {
      const imageDataset =
        datasets.find((dataset) => dataset.datasetType === 'image' && dataset.isActive) ??
        datasets.find((dataset) => dataset.datasetType === 'image') ??
        datasets[0]
      selectedDatasetId.value = imageDataset ? String(imageDataset.id) : ''
    }
  } catch (error) {
    console.error('Failed to load AI dataset manifest options:', error)
    errorMessage.value = 'Datensatz-Optionen konnten nicht geladen werden.'
  } finally {
    loadingOptions.value = false
  }
}

async function createDataset(): Promise<void> {
  if (!canCreateDataset.value) return

  creatingDataset.value = true
  errorMessage.value = ''
  createdDatasetMessage.value = ''
  try {
    const createdDataset = await createAiDataset({
      name: createDatasetForm.name.trim(),
      datasetType: createDatasetForm.datasetType,
      aiModelType: aiModelTypeForDatasetType(createDatasetForm.datasetType),
      isActive: true
    })
    datasetOptions.value = await fetchAiDatasetOptions()
    selectedDatasetId.value = String(createdDataset.id)
    createDatasetForm.name = ''
    createdDatasetMessage.value = `Datensatz "${createdDataset.label}" wurde erstellt und ausgewählt.`
    resetManifest()
  } catch (error: any) {
    console.error('Failed to create AI dataset:', error)
    const errors = error?.response?.data?.errors
    if (errors?.name) {
      errorMessage.value = 'Bitte geben Sie einen gültigen Namen für den Datensatz ein.'
    } else if (errors?.datasetType) {
      errorMessage.value = 'Bitte wählen Sie einen gültigen Datensatztyp aus.'
    } else if (errors?.aiModelType) {
      errorMessage.value = 'Der Modelltyp passt nicht zum ausgewählten Datensatztyp.'
    } else {
      errorMessage.value = 'Der Datensatz konnte nicht erstellt werden.'
    }
  } finally {
    creatingDataset.value = false
  }
}

async function buildManifest(): Promise<void> {
  if (!selectedDatasetId.value) return

  buildingManifest.value = true
  errorMessage.value = ''
  createdDatasetMessage.value = ''
  manifestPreview.value = null
  try {
    manifestPreview.value = await buildAiDatasetTrainingManifest(selectedDatasetId.value, {
      ...form,
      labelSetId: form.labelSetId || null,
      informationSourceNames: normalizedInformationSourceNames()
    })
  } catch (error: any) {
    console.error('Failed to build AI dataset training manifest:', error)
    const errors = error?.response?.data?.errors
    errorMessage.value =
      errors?.manifest ||
      errors?.labelSetId ||
      errors?.preprocessingStrategy ||
      errors?.recommendedModelInputStrategy ||
      'Das Manifest konnte mit dieser Konfiguration nicht erstellt werden.'
  } finally {
    buildingManifest.value = false
  }
}

function resetManifest(): void {
  manifestPreview.value = null
  errorMessage.value = ''
}

onMounted(() => {
  void loadOptions()
})
</script>

<style scoped>
.dataset-settings-page {
  color: #172337;
}

.page-heading,
.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.page-heading {
  margin-bottom: 1rem;
}

.section-kicker {
  margin: 0 0 0.35rem;
  color: #2f6f94;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.page-heading h1,
.panel-heading h2 {
  margin: 0;
}

.page-heading h1 {
  font-size: 2rem;
  font-weight: 700;
}

.heading-copy {
  margin: 0.5rem 0 0;
  color: #5d7085;
}

.panel-heading h2 {
  font-size: 1.1rem;
  font-weight: 700;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(20rem, 0.9fr);
  gap: 1rem;
  align-items: start;
}

.settings-panel,
.empty-state {
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
  padding: 1rem;
}

.create-dataset-panel {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #f8fbfc;
}

.create-dataset-panel h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.create-dataset-panel p {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.create-dataset-grid {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) minmax(11rem, 0.7fr) auto;
  gap: 0.75rem;
  align-items: end;
}

.create-dataset-button {
  min-height: 2.35rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.field-group {
  display: grid;
  gap: 0.35rem;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
}

.check-column {
  display: grid;
  gap: 0.65rem;
  align-content: center;
}

.check-row {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  margin: 0;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.status-chip {
  border-radius: 999px;
  background: #eef3f8;
  color: #476176;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  white-space: nowrap;
}

.status-chip-ready {
  background: #e7f7ef;
  color: #20724d;
}

.status-chip-busy {
  background: #fff6de;
  color: #8a620f;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
}

.metric-tile {
  border: 1px solid #e0e7ef;
  border-radius: 8px;
  padding: 0.8rem;
}

.metric-tile span,
.format-list dt {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.metric-tile strong {
  display: block;
  margin-top: 0.25rem;
  font-size: 1.35rem;
}

.format-list {
  display: grid;
  gap: 0.75rem;
  margin: 0 0 1rem;
}

.format-list div {
  display: grid;
  gap: 0.2rem;
}

.format-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.manifest-json summary {
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.manifest-json pre {
  max-height: 28rem;
  overflow: auto;
  border-radius: 8px;
  background: #101828;
  color: #e5edf7;
  padding: 1rem;
  white-space: pre-wrap;
}

@media (max-width: 991.98px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .create-dataset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
