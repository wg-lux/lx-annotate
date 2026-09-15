<template>
  <div class="dataset-buckets-page container-fluid py-4 px-3 px-lg-4">
    <section class="page-heading">
      <div>
        <p class="section-kicker">KI-Datensatz</p>
        <h1 class="page-heading__title">Frame-Bucket-Verteilung</h1>
        <p class="heading-copy">
          Prüfen Sie die aktuellen Frame-Zahlen für datensatzbasierte Annotation und
          Trainingswarteschlangen.
        </p>
      </div>
      <div class="heading-actions">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          :disabled="loadingDistribution || backfillingSegments || !selectedDatasetId"
          data-test="backfill-segments"
          @click="backfillAnnotatedSegments"
        >
          {{
            backfillingSegments
              ? 'Segmente werden hinzugefügt...'
              : 'Annotierte Segmente nachtragen'
          }}
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          :disabled="loadingDistribution || backfillingSegments || !selectedDatasetId"
          data-test="reload-distribution"
          @click="loadDistribution"
        >
          Neu laden
        </button>
      </div>
    </section>

    <section class="controls-panel">
      <div class="controls-grid">
        <label class="field-group">
          <span class="field-group__label">KI-Datensatz</span>
          <select
            v-model="selectedDatasetId"
            class="form-select"
            data-test="dataset-select"
            :disabled="loadingOptions || backfillingSegments"
          >
            <option value="">Datensatz auswählen</option>
            <option
              v-for="dataset in datasetOptions"
              :key="dataset.id"
              :value="String(dataset.id)"
            >
              {{ dataset.label }} ({{ datasetTypeLabel(dataset.datasetType) }})
            </option>
          </select>
        </label>

        <label class="field-group">
          <span class="field-group__label">Label-Gruppe</span>
          <select
            v-model="selectedLabelGroupId"
            class="form-select"
            data-test="label-group-select"
            :disabled="loadingOptions"
          >
            <option value="">Alle Labels</option>
            <option
              v-for="group in labelSetOptions"
              :key="group.id"
              :value="String(group.id)"
            >
              {{ group.name }} v{{ group.version }}
            </option>
          </select>
        </label>

        <label class="field-group">
          <span class="field-group__label">Ziel-Label</span>
          <select
            v-model="selectedTargetLabelId"
            class="form-select"
            data-test="target-label-select"
            :disabled="targetLabelOptions.length === 0"
          >
            <option value="">Keine Ziel-Buckets</option>
            <option
              v-for="label in targetLabelOptions"
              :key="label.id"
              :value="String(label.id)"
            >
              {{ label.name }}
            </option>
          </select>
        </label>

        <label class="check-row">
          <input
            v-model="predictionSegmentsOnly"
            class="form-check-input"
            type="checkbox"
            data-test="prediction-segments-only"
          />
          <span class="check-row__label">Nur KI-Segmente für Segment-Buckets</span>
        </label>
      </div>

      <div
        v-if="errorMessage"
        class="alert alert-warning mb-0"
        role="alert"
      >
        {{ errorMessage }}
      </div>
      <div
        v-if="backfillMessage"
        class="alert alert-success mb-0"
        role="status"
      >
        {{ backfillMessage }}
      </div>
    </section>

    <AiDatasetSplitBuilder :dataset-id="selectedDatasetId" />

    <section
      v-if="loadingDistribution"
      class="loading-panel"
    >
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-short"></div>
      <div class="skeleton-line"></div>
    </section>

    <template v-else-if="distribution">
      <section
        class="summary-grid"
        aria-label="Zusammenfassung der Datensatz-Frame-Buckets"
      >
        <div
          class="metric-tile"
          data-test="summary-merged-frames"
        >
          <span class="metric-tile__label">Bucket-Frames</span>
          <strong class="metric-tile__value">{{ formatNumber(distribution.summary.mergedFrameCount) }}</strong>
        </div>
        <div class="metric-tile">
          <span class="metric-tile__label">Annotations-Frames</span>
          <strong class="metric-tile__value">{{ formatNumber(distribution.summary.annotationFrameCount) }}</strong>
        </div>
        <div class="metric-tile">
          <span class="metric-tile__label">Segment-Frames</span>
          <strong class="metric-tile__value">{{ formatNumber(distribution.summary.segmentFrameCount) }}</strong>
        </div>
        <div class="metric-tile">
          <span class="metric-tile__label">Labels</span>
          <strong class="metric-tile__value">{{ formatNumber(distribution.summary.labelCount) }}</strong>
        </div>
      </section>

      <div class="content-grid">
        <section class="distribution-panel">
          <div class="panel-heading">
            <div>
              <h2 class="panel-heading__title">Ziel-Buckets</h2>
              <p class="panel-heading__description">{{ targetBucketSubtitle }}</p>
            </div>
          </div>

          <div
            class="bucket-list"
            data-test="target-buckets"
          >
            <div
              v-for="bucket in normalizedTargetBuckets"
              :key="bucket.bucket"
              class="bucket-row"
            >
              <div class="bucket-label">
                <span
                  class="bucket-dot"
                  :class="`bucket-${bucket.bucket}`"
                ></span>
                <span>{{ bucketLabel(bucket.bucket) }}</span>
              </div>
              <div
                class="bucket-meter"
                aria-hidden="true"
              >
                <span class="bucket-meter__fill" :style="{ width: bucketWidth(bucket.frameCount, targetBucketMax) }"></span>
              </div>
              <strong class="bucket-row__count">{{ formatNumber(bucket.frameCount) }}</strong>
            </div>
          </div>
        </section>

        <section class="distribution-panel">
          <div class="panel-heading">
            <div>
              <h2 class="panel-heading__title">Datensatzumfang</h2>
              <p class="panel-heading__description">{{ selectedDatasetLabel }}</p>
            </div>
          </div>

          <dl class="scope-list">
            <div class="scope-list__item">
              <dt class="scope-list__term">Typ</dt>
              <dd class="scope-list__value">{{ datasetTypeLabel(distribution.datasetType) }}</dd>
            </div>
            <div class="scope-list__item">
              <dt class="scope-list__term">Modell</dt>
              <dd class="scope-list__value">{{ aiModelTypeLabel(distribution.aiModelType) }}</dd>
            </div>
            <div class="scope-list__item">
              <dt class="scope-list__term">Videos</dt>
              <dd class="scope-list__value">{{ formatNumber(distribution.summary.videoCount) }}</dd>
            </div>
            <div class="scope-list__item">
              <dt class="scope-list__term">Aktualisiert</dt>
              <dd class="scope-list__value">{{ formatDate(distribution.updatedAt) }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <DatasetLabelHistogram :rows="distribution.mergedFrameBuckets" />

      <section class="distribution-panel table-panel">
        <div class="panel-heading">
          <div>
            <h2 class="panel-heading__title">Frame-Buckets pro Label</h2>
            <p class="panel-heading__description">
              Eindeutige Frame-Zahlen aus positiven Annotationen, Segmentbereichen und deren
              Vereinigung.
            </p>
          </div>
        </div>

        <div
          v-if="mergedRows.length === 0"
          class="empty-state"
        >
          Keine Frame-Buckets für die aktuelle Auswahl vorhanden.
        </div>
        <div
          v-else
          class="table-responsive"
        >
          <table
            class="bucket-table"
            data-test="label-bucket-table"
          >
            <thead>
              <tr>
                <th class="bucket-table__heading bucket-table__label-cell">Label</th>
                <th class="bucket-table__heading">Kombinierte Frames</th>
                <th class="bucket-table__heading">Annotations-Frames</th>
                <th class="bucket-table__heading">Segment-Frames</th>
                <th class="bucket-table__heading">Positive Einträge</th>
                <th class="bucket-table__heading">Negative Einträge</th>
                <th class="bucket-table__heading">Segmente</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in mergedRows"
                :key="row.labelId"
              >
                <td class="bucket-table__cell bucket-table__label-cell">
                  <span class="label-name">{{ row.labelName }}</span>
                </td>
                <td class="bucket-table__cell bucket-table__combined-cell">
                  <div class="inline-meter">
                    <span class="inline-meter__fill" :style="{ width: bucketWidth(row.mergedFrames, mergedFrameMax) }"></span>
                  </div>
                  <strong>{{ formatNumber(row.mergedFrames) }}</strong>
                </td>
                <td class="bucket-table__cell">{{ formatNumber(row.annotationFrames) }}</td>
                <td class="bucket-table__cell">{{ formatNumber(row.segmentFrames) }}</td>
                <td class="bucket-table__cell">{{ formatNumber(row.framePositive) }}</td>
                <td class="bucket-table__cell">{{ formatNumber(row.frameNegative) }}</td>
                <td class="bucket-table__cell">{{ formatNumber(row.segmentCount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <section
      v-else
      class="empty-state"
    >
      Wählen Sie einen KI-Datensatz aus, um die aktuelle Bucket-Verteilung zu laden.
    </section>
  </div>
</template>

<script setup lang="ts">
import AiDatasetSplitBuilder from '@/components/AiDataset/AiDatasetSplitBuilder.vue'
import DatasetLabelHistogram from '@/components/AiDataset/DatasetLabelHistogram.vue'
import {
  attachAiDatasetAnnotations,
  fetchAiDatasetFrameBucketDistribution,
  fetchAiDatasetLabelSets,
  fetchAiDatasetOptions,
  type AiDatasetFrameBucketCount,
  type AiDatasetFrameBucketDistribution,
  type AiDatasetLabelSetOption,
  type AiDatasetOption
} from '@/api/aiDatasetApi'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  mergeLabelBuckets,
  normalizeTargetBuckets,
  uniqueDatasetLabels
} from '@/utils/datasetBucketPresentation'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('ai-dataset-buckets')

type BucketName = AiDatasetFrameBucketCount['bucket']

const datasetOptions = ref<AiDatasetOption[]>([])
const labelSetOptions = ref<AiDatasetLabelSetOption[]>([])
const selectedDatasetId = ref('')
const selectedLabelGroupId = ref('')
const selectedTargetLabelId = ref('')
const predictionSegmentsOnly = ref(true)
const distribution = ref<AiDatasetFrameBucketDistribution | null>(null)
const loadingOptions = ref(true)
const loadingDistribution = ref(false)
const backfillingSegments = ref(false)
const errorMessage = ref('')
const backfillMessage = ref('')
let distributionGeneration = 0

const selectedDataset = computed(() =>
  datasetOptions.value.find((dataset) => String(dataset.id) === selectedDatasetId.value)
)

const selectedDatasetLabel = computed(() => {
  const dataset = selectedDataset.value
  if (!dataset) {
    return 'Kein Datensatz ausgewählt'
  }
  return `${dataset.label} (ID ${String(dataset.id)})`
})

const selectedLabelSet = computed(() =>
  labelSetOptions.value.find((group) => String(group.id) === selectedLabelGroupId.value)
)

const targetLabelOptions = computed(
  () => selectedLabelSet.value?.labels ?? uniqueDatasetLabels(labelSetOptions.value)
)

const normalizedTargetBuckets = computed(() =>
  normalizeTargetBuckets(distribution.value?.targetBuckets ?? [])
)

const targetBucketMax = computed(() =>
  Math.max(1, ...normalizedTargetBuckets.value.map((bucket) => bucket.frameCount))
)

const targetBucketSubtitle = computed(() => {
  if (!distribution.value?.targetLabelName) {
    return 'Wählen Sie ein Ziel-Label, um positive, negative und unbekannte Frames zu sehen.'
  }
  return `Ziel-Label: ${distribution.value.targetLabelName}`
})

const mergedRows = computed(() => mergeLabelBuckets(distribution.value))

const mergedFrameMax = computed(() =>
  Math.max(1, ...mergedRows.value.map((row) => row.mergedFrames))
)

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
      const activeDataset = datasets.find((dataset) => dataset.isActive) ?? datasets.at(0)
      selectedDatasetId.value = activeDataset ? String(activeDataset.id) : ''
    }
  } catch (error) {
    logger.error('options-load-failed', error)
    errorMessage.value = 'Die Datensatz- oder Label-Optionen konnten nicht geladen werden.'
  } finally {
    loadingOptions.value = false
  }
}

