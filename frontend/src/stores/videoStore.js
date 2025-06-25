import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import axiosInstance, { r } from '../api/axiosInstance';
import { AxiosError } from 'axios';
import { framesToSeconds, secondsToFrames, safeTimeConversion, formatTime as formatTimeHelper, calculateSegmentWidth, calculateSegmentPosition } from '../utils/timeHelpers';
import { convertBackendSegmentToFrontend, convertFrontendSegmentToBackend, convertBackendSegmentsToFrontend, createSegmentUpdatePayload, normalizeSegmentToCamelCase, debugSegmentConversion, } from '../utils/caseConversion';
// ===================================================================
// CONSTANTS
// ===================================================================
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
    wound: 'Wunde',
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
    // ===================================================================
    // COMPUTED PROPERTIES
    // ===================================================================
    const draftSegmentCompatible = computed(() => {
        if (!draftSegment.value)
            return null;
        return {
            ...draftSegment.value,
            start: draftSegment.value.startTime,
            end: draftSegment.value.endTime,
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
        videoList.value.labels.forEach(l => (map[l.name] = l.id));
        return map;
    });
    // ✅ NEW: Helper function to ensure labelID is always set correctly
    function ensureLabelId(segment) {
        return {
            ...segment,
            labelID: segment.labelID ?? labelIdMap.value[segment.label] ?? null,
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
                avgConfidence: 0,
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
        display: `${getTranslationForLabel(segment.label)}: ${formatTime(segment.startTime)} – ${formatTime(segment.endTime)}`,
    })));
    const activeSegment = computed(() => allSegments.value.find(s => s.id === activeSegmentId.value) || null);
    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================
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
            const framesInSegment = frameNumbers.filter(frameNum => frameNum >= segmentStartFrame && frameNum <= segmentEndFrame);
            if (framesInSegment.length > 0) {
                // Calculate average confidence from frame predictions within segment
                let totalConfidence = 0;
                let validPredictions = 0;
                framesInSegment.forEach(frameNum => {
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
            frames: backendSegment.frames,
        };
    }
    function formatTime(seconds) {
        const numSeconds = Number(seconds);
        if (Number.isNaN(numSeconds) || seconds === null || seconds === undefined) {
            return '00:00';
        }
        const mins = Math.floor(numSeconds / 60);
        const secs = Math.floor(numSeconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    function getTranslationForLabel(label) {
        return translationMap[label] || label;
    }
    function getColorForLabel(label) {
        const colorMap = {
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
        };
        return colorMap[label] || '#95a5a6';
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
            backgroundColor: getColorForLabel(segment.label),
        };
    }
    function getEnhancedSegmentStyle(segment, videoDuration) {
        const baseStyle = getSegmentStyle(segment, videoDuration);
        return {
            ...baseStyle,
            opacity: segment.avgConfidence.toString(),
            border: segment.id === activeSegmentId.value ? '2px solid #fff' : 'none',
        };
    }
    function updateSegment(segmentId, updates) {
        for (const label in segmentsByLabel) {
            const segmentIndex = segmentsByLabel[label].findIndex(s => s.id === segmentId);
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
        Object.keys(segmentsByLabel).forEach(key => {
            delete segmentsByLabel[key];
        });
    }
    // ===================================================================
    // VIDEO META FUNCTIONS
    // ===================================================================
    async function fetchVideoMeta(lastId) {
        try {
            const url = lastId ? r(`video/sensitivemeta/?last_id=${lastId}`) : r('video/sensitivemeta/');
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
            await axiosInstance.patch(r('video/update_sensitivemeta/'), payload);
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
        await fetchVideoSegments(id);
        if (currentVideo.value) {
            const allSegmentsArray = [];
            Object.values(segmentsByLabel).forEach(labelSegments => {
                allSegmentsArray.push(...labelSegments);
            });
            currentVideo.value.segments = allSegmentsArray;
            console.log('Timeline segments populated:', allSegmentsArray.length, 'segments');
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
    async function fetchAllVideos() {
        console.log('Fetching all videos...');
        try {
            const response = await axiosInstance.get(r('videos/'));
            console.log('API Response:', response.data);
            // Process videos with enhanced metadata
            const processedVideos = response.data.videos.map((video) => ({
                id: parseInt(video.id),
                original_file_name: video.original_file_name,
                status: video.status || 'available',
                assignedUser: video.assignedUser || null,
                anonymized: video.anonymized || false,
            }));
            // Process labels
            const processedLabels = response.data.labels.map((label) => ({
                id: parseInt(label.id),
                name: label.name,
                color: label.color || getColorForLabel(label.name),
            }));
            // Fetch segments for each video in parallel
            console.log('Fetching segments for', processedVideos.length, 'videos...');
            const videosWithSegments = await Promise.all(processedVideos.map(async (video) => {
                try {
                    const segmentsResponse = await axiosInstance.get(r(`video-segments/?video_id=${video.id}`));
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
                labels: processedLabels,
            };
            console.log("✅ Processed videos with segments:", videoList.value);
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
    async function fetchVideoUrl(videoId) {
        try {
            const id = videoId || currentVideo.value?.id;
            if (!id) {
                console.warn("No video ID available for fetching video URL");
                errorMessage.value = "No video selected.";
                return;
            }
            const response = await axiosInstance.get(r(`video/${id}/`), { headers: { 'Accept': 'application/json' } });
            if (response.data.video_url) {
                videoUrl.value = response.data.video_url;
                console.log("Fetched video URL:", videoUrl.value);
            }
            else {
                console.warn("No video URL returned from API response:", response.data);
                errorMessage.value = "Video URL not available.";
            }
        }
        catch (error) {
            const axiosError = error;
            console.error("Error loading video URL:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error loading video URL. Please check the API endpoint or try again later.";
        }
    }
    async function fetchSegmentsByLabel(id, label = 'outside') {
        try {
            const response = await axiosInstance.get(r(`video/${id}/label/${label}/`), { headers: { 'Accept': 'application/json' } });
            console.log(`[video ${id}] API response for label ${label}:`, response.data);
            // Map all BackendTimeSegments to internal Segment format
            const segmentsForLabel = response.data.time_segments.map(backendSegment => mapBackendTimeSegment(backendSegment, label));
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
            console.error("Error loading segments for label " + label + ":", axiosError.response?.data || axiosError.message);
            errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`;
        }
    }
    async function fetchVideoSegments(videoId) {
        const token = ++_fetchToken.value;
        try {
            const response = await axiosInstance.get(r(`video-segments/?video_id=${videoId}`), { headers: { 'Accept': 'application/json' } });
            if (token !== _fetchToken.value)
                return;
            // Clear existing segments
            Object.keys(segmentsByLabel).forEach(key => {
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
                    videoID: parseInt(videoId),
                    labelID: labelIdMap.value[segment.label] ?? null
                });
                const labelName = segment.label;
                if (!segmentsByLabel[labelName]) {
                    segmentsByLabel[labelName] = [];
                }
                if (segment.endTime - segment.startTime < 0.1) {
                    console.warn(`⚠️ Very short segment ${segment.id}: ${segment.endTime - segment.startTime}s`);
                }
                segmentsByLabel[labelName].push(segmentWithVideoId);
            });
            console.log(`[VideoStore] Processed segments by label:`, Object.keys(segmentsByLabel).map(label => `${label}: ${segmentsByLabel[label].length}`));
        }
        catch (error) {
            if (token === _fetchToken.value) {
                const axiosError = error;
                console.error("Error loading video segments:", axiosError.response?.data || axiosError.message);
                errorMessage.value = "Error loading video segments. Please try again later.";
            }
        }
    }
    async function createSegment(videoId, labelName, startTime, endTime) {
        try {
            // Get label ID from existing labels in store
            const labelMeta = videoList.value.labels.find(l => l.name === labelName);
            if (!labelMeta) {
                console.error(`Label ${labelName} not found in store`);
                errorMessage.value = `Label ${labelName} nicht gefunden`;
                return null;
            }
            const labelId = labelMeta.id;
            const fps = duration.value > 0 ? (videoMeta.value?.fps || 30) : 30;
            const startFrame = Math.floor(startTime * fps);
            const endFrame = Math.floor(endTime * fps);
            const segmentData = {
                video_file: parseInt(videoId),
                label: labelId,
                start_frame_number: startFrame,
                end_frame_number: endFrame,
            };
            const response = await axiosInstance.post(r('video-segments/'), segmentData);
            const newSegment = {
                id: response.data.id,
                label: labelName,
                startTime: response.data.start_time,
                endTime: response.data.end_time,
                avgConfidence: 1,
                videoID: parseInt(videoId),
                labelID: labelId,
                startFrameNumber: response.data.start_frame_number,
                endFrameNumber: response.data.end_frame_number,
            };
            if (!segmentsByLabel[labelName]) {
                segmentsByLabel[labelName] = [];
            }
            segmentsByLabel[labelName].push(newSegment);
            console.log('Created segment:', newSegment);
            return newSegment;
        }
        catch (error) {
            const axiosError = error;
            console.error("Error creating segment:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error creating segment. Please try again.";
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
            const response = await axiosInstance.patch(r(`video-segments/${segmentId}/`), updatePayload);
            const updatedSegment = convertBackendSegmentToFrontend(response.data);
            updateSegment(segmentId, updatedSegment);
            console.log(`[VideoStore] Successfully updated segment ${segmentId}`);
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error("Error updating segment:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error updating segment. Please try again.";
            return false;
        }
    }
    async function deleteSegment(segmentId) {
        try {
            await axiosInstance.delete(r(`video-segments/${segmentId}/`));
            for (const label in segmentsByLabel) {
                const index = segmentsByLabel[label].findIndex(s => s.id === segmentId);
                if (index !== -1) {
                    segmentsByLabel[label].splice(index, 1);
                    break;
                }
            }
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error("Error deleting segment:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error deleting segment. Please try again.";
            return false;
        }
    }
    // ===================================================================
    // DRAFT SEGMENT MANAGEMENT
    // ===================================================================
    function startDraft(label, startTime) {
        draftSegment.value = {
            id: 'draft', // ✅ FIX: Add missing id property
            label: label,
            startTime: startTime,
            endTime: null
        };
    }
    function updateDraftEnd(endTime) {
        if (!draftSegment.value) {
            console.warn('Kein aktiver Draft gefunden.');
            return;
        }
        const minEndTime = draftSegment.value.startTime + MIN_SEGMENT_DURATION;
        const clampedEndTime = Math.max(minEndTime, endTime);
        draftSegment.value.endTime = clampedEndTime;
        console.log(`Draft-Ende aktualisiert: ${formatTime(clampedEndTime)}`);
    }
    async function commitDraft() {
        if (!draftSegment.value || !currentVideo.value) {
            console.warn('Kein Draft zum Committen gefunden.');
            return null;
        }
        const draft = draftSegment.value;
        if (draft.endTime === null) {
            console.error('Draft-Ende muss gesetzt sein vor dem Committen.');
            return null;
        }
        try {
            // Convert frontend draft to backend format
            const payload = createSegmentUpdatePayload('draft', draft.startTime, draft.endTime, { label: draft.label });
            console.log('Committe Draft-Segment:', payload);
            const response = await axiosInstance.post(r('video-segments/'), {
                video_file: parseInt(currentVideo.value.id.toString()),
                label_name: draft.label,
                start_time: draft.startTime,
                end_time: draft.endTime,
                start_frame_number: Math.round(draft.startTime * (videoMeta.value?.fps || 30)),
                end_frame_number: Math.round(draft.endTime * (videoMeta.value?.fps || 30)),
            });
            const newSegment = {
                id: response.data.id,
                label: draft.label,
                startTime: response.data.start_time,
                endTime: response.data.end_time,
                avgConfidence: 1,
                videoID: parseInt(currentVideo.value.id.toString()),
                labelID: response.data.label_id,
                startFrameNumber: response.data.start_frame_number,
                endFrameNumber: response.data.end_frame_number,
            };
            if (currentVideo.value?.segments) {
                currentVideo.value.segments.push(newSegment);
            }
            // Add to segments by label
            const labelName = draft.label;
            if (!segmentsByLabel[labelName]) {
                segmentsByLabel[labelName] = [];
            }
            segmentsByLabel[labelName].push(newSegment);
            draftSegment.value = null;
            console.log('Draft erfolgreich committed:', newSegment);
            return newSegment;
        }
        catch (error) {
            console.error('Fehler beim Committen des Draft-Segments:', error);
            errorMessage.value = error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern';
            return null;
        }
    }
    function cancelDraft() {
        if (!draftSegment.value) {
            console.warn('Kein Draft zum Abbrechen gefunden.');
            return;
        }
        console.log('Draft abgebrochen:', draftSegment.value);
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
        try {
            const response = await axiosInstance.get(r(`video/${videoId}/`));
            const videoData = response.data;
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
            };
            await fetchVideoUrl(parseInt(videoId));
            console.log('Video loaded:', currentVideo.value);
        }
        catch (error) {
            const axiosError = error;
            console.error("Error loading video:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error loading video. Please try again.";
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
        fetchSegmentsByLabel, // ✅ FIX: Added missing export
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
        updateSensitiveMeta,
        clearVideoMeta,
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
    };
});
