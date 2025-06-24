import { defineStore } from 'pinia'
import { ref, computed, reactive, readonly, type Ref, type ComputedRef } from 'vue'
import axiosInstance, { r } from '../api/axiosInstance'
import { AxiosError, type AxiosResponse } from 'axios'
import { 
    framesToSeconds, 
    secondsToFrames, 
    safeTimeConversion, 
    formatTime as formatTimeHelper, 
    calculateSegmentWidth, 
    calculateSegmentPosition 
} from '../utils/timeHelpers'
import { 
    convertBackendSegmentToFrontend,
    convertFrontendSegmentToBackend,
    convertBackendSegmentsToFrontend,
    createSegmentUpdatePayload,
    normalizeSegmentToCamelCase,
    debugSegmentConversion,
    type FrontendSegment,
    type BackendSegment
} from '../utils/caseConversion'

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

/**
 * Translation map for label names (German translations)
 */
type LabelKey = 
    | 'appendix' | 'blood' | 'diverticule' | 'grasper' | 'ileocaecalvalve' 
    | 'ileum' | 'low_quality' | 'nbi' | 'needle' | 'outside' 
    | 'polyp' | 'snare' | 'water_jet' | 'wound'

/**
 * Video status types
 */
type VideoStatus = 'in_progress' | 'available' | 'completed'

/**
 * Segment interface for internal store usage
 */
interface Segment extends FrontendSegment {
    id: string | number
    label: string
    label_name: string  // Added: API field for label name
    label_display: string
    startTime: number
    endTime: number
    avgConfidence: number
    video_id?: number
    label_id?: number
    start_frame_number?: number
    end_frame_number?: number
    // Legacy compatibility fields
    start_time?: number
    end_time?: number
}

/**
 * Video annotation interface
 */
interface VideoAnnotation {
    id: string | number
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
interface VideoMeta {
    id: number
    original_file_name: string
    status: string
    assignedUser?: string | null
    anonymized: boolean
    duration?: number
    fps?: number
    hasROI?: boolean // Added to indicate if ROI is defined
    outsideFrameCount?: number // Added to track outside frame count
}

/**
 * Label metadata
 */
interface LabelMeta {
    id: number
    name: string
    color?: string
}

/**
 * Video list response structure
 */
interface VideoList {
    videos: VideoMeta[]
    labels: LabelMeta[]
}

/**
 * Backend video label response structure
 */
interface VideoLabelResponse {
    label: string
    time_segments: Array<{
        segment_start: number
        segment_end: number
        start_time: number
        end_time: number
        frames: Record<string, {
            frame_filename: string
            frame_file_path: string
            predictions: Record<string, number>
        }>
    }>
}

/**
 * Draft segment interface
 */
interface DraftSegment {
    label: string
    label_display: string
    startTime: number
    endTime: number | null
    // Legacy compatibility
    start_time: number
    end_time: number | null
}

/**
 * Draft segment with compatibility properties
 */
interface DraftSegmentCompatible extends DraftSegment {
    start: number
    end: number | null
}

/**
 * Segment option for dropdowns
 */
interface SegmentOption {
    id: string | number
    label: string
    startTime: number
    endTime: number
    display: string
}

/**
 * Segment style object for CSS
 */
interface SegmentStyle {
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
    [key: string]: any
}

/**
 * API response for creating segments
 */
interface CreateSegmentResponse {
    id: number
    label: string
    start_time: number
    end_time: number
    start_frame_number: number
    end_frame_number: number
    video_id: number
    label_id: number
}

/**
 * Upload callback types
 */
type UploadLoadCallback = (serverFileId?: string) => void
type UploadErrorCallback = (message: string) => void

/**
 * Store state interface
 */
interface VideoStoreState {
    currentVideo: Ref<VideoAnnotation | null>
    errorMessage: Ref<string>
    videoUrl: Ref<string>
    segmentsByLabel: Record<string, Segment[]>
    videoList: Ref<VideoList>
    videoMeta: Ref<VideoMeta | null>
    activeSegmentId: Ref<string | number | null>
    _fetchToken: Ref<number>
    draftSegment: Ref<DraftSegment | null>
    concurrencyToken: Ref<string | null>
}

/**
 * Store getters interface
 */
interface VideoStoreGetters {
    hasVideo: ComputedRef<boolean>
    duration: ComputedRef<number>
    segments: ComputedRef<Segment[]>
    labels: ComputedRef<LabelMeta[]>
    allSegments: ComputedRef<Segment[]>
    segmentOptions: ComputedRef<SegmentOption[]>
    activeSegment: ComputedRef<Segment | null>
    draftSegmentCompatible: ComputedRef<DraftSegmentCompatible | null>
}

/**
 * Store actions interface
 */
interface VideoStoreActions {
    // Video management
    clearVideo(): void
    setVideo(video: VideoAnnotation): void
    loadVideo(videoId: string): Promise<void>
    fetchVideoUrl(videoId?: string | number): Promise<void>
    
