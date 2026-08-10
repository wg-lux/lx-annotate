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

const log = createRuntimeLogger('video-store')

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
export type VideoStatus = 'in_progress' | 'available' | 'completed'
  | 'failed'

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
  | 'clean'
  | 'dirty'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'error'

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
  label: string
  startTime: number
  endTime: number | null
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
    if (value !== undefined && value !== null) return value
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
    throw new TypeError(
      `Contract mismatch: missing required string field(s): ${keys.join(' / ')}`
    )
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

function mapVideoMetadataStatus(value: string | null | undefined): VideoStatus {
  const normalized = value?.trim().toLowerCase()
  if (
    normalized === 'in_progress' ||
    normalized === 'available' ||
    normalized === 'completed' ||
    normalized === 'failed'
  ) {
    return normalized
  }

  if (normalized === 'not_started' || normalized === 'extracting_frames') {
    return 'in_progress'
  }
  if (normalized === 'processing_anonymization') {
    return 'in_progress'
  }
  if (normalized === 'done_processing_anonymization') {
    return 'completed'
  }
  if (normalized === 'validated') {
    return 'completed'
  }
  if (normalized === 'anonymized') {
    return 'completed'
  }
  if (normalized === 'started') {
    return 'in_progress'
  }
  if (normalized === 'blank') {
    return 'in_progress'
  }

  throw new TypeError(`Contract mismatch: invalid metadata status value: ${value ?? 'undefined/null'}`)
}

function readNullableAssignedUserField(
  source: object,
  ...keys: string[]
): string | null {
  const value = readField(source, ...keys)
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new TypeError(
      `Contract mismatch: invalid assigned user field(s): ${keys.join(' / ')}`
    )
  }
  const normalized = value.trim()
  if (!normalized || normalized === 'BLANK') return null
  return normalized
}

