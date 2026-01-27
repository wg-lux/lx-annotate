import { defineStore } from 'pinia'
import { ref, computed, reactive, readonly, type Ref, type ComputedRef } from 'vue'
import axiosInstance, { a, r } from '../api/axiosInstance'
import { AxiosError, type AxiosResponse } from 'axios'
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils'
import { useAnonymizationStore, type FileItem } from './anonymizationStore'
import { useToastStore } from './toastStore'

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

/**
 * Translation map for label names (German translations)
 */
export interface Video {
  id: number
  center_name?: string
  processor_name?: string
  original_file_name?: string
  status?: string
  video_url?: string
  exportSegmentsByVideo?: boolean
  [key: string]: any
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
  frameFilePath: string    // media-relative path from backend
  frameUrl: string         // full URL (what the frontend should use)
  allClassifications: any[]
  predictions: BackendFramePrediction[] | any[]
  frameId: number
  manualAnnotations: any[]
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
  videoName?: string
  videoId?: number
  label?: number | null
  labelName?: string | null
  labelId?: number | null
  startFrameNumber: number
  endFrameNumber: number
  startTime: number
  endTime: number
  exportSegment?: boolean
  export_segment?: boolean
  labelDisplay?: string
  framePredictions?: BackendFramePrediction[]
  manualFrameAnnotations?: any[]
  timeSegments?: TimeSegments | null
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

/**
 * Segment interface for internal store usage
 * (canonical frontend representation)
 */
export interface Segment {
  id: number                    // ⬅ numeric only (drafts use negative ids)
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
  isDirty?: boolean            // ⬅ used by persistDirtySegments()
  exportSegment?: boolean
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
}

/**
 * Video metadata from backend
 */
export interface VideoMeta {
  id: number
  original_file_name: string
  status: string
  assignedUser?: string | null
  anonymized: boolean
  segmentAnnotationsValidated?: boolean
  duration?: number
  fps?: number
  hasROI?: boolean
  outsideFrameCount?: number
  centerName: string
  processorName: string
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
  id: number                 // ⬅ negative numbers for drafts
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
  [key: string]: any
}

export interface CreateSegmentResponse extends BackendSegment {}  // reuse same shape

type SegmentListResponse = BackendSegment[] | { results: BackendSegment[] }

function normalizeSegmentList(data: SegmentListResponse | null | undefined): BackendSegment[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && Array.isArray(data.results)) {
    return data.results
  }
  return []
}

