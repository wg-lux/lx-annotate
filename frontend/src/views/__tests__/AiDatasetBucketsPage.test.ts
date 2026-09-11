import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AiDatasetBucketsPage from '../AiDatasetBucketsPage.vue'

vi.mock('@/api/aiDatasetSplitApi', () => ({
  fetchDatasetSplitPlans: vi.fn(() => Promise.resolve([])),
  createDatasetSplitPlan: vi.fn()
}))

const hoisted = vi.hoisted(() => ({
  attachAiDatasetAnnotations: vi.fn(),
  fetchAiDatasetOptions: vi.fn(),
  fetchAiDatasetLabelSets: vi.fn(),
  fetchAiDatasetFrameBucketDistribution: vi.fn()
}))

vi.mock('@/api/aiDatasetApi', () => ({
  attachAiDatasetAnnotations: hoisted.attachAiDatasetAnnotations,
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
    hoisted.attachAiDatasetAnnotations.mockResolvedValue({
      datasetId: 7,
      videoId: null,
      frameAnnotationCount: 0,
      videoAnnotationCount: 5,
      attachedFrameAnnotationIds: [],
      attachedSegmentIds: [],
      attachedFrameAnnotationCount: 0,
      attachedSegmentCount: 5
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
    expect(wrapper.get('[data-test="label-histogram"]').text()).toContain('8 Frames')
    expect(wrapper.get('[data-test="split-form"]').text()).toContain('Buckets erstellen')
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

  it('backfills all annotated segments and refreshes the distribution', async () => {
    const wrapper = mount(AiDatasetBucketsPage)
    await flushPromises()

    await wrapper.get('[data-test="backfill-segments"]').trigger('click')
    await flushPromises()

    expect(hoisted.attachAiDatasetAnnotations).toHaveBeenCalledWith('7', {
      includeAllAnnotations: true,
      includeFrameAnnotations: false,
      includeVideoAnnotations: true
    })
    expect(hoisted.fetchAiDatasetFrameBucketDistribution).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('5 annotierte Segmente')
  })

  it('keeps the current histogram when an older filter request fails', async () => {
    const wrapper = mount(AiDatasetBucketsPage)
    await flushPromises()
    let rejectOld: (reason: Error) => void = () => { throw new Error('Request not started') }
    hoisted.fetchAiDatasetFrameBucketDistribution.mockImplementationOnce(() =>
      new Promise<never>((_resolve, reject) => { rejectOld = reject })
    )
    await wrapper.get('[data-test="label-group-select"]').setValue('3')
    await wrapper.get('[data-test="target-label-select"]').setValue('11')
    await flushPromises()
    rejectOld(new Error('Outdated request failed'))
    await flushPromises()
    expect(wrapper.get('[data-test="label-histogram"]').text()).toContain('8 Frames')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows an error when segment backfill fails', async () => {
    hoisted.attachAiDatasetAnnotations.mockRejectedValueOnce(new Error('request failed'))
    const wrapper = mount(AiDatasetBucketsPage)
    await flushPromises()

    await wrapper.get('[data-test="backfill-segments"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Die annotierten Segmente konnten nicht zum Datensatz hinzugefügt werden.'
    )
    expect(hoisted.fetchAiDatasetFrameBucketDistribution).toHaveBeenCalledTimes(1)
  })
})
