import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface AiDatasetOption {
  id: number
  value: string
  label: string
  datasetType: AiDatasetType
  aiModelType: AiDatasetModelType
  isActive: boolean
  nameCount: number
}

export type AiDatasetType = 'image' | 'video'

export type AiDatasetModelType =
  'image_multilabel_classification' | 'phi_region_detector' | 'video_segment_classification'

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
  'preserve_dimensions_black_mask' | 'crop_to_endoscope_roi'

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
  videoId?: number | null
  frameAnnotationIds?: number[]
  segmentIds?: number[]
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
  `settings/application/ai_datasets/${String(datasetId)}/frame_bucket_distribution/`
const trainingManifestPath = (datasetId: number | string) =>
  `settings/application/ai_datasets/${String(datasetId)}/training_manifest/`
const attachmentsPath = (datasetId: number | string) =>
  `settings/application/ai_datasets/${String(datasetId)}/attachments/`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`AI dataset response contains an invalid ${field}`)
  }
  return value
}

function requireInteger(value: unknown, field: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`AI dataset response contains an invalid ${field}`)
  }
  return value
}

function requireNullablePositiveInteger(value: unknown, field: string): number | null {
  if (value === null) {
    return null
  }
  return requireInteger(value, field, 1)
}

function requirePositiveIntegerArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`AI dataset response contains an invalid ${field}`)
  }
  return value.map((item, index) => requireInteger(item, `${field}[${String(index)}]`, 1))
}

const AI_DATASET_ATTACHMENT_RESULT_FIELDS = new Set([
  'datasetId',
  'videoId',
  'frameAnnotationCount',
  'videoAnnotationCount',
  'attachedFrameAnnotationIds',
  'attachedSegmentIds',
  'attachedFrameAnnotationCount',
  'attachedSegmentCount'
])

function requireAiDatasetAttachmentResult(value: unknown): AiDatasetAttachmentResult {
  if (!isRecord(value)) {
    throw new TypeError('AI dataset attachment response must be an object')
  }
  const unknownField = Object.keys(value).find(
    (field) => !AI_DATASET_ATTACHMENT_RESULT_FIELDS.has(field)
  )
  if (unknownField !== undefined) {
    throw new TypeError(`AI dataset attachment response contains unknown field ${unknownField}`)
  }
  return {
    datasetId: requireInteger(value.datasetId, 'datasetId', 1),
    videoId: requireNullablePositiveInteger(value.videoId, 'videoId'),
    frameAnnotationCount: requireInteger(value.frameAnnotationCount, 'frameAnnotationCount', 0),
    videoAnnotationCount: requireInteger(value.videoAnnotationCount, 'videoAnnotationCount', 0),
    attachedFrameAnnotationIds: requirePositiveIntegerArray(
      value.attachedFrameAnnotationIds,
      'attachedFrameAnnotationIds'
    ),
    attachedSegmentIds: requirePositiveIntegerArray(value.attachedSegmentIds, 'attachedSegmentIds'),
    attachedFrameAnnotationCount: requireInteger(
      value.attachedFrameAnnotationCount,
      'attachedFrameAnnotationCount',
      0
    ),
    attachedSegmentCount: requireInteger(value.attachedSegmentCount, 'attachedSegmentCount', 0)
  }
}

function requireAiDatasetType(value: unknown): AiDatasetType {
  if (value !== 'image' && value !== 'video') {
    throw new TypeError('AI dataset response contains an invalid datasetType')
  }
  return value
}

function requireAiDatasetModelType(value: unknown): AiDatasetModelType {
  if (
    value !== 'image_multilabel_classification' &&
    value !== 'phi_region_detector' &&
    value !== 'video_segment_classification'
  ) {
    throw new TypeError('AI dataset response contains an invalid aiModelType')
  }
  return value
}

const AI_DATASET_OPTION_FIELDS = new Set([
  'id',
  'value',
  'label',
  'datasetType',
  'aiModelType',
  'isActive',
  'nameCount'
])

function requireAiDatasetOption(value: unknown, index?: number): AiDatasetOption {
  const prefix = index === undefined ? '' : `[${String(index)}].`
  if (!isRecord(value)) {
    throw new TypeError(`AI dataset response contains an invalid option${prefix}`)
  }
  const unknownField = Object.keys(value).find((field) => !AI_DATASET_OPTION_FIELDS.has(field))
  if (unknownField !== undefined) {
    throw new TypeError(`AI dataset response contains unknown field ${unknownField}`)
  }
  if (typeof value.isActive !== 'boolean') {
    throw new TypeError(`AI dataset response contains an invalid ${prefix}isActive`)
  }
  const datasetType = requireAiDatasetType(value.datasetType)
  const aiModelType = requireAiDatasetModelType(value.aiModelType)
  const allowedModelTypes: Record<AiDatasetType, ReadonlySet<AiDatasetModelType>> = {
    image: new Set(['image_multilabel_classification', 'phi_region_detector']),
    video: new Set(['video_segment_classification'])
  }
  if (!allowedModelTypes[datasetType].has(aiModelType)) {
    throw new TypeError('AI dataset response contains incompatible dataset/model types')
  }
  return {
    id: requireInteger(value.id, `${prefix}id`, 1),
    value: requireString(value.value, `${prefix}value`),
    label: requireString(value.label, `${prefix}label`),
    datasetType,
    aiModelType,
    isActive: value.isActive,
    nameCount: requireInteger(value.nameCount, `${prefix}nameCount`, 1)
  }
}

export async function fetchAiDatasetOptions(): Promise<AiDatasetOption[]> {
  const { data } = await axiosInstance.get<unknown>(r(AI_DATASETS_DROPDOWN_PATH))
  if (!Array.isArray(data)) {
    throw new TypeError('AI dataset response must be an array')
  }
  return data.map((option, index) => requireAiDatasetOption(option, index))
}

export async function createAiDataset(payload: CreateAiDatasetPayload): Promise<AiDatasetOption> {
  const { data } = await axiosInstance.post<unknown>(r(AI_DATASETS_DROPDOWN_PATH), payload)
  return requireAiDatasetOption(data)
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
  const { data } = await axiosInstance.post<unknown>(r(attachmentsPath(datasetId)), payload)
  return requireAiDatasetAttachmentResult(data)
}
