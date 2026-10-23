import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/api/${path}`
}))

import {
  attachAiDatasetAnnotations,
  createAiDataset,
  fetchAiDatasetOptions
} from '@/api/aiDatasetApi'

const validAttachmentResult = {
  datasetId: 7,
  videoId: null,
  frameAnnotationCount: 0,
  videoAnnotationCount: 2,
  attachedFrameAnnotationIds: [],
  attachedSegmentIds: [11, 12],
  attachedFrameAnnotationCount: 0,
  attachedSegmentCount: 2
}

describe('aiDatasetApi attachment boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a validated bulk segment-backfill result', async () => {
    hoisted.axios.post.mockResolvedValue({ data: validAttachmentResult })

    await expect(
      attachAiDatasetAnnotations(7, {
        includeAllAnnotations: true,
        includeVideoAnnotations: true
      })
    ).resolves.toEqual(validAttachmentResult)
    expect(hoisted.axios.post).toHaveBeenCalledWith(
      '/api/settings/application/ai_datasets/7/attachments/',
      {
        includeAllAnnotations: true,
        includeVideoAnnotations: true
      }
    )
  })

  it.each([
    null,
    { ...validAttachmentResult, datasetId: '7' },
    { ...validAttachmentResult, attachedSegmentCount: -1 },
    { ...validAttachmentResult, attachedSegmentIds: [0] },
    { ...validAttachmentResult, unexpected: true }
  ])('rejects a malformed persisted attachment result %#', async (data) => {
    hoisted.axios.post.mockResolvedValue({ data })

    await expect(attachAiDatasetAnnotations(7, { includeAllAnnotations: true })).rejects.toThrow(
      TypeError
    )
  })
})

const validDatasetOption = {
  id: 9,
  value: 'video-training',
  label: 'video-training',
  datasetType: 'video',
  aiModelType: 'video_segment_classification',
  isActive: true,
  nameCount: 1
}

describe('aiDatasetApi creation and persisted option boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('permits the backend to derive the model type for a typed create request', async () => {
    hoisted.axios.post.mockResolvedValue({ data: validDatasetOption })

    await expect(
      createAiDataset({ name: 'video-training', datasetType: 'video' })
    ).resolves.toEqual(validDatasetOption)
    expect(hoisted.axios.post).toHaveBeenCalledWith(
      '/api/settings/application/dropdowns/ai_datasets/',
      { name: 'video-training', datasetType: 'video' }
    )
  })

  it('accepts a persisted image dataset owned by the PHI detector contract', async () => {
    const phiDatasetOption = {
      ...validDatasetOption,
      datasetType: 'image',
      aiModelType: 'phi_region_detector'
    }
    hoisted.axios.get.mockResolvedValue({ data: [phiDatasetOption] })

    await expect(fetchAiDatasetOptions()).resolves.toEqual([phiDatasetOption])
  })

  it.each([
    { ...validDatasetOption, datasetType: 'unknown' },
    { ...validDatasetOption, aiModelType: 'image_multilabel_classification' },
    { ...validDatasetOption, aiModelType: 'unknown' },
    { ...validDatasetOption, unknown: true }
  ])('rejects malformed persisted dataset option %#', async (option) => {
    hoisted.axios.get.mockResolvedValue({ data: [option] })

    await expect(fetchAiDatasetOptions()).rejects.toThrow(TypeError)
  })
})