    // Segment management
    fetchAllSegments(id: string): Promise<void>
    fetchVideoSegments(videoId: string): Promise<void>
    fetchSegmentsByLabel(id: string, label?: string): Promise<void>
    createSegment(videoId: string, labelName: string, startTime: number, endTime: number): Promise<Segment | null>
    updateSegment(segmentId: string | number, updates: SegmentUpdatePayload): Promise<boolean>
    deleteSegment(segmentId: string | number): Promise<boolean>
    
    // Video list management
    fetchAllVideos(): Promise<VideoList>
    
    // Meta management
    fetchVideoMeta(lastId?: string): Promise<any>
    updateSensitiveMeta(payload: any): Promise<boolean>
    clearVideoMeta(): void
    
    // Upload functions
    uploadRevert(uniqueFileId: string, load: UploadLoadCallback, error: UploadErrorCallback): void
    uploadProcess(fieldName: string, file: File, metadata: any, load: UploadLoadCallback, error: UploadErrorCallback): void
    
    // Annotations
    saveAnnotations(): Promise<void>
    
    // Styling and display
    getSegmentStyle(segment: Segment, videoDuration: number): SegmentStyle
    getColorForLabel(label: string): string
    getTranslationForLabel(label: string): string
    jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void
    
    // Active segment management
    setActiveSegment(segmentId: string | number | null): void
    
    // Video status management
    updateVideoStatus(status: VideoStatus): Promise<void>
    assignUserToVideo(user: string): Promise<void>
    
    // Draft segment management
    startDraft(label: string, startTime: number, labelDisplay?: string): void
    updateDraftEnd(endTime: number): void
    commitDraft(): Promise<Segment | null>
    cancelDraft(): void
    createFiveSecondSegment(clickTime: number, label: string): Promise<Segment | null>
    
    // Utility functions
    formatTime(seconds: number): string
    getSegmentOptions(): SegmentOption[]
    clearSegments(): void
}

// ===================================================================
// CONSTANTS
// ===================================================================

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
    wound: 'Wunde',
}

