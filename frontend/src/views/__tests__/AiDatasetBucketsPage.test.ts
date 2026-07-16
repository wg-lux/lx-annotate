import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AiDatasetBucketsPage from '../AiDatasetBucketsPage.vue'

const hoisted = vi.hoisted(() => ({
  fetchAiDatasetOptions: vi.fn(),
  fetchAiDatasetLabelSets: vi.fn(),
  fetchAiDatasetFrameBucketDistribution: vi.fn()
}))

vi.mock('@/api/aiDatasetApi', () => ({
  fetchAiDatasetOptions: hoisted.fetchAiDatasetOptions,
  fetchAiDatasetLabelSets: hoisted.fetchAiDatasetLabelSets,
  fetchAiDatasetFrameBucketDistribution: hoisted.fetchAiDatasetFrameBucketDistribution
}))

describe('AiDatasetBucketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.fetchAiDatasetOptions.mockResolvedValue([
      {
        id: 7,
        value: 'Dataset A',
        label: 'Dataset A',
        datasetType: 'image',
        aiModelType: 'image_multilabel_classification',
        isActive: true,
        nameCount: 1
      }
    ])
    hoisted.fetchAiDatasetLabelSets.mockResolvedValue([
      {
        id: 3,
        name: 'Colonoscopy Labels',
        version: 2,
        labelCount: 2,
        labels: [
          { id: 11, name: 'polyp' },
          { id: 12, name: 'blood' }
        ]
      }
    ])
    hoisted.fetchAiDatasetFrameBucketDistribution.mockResolvedValue({
      schemaVersion: '1.0',
      datasetId: 7,
      name: 'Dataset A',
      datasetType: 'image',
      aiModelType: 'image_multilabel_classification',
      isActive: true,
      updatedAt: '2026-05-07T10:00:00Z',
      labelGroupId: null,
      labelGroupName: null,
      targetLabelId: null,
      targetLabelName: null,
      predictionSegmentsOnly: true,
      summary: {
        imageAnnotationCount: 9,
        videoAnnotationCount: 2,
        annotationFrameCount: 4,
        segmentFrameCount: 6,
        mergedFrameCount: 8,
        videoCount: 2,
        labelCount: 2
      },
      targetBuckets: [
        { bucket: 'positive', frameCount: 3 },
        { bucket: 'negative', frameCount: 2 },
        { bucket: 'unknown', frameCount: 1 }
      ],
      labelDistribution: [
        {
          labelId: 11,
          labelName: 'polyp',
          framePositive: 5,
          frameNegative: 1,
          segmentCount: 2,
          total: 8
        }
      ],
      annotationFrameBuckets: [{ labelId: 11, labelName: 'polyp', frameCount: 4 }],
      segmentFrameBuckets: [{ labelId: 11, labelName: 'polyp', frameCount: 6 }],
      mergedFrameBuckets: [{ labelId: 11, labelName: 'polyp', frameCount: 8 }]
    })
  })

  it('loads dataset bucket distribution and renders frame counts', async () => {
    const wrapper = mount(AiDatasetBucketsPage)
    await flushPromises()

    expect(hoisted.fetchAiDatasetOptions).toHaveBeenCalledTimes(1)
    expect(hoisted.fetchAiDatasetLabelSets).toHaveBeenCalledTimes(1)
    expect(hoisted.fetchAiDatasetFrameBucketDistribution).toHaveBeenCalledWith('7', {
      labelGroupId: null,
      targetLabelId: null,
      predictionSegmentsOnly: true
    })
    expect(wrapper.get('[data-test="summary-merged-frames"]').text()).toContain('8')
    expect(wrapper.get('[data-test="target-buckets"]').text()).toContain('Positiv')
    expect(wrapper.get('[data-test="label-bucket-table"]').text()).toContain('polyp')
  })

  it('reloads distribution with selected label group and target label', async () => {
    const wrapper = mount(AiDatasetBucketsPage)
    await flushPromises()

    await wrapper.get('[data-test="label-group-select"]').setValue('3')
    await wrapper.get('[data-test="target-label-select"]').setValue('11')
    await flushPromises()

    expect(hoisted.fetchAiDatasetFrameBucketDistribution).toHaveBeenLastCalledWith('7', {
      labelGroupId: '3',
      targetLabelId: '11',
      predictionSegmentsOnly: true
    })
  })
})
