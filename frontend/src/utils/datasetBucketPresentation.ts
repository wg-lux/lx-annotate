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

function labelBucketRow(labelId: number, indexes: BucketIndexes): LabelBucketRow {
  const merged = indexes.merged.get(labelId)
  const annotation = indexes.annotation.get(labelId)
  const segment = indexes.segment.get(labelId)
  const label = indexes.labels.get(labelId)
  const labelName =
    [merged?.labelName, annotation?.labelName, segment?.labelName, label?.labelName].find((name) =>
      Boolean(name)
    ) || `Label ${String(labelId)}`
  return {
    labelId,
    labelName,
    mergedFrames: merged?.frameCount ?? 0,
    annotationFrames: annotation?.frameCount ?? 0,
    segmentFrames: segment?.frameCount ?? 0,
    framePositive: label?.framePositive ?? 0,
    frameNegative: label?.frameNegative ?? 0,
    segmentCount: label?.segmentCount ?? 0
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
