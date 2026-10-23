import { describe, expect, it } from 'vitest'
import type { AiDatasetFrameBucketDistribution } from '@/api/aiDatasetApi'
import {
  mergeLabelBuckets,
  normalizeTargetBuckets,
  uniqueDatasetLabels
} from '../datasetBucketPresentation'

const emptyDistribution: AiDatasetFrameBucketDistribution = {
  schemaVersion: '1.0',
  datasetId: 1,
  name: null,
  datasetType: 'image',
  aiModelType: 'image_multilabel_classification',
  isActive: true,
  updatedAt: '',
  labelGroupId: null,
  labelGroupName: null,
  targetLabelId: null,
  targetLabelName: null,
  predictionSegmentsOnly: true,
  summary: {
    imageAnnotationCount: 0,
    videoAnnotationCount: 0,
    annotationFrameCount: 0,
    segmentFrameCount: 0,
    mergedFrameCount: 0,
    videoCount: 0,
    labelCount: 0
  },
  targetBuckets: [],
  labelDistribution: [],
  annotationFrameBuckets: [],
  segmentFrameBuckets: [],
  mergedFrameBuckets: []
}

describe('dataset bucket presentation', () => {
  it('keeps last duplicate counts, adds missing buckets and preserves canonical order', () => {
    expect(
      normalizeTargetBuckets([
        { bucket: 'negative', frameCount: 2 },
        { bucket: 'negative', frameCount: 5 }
      ])
    ).toEqual([
      { bucket: 'positive', frameCount: 0 },
      { bucket: 'negative', frameCount: 5 },
      { bucket: 'unknown', frameCount: 0 }
    ])
  })

  it('retains the last label with each ID and sorts by its current name', () => {
    const groups = [
      { id: 1, name: 'first', version: 1, labelCount: 1, labels: [{ id: 1, name: 'Z' }] },
      {
        id: 2,
        name: 'second',
        version: 1,
        labelCount: 2,
        labels: [
          { id: 2, name: 'B' },
          { id: 1, name: 'A' }
        ]
      }
    ]
    expect(uniqueDatasetLabels(groups)).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ])
  })

  it('returns no rows before a distribution is available', () => {
    expect(mergeLabelBuckets(null)).toEqual([])
  })

  it('unions sources, preserves name precedence and retains zero counts', () => {
    const rows = mergeLabelBuckets({
      ...emptyDistribution,
      mergedFrameBuckets: [{ labelId: 1, labelName: 'Merged', frameCount: 0 }],
      annotationFrameBuckets: [{ labelId: 1, labelName: 'Annotation', frameCount: 5 }],
      segmentFrameBuckets: [{ labelId: 2, labelName: '', frameCount: 2 }]
    })
    expect(rows.map((row) => row.labelId)).toEqual([2, 1])
    expect(rows[0]).toMatchObject({ labelName: 'Label 2', segmentFrames: 2, annotationFrames: 0 })
    expect(rows[1]).toMatchObject({ labelName: 'Merged', mergedFrames: 0, annotationFrames: 5 })
  })

  it('uses the last duplicate source row and sorts descending by merged frames', () => {
    const rows = mergeLabelBuckets({
      ...emptyDistribution,
      mergedFrameBuckets: [
        { labelId: 1, labelName: 'Old', frameCount: 9 },
        { labelId: 1, labelName: 'New', frameCount: 0 },
        { labelId: 2, labelName: 'Other', frameCount: 5 }
      ]
    })
    expect(rows.map((row) => row.labelName)).toEqual(['Other', 'New'])
    expect(rows[1]?.mergedFrames).toBe(0)
  })
})
