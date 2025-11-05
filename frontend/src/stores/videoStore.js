import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import axiosInstance, { a, r } from '../api/axiosInstance';
import { AxiosError } from 'axios';
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils';
import { convertBackendSegmentToFrontend, convertBackendSegmentsToFrontend, createSegmentUpdatePayload, debugSegmentConversion } from '../utils/caseConversion';
import { useAnonymizationStore } from './anonymizationStore';
// ===================================================================
// CONSTANTS
// ===================================================================
const videos = ref([]);
const translationMap = {
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
};
const defaultSegments = {};
const MIN_SEGMENT_DURATION = 1 / 50; // Mindestlänge: 1 Frame bei 50 FPS
const FIVE_SECOND_SEGMENT_DURATION = 5; // 5 Sekunden für Shift-Klick
// ===================================================================
// STORE IMPLEMENTATION
// ===================================================================
export const useVideoStore = defineStore('video', () => {
    // ===================================================================
    // STATE
    // ===================================================================
    const currentVideo = ref(null);
    const errorMessage = ref('');
    const videoUrl = ref('');
    const segmentsByLabel = reactive({ ...defaultSegments });
    const videoList = ref({ videos: [], labels: [] });
    const videoMeta = ref(null);
    const activeSegmentId = ref(null);
    const _fetchToken = ref(0);
    const draftSegment = ref(null);
    const concurrencyToken = ref(null);
    const hasRawVideoFile = ref(null);
    function buildVideoStreamUrl(id) {
        const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        return `${base}/api/media/videos/${id}/`;
    }
    // ===================================================================
    // COMPUTED PROPERTIES
    // ===================================================================
    const draftSegmentCompatible = computed(() => {
        if (!draftSegment.value)
            return null;
        return {
            ...draftSegment.value,
            start: draftSegment.value.startTime,
            end: draftSegment.value.endTime
        };
    });
    const hasVideo = computed(() => !!currentVideo.value);
    const duration = computed(() => {
        if (videoMeta.value?.duration) {
            return videoMeta.value.duration;
        }
        return 0;
    });
    const segments = computed(() => currentVideo.value?.segments || []);
    const labels = computed(() => videoList.value?.labels || []);
    // ✅ NEW: Fast lookup table für Label-Namen zu IDs (wird nur einmal berechnet)
    // maps 'polyp' → 3  |  'blood' → 7 ...
    const labelIdMap = computed(() => {
        const map = {};
        videoList.value.labels.forEach((l) => (map[l.name] = l.id));
        return map;
    });
    // ✅ NEW: Helper function to ensure labelID is always set correctly
    function ensureLabelId(segment) {
        return {
            ...segment,
            labelID: segment.labelID ?? labelIdMap.value[segment.label] ?? null
        };
    }
    const allSegments = computed(() => {
        const segments = [...(currentVideo.value?.segments || [])];
        // Add draft segment if exists
        if (draftSegment.value) {
            const draft = {
                id: draftSegment.value.id,
                label: draftSegment.value.label,
                startTime: draftSegment.value.startTime,
                endTime: draftSegment.value.endTime || draftSegment.value.startTime,
                avgConfidence: 0
            };
            segments.push(draft);
        }
        return segments;
    });
    const segmentOptions = computed(() => allSegments.value.map((segment) => ({
        id: segment.id,
        label: getTranslationForLabel(segment.label),
        startTime: segment.startTime,
        endTime: segment.endTime,
        display: `${getTranslationForLabel(segment.label)}: ${formatTime(segment.startTime)} – ${formatTime(segment.endTime)}`
    })));
    const activeSegment = computed(() => allSegments.value.find((s) => s.id === activeSegmentId.value) || null);
    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================
    /**
      Deletes a Video using the force-removal endpoint
      */
    async function deleteVideo(videoId) {
        if (!videoId) {
            videoId = currentVideo.value?.id || null;
        }
        if (!videoId) {
            console.error(`Invalid video ID: ${videoId}`);
            return false;
        }
        try {
            await axiosInstance.delete(`/api/media-management/${videoId}/force-remove/`);
            return true;
        }
        catch (error) {
            console.error(`Failed to delete video ${videoId}:`, error);
            return false;
        }
    }
    /**
     * Maps a BackendTimeSegment to our internal Segment format (lossless conversion)
     * Preserves all frame data for later lazy loading and calculates average confidence
     * from all frame predictions within the segment
     */
    function mapBackendTimeSegment(backendSegment, label) {
        const labelId = labelIdMap.value[label] ?? null;
        // Calculate average confidence from all frames in the segment
        let avgConfidence = 1; // Default fallback confidence
        if (backendSegment.frames && Object.keys(backendSegment.frames).length > 0) {
            const frameNumbers = Object.keys(backendSegment.frames).map(Number);
            const segmentStartFrame = backendSegment.segment_start;
            const segmentEndFrame = backendSegment.segment_end;
            // Filter frames that are within the segment boundaries
            const framesInSegment = frameNumbers.filter((frameNum) => frameNum >= segmentStartFrame && frameNum <= segmentEndFrame);
            if (framesInSegment.length > 0) {
                // Calculate average confidence from frame predictions within segment
                let totalConfidence = 0;
                let validPredictions = 0;
                framesInSegment.forEach((frameNum) => {
                    const frame = backendSegment.frames[frameNum.toString()];
                    if (frame?.predictions?.confidence !== undefined) {
                        totalConfidence += frame.predictions.confidence;
                        validPredictions++;
                    }
                });
                if (validPredictions > 0) {
                    avgConfidence = totalConfidence / validPredictions;
                    console.log(`Segment ${backendSegment.segment_id}: Calculated avg confidence ${avgConfidence.toFixed(3)} from ${validPredictions} frame predictions (frames ${segmentStartFrame}-${segmentEndFrame})`);
                }
                else {
                    console.warn(`Segment ${backendSegment.segment_id}: No valid predictions found in frames ${segmentStartFrame}-${segmentEndFrame}`);
                }
            }
            else {
                console.warn(`Segment ${backendSegment.segment_id}: No frames found within segment boundaries ${segmentStartFrame}-${segmentEndFrame}`);
            }
        }
        else {
            console.warn(`Segment ${backendSegment.segment_id}: No frame data available for confidence calculation`);
        }
        return {
            id: backendSegment.segment_id,
            label: label,
            startTime: backendSegment.start_time,
            endTime: backendSegment.end_time,
            avgConfidence: avgConfidence,
            labelID: labelId,
            startFrameNumber: backendSegment.segment_start,
            endFrameNumber: backendSegment.segment_end,
            // Store frame data for future lazy loading
            frames: backendSegment.frames
        };
    }
    function setActiveSegment(segmentId) {
        activeSegmentId.value = segmentId;
    }
    function jumpToSegment(segment, videoElement) {
        if (videoElement && segment.startTime) {
            videoElement.currentTime = segment.startTime;
            videoElement.play().catch(console.error);
        }
    }
    function getSegmentStyle(segment, videoDuration) {
        const startPercent = (segment.startTime / videoDuration) * 100;
        const widthPercent = ((segment.endTime - segment.startTime) / videoDuration) * 100;
        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
            backgroundColor: getColorForLabel(segment.label)
        };
    }
    function getEnhancedSegmentStyle(segment, videoDuration) {
        const baseStyle = getSegmentStyle(segment, videoDuration);
        return {
            ...baseStyle,
            opacity: segment.avgConfidence.toString(),
            border: segment.id === activeSegmentId.value ? '2px solid #fff' : 'none'
        };
    }
    function updateSegment(segmentId, updates) {
        for (const label in segmentsByLabel) {
            const segmentIndex = segmentsByLabel[label].findIndex((s) => s.id === segmentId);
            if (segmentIndex !== -1) {
                Object.assign(segmentsByLabel[label][segmentIndex], updates);
                break;
            }
        }
    }
    function getSegmentOptions() {
        return segmentOptions.value;
    }
    function clearSegments() {
        Object.keys(segmentsByLabel).forEach((key) => {
            delete segmentsByLabel[key];
        });
    }
    // ===================================================================
    // VIDEO META FUNCTIONS
    // ===================================================================
    async function fetchVideoMeta(lastId) {
        try {
            // TODO: Migrate to new media framework URL when backend supports it
            const url = lastId ? r(`video/media/${lastId}`) : r('video/sensitivemeta/');
            const response = await axiosInstance.get(url);
            videoMeta.value = response.data;
            return response.data;
        }
        catch (error) {
            console.error('Error fetching video meta:', error);
            return null;
        }
    }
    async function updateSensitiveMeta(payload) {
        try {
            await axiosInstance.patch(r('media/videos/${payload.id}/'), payload);
            return true;
        }
        catch (error) {
            console.error('Error updating sensitive meta:', error);
            return false;
        }
    }
    function clearVideoMeta() {
        videoMeta.value = null;
    }
    // ===================================================================
    // UPLOAD FUNCTIONS
    // ===================================================================
    function uploadRevert(uniqueFileId, load, error) {
        // Implementation for file upload revert
        load();
    }
    function uploadProcess(fieldName, file, metadata, load, error) {
        // Implementation for file upload process
        load(file.name);
    }
    // ===================================================================
    // SEGMENT MANAGEMENT FUNCTIONS
    // ===================================================================
    async function fetchAllSegments(id) {
        console.log(`[VideoStore] fetchAllSegments called with video ID: ${id}`);
        // ✅ FIX: Ensure currentVideo exists before loading segments
        if (!currentVideo.value) {
            console.log(`[VideoStore] No currentVideo found, creating basic video object for ID: ${id}`);
            currentVideo.value = {
                id: id,
                isAnnotated: false,
                errorMessage: '',
                segments: [],
                videoUrl: '',
                status: 'available',
                assignedUser: null
            };
        }
        await fetchVideoSegments(id);
        if (currentVideo.value) {
            const allSegmentsArray = [];
            Object.values(segmentsByLabel).forEach((labelSegments) => {
                allSegmentsArray.push(...labelSegments);
            });
            currentVideo.value.segments = allSegmentsArray;
            console.log(`[VideoStore] Timeline segments populated: ${allSegmentsArray.length} segments for video ${id}`);
        }
    }
    async function saveAnnotations() {
        console.log('Saving annotations...');
    }
    async function updateVideoStatus(status) {
        if (currentVideo.value) {
            currentVideo.value.status = status;
        }
    }
    async function assignUserToVideo(user) {
        if (currentVideo.value) {
            currentVideo.value.assignedUser = user;
        }
    }
    function urlFor(path) {
        return r(path);
    }
    /**
     * ✅ NEW: Fetch labels independently and with high priority
     * This ensures labels are always available before videos are loaded
     */
    async function fetchLabels() {
        console.log('🏷️ [VideoStore] Fetching labels with high priority...');
        try {
            const response = await axiosInstance.get(r('videos/'));
            const processedLabels = response.data.labels.map((label) => ({
                id: parseInt(label.id),
                name: label.name,
                color: label.color || getColorForLabel(label.name)
            }));
            // ✅ Update labels immediately in store
            videoList.value.labels = processedLabels;
            console.log(`✅ [VideoStore] Loaded ${processedLabels.length} labels:`, processedLabels.map(l => l.name).join(', '));
            return processedLabels;
        }
        catch (error) {
            console.error('❌ Error loading labels:', error);
            videoList.value.labels = [];
            throw error;
        }
    }
    async function fetchAllVideos() {
        console.log('Fetching all videos...');
        try {
            // ✅ PRIORITY: Fetch labels first before processing videos
            await fetchLabels();
            const response = await axiosInstance.get(r('videos/'));
            console.log('API Response:', response.data);
            // Process videos with enhanced metadata
            const processedVideos = response.data.videos.map((video) => ({
                id: parseInt(video.id),
                original_file_name: video.original_file_name,
                status: video.status || 'available',
                assignedUser: video.assignedUser || null,
                anonymized: video.anonymized || false,
                centerName: video.center_name || 'Unbekannt',
                processorName: video.processor_name || 'Unbekannt'
            }));
            // Labels already fetched and stored above
            const processedLabels = videoList.value.labels;
            // Fetch segments for each video in parallel
            console.log('Fetching segments for', processedVideos.length, 'videos...');
            const videosWithSegments = await Promise.all(processedVideos.map(async (video) => {
                try {
                    // Modern media framework endpoint
                    const segmentsResponse = await axiosInstance.get(r(`media/videos/${video.id}/segments/`));
                    console.log(`Video ${video.id}: Found ${segmentsResponse.data.length} segments`);
                    const backendSegments = segmentsResponse.data;
                    const frontendSegments = convertBackendSegmentsToFrontend(backendSegments);
                    const segments = frontendSegments.map((segment) => ensureLabelId({
                        id: segment.id,
                        label: segment.label,
                        startTime: segment.startTime,
                        endTime: segment.endTime,
                        avgConfidence: 1,
                        videoID: parseInt(video.id.toString()),
                        labelID: labelIdMap.value[segment.label] ?? null
                    }));
                    return { ...video, segments };
                }
                catch (segmentError) {
                    console.warn(`Failed to load segments for video ${video.id}:`, segmentError);
                    return { ...video, segments: [] };
                }
            }));
            videoList.value = {
                videos: videosWithSegments,
                labels: processedLabels
            };
            console.log('✅ Processed videos with segments:', videoList.value);
            return videoList.value;
        }
        catch (error) {
            console.error('Error loading videos:', error);
            videoList.value = { videos: [], labels: [] };
            throw error;
        }
    }
    // ===================================================================
    // VIDEO ACTIONS
    // ===================================================================
    function clearVideo() {
        currentVideo.value = null;
    }
    function setVideo(video) {
        currentVideo.value = video;
    }
    function setCurrentVideo(videoId) {
        const video = videoList.value.videos.find((v) => v.id === videoId) || null;
        if (video) {
            currentVideo.value = {
                id: video.id,
                isAnnotated: true,
                errorMessage: '',
                segments: [],
                videoUrl: buildVideoStreamUrl(video.id) + '?type=processed',
                status: video.status,
                assignedUser: video.assignedUser || null
            };
        }
        else {
            currentVideo.value = null;
        }
        return currentVideo.value;
    }
    async function fetchVideoUrl(videoId) {
        try {
            const id = videoId || currentVideo.value?.id;
            if (!id) {
                console.warn('No video ID available for fetching video URL');
                errorMessage.value = 'No video selected.';
                return;
            }
            // ✅ MIGRATED: Use new media framework URL
            const response = await axiosInstance.get(r(`media/videos/${id}/`), {
                headers: { Accept: 'application/json' }
            });
            if (response.data.video_url) {
                videoUrl.value = response.data.video_url;
                console.log('Fetched video URL:', videoUrl.value);
            }
            else {
                console.warn('No video URL returned from API response:', response.data);
                errorMessage.value = 'Video URL not available.';
            }
        }
        catch (error) {
            const axiosError = error;
            console.error('Error loading video URL:', axiosError.response?.data || axiosError.message);
            errorMessage.value =
                'Error loading video URL. Please check the API endpoint or try again later.';
        }
    }
    const videoStreamUrl = computed(() => currentVideo.value ? buildVideoStreamUrl(currentVideo.value.id) + '?type=processed' : '');
    function hasRawVideoFileFn() {
        if (!currentVideo.value?.id) {
            hasRawVideoFile.value = null;
            return;
        }
        const videoId = currentVideo.value.id;
        axiosInstance
            .get(r(`anonymization/${videoId}/has-raw/`))
            .then((response) => {
            hasRawVideoFile.value = response.data.has_raw_file;
            console.log(`Raw video file for ID ${videoId}:`, hasRawVideoFile.value);
        })
            .catch((error) => {
            console.error('Error checking raw video file:', error);
            hasRawVideoFile.value = null;
        });
    }
    async function fetchSegmentsByLabel(id, label = 'outside') {
        try {
            // ✅ MIGRATED: Use new media framework URL for label-specific segments
            const response = await axiosInstance.get(r(`videos/${id}/labels/${label}/`), {
                headers: { Accept: 'application/json' }
            });
            console.log(`[video ${id}] API response for label ${label}:`, response.data);
            // Map all BackendTimeSegments to internal Segment format
            const segmentsForLabel = response.data.time_segments.map((backendSegment) => mapBackendTimeSegment(backendSegment, label));
            console.log(`[video ${id}] Mapped ${segmentsForLabel.length} segments for label ${label}`);
            // Store segments directly by label (no Object.assign)
            segmentsByLabel[label] = segmentsForLabel;
            // Update currentVideo.segments with all segments from all labels
            if (currentVideo.value) {
                currentVideo.value.segments = Object.values(segmentsByLabel).flat();
            }
        }
        catch (error) {
            const axiosError = error;
            console.error('Error loading segments for label ' + label + ':', axiosError.response?.data || axiosError.message);
            errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`;
        }
    }
    async function fetchVideoSegments(videoId) {
        const token = ++_fetchToken.value;
        try {
            // Modern media framework endpoint
            const response = await axiosInstance.get(r(`media/videos/${videoId}/segments/`), { headers: { Accept: 'application/json' } });
            if (token !== _fetchToken.value)
                return;
            // Clear existing segments
            Object.keys(segmentsByLabel).forEach((key) => {
                delete segmentsByLabel[key];
            });
            console.log(`[VideoStore] Loading ${response.data.length} segments for video ${videoId}`);
            const frontendSegments = convertBackendSegmentsToFrontend(response.data);
            if (process.env.NODE_ENV === 'development') {
                console.log('[VideoStore] Segment conversion examples:');
                response.data.slice(0, 2).forEach((backend, index) => {
                    debugSegmentConversion(backend, frontendSegments[index], 'toFrontend');
                });
            }
            // Process segments and ensure labelID is always set correctly
            frontendSegments.forEach((segment) => {
                const segmentWithVideoId = ensureLabelId({
                    id: segment.id,
                    label: segment.label,
                    startTime: segment.startTime,
                    endTime: segment.endTime,
                    avgConfidence: 1,
                    videoID: videoId,
                    labelID: labelIdMap.value[segment.label] ?? null
                });
                const label = segment.label;
                if (!segmentsByLabel[label]) {
                    segmentsByLabel[label] = [];
                }
                if (segment.endTime - segment.startTime < 0.1) {
                    console.warn(`⚠️ Very short segment ${segment.id}: ${segment.endTime - segment.startTime}s`);
                }
                segmentsByLabel[label].push(segmentWithVideoId);
            });
            console.log(`[VideoStore] Processed segments by label:`, Object.keys(segmentsByLabel).map((label) => `${label}: ${segmentsByLabel[label].length}`));
        }
        catch (error) {
            if (token === _fetchToken.value) {
                const axiosError = error;
                console.error('Error loading video segments:', axiosError.response?.data || axiosError.message);
                errorMessage.value = 'Error loading video segments. Please try again later.';
            }
        }
    }
    async function createSegment(videoId, label, startTime, endTime) {
        try {
            // Get label ID from existing labels in store
            const labelMeta = videoList.value.labels.find((l) => l.name === label);
            if (!labelMeta) {
                console.error(`Label ${label} not found in store`);
                errorMessage.value = `Label ${label} nicht gefunden`;
                return null;
            }
            const labelId = labelMeta.id;
            const fps = duration.value > 0 ? videoMeta.value?.fps || 30 : 30;
            const startFrame = Math.floor(startTime * fps);
            const endFrame = Math.floor(endTime * fps);
            const segmentData = {
                video_file: parseInt(videoId),
                label: labelId,
                start_frame_number: startFrame,
                end_frame_number: endFrame
            };
            // Modern media framework endpoint - video-specific
            const response = await axiosInstance.post(r(`media/videos/${videoId}/segments/`), segmentData);
            const newSegment = {
                id: response.data.id,
                label: label,
                startTime: response.data.start_time,
                endTime: response.data.end_time,
                avgConfidence: 1,
                videoID: parseInt(videoId),
                labelID: labelId,
                startFrameNumber: response.data.start_frame_number,
                endFrameNumber: response.data.end_frame_number
            };
            if (!segmentsByLabel[label]) {
                segmentsByLabel[label] = [];
            }
            segmentsByLabel[label].push(newSegment);
            console.log('Created segment:', newSegment);
            return newSegment;
        }
        catch (error) {
            const axiosError = error;
            console.error('Error creating segment:', axiosError.response?.data || axiosError.message);
            errorMessage.value = 'Error creating segment. Please try again.';
            return null;
        }
    }
    async function updateSegmentAPI(segmentId, updates) {
        try {
            console.log(`[VideoStore] Updating segment ${segmentId} with:`, updates);
            const updatePayload = createSegmentUpdatePayload(segmentId, (updates.startTime || updates.start_time) ?? 0, (updates.endTime || updates.end_time) ?? 0, updates);
            if (process.env.NODE_ENV === 'development') {
                debugSegmentConversion(updates, updatePayload, 'toBackend');
            }
            // Modern media framework - use video-specific endpoint if video is known
            const videoId = currentVideo.value?.id;
            const url = videoId
                ? r(`media/videos/${videoId}/segments/${segmentId}/`)
                : r(`media/videos/segments/${segmentId}/`); // Fallback to collection endpoint
            const response = await axiosInstance.patch(url, updatePayload);
            const updatedSegment = convertBackendSegmentToFrontend(response.data);
            updateSegment(segmentId, updatedSegment);
            console.log(`[VideoStore] Successfully updated segment ${segmentId}`);
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error('Error updating segment:', axiosError.response?.data || axiosError.message);
            errorMessage.value = 'Error updating segment. Please try again.';
            return false;
        }
    }
    async function deleteSegment(segmentId) {
        try {
            // Modern media framework - use video-specific endpoint if video is known
            const videoId = currentVideo.value?.id;
            const url = videoId
                ? r(`media/videos/${videoId}/segments/${segmentId}/`)
                : r(`media/videos/segments/${segmentId}/`); // Fallback to collection endpoint
            await axiosInstance.delete(url);
            for (const label in segmentsByLabel) {
                const index = segmentsByLabel[label].findIndex((s) => s.id === segmentId);
                if (index !== -1) {
                    segmentsByLabel[label].splice(index, 1);
                    break;
                }
            }
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error('Error deleting segment:', axiosError.response?.data || axiosError.message);
            errorMessage.value = 'Error deleting segment. Please try again.';
            return false;
        }
    }
    function removeSegment(segmentId) {
        const labels = Object.keys(segmentsByLabel);
        for (const label of labels) {
            segmentsByLabel[label] = segmentsByLabel[label].filter((s) => s.id !== segmentId);
        }
    }
    // ===================================================================
    // DRAFT SEGMENT MANAGEMENT
    // ===================================================================
    function startDraft(label, startTime) {
        console.log(`[Draft] Starting draft: ${label} at ${formatTime(startTime)}`);
        draftSegment.value = {
            id: `draft-${Date.now()}`, // ✅ FIX: Unique draft ID instead of just 'draft'
            label: label,
            startTime: startTime,
            endTime: null
        };
        console.log(`[Draft] Created draft segment:`, draftSegment.value);
    }
    function updateDraftEnd(endTime) {
        if (!draftSegment.value) {
            console.warn('[Draft] Kein aktiver Draft gefunden zum Aktualisieren.');
            return;
        }
        const minEndTime = draftSegment.value.startTime + MIN_SEGMENT_DURATION;
        const clampedEndTime = Math.max(minEndTime, endTime);
        draftSegment.value.endTime = clampedEndTime;
        console.log(`[Draft] Draft-Ende aktualisiert: ${formatTime(clampedEndTime)}, Duration: ${clampedEndTime - draftSegment.value.startTime}s`);
    }
    async function commitDraft() {
        console.log(`[Draft] commitDraft() called, draftSegment:`, draftSegment.value);
        console.log(`[Draft] currentVideo:`, currentVideo.value?.id);
        if (!draftSegment.value) {
            console.warn('[Draft] Kein Draft zum Committen gefunden - draftSegment.value ist null/undefined');
            return null;
        }
        if (!currentVideo.value) {
            console.warn('[Draft] Kein currentVideo gefunden');
            return null;
        }
        const draft = draftSegment.value;
        if (draft.endTime === null || draft.endTime === undefined) {
            console.error('[Draft] Draft-Ende muss gesetzt sein vor dem Committen. Current endTime:', draft.endTime);
            return null;
        }
        try {
            // Get correct label ID from the store
            const labelMeta = videoList.value.labels.find((l) => l.name === draft.label);
            if (!labelMeta) {
                console.error(`[Draft] Label ${draft.label} not found in store`);
                console.log('[Draft] Available labels:', videoList.value.labels.map((l) => l.name));
                errorMessage.value = `Label ${draft.label} nicht gefunden`;
                return null;
            }
            // Calculate frame numbers correctly
            const fps = videoMeta.value?.fps || 30;
            const startFrame = Math.floor(draft.startTime * fps);
            const endFrame = Math.floor(draft.endTime * fps);
            // Use correct backend API format
            const payload = {
                video_file: parseInt(currentVideo.value.id.toString()),
                label: labelMeta.id, // Use label ID, not name
                start_frame_number: startFrame,
                end_frame_number: endFrame
            };
            console.log('[Draft] Committing Draft-Segment with payload:', payload);
            // Modern media framework - video-specific endpoint
            const videoId = currentVideo.value?.id;
            if (!videoId) {
                console.error('[Draft] Cannot commit: no current video');
                return null;
            }
            const response = await axiosInstance.post(r(`media/videos/${videoId}/segments/`), payload);
            console.log('[Draft] API response:', response.data);
            const newSegment = {
                id: response.data.id,
                label: draft.label,
                startTime: response.data.start_time,
                endTime: response.data.end_time,
                avgConfidence: 1,
                videoID: parseInt(currentVideo.value.id.toString()),
                labelID: labelMeta.id,
                startFrameNumber: response.data.start_frame_number,
                endFrameNumber: response.data.end_frame_number
            };
            // Update currentVideo segments
            if (currentVideo.value?.segments) {
                currentVideo.value.segments.push(newSegment);
                console.log('[Draft] Added segment to currentVideo.segments, new count:', currentVideo.value.segments.length);
            }
            // Add to segments by label
            const label = draft.label;
            if (!segmentsByLabel[label]) {
                segmentsByLabel[label] = [];
            }
            segmentsByLabel[label].push(newSegment);
            console.log('[Draft] Added segment to segmentsByLabel[' + label + '], new count:', segmentsByLabel[label].length);
            // ✅ NEW: Create corresponding annotation after successful segment creation
            try {
                const { useAnnotationStore } = await import('./annotationStore');
                const { useAuthStore } = await import('./authStore');
                const annotationStore = useAnnotationStore();
                const authStore = useAuthStore();
                // Ensure mock user is initialized
                authStore.initMockUser();
                if (authStore.user?.id) {
                    await annotationStore.createSegmentAnnotation(currentVideo.value.id.toString(), newSegment, authStore.user.id);
                    console.log(`✅ Created annotation for segment ${newSegment.id}`);
                }
                else {
                    console.warn('No authenticated user found for annotation creation');
                }
            }
            catch (annotationError) {
                console.error('Failed to create segment annotation:', annotationError);
                // Don't fail the segment creation if annotation fails
            }
            // Clear draft AFTER successful creation
            const draftInfo = { ...draftSegment.value };
            draftSegment.value = null;
            console.log('[Draft] Draft erfolgreich committed und gecleared:', draftInfo, '-> New segment:', newSegment);
            return newSegment;
        }
        catch (error) {
            console.error('[Draft] Fehler beim Committen des Draft-Segments:', error);
            if (error instanceof AxiosError && error.response?.data) {
                console.error('[Draft] Backend error details:', error.response.data);
            }
            errorMessage.value =
                error instanceof AxiosError
                    ? error.response?.data?.detail || error.message || 'Unbekannter Fehler beim Speichern'
                    : 'Unbekannter Fehler beim Speichern';
            return null;
        }
    }
    function cancelDraft() {
        if (!draftSegment.value) {
            console.warn('[Draft] Kein Draft zum Abbrechen gefunden.');
            return;
        }
        console.log('[Draft] Draft abgebrochen:', draftSegment.value);
        draftSegment.value = null;
    }
    async function createFiveSecondSegment(clickTime, label) {
        const startTime = clickTime;
        const endTime = Math.min(clickTime + FIVE_SECOND_SEGMENT_DURATION, duration.value || clickTime + FIVE_SECOND_SEGMENT_DURATION);
        startDraft(label, startTime);
        updateDraftEnd(endTime);
        return await commitDraft();
    }
    async function loadVideo(videoId) {
        console.log(`[VideoStore] loadVideo called with ID: ${videoId}`);
        const anonStore = useAnonymizationStore();
        const ok = anonStore.overview.some((f) => f.id === Number(videoId) && f.mediaType === 'video' && f.anonymizationStatus === 'done');
        if (!ok) {
            throw new Error(`Video ${videoId} darf nicht annotiert werden, ` +
                `solange die Anonymisierung nicht abgeschlossen ist.`);
        }
        try {
            // First create basic video object to ensure currentVideo exists
            currentVideo.value = {
                id: videoId,
                isAnnotated: false,
                errorMessage: '',
                segments: [],
                videoUrl: '',
                status: 'available',
                assignedUser: null
            };
            // Try to fetch additional video metadata if available
            try {
                const response = await axiosInstance.get(r(`media/videos/${videoId}/`));
                const videoData = response.data;
                console.log(`[VideoStore] Got video metadata:`, videoData);
                // Update currentVideo with fetched data
                currentVideo.value = {
                    id: videoData.id || videoId,
                    videoUrl: videoData.video_url || '',
                    status: videoData.status || 'available',
                    assignedUser: videoData.assignedUser || null,
                    isAnnotated: videoData.isAnnotated || false,
                    errorMessage: '',
                    segments: [],
                    duration: videoData.duration,
                    fps: videoData.fps
                };
            }
            catch (metaError) {
                console.warn(`[VideoStore] Could not fetch video metadata for ${videoId}, using basic object:`, metaError);
            }
            // Always fetch video URL and segments
            await fetchVideoUrl(videoId);
            await fetchAllSegments(videoId);
            console.log(`[VideoStore] Video ${videoId} successfully loaded with ${currentVideo.value?.segments?.length || 0} segments`);
        }
        catch (error) {
            const axiosError = error;
            console.error(`[VideoStore] Error loading video ${videoId}:`, axiosError.response?.data || axiosError.message);
            errorMessage.value = 'Error loading video. Please try again.';
        }
    }
    const timelineSegments = computed(() => allSegments.value.map((s) => ({
        id: s.id,
        label: s.label,
        label_display: getTranslationForLabel(s.label),
        name: getTranslationForLabel(s.label),
        startTime: s.startTime,
        endTime: s.endTime,
        avgConfidence: s.avgConfidence,
        video_id: s.videoID,
        label_id: s.labelID
    })));
    // ===================================================================
    // PURE FRONTEND MUTATOR FOR LIVE PREVIEWS
    // ===================================================================
    /**
     * Pure front-end mutator for ultra-smooth previews
     * Updates segment locally without API call for instant UI feedback
     */
    function patchSegmentLocally(id, updates) {
        updateSegment(id, updates); // existing helper
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
        draftSegment: readonly(draftSegmentCompatible),
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
        fetchLabels, // ✅ NEW: Priority label fetching
        fetchVideoMeta,
        fetchVideoSegments,
        fetchSegmentsByLabel, // Added missing export
        createSegment,
        patchSegmentLocally, // Pure frontend mutator for live previews
        updateSegment: updateSegmentAPI,
        deleteSegment,
        removeSegment,
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
        updateSensitiveMeta,
        clearVideoMeta,
        hasRawVideoFileFn,
        // Draft actions
        startDraft,
        updateDraftEnd,
        commitDraft,
        cancelDraft,
        createFiveSecondSegment,
        // Helper functions
        formatTime,
        getSegmentOptions,
        clearSegments
    };
});
