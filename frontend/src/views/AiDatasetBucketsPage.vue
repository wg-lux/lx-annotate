<template>
  <div class="dataset-buckets-page container-fluid py-4 px-3 px-lg-4">
    <section class="page-heading">
      <div>
        <p class="section-kicker">AI Dataset</p>
        <h1>Frame Bucket Distribution</h1>
        <p class="heading-copy">
          Review the current frame counts used by dataset-aware annotation and training queues.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="loadingDistribution || !selectedDatasetId"
        data-test="reload-distribution"
        @click="loadDistribution"
      >
        Neu laden
      </button>
    </section>

    <section class="controls-panel">
      <div class="controls-grid">
        <label class="field-group">
          <span>AI Dataset</span>
          <select
            v-model="selectedDatasetId"
            class="form-select"
            data-test="dataset-select"
            :disabled="loadingOptions"
          >
            <option value="">Datensatz auswählen</option>
            <option v-for="dataset in datasetOptions" :key="dataset.id" :value="String(dataset.id)">
              {{ dataset.label }} ({{ dataset.datasetType }})
            </option>
          </select>
        </label>

        <label class="field-group">
          <span>Label-Gruppe</span>
          <select
            v-model="selectedLabelGroupId"
            class="form-select"
            data-test="label-group-select"
            :disabled="loadingOptions"
          >
            <option value="">Alle Labels</option>
            <option v-for="group in labelSetOptions" :key="group.id" :value="String(group.id)">
              {{ group.name }} v{{ group.version }}
            </option>
          </select>
        </label>

        <label class="field-group">
          <span>Target Label</span>
          <select
            v-model="selectedTargetLabelId"
            class="form-select"
            data-test="target-label-select"
            :disabled="targetLabelOptions.length === 0"
          >
            <option value="">Keine Ziel-Buckets</option>
            <option v-for="label in targetLabelOptions" :key="label.id" :value="String(label.id)">
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
          <span>Nur KI-Segmente für Segment-Buckets</span>
        </label>
      </div>

      <div v-if="errorMessage" class="alert alert-warning mb-0" role="alert">
        {{ errorMessage }}
      </div>
    </section>

    <section v-if="loadingDistribution" class="loading-panel">
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-short"></div>
      <div class="skeleton-line"></div>
    </section>

    <template v-else-if="distribution">
      <section class="summary-grid" aria-label="Dataset frame bucket summary">
        <div class="metric-tile" data-test="summary-merged-frames">
          <span>Bucket Frames</span>
          <strong>{{ formatNumber(distribution.summary.mergedFrameCount) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Annotation Frames</span>
          <strong>{{ formatNumber(distribution.summary.annotationFrameCount) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Segment Frames</span>
          <strong>{{ formatNumber(distribution.summary.segmentFrameCount) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Labels</span>
          <strong>{{ formatNumber(distribution.summary.labelCount) }}</strong>
        </div>
      </section>

      <div class="content-grid">
        <section class="distribution-panel">
          <div class="panel-heading">
            <div>
              <h2>Target Buckets</h2>
              <p>{{ targetBucketSubtitle }}</p>
            </div>
          </div>

          <div class="bucket-list" data-test="target-buckets">
            <div v-for="bucket in normalizedTargetBuckets" :key="bucket.bucket" class="bucket-row">
              <div class="bucket-label">
                <span class="bucket-dot" :class="`bucket-${bucket.bucket}`"></span>
                <span>{{ bucketLabel(bucket.bucket) }}</span>
              </div>
              <div class="bucket-meter" aria-hidden="true">
                <span :style="{ width: bucketWidth(bucket.frameCount, targetBucketMax) }"></span>
              </div>
              <strong>{{ formatNumber(bucket.frameCount) }}</strong>
            </div>
          </div>
        </section>

        <section class="distribution-panel">
          <div class="panel-heading">
            <div>
              <h2>Dataset Scope</h2>
              <p>{{ selectedDatasetLabel }}</p>
            </div>
          </div>

          <dl class="scope-list">
            <div>
              <dt>Type</dt>
              <dd>{{ distribution.datasetType }}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{{ distribution.aiModelType }}</dd>
            </div>
            <div>
              <dt>Videos</dt>
              <dd>{{ formatNumber(distribution.summary.videoCount) }}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{{ formatDate(distribution.updatedAt) }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section class="distribution-panel table-panel">
        <div class="panel-heading">
          <div>
            <h2>Per-Label Frame Buckets</h2>
            <p>Unique frame counts from positive annotations, segment ranges, and their union.</p>
          </div>
        </div>

        <div v-if="mergedRows.length === 0" class="empty-state">
          Keine Frame-Buckets für die aktuelle Auswahl vorhanden.
        </div>
        <div v-else class="table-responsive">
          <table class="bucket-table" data-test="label-bucket-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Combined Frames</th>
                <th>Annotation Frames</th>
                <th>Segment Frames</th>
                <th>Positive Rows</th>
                <th>Negative Rows</th>
                <th>Segments</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in mergedRows" :key="row.labelId">
                <td>
                  <span class="label-name">{{ row.labelName }}</span>
                </td>
                <td>
                  <div class="inline-meter">
                    <span :style="{ width: bucketWidth(row.mergedFrames, mergedFrameMax) }"></span>
                  </div>
                  <strong>{{ formatNumber(row.mergedFrames) }}</strong>
                </td>
                <td>{{ formatNumber(row.annotationFrames) }}</td>
                <td>{{ formatNumber(row.segmentFrames) }}</td>
                <td>{{ formatNumber(row.framePositive) }}</td>
                <td>{{ formatNumber(row.frameNegative) }}</td>
                <td>{{ formatNumber(row.segmentCount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <section v-else class="empty-state">
      Wählen Sie einen AI-Datensatz aus, um die aktuelle Bucket-Verteilung zu laden.
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  fetchAiDatasetFrameBucketDistribution,
  fetchAiDatasetLabelSets,
  fetchAiDatasetOptions,
  type AiDatasetFrameBucketCount,
  type AiDatasetFrameBucketDistribution,
  type AiDatasetLabelFrameBucketCount,
  type AiDatasetLabelOption,
  type AiDatasetLabelSetOption,
  type AiDatasetOption
} from '@/api/aiDatasetApi'
import { computed, onMounted, ref, watch } from 'vue'

type BucketName = AiDatasetFrameBucketCount['bucket']

interface LabelBucketRow {
  labelId: number
  labelName: string
  mergedFrames: number
  annotationFrames: number
  segmentFrames: number
  framePositive: number
  frameNegative: number
  segmentCount: number
}

const datasetOptions = ref<AiDatasetOption[]>([])
const labelSetOptions = ref<AiDatasetLabelSetOption[]>([])
const selectedDatasetId = ref('')
const selectedLabelGroupId = ref('')
const selectedTargetLabelId = ref('')
const predictionSegmentsOnly = ref(true)
const distribution = ref<AiDatasetFrameBucketDistribution | null>(null)
const loadingOptions = ref(true)
const loadingDistribution = ref(false)
const errorMessage = ref('')

const selectedDataset = computed(() =>
  datasetOptions.value.find((dataset) => String(dataset.id) === selectedDatasetId.value)
)

const selectedDatasetLabel = computed(() => {
  const dataset = selectedDataset.value
  if (!dataset) return 'Kein Datensatz ausgewählt'
  return `${dataset.label} (ID ${dataset.id})`
})

const selectedLabelSet = computed(() =>
  labelSetOptions.value.find((group) => String(group.id) === selectedLabelGroupId.value)
)

const targetLabelOptions = computed<AiDatasetLabelOption[]>(() => {
  if (selectedLabelSet.value) return selectedLabelSet.value.labels
  const byId = new Map<number, AiDatasetLabelOption>()
  for (const group of labelSetOptions.value) {
    for (const label of group.labels) {
      byId.set(label.id, label)
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const normalizedTargetBuckets = computed<AiDatasetFrameBucketCount[]>(() => {
  const buckets = new Map<BucketName, number>(
    distribution.value?.targetBuckets.map((bucket) => [bucket.bucket, bucket.frameCount]) ?? []
  )
  return (['positive', 'negative', 'unknown'] as BucketName[]).map((bucket) => ({
    bucket,
    frameCount: buckets.get(bucket) ?? 0
  }))
})

const targetBucketMax = computed(() =>
  Math.max(1, ...normalizedTargetBuckets.value.map((bucket) => bucket.frameCount))
)

const targetBucketSubtitle = computed(() => {
  if (!distribution.value?.targetLabelName) {
    return 'Wählen Sie ein Target Label, um positive, negative und unknown Frames zu sehen.'
  }
  return `Target Label: ${distribution.value.targetLabelName}`
})

function bucketMap(
  items: AiDatasetLabelFrameBucketCount[]
): Map<number, AiDatasetLabelFrameBucketCount> {
  return new Map(items.map((item) => [item.labelId, item]))
}

const mergedRows = computed<LabelBucketRow[]>(() => {
  if (!distribution.value) return []

  const annotationByLabel = bucketMap(distribution.value.annotationFrameBuckets)
  const segmentByLabel = bucketMap(distribution.value.segmentFrameBuckets)
  const mergedByLabel = bucketMap(distribution.value.mergedFrameBuckets)
  const labelDistributionByLabel = new Map(
    distribution.value.labelDistribution.map((entry) => [entry.labelId, entry])
  )
  const labelIds = new Set<number>([
    ...annotationByLabel.keys(),
    ...segmentByLabel.keys(),
    ...mergedByLabel.keys(),
    ...labelDistributionByLabel.keys()
  ])

  return [...labelIds]
    .map((labelId) => {
      const merged = mergedByLabel.get(labelId)
      const annotation = annotationByLabel.get(labelId)
      const segment = segmentByLabel.get(labelId)
      const labelDistribution = labelDistributionByLabel.get(labelId)
      return {
        labelId,
        labelName:
          merged?.labelName ||
          annotation?.labelName ||
          segment?.labelName ||
          labelDistribution?.labelName ||
          `Label ${labelId}`,
        mergedFrames: merged?.frameCount ?? 0,
        annotationFrames: annotation?.frameCount ?? 0,
        segmentFrames: segment?.frameCount ?? 0,
        framePositive: labelDistribution?.framePositive ?? 0,
        frameNegative: labelDistribution?.frameNegative ?? 0,
        segmentCount: labelDistribution?.segmentCount ?? 0
      }
    })
    .sort((a, b) => b.mergedFrames - a.mergedFrames || a.labelName.localeCompare(b.labelName))
})

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
      const activeDataset = datasets.find((dataset) => dataset.isActive) ?? datasets[0]
      selectedDatasetId.value = activeDataset ? String(activeDataset.id) : ''
    }
  } catch (error) {
    console.error('Failed to load AI dataset distribution options:', error)
    errorMessage.value = 'Die Datensatz- oder Label-Optionen konnten nicht geladen werden.'
  } finally {
    loadingOptions.value = false
  }
}

async function loadDistribution(): Promise<void> {
  if (!selectedDatasetId.value) {
    distribution.value = null
    return
  }

  loadingDistribution.value = true
  errorMessage.value = ''
  try {
    distribution.value = await fetchAiDatasetFrameBucketDistribution(selectedDatasetId.value, {
      labelGroupId: selectedLabelGroupId.value || null,
      targetLabelId: selectedTargetLabelId.value || null,
      predictionSegmentsOnly: predictionSegmentsOnly.value
    })
  } catch (error) {
    console.error('Failed to load AI dataset frame bucket distribution:', error)
    distribution.value = null
    errorMessage.value = 'Die Bucket-Verteilung konnte nicht geladen werden.'
  } finally {
    loadingDistribution.value = false
  }
}

function bucketLabel(bucket: BucketName): string {
  if (bucket === 'positive') return 'Positive'
  if (bucket === 'negative') return 'Negative'
  return 'Unknown'
}

function bucketWidth(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0
  return `${Math.max(0, Math.min(100, ratio * 100))}%`
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

.page-heading h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
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

.field-group span,
.check-row span {
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

.metric-tile span {
  display: block;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.metric-tile strong {
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

.panel-heading h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.panel-heading p {
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

.bucket-meter span,
.inline-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2f6f94;
}

.bucket-row strong {
  text-align: right;
}

.scope-list {
  display: grid;
  gap: 0.7rem;
  margin: 0;
}

.scope-list div {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 0.75rem;
}

.scope-list dt {
  color: #64748b;
  font-weight: 700;
}

.scope-list dd {
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

.bucket-table th,
.bucket-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e6edf3;
  vertical-align: middle;
  white-space: nowrap;
}

.bucket-table th {
  color: #475569;
  font-size: 0.78rem;
  text-transform: uppercase;
  background: #f8fbfc;
}

.bucket-table td:first-child,
.bucket-table th:first-child {
  white-space: normal;
  min-width: 12rem;
}

.bucket-table td:nth-child(2) {
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