async function loadDistribution(): Promise<void> {
  const generation = ++distributionGeneration
  if (!selectedDatasetId.value) {
    distribution.value = null
    loadingDistribution.value = false
    return
  }

  loadingDistribution.value = true
  errorMessage.value = ''
  try {
    const result = await fetchAiDatasetFrameBucketDistribution(selectedDatasetId.value, {
      labelGroupId: selectedLabelGroupId.value || null,
      targetLabelId: selectedTargetLabelId.value || null,
      predictionSegmentsOnly: predictionSegmentsOnly.value
    })
    if (generation === distributionGeneration) {
      distribution.value = result
    }
  } catch (error) {
    if (generation !== distributionGeneration) {
      return
    }
    logger.error('distribution-load-failed', error)
    distribution.value = null
    errorMessage.value = 'Die Bucket-Verteilung konnte nicht geladen werden.'
  } finally {
    if (generation === distributionGeneration) {
      loadingDistribution.value = false
    }
  }
}

async function backfillAnnotatedSegments(): Promise<void> {
  if (!selectedDatasetId.value || backfillingSegments.value) {
    return
  }

  backfillingSegments.value = true
  errorMessage.value = ''
  backfillMessage.value = ''
  try {
    const result = await attachAiDatasetAnnotations(selectedDatasetId.value, {
      includeAllAnnotations: true,
      includeFrameAnnotations: false,
      includeVideoAnnotations: true
    })
    await loadDistribution()
    backfillMessage.value = `Nachtrag abgeschlossen. Der Datensatz enthält jetzt ${formatNumber(result.videoAnnotationCount)} annotierte Segmente.`
  } catch (error) {
    logger.error('segment-backfill-failed', error)
    errorMessage.value = 'Die annotierten Segmente konnten nicht zum Datensatz hinzugefügt werden.'
  } finally {
    backfillingSegments.value = false
  }
}