const defaultSegments: Record<string, Segment[]> = {}
const MIN_SEGMENT_DURATION = 1 / 50 // Mindestlänge: 1 Frame bei 50 FPS
const FIVE_SECOND_SEGMENT_DURATION = 5 // 5 Sekunden für Shift-Klick

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
    const _fetchToken = ref<number>(0)
    const draftSegment = ref<DraftSegment | null>(null)
    const concurrencyToken = ref<string | null>(null)

    // ===================================================================
    // COMPUTED PROPERTIES
    // ===================================================================
    
    const draftSegmentCompatible = computed<DraftSegmentCompatible | null>(() => {
        if (!draftSegment.value) return null
        
        return {
            ...draftSegment.value,
            start: draftSegment.value.startTime,
            end: draftSegment.value.endTime,
        }
    })

    const hasVideo = computed<boolean>(() => !!currentVideo.value)

    const duration = computed<number>(() => {
        if (videoMeta.value?.duration) {
            return videoMeta.value.duration
        }
        return 0
    })

    const segments = computed<Segment[]>(() => currentVideo.value?.segments || [])
    
    const labels = computed<LabelMeta[]>(() => videoList.value?.labels || [])

    const allSegments = computed<Segment[]>(() => {
        const segments: Segment[] = [...(currentVideo.value?.segments || [])]
        
        // Add draft segment if exists
        if (draftSegment.value) {
            const draft: Segment = {
                id: 'draft',
                label: draftSegment.value.label,
                label_name: draftSegment.value.label, // Added: Required field for API compatibility
                label_display: draftSegment.value.label_display,
                startTime: draftSegment.value.startTime,
                endTime: draftSegment.value.endTime || draftSegment.value.startTime,
                avgConfidence: 0,
            }
            segments.push(draft)
        }
        
        return segments
    })

    const segmentOptions = computed<SegmentOption[]>(() => 
        allSegments.value.map((segment): SegmentOption => ({
            id: segment.id,
            label: segment.label_display,
            startTime: segment.startTime,
            endTime: segment.endTime,
            display: `${segment.label_display}: ${formatTime(segment.startTime)} – ${formatTime(segment.endTime)}`,
        }))
    )

    const activeSegment = computed<Segment | null>(() => 
        allSegments.value.find(s => s.id === activeSegmentId.value) || null
    )

    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================
    
    function formatTime(seconds: number): string {
        const numSeconds = Number(seconds)
        if (Number.isNaN(numSeconds) || seconds === null || seconds === undefined) {
            return '00:00'
        }
        
        const mins = Math.floor(numSeconds / 60)
        const secs = Math.floor(numSeconds % 60)
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    function getTranslationForLabel(label: string): string {
        return translationMap[label as LabelKey] || label
    }

    function getColorForLabel(label: string): string {
        const colorMap: Record<string, string> = {
            outside: '#e74c3c',
            polyp: '#f39c12',
            needle: '#3498db',
            blood: '#e74c3c',
            snare: '#9b59b6',
            grasper: '#2ecc71',
            water_jet: '#1abc9c',
            appendix: '#f1c40f',
            ileum: '#e67e22',
            diverticule: '#34495e',
            ileocaecalvalve: '#95a5a6',
            nbi: '#8e44ad',
            low_quality: '#7f8c8d',
            wound: '#c0392b',
        }
        return colorMap[label] || '#95a5a6'
    }

    function setActiveSegment(segmentId: string | number | null): void {
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
            backgroundColor: getColorForLabel(segment.label),
        }
    }

    function getEnhancedSegmentStyle(segment: Segment, videoDuration: number): SegmentStyle {
        const baseStyle = getSegmentStyle(segment, videoDuration)
        return {
            ...baseStyle,
            opacity: segment.avgConfidence.toString(),
            border: segment.id === activeSegmentId.value ? '2px solid #fff' : 'none',
        }
    }

    function updateSegment(segmentId: string | number, updates: Partial<Segment>): void {
        for (const label in segmentsByLabel) {
            const segmentIndex = segmentsByLabel[label].findIndex(s => s.id === segmentId)
            if (segmentIndex !== -1) {
                Object.assign(segmentsByLabel[label][segmentIndex], updates)
                break
            }
        }
    }

    function getSegmentOptions(): SegmentOption[] {
        return segmentOptions.value
    }

    function clearSegments(): void {
        Object.keys(segmentsByLabel).forEach(key => {
            delete segmentsByLabel[key]
        })
    }

    // ===================================================================
    // VIDEO META FUNCTIONS
    // ===================================================================
    
    async function fetchVideoMeta(lastId?: string): Promise<any> {
        try {
            const url = lastId ? r(`video/sensitivemeta/?last_id=${lastId}`) : r('video/sensitivemeta/')
            const response: AxiosResponse = await axiosInstance.get(url)
            videoMeta.value = response.data
            return response.data
        } catch (error) {
            console.error('Error fetching video meta:', error)
            return null
        }
    }

    async function updateSensitiveMeta(payload: any): Promise<boolean> {
        try {
            await axiosInstance.patch(r('video/update_sensitivemeta/'), payload)
            return true
        } catch (error) {
            console.error('Error updating sensitive meta:', error)
            return false
        }
    }

    function clearVideoMeta(): void {
        videoMeta.value = null
    }

    // ===================================================================
    // UPLOAD FUNCTIONS
    // ===================================================================
    
    function uploadRevert(
        uniqueFileId: string, 
        load: UploadLoadCallback, 
        error: UploadErrorCallback
    ): void {
        // Implementation for file upload revert
        load()
    }

    function uploadProcess(
        fieldName: string, 
        file: File, 
        metadata: any, 
        load: UploadLoadCallback, 
        error: UploadErrorCallback
    ): void {
        // Implementation for file upload process
        load(file.name)
    }

    // ===================================================================
    // SEGMENT MANAGEMENT FUNCTIONS
    // ===================================================================
    
    async function fetchAllSegments(id: string): Promise<void> {
        await fetchVideoSegments(id)
        
        if (currentVideo.value) {
            const allSegmentsArray: Segment[] = []
            Object.values(segmentsByLabel).forEach(labelSegments => {
                allSegmentsArray.push(...labelSegments)
            })
            
            currentVideo.value.segments = allSegmentsArray
            console.log('Timeline segments populated:', allSegmentsArray.length, 'segments')
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

    function urlFor(path: string): string {
        return r(path)
    }

    async function fetchAllVideos(): Promise<VideoList> {
        console.log('Fetching all videos...')
        try {
            const response: AxiosResponse<VideoList> = await axiosInstance.get(r('videos/'))
            console.log('API Response:', response.data)
            
            // Process videos with enhanced metadata
            const processedVideos: VideoMeta[] = response.data.videos.map((video: any) => ({
                id: parseInt(video.id),
                original_file_name: video.original_file_name,
                status: video.status || 'available',
                assignedUser: video.assignedUser || null,
                anonymized: video.anonymized || false,
                // Add video_url for compatibility if needed
            }))

            // Process labels
            const processedLabels: LabelMeta[] = response.data.labels.map((label: any) => ({
                id: parseInt(label.id),
                name: label.name,
            }))

            // Fetch segments for each video in parallel
            console.log('Fetching segments for', processedVideos.length, 'videos...')
            const videosWithSegments = await Promise.all(
                processedVideos.map(async (video) => {
                    try {
                        const segmentsResponse = await axiosInstance.get(r(`video-segments/?video_id=${video.id}`))
                        console.log(`Video ${video.id}: Found ${segmentsResponse.data.length} segments`)
                        
                        const segments: Segment[] = segmentsResponse.data.map((segment: any) => ({
                            id: segment.id,
                            label: segment.label_name || `label_${segment.label_id}`,
                            label_name: segment.label_name, // Added: Include label_name from API
                            label_display: getTranslationForLabel(segment.label_name || 'unknown'),
                            startTime: segment.start_time || framesToSeconds(segment.start_frame_number, 30),
                            endTime: segment.end_time || framesToSeconds(segment.end_frame_number, 30),
                            start_time: segment.start_time || framesToSeconds(segment.start_frame_number, 30),
                            end_time: segment.end_time || framesToSeconds(segment.end_frame_number, 30),
                            avgConfidence: 1,
                            video_id: parseInt(video.id.toString()),
                            label_id: segment.label_id,
                            start_frame_number: segment.start_frame_number,
                            end_frame_number: segment.end_frame_number,
                        }))

                        return { ...video, segments }
                    } catch (segmentError) {
                        console.warn(`Failed to load segments for video ${video.id}:`, segmentError)
                        return { ...video, segments: [] }
                    }
                })
            )

            videoList.value = {
                videos: videosWithSegments,
                labels: processedLabels,
            }

            console.log("✅ Processed videos with segments:", videoList.value)
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
    }

    function setVideo(video: VideoAnnotation): void {
        currentVideo.value = video
    }

    async function fetchVideoUrl(videoId?: string | number): Promise<void> {
        try {
            const id = videoId || currentVideo.value?.id
            if (!id) {
                console.warn("No video ID available for fetching video URL")
                errorMessage.value = "No video selected."
                return
            }

            const response: AxiosResponse = await axiosInstance.get(
                r(`video/${id}/`), 
                { headers: { 'Accept': 'application/json' } }
            )
            
            if (response.data.video_url) {
                videoUrl.value = response.data.video_url
                console.log("Fetched video URL:", videoUrl.value)
            } else {
                console.warn("No video URL returned from API response:", response.data)
                errorMessage.value = "Video URL not available."
            }
        } catch (error) {
            const axiosError = error as AxiosError
            console.error("Error loading video URL:", axiosError.response?.data || axiosError.message)
            errorMessage.value = "Error loading video URL. Please check the API endpoint or try again later."
        }
    }

    async function fetchSegmentsByLabel(id: string, label = 'outside'): Promise<void> {
        try {
            const response: AxiosResponse<VideoLabelResponse> = await axiosInstance.get(
                r(`video/${id}/label/${label}/`), 
                { headers: { 'Accept': 'application/json' } }
            )
            
            console.log(`[video ${id}] API response for label ${label}:`, response.data)

            const segmentsForLabel: Segment[] = response.data.time_segments.map((segment, index) => {
                const startTime = Number(segment.start_time ?? segment.segment_start ?? 0)
                const endTime = Number(segment.end_time ?? segment.segment_end ?? 0)
                
                return {
                    id: `temp-${label}-${Date.now()}-${index}`,
                    label: response.data.label,
                    label_name: response.data.label, // Added: Required field for API compatibility
                    label_display: getTranslationForLabel(response.data.label),
                    startTime,
                    endTime,
                    avgConfidence: 1,
                    start_frame_number: segment.segment_start,
                    end_frame_number: segment.segment_end,
                }
            })

            if (segmentsForLabel.length > 0 && Number.isNaN(segmentsForLabel[0]?.startTime)) {
                console.warn(`[video ${id}] ${label}: start/endTime missing or NaN`, response.data)
            }

            console.log(`[video ${id}] Mapped ${segmentsForLabel.length} segments for label ${label}:`, segmentsForLabel)
            Object.assign(segmentsByLabel, { ...segmentsByLabel, [label]: segmentsForLabel })
        } catch (error) {
            const axiosError = error as AxiosError
            console.error("Error loading segments for label " + label + ":", axiosError.response?.data || axiosError.message)
            errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`
        }
    }

    async function fetchVideoSegments(videoId: string): Promise<void> {
        const token = ++_fetchToken.value
        try {
            const response: AxiosResponse<BackendSegment[]> = await axiosInstance.get(
                r(`video-segments/?video_id=${videoId}`), 
                { headers: { 'Accept': 'application/json' } }
            )
            
            if (token !== _fetchToken.value) return

            // Clear existing segments
            Object.keys(segmentsByLabel).forEach(key => {
                delete segmentsByLabel[key]
            })

            console.log(`[VideoStore] Loading ${response.data.length} segments for video ${videoId}`)

            const frontendSegments: FrontendSegment[] = convertBackendSegmentsToFrontend(response.data)

            if (process.env.NODE_ENV === 'development') {
                console.log('[VideoStore] Segment conversion examples:')
                response.data.slice(0, 2).forEach((backend, index) => {
                    debugSegmentConversion(backend, frontendSegments[index], 'toFrontend')
                })
            }

            // Group segments by label
            frontendSegments.forEach((segment) => {
                const segmentWithVideoId = segment as Segment
                segmentWithVideoId.video_id = parseInt(videoId)
                segmentWithVideoId.label_display = getTranslationForLabel(segment.label)
                
                const labelName = segment.label
                if (!segmentsByLabel[labelName]) {
                    segmentsByLabel[labelName] = []
                }

                if (segment.endTime - segment.startTime < 0.1) {
                    console.warn(`⚠️ Very short segment ${segment.id}: ${segment.endTime - segment.startTime}s`)
                }
                segmentsByLabel[labelName].push(segmentWithVideoId)
                segmentsByLabel[labelName].push(segment as Segment)
            })

            console.log(`[VideoStore] Processed segments by label:`, 
                Object.keys(segmentsByLabel).map(label => `${label}: ${segmentsByLabel[label].length}`)
            )
        } catch (error) {
            if (token === _fetchToken.value) {
                const axiosError = error as AxiosError
                console.error("Error loading video segments:", axiosError.response?.data || axiosError.message)
                errorMessage.value = "Error loading video segments. Please try again later."
            }
        }
    }

    async function createSegment(
        videoId: string, 
        labelName: string, 
        startTime: number, 
        endTime: number
    ): Promise<Segment | null> {
        try {
            // Get label ID first
            const labelResponse: AxiosResponse = await axiosInstance.get(r(`labels/?name=${labelName}`))
            const labelId = labelResponse.data.results?.[0]?.id
            
            if (!labelId) {
                console.error(`Label ${labelName} not found`)
                errorMessage.value = `Label ${labelName} not found`
                return null
            }

            const fps = duration.value > 0 ? (videoMeta.value?.fps || 30) : 30
            const startFrame = Math.floor(startTime * fps)
            const endFrame = Math.floor(endTime * fps)
            
            const segmentData = {
                video_file: parseInt(videoId),
                label: labelId,
                start_frame_number: startFrame,
                end_frame_number: endFrame,
            }

            const response: AxiosResponse<CreateSegmentResponse> = await axiosInstance.post(
                r('video-segments/'), 
                segmentData
            )

            const newSegment: Segment = {
                id: response.data.id,
                label: labelName,
                label_name: labelName, // Added: Required field for API compatibility
                label_display: getTranslationForLabel(labelName),
                startTime: response.data.start_time,
                endTime: response.data.end_time,
                avgConfidence: 1,
                video_id: parseInt(videoId),
                label_id: labelId,
                start_frame_number: response.data.start_frame_number,
                end_frame_number: response.data.end_frame_number,
            }

            if (!segmentsByLabel[labelName]) {
                segmentsByLabel[labelName] = []
            }
            segmentsByLabel[labelName].push(newSegment)

            console.log('Created segment:', newSegment)
            return newSegment
        } catch (error) {
            const axiosError = error as AxiosError
            console.error("Error creating segment:", axiosError.response?.data || axiosError.message)
            errorMessage.value = "Error creating segment. Please try again."
            return null
        }
    }

    async function updateSegmentAPI(
        segmentId: string | number, 
        updates: SegmentUpdatePayload
    ): Promise<boolean> {
        try {
            console.log(`[VideoStore] Updating segment ${segmentId} with:`, updates)

            const updatePayload = createSegmentUpdatePayload(
                segmentId,
                (updates.startTime || updates.start_time) ?? 0,
                (updates.endTime || updates.end_time) ?? 0,
                updates
            )

            if (process.env.NODE_ENV === 'development') {
                debugSegmentConversion(updates, updatePayload, 'toBackend')
            }

            const response: AxiosResponse<BackendSegment> = await axiosInstance.patch(
                r(`video-segments/${segmentId}/`), 
                updatePayload
            )
            
            const updatedSegment = convertBackendSegmentToFrontend(response.data)
            updateSegment(segmentId, updatedSegment)

            console.log(`[VideoStore] Successfully updated segment ${segmentId}`)
            return true
        } catch (error) {
            const axiosError = error as AxiosError
            console.error("Error updating segment:", axiosError.response?.data || axiosError.message)
            errorMessage.value = "Error updating segment. Please try again."
            return false
        }
    }

    async function deleteSegment(segmentId: string | number): Promise<boolean> {
        try {
            await axiosInstance.delete(r(`video-segments/${segmentId}/`))
            
            for (const label in segmentsByLabel) {
                const index = segmentsByLabel[label].findIndex(s => s.id === segmentId)
                if (index !== -1) {
                    segmentsByLabel[label].splice(index, 1)
                    break
                }
            }
            return true
        } catch (error) {
            const axiosError = error as AxiosError
            console.error("Error deleting segment:", axiosError.response?.data || axiosError.message)
            errorMessage.value = "Error deleting segment. Please try again."
            return false
        }
    }

    // ===================================================================
    // DRAFT SEGMENT MANAGEMENT
    // ===================================================================
    
    function startDraft(label: string, startTime: number, labelDisplay?: string): void {
        if (draftSegment.value) {
            console.warn('Draft bereits aktiv. Verwende cancelDraft() zuerst.')
            return
        }
        
        draftSegment.value = {
            label,
            label_display: labelDisplay || getTranslationForLabel(label),
            startTime,
            endTime: null,
            start_time: startTime,
            end_time: null,
        }
        
        console.log(`Draft gestartet: ${label} bei ${formatTime(startTime)}`)
    }

    function updateDraftEnd(endTime: number): void {
        if (!draftSegment.value) {
            console.warn('Kein aktiver Draft gefunden.')
            return
        }
        
        const minEndTime = draftSegment.value.startTime + MIN_SEGMENT_DURATION
        const clampedEndTime = Math.max(minEndTime, endTime)
        
        draftSegment.value.endTime = clampedEndTime
        draftSegment.value.end_time = clampedEndTime
        
        console.log(`Draft-Ende aktualisiert: ${formatTime(clampedEndTime)}`)
    }

    async function commitDraft(): Promise<Segment | null> {
        if (!draftSegment.value || !currentVideo.value) {
            console.warn('Kein Draft zum Committen gefunden.')
            return null
        }
        
        const draft = draftSegment.value
        
        if (draft.endTime === null) {
            console.error('Draft-Ende muss gesetzt sein vor dem Committen.')
            return null
        }
        
        try {
            const segmentData = {
                label: draft.label,
                startTime: draft.startTime,
                endTime: draft.endTime,
                start_frame_number: Math.round(draft.startTime * 50),
                end_frame_number: Math.round(draft.endTime * 50),
                video: currentVideo.value.id,
            }
            
            console.log('Committe Draft-Segment:', segmentData)
            
            const response = await fetch('/api/video-segments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(concurrencyToken.value && {
                        'X-Concurrency-Token': concurrencyToken.value
                    }),
                },
                body: JSON.stringify(segmentData),
            })
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
            }
            
            const newSegment: Segment = await response.json()
            
            if (currentVideo.value?.segments) {
                currentVideo.value.segments.push(newSegment)
            }
            
            draftSegment.value = null
            console.log('Draft erfolgreich committed:', newSegment)
            return newSegment
        } catch (error) {
            console.error('Fehler beim Committen des Draft-Segments:', error)
            errorMessage.value = error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern'
            return null
        }
    }

    function cancelDraft(): void {
        if (!draftSegment.value) {
            console.warn('Kein Draft zum Abbrechen gefunden.')
            return
        }
        
        console.log('Draft abgebrochen:', draftSegment.value)
        draftSegment.value = null
    }

    async function createFiveSecondSegment(clickTime: number, label: string): Promise<Segment | null> {
        const startTime = clickTime
        const endTime = Math.min(
            clickTime + FIVE_SECOND_SEGMENT_DURATION, 
            duration.value || clickTime + FIVE_SECOND_SEGMENT_DURATION
        )
        
        startDraft(label, startTime)
        updateDraftEnd(endTime)
        return await commitDraft()
    }

    async function loadVideo(videoId: string): Promise<void> {
        try {
            const response: AxiosResponse = await axiosInstance.get(r(`video/${videoId}/`))
            const videoData = response.data
            
            currentVideo.value = {
                id: videoData.id,
                videoUrl: videoData.video_url || '',
                status: videoData.status || 'available',
                assignedUser: videoData.assignedUser || null,
                isAnnotated: videoData.isAnnotated || false,
                errorMessage: '',
                segments: videoData.segments || [],
                duration: videoData.duration,
                fps: videoData.fps,
            }
            
            await fetchVideoUrl(parseInt(videoId))
            console.log('Video loaded:', currentVideo.value)
        } catch (error) {
            const axiosError = error as AxiosError
            console.error("Error loading video:", axiosError.response?.data || axiosError.message)
            errorMessage.value = "Error loading video. Please try again."
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
        allSegments,
        draftSegment: readonly(draftSegmentCompatible),
        activeSegment,
        duration,
        hasVideo,
        segments,
        labels,
        
        // Actions
        clearVideo,
        setVideo,
        fetchVideoUrl,
        fetchAllSegments,
        fetchAllVideos,
        fetchVideoMeta,
        fetchVideoSegments,
        createSegment,
        updateSegment: updateSegmentAPI,
        deleteSegment,
        saveAnnotations,
        uploadRevert,
        uploadProcess,
        getSegmentStyle,
        getColorForLabel,
        getTranslationForLabel,
        jumpToSegment,
        setActiveSegment,
        updateVideoStatus,
        assignUserToVideo,
        
        // Draft actions
        startDraft,
        updateDraftEnd,
        commitDraft,
        cancelDraft,
        createFiveSecondSegment,
        
        // Helper functions
        formatTime,
        getSegmentOptions,
        clearSegments,
        loadVideo,
    }
})

// ===================================================================
// HELPER FUNCTIONS (outside store)
// ===================================================================

/**
 * Core segment transformation function for backward compatibility
 * @deprecated Use conversion utilities from caseConversion.ts instead
 */
function transformBackendSegmentToTimeline(backendSegment: any, fps = 50): Segment {
    const startTime = backendSegment.start_time ?? framesToSeconds(backendSegment.start_frame_number, fps)
    const endTime = backendSegment.end_time ?? framesToSeconds(backendSegment.end_frame_number, fps)
    
    return {
        id: backendSegment.id,
        label: backendSegment.label_name,
        label_name: backendSegment.label_name, // Added: Required field for API compatibility
        label_display: translationMap[backendSegment.label_name as LabelKey] || backendSegment.label_name,
        startTime,
        endTime,
        start_time: startTime,
        end_time: endTime,
        avgConfidence: 1,
        video_id: undefined,
        label_id: backendSegment.label_id,
        start_frame_number: backendSegment.start_frame_number,
        end_frame_number: backendSegment.end_frame_number,
    }
}

// ===================================================================
// TYPE EXPORTS
// ===================================================================

export type {
    Segment,
    VideoAnnotation,
    VideoMeta,
    LabelMeta,
    VideoList,
    DraftSegment,
    SegmentOption,
    SegmentStyle,
    VideoStatus,
    LabelKey
}