import type {
  AiDatasetFrameBucketCount,
  AiDatasetFrameBucketDistribution,
  AiDatasetLabelOption,
  AiDatasetLabelSetOption
} from '@/api/aiDatasetApi'

export interface LabelBucketRow {
  labelId: number
  labelName: string
  mergedFrames: number
  annotationFrames: number
  segmentFrames: number
  framePositive: number
  frameNegative: number
  segmentCount: number
}

export function uniqueDatasetLabels(groups: AiDatasetLabelSetOption[]): AiDatasetLabelOption[] {
  const labels = groups.flatMap((group) => group.labels)
  const byId = new Map(labels.map((label) => [label.id, label]))
  return [...byId.values()].sort((first, second) => first.name.localeCompare(second.name))
}

export function normalizeTargetBuckets(
  items: AiDatasetFrameBucketCount[]
): AiDatasetFrameBucketCount[] {
  const counts = new Map(items.map((item) => [item.bucket, item.frameCount]))
  const buckets: AiDatasetFrameBucketCount['bucket'][] = ['positive', 'negative', 'unknown']
  return buckets.map((bucket) => ({ bucket, frameCount: counts.get(bucket) ?? 0 }))
}

function indexLabels<Item extends { labelId: number }>(items: Item[]): Map<number, Item> {
  return new Map(items.map((item) => [item.labelId, item]))
}

function bucketIndexes(distribution: AiDatasetFrameBucketDistribution) {
  return {
    annotation: indexLabels(distribution.annotationFrameBuckets),
    segment: indexLabels(distribution.segmentFrameBuckets),
    merged: indexLabels(distribution.mergedFrameBuckets),
    labels: indexLabels(distribution.labelDistribution)
  }
}

type BucketIndexes = ReturnType<typeof bucketIndexes>

function valueOrZero(value: number | undefined): number {
  return value ?? 0
}

function labelNameFor(labelId: number, indexes: BucketIndexes): string {
  const candidates = [
    indexes.merged.get(labelId)?.labelName,
    indexes.annotation.get(labelId)?.labelName,
    indexes.segment.get(labelId)?.labelName,
    indexes.labels.get(labelId)?.labelName
  ]
  return candidates.find(Boolean) || `Label ${String(labelId)}`
}

function labelBucketRow(labelId: number, indexes: BucketIndexes): LabelBucketRow {
  const merged = indexes.merged.get(labelId)
  const annotation = indexes.annotation.get(labelId)
  const segment = indexes.segment.get(labelId)
  const label = indexes.labels.get(labelId)
  return {
    labelId,
    labelName: labelNameFor(labelId, indexes),
    mergedFrames: valueOrZero(merged?.frameCount),
    annotationFrames: valueOrZero(annotation?.frameCount),
    segmentFrames: valueOrZero(segment?.frameCount),
    framePositive: valueOrZero(label?.framePositive),
    frameNegative: valueOrZero(label?.frameNegative),
    segmentCount: valueOrZero(label?.segmentCount)
  }
}

export function mergeLabelBuckets(
  distribution: AiDatasetFrameBucketDistribution | null
): LabelBucketRow[] {
  if (!distribution) {
    return []
  }
  const indexes = bucketIndexes(distribution)
  const labelIds = new Set(Object.values(indexes).flatMap((index) => [...index.keys()]))
  return [...labelIds]
    .map((labelId) => labelBucketRow(labelId, indexes))
    .sort(
      (first, second) =>
        second.mergedFrames - first.mergedFrames || first.labelName.localeCompare(second.labelName)
    )
}