function readNumberField(source: object, ...keys: string[]): number | undefined {
  const value = readField(source, ...keys)
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
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
  const id = readField(meta, 'id')
  const anonymized = readField(meta, 'anonymized')
  const hasRoi = readField(meta, 'hasROI', 'has_roi')
  const outsideFrameCount = readField(meta, 'outsideFrameCount', 'outside_frame_count')
  const exportSegmentsByVideo = readField(
    meta,
    'exportSegmentsByVideo',
    'export_segments_by_video'
  )
  return {
    id: Number(id ?? fallbackId),
    original_file_name: readRequiredStringField(
      meta,
      'original_file_name',
      'originalFileName'
    ),
    status: mapVideoMetadataStatus(readStringField(meta, 'status')),
    assignedUser: readNullableAssignedUserField(
      meta,
      'assignedUser',
      'assigned_user'
    ),
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
  if (detail == null) return ''
  if (typeof detail === 'string') return detail
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
  if (!operationDetails || typeof operationDetails !== 'object') return null

  const keyedDetails = operationDetails as Record<string, unknown>
  return keyedDetails[String(identifier)] ?? keyedDetails[String(index)] ?? null
}

export function backendSegmentToSegment(backend: BackendSegment): Segment {
  const backendRecord = backend
  const labelName =
    readStringField(backendRecord, 'labelName', 'labelDisplay', 'label_name', 'label_display') ??
    'unknown'
  const normalizedSourceName = readStringField(backendRecord, 'sourceName', 'source_name') ?? null
  const predictionMetaId = readNumberField(backendRecord, 'predictionMetaId', 'prediction_meta_id')
  const segmentOrigin =
    (normalizedSourceName === 'prediction_correction' ? 'prediction_correction' : undefined) ??
    backend.segmentOrigin ??
    backend.segment_origin ??
    (normalizedSourceName === 'prediction' ? 'prediction' : undefined) ??
    (predictionMetaId != null ? 'prediction' : 'manual')
  const timeSegments = backend.timeSegments ?? backend.time_segments ?? null

  // Optional: flatten timeSegments → frames map
  let framesMap: Record<string, TimeSegmentFrame> | undefined
  if (timeSegments && timeSegments.frames.length > 0) {
    framesMap = timeSegments.frames.reduce<Record<string, TimeSegmentFrame>>(
      (acc, frame) => {
        acc[String(frame.frameId)] = frame
        return acc
      },
      {}
    )
  }

  return {
    id: readNumberField(backendRecord, 'id') ?? backend.id,
    label: labelName,
    startTime: readNumberField(backendRecord, 'startTime', 'start_time') ?? 0,
    endTime: readNumberField(backendRecord, 'endTime', 'end_time') ?? 0,
    avgConfidence: 1,
    videoID: readNumberField(backendRecord, 'videoId', 'video_id', 'videoFile', 'video_file'),
    labelID:
      readNumberField(backendRecord, 'labelId', 'label_id', 'label') ??
      (typeof backend.label === 'number' ? backend.label : null),
    startFrameNumber: readNumberField(backendRecord, 'startFrameNumber', 'start_frame_number'),
    endFrameNumber: readNumberField(backendRecord, 'endFrameNumber', 'end_frame_number'),
    exportSegment: backend.exportSegment ?? backend.export_segment ?? false,
    frames: framesMap,
    sourceName: normalizedSourceName,
    segmentOrigin,
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
      if (match) return match
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
    if (videoMeta.value?.duration) return videoMeta.value.duration
    if (currentVideo.value?.duration) return currentVideo.value.duration
    return 0
  })

  const getEffectiveFps = (): number => {
    const fps =
      resolvedVideoFps.value ?? videoMeta.value?.fps ?? currentVideo.value?.fps ?? DEFAULT_FPS
    return Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS
  }
  const effectiveFps = computed<number>(() => getEffectiveFps())

  const segments = computed<Segment[]>(() => currentVideo.value?.segments || [])

  const labels = computed<LabelMeta[]>(() => videoList.value.labels)

  // ✅ NEW: Fast lookup table für Label-Namen zu IDs (wird nur einmal berechnet)
  // maps 'polyp' → 3  |  'blood' → 7 ...
  const labelIdMap = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    videoList.value.labels.forEach((l) => (map[l.name] = l.id))
    return map
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
    allSegments.value.map(
      (segment): SegmentOption => ({
        id: segment.id,
        label: getTranslationForLabel(segment.label),
        startTime: segment.startTime,
        endTime: segment.endTime,
        display: `${getTranslationForLabel(segment.label)}: ${formatTime(segment.startTime)} – ${formatTime(segment.endTime)}`
      })
    )
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
      log.warn('video-delete.video-missing')
      return false
    }
    try {
      await axiosInstance.delete(r(endpoints.mediaManagement.forceRemove(videoId)))
      return true
    } catch (error) {
      log.error('video-delete.failed', error)
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
        log.warn('playback.start-rejected')
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

  function updateSegmentInMemory(
    segmentId: number,
    updates: Partial<Segment>,
    markDirty = false
  ): void {
    let foundSegment: Segment | undefined
    let oldLabel: string | undefined

    for (const label in segmentsByLabel) {
      const segment = segmentsByLabel[label].find((s) => s.id === segmentId)
      if (segment) {
        foundSegment = segment
        oldLabel = label
        break
      }
    }

    if (!foundSegment) return

    Object.assign(foundSegment, updates)
    if (markDirty && !foundSegment.isDraft) {
      foundSegment.isDirty = true
      foundSegment.syncState = 'dirty'
      foundSegment.lastSyncError = null
    }

    if (updates.label && oldLabel && updates.label !== oldLabel) {
      segmentsByLabel[oldLabel] = segmentsByLabel[oldLabel].filter((s) => s.id !== segmentId)
      if (!(updates.label in segmentsByLabel)) {
        segmentsByLabel[updates.label] = []
      }
      segmentsByLabel[updates.label].push(foundSegment)
    }

    if (currentVideo.value?.segments) {
      const segment = currentVideo.value.segments.find((s) => s.id === segmentId)
      if (segment) {
        Object.assign(segment, updates)
        if (markDirty && !segment.isDraft) {
          segment.isDirty = true
          segment.syncState = 'dirty'
          segment.lastSyncError = null
        }
      }
    }
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
      log.debug('segments.cache-applied', { count: currentVideo.value.segments.length })
    }
  }

  function syncCurrentVideoSegments(videoId?: number): void {
    if (!currentVideo.value) return
    if (videoId !== undefined && currentVideo.value.id !== videoId) return
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
    if (!snapshot) return
    upsertSegmentInStore({
      ...snapshot,
      syncState: snapshot.isDirty ? 'dirty' : 'clean',
      lastSyncError: null
    })
  }

  // ===================================================================
  // SEGMENT MANAGEMENT FUNCTIONS
  // ===================================================================

  async function fetchAllSegments(
    id: number,
    forceRefresh = false,
    options: { sourceKind?: SegmentSourceKind } = {}
  ): Promise<void> {
    log.debug('segments.fetch-started')

    // Ensure currentVideo exists before loading segments
    if (!currentVideo.value || currentVideo.value.id !== id) {
      log.debug('video.placeholder-created')
      setCurrentVideo(id)
    }

    const sourceKind = options.sourceKind ?? 'all'
    const cachedSegments = forceRefresh || sourceKind !== 'all' ? null : getCachedSegments(id)
    if (cachedSegments !== null) {
      applyCachedSegments(id, cachedSegments)
      return
    }

    await fetchVideoSegments(id, options)

    if (currentVideo.value) {
      const allSegmentsArray: Segment[] = []
      Object.values(segmentsByLabel).forEach((labelSegments) => {
        allSegmentsArray.push(...labelSegments)
      })

      currentVideo.value.segments = allSegmentsArray
      const listVideo = videoList.value.videos.find((video) => video.id === id)
      if (listVideo) {
        listVideo.segments = allSegmentsArray
      }
      log.debug('segments.fetch-completed', { count: allSegmentsArray.length })
    }
  }

  async function saveAnnotations(): Promise<void> {
    log.debug('annotations.save-started')
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
    log.debug('labels.fetch-started')
    try {
      // 🔹 NEW: use media/labels/ instead of deprecated videos/
      const response: AxiosResponse<unknown[]> = await axiosInstance.get(
        r(endpoints.media.videoLabelsList)
      )

      const processedLabels: LabelMeta[] = response.data.map((rawLabel) => {
        const label =
          rawLabel && typeof rawLabel === 'object'
            ? (rawLabel as Record<string, unknown>)
            : {}
        const name = readStringField(label, 'name') ?? ''
        return {
          id: Number(label.id),
          name,
          color: typeof label.color === 'string' ? label.color : getColorForLabel(name)
        }
      })

      videoList.value.labels = processedLabels
      labelsLoaded = true
      log.info('labels.fetch-completed', { count: processedLabels.length })
      return processedLabels
    } catch (error) {
      log.error('labels.fetch-failed', error)
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

  function normalizeVideoListEntry(video: Record<string, unknown>): VideoMeta {
    const videoId = Number(video.id)
    const rawSegmentValue: unknown = video.segments
    const rawSegments = Array.isArray(rawSegmentValue)
      ? rawSegmentValue.filter(
          (segment: unknown): segment is BackendSegment =>
            segment !== null &&
            typeof segment === 'object' &&
            readNumberField(segment, 'id') !== undefined
        )
      : []
    const segments = rawSegments.map((backendSegment) =>
      ensureLabelId(backendSegmentToSegment({ ...backendSegment, videoId }))
    )
    const segmentAnnotationsValidated = Boolean(
      video.segmentAnnotationsValidated ?? video.segment_annotations_validated
    )

    return {
      id: videoId,
      original_file_name: readRequiredStringField(
        video,
        'originalFileName',
        'original_file_name'
      ),
      status: readVideoStatus(video, 'status'),
      assignedUser: readNullableAssignedUserField(
        video,
        'assignedUser',
        'assigned_user'
      ),
      anonymized: Boolean(video.anonymized),
      segmentAnnotationsValidated,
      segmentAnnotationStatus:
        (video.segmentAnnotationStatus as SegmentAnnotationStatus | undefined) ??
        (video.segment_annotation_status as SegmentAnnotationStatus | undefined) ??
        (segmentAnnotationsValidated ? 'validated' : 'not_started'),
      outsideSegmentsRemoved: Boolean(
        video.outsideSegmentsRemoved ?? video.outside_segments_removed
      ),
      postValidationRebuild:
        ((video.postValidationRebuild ??
          video.post_validation_rebuild) as PostValidationRebuildSummary | null | undefined) ??
        null,
      duration: numberWhenDefined(video.duration),
      fps: numberWhenDefined(video.fps),
      frameCount: normalizeVideoFrameCount(video),
      centerName: readRequiredStringField(video, 'centerName', 'center_name'),
      centerKey:
        typeof (video.centerKey ?? video.center_key) === 'string'
          ? String(video.centerKey ?? video.center_key)
          : undefined,
      processorName: readRequiredStringField(video, 'processorName', 'processor_name'),
      validatedAnnotators: normalizeValidatedAnnotators(video),
      exportSegmentsByVideo: Boolean(
        video.exportSegmentsByVideo ?? video.export_segments_by_video
      ),
      segments
    }
  }

  async function fetchAllVideos(options: { refreshLabels?: boolean } = {}): Promise<VideoList> {
    log.debug('videos.fetch-started')
    try {
      const labelsRequest =
        options.refreshLabels || !labelsLoaded
          ? fetchLabels()
          : Promise.resolve(videoList.value.labels)
      const videosRequest: Promise<AxiosResponse<unknown>> = axiosInstance.get(
        r(endpoints.media.videos)
      )
      const [, response] = await Promise.all([labelsRequest, videosRequest])
      log.debug('videos.response-received')
      const responseRecord =
        response.data && typeof response.data === 'object' && !Array.isArray(response.data)
          ? (response.data as Record<string, unknown>)
          : {}
      const rawVideos: unknown[] = Array.isArray(responseRecord.results)
        ? responseRecord.results
        : Array.isArray(responseRecord.videos)
          ? responseRecord.videos
          : Array.isArray(response.data)
            ? response.data
            : []

      const processedVideos: VideoMeta[] = rawVideos
        .filter(
          (video): video is Record<string, unknown> =>
            Boolean(video) && typeof video === 'object' && !Array.isArray(video)
        )
        .map(normalizeVideoListEntry)

      // Labels already fetched and stored above
      const processedLabels: LabelMeta[] = videoList.value.labels

      videoList.value = {
        videos: processedVideos,
        labels: processedLabels
      }

      log.info('videos.fetch-completed', { count: processedVideos.length })
      return videoList.value
    } catch (error) {
      log.error('videos.fetch-failed', error)
      videoList.value = { videos: [], labels: videoList.value.labels }
      throw error
    }
  }

  // ===================================================================
  // VIDEO ACTIONS
  // ===================================================================

  function clearVideo(): void {
    resetFrameNavigationCache()
    currentVideo.value = null
    videoMeta.value = null
    resolvedVideoFps.value = null
    activeVideoId.value = null
  }

  function setVideo(video: VideoAnnotation): void {
    resetFrameNavigationCache()
    currentVideo.value = video
  }

  function setCurrentVideo(videoId: number): VideoAnnotation | null {
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

  async function fetchVideoFps(videoId?: number): Promise<number | null> {
    const id = videoId || currentVideo.value?.id
    if (!id) {
      log.warn('fps.video-missing')
      return null
    }

    try {
      const response: AxiosResponse<VideoFpsResponse> = await axiosInstance.get(
        r(endpoints.media.videoFps(id)),
        { headers: { Accept: 'application/json' } }
      )
      const fps = normalizeFps(response.data.fps)
      if (fps === null) {
        log.warn('fps.payload-invalid')
        return null
      }
      if (activeVideoId.value !== id || currentVideo.value?.id !== id) {
        return fps
      }

      resolvedVideoFps.value = fps
      if (videoMeta.value?.id === id) {
        videoMeta.value.fps = fps
      }
      if (currentVideo.value.id === id) {
        currentVideo.value.fps = fps
      }
      const listVideo = videoList.value.videos.find((video) => video.id === id)
      if (listVideo) {
        listVideo.fps = fps
      }
      return fps
    } catch {
      log.warn('fps.fetch-unavailable')
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

  function applyVideoMetadata(id: number, normalizedMeta: VideoMeta): boolean {
    const currentVideoRecord = currentVideo.value
    if (!currentVideoRecord || currentVideoRecord.id !== id) return false
    if (activeVideoId.value !== id) {
      activeVideoId.value = id
    }

    videoMeta.value = normalizedMeta
    currentVideoRecord.status = normalizedMeta.status
    currentVideoRecord.assignedUser = normalizedMeta.assignedUser
    if (resolvedVideoFps.value !== null) {
      videoMeta.value.fps = resolvedVideoFps.value
    }
    if (normalizedMeta.duration !== undefined && normalizedMeta.duration > 0) {
      currentVideoRecord.duration = normalizedMeta.duration
    }
    if (
      resolvedVideoFps.value === null &&
      normalizedMeta.fps !== undefined &&
      normalizedMeta.fps > 0
    ) {
      currentVideoRecord.fps = normalizedMeta.fps
    }
    if (normalizedMeta.frameCount !== undefined && normalizedMeta.frameCount > 0) {
      currentVideoRecord.frameCount = normalizedMeta.frameCount
    }
    return true
  }

  async function fetchVideoMetadata(videoId?: number): Promise<void> {
    try {
      const id = videoId || currentVideo.value?.id
      if (!id) {
        log.warn('metadata.video-missing')
        return
      }

      const response: AxiosResponse<unknown> = await axiosInstance.get(
        r(endpoints.media.videoMetadata(id)),
        {
          headers: { Accept: 'application/json' }
        }
      )

      const normalizedMeta = normalizeVideoMetadataResponse(
        requireObject(response.data, 'Video metadata'),
        id
      )
      if (!applyVideoMetadata(id, normalizedMeta)) return

      log.info('metadata.fetch-completed')
    } catch (error) {
      log.error('metadata.fetch-failed', error)
    }
  }

  async function fetchVideoUrl(videoId?: number): Promise<void> {
    const id = videoId || currentVideo.value?.id
    if (!id) return
    videoUrl.value = buildVideoStreamUrl(id, 'processed')
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
        log.debug('raw-video.check-completed', {
          outcome: hasRawVideoFile.value ? 'available' : 'unavailable'
        })
      })
      .catch((error: unknown) => {
        log.error('raw-video.check-failed', error)
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
      log.error('segments.label-load-failed', error)
      errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`
    }
  }

  async function fetchVideoSegments(
    videoId: number,
    options: { sourceKind?: SegmentSourceKind } = {}
  ): Promise<void> {
    const token = ++_fetchToken.value
    let controller: AbortController | null = null
    try {
      if (fetchSegmentsController) {
        fetchSegmentsController.abort()
      }
      controller = new AbortController()
      fetchSegmentsController = controller
      const sourceKind = options.sourceKind ?? 'all'
      const response: AxiosResponse<SegmentListResponse> = await axiosInstance.get(
        r(endpoints.media.videoSegments(videoId)),
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          params: sourceKind === 'all' ? undefined : { source_kind: sourceKind }
        }
      )

      if (token !== _fetchToken.value) return

      const rawSegments = normalizeSegmentList(response.data)

      // Clear existing segments
      Object.keys(segmentsByLabel).forEach((key) => {
        Reflect.deleteProperty(segmentsByLabel, key)
      })

      log.debug('segments.normalize-started', { count: rawSegments.length })

      rawSegments.forEach((backendSeg) => {
        const segmentWithVideoId: Segment = ensureLabelId(backendSegmentToSegment(backendSeg))

        const label = segmentWithVideoId.label
        if (!(label in segmentsByLabel)) {
          segmentsByLabel[label] = []
        }

        if (segmentWithVideoId.endTime - segmentWithVideoId.startTime < 0.1) {
          log.warn('segment.duration-short')
        }

        segmentsByLabel[label].push(segmentWithVideoId)
      })

      log.debug('segments.normalize-completed', { count: rawSegments.length })
      syncCurrentVideoSegments(videoId)
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.code === 'ERR_CANCELED' || axiosError.name === 'CanceledError') {
        return
      }
      if (token === _fetchToken.value) {
        log.error('segments.load-failed', error)
        errorMessage.value = 'Error loading video segments. Please try again later.'
      }
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

  async function createSegment(
    videoId: number,
    label: string,
    startTime: number,
    endTime: number
  ): Promise<Segment | null> {
    let tempSegment: Segment | null = null
    try {
      // Get label ID from existing labels in store
      const labelMeta = videoList.value.labels.find((l) => l.name === label)
      if (!labelMeta) {
        log.warn('label.lookup-missing')
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

      const newSegment = replaceSegmentInStore(tempSegmentId, persisted)
      log.info('segment.create-completed')
      return newSegment
    } catch (error) {
      log.error('segment.create-failed', error)
      errorMessage.value = 'Error creating segment. Please try again.'
      if (tempSegment) {
        removeSegmentFromStore(tempSegment.id)
      }
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

  function buildSegmentUpdatePayload(
    segmentId: number,
    updates: SegmentUpdatePayload
  ): SegmentUpdatePayload | null {
    const currentSegment = findSegmentById(segmentId)
    const fallbackStart = currentSegment?.startTime ?? 0
    const fallbackEnd = currentSegment?.endTime ?? 0
    if (!currentSegment && updates.startTime == null && updates.start_time == null) {
      log.warn('segment-update.timestamps-missing')
      return null
    }

    return createSegmentUpdatePayload(
      updates.startTime ?? updates.start_time ?? fallbackStart,
      updates.endTime ?? updates.end_time ?? fallbackEnd,
      updates
    )
  }

  function shouldRetrySegmentUpdate(error: AxiosError): boolean {
    const status = error.response?.status
    if (!status) return true
    if (status === 408 || status === 429) return true
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
    const url = r(endpoints.media.videoSegmentDetail(videoId, segmentId))
    const response: AxiosResponse<BackendSegment> = await axiosInstance.patch(
      url,
      withSelectedAiDataset(payload)
    )

    if (options.updateLocal !== false && currentVideo.value?.id === videoId) {
      const updatedSegment = backendSegmentToSegment(response.data)
      updateSegmentInMemory(segmentId, updatedSegment)
    }

    return response.data
  }

  async function processSegmentUpdateQueue(): Promise<void> {
    if (isProcessingSegmentQueue || segmentUpdateQueue.length === 0) return
    isProcessingSegmentQueue = true

    const job = segmentUpdateQueue.shift() as SegmentUpdateJob
    let scheduledRetry = false

    try {
      await updateSegmentWithPayload(job.videoId, job.segmentId, job.payload)
      log.debug('segment-update.queue-completed')
    } catch (error) {
      const axiosError = error as AxiosError
      job.attempts += 1

      if (job.attempts <= MAX_SEGMENT_UPDATE_RETRIES && shouldRetrySegmentUpdate(axiosError)) {
        segmentUpdateQueue.push(job)
        const delay = getSegmentUpdateRetryDelay(job.attempts)
        scheduledRetry = true
        if (segmentQueueTimer) clearTimeout(segmentQueueTimer)
        segmentQueueTimer = setTimeout(() => {
          segmentQueueTimer = null
          void processSegmentUpdateQueue()
        }, delay)
      } else {
        log.error('segment-update.queue-failed', error, { retryCount: job.attempts })
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

  async function updateSegmentAPI(
    segmentId: number,
    updates: SegmentUpdatePayload,
    options: { silent?: boolean; videoId?: number } = {}
  ): Promise<boolean> {
    try {
      const videoId = options.videoId ?? currentVideo.value?.id
      if (!videoId) {
        log.warn('segment-update.video-missing')
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

      const updated = response.updated.at(0)
      if (updated) {
        applyPersistedSegment(updated)
      } else {
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

      log.debug('segment-update.completed')
      return true
    } catch (error) {
      const axiosError = error as AxiosError
      const detail = getBulkOperationErrorDetail(axiosError.response?.data, 'updates', segmentId, 0)
      const errorText = formatValidationErrorDetail(detail) || axiosError.message
      log.error('segment-update.failed', error)
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
      if (!options.silent) {
        getToastStore().error({ text: 'Fehler beim Aktualisieren des Segments' })
      }
      return false
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
      log.error('video-export-flag.update-failed', error)
      return false
    }
  }

  async function deleteSegment(segmentId: number): Promise<boolean> {
    let removedSnapshot: Segment | null = null
    try {
      const videoId = currentVideo.value?.id
      if (!videoId) {
        log.warn('segment-delete.video-missing')
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
      log.error('segment-delete.failed', error)
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
    log.debug('draft.started')
    draftSegment.value = {
      id: nextDraftId--, // -1, -2, ...
      label,
      startTime,
      endTime: null
    }
    log.debug('draft.created')
  }

  function updateDraftEnd(endTime: number): void {
    if (!draftSegment.value) {
      log.warn('draft.update-missing')
      return
    }

    const clampedEndTime = Math.max(0, endTime)

    draftSegment.value.endTime = clampedEndTime

    log.debug('draft.end-updated')
  }

  async function commitDraft(): Promise<Segment | null> {
    log.debug('draft.commit-started')
    log.debug('draft.video-state-checked')

    if (!draftSegment.value) {
      log.warn('draft.commit-missing')
      return null
    }

    if (!currentVideo.value) {
      if (activeVideoId.value !== null) {
        log.warn('draft.video-fallback')
        setCurrentVideo(activeVideoId.value)
      }
    }

    if (!currentVideo.value) {
      log.warn('draft.video-missing')
      return null
    }

    const draft = draftSegment.value

    if (draft.endTime === null) {
      log.warn('draft.end-missing')
      return null
    }

    try {
      const videoId = currentVideo.value.id
      if (!videoId) {
        log.warn('draft.video-id-missing')
        return null
      }

      const newSegment = await createSegment(videoId, draft.label, draft.startTime, draft.endTime)
      if (!newSegment) return null

      // Clear draft AFTER successful creation
      draftSegment.value = null
      log.info('draft.commit-completed')

      return newSegment
    } catch (error) {
      log.error('draft.commit-failed', error)
      const responseData: unknown = error instanceof AxiosError ? error.response?.data : undefined
      const responseDetail =
        responseData !== null && typeof responseData === 'object'
          ? readStringField(responseData, 'detail')
          : null
      errorMessage.value = responseDetail ?? (
        error instanceof AxiosError ? error.message : 'Unbekannter Fehler beim Speichern'
      )
      return null
    }
  }

  function cancelDraft(): void {
    if (!draftSegment.value) {
      log.warn('draft.cancel-missing')
      return
    }

    log.debug('draft.cancelled')
    draftSegment.value = null
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

  async function persistDirtySegments(): Promise<void> {
    if (!currentVideo.value?.id) return

    // Filter for segments that have been moved/resized locally
    const dirtySegments = allSegments.value.filter((s) => s.isDirty && !s.isDraft && s.id > 0)
    if (dirtySegments.length === 0) {
      log.debug('segments.persist-skipped', { reasonCode: 'no-dirty-segments' })
      return
    }

    log.debug('segments.persist-started', { count: dirtySegments.length })

    try {
      const videoId = currentVideo.value.id
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

      response.updated.forEach((segment) => applyPersistedSegment(segment))
      const successCount = response.updated.length

      if (successCount === dirtySegments.length) {
        getToastStore().success({ text: 'Alle Änderungen gespeichert' })
      } else if (successCount > 0) {
        getToastStore().warning({
          text: `${String(successCount)} von ${String(dirtySegments.length)} Segmenten gespeichert`
        })
      } else {
        getToastStore().error({ text: 'Speichern fehlgeschlagen' })
      }

      if (successCount > 0) {
        syncCurrentVideoSegments(currentVideo.value.id)
      }
    } catch (error) {
      log.error('segments.persist-failed', error)
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
      syncCurrentVideoSegments(currentVideo.value.id)
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
      throw error
    }
  }

  async function loadVideo(
    videoId: number,
    options: { sourceKind?: SegmentSourceKind; knownFps?: number } = {}
  ): Promise<void> {
    resetFrameNavigationCache()
    log.debug('video.load-started')
    activeVideoId.value = videoId

    // 1. Check Anonymization Status (Client-side pre-check)
    const anonStore = useAnonymizationStore()

    if (anonStore.overview.length === 0) {
      log.debug('anonymization-overview.fetch-started')
      try {
        await anonStore.fetchOverview()
      } catch {
        log.warn('anonymization-overview.fetch-failed')
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

      log.info('video.load-completed', { count: currentVideo.value.segments.length })
    } catch (error) {
      log.error('video.load-failed', error)
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
    if (draftSegment.value && draftSegment.value.id === id) {
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
