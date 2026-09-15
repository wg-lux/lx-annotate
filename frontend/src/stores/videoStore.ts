import { defineStore } from 'pinia'
import { ref, computed, reactive, readonly } from 'vue'
import axiosInstance, { r } from '../api/axiosInstance'
import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { buildVideoStreamUrl } from '@/utils/mediaUrls'
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils'
import { useAnonymizationStore, type FileItem } from './anonymizationStore'
import { useToastStore } from './toastStore'
import { endpoints } from '@/types/api/endpoints'
import {
  buildSegmentTimestampPayload,
  getAdjacentFrameBoundary,
  parseVideoFrameNeighborhood,
  type FrameStepDirection,
  type VideoFrameBoundary,
  type VideoFrameNeighborhood,
  requireSegmentTimestampRange
} from '@/utils/segmentTimeline'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('video-store')

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

/**
 * Translation map for label names (German translations)
 */
export interface Video {
  id: number
  center_key?: string
  center_name?: string
  processor_name?: string
  original_file_name?: string
  status?: string
  video_url?: string
  exportSegmentsByVideo?: boolean
  frameCount?: number
  postValidationRebuild?: PostValidationRebuildSummary | null
  [key: string]: unknown
}

export type LabelKey =
  | 'appendix'
  | 'blood'
  | 'diverticule'
  | 'grasper'
  | 'ileocaecalvalve'
  | 'ileum'
  | 'low_quality'
  | 'nbi'
  | 'needle'
  | 'outside'
  | 'polyp'
  | 'snare'
  | 'water_jet'
  | 'wound'

/**
 * Video status types
 */
export type VideoStatus = 'in_progress' | 'available' | 'completed' | 'failed'

/**
 * Backend frame prediction structure (from API responses)
 */
export interface BackendFramePrediction {
  frameNumber: number
  label: string
  confidence: number
}

/**
 * Backend frame structure (from API responses)
 */

export interface TimeSegmentFrame {
  frameFilename: string
  frameFilePath: string // media-relative path from backend
  frameUrl: string // full URL (what the frontend should use)
  allClassifications: unknown[]
  predictions: BackendFramePrediction[] | unknown[]
  frameId: number
  manualAnnotations: unknown[]
}

export interface TimeSegments {
  segmentId: number
  segmentStart: number
  segmentEnd: number
  startTime: number
  endTime: number
  frames: TimeSegmentFrame[]
}

/**
 * Backend segment format (from API responses)
 */

export interface BackendSegment {
  id: number
  videoFile?: number
  video_file?: number
  videoName?: string
  video_name?: string
  videoId?: number
  video_id?: number
  label?: number | null
  labelName?: string | null
  label_name?: string | null
  labelId?: number | null
  label_id?: number | null
  labelDisplay?: string | null
  label_display?: string | null
  startFrameNumber?: number
  start_frame_number?: number
  endFrameNumber?: number
  end_frame_number?: number
  startTime?: number
  start_time?: number
  endTime?: number
  end_time?: number
  exportSegment?: boolean
  export_segment?: boolean
  sourceName?: string | null
  source_name?: string | null
  segmentOrigin?: 'manual' | 'prediction' | 'prediction_correction'
  segment_origin?: 'manual' | 'prediction' | 'prediction_correction'
  predictionMetaId?: number | null
  prediction_meta_id?: number | null
  framePredictions?: BackendFramePrediction[]
  manualFrameAnnotations?: unknown[]
  timeSegments?: TimeSegments | null
  time_segments?: TimeSegments | null
}

/**
 * Frontend segment format (unified camelCase)
 */
export interface FrontendSegment {
  id: number
  startFrameNumber?: number
  endFrameNumber?: number
  label: string
  videoName?: string
  startTime: number
  endTime: number
  usingFPS?: boolean
}

export type SegmentSyncState =
  'clean' | 'dirty' | 'pending_create' | 'pending_update' | 'pending_delete' | 'error'

/**
 * Segment interface for internal store usage
 * (canonical frontend representation)
 */
export interface Segment {
  id: number // ⬅ numeric only (drafts use negative ids)
  label: string
  startTime: number
  endTime: number
  avgConfidence: number
  videoID?: number
  labelID: number | null
  frames?: Record<string, TimeSegmentFrame>
  color?: string
  startFrameNumber?: number
  endFrameNumber?: number
  usingFPS?: boolean
  isDraft?: boolean
  isDirty?: boolean // ⬅ used by persistDirtySegments()
  exportSegment?: boolean
  sourceName?: string | null
  segmentOrigin?: 'manual' | 'prediction' | 'prediction_correction'
  predictionMetaId?: number | null
  syncState?: SegmentSyncState
  lastSyncError?: string | null
}

/**
 * Video annotation interface
 */
export interface VideoAnnotation {
  id: number
  isAnnotated: boolean
  errorMessage: string
  segments: Segment[]
  videoUrl: string
  status: VideoStatus
  assignedUser: string | null
  duration?: number
  fps?: number
  frameCount?: number
}

export type SegmentAnnotationStatus =
  | 'not_started'
  | 'cleanup_queued'
  | 'cleanup_running'
  | 'cleanup_failed'
  | 'cleanup_required'
  | 'validated'

export interface PostValidationRebuildSummary {
  id?: number | null
  status?: string
  taskId?: string
  task_id?: string
  details?: string
  outputFile?: string
  output_file?: string
  createdAt?: string | null
  created_at?: string | null
  completedAt?: string | null
  completed_at?: string | null
}

/**
 * Video metadata from backend
 */
export interface VideoMeta {
  id: number
  original_file_name: string
  status: VideoStatus
  assignedUser: string | null
  anonymized: boolean
  segmentAnnotationsValidated?: boolean
  segmentAnnotationStatus?: SegmentAnnotationStatus
  outsideSegmentsRemoved?: boolean
  postValidationRebuild?: PostValidationRebuildSummary | null
  duration?: number
  fps?: number
  hasROI?: boolean
  outsideFrameCount?: number
  frameCount?: number
  centerKey?: string
  centerName: string
  processorName: string
  validatedAnnotators?: string[]
  segments?: Segment[]
  exportSegmentsByVideo?: boolean
}

/**
 * Label metadata
 */
export interface LabelMeta {
  id: number
  name: string
  color?: string
}

export interface PredictionModelMeta {
  id: number
  name: string
  version: string
  description?: string
  modelName: string
  aiModelId: number
  labelsetName: string
  labelsetVersion: number | string
  labelsetId: number
  weightsAvailable: boolean
  isActive: boolean
}

export interface PredictionModelListResponse {
  models: PredictionModelMeta[]
  defaultHuggingfaceModelId: string
  defaultModelName: string
  defaultLabelsetName: string
  huggingfaceModels: Array<{
    modelId: string
    label: string
    labelsetName: string
  }>
}

export interface RerunPredictionSegmentsPayload {
  modelMetaId?: number | null
  hfModelId?: string | null
  labelsetName?: string | null
  labelsetVersion?: number | string | null
  replacePredictionSegments?: boolean
  deleteFramesAfter?: boolean
}

export interface RerunPredictionSegmentsResponse {
  success: boolean
  status: 'queued' | 'already_queued' | 'pending_after_rebuild' | 'completed' | 'busy' | 'failed'
  queued: boolean
  pending: boolean
  videoId: number
  modelMeta: PredictionModelMeta
  job: {
    taskId: string
    historyId: number | null
    mode: string
    queue: string
  }
  deletedPredictionSegments: number | null
  predictionSegmentsCount: number
  reason?: string | null
  message?: string | null
  blockedByHistoryId?: number | null
  error?: string
}

export interface PredictionProcessingHistoryEntry {
  id: number
  operation: string
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled'
  details: string
  taskId?: string
  config?: Record<string, unknown>
}

/**
 * Video list response structure
 */
export interface VideoList {
  videos: VideoMeta[]
  labels: LabelMeta[]
}

/**
 * Draft segment interface
 */
export interface DraftSegment {
  id: number // ⬅ negative numbers for drafts
  videoId: number
  label: string
  startTime: number
  endTime: number | null
}

export interface SegmentSaveResult {
  status: 'saved' | 'unchanged' | 'incomplete' | 'pending'
  savedCount: number
  remainingCount: number
}

/**
 * Segment option for dropdowns
 */
export interface SegmentOption {
  id: number
  label: string
  startTime: number
  endTime: number
  display: string
}

/**
 * Segment style object for CSS
 */
export interface SegmentStyle {
  left: string
  width: string
  backgroundColor: string
  opacity?: string
  border?: string
}

/**
 * Update payload for segments
 */
export interface SegmentUpdatePayload {
  startTime?: number
  endTime?: number
  start_time?: number
  end_time?: number
  exportSegment?: boolean
  export_segment?: boolean
  [key: string]: unknown
}

export type CreateSegmentResponse = BackendSegment

export type SegmentSourceKind = 'all' | 'manual' | 'prediction' | 'prediction_correction'

type SegmentBulkCreatePayload = {
  client_id?: number
  label_id?: number | null
  label_name?: string
  start_time?: number
  end_time?: number
  start_frame_number?: number
  end_frame_number?: number
  export_segment?: boolean
}

type SegmentBulkUpdatePayload = SegmentUpdatePayload & {
  id: number
}

type SegmentBulkMutationPayload = {
  defer_annotation_sync?: boolean
  aiDatasetId?: number | string | null
  creates?: SegmentBulkCreatePayload[]
  updates?: SegmentBulkUpdatePayload[]
  deletes?: number[]
}

type SegmentBulkMutationResponse = {
  created: Array<{
    clientId?: number
    client_id?: number
    segment: BackendSegment
  }>
  updated: BackendSegment[]
  deleted: number[]
  createdCount?: number
  created_count?: number
  updatedCount?: number
  updated_count?: number
  deletedCount?: number
  deleted_count?: number
  deferAnnotationSync?: boolean
  defer_annotation_sync?: boolean
  aiDatasetId?: number | null
  ai_dataset_id?: number | null
  attachedSegmentIds?: number[]
  attached_segment_ids?: number[]
  datasetVideoAnnotationCount?: number
  dataset_video_annotation_count?: number
}

