import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface AiDatasetOption {
  id: number
  value: string
  label: string
  datasetType: AiDatasetType
  aiModelType: AiDatasetModelType | string
  isActive: boolean
  nameCount: number
}

export type AiDatasetType = 'image' | 'video'

export type AiDatasetModelType = 'image_multilabel_classification' | 'video_segment_classification'

export interface CreateAiDatasetPayload {
  name: string
  datasetType: AiDatasetType
  aiModelType?: AiDatasetModelType
  description?: string | null
  isActive?: boolean
}

export interface AiDatasetLabelOption {
  id: number
  name: string
}

export interface AiDatasetLabelSetOption {
  id: number
  name: string
  version: number
  description?: string
  labelCount: number
  labels: AiDatasetLabelOption[]
}

export interface AiDatasetFrameBucketCount {
  bucket: 'positive' | 'negative' | 'unknown'
  frameCount: number
}

export interface AiDatasetLabelDistributionEntry {
  labelId: number
  labelName: string
  framePositive: number
  frameNegative: number
  segmentCount: number
  total: number
}

export interface AiDatasetLabelFrameBucketCount {
  labelId: number
  labelName: string
  frameCount: number
}

export interface AiDatasetFrameBucketDistribution {
  schemaVersion: string
  datasetId: number
  name: string | null
  datasetType: string
  aiModelType: string
  isActive: boolean
  updatedAt: string
  labelGroupId: number | null
  labelGroupName: string | null
  targetLabelId: number | null
  targetLabelName: string | null
  predictionSegmentsOnly: boolean
  summary: {
    imageAnnotationCount: number
    videoAnnotationCount: number
    annotationFrameCount: number
    segmentFrameCount: number
    mergedFrameCount: number
    videoCount: number
    labelCount: number
  }
  targetBuckets: AiDatasetFrameBucketCount[]
  labelDistribution: AiDatasetLabelDistributionEntry[]
  annotationFrameBuckets: AiDatasetLabelFrameBucketCount[]
  segmentFrameBuckets: AiDatasetLabelFrameBucketCount[]
  mergedFrameBuckets: AiDatasetLabelFrameBucketCount[]
}

export interface AiDatasetFrameBucketDistributionParams {
  labelGroupId?: number | string | null
  targetLabelId?: number | string | null
  predictionSegmentsOnly?: boolean
}

export type AiDatasetFrameFormatStrategy =
  | 'preserve_dimensions_black_mask'
  | 'crop_to_endoscope_roi'

export interface AiDatasetTrainingManifestConfig {
  labelSetId?: number | string | null
  treatUnlabeledAsNegative: boolean
  includeFilePaths: boolean
  checkFrameFormat: boolean
  preprocessingStrategy: AiDatasetFrameFormatStrategy
  recommendedModelInputStrategy: AiDatasetFrameFormatStrategy
  informationSourceNames?: string[] | null
}

export interface AiDatasetFrameFormatSummary {
  checkRequired: boolean
  status: 'not_checked' | 'passed' | 'failed'
  checkedFrameCount: number
  expectedImageFormat: string | null
  expectedWidth: number | null
  expectedHeight: number | null
  expectedMode: string | null
  preprocessingStrategy: AiDatasetFrameFormatStrategy
  recommendedModelInputStrategy: AiDatasetFrameFormatStrategy
  cropTemplatesByVideoUuid: Record<string, number[] | null>
  notes: string[]
  errors: string[]
}

export interface AiDatasetTrainingManifestPreview {
  datasetId: number
  datasetName: string | null
  datasetType: string
  aiModelType: string
  config: AiDatasetTrainingManifestConfig
  summary: {
    labelCount: number
    sampleCount: number
    classFrequencies: number[] | null
    frameFormat: AiDatasetFrameFormatSummary
  }
  manifest: Record<string, unknown>
  lxAiCoreManifest: Record<string, unknown>
}

export interface AiDatasetAttachmentPayload {
  videoId?: number | string | null
  frameAnnotationIds?: Array<number | string>
  segmentIds?: Array<number | string>
  includeFrameAnnotations?: boolean
  includeVideoAnnotations?: boolean
  includeAllAnnotations?: boolean
  informationSourceNames?: string[] | null
}

export interface AiDatasetAttachmentResult {
  datasetId: number
  videoId: number | null
  frameAnnotationCount: number
  videoAnnotationCount: number
  attachedFrameAnnotationIds: number[]
  attachedSegmentIds: number[]
  attachedFrameAnnotationCount: number
  attachedSegmentCount: number
}

const AI_DATASETS_DROPDOWN_PATH = 'settings/application/dropdowns/ai_datasets/'
const frameBucketDistributionPath = (datasetId: number | string) =>
  `settings/application/ai_datasets/${datasetId}/frame_bucket_distribution/`
const trainingManifestPath = (datasetId: number | string) =>
  `settings/application/ai_datasets/${datasetId}/training_manifest/`
const attachmentsPath = (datasetId: number | string) =>
  `settings/application/ai_datasets/${datasetId}/attachments/`

export async function fetchAiDatasetOptions(): Promise<AiDatasetOption[]> {
  const { data } = await axiosInstance.get<AiDatasetOption[]>(r(AI_DATASETS_DROPDOWN_PATH))
  return data
}

export async function createAiDataset(payload: CreateAiDatasetPayload): Promise<AiDatasetOption> {
  const { data } = await axiosInstance.post<AiDatasetOption>(r(AI_DATASETS_DROPDOWN_PATH), payload)
  return data
}

export async function fetchAiDatasetLabelSets(): Promise<AiDatasetLabelSetOption[]> {
  const { data } = await axiosInstance.get<AiDatasetLabelSetOption[]>(
    r(endpoints.media.videoLabelSetsList)
  )
  return data
}

export async function fetchAiDatasetFrameBucketDistribution(
  datasetId: number | string,
  params: AiDatasetFrameBucketDistributionParams = {}
): Promise<AiDatasetFrameBucketDistribution> {
  const { data } = await axiosInstance.get<AiDatasetFrameBucketDistribution>(
    r(frameBucketDistributionPath(datasetId)),
    {
      params: {
        label_group_id: params.labelGroupId || undefined,
        target_label_id: params.targetLabelId || undefined,
        prediction_segments_only:
          params.predictionSegmentsOnly === undefined
            ? undefined
            : String(params.predictionSegmentsOnly)
      }
    }
  )
  return data
}

export async function buildAiDatasetTrainingManifest(
  datasetId: number | string,
  config: AiDatasetTrainingManifestConfig
): Promise<AiDatasetTrainingManifestPreview> {
  const { data } = await axiosInstance.post<AiDatasetTrainingManifestPreview>(
    r(trainingManifestPath(datasetId)),
    config
  )
  return data
}

export async function attachAiDatasetAnnotations(
  datasetId: number | string,
  payload: AiDatasetAttachmentPayload
): Promise<AiDatasetAttachmentResult> {
  const { data } = await axiosInstance.post<AiDatasetAttachmentResult>(
    r(attachmentsPath(datasetId)),
    payload
  )
  return data
}