export function backendSegmentToSegment(backend: BackendSegment): Segment {
  const labelName = backend.labelName ?? backend.labelDisplay ?? 'unknown'

  // Optional: flatten timeSegments → frames map
  let framesMap: Record<string, TimeSegmentFrame> | undefined
  if (backend.timeSegments?.frames?.length) {
    framesMap = backend.timeSegments.frames.reduce((acc, frame) => {
      acc[String(frame.frameId)] = frame
      return acc
    }, {} as Record<string, TimeSegmentFrame>)
  }

  return {
    id: backend.id,
    label: labelName,
    startTime: backend.startTime,
    endTime: backend.endTime,
    avgConfidence: 1,
    videoID: backend.videoId ?? backend.videoFile,
    labelID: backend.labelId ?? (typeof backend.label === 'number' ? backend.label : null),
    startFrameNumber: backend.startFrameNumber,
    endFrameNumber: backend.endFrameNumber,
    exportSegment: backend.exportSegment ?? backend.export_segment ?? false,
    frames: framesMap
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

const toast = useToastStore()

const translationMap: Record<LabelKey, string> = {
  appendix: 'Appendix',
  blood: 'Blut',
  diverticule: 'Divertikel',
  grasper: 'Greifer',
  ileocaecalvalve: 'Ileozäkalklappe',
  ileum: 'Ileum',
  low_quality: 'Niedrige Bildqualität',
  nbi: 'Narrow Band Imaging',
  needle: 'Nadel',
  outside: 'Außerhalb',
  polyp: 'Polyp',
  snare: 'Snare',
  water_jet: 'Wasserstrahl',
  wound: 'Wunde'
}

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
const MIN_SEGMENT_DURATION = 1 / 50 // Mindestlänge: 1 Frame bei 50 FPS
const FIVE_SECOND_SEGMENT_DURATION = 5 // 5 Sekunden für Shift-Klick


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
  const videoMeta = ref<VideoMeta | null>(null)
  const activeSegmentId = ref<string | number | null>(null)
  const activeVideoId = ref<number | null>(null)
  const _fetchToken = ref<number>(0)
  const draftSegment = ref<DraftSegment | null>(null)
  const hasRawVideoFile = ref<boolean | null>(null)

  function findSegmentById(segmentId: number): Segment | null {
    for (const label in segmentsByLabel) {
      const match = segmentsByLabel[label].find((s) => s.id === segmentId)
      if (match) return match
    }
    return null
  }

  function buildVideoStreamUrl(id: string | number) {
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin
    return `${base}/api/media/videos/${id}/`
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
    const fps = videoMeta.value?.fps ?? currentVideo.value?.fps ?? 50
    return Number.isFinite(fps) && fps > 0 ? fps : 50
  }

  const segments = computed<Segment[]>(() => currentVideo.value?.segments || [])

  const labels = computed<LabelMeta[]>(() => videoList.value?.labels || [])

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
      labelID: segment.labelID ?? labelIdMap.value[segment.label] ?? null
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
        isDraft: true,
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
      console.error(`Invalid video ID: ${videoId}`)
      return false
    }
    try {
      await axiosInstance.delete(`/api/media-management/${videoId}/force-remove/`)
      return true
    } catch (error) {
      console.error(`Failed to delete video ${videoId}:`, error)
      return false
    }
  }


  function setActiveSegment(segmentId: number ): void {
    activeSegmentId.value = segmentId
  }

  function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void {
    if (videoElement && segment.startTime) {
      videoElement.currentTime = segment.startTime
      videoElement.play().catch(console.error)
    }
  }

  function getSegmentStyle(segment: Segment, videoDuration: number): SegmentStyle {
    const startPercent = (segment.startTime / videoDuration) * 100
    const widthPercent = ((segment.endTime - segment.startTime) / videoDuration) * 100

    return {
      left: `${startPercent}%`,
      width: `${widthPercent}%`,
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
    }

    if (updates.label && oldLabel && updates.label !== oldLabel) {
      segmentsByLabel[oldLabel] = segmentsByLabel[oldLabel].filter((s) => s.id !== segmentId)
      if (!segmentsByLabel[updates.label]) {
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
        }
      }
    }
  }



  function getSegmentOptions(): SegmentOption[] {
    return segmentOptions.value
  }

  function clearSegments(): void {
    Object.keys(segmentsByLabel).forEach((key) => {
      delete segmentsByLabel[key]
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
      if (!segmentsByLabel[label]) {
        segmentsByLabel[label] = []
      }
      segmentsByLabel[label].push(segmentWithVideoId)
    })

    if (currentVideo.value && currentVideo.value.id === videoId) {
      currentVideo.value.segments = Object.values(segmentsByLabel).flat()
      console.log(
        `[VideoStore] Cached timeline segments populated: ${currentVideo.value.segments.length} segments for video ${videoId}`
      )
    }
  }

  function syncCurrentVideoSegments(videoId?: number): void {
    if (!currentVideo.value) return
    if (videoId !== undefined && currentVideo.value.id !== videoId) return
    const merged = Object.values(segmentsByLabel).flat()
    currentVideo.value.segments = merged
    const listVideo = videoList.value.videos.find((video) => video.id === currentVideo.value?.id)
    if (listVideo) {
      listVideo.segments = merged
    }
  }


  // ===================================================================
  // SEGMENT MANAGEMENT FUNCTIONS
  // ===================================================================

  async function fetchAllSegments(id: number, forceRefresh = false): Promise<void> {
    console.log(`[VideoStore] fetchAllSegments called with video ID: ${id}`)

    // Ensure currentVideo exists before loading segments
    if (!currentVideo.value || currentVideo.value.id !== id) {
      console.log(`[VideoStore] No currentVideo found, creating basic video object for ID: ${id}`)
      setCurrentVideo(id)
    }

    const cachedSegments = forceRefresh ? null : getCachedSegments(id)
    if (cachedSegments !== null) {
      applyCachedSegments(id, cachedSegments)
      return
    }

    await fetchVideoSegments(id)

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
      console.log(
        `[VideoStore] Timeline segments populated: ${allSegmentsArray.length} segments for video ${id}`
      )
    }
  }

  async function saveAnnotations(): Promise<void> {
    console.log('Saving annotations...')
  }

  async function updateVideoStatus(status: VideoStatus): Promise<void> {
    if (currentVideo.value) {
      currentVideo.value.status = status
    }
  }

  async function assignUserToVideo(user: string): Promise<void> {
    if (currentVideo.value) {
      currentVideo.value.assignedUser = user
    }
  }


  /**
   * ✅ NEW: Fetch labels independently and with high priority
   * This ensures labels are always available before videos are loaded
   */
  // assuming: interface LabelMeta { id: number; name: string; color: string }

  async function fetchLabels(): Promise<LabelMeta[]> {
    console.log('🏷️ [VideoStore] Fetching labels with high priority...')
    try {
      // 🔹 NEW: use media/labels/ instead of deprecated videos/
      const response: AxiosResponse<any[]> = await axiosInstance.get(
        r('media/videos/labels/list/')
      )

      const processedLabels: LabelMeta[] = response.data.map((label: any) => ({
        id: Number(label.id),
        name: String(label.name),
        color: label.color || getColorForLabel(label.name),
      }))

      videoList.value.labels = processedLabels
      console.log(`✅ [VideoStore] Loaded ${processedLabels.length} labels`)
      return processedLabels
    } catch (error) {
      console.error('❌ Error loading labels:', error)
      videoList.value.labels = []
      throw error
    }
  }


  async function fetchAllVideos(): Promise<VideoList> {
    console.log('Fetching all videos...')
    try {
      // ✅ PRIORITY: Fetch labels first before processing videos
      await fetchLabels()
      
      const response: AxiosResponse<any> = await axiosInstance.get(r('media/videos/'))
      console.log('API Response:', response.data) //#TODO Add newly created assigned user from keycloak
      const rawVideos: any[] = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data?.videos)
        ? response.data.videos
        : Array.isArray(response.data)
        ? response.data
        : []

      // Process videos with enhanced metadata
      const processedVideos: VideoMeta[] = rawVideos.map((video: any) => {
        const videoId = Number(video.id)
        const rawSegments: BackendSegment[] = Array.isArray(video.segments)
          ? video.segments
          : []
        const segments: Segment[] = rawSegments.map((backendSeg) =>
          ensureLabelId(
            backendSegmentToSegment({ ...backendSeg, videoId })
          )
        )

        return {
          id: videoId,
          original_file_name: video.original_file_name,
          status: video.status || 'available',
          assignedUser: video.assignedUser || null,
          anonymized: video.anonymized || false,
          segmentAnnotationsValidated:
            video.segmentAnnotationsValidated ?? video.segment_annotations_validated ?? false,
          centerName: video.centerName || video.center_name || 'Unbekannt',
          processorName: video.processorName || video.processor_name || 'Unbekannt',
          exportSegmentsByVideo:
            video.exportSegmentsByVideo ?? video.export_segments_by_video ?? false,
          segments
        }
      })

      // Labels already fetched and stored above
      const processedLabels: LabelMeta[] = videoList.value.labels

      videoList.value = {
        videos: processedVideos,
        labels: processedLabels
      }

      console.log('✅ Processed videos with segments:', videoList.value)
      return videoList.value
    } catch (error) {
      console.error('Error loading videos:', error)
      videoList.value = { videos: [], labels: [] }
      throw error
    }
  }

  // ===================================================================
  // VIDEO ACTIONS
  // ===================================================================

  function clearVideo(): void {
    currentVideo.value = null
    videoMeta.value = null
    activeVideoId.value = null
  }

  function setVideo(video: VideoAnnotation): void {
    currentVideo.value = video
  }

  function setCurrentVideo(videoId: number): VideoAnnotation | null {
    activeVideoId.value = videoId
    const video = videoList.value.videos.find((v) => v.id === videoId) || null
    if (video) {
      const cachedSegments = getCachedSegments(videoId)
      currentVideo.value = {
        id: video.id,
        isAnnotated: true,
        errorMessage: '',
        segments: cachedSegments ?? [],
        videoUrl: buildVideoStreamUrl(video.id) + '?type=processed',
        status: video.status as VideoStatus,
        assignedUser: video.assignedUser || null
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
  async function fetchVideoMetadata(videoId?: number): Promise<void> {
    try {
      const id = videoId || currentVideo.value?.id
      if (!id) {
        console.warn('No video ID available for fetching video metadata')
        return
      }

      const response: AxiosResponse = await axiosInstance.get(r(`media/videos/${id}/metadata/`), {
        headers: { Accept: 'application/json' }
      })

      const meta = response.data ?? {}
      
      // Map API response to VideoMeta interface
      const normalizedMeta: VideoMeta = {
        id: Number(meta.id ?? id),
        original_file_name: String(meta.original_file_name ?? meta.originalFileName ?? ''),
        status: String(meta.status ?? 'available'),
        assignedUser: meta.assignedUser === "BLANK" ? null : meta.assignedUser,
        anonymized: Boolean(meta.anonymized ?? false),
        duration: meta.duration !== undefined ? Number(meta.duration) : undefined,
        fps: meta.fps !== undefined ? Number(meta.fps) : 50,
        hasROI: Boolean(meta.hasROI ?? meta.has_roi ?? false),
        outsideFrameCount: Number(meta.outsideFrameCount ?? meta.outside_frame_count ?? 0),
        centerName: String(meta.centerName ?? meta.center_name ?? 'Unbekannt'),
        processorName: String(meta.processorName ?? meta.processor_name ?? 'Unbekannt'),
        exportSegmentsByVideo: Boolean(
          meta.exportSegmentsByVideo ?? meta.export_segments_by_video ?? false
        )
      }

      videoMeta.value = normalizedMeta

      // Update currentVideo immediately if it exists
      if (currentVideo.value) {
        if (normalizedMeta.duration !== undefined && normalizedMeta.duration > 0) {
          currentVideo.value.duration = normalizedMeta.duration
        }
        if (normalizedMeta.fps !== undefined && normalizedMeta.fps > 0) {
          currentVideo.value.fps = normalizedMeta.fps
        }
      }

      console.log('[VideoStore] Video metadata loaded:', normalizedMeta)
    } catch (error) {
      const axiosError = error as AxiosError
      console.error(
        'Error loading video metadata:',
        axiosError.response?.data || axiosError.message
      )
    }
  }

  async function fetchVideoUrl(videoId?: number): Promise<void> {
    try {
      const id = videoId || currentVideo.value?.id
      if (!id) return

      const response: AxiosResponse = await axiosInstance.get(r(`media/videos/${id}/`), {
        headers: { Accept: 'application/json' }
      })

      if (response.data.video_url) {
        videoUrl.value = response.data.video_url
      }

      if (currentVideo.value) {
        // Only overwrite duration if metadata didn't provide it
        if (response.data.duration && !videoMeta.value?.duration) {
           currentVideo.value.duration = Number(response.data.duration)
        }
        // Only overwrite FPS if metadata didn't provide it
        if (response.data.fps && !videoMeta.value?.fps) {
           currentVideo.value.fps = Number(response.data.fps)
        }
      }
    } catch (error) {
      console.error('Error loading video URL')
    }
  }

  const videoStreamUrl = computed(() =>
    currentVideo.value ? buildVideoStreamUrl(currentVideo.value.id) + '?type=processed' : ''
  )

  function hasRawVideoFileFn() {
    if (!currentVideo.value?.id) {
      hasRawVideoFile.value = null
      return
    }

    const videoId = currentVideo.value.id
    axiosInstance
      .get(r(`anonymization/${videoId}/has-raw/`))
      .then((response) => {
        hasRawVideoFile.value = response.data.has_raw_file
        console.log(`Raw video file for ID ${videoId}:`, hasRawVideoFile.value)
      })
      .catch((error) => {
        console.error('Error checking raw video file:', error)
        hasRawVideoFile.value = null
      })
  }

  async function fetchSegmentsByLabel(id: number, label = 'outside'): Promise<void> {
    try {
      const response: AxiosResponse<SegmentListResponse> = await axiosInstance.get(
        r(`media/videos/${id}/segments/`),
        {
          headers: { Accept: 'application/json' },
          params: { label }, // backend expects ?label=<label_name>
        })

      const rawSegments = normalizeSegmentList(response.data)

      const segmentsForLabel: Segment[] = rawSegments.map((backendSeg) =>
        ensureLabelId(
          backendSegmentToSegment(backendSeg)
        )
      )


      segmentsByLabel[label] = segmentsForLabel

      if (currentVideo.value) {
        currentVideo.value.segments = Object.values(segmentsByLabel).flat()
      }
    } catch (error) {
      const axiosError = error as AxiosError
      console.error(
        'Error loading segments for label ' + label + ':',
        axiosError.response?.data || axiosError.message
      )
      errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`
    }
  }

  async function fetchVideoSegments(videoId: number): Promise<void> {
    const token = ++_fetchToken.value
    let controller: AbortController | null = null
    try {
      if (fetchSegmentsController) {
        fetchSegmentsController.abort()
      }
      controller = new AbortController()
      fetchSegmentsController = controller
      const response: AxiosResponse<SegmentListResponse> = await axiosInstance.get(
        r(`media/videos/${videoId}/segments/`),
        { headers: { Accept: 'application/json' }, signal: controller.signal }
      )

      if (token !== _fetchToken.value) return

      const rawSegments = normalizeSegmentList(response.data)

      // Clear existing segments
      Object.keys(segmentsByLabel).forEach((key) => {
        delete segmentsByLabel[key]
      })

      console.log(`[VideoStore] Loading ${rawSegments.length} segments for video ${videoId}`)

      rawSegments.forEach((backendSeg) => {
        const segmentWithVideoId: Segment = ensureLabelId(
          backendSegmentToSegment(backendSeg)
        )

        const label = segmentWithVideoId.label
        if (!segmentsByLabel[label]) {
          segmentsByLabel[label] = []
        }

        if (segmentWithVideoId.endTime - segmentWithVideoId.startTime < 0.1) {
          console.warn(
            `⚠️ Very short segment ${segmentWithVideoId.id}: ${
              segmentWithVideoId.endTime - segmentWithVideoId.startTime
            }s`
          )
        }

        segmentsByLabel[label].push(segmentWithVideoId)
      })

      console.log(
        `[VideoStore] Processed segments by label:`,
        Object.keys(segmentsByLabel).map(
          (label) => `${label}: ${segmentsByLabel[label].length}`
        )
      )
      syncCurrentVideoSegments(videoId)
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.code === 'ERR_CANCELED' || axiosError.name === 'CanceledError') {
        return
      }
      if (token === _fetchToken.value) {
        console.error(
          'Error loading video segments:',
          axiosError.response?.data || axiosError.message
        )
        errorMessage.value = 'Error loading video segments. Please try again later.'
      }
    } finally {
      if (fetchSegmentsController === controller) {
        fetchSegmentsController = null
      }
    }
  }

  async function createSegment(
    videoId: number,
    label: string,
    startTime: number,
    endTime: number
  ): Promise<Segment | null> {
    try {
      // Get label ID from existing labels in store
      const labelMeta = videoList.value.labels.find((l) => l.name === label)
      if (!labelMeta) {
        console.error(`Label ${label} not found in store`)
        errorMessage.value = `Label ${label} nicht gefunden`
        return null
      }
      const labelId = labelMeta.id

      const fps = getEffectiveFps()
      const startFrame = Math.floor(startTime * fps)
      const endFrame = Math.floor(endTime * fps)

      const segmentData = {
        video_file: videoId,
        label: labelId,
        start_frame_number: startFrame,
        end_frame_number: endFrame
      }

      const response: AxiosResponse<BackendSegment> = await axiosInstance.post(
        r(`media/videos/${videoId}/segments/`),
        segmentData
      )

      const backendSeg = response.data
      let newSegment = backendSegmentToSegment(backendSeg)

      // Ensure label & labelID match your current selection
      newSegment = {
        ...newSegment,
        label,          // enforce chosen label (string)
        videoID: videoId,
        labelID: labelId
      }

      if (!segmentsByLabel[label]) {
        segmentsByLabel[label] = []
      }
      segmentsByLabel[label].push(newSegment)
      syncCurrentVideoSegments(videoId)

      console.log('Created segment:', newSegment)
      return newSegment
    } catch (error) {
      const axiosError = error as AxiosError
      console.error('Error creating segment:', axiosError.response?.data || axiosError.message)
      errorMessage.value = 'Error creating segment. Please try again.'
      return null
    }
  }

  function createSegmentUpdatePayload(
    segmentId: number,
    startTime: number,
    endTime: number,
    extra: SegmentUpdatePayload = {}
  ) {
    const fps = getEffectiveFps()
    const startFrame = Math.floor(startTime * fps)
    const endFrame = Math.floor(endTime * fps)

    const {
      exportSegment,
      export_segment,
      ...rest
    } = extra

    return {
      // backend expects snake_case:
      start_time: startTime,
      end_time: endTime,
      start_frame_number: startFrame,
      end_frame_number: endFrame,
      export_segment: export_segment ?? exportSegment,
      ...rest
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
      console.error('[VideoStore] Cannot infer segment times for update', segmentId)
      return null
    }

    return createSegmentUpdatePayload(
      segmentId,
      (updates.startTime ?? updates.start_time) ?? fallbackStart,
      (updates.endTime ?? updates.end_time) ?? fallbackEnd,
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

  function enqueueSegmentUpdate(job: SegmentUpdateJob): void {
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
    const url = r(`media/videos/${videoId}/segments/${segmentId}/`)
    const response: AxiosResponse<BackendSegment> = await axiosInstance.patch(url, payload)

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
      console.log(`[VideoStore] Queued update succeeded for segment ${job.segmentId}`)
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
        console.error(
          '[VideoStore] Segment update failed after retries:',
          axiosError.response?.data || axiosError.message
        )
        toast.error({ text: 'Segment konnte nicht gespeichert werden. Bitte erneut speichern.' })
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
        console.error('[VideoStore] Cannot update segment without current video')
        return false
      }

      const updatePayload = buildSegmentUpdatePayload(segmentId, updates)
      if (!updatePayload) {
        return false
      }

      await updateSegmentWithPayload(videoId, segmentId, updatePayload)

      console.log(`[VideoStore] Successfully updated segment ${segmentId}`)
      return true
    } catch (error) {
      const axiosError = error as AxiosError
      console.error('Error updating segment:', axiosError.response?.data || axiosError.message)
      errorMessage.value = 'Error updating segment. Please try again.'
      if (!options.silent) {
        toast.error({ text: 'Fehler beim Aktualisieren des Segments' })
      }
      return false
    }
  }

  async function setSegmentExportFlag(
    segmentId: number,
    exportSegment: boolean
  ): Promise<boolean> {
    return await updateSegmentAPI(segmentId, { export_segment: exportSegment })
  }

  async function setVideoExportFlag(
    videoId: number,
    exportSegmentsByVideo: boolean
  ): Promise<boolean> {
    try {
      const response: AxiosResponse = await axiosInstance.patch(
        r(`media/videos/${videoId}/`),
        { export_segments_by_video: exportSegmentsByVideo }
      )
      const updatedValue =
        response.data?.export_segments_by_video ??
        response.data?.exportSegmentsByVideo ??
        exportSegmentsByVideo

      const listVideo = videoList.value.videos.find((v) => v.id === videoId)
      if (listVideo) {
        listVideo.exportSegmentsByVideo = Boolean(updatedValue)
      }
      if (videoMeta.value?.id === videoId) {
        videoMeta.value.exportSegmentsByVideo = Boolean(updatedValue)
      }
      return true
    } catch (error) {
      const axiosError = error as AxiosError
      console.error(
        'Error updating video export flag:',
        axiosError.response?.data || axiosError.message
      )
      return false
    }
  }


  async function deleteSegment(segmentId: number): Promise<boolean> {
    try {
      const videoId = currentVideo.value?.id
      if (!videoId) {
        console.error('[VideoStore] Kann Segment nicht löschen: Kein Video ausgewählt')
        return false
      }

      const url = r(`media/videos/${videoId}/segments/${segmentId}/`)
      await axiosInstance.delete(url)

      for (const label in segmentsByLabel) {
        const index = segmentsByLabel[label].findIndex((s) => s.id === segmentId)
        if (index !== -1) {
          segmentsByLabel[label].splice(index, 1)
          break
        }
      }
      syncCurrentVideoSegments(videoId)
      return true
    } catch (error) {
      const axiosError = error as AxiosError
      console.error('Error deleting segment:', axiosError.response?.data || axiosError.message)
      errorMessage.value = 'Error deleting segment. Please try again.'
      return false
    }
  }


  function removeSegment(segmentId: number) {
    const labels = Object.keys(segmentsByLabel)

    for (const label of labels) {
      segmentsByLabel[label] = segmentsByLabel[label].filter((s) => s.id !== segmentId)
    }
    syncCurrentVideoSegments()
  }

  // ===================================================================
  // DRAFT SEGMENT MANAGEMENT
  // ===================================================================

  function startDraft(label: string, startTime: number): void {
    console.log(`[Draft] Starting draft: ${label} at ${formatTime(startTime)}`)
    draftSegment.value = {
      id: nextDraftId--,      // -1, -2, ...
      label,
      startTime,
      endTime: null
    }
    console.log(`[Draft] Created draft segment:`, draftSegment.value)
  }

  function updateDraftEnd(endTime: number): void {
    if (!draftSegment.value) {
      console.warn('[Draft] Kein aktiver Draft gefunden zum Aktualisieren.')
      return
    }

    const minEndTime = draftSegment.value.startTime + MIN_SEGMENT_DURATION
    const clampedEndTime = Math.max(minEndTime, endTime)

    draftSegment.value.endTime = clampedEndTime

    console.log(
      `[Draft] Draft-Ende aktualisiert: ${formatTime(clampedEndTime)}, Duration: ${clampedEndTime - draftSegment.value.startTime}s`
    )
  }

  async function commitDraft(): Promise<Segment | null> {
    console.log(`[Draft] commitDraft() called, draftSegment:`, draftSegment.value)
    console.log(`[Draft] currentVideo:`, currentVideo.value?.id)

    if (!draftSegment.value) {
      console.warn(
        '[Draft] Kein Draft zum Committen gefunden - draftSegment.value ist null/undefined'
      )
      return null
    }

    if (!currentVideo.value) {
      if (activeVideoId.value !== null) {
        console.warn(
          `[Draft] Kein currentVideo gefunden, setze activeVideoId ${activeVideoId.value} als Fallback`
        )
        setCurrentVideo(activeVideoId.value)
      }
    }

    if (!currentVideo.value) {
      console.warn('[Draft] Kein currentVideo gefunden')
      return null
    }

    const draft = draftSegment.value

    if (draft.endTime === null || draft.endTime === undefined) {
      console.error(
        '[Draft] Draft-Ende muss gesetzt sein vor dem Committen. Current endTime:',
        draft.endTime
      )
      return null
    }

    try {
      // Get correct label ID from the store
      const labelMeta = videoList.value.labels.find((l) => l.name === draft.label)
      if (!labelMeta) {
        console.error(`[Draft] Label ${draft.label} not found in store`)
        console.log(
          '[Draft] Available labels:',
          videoList.value.labels.map((l) => l.name)
        )
        errorMessage.value = `Label ${draft.label} nicht gefunden`
        return null
      }

      // Calculate frame numbers correctly
      const fps = getEffectiveFps()
      const startFrame = Math.floor(draft.startTime * fps)
      const endFrame = Math.floor(draft.endTime * fps)

      // Use correct backend API format
      const payload = {
        video_file: parseInt(currentVideo.value.id.toString()),
        label: labelMeta.id, // Use label ID, not name
        start_frame_number: startFrame,
        end_frame_number: endFrame
      }

      console.log('[Draft] Committing Draft-Segment with payload:', payload)

      // Modern media framework - video-specific endpoint
      const videoId = currentVideo.value?.id
      if (!videoId) {
        console.error('[Draft] Cannot commit: no current video')
        return null
      }

      const response: AxiosResponse<CreateSegmentResponse> = await axiosInstance.post(
        r(`media/videos/${videoId}/segments/`),
        payload
      )
      console.log('[Draft] API response:', response.data)

      const newSegment: Segment = {
        id: response.data.id,
        label: draft.label,
        startTime: response.data.startTime,
        endTime: response.data.endTime,
        avgConfidence: 1,
        videoID: parseInt(currentVideo.value.id.toString()),
        labelID: labelMeta.id,
        startFrameNumber: response.data.startFrameNumber,
        endFrameNumber: response.data.endFrameNumber
      }

      // Update currentVideo segments
      if (currentVideo.value?.segments) {
        currentVideo.value.segments.push(newSegment)
        console.log(
          '[Draft] Added segment to currentVideo.segments, new count:',
          currentVideo.value.segments.length
        )
      }

      // Add to segments by label
      const label = draft.label
      if (!segmentsByLabel[label]) {
        segmentsByLabel[label] = []
      }
      segmentsByLabel[label].push(newSegment)
      syncCurrentVideoSegments(videoId)
      console.log(
        '[Draft] Added segment to segmentsByLabel[' + label + '], new count:',
        segmentsByLabel[label].length
      )

      // Clear draft AFTER successful creation
      const draftInfo = { ...draftSegment.value }
      draftSegment.value = null
      console.log(
        '[Draft] Draft erfolgreich committed und gecleared:',
        draftInfo,
        '-> New segment:',
        newSegment
      )

      return newSegment
    } catch (error) {
      console.error('[Draft] Fehler beim Committen des Draft-Segments:', error)
      if (error instanceof AxiosError && error.response?.data) {
        console.error('[Draft] Backend error details:', error.response.data)
      }
      errorMessage.value =
        error instanceof AxiosError
          ? error.response?.data?.detail || error.message || 'Unbekannter Fehler beim Speichern'
          : 'Unbekannter Fehler beim Speichern'
      return null
    }
  }

  function cancelDraft(): void {
    if (!draftSegment.value) {
      console.warn('[Draft] Kein Draft zum Abbrechen gefunden.')
      return
    }

    console.log('[Draft] Draft abgebrochen:', draftSegment.value)
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
    if (!currentVideo.value?.id) return;

    // Filter for segments that have been moved/resized locally
    const dirtySegments = allSegments.value.filter(s => s.isDirty && !s.isDraft);
    if (dirtySegments.length === 0) {
      console.log('[VideoStore] No dirty segments to persist.')
      return;
    }

    console.log(`[VideoStore] Persisting ${dirtySegments.length} dirty segments...`)

    try {
      const videoId = currentVideo.value.id
      let queuedAny = false
      const results = await Promise.all(
        dirtySegments.map(async (segment) => {
          const payload = buildSegmentUpdatePayload(segment.id, {
            startTime: segment.startTime,
            endTime: segment.endTime
          })
          if (!payload) return { ok: false, segment }

          try {
            await updateSegmentWithPayload(videoId, segment.id, payload)
            return { ok: true, segment }
          } catch (error) {
            const axiosError = error as AxiosError
            if (shouldRetrySegmentUpdate(axiosError)) {
              enqueueSegmentUpdate({
                videoId,
                segmentId: segment.id,
                payload,
                attempts: 0
              })
              queuedAny = true
            } else {
              console.error(
                'Error updating segment:',
                axiosError.response?.data || axiosError.message
              )
              toast.error({ text: 'Fehler beim Aktualisieren des Segments' })
            }
            return { ok: false, segment }
          }
        })
      )
      let successCount = 0
      results.forEach(({ ok, segment }) => {
        if (ok) {
          segment.isDirty = false
          successCount += 1
        }
      })

      if (successCount === dirtySegments.length) {
        toast.success({ text: 'Alle Änderungen gespeichert' })
      } else if (queuedAny) {
        toast.info({ text: 'Segment-Updates werden erneut versucht.' })
      } else if (successCount > 0) {
        toast.warning({ text: `${successCount} von ${dirtySegments.length} Segmenten gespeichert` })
      } else {
        toast.error({ text: 'Speichern fehlgeschlagen' })
      }

      if (successCount > 0 && currentVideo.value?.id) {
        syncCurrentVideoSegments(currentVideo.value.id)
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error({text: 'Systemfehler beim Speichern'});
    }
  }

  async function loadVideo(videoId: number): Promise<void> {
    console.log(`[VideoStore] loadVideo called with ID: ${videoId}`)
    activeVideoId.value = Number(videoId)
    
    // 1. Check Anonymization Status (Client-side pre-check)
    const anonStore = useAnonymizationStore()

    if (anonStore.overview.length === 0) {
      console.log('[VideoStore] Anonymization overview empty, fetching...')
      try {
        await anonStore.fetchOverview()
      } catch (error) {
        console.warn('[VideoStore] Failed to fetch anonymization overview, proceeding with caution.')
      }
    }

    const videoItem = anonStore.overview.find(
      (f: FileItem) => f.id === Number(videoId) && f.mediaType === 'video'
    )

    if (
      videoItem &&
      videoItem.anonymizationStatus !== 'done_processing_anonymization' &&
      videoItem.anonymizationStatus !== 'validated'
    ) {
      throw new Error(
        `Video ${videoId} darf nicht annotiert werden, ` +
          `solange die Anonymisierung nicht abgeschlossen ist. (Status: ${videoItem.anonymizationStatus})`
      )
    }

    try {
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
        fps: 50 
      }

      // 3. Parallel Fetching (Optimization)
      // We can fetch Metadata, URL, and Segments simultaneously to speed up loading
      await Promise.all([
        fetchVideoMetadata(videoId), // Gets FPS, Duration, Status
        fetchVideoUrl(videoId),      // Gets Video URL
        fetchAllSegments(videoId)    // Gets Segments
      ])

      console.log(
        `[VideoStore] Video ${videoId} loaded. ` + 
        `Duration: ${currentVideo.value?.duration}s, ` + 
        `FPS: ${currentVideo.value?.fps}, ` +
        `Segments: ${currentVideo.value?.segments?.length}`
      )

    } catch (error) {
      const axiosError = error as AxiosError
      console.error(
        `[VideoStore] Error loading video ${videoId}:`,
        axiosError.response?.data || axiosError.message
      )
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
    hasVideo,
    segments,
    labels,
    videoStreamUrl,
    timelineSegments,
    hasRawVideoFile: readonly(hasRawVideoFile),


    // Actions
    buildVideoStreamUrl,
    setCurrentVideo,
    clearVideo,
    deleteVideo,
    setVideo,
    loadVideo, // Added missing loadVideo export
    fetchVideoUrl,
    fetchAllSegments,
    fetchAllVideos,
    fetchLabels, // Priority label fetching
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