type SegmentListResponse = BackendSegment[] | { results: BackendSegment[] }
type VideoFpsResponse = { video_id: number; fps: number }

function normalizeSegmentList(data: SegmentListResponse | null | undefined): BackendSegment[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && Array.isArray(data.results)) {
    return data.results
  }
  return []
}

function readField(source: object, ...keys: string[]): unknown {
  for (const key of keys) {
    const value: unknown = Reflect.get(source, key)
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

function requireObject(value: unknown, contractName: string): object {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${contractName} response does not match the expected contract`)
  }
  return value
}

function readStringField(source: object, ...keys: string[]): string | null {
  const value = readField(source, ...keys)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readRequiredStringField(source: object, ...keys: string[]): string {
  const value = readStringField(source, ...keys)
  if (value === null) {
    throw new TypeError(`Contract mismatch: missing required string field(s): ${keys.join(' / ')}`)
  }
  return value
}

function readVideoStatus(source: object, ...keys: string[]): VideoStatus {
  const value = readStringField(source, ...keys)
  if (
    value === 'in_progress' ||
    value === 'available' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value
  }
  throw new TypeError(
    `Contract mismatch: invalid status value: ${value ?? 'undefined/null'} (${keys.join(' / ')})`
  )
}

const VIDEO_METADATA_STATUS_MAP: Readonly<Record<string, VideoStatus>> = {
  in_progress: 'in_progress',
  available: 'available',
  completed: 'completed',
  failed: 'failed',
  not_started: 'in_progress',
  extracting_frames: 'in_progress',
  processing_anonymization: 'in_progress',
  done_processing_anonymization: 'completed',
  validated: 'completed',
  anonymized: 'completed',
  started: 'in_progress',
  blank: 'in_progress'
}

function mapVideoMetadataStatus(value: string | null | undefined): VideoStatus {
  const normalized = value?.trim().toLowerCase()
  const mappedStatus = normalized ? VIDEO_METADATA_STATUS_MAP[normalized] : undefined
  if (mappedStatus) {
    return mappedStatus
  }

  throw new TypeError(
    `Contract mismatch: invalid metadata status value: ${value ?? 'undefined/null'}`
  )
}

function readNullableAssignedUserField(source: object, ...keys: string[]): string | null {
  const value = readField(source, ...keys)
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Contract mismatch: invalid assigned user field(s): ${keys.join(' / ')}`)
  }
  const normalized = value.trim()
  if (!normalized || normalized === 'BLANK') {
    return null
  }
  return normalized
}

function readNumberField(source: object, ...keys: string[]): number | undefined {
  const value = readField(source, ...keys)
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readNumberFieldOr(source: object, fallback: number, ...keys: string[]): number {
  return readNumberField(source, ...keys) ?? fallback
}

function readBooleanField(source: object, ...keys: string[]): boolean {
  return Boolean(readField(source, ...keys))
}

function readBooleanFieldOrFalse(source: object, ...keys: string[]): boolean {
  const value = readField(source, ...keys)
  return value === undefined ? false : (value as boolean)
}

function readOptionalStringField(source: object, ...keys: string[]): string | undefined {
  const value = readField(source, ...keys)
  return typeof value === 'string' ? value : undefined
}

function numberWhenDefined(value: unknown): number | undefined {
  return value !== undefined ? Number(value) : undefined
}

function normalizeValidatedAnnotators(video: object): string[] {
  const camelCaseAnnotators = readField(video, 'validatedAnnotators')
  const snakeCaseAnnotators = readField(video, 'validated_annotators')
  const annotators = Array.isArray(camelCaseAnnotators)
    ? camelCaseAnnotators
    : Array.isArray(snakeCaseAnnotators)
      ? snakeCaseAnnotators
      : []
  return annotators.filter((annotator): annotator is string => typeof annotator === 'string')
}

function normalizeVideoFrameCount(video: object): number | undefined {
  const camelCaseFrameCount = readField(video, 'frameCount')
  return camelCaseFrameCount !== undefined
    ? Number(camelCaseFrameCount)
    : numberWhenDefined(readField(video, 'frame_count'))
}

function normalizeVideoMetadataResponse(meta: object, fallbackId: number): VideoMeta {
  const resolvedVideoId = readField(meta, 'id')
  const anonymized = readField(meta, 'anonymized')
  const hasRoi = readField(meta, 'hasROI', 'has_roi')
  const outsideFrameCount = readField(meta, 'outsideFrameCount', 'outside_frame_count')
  const exportSegmentsByVideo = readField(meta, 'exportSegmentsByVideo', 'export_segments_by_video')
  return {
    id: Number(resolvedVideoId ?? fallbackId),
    original_file_name: readRequiredStringField(meta, 'original_file_name', 'originalFileName'),
    status: mapVideoMetadataStatus(readStringField(meta, 'status')),
    assignedUser: readNullableAssignedUserField(meta, 'assignedUser', 'assigned_user'),
    anonymized: Boolean(anonymized ?? false),
    duration: numberWhenDefined(readField(meta, 'duration')),
    fps: numberWhenDefined(readField(meta, 'fps')),
    hasROI: Boolean(hasRoi ?? false),
    outsideFrameCount: Number(outsideFrameCount ?? 0),
    frameCount: normalizeVideoFrameCount(meta),
    centerName: readRequiredStringField(meta, 'centerName', 'center_name'),
    processorName: readRequiredStringField(meta, 'processorName', 'processor_name'),
    exportSegmentsByVideo: Boolean(exportSegmentsByVideo ?? false)
  }
}

function formatValidationErrorDetail(detail: unknown): string {
  if (detail == null) {
    return ''
  }
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => formatValidationErrorDetail(item))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof detail === 'object') {
    return Object.entries(detail as Record<string, unknown>)
      .map(([field, value]) => {
        const message = formatValidationErrorDetail(value)
        return message ? `${field}: ${message}` : field
      })
      .filter(Boolean)
      .join(' ')
  }
  return typeof detail === 'number' || typeof detail === 'boolean' || typeof detail === 'bigint'
    ? String(detail)
    : ''
}

function getBulkOperationErrorDetail(
  responseData: unknown,
  operation: 'creates' | 'updates' | 'deletes',
  identifier: number | string,
  index: number
): unknown {
  const details = (responseData as { details?: Record<string, unknown> } | undefined)?.details
  const operationDetails = details?.[operation]
  if (!operationDetails || typeof operationDetails !== 'object') {
    return null
  }

  const keyedDetails = operationDetails as Record<string, unknown>
  return keyedDetails[String(identifier)] ?? keyedDetails[String(index)] ?? null
}

function buildFramesMap(
  timeSegments: TimeSegments | null
): Record<string, TimeSegmentFrame> | undefined {
  if (!timeSegments || timeSegments.frames.length === 0) {
    return undefined
  }
  return Object.fromEntries(timeSegments.frames.map((frame) => [String(frame.frameId), frame]))
}

function resolveSegmentOrigin(
  backend: BackendSegment,
  sourceName: string | null,
  predictionMetaId: number | undefined
): Segment['segmentOrigin'] {
  if (sourceName === 'prediction_correction') {
    return 'prediction_correction'
  }
  const explicitOrigin = backend.segmentOrigin ?? backend.segment_origin
  if (explicitOrigin) {
    return explicitOrigin
  }
  return sourceName === 'prediction' || predictionMetaId !== undefined ? 'prediction' : 'manual'
}

function resolveSegmentLabelId(backend: BackendSegment): number | null {
  const labelId = readNumberField(backend, 'labelId', 'label_id', 'label')
  return labelId ?? (typeof backend.label === 'number' ? backend.label : null)
}

export function backendSegmentToSegment(backend: BackendSegment): Segment {
  const labelName = readStringField(
    backend,
    'labelName',
    'labelDisplay',
    'label_name',
    'label_display'
  )
  const sourceName = readStringField(backend, 'sourceName', 'source_name')
  const predictionMetaId = readNumberField(backend, 'predictionMetaId', 'prediction_meta_id')
  const timeSegments = backend.timeSegments ?? backend.time_segments ?? null

  return {
    id: readNumberFieldOr(backend, backend.id, 'id'),
    label: labelName ?? 'unknown',
    startTime: readNumberFieldOr(backend, 0, 'startTime', 'start_time'),
    endTime: readNumberFieldOr(backend, 0, 'endTime', 'end_time'),
    avgConfidence: 1,
    videoID: readNumberField(backend, 'videoId', 'video_id', 'videoFile', 'video_file'),
    labelID: resolveSegmentLabelId(backend),
    startFrameNumber: readNumberField(backend, 'startFrameNumber', 'start_frame_number'),
    endFrameNumber: readNumberField(backend, 'endFrameNumber', 'end_frame_number'),
    exportSegment: readBooleanFieldOrFalse(backend, 'exportSegment', 'export_segment'),
    frames: buildFramesMap(timeSegments),
    sourceName,
    segmentOrigin: resolveSegmentOrigin(backend, sourceName, predictionMetaId),
    predictionMetaId: predictionMetaId ?? null,
    syncState: 'clean',
    lastSyncError: null
  }
}

/**
 * Upload callback types
 */
export type UploadLoadCallback = (serverFileId?: string) => void
export type UploadErrorCallback = (message: string) => void

// ===================================================================
// CONSTANTS
// ===================================================================

const videos = ref<Video[]>([])

const getToastStore = () => useToastStore()

// Cancel in-flight segment fetches to avoid piling up requests on rapid refreshes.
let fetchSegmentsController: AbortController | null = null

type SegmentUpdateJob = {
  videoId: number
  segmentId: number
  payload: SegmentUpdatePayload
  attempts: number
}

const MAX_SEGMENT_UPDATE_RETRIES = 5
const SEGMENT_UPDATE_RETRY_BASE_MS = 1000
const SEGMENT_UPDATE_RETRY_MAX_MS = 30000

const segmentUpdateQueue: SegmentUpdateJob[] = []
let isProcessingSegmentQueue = false
let segmentQueueTimer: ReturnType<typeof setTimeout> | null = null