function bucketLabel(bucket: BucketName): string {
  if (bucket === 'positive') {
    return 'Positiv'
  }
  if (bucket === 'negative') {
    return 'Negativ'
  }
  return 'Unbekannt'
}

function datasetTypeLabel(datasetType: string): string {
  if (datasetType === 'image') {
    return 'Bild'
  }
  if (datasetType === 'video') {
    return 'Video'
  }
  return datasetType
}

function aiModelTypeLabel(aiModelType: string): string {
  if (aiModelType === 'image_multilabel_classification') {
    return 'Bild-Multilabel-Klassifikation'
  }
  if (aiModelType === 'video_segment_classification') {
    return 'Video-Segmentklassifikation'
  }
  return aiModelType
}

function bucketWidth(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0
  return `${String(Math.max(0, Math.min(100, ratio * 100)))}%`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

watch(selectedLabelGroupId, () => {
  if (
    selectedTargetLabelId.value &&
    !targetLabelOptions.value.some((label) => String(label.id) === selectedTargetLabelId.value)
  ) {
    selectedTargetLabelId.value = ''
  }
})

watch(
  [selectedDatasetId, selectedLabelGroupId, selectedTargetLabelId, predictionSegmentsOnly],
  () => {
    void loadDistribution()
  }
)

onMounted(async () => {
  await loadOptions()
})

onBeforeUnmount(() => {
  distributionGeneration++
})
</script>

<style scoped>
.dataset-buckets-page {
  color: #172337;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.section-kicker {
  margin: 0 0 0.35rem;
  color: #2f6f94;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-heading .page-heading__title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.heading-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.heading-copy {
  margin: 0.5rem 0 0;
  color: #5d7085;
}

.controls-panel,
.distribution-panel,
.loading-panel,
.empty-state {
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
  padding: 1rem;
  margin-bottom: 1rem;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.field-group {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.field-group .field-group__label,
.check-row .check-row__label {
  color: #334155;
}

.check-row {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  min-height: 2.4rem;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-tile {
  border: 1px solid #d9e2ec;
  border-left: 4px solid #2f6f94;
  border-radius: 8px;
  background: #f8fbfc;
  padding: 0.85rem 1rem;
}

.metric-tile .metric-tile__label {
  display: block;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.metric-tile .metric-tile__value {
  display: block;
  margin-top: 0.25rem;
  font-size: 1.45rem;
  color: #172337;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
  gap: 1rem;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.panel-heading .panel-heading__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.panel-heading .panel-heading__description {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.bucket-list {
  display: grid;
  gap: 0.75rem;
}

.bucket-row {
  display: grid;
  grid-template-columns: minmax(8rem, 0.5fr) minmax(8rem, 1fr) 5rem;
  gap: 0.75rem;
  align-items: center;
}

.bucket-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
}

.bucket-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
}

.bucket-positive {
  background: #1f9d6a;
}

.bucket-negative {
  background: #d04f3d;
}

.bucket-unknown {
  background: #6b7280;
}

.bucket-meter,
.inline-meter {
  height: 0.65rem;
  overflow: hidden;
  border-radius: 999px;
  background: #e6edf3;
}

.bucket-meter .bucket-meter__fill,
.inline-meter .inline-meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2f6f94;
}

.bucket-row .bucket-row__count {
  text-align: right;
}

.scope-list {
  display: grid;
  gap: 0.7rem;
  margin: 0;
}

.scope-list .scope-list__item {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 0.75rem;
}

.scope-list .scope-list__term {
  color: #64748b;
  font-weight: 700;
}

.scope-list .scope-list__value {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.table-panel {
  overflow: hidden;
}

.bucket-table {
  width: 100%;
  border-collapse: collapse;
}

.bucket-table .bucket-table__heading,
.bucket-table .bucket-table__cell {
  padding: 0.75rem;
  border-bottom: 1px solid #e6edf3;
  vertical-align: middle;
  white-space: nowrap;
}

.bucket-table .bucket-table__heading {
  color: #475569;
  font-size: 0.78rem;
  text-transform: uppercase;
  background: #f8fbfc;
}

.bucket-table .bucket-table__label-cell {
  white-space: normal;
  min-width: 12rem;
}

.bucket-table .bucket-table__combined-cell {
  display: grid;
  grid-template-columns: minmax(7rem, 1fr) 4.5rem;
  gap: 0.75rem;
  align-items: center;
}

.label-name {
  font-weight: 700;
}

.empty-state {
  color: #64748b;
}

.skeleton-line {
  height: 0.85rem;
  border-radius: 999px;
  background: linear-gradient(90deg, #edf2f7 25%, #f8fafc 50%, #edf2f7 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  margin-bottom: 0.8rem;
}

.skeleton-short {
  max-width: 45%;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 900px) {
  .page-heading,
  .content-grid {
    display: block;
  }

  .page-heading .btn {
    margin-top: 0.75rem;
  }

  .bucket-row {
    grid-template-columns: 1fr 4rem;
  }

  .bucket-meter {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