const defaultSegments: Record<string, Segment[]> = {}
const DEFAULT_FPS = 50
const FIVE_SECOND_SEGMENT_DURATION = 5 // 5 Sekunden für Shift-Klick
const FRAME_NEIGHBORHOOD_RADIUS = 12

type FrameNavigationCache = Pick<
  VideoFrameNeighborhood,
  'videoId' | 'timelineVersion' | 'timestampMapping' | 'frames'
> & {
  activeFrameNumber: number
  activeTimestamp: number
}

let nextDraftId = -1

// ===================================================================
// STORE IMPLEMENTATION
// ===================================================================

export const useVideoStore = defineStore('video', () => {
  // ===================================================================
  // STATE
  // ===================================================================

  const currentVideo = ref<VideoAnnotation | null>(null)
  const errorMessage = ref<string>('')
  const videoUrl = ref<string>('')
  const segmentsByLabel = reactive<Record<string, Segment[]>>({ ...defaultSegments })
  const videoList = ref<VideoList>({ videos: [], labels: [] })
  const predictionModels = ref<PredictionModelMeta[]>([])
  const defaultHuggingfaceModelId = ref<string>('wg-lux/colo_segmentation_RegNetX800MF_base')
  const defaultPredictionLabelsetName = ref<string>('multilabel_classification_colonoscopy_default')
  const videoMeta = ref<VideoMeta | null>(null)
  const resolvedVideoFps = ref<number | null>(null)
  const activeSegmentId = ref<string | number | null>(null)
  const activeVideoId = ref<number | null>(null)
  const segmentAiDatasetId = ref<string | null>(null)
  const _fetchToken = ref<number>(0)
  let labelsLoaded = false
  const draftSegment = ref<DraftSegment | null>(null)
  const pendingDraftIds = reactive(new Set<number>())
  const draftCommits = new Map<number, Promise<Segment | null>>()
  const isDraftSaving = computed(
    () => draftSegment.value !== null && pendingDraftIds.has(draftSegment.value.id)
  )
  const isSavingSegments = ref(false)
  const hasRawVideoFile = ref<boolean | null>(null)
  let frameNavigationCache: FrameNavigationCache | null = null

  function resetFrameNavigationCache(): void {
    frameNavigationCache = null
  }

  function resolveCachedAdjacentFrame(
    videoId: number,
    timestamp: number,
    direction: FrameStepDirection
  ): VideoFrameBoundary | null {
    const cache = frameNavigationCache
    if (!cache || cache.videoId !== videoId || cache.activeTimestamp !== timestamp) {
      return null
    }
    const targetFrameNumber = cache.activeFrameNumber + direction
    const target = cache.frames.find((frame) => frame.frameNumber === targetFrameNumber) ?? null
    if (target) {
      cache.activeFrameNumber = target.frameNumber
      cache.activeTimestamp = target.timestamp
    }
    return target
  }

  function setSegmentAiDatasetId(value: string | number | null | undefined): void {
    const normalized = value == null ? '' : String(value).trim()
    segmentAiDatasetId.value = normalized || null
  }

  function selectedAiDatasetPayload(): { aiDatasetId?: number } {
    const parsed = Number(segmentAiDatasetId.value)
    return Number.isFinite(parsed) && parsed > 0 ? { aiDatasetId: parsed } : {}
  }

  function withSelectedAiDataset<T extends Record<string, unknown>>(
    payload: T
  ): T & { aiDatasetId?: number } {
    if ('aiDatasetId' in payload || 'ai_dataset_id' in payload) {
      return payload
    }
    return {
      ...payload,
      ...selectedAiDatasetPayload()
    }
  }

  function findSegmentById(segmentId: number): Segment | null {
    for (const label in segmentsByLabel) {
      const match = segmentsByLabel[label].find((s) => s.id === segmentId)
      if (match) {
        return match
      }
    }
    return null
  }

  function normalizeFps(value: unknown): number | null {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  // ===================================================================
  // COMPUTED PROPERTIES
  // ===================================================================

  const hasVideo = computed<boolean>(() => !!currentVideo.value)

  const duration = computed<number>(() => {
    if (videoMeta.value?.duration) {
      return videoMeta.value.duration
    }
    if (currentVideo.value?.duration) {
      return currentVideo.value.duration
    }
    return 0
  })

  const getEffectiveFps = (): number => {
    const framesPerSecond =
      resolvedVideoFps.value ?? videoMeta.value?.fps ?? currentVideo.value?.fps ?? DEFAULT_FPS
    return Number.isFinite(framesPerSecond) && framesPerSecond > 0 ? framesPerSecond : DEFAULT_FPS
  }
  const effectiveFps = computed<number>(() => getEffectiveFps())

  const segments = computed<Segment[]>(() => currentVideo.value?.segments || [])

  const labels = computed<LabelMeta[]>(() => videoList.value.labels)

  // ✅ NEW: Fast lookup table für Label-Namen zu IDs (wird nur einmal berechnet)
  // maps 'polyp' → 3  |  'blood' → 7 ...
  const labelIdMap = computed<Record<string, number>>(() => {
    const labelIdsByName: Record<string, number> = {}
    videoList.value.labels.forEach((l) => (labelIdsByName[l.name] = l.id))
    return labelIdsByName
  })

  // ✅ NEW: Helper function to ensure labelID is always set correctly
  function ensureLabelId(segment: Segment): Segment {
    return {
      ...segment,
      labelID: segment.labelID ?? labelIdMap.value[segment.label]
    }
  }

  const allSegments = computed<Segment[]>(() => {
    const segments: Segment[] = [...(currentVideo.value?.segments || [])]

    if (draftSegment.value) {
      const draft: Segment = {
        id: draftSegment.value.id,
        label: draftSegment.value.label,
        startTime: draftSegment.value.startTime,
        endTime: draftSegment.value.endTime || draftSegment.value.startTime,
        avgConfidence: 0,
        labelID: labelIdMap.value[draftSegment.value.label] ?? null,
        isDraft: true
      }
      segments.push(draft)
    }

    return segments
  })

  const segmentOptions = computed<SegmentOption[]>(() =>
    allSegments.value.map((segment): SegmentOption => ({
      id: segment.id,
      label: getTranslationForLabel(segment.label),
      startTime: segment.startTime,
      endTime: segment.endTime,
      display: `${getTranslationForLabel(segment.label)}: ${formatTime(segment.startTime)} – ${formatTime(segment.endTime)}`
    }))
  )

  const activeSegment = computed<Segment | null>(
    () => allSegments.value.find((s) => s.id === activeSegmentId.value) || null
  )

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  /**
    Deletes a Video using the force-removal endpoint
    */

  async function deleteVideo(videoId: number | null): Promise<boolean> {
    if (!videoId) {
      videoId = currentVideo.value?.id || null
    }
    if (!videoId) {
      logger.warn('video-delete.video-missing')
      return false
    }
    try {
      await axiosInstance.delete(r(endpoints.mediaManagement.forceRemove(videoId)))
      return true
    } catch (error) {
      logger.error('video-delete.failed', error)
      return false
    }
  }

  function setActiveSegment(segmentId: number): void {
    activeSegmentId.value = segmentId
  }

  function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void {
    if (videoElement && segment.startTime) {
      videoElement.currentTime = segment.startTime
      videoElement.play().catch(() => {
        logger.warn('playback.start-rejected')
      })
    }
  }

  function getSegmentStyle(segment: Segment, videoDuration: number): SegmentStyle {
    const startPercent = (segment.startTime / videoDuration) * 100
    const widthPercent = ((segment.endTime - segment.startTime) / videoDuration) * 100

    return {
      left: `${String(startPercent)}%`,
      width: `${String(widthPercent)}%`,
      backgroundColor: getColorForLabel(segment.label)
    }
  }

  function findStoredSegment(segmentId: number): { segment: Segment; label: string } | null {
    for (const label in segmentsByLabel) {
      const segment = segmentsByLabel[label].find((candidate) => candidate.id === segmentId)
      if (segment) {
        return { segment, label }
      }
    }
    return null
  }

  function applySegmentUpdates(
    segment: Segment,
    updates: Partial<Segment>,
    markDirty: boolean
  ): void {
    Object.assign(segment, updates)
    if (!markDirty || segment.isDraft) {
      return
    }
    segment.isDirty = true
    segment.syncState = 'dirty'
    segment.lastSyncError = null
  }

  function moveSegmentToUpdatedLabel(
    segmentId: number,
    segment: Segment,
    oldLabel: string,
    updatedLabel: string | undefined
  ): void {
    if (!updatedLabel || updatedLabel === oldLabel) {
      return
    }
    segmentsByLabel[oldLabel] = segmentsByLabel[oldLabel].filter(
      (candidate) => candidate.id !== segmentId
    )
    segmentsByLabel[updatedLabel] ??= []
    segmentsByLabel[updatedLabel].push(segment)
  }

  function updateCurrentVideoSegment(
    segmentId: number,
    updates: Partial<Segment>,
    markDirty: boolean
  ): void {
    const segment = currentVideo.value?.segments.find((candidate) => candidate.id === segmentId)
    if (segment) {
      applySegmentUpdates(segment, updates, markDirty)
    }
  }

  function updateSegmentInMemory(
    segmentId: number,
    updates: Partial<Segment>,
    markDirty = false
  ): void {
    const stored = findStoredSegment(segmentId)
    if (!stored) {
      return
    }
    applySegmentUpdates(stored.segment, updates, markDirty)
    moveSegmentToUpdatedLabel(segmentId, stored.segment, stored.label, updates.label)
    updateCurrentVideoSegment(segmentId, updates, markDirty)
  }

  function getSegmentOptions(): SegmentOption[] {
    return segmentOptions.value
  }

  function clearSegments(): void {
    Object.keys(segmentsByLabel).forEach((key) => {
      Reflect.deleteProperty(segmentsByLabel, key)
    })
  }

  function getCachedSegments(videoId: number): Segment[] | null {
    const cachedVideo = videoList.value.videos.find((video) => video.id === videoId)
    if (!cachedVideo || !Array.isArray(cachedVideo.segments)) {
      return null
    }

    return cachedVideo.segments.map((segment) =>
      ensureLabelId({
        ...segment,
        videoID: segment.videoID ?? videoId
      })
    )
  }

  function applyCachedSegments(videoId: number, segments: Segment[]): void {
    clearSegments()

    segments.forEach((segment) => {
      const segmentWithVideoId = ensureLabelId({
        ...segment,
        videoID: segment.videoID ?? videoId
      })
      const label = segmentWithVideoId.label
      if (!(label in segmentsByLabel)) {
        segmentsByLabel[label] = []
      }
      segmentsByLabel[label].push(segmentWithVideoId)
    })

    if (currentVideo.value && currentVideo.value.id === videoId) {
      currentVideo.value.segments = Object.values(segmentsByLabel).flat()
      logger.debug('segments.cache-applied', { count: currentVideo.value.segments.length })
    }
  }

  function syncCurrentVideoSegments(videoId?: number): void {
    if (!currentVideo.value) {
      return
    }
    if (videoId !== undefined && currentVideo.value.id !== videoId) {
      return
    }
    const merged = Object.values(segmentsByLabel).flat()
    currentVideo.value.segments = merged
    const currentVideoId = currentVideo.value.id
    const listVideo = videoList.value.videos.find((video) => video.id === currentVideoId)
    if (listVideo) {
      listVideo.segments = merged
    }
  }

  function removeSegmentFromStore(segmentId: number, shouldSync = true): Segment | null {
    let removed: Segment | null = null

    for (const label of Object.keys(segmentsByLabel)) {
      const remaining: Segment[] = []
      for (const segment of segmentsByLabel[label]) {
        if (segment.id === segmentId) {
          removed = removed ?? { ...segment }
        } else {
          remaining.push(segment)
        }
      }
      segmentsByLabel[label] = remaining
    }

    if (shouldSync) {
      syncCurrentVideoSegments()
    }

    return removed
  }

  function upsertSegmentInStore(segment: Segment): Segment {
    const normalized = ensureLabelId(segment)
    removeSegmentFromStore(normalized.id, false)

    if (!(normalized.label in segmentsByLabel)) {
      segmentsByLabel[normalized.label] = []
    }
    segmentsByLabel[normalized.label].push(normalized)
    syncCurrentVideoSegments(normalized.videoID)
    return normalized
  }

  function replaceSegmentInStore(tempId: number, persistedSegment: Segment): Segment {
    removeSegmentFromStore(tempId, false)
    return upsertSegmentInStore(persistedSegment)
  }

  function applyPersistedSegment(backendSegment: BackendSegment): Segment {
    const persisted = backendSegmentToSegment(backendSegment)
    const existing = findSegmentById(persisted.id)
    const merged = ensureLabelId({
      ...(existing ?? {}),
      ...persisted,
      videoID: persisted.videoID ?? existing?.videoID ?? currentVideo.value?.id,
      labelID: persisted.labelID ?? existing?.labelID ?? null,
      isDirty: false,
      syncState: 'clean',
      lastSyncError: null
    })

    return upsertSegmentInStore(merged)
  }

  function restoreSegment(snapshot: Segment | null): void {
    if (!snapshot) {
      return
    }
    upsertSegmentInStore({
      ...snapshot,
      syncState: snapshot.isDirty ? 'dirty' : 'clean',
      lastSyncError: null
    })
  }

  // ===================================================================
  // SEGMENT MANAGEMENT FUNCTIONS
  // ===================================================================

  function prepareVideoForSegmentFetch(id: number): void {
    if (currentVideo.value?.id === id) {
      return
    }
    logger.debug('video.placeholder-created')
    setCurrentVideo(id)
  }

  function getSegmentsForFetch(
    id: number,
    forceRefresh: boolean,
    sourceKind: SegmentSourceKind
  ): Segment[] | null {
    return forceRefresh || sourceKind !== 'all' ? null : getCachedSegments(id)
  }

  async function fetchAllSegments(
    id: number,
    forceRefresh = false,
    options: { sourceKind?: SegmentSourceKind } = {}
  ): Promise<void> {
    logger.debug('segments.fetch-started')

    prepareVideoForSegmentFetch(id)
    const sourceKind = options.sourceKind ?? 'all'
    const cachedSegments = getSegmentsForFetch(id, forceRefresh, sourceKind)
    if (cachedSegments !== null) {
      applyCachedSegments(id, cachedSegments)
      return
    }

    const segmentsApplied = await fetchVideoSegments(id, options)
    if (!segmentsApplied || currentVideo.value?.id !== id) {
      return
    }

    logger.debug('segments.fetch-completed', { count: currentVideo.value.segments.length })
  }

  async function saveAnnotations(): Promise<void> {
    logger.debug('annotations.save-started')
    await Promise.resolve()
  }

  async function updateVideoStatus(status: VideoStatus): Promise<void> {
    if (currentVideo.value) {
      currentVideo.value.status = status
    }
    await Promise.resolve()
  }

  async function assignUserToVideo(user: string): Promise<void> {
    if (currentVideo.value) {
      currentVideo.value.assignedUser = user
    }
    await Promise.resolve()
  }

  /**
   * ✅ NEW: Fetch labels independently and with high priority
   * This ensures labels are always available before videos are loaded
   */
  // assuming: interface LabelMeta { id: number; name: string; color: string }

  async function fetchLabels(): Promise<LabelMeta[]> {
    logger.debug('labels.fetch-started')
    try {
      // 🔹 NEW: use media/labels/ instead of deprecated videos/
      const response: AxiosResponse<unknown[]> = await axiosInstance.get(
        r(endpoints.media.videoLabelsList)
      )

      const processedLabels: LabelMeta[] = response.data.map((rawLabel) => {
        const label =
          rawLabel && typeof rawLabel === 'object' ? (rawLabel as Record<string, unknown>) : {}
        const name = readStringField(label, 'name') ?? ''
        return {
          id: Number(label.id),
          name,
          color: typeof label.color === 'string' ? label.color : getColorForLabel(name)
        }
      })

      videoList.value.labels = processedLabels
      labelsLoaded = true
      logger.info('labels.fetch-completed', { count: processedLabels.length })
      return processedLabels
    } catch (error) {
      logger.error('labels.fetch-failed', error)
      labelsLoaded = false
      videoList.value.labels = []
      throw error
    }
  }

  async function fetchPredictionModels(): Promise<PredictionModelMeta[]> {
    const response: AxiosResponse<PredictionModelListResponse> = await axiosInstance.get(
      r(endpoints.media.videoPredictionModelsList)
    )
    predictionModels.value = response.data.models
    defaultHuggingfaceModelId.value =
      response.data.defaultHuggingfaceModelId || defaultHuggingfaceModelId.value
    defaultPredictionLabelsetName.value =
      response.data.defaultLabelsetName || defaultPredictionLabelsetName.value
    return predictionModels.value
  }

  async function rerunPredictionSegments(
    videoId: number,
    payload: RerunPredictionSegmentsPayload
  ): Promise<RerunPredictionSegmentsResponse> {
    const response: AxiosResponse<RerunPredictionSegmentsResponse> = await axiosInstance.post(
      r(endpoints.media.videoSegmentsRerunPredictions(videoId)),
      payload
    )
    if (response.data.status === 'completed') {
      await fetchAllSegments(videoId, true, { sourceKind: 'prediction' })
    }
    return response.data
  }

  async function fetchPredictionProcessingHistory(
    videoId: number,
    historyId: number
  ): Promise<PredictionProcessingHistoryEntry | null> {
    const response: AxiosResponse<PredictionProcessingHistoryEntry[]> = await axiosInstance.get(
      r(endpoints.media.videoProcessingHistory(videoId))
    )
    return (
      response.data.find(
        (entry) => entry.id === historyId && entry.operation === 'ai_temporal_inference'
      ) ?? null
    )
  }

  function normalizeListedVideoSegments(
    video: Record<string, unknown>,
    videoId: number
  ): Segment[] {
    const rawSegments: unknown[] = Array.isArray(video.segments) ? video.segments : []
    return rawSegments
      .filter(
        (segment): segment is BackendSegment =>
          segment !== null &&
          typeof segment === 'object' &&
          readNumberField(segment, 'id') !== undefined
      )
      .map((segment) => ensureLabelId(backendSegmentToSegment({ ...segment, videoId })))
  }

  function resolveSegmentAnnotationStatus(
    video: Record<string, unknown>,
    validated: boolean
  ): SegmentAnnotationStatus {
    const status = video.segmentAnnotationStatus ?? video.segment_annotation_status
    return (
      (status as SegmentAnnotationStatus | undefined) ?? (validated ? 'validated' : 'not_started')
    )
  }

  function normalizeVideoListEntry(video: Record<string, unknown>): VideoMeta {
    const videoId = Number(video.id)
    const segmentAnnotationsValidated = Boolean(
      readField(video, 'segmentAnnotationsValidated', 'segment_annotations_validated')
    )

    return {
      id: videoId,
      original_file_name: readRequiredStringField(video, 'originalFileName', 'original_file_name'),
      status: readVideoStatus(video, 'status'),
      assignedUser: readNullableAssignedUserField(video, 'assignedUser', 'assigned_user'),
      anonymized: Boolean(video.anonymized),
      segmentAnnotationsValidated,
      segmentAnnotationStatus: resolveSegmentAnnotationStatus(video, segmentAnnotationsValidated),
      outsideSegmentsRemoved: readBooleanField(
        video,
        'outsideSegmentsRemoved',
        'outside_segments_removed'
      ),
      postValidationRebuild:
        (readField(video, 'postValidationRebuild', 'post_validation_rebuild') as
          PostValidationRebuildSummary | null | undefined) ?? null,
      duration: numberWhenDefined(video.duration),
      fps: numberWhenDefined(video.fps),
      frameCount: normalizeVideoFrameCount(video),
      centerName: readRequiredStringField(video, 'centerName', 'center_name'),
      centerKey: readOptionalStringField(video, 'centerKey', 'center_key'),
      processorName: readRequiredStringField(video, 'processorName', 'processor_name'),
      validatedAnnotators: normalizeValidatedAnnotators(video),
      exportSegmentsByVideo: readBooleanField(
        video,
        'exportSegmentsByVideo',
        'export_segments_by_video'
      ),
      segments: normalizeListedVideoSegments(video, videoId)
    }
  }

  function normalizeVideoListResponse(responseData: unknown): unknown[] {
    if (Array.isArray(responseData)) {
      return responseData
    }
    if (!responseData || typeof responseData !== 'object') {
      return []
    }
    const responseRecord = responseData as Record<string, unknown>
    if (Array.isArray(responseRecord.results)) {
      return responseRecord.results
    }
    return Array.isArray(responseRecord.videos) ? responseRecord.videos : []
  }

  function isVideoListRecord(video: unknown): video is Record<string, unknown> {
    return Boolean(video) && typeof video === 'object' && !Array.isArray(video)
  }

  function getLabelsRequest(refreshLabels: boolean): Promise<LabelMeta[]> {
    return refreshLabels || !labelsLoaded ? fetchLabels() : Promise.resolve(videoList.value.labels)
  }

  async function fetchAllVideos(options: { refreshLabels?: boolean } = {}): Promise<VideoList> {
    logger.debug('videos.fetch-started')
    try {
      const labelsRequest = getLabelsRequest(Boolean(options.refreshLabels))
      const videosRequest: Promise<AxiosResponse<unknown>> = axiosInstance.get(
        r(endpoints.media.videos)
      )
      const [, response] = await Promise.all([labelsRequest, videosRequest])
      logger.debug('videos.response-received')
      const processedVideos = normalizeVideoListResponse(response.data)
        .filter(isVideoListRecord)
        .map(normalizeVideoListEntry)

      // Labels already fetched and stored above
      const processedLabels: LabelMeta[] = videoList.value.labels

      videoList.value = {
        videos: processedVideos,
        labels: processedLabels
      }

      logger.info('videos.fetch-completed', { count: processedVideos.length })
      return videoList.value
    } catch (error) {
      logger.error('videos.fetch-failed', error)
      videoList.value = { videos: [], labels: videoList.value.labels }
      throw error
    }
  }

  // ===================================================================
  // VIDEO ACTIONS
  // ===================================================================

  function clearVideo(): void {
    cancelDraft()
    resetFrameNavigationCache()
    currentVideo.value = null
    videoMeta.value = null
    resolvedVideoFps.value = null
    activeVideoId.value = null
  }

  function setVideo(video: VideoAnnotation): void {
    cancelDraftOnVideoChange(video.id)
    resetFrameNavigationCache()
    currentVideo.value = video
  }

  function setCurrentVideo(videoId: number): VideoAnnotation | null {
    cancelDraftOnVideoChange(videoId)
    resetFrameNavigationCache()
    activeVideoId.value = videoId
    resolvedVideoFps.value = null
    const video = videoList.value.videos.find((v) => v.id === videoId) || null
    if (video) {
      const cachedSegments = getCachedSegments(videoId)
      currentVideo.value = {
        id: video.id,
        isAnnotated: true,
        errorMessage: '',
        segments: cachedSegments ?? [],
        videoUrl: buildVideoStreamUrl(video.id, 'processed'),
        status: video.status,
        assignedUser: video.assignedUser,
        duration: video.duration,
        fps: undefined,
        frameCount: video.frameCount
      }
      if (cachedSegments !== null) {
        applyCachedSegments(videoId, cachedSegments)
      } else {
        clearSegments()
      }
    } else {
      currentVideo.value = {
        id: videoId,
        isAnnotated: false,
        errorMessage: '',
        segments: [],
        videoUrl: '',
        status: 'available',
        assignedUser: null
      }
      clearSegments()
    }
    return currentVideo.value
  }

  function applyResolvedVideoFps(videoId: number, framesPerSecond: number): void {
    resolvedVideoFps.value = framesPerSecond
    if (videoMeta.value?.id === videoId) {
      videoMeta.value.fps = framesPerSecond
    }
    if (currentVideo.value?.id === videoId) {
      currentVideo.value.fps = framesPerSecond
    }
    const listVideo = videoList.value.videos.find((video) => video.id === videoId)
    if (listVideo) {
      listVideo.fps = framesPerSecond
    }
  }

  async function fetchVideoFps(videoId?: number): Promise<number | null> {
    const resolvedVideoId = videoId || currentVideo.value?.id
    if (!resolvedVideoId) {
      logger.warn('fps.video-missing')
      return null
    }

    try {
      const response: AxiosResponse<VideoFpsResponse> = await axiosInstance.get(
        r(endpoints.media.videoFps(resolvedVideoId)),
        { headers: { Accept: 'application/json' } }
      )
      const framesPerSecond = normalizeFps(response.data.fps)
      if (framesPerSecond === null) {
        logger.warn('fps.payload-invalid')
        return null
      }
      if (activeVideoId.value !== resolvedVideoId || currentVideo.value?.id !== resolvedVideoId) {
        return framesPerSecond
      }

      applyResolvedVideoFps(resolvedVideoId, framesPerSecond)
      return framesPerSecond
    } catch {
      logger.warn('fps.fetch-unavailable')
      return null
    }
  }

  async function resolveAdjacentFrameTimestamp(
    videoId: number,
    timestamp: number,
    direction: FrameStepDirection
  ): Promise<number | null> {
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new RangeError('Frame navigation timestamp must be finite and non-negative')
    }
    const cachedFrame = resolveCachedAdjacentFrame(videoId, timestamp, direction)
    if (cachedFrame) {
      return cachedFrame.timestamp
    }
    const response: AxiosResponse<unknown> = await axiosInstance.get(
      r(endpoints.media.videoFrameNeighborhood(videoId)),
      {
        params: { timestamp, radius: FRAME_NEIGHBORHOOD_RADIUS },
        suppressErrorToast: true
      } as AxiosRequestConfig & { suppressErrorToast: true }
    )
    const neighborhood = parseVideoFrameNeighborhood(response.data)
    if (neighborhood.videoId !== videoId) {
      throw new TypeError('Frame neighborhood belongs to a different video')
    }
    frameNavigationCache = {
      videoId: neighborhood.videoId,
      timelineVersion: neighborhood.timelineVersion,
      timestampMapping: neighborhood.timestampMapping,
      frames: neighborhood.frames,
      activeFrameNumber: neighborhood.current.frameNumber,
      activeTimestamp: neighborhood.current.timestamp
    }
    const adjacentFrame = getAdjacentFrameBoundary(neighborhood, direction)
    if (adjacentFrame) {
      frameNavigationCache.activeFrameNumber = adjacentFrame.frameNumber
      frameNavigationCache.activeTimestamp = adjacentFrame.timestamp
    }
    return adjacentFrame?.timestamp ?? null
  }

  function applyPositiveMetadataNumber(
    video: VideoAnnotation,
    field: 'duration' | 'frameCount',
    value: number | undefined
  ): void {
    if (value !== undefined && value > 0) {
      video[field] = value
    }
  }

  function applyMetadataFps(video: VideoAnnotation, metadata: VideoMeta): void {
    if (resolvedVideoFps.value !== null) {
      metadata.fps = resolvedVideoFps.value
      return
    }
    if (metadata.fps !== undefined && metadata.fps > 0) {
      video.fps = metadata.fps
    }
  }

  function applyVideoMetadata(id: number, normalizedMeta: VideoMeta): boolean {
    const currentVideoRecord = currentVideo.value
    if (!currentVideoRecord || currentVideoRecord.id !== id) {
      return false
    }
    if (activeVideoId.value !== id) {
      activeVideoId.value = id
    }

    videoMeta.value = normalizedMeta
    currentVideoRecord.status = normalizedMeta.status
    currentVideoRecord.assignedUser = normalizedMeta.assignedUser
    applyMetadataFps(currentVideoRecord, normalizedMeta)
    applyPositiveMetadataNumber(currentVideoRecord, 'duration', normalizedMeta.duration)
    applyPositiveMetadataNumber(currentVideoRecord, 'frameCount', normalizedMeta.frameCount)
    return true
  }

  async function fetchVideoMetadata(videoId?: number): Promise<void> {
    try {
      const resolvedVideoId = videoId || currentVideo.value?.id
      if (!resolvedVideoId) {
        logger.warn('metadata.video-missing')
        return
      }

      const response: AxiosResponse<unknown> = await axiosInstance.get(
        r(endpoints.media.videoMetadata(resolvedVideoId)),
        {
          headers: { Accept: 'application/json' }
        }
      )

      const normalizedMeta = normalizeVideoMetadataResponse(
        requireObject(response.data, 'Video metadata'),
        resolvedVideoId
      )
      if (!applyVideoMetadata(resolvedVideoId, normalizedMeta)) {
        return
      }

      logger.info('metadata.fetch-completed')
    } catch (error) {
      logger.error('metadata.fetch-failed', error)
    }
  }

  async function fetchVideoUrl(videoId?: number): Promise<void> {
    const resolvedVideoId = videoId || currentVideo.value?.id
    if (!resolvedVideoId) {
      return
    }
    videoUrl.value = buildVideoStreamUrl(resolvedVideoId, 'processed')
    await Promise.resolve()
  }

  const videoStreamUrl = computed(() =>
    currentVideo.value ? buildVideoStreamUrl(currentVideo.value.id, 'processed') : ''
  )

  function hasRawVideoFileFn() {
    if (!currentVideo.value?.id) {
      hasRawVideoFile.value = null
      return
    }

    const videoId = currentVideo.value.id
    axiosInstance
      .get<unknown>(r(endpoints.anonymization.hasRaw(videoId)))
      .then((response) => {
        const responseData = requireObject(response.data, 'Raw video availability')
        const hasRawFile = readField(responseData, 'hasRawFile', 'has_raw_file')
        if (typeof hasRawFile !== 'boolean') {
          throw new TypeError('Raw video availability response contains an invalid value')
        }
        hasRawVideoFile.value = hasRawFile
        logger.debug('raw-video.check-completed', {
          outcome: hasRawVideoFile.value ? 'available' : 'unavailable'
        })
      })
      .catch((error: unknown) => {
        logger.error('raw-video.check-failed', error)
        hasRawVideoFile.value = null
      })
  }

  async function fetchSegmentsByLabel(id: number, label = 'outside'): Promise<void> {
    try {
      const response: AxiosResponse<SegmentListResponse> = await axiosInstance.get(
        r(endpoints.media.videoSegments(id)),
        {
          headers: { Accept: 'application/json' },
          params: { label } // backend expects ?label=<label_name>
        }
      )

      const rawSegments = normalizeSegmentList(response.data)

      const segmentsForLabel: Segment[] = rawSegments.map((backendSeg) =>
        ensureLabelId(backendSegmentToSegment(backendSeg))
      )

      segmentsByLabel[label] = segmentsForLabel

      if (currentVideo.value) {
        currentVideo.value.segments = Object.values(segmentsByLabel).flat()
      }
    } catch (error) {
      logger.error('segments.label-load-failed', error)
      errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`
    }
  }

  function replaceSegmentsFromBackend(rawSegments: BackendSegment[], videoId: number): void {
    clearSegments()
    logger.debug('segments.normalize-started', { count: rawSegments.length })
    rawSegments.forEach((backendSegment) => {
      const segment = ensureLabelId(backendSegmentToSegment(backendSegment))
      segmentsByLabel[segment.label] ??= []
      if (segment.endTime - segment.startTime < 0.1) {
        logger.warn('segment.duration-short')
      }
      segmentsByLabel[segment.label].push(segment)
    })
    logger.debug('segments.normalize-completed', { count: rawSegments.length })
    syncCurrentVideoSegments(videoId)
  }

  function beginSegmentFetch(): AbortController {
    fetchSegmentsController?.abort()
    const controller = new AbortController()
    fetchSegmentsController = controller
    return controller
  }

  function handleSegmentFetchError(error: unknown, token: number): false {
    const axiosError = error as AxiosError
    if (axiosError.code === 'ERR_CANCELED' || axiosError.name === 'CanceledError') {
      return false
    }
    if (token === _fetchToken.value) {
      logger.error('segments.load-failed', error)
      errorMessage.value = 'Error loading video segments. Please try again later.'
    }
    return false
  }

  async function fetchVideoSegments(
    videoId: number,
    options: { sourceKind?: SegmentSourceKind } = {}
  ): Promise<boolean> {
    const token = ++_fetchToken.value
    const controller = beginSegmentFetch()
    try {
      const sourceKind = options.sourceKind ?? 'all'
      const response: AxiosResponse<SegmentListResponse> = await axiosInstance.get(
        r(endpoints.media.videoSegments(videoId)),
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          params: sourceKind === 'all' ? undefined : { source_kind: sourceKind }
        }
      )

      if (token !== _fetchToken.value) {
        return false
      }

      replaceSegmentsFromBackend(normalizeSegmentList(response.data), videoId)
      return true
    } catch (error) {
      return handleSegmentFetchError(error, token)
    } finally {
      if (fetchSegmentsController === controller) {
        fetchSegmentsController = null
      }
    }
  }

  async function bulkMutateSegments(
    videoId: number,
    payload: SegmentBulkMutationPayload
  ): Promise<SegmentBulkMutationResponse> {
    const response: AxiosResponse<SegmentBulkMutationResponse> = await axiosInstance.post(
      r(endpoints.media.videoSegmentsBulkMutation(videoId)),
      withSelectedAiDataset(payload)
    )
    return response.data
  }

  function isCurrentVideo(videoId: number): boolean {
    return currentVideo.value?.id === videoId
  }

  function finishSegmentCreation(videoId: number, tempId: number, persisted: Segment | null): void {
    if (isCurrentVideo(videoId)) {
      if (persisted) replaceSegmentInStore(tempId, persisted)
      else removeSegmentFromStore(tempId)
      return
    }
    const cachedVideo = videoList.value.videos.find((video) => video.id === videoId)
    if (cachedVideo?.segments) {
      cachedVideo.segments = cachedVideo.segments.filter((segment) => segment.id !== tempId)
      if (persisted) cachedVideo.segments.push(persisted)
    }
  }

  function segmentCreationError(error: unknown, tempSegment: Segment | null): string {
    const responseData: unknown = error instanceof AxiosError ? error.response?.data : undefined
    const detail = getBulkOperationErrorDetail(responseData, 'creates', tempSegment?.id ?? 0, 0)
    return (
      formatValidationErrorDetail(detail) ||
      (error instanceof Error ? error.message : 'Error creating segment. Please try again.')
    )
  }

  async function createSegment(
    videoId: number,
    label: string,
    startTime: number,
    endTime: number,
    ownsFeedback: () => boolean = () => currentVideo.value?.id === videoId
  ): Promise<Segment | null> {
    let tempSegment: Segment | null = null
    if (ownsFeedback()) errorMessage.value = ''
    try {
      // Get label ID from existing labels in store
      const labelMeta = videoList.value.labels.find((l) => l.name === label)
      if (!labelMeta) {
        logger.warn('label.lookup-missing')
        errorMessage.value = `Label ${label} nicht gefunden`
        return null
      }
      const labelId = labelMeta.id

      const timestampRange = requireSegmentTimestampRange(startTime, endTime, duration.value)
      tempSegment = {
        id: nextDraftId--,
        label,
        startTime: timestampRange.startTime,
        endTime: timestampRange.endTime,
        avgConfidence: 1,
        videoID: videoId,
        labelID: labelId,
        exportSegment: false,
        syncState: 'pending_create',
        lastSyncError: null
      }

      upsertSegmentInStore(tempSegment)
      const tempSegmentId = tempSegment.id

      const response = await bulkMutateSegments(videoId, {
        defer_annotation_sync: true,
        creates: [
          {
            client_id: tempSegmentId,
            label_id: labelId,
            ...buildSegmentTimestampPayload(
              timestampRange.startTime,
              timestampRange.endTime,
              duration.value
            ),
            export_segment: false
          }
        ]
      })

      const created =
        response.created.find((item) => (item.clientId ?? item.client_id) === tempSegmentId) ??
        response.created.at(0)

      if (!created) {
        throw new Error('Backend returned no segment for created timeline item')
      }

      const persisted = ensureLabelId({
        ...backendSegmentToSegment(created.segment),
        label,
        videoID: videoId,
        labelID: labelId,
        isDirty: false,
        syncState: 'clean',
        lastSyncError: null
      })

      finishSegmentCreation(videoId, tempSegmentId, persisted)
      logger.info('segment.create-completed')
      return persisted
    } catch (error) {
      logger.error('segment.create-failed', error)
      if (ownsFeedback()) errorMessage.value = segmentCreationError(error, tempSegment)
      if (tempSegment) finishSegmentCreation(videoId, tempSegment.id, null)
      return null
    }
  }

  function createSegmentUpdatePayload(
    startTime: number,
    endTime: number,
    extra: SegmentUpdatePayload = {}
  ) {
    const {
      startTime: _startTime,
      endTime: _endTime,
      start_time: _start_time,
      end_time: _end_time,
      startFrameNumber: _startFrameNumber,
      endFrameNumber: _endFrameNumber,
      start_frame_number: _start_frame_number,
      end_frame_number: _end_frame_number,
      exportSegment,
      export_segment,
      ...rest
    } = extra

    return {
      ...rest,
      export_segment: export_segment ?? exportSegment,
      ...buildSegmentTimestampPayload(startTime, endTime, duration.value)
    }
  }

  function firstDefinedNumber(...values: Array<number | null | undefined>): number {
    return values.find((value): value is number => value !== null && value !== undefined) ?? 0
  }

  function buildSegmentUpdatePayload(
    segmentId: number,
    updates: SegmentUpdatePayload
  ): SegmentUpdatePayload | null {
    const currentSegment = findSegmentById(segmentId)
    if (!currentSegment && updates.startTime == null && updates.start_time == null) {
      logger.warn('segment-update.timestamps-missing')
      return null
    }

    return createSegmentUpdatePayload(
      firstDefinedNumber(updates.startTime, updates.start_time, currentSegment?.startTime),
      firstDefinedNumber(updates.endTime, updates.end_time, currentSegment?.endTime),
      updates
    )
  }

  function shouldRetrySegmentUpdate(error: AxiosError): boolean {
    const status = error.response?.status
    if (!status) {
      return true
    }
    if (status === 408 || status === 429) {
      return true
    }
    return status >= 500
  }

  function getSegmentUpdateRetryDelay(attempt: number): number {
    const base = SEGMENT_UPDATE_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1))
    const jitter = Math.floor(Math.random() * 250)
    return Math.min(base + jitter, SEGMENT_UPDATE_RETRY_MAX_MS)
  }

  function _enqueueSegmentUpdate(job: SegmentUpdateJob): void {
    const existing = segmentUpdateQueue.find(
      (item) => item.videoId === job.videoId && item.segmentId === job.segmentId
    )
    if (existing) {
      existing.payload = { ...existing.payload, ...job.payload }
      existing.attempts = Math.min(existing.attempts, job.attempts)
    } else {
      segmentUpdateQueue.push(job)
    }

    if (!isProcessingSegmentQueue) {
      if (segmentQueueTimer) {
        clearTimeout(segmentQueueTimer)
        segmentQueueTimer = null
      }
      void processSegmentUpdateQueue()
    }
  }

  async function updateSegmentWithPayload(
    videoId: number,
    segmentId: number,
    payload: SegmentUpdatePayload,
    options: { updateLocal?: boolean } = {}
  ): Promise<BackendSegment> {
    const segmentUrl = r(endpoints.media.videoSegmentDetail(videoId, segmentId))
    const response: AxiosResponse<BackendSegment> = await axiosInstance.patch(
      segmentUrl,
      withSelectedAiDataset(payload)
    )

    if (options.updateLocal !== false && currentVideo.value?.id === videoId) {
      const updatedSegment = backendSegmentToSegment(response.data)
      updateSegmentInMemory(segmentId, updatedSegment)
    }

    return response.data
  }

  async function processSegmentUpdateQueue(): Promise<void> {
    if (isProcessingSegmentQueue || segmentUpdateQueue.length === 0) {
      return
    }
    isProcessingSegmentQueue = true

    const segmentUpdate = segmentUpdateQueue.shift() as SegmentUpdateJob
    let scheduledRetry = false

    try {
      await updateSegmentWithPayload(
        segmentUpdate.videoId,
        segmentUpdate.segmentId,
        segmentUpdate.payload
      )
      logger.debug('segment-update.queue-completed')
    } catch (error) {
      const axiosError = error as AxiosError
      segmentUpdate.attempts += 1

      if (
        segmentUpdate.attempts <= MAX_SEGMENT_UPDATE_RETRIES &&
        shouldRetrySegmentUpdate(axiosError)
      ) {
        segmentUpdateQueue.push(segmentUpdate)
        const delay = getSegmentUpdateRetryDelay(segmentUpdate.attempts)
        scheduledRetry = true
        if (segmentQueueTimer) {
          clearTimeout(segmentQueueTimer)
        }
        segmentQueueTimer = setTimeout(() => {
          segmentQueueTimer = null
          void processSegmentUpdateQueue()
        }, delay)
      } else {
        logger.error('segment-update.queue-failed', error, { retryCount: segmentUpdate.attempts })
        getToastStore().error({
          text: 'Segment konnte nicht gespeichert werden. Bitte erneut speichern.'
        })
      }
    } finally {
      isProcessingSegmentQueue = false
      if (!scheduledRetry && segmentUpdateQueue.length > 0 && !segmentQueueTimer) {
        void processSegmentUpdateQueue()
      }
    }
  }

  function applySegmentUpdateResponse(
    segmentId: number,
    updated: BackendSegment | undefined
  ): void {
    if (updated) {
      applyPersistedSegment(updated)
      return
    }
    updateSegmentInMemory(
      segmentId,
      {
        isDirty: false,
        syncState: 'clean',
        lastSyncError: null
      },
      false
    )
  }

  function handleSegmentUpdateError(segmentId: number, error: unknown, silent: boolean): false {
    const axiosError = error as AxiosError
    const detail = getBulkOperationErrorDetail(axiosError.response?.data, 'updates', segmentId, 0)
    const errorText = formatValidationErrorDetail(detail) || axiosError.message
    logger.error('segment-update.failed', error)
    errorMessage.value = 'Error updating segment. Please try again.'
    updateSegmentInMemory(
      segmentId,
      {
        syncState: 'error',
        lastSyncError: errorText,
        isDirty: true
      },
      false
    )
    if (!silent) {
      getToastStore().error({ text: 'Fehler beim Aktualisieren des Segments' })
    }
    return false
  }

  async function updateSegmentAPI(
    segmentId: number,
    updates: SegmentUpdatePayload,
    options: { silent?: boolean; videoId?: number } = {}
  ): Promise<boolean> {
    try {
      const videoId = options.videoId ?? currentVideo.value?.id
      if (!videoId) {
        logger.warn('segment-update.video-missing')
        return false
      }

      const updatePayload = buildSegmentUpdatePayload(segmentId, updates)
      if (!updatePayload) {
        return false
      }

      updateSegmentInMemory(
        segmentId,
        {
          syncState: 'pending_update',
          lastSyncError: null
        },
        false
      )

      const response = await bulkMutateSegments(videoId, {
        defer_annotation_sync: true,
        updates: [
          {
            id: segmentId,
            ...updatePayload
          }
        ]
      })

      applySegmentUpdateResponse(segmentId, response.updated.at(0))

      logger.debug('segment-update.completed')
      return true
    } catch (error) {
      return handleSegmentUpdateError(segmentId, error, Boolean(options.silent))
    }
  }

  async function setSegmentExportFlag(segmentId: number, exportSegment: boolean): Promise<boolean> {
    return await updateSegmentAPI(segmentId, { export_segment: exportSegment })
  }

  async function setVideoExportFlag(
    videoId: number,
    exportSegmentsByVideo: boolean
  ): Promise<boolean> {
    try {
      const response: AxiosResponse<unknown> = await axiosInstance.patch(
        r(endpoints.media.videoDetail(videoId)),
        { export_segments_by_video: exportSegmentsByVideo }
      )
      const responseData = requireObject(response.data, 'Video export flag update')
      const updatedValue = readField(
        responseData,
        'exportSegmentsByVideo',
        'export_segments_by_video'
      )
      if (typeof updatedValue !== 'boolean') {
        throw new TypeError('Video export flag update response contains an invalid value')
      }

      const listVideo = videoList.value.videos.find((v) => v.id === videoId)
      if (listVideo) {
        listVideo.exportSegmentsByVideo = updatedValue
      }
      if (videoMeta.value?.id === videoId) {
        videoMeta.value.exportSegmentsByVideo = updatedValue
      }
      return true
    } catch (error) {
      logger.error('video-export-flag.update-failed', error)
      return false
    }
  }

  async function deleteSegment(segmentId: number): Promise<boolean> {
    let removedSnapshot: Segment | null = null
    try {
      const videoId = currentVideo.value?.id
      if (!videoId) {
        logger.warn('segment-delete.video-missing')
        return false
      }

      if (segmentId < 0) {
        removeSegmentFromStore(segmentId)
        return true
      }

      updateSegmentInMemory(
        segmentId,
        {
          syncState: 'pending_delete',
          lastSyncError: null
        },
        false
      )
      removedSnapshot = removeSegmentFromStore(segmentId)

      await bulkMutateSegments(videoId, {
        defer_annotation_sync: true,
        deletes: [segmentId]
      })

      syncCurrentVideoSegments(videoId)
      return true
    } catch (error) {
      const axiosError = error as AxiosError
      logger.error('segment-delete.failed', error)
      errorMessage.value = 'Error deleting segment. Please try again.'
      if (removedSnapshot) {
        restoreSegment({
          ...removedSnapshot,
          syncState: 'error',
          lastSyncError: axiosError.message
        })
      }
      return false
    }
  }

  function removeSegment(segmentId: number) {
    removeSegmentFromStore(segmentId)
  }

  // ===================================================================
  // DRAFT SEGMENT MANAGEMENT
  // ===================================================================

  function startDraft(label: string, startTime: number): void {
    if (!currentVideo.value) return
    errorMessage.value = ''
    logger.debug('draft.started')
    draftSegment.value = {
      id: nextDraftId--, // -1, -2, ...
      videoId: currentVideo.value.id,
      label,
      startTime,
      endTime: null
    }
    logger.debug('draft.created')
  }

  function updateDraftEnd(endTime: number): void {
    if (isDraftSaving.value) return
    if (!draftSegment.value) {
      logger.warn('draft.update-missing')
      return
    }

    draftSegment.value.endTime = endTime

    logger.debug('draft.end-updated')
  }

  function prepareDraftCommit(): {
    draft: DraftSegment & { endTime: number }
    videoId: number
  } | null {
    const draft = draftSegment.value
    if (!draft) {
      logger.warn('draft.commit-missing')
      return null
    }
    if (!currentVideo.value && activeVideoId.value !== null) {
      logger.warn('draft.video-fallback')
      setCurrentVideo(activeVideoId.value)
    }
    if (!currentVideo.value) {
      logger.warn('draft.video-missing')
      return null
    }
    if (draft.endTime === null) {
      logger.warn('draft.end-missing')
      return null
    }
    if (!currentVideo.value.id || currentVideo.value.id !== draft.videoId) {
      logger.warn('draft.video-id-missing')
      return null
    }
    return { draft: { ...draft, endTime: draft.endTime }, videoId: currentVideo.value.id }
  }

  function handleDraftCommitError(error: unknown): null {
    logger.error('draft.commit-failed', error)
    const responseData: unknown = error instanceof AxiosError ? error.response?.data : undefined
    const responseDetail =
      responseData !== null && typeof responseData === 'object'
        ? readStringField(responseData, 'detail')
        : null
    errorMessage.value =
      responseDetail ??
      (error instanceof AxiosError ? error.message : 'Unbekannter Fehler beim Speichern')
    return null
  }

  function commitDraft(): Promise<Segment | null> {
    logger.debug('draft.commit-started')
    logger.debug('draft.video-state-checked')

    const preparedDraft = prepareDraftCommit()
    if (!preparedDraft) {
      return Promise.resolve(null)
    }
    const { draft, videoId } = preparedDraft
    const pending = draftCommits.get(draft.id)
    if (pending) return pending
    const ownsDraft = (): boolean =>
      currentVideo.value?.id === videoId && draftSegment.value?.id === draft.id
    pendingDraftIds.add(draft.id)
    const operation = createSegment(videoId, draft.label, draft.startTime, draft.endTime, ownsDraft)
      .then((segment) => {
        if (segment && ownsDraft()) draftSegment.value = null
        return segment
      })
      .catch((error: unknown) => (ownsDraft() ? handleDraftCommitError(error) : null))
      .finally(() => {
        pendingDraftIds.delete(draft.id)
        draftCommits.delete(draft.id)
      })
    draftCommits.set(draft.id, operation)
    return operation
  }

  function cancelDraft(): void {
    if (!draftSegment.value) {
      return
    }

    logger.debug('draft.cancelled')
    draftSegment.value = null
  }

  function cancelDraftOnVideoChange(videoId: number): void {
    if (!isCurrentVideo(videoId)) cancelDraft()
  }

  async function createFiveSecondSegment(
    clickTime: number,
    label: string
  ): Promise<Segment | null> {
    const startTime = clickTime
    const endTime = Math.min(
      clickTime + FIVE_SECOND_SEGMENT_DURATION,
      duration.value || clickTime + FIVE_SECOND_SEGMENT_DURATION
    )

    startDraft(label, startTime)
    updateDraftEnd(endTime)
    return await commitDraft()
  }

  function countUnsavedSegments(): number {
    return allSegments.value.filter(
      (s) => s.isDirty || s.isDraft || s.syncState === 'pending_create'
    ).length
  }

  function matchesSegmentSnapshot(current: Segment | null, snapshot: Segment): boolean {
    return (
      current !== null &&
      current.startTime === snapshot.startTime &&
      current.endTime === snapshot.endTime &&
      current.labelID === snapshot.labelID &&
      current.label === snapshot.label &&
      current.exportSegment === snapshot.exportSegment
    )
  }

  function applySegmentSaveResponse(
    videoId: number,
    dirtySegments: Segment[],
    response: SegmentBulkMutationResponse
  ): SegmentSaveResult {
    if (!isCurrentVideo(videoId)) {
      return { status: 'incomplete', savedCount: 0, remainingCount: dirtySegments.length }
    }
    let savedCount = 0
    for (const snapshot of dirtySegments) {
      const acknowledged = response.updated.find((segment) => segment.id === snapshot.id)
      const current = findSegmentById(snapshot.id)
      if (acknowledged && matchesSegmentSnapshot(current, snapshot)) {
        applyPersistedSegment(acknowledged)
        savedCount += 1
      } else if (current) {
        updateSegmentInMemory(snapshot.id, { isDirty: true, syncState: 'dirty' }, false)
      }
    }
    syncCurrentVideoSegments(videoId)
    const remaining = countUnsavedSegments()
    return {
      status: remaining === 0 ? 'saved' : 'incomplete',
      savedCount,
      remainingCount: remaining
    }
  }

  function showSegmentSaveError(videoId: number, dirtySegments: Segment[], error: unknown): void {
    const axiosError = error as AxiosError
    let validationErrorCount = 0
    dirtySegments.forEach((segment, segmentIndex) => {
      const detail = getBulkOperationErrorDetail(
        axiosError.response?.data,
        'updates',
        segment.id,
        segmentIndex
      )
      const detailText = formatValidationErrorDetail(detail)
      if (detailText) {
        validationErrorCount += 1
      }
      updateSegmentInMemory(
        segment.id,
        {
          isDirty: true,
          syncState: detailText ? 'error' : 'dirty',
          lastSyncError: detailText || null
        },
        false
      )
    })
    syncCurrentVideoSegments(videoId)
    if (validationErrorCount > 0) {
      getToastStore().error({
        text:
          validationErrorCount === 1
            ? 'Speichern blockiert: 1 Segment enthält Fehler.'
            : `Speichern blockiert: ${String(validationErrorCount)} Segmente enthalten Fehler.`
      })
    } else {
      dirtySegments.forEach((segment) => {
        updateSegmentInMemory(
          segment.id,
          {
            isDirty: true,
            syncState: 'error',
            lastSyncError: axiosError.message
          },
          false
        )
      })
      getToastStore().error({ text: 'Systemfehler beim Speichern' })
    }
  }

  async function persistDirtySegments(): Promise<SegmentSaveResult> {
    const remainingCount = countUnsavedSegments()
    if (isSavingSegments.value || isDraftSaving.value) {
      return { status: 'pending', savedCount: 0, remainingCount }
    }
    if (draftSegment.value) {
      return { status: 'incomplete', savedCount: 0, remainingCount }
    }
    if (!currentVideo.value?.id) {
      return { status: 'unchanged', savedCount: 0, remainingCount }
    }

    // Filter for segments that have been moved/resized locally
    const dirtySegments = allSegments.value
      .filter((s) => s.isDirty && !s.isDraft && s.id > 0)
      .map((segment) => ({ ...segment }))
    if (dirtySegments.length === 0) {
      logger.debug('segments.persist-skipped', { reasonCode: 'no-dirty-segments' })
      return { status: 'unchanged', savedCount: 0, remainingCount }
    }

    logger.debug('segments.persist-started', { count: dirtySegments.length })

    const videoId = currentVideo.value.id
    isSavingSegments.value = true
    try {
      const updates = dirtySegments.map((segment) => {
        const extra: SegmentUpdatePayload = {
          export_segment: segment.exportSegment
        }
        if (segment.labelID != null) {
          extra.label_id = segment.labelID
        }
        const payload = createSegmentUpdatePayload(segment.startTime, segment.endTime, extra)
        return {
          id: segment.id,
          ...payload
        }
      })

      dirtySegments.forEach((segment) => {
        updateSegmentInMemory(
          segment.id,
          {
            syncState: 'pending_update',
            lastSyncError: null
          },
          false
        )
      })

      const response = await bulkMutateSegments(videoId, {
        defer_annotation_sync: true,
        updates
      })

      return applySegmentSaveResponse(videoId, dirtySegments, response)
    } catch (error) {
      logger.error('segments.persist-failed', error)
      if (!isCurrentVideo(videoId)) throw error
      showSegmentSaveError(videoId, dirtySegments, error)
      throw error
    } finally {
      isSavingSegments.value = false
    }
  }

  async function loadVideo(
    videoId: number,
    options: { sourceKind?: SegmentSourceKind; knownFps?: number } = {}
  ): Promise<void> {
    cancelDraftOnVideoChange(videoId)
    resetFrameNavigationCache()
    logger.debug('video.load-started')
    activeVideoId.value = videoId

    // 1. Check Anonymization Status (Client-side pre-check)
    const anonStore = useAnonymizationStore()

    if (anonStore.overview.length === 0) {
      logger.debug('anonymization-overview.fetch-started')
      try {
        await anonStore.fetchOverview()
      } catch {
        logger.warn('anonymization-overview.fetch-failed')
      }
    }

    const videoItem = anonStore.overview.find(
      (f: FileItem) => f.id === videoId && f.mediaType === 'video'
    )

    if (
      videoItem &&
      videoItem.anonymizationStatus !== 'done_processing_anonymization' &&
      videoItem.anonymizationStatus !== 'validated'
    ) {
      throw new Error(
        `Video ${String(videoId)} darf nicht annotiert werden, ` +
          `solange die Anonymisierung nicht abgeschlossen ist. (Status: ${videoItem.anonymizationStatus})`
      )
    }

    try {
      const knownFps = normalizeFps(options.knownFps)
      resolvedVideoFps.value = knownFps
      // 2. Initialize Empty State
      currentVideo.value = {
        id: videoId,
        isAnnotated: false,
        errorMessage: '',
        segments: [],
        videoUrl: '',
        status: 'available',
        assignedUser: null,
        duration: 0,
        fps: knownFps ?? undefined
      }

      // 3. Parallel Fetching (Optimization)
      // We can fetch Metadata, URL, and Segments simultaneously to speed up loading
      await Promise.all([
        fetchVideoMetadata(videoId), // Gets Duration, Status, FrameCount
        knownFps === null ? fetchVideoFps(videoId) : Promise.resolve(knownFps),
        fetchVideoUrl(videoId), // Builds the authenticated video URL
        fetchAllSegments(videoId, false, { sourceKind: options.sourceKind }) // Gets Segments
      ])

      logger.info('video.load-completed', { count: currentVideo.value.segments.length })
    } catch (error) {
      logger.error('video.load-failed', error)
      errorMessage.value = 'Error loading video. Please try again.'
    }
  }

  const timelineSegments = computed(() =>
    allSegments.value.map((s) => ({
      id: s.id,
      label: s.label,
      label_display: getTranslationForLabel(s.label),
      name: getTranslationForLabel(s.label),
      startTime: s.startTime,
      endTime: s.endTime,
      avgConfidence: s.avgConfidence,
      video_id: s.videoID,
      label_id: s.labelID
    }))
  )

  // ===================================================================
  // PURE FRONTEND MUTATOR FOR LIVE PREVIEWS
  // ===================================================================

  /**
   * Pure front-end mutator for ultra-smooth previews
   * Updates segment locally without API call for instant UI feedback
   */
  function patchSegmentLocally(id: number, updates: Partial<Segment>): void {
    updateSegmentInMemory(id, updates, true)
  }

  function patchDraftSegment(id: number, updates: Partial<DraftSegment>): void {
    if (draftSegment.value && draftSegment.value.id === id && !pendingDraftIds.has(id)) {
      Object.assign(draftSegment.value, updates)
    }
  }

  // ===================================================================
  // RETURN STORE INTERFACE
  // ===================================================================

  return {
    // State (readonly)
    currentVideo: readonly(currentVideo),
    errorMessage: readonly(errorMessage),
    videoUrl: readonly(videoUrl),
    segmentsByLabel,
    videoList: readonly(videoList),
    videoMeta: readonly(videoMeta),

    // Computed properties
    videos,
    allSegments,
    draftSegment,
    isDraftSaving,
    isSavingSegments: readonly(isSavingSegments),
    activeSegment,
    duration,
    effectiveFps,
    hasVideo,
    segments,
    labels,
    predictionModels: readonly(predictionModels),
    defaultHuggingfaceModelId: readonly(defaultHuggingfaceModelId),
    defaultPredictionLabelsetName: readonly(defaultPredictionLabelsetName),
    videoStreamUrl,
    timelineSegments,
    hasRawVideoFile: readonly(hasRawVideoFile),
    segmentAiDatasetId: readonly(segmentAiDatasetId),

    // Actions
    buildVideoStreamUrl,
    setCurrentVideo,
    clearVideo,
    deleteVideo,
    setVideo,
    loadVideo, // Added missing loadVideo export
    fetchVideoMetadata,
    fetchVideoFps,
    resolveAdjacentFrameTimestamp,
    fetchVideoUrl,
    fetchAllSegments,
    fetchAllVideos,
    fetchLabels, // Priority label fetching
    fetchPredictionModels,
    rerunPredictionSegments,
    fetchPredictionProcessingHistory,
    fetchVideoSegments,
    fetchSegmentsByLabel,
    createSegment,
    updateSegmentAPI,
    setSegmentExportFlag,
    setVideoExportFlag,
    deleteSegment,
    removeSegment,
    saveAnnotations,
    getSegmentStyle,
    getColorForLabel,
    getTranslationForLabel,
    jumpToSegment,
    setActiveSegment,
    updateVideoStatus,
    assignUserToVideo,
    hasRawVideoFileFn,
    setSegmentAiDatasetId,

    // Backend calls this on save
    persistDirtySegments,
    updateSegmentInMemory,

    // Draft actions
    startDraft,
    updateDraftEnd,
    commitDraft,
    cancelDraft,
    createFiveSecondSegment,
    patchDraftSegment,
    patchSegmentLocally, // Pure frontend mutator for live previews
    backendSegmentToSegment,

    // Helper functions
    formatTime,
    getSegmentOptions,
    clearSegments
  }
})
