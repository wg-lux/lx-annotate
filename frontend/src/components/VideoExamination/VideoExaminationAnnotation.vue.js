import { ref, computed, onMounted, watch } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useAuthStore } from '@/stores/authStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import RequirementGenerator from '@/components/RequirementReport/RequirementGenerator.vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import Timeline from '@/components/VideoExamination/Timeline.vue';
import { storeToRefs } from 'pinia';
import { useToastStore } from '@/stores/toastStore';
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute(); // ①
const router = useRouter();
// ------------------------------------------------------------------
// pick the number once when the view is created
// ------------------------------------------------------------------
const initialVideoId = Number(route.query.video ?? '') || null;
// Store setup
const videoStore = useVideoStore();
const mediaStore = useMediaTypeStore();
const { videoList, videoStreamUrl, timelineSegments } = storeToRefs(videoStore);
const videos = computed(() => videoList.value.videos);
const toastStore = useToastStore();
const { allSegments: rawSegments } = storeToRefs(videoStore);
const anonymizationStore = useAnonymizationStore();
const { overview } = storeToRefs(anonymizationStore);
// Use spread operator to convert readonly array to mutable array
const timelineLabels = computed(() => {
    const storeLabels = videoStore.labels || [];
    return [...storeLabels]; // Convert readonly array to mutable array
});
/**
 * helper: returns true when a video's anonymization status is 'done_processing_anonymization'
 */
function isAnonymized(videoId) {
    const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video');
    return item?.anonymizationStatus === 'done_processing_anonymization';
}
// Reactive data
const selectedVideoId = ref(initialVideoId);
const currentTime = ref(0);
const duration = ref(0);
const fps = ref(50);
const isPlaying = ref(false); // ✅ NEW: Track video playing state
const examinationMarkers = ref([]);
const savedExaminations = ref([]);
const currentMarker = ref(null);
const selectedLabelType = ref('');
const isMarkingLabel = ref(false);
const labelMarkingStart = ref(0);
const selectedSegmentId = ref(null);
// Video detail and metadata like VideoClassificationComponent
const videoDetail = ref(null);
const videoMeta = ref(null);
// Error and success messages for Bootstrap alerts
const errorMessage = ref('');
const successMessage = ref('');
// Template refs
const videoRef = ref(null);
const timelineRef = ref(null);
// Video Dropdown Watcher
async function loadSelectedVideo() {
    if (selectedVideoId.value == null) {
        videoStore.clearVideo();
        videoDetail.value = null;
        videoMeta.value = null;
        return;
    }
    // ✅ NEW: Validate that selected video is anonymized
    if (!isAnonymized(selectedVideoId.value)) {
        showErrorMessage(`Video ${selectedVideoId.value} kann nicht annotiert werden, da es noch nicht anonymisiert wurde.`);
        selectedVideoId.value = null;
        return;
    }
    // Clear previous error messages when changing videos
    clearErrorMessage();
    clearSuccessMessage();
    try {
        await videoStore.loadVideo(selectedVideoId.value);
        await loadVideoDetail(selectedVideoId.value);
        await guarded(loadSavedExaminations());
        await guarded(loadVideoMetadata());
        // Load segments with error handling
        await guarded(videoStore.fetchAllSegments(selectedVideoId.value));
        console.log('Video fully loaded:', selectedVideoId.value);
    }
    catch (err) {
        console.error('loadSelectedVideo failed', err);
        await guarded(Promise.reject(err));
    }
}
function onVideoChange() {
    loadSelectedVideo();
    /** update the url so users can bookmark / refresh */
    router.replace({ query: { video: selectedVideoId.value } });
}
//  fire loader whenever selectedVideoId changes programmatically  */
watch(selectedVideoId, loadSelectedVideo);
watch(() => route.query.video, v => {
    const id = Number(v ?? '') || null;
    if (id !== selectedVideoId.value)
        selectedVideoId.value = id;
}, { immediate: true });
// List of only videos that are both present in the list **and** in state `done` inside anonymizationStore
const annotatableVideos = computed(() => videoList.value.videos.filter(v => isAnonymized(v.id)));
const showExaminationForm = computed(() => {
    return selectedVideoId.value !== null && anonymizedVideoSrc.value !== undefined;
});
// Video streaming URL using MediaStore logic like AnonymizationValidationComponent
const anonymizedVideoSrc = computed(() => {
    if (!selectedVideoId.value)
        return undefined;
    // Build anonymized video URL with explicit processed parameter like AnonymizationValidationComponent
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/videos/${selectedVideoId.value}/?type=processed`;
});
const hasVideos = computed(() => {
    return annotatableVideos.value && annotatableVideos.value.length > 0;
});
const noVideosMessage = computed(() => {
    if (videos.value.length === 0) {
        return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.';
    }
    else if (annotatableVideos.value.length === 0) {
        return 'Keine anonymisierten Videos verfügbar. Videos müssen erst anonymisiert werden.';
    }
    return '';
});
// ✅ NEW: Normalized, video-scoped segments for Timeline
const timelineSegmentsForSelectedVideo = computed(() => {
    if (!selectedVideoId.value)
        return [];
    return rawSegments.value
        .filter(s => s.videoID === selectedVideoId.value)
        .map(s => ({
        id: s.id,
        label: s.label,
        label_display: s.label,
        name: s.label,
        startTime: s.startTime,
        endTime: s.endTime,
        avgConfidence: s.avgConfidence || 0,
        video_id: s.videoID,
        label_id: s.labelID
    }));
});
// Segments from store with readonly→mutable fix
const segments = computed(() => {
    return rawSegments.value.map(s => ({
        ...s
    }));
});
const groupedSegments = computed(() => {
    return videoStore.segmentsByLabel;
});
const canStartLabeling = computed(() => {
    return selectedVideoId.value &&
        (videoDetail.value?.video_url || anonymizedVideoSrc.value) &&
        selectedLabelType.value &&
        !isMarkingLabel.value &&
        duration.value > 0;
});
// ✅ PRIORITY: Load labels first, then videos, then anonymization status
onMounted(async () => {
    console.log('🚀 [VideoExamination] Component mounted - loading data in priority order...');
    try {
        // Step 1: Load labels with high priority
        await videoStore.fetchLabels();
        console.log(`✅ [VideoExamination] Labels loaded: ${videoStore.labels.length}`);
        // Step 2: Load anonymization overview BEFORE videos (needed for filtering)
        await anonymizationStore.fetchOverview();
        console.log(`✅ [VideoExamination] Anonymization status loaded: ${overview.value.length} items`);
        // Step 3: Load videos after labels and anonymization status are available
        await videoStore.fetchAllVideos();
        console.log(`✅ [VideoExamination] Videos loaded: ${videoStore.videoList.videos.length}`);
        console.log(`✅ [VideoExamination] Annotatable videos: ${annotatableVideos.value.length}`);
    }
    catch (error) {
        console.error('❌ [VideoExamination] Error during initial load:', error);
        showErrorMessage('Fehler beim Laden der Daten. Bitte Seite neu laden.');
    }
});
// Guarded function for error handling like VideoClassificationComponent
async function guarded(p) {
    try {
        return await p;
    }
    catch (e) {
        const errorMsg = e?.response?.data?.detail || e?.response?.data?.error || e?.message || String(e);
        errorMessage.value = errorMsg;
        return undefined;
    }
}
watch(videoStreamUrl, (newUrl) => {
    console.log('Video stream URL updated:', newUrl);
});
watch(selectedVideoId, (newId) => {
    console.log('Selected video ID changed, setting store to:', newId);
    if (typeof newId === 'number') {
        videoStore.setCurrentVideo(newId);
    }
    else {
        errorMessage.value = 'Invalid video ID';
    }
});
// Alert management methods
const clearErrorMessage = () => {
    errorMessage.value = '';
};
const clearSuccessMessage = () => {
    successMessage.value = '';
};
const showSuccessMessage = (message) => {
    successMessage.value = message;
    // Auto-clear after 5 seconds
    setTimeout(() => {
        clearSuccessMessage();
    }, 5000);
};
const showErrorMessage = (message) => {
    errorMessage.value = message;
    // Auto-clear after 10 seconds
    setTimeout(() => {
        clearErrorMessage();
    }, 10000);
};
// Load video detail from backend like VideoClassificationComponent
const loadVideoDetail = async (videoId) => {
    if (!videoId)
        return;
    try {
        console.log('Loading video detail for ID:', videoId);
        const response = await axiosInstance.get(r(`media/videos/${videoId}/`));
        console.log('Video detail response:', response.data);
        videoDetail.value = { video_url: response.data.video_url };
        videoMeta.value = {
            duration: Number(response.data.duration ?? 0),
            fps: Number(response.data.fps ?? 25)
        };
        // Update MediaStore with the current video for consistent URL handling
        const currentVideo = annotatableVideos.value.find(v => v.id === videoId);
        if (currentVideo) {
            mediaStore.setCurrentItem(currentVideo);
            console.log('MediaStore updated with video:', videoId);
        }
        // Update local duration if available
        if (videoMeta.value.duration > 0) {
            duration.value = videoMeta.value.duration;
        }
        console.log('Video detail loaded:', videoDetail.value);
        console.log('Video meta loaded:', videoMeta.value);
        console.log('Stream source will be:', anonymizedVideoSrc.value);
    }
    catch (error) {
        console.error('Error loading video detail:', error);
        await guarded(Promise.reject(error));
    }
};
const loadSavedExaminations = async () => {
    if (selectedVideoId.value === null)
        return;
    try {
        // TODO: Migrate to new media framework URL when backend supports /api/media/videos/{id}/examinations/
        // Currently using old URL as part of partial migration strategy
        const response = await axiosInstance.get(r(`video/${selectedVideoId.value}/examinations/`));
        savedExaminations.value = response.data;
        // Create markers for saved examinations
        examinationMarkers.value = response.data.map((exam) => ({
            id: `exam-${exam.id}`,
            timestamp: exam.timestamp,
            examination_data: exam.data
        }));
    }
    catch (error) {
        console.error('Error loading saved examinations:', error);
        // Check if this is an anonymization error like VideoClassificationComponent
        const errorMessage = error?.response?.data?.error || error?.response?.data?.detail || error?.message || error.toString();
        if (errorMessage.includes('darf nicht annotiert werden') ||
            errorMessage.includes('anonymisierung') ||
            errorMessage.includes('anonymization')) {
            showErrorMessage(`Video ${selectedVideoId.value} darf nicht annotiert werden, solange die Anonymisierung nicht abgeschlossen ist.`);
        }
        else if (error?.response?.status !== 404) {
            await guarded(Promise.reject(error));
        }
        savedExaminations.value = [];
        examinationMarkers.value = [];
    }
};
const loadVideoMetadata = async () => {
    if (videoRef.value) {
        await new Promise((resolve) => {
            const video = videoRef.value;
            if (video.readyState >= 1) {
                duration.value = video.duration;
                resolve();
            }
            else {
                video.addEventListener('loadedmetadata', () => {
                    duration.value = video.duration;
                    resolve();
                }, { once: true });
            }
        });
    }
};
const loadVideoSegments = async () => {
    if (selectedVideoId.value === null)
        return;
    try {
        await videoStore.fetchAllSegments(selectedVideoId.value);
        console.log('Video segments loaded for video:', selectedVideoId.value);
        console.log('Timeline segments count:', rawSegments.value.length);
    }
    catch (error) {
        console.error('Error loading video segments:', error);
    }
};
const onVideoLoaded = () => {
    if (videoRef.value) {
        duration.value = videoRef.value.duration;
        // ✅ NEW: Add play/pause event listeners for state tracking
        videoRef.value.addEventListener('play', () => {
            isPlaying.value = true;
        });
        videoRef.value.addEventListener('pause', () => {
            isPlaying.value = false;
        });
        videoRef.value.addEventListener('ended', () => {
            isPlaying.value = false;
        });
        console.log('🎥 Video loaded - Frontend');
        console.log(`- Video source URL: ${anonymizedVideoSrc.value}`);
        console.log(`- Legacy stream URL: ${videoStreamUrl.value}`);
        console.log(`- Video detail URL: ${videoDetail.value?.video_url}`);
        console.log(`- Video readyState: ${videoRef.value.readyState}`);
        console.log(`- Video networkState: ${videoRef.value.networkState}`);
        if (videoRef.value.videoWidth && videoRef.value.videoHeight) {
            console.log(`- Video dimensions: ${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`);
        }
        if (duration.value < 10) {
            console.warn(`⚠️ WARNING: Video duration seems very short (${duration.value}s)`);
        }
        else {
            showSuccessMessage(`Video geladen: ${Math.round(duration.value)}s Dauer`);
        }
    }
};
const handleTimeUpdate = () => {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
    }
};
const handleTimelineClick = (event) => {
    if (!timelineRef.value || duration.value === 0)
        return;
    const rect = timelineRef.value.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration.value;
    seekToTime(newTime);
};
// TS2322-safe event handlers like VideoClassificationComponent
const handleTimelineSeek = (...args) => {
    const [time] = args;
    seekToTime(time);
};
// ✅ NEW: Play/pause handler for Timeline
const handlePlayPause = (...args) => {
    if (!videoRef.value)
        return;
    if (videoRef.value.paused) {
        videoRef.value.play().catch(error => {
            console.error('Error playing video:', error);
            showErrorMessage('Fehler beim Abspielen des Videos');
        });
    }
    else {
        videoRef.value.pause();
    }
};
// ✅ NEW: Segment selection handler
const handleSegmentSelect = (...args) => {
    const [segmentId] = args;
    selectedSegmentId.value = segmentId;
    console.log('Segment selected:', segmentId);
};
const handleSegmentResize = (...args) => {
    const [segmentId, newStart, newEnd, mode, final] = args;
    // Verbesserte Guard für Draft/Temp-Segmente (camelCase in finalen PATCH-Aufrufen)
    if (typeof segmentId === 'string') {
        if (segmentId === 'draft' || /^temp-/.test(segmentId)) {
            console.warn('[VideoExamination] Ignoring resize for draft/temp segment:', segmentId);
            return;
        }
    }
    const numericId = typeof segmentId === 'string' ? parseInt(segmentId, 10) : segmentId;
    if (isNaN(numericId)) {
        console.warn('[VideoExamination] Invalid segment ID for resize:', segmentId);
        return;
    }
    if (final) {
        // Sofortige Previews + Speichern bei Mouse-Up
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        videoStore.updateSegment(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`✅ Segment ${numericId} resized and saved: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
    else {
        // Real-time preview während Drag ohne Backend-Aufruf
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`Preview resize segment ${numericId} ${mode}: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
};
const handleSegmentMove = (...args) => {
    const [segmentId, newStart, newEnd, final] = args;
    // Verbesserte Guard für Draft/Temp-Segmente (camelCase in finalen PATCH-Aufrufen)
    if (typeof segmentId === 'string') {
        if (segmentId === 'draft' || /^temp-/.test(segmentId)) {
            console.warn('[VideoExamination] Ignoring move for draft/temp segment:', segmentId);
            return;
        }
    }
    const numericId = typeof segmentId === 'string' ? parseInt(segmentId, 10) : segmentId;
    if (isNaN(numericId)) {
        console.warn('[VideoExamination] Invalid segment ID for move:', segmentId);
        return;
    }
    if (final) {
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        videoStore.updateSegment(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`✅ Segment ${numericId} moved and saved: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
    else {
        // Real-time preview während Drag ohne Backend-Aufruf
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`Preview move segment ${numericId}: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
};
const handleTimeSelection = (...args) => {
    const [data] = args;
    // ✅ FIXED: Only create segment if we have a selected label type
    if (selectedLabelType.value && selectedVideoId.value) {
        console.log(`Creating segment from time selection: ${formatTime(data.start)} - ${formatTime(data.end)} with label: ${selectedLabelType.value}`);
        handleCreateSegment({
            label: selectedLabelType.value,
            start: data.start,
            end: data.end
        });
    }
    else {
        console.warn('Cannot create segment: no label selected or no video selected');
        showErrorMessage('Bitte wählen Sie ein Label aus, bevor Sie ein Segment erstellen.');
    }
};
const handleCreateSegment = (...args) => {
    const [event] = args;
    return new Promise(async (resolve, reject) => {
        try {
            if (selectedVideoId.value) {
                await videoStore.createSegment?.(selectedVideoId.value.toString(), event.label, event.start, event.end);
                showSuccessMessage(`Segment erstellt: ${getTranslationForLabel(event.label)}`);
            }
            resolve();
        }
        catch (error) {
            await guarded(Promise.reject(error));
            reject(error);
        }
    });
};
const handleSegmentDelete = (...args) => {
    const [segment] = args;
    return new Promise(async (resolve, reject) => {
        if (!segment.id || typeof segment.id !== 'number') {
            console.warn('Cannot delete draft or temporary segment:', segment.id);
            resolve();
            return;
        }
        try {
            // 1. Remove from store
            videoStore.removeSegment(segment.id);
            // 2. Perform API call
            await videoStore.deleteSegment(segment.id);
            showSuccessMessage(`Segment gelöscht: ${getTranslationForLabel(segment.label)}`);
            resolve();
        }
        catch (err) {
            console.error('Segment konnte nicht gelöscht werden:', err);
            await guarded(Promise.reject(err));
            reject(err);
        }
    });
};
const seekToTime = (time) => {
    if (videoRef.value && time >= 0 && time <= duration.value) {
        videoRef.value.currentTime = time;
        currentTime.value = time;
    }
};
const onLabelSelect = () => {
    console.log('Label selected:', selectedLabelType.value);
};
const startLabelMarking = () => {
    if (!canStartLabeling.value)
        return;
    isMarkingLabel.value = true;
    labelMarkingStart.value = currentTime.value;
    // FIX: Use startDraft statt startDraftSegment
    videoStore.startDraft(selectedLabelType.value, currentTime.value);
    console.log(`Draft gestartet: ${selectedLabelType.value} bei ${formatTime(currentTime.value)}`);
};
const finishLabelMarking = async () => {
    if (!isMarkingLabel.value || !selectedVideoId.value)
        return;
    try {
        // FIX: Use updateDraftEnd und commitDraft statt finishDraftSegment
        videoStore.updateDraftEnd(currentTime.value);
        await videoStore.commitDraft();
        // Reset state
        isMarkingLabel.value = false;
        selectedLabelType.value = '';
        // Reload segments to show the new one
        await loadVideoSegments();
        console.log('Label-Markierung abgeschlossen');
    }
    catch (error) {
        console.error('Error finishing label marking:', error);
    }
};
const cancelLabelMarking = () => {
    // FIX: Use cancelDraft statt cancelDraftSegment
    videoStore.cancelDraft();
    isMarkingLabel.value = false;
    selectedLabelType.value = '';
    console.log('Label-Markierung abgebrochen');
};
const onExaminationSaved = async (examination) => {
    // Add new examination to list
    savedExaminations.value.push(examination);
    // Create new marker
    const marker = {
        id: `exam-${examination.id}`,
        timestamp: examination.timestamp,
        examination_data: examination.data
    };
    examinationMarkers.value.push(marker);
    // Show success message like VideoClassificationComponent
    showSuccessMessage(`Untersuchung gespeichert: ${examination.examination_type || 'Untersuchung'}`);
    // Create corresponding annotation for examination
    try {
        const annotationStore = useAnnotationStore();
        const authStore = useAuthStore();
        // Ensure mock user is initialized
        authStore.initMockUser();
        if (authStore.user?.id && selectedVideoId.value) {
            await annotationStore.createExaminationAnnotation(selectedVideoId.value.toString(), examination.timestamp, examination.examination_type || 'examination', examination.id, authStore.user.id);
            console.log(`✅ Created annotation for examination ${examination.id}`);
        }
        else {
            console.warn('No authenticated user or video ID found for examination annotation creation');
        }
    }
    catch (annotationError) {
        console.error('Failed to create examination annotation:', annotationError);
        // Don't fail the examination save if annotation fails
    }
    console.log('Examination saved:', examination);
};
const jumpToExamination = (examination) => {
    seekToTime(examination.timestamp);
    currentMarker.value = examinationMarkers.value.find(m => m.id === `exam-${examination.id}`) || null;
};
const deleteExamination = async (examinationId) => {
    try {
        await axiosInstance.delete(r(`examinations/${examinationId}/`));
        // Remove from local arrays
        savedExaminations.value = savedExaminations.value.filter(e => e.id !== examinationId);
        examinationMarkers.value = examinationMarkers.value.filter(m => m.id !== `exam-${examinationId}`);
        // Clear current marker if it was deleted
        if (currentMarker.value?.id === `exam-${examinationId}`) {
            currentMarker.value = null;
        }
        showSuccessMessage(`Untersuchung ${examinationId} gelöscht`);
        console.log('Examination deleted:', examinationId);
    }
    catch (error) {
        console.error('Error deleting examination:', error);
        await guarded(Promise.reject(error));
    }
};
// ✅ NEW: Validate all video segments (complete video review)
const submitVideoSegments = async () => {
    if (!selectedVideoId.value) {
        showErrorMessage('Kein Video ausgewählt');
        return;
    }
    const segmentCount = timelineSegmentsForSelectedVideo.value.length;
    if (segmentCount === 0) {
        showErrorMessage('Keine Segmente zum Validieren vorhanden');
        return;
    }
    // Confirm with user before validation
    if (!confirm(`Möchten Sie alle ${segmentCount} Segmente von Video ${selectedVideoId.value} als validiert markieren?`)) {
        return;
    }
    try {
        console.log(`🔍 Validating all segments for video ${selectedVideoId.value}...`);
        // ✅ MODERN FRAMEWORK: Use /api/media/videos/<pk>/segments/validation-status/ (POST)
        const response = await axiosInstance.post(r(`media/videos/${selectedVideoId.value}/segments/validation-status/`), {
            notes: `Vollständige Video-Review abgeschlossen am ${new Date().toLocaleString('de-DE')}`
        });
        console.log('✅ Validation response:', response.data);
        showSuccessMessage(`Erfolgreich! ${response.data.updated_count} von ${response.data.total_segments} Segmenten validiert.`);
        // Reload segments to reflect validation status
        await loadVideoSegments();
    }
    catch (error) {
        console.error('❌ Error validating video segments:', error);
        const errorMsg = error?.response?.data?.error || error?.message || 'Unbekannter Fehler';
        showErrorMessage(`Validierung fehlgeschlagen: ${errorMsg}`);
    }
};
// Video event handlers from AnonymizationValidationComponent
const onVideoError = (event) => {
    console.error('Video loading error:', event);
    const video = event.target;
    console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc
    });
    showErrorMessage('Fehler beim Laden des Videos. Bitte versuchen Sie es erneut.');
};
const onVideoLoadStart = () => {
    console.log('Video loading started for:', anonymizedVideoSrc.value);
};
const onVideoCanPlay = () => {
    console.log('Video can play, loaded successfully');
    showSuccessMessage('Video erfolgreich geladen');
};
// ✅ NEW: Helper functions for video status display
const getVideoStatusIndicator = (videoId) => {
    const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video');
    if (!item)
        return '';
    const statusIndicators = {
        'not_started': '⏳ Wartend',
        'processing_anonymization': '🔄 Verarbeitung',
        'extracting_frames': '🎬 Frames',
        'predicting_segments': '🤖 Segmente',
        'done_processing_anonymization': '✅ Anonymisiert',
        'validated': '🛡️ Validiert',
        'failed': '❌ Fehler'
    };
    return statusIndicators[item.anonymizationStatus] || item.anonymizationStatus;
};
const getVideoCountByStatus = (status) => {
    return overview.value.filter(o => o.mediaType === 'video' && o.anonymizationStatus === status).length;
};
const getStatusBadgeClass = (status) => {
    const classes = {
        'not_started': 'bg-secondary',
        'processing_anonymization': 'bg-warning',
        'extracting_frames': 'bg-info',
        'predicting_segments': 'bg-info',
        'done_processing_anonymization': 'bg-success',
        'validated': 'bg-primary',
        'failed': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
};
const getStatusText = (status) => {
    const texts = {
        'not_started': 'Nicht gestartet',
        'processing_anonymization': 'Anonymisierung läuft',
        'extracting_frames': 'Frames extrahieren',
        'predicting_segments': 'Segmente vorhersagen',
        'done_processing_anonymization': 'Fertig',
        'validated': 'Validiert',
        'failed': 'Fehlgeschlagen'
    };
    return texts[status] || status;
};
// ✅ NEW: Enhanced validation status tracking
const isVideoValidated = (videoId) => {
    const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video');
    return item?.anonymizationStatus === 'validated';
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['examination-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge-container']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-alert']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger alert-dismissible fade show" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "material-icons me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.errorMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearErrorMessage) },
        type: "button",
        ...{ class: "btn-close" },
        'aria-label': "Close",
    });
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success alert-dismissible fade show" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "material-icons me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.successMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSuccessMessage) },
        type: "button",
        ...{ class: "btn-close" },
        'aria-label': "Close",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.onVideoChange) },
    value: (__VLS_ctx.selectedVideoId),
    ...{ class: "form-select" },
    disabled: (!__VLS_ctx.hasVideos),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
});
(__VLS_ctx.hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar');
for (const [video] of __VLS_getVForSourceType((__VLS_ctx.annotatableVideos))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (video.id),
        value: (video.id),
    });
    (video.original_file_name || 'Video Nr. ' + video.id);
    (__VLS_ctx.getVideoStatusIndicator(video.id));
    (video.centerName || 'Unbekannt');
    (video.processorName || 'Unbekannt');
}
if (!__VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.noVideosMessage);
}
if (__VLS_ctx.videos.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2 align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-success" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-check me-1" },
    });
    (__VLS_ctx.getVideoCountByStatus('done_processing_anonymization'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-check-double me-1" },
    });
    (__VLS_ctx.getVideoCountByStatus('validated'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-clock me-1" },
    });
    (__VLS_ctx.videos.length - __VLS_ctx.annotatableVideos.length);
}
if (!__VLS_ctx.anonymizedVideoSrc && __VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-muted py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "material-icons" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2" },
    });
    if (__VLS_ctx.selectedVideoId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info mt-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-center justify-content-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-info-circle me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-start" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedVideoId);
        (__VLS_ctx.getVideoStatusIndicator(__VLS_ctx.selectedVideoId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.anonymizedVideoSrc || 'Wird geladen...');
    }
}
if (!__VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-muted py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "material-icons" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2" },
    });
    (__VLS_ctx.noVideosMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
}
if (__VLS_ctx.anonymizedVideoSrc) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "video-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
        ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
        ...{ onError: (__VLS_ctx.onVideoError) },
        ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
        ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
        ref: "videoRef",
        'data-cy': "video-player",
        src: (__VLS_ctx.anonymizedVideoSrc),
        controls: true,
        ...{ class: "w-100" },
        ...{ style: {} },
    });
    /** @type {typeof __VLS_ctx.videoRef} */ ;
    if (__VLS_ctx.selectedVideoId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 p-3 rounded border video-status-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-8" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-video me-2 text-primary" },
        });
        (__VLS_ctx.annotatableVideos.find(v => v.id === __VLS_ctx.selectedVideoId)?.original_file_name || `Video ${__VLS_ctx.selectedVideoId}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "status-badge-container mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getStatusBadgeClass(__VLS_ctx.overview.find(o => o.id === __VLS_ctx.selectedVideoId && o.mediaType === 'video')?.anonymizationStatus || 'not_started')) },
            ...{ class: "badge" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-shield-alt me-1" },
        });
        (__VLS_ctx.getStatusText(__VLS_ctx.overview.find(o => o.id === __VLS_ctx.selectedVideoId && o.mediaType === 'video')?.anonymizationStatus || 'not_started'));
        if (__VLS_ctx.timelineSegmentsForSelectedVideo.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge bg-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-cut me-1" },
            });
            (__VLS_ctx.timelineSegmentsForSelectedVideo.length);
        }
        if (__VLS_ctx.savedExaminations.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge bg-warning" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-stethoscope me-1" },
            });
            (__VLS_ctx.savedExaminations.length);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4 text-md-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block" },
        });
        (__VLS_ctx.annotatableVideos.find(v => v.id === __VLS_ctx.selectedVideoId)?.centerName || 'Unbekannt');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block" },
        });
        (__VLS_ctx.annotatableVideos.find(v => v.id === __VLS_ctx.selectedVideoId)?.processorName || 'Unbekannt');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block" },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
    }
}
if (!__VLS_ctx.anonymizedVideoSrc) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.anonymizedVideoSrc))
                    return;
                __VLS_ctx.videoStore.deleteVideo(__VLS_ctx.selectedVideoId);
            } },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.hasVideos),
    });
}
if (__VLS_ctx.duration > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-wrapper mt-3" },
    });
    /** @type {[typeof Timeline, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(Timeline, new Timeline({
        ...{ 'onSeek': {} },
        ...{ 'onPlayPause': {} },
        ...{ 'onSegmentSelect': {} },
        ...{ 'onSegmentResize': {} },
        ...{ 'onSegmentMove': {} },
        ...{ 'onSegmentCreate': {} },
        ...{ 'onSegmentDelete': {} },
        ...{ 'onTimeSelection': {} },
        video: ({ duration: __VLS_ctx.duration }),
        segments: (__VLS_ctx.timelineSegmentsForSelectedVideo),
        labels: (__VLS_ctx.timelineLabels),
        currentTime: (__VLS_ctx.currentTime),
        isPlaying: (__VLS_ctx.isPlaying),
        activeSegmentId: (__VLS_ctx.selectedSegmentId),
        showWaveform: (false),
        selectionMode: (true),
        fps: (__VLS_ctx.fps),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSeek': {} },
        ...{ 'onPlayPause': {} },
        ...{ 'onSegmentSelect': {} },
        ...{ 'onSegmentResize': {} },
        ...{ 'onSegmentMove': {} },
        ...{ 'onSegmentCreate': {} },
        ...{ 'onSegmentDelete': {} },
        ...{ 'onTimeSelection': {} },
        video: ({ duration: __VLS_ctx.duration }),
        segments: (__VLS_ctx.timelineSegmentsForSelectedVideo),
        labels: (__VLS_ctx.timelineLabels),
        currentTime: (__VLS_ctx.currentTime),
        isPlaying: (__VLS_ctx.isPlaying),
        activeSegmentId: (__VLS_ctx.selectedSegmentId),
        showWaveform: (false),
        selectionMode: (true),
        fps: (__VLS_ctx.fps),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSeek: (__VLS_ctx.handleTimelineSeek)
    };
    const __VLS_7 = {
        onPlayPause: (__VLS_ctx.handlePlayPause)
    };
    const __VLS_8 = {
        onSegmentSelect: (__VLS_ctx.handleSegmentSelect)
    };
    const __VLS_9 = {
        onSegmentResize: (__VLS_ctx.handleSegmentResize)
    };
    const __VLS_10 = {
        onSegmentMove: (__VLS_ctx.handleSegmentMove)
    };
    const __VLS_11 = {
        onSegmentCreate: (__VLS_ctx.handleCreateSegment)
    };
    const __VLS_12 = {
        onSegmentDelete: (__VLS_ctx.handleSegmentDelete)
    };
    const __VLS_13 = {
        onTimeSelection: (__VLS_ctx.handleTimeSelection)
    };
    var __VLS_2;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleTimelineClick) },
        ...{ class: "simple-timeline-track mt-2" },
        ref: "timelineRef",
    });
    /** @type {typeof __VLS_ctx.timelineRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "progress-bar" },
        ...{ style: ({ width: `${(__VLS_ctx.currentTime / __VLS_ctx.duration) * 100}%` }) },
    });
    for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.examinationMarkers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (marker.id),
            ...{ class: "examination-marker" },
            ...{ style: ({ left: `${(marker.timestamp / __VLS_ctx.duration) * 100}%` }) },
            title: (`Untersuchung bei ${__VLS_ctx.formatTime(marker.timestamp)}`),
        });
    }
}
if (__VLS_ctx.duration > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "debug-info mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.timelineSegmentsForSelectedVideo.length);
    (__VLS_ctx.rawSegments.length);
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
    (__VLS_ctx.isPlaying);
    (Object.keys(__VLS_ctx.groupedSegments).length);
}
if (__VLS_ctx.selectedVideoId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-controls mt-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mb-0 me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onLabelSelect) },
        value: (__VLS_ctx.selectedLabelType),
        ...{ class: "form-select form-select-sm control-select" },
        'data-cy': "label-select",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.timelineLabels))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (label.id),
            value: (label.name),
        });
        (__VLS_ctx.getTranslationForLabel(label.name));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-2" },
    });
    if (!__VLS_ctx.isMarkingLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.startLabelMarking) },
            ...{ class: "btn btn-success btn-sm control-button" },
            disabled: (!__VLS_ctx.canStartLabeling),
            'data-cy': "start-label-button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons" },
        });
    }
    if (__VLS_ctx.isMarkingLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.finishLabelMarking) },
            ...{ class: "btn btn-warning btn-sm control-button" },
            'data-cy': "finish-label-button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons" },
        });
    }
    if (__VLS_ctx.isMarkingLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelLabelMarking) },
            ...{ class: "btn btn-outline-secondary btn-sm control-button" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ms-3 text-muted" },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
    if (__VLS_ctx.videoStore.draftSegment) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info mt-2 mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons align-middle me-1" },
            ...{ style: {} },
        });
        (__VLS_ctx.getTranslationForLabel(__VLS_ctx.videoStore.draftSegment.label));
        if (__VLS_ctx.videoStore.draftSegment.end) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.start));
            (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.end));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.start));
        }
    }
}
if (__VLS_ctx.selectedVideoId && __VLS_ctx.timelineSegmentsForSelectedVideo.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    if (__VLS_ctx.overview.find(o => o.id === __VLS_ctx.selectedVideoId && o.mediaType === 'video')?.anonymizationStatus === 'validated') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-success d-flex align-items-center validation-status-alert" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-check-circle fa-2x me-3 text-success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-medal me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.timelineSegmentsForSelectedVideo.length);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.submitVideoSegments) },
            ...{ class: "btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center gap-2" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.timelineSegmentsForSelectedVideo.length);
    }
    if (__VLS_ctx.overview.find(o => o.id === __VLS_ctx.selectedVideoId && o.mediaType === 'video')?.anonymizationStatus !== 'validated') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted text-center mt-2 mb-0" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons" },
            ...{ style: {} },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-clipboard-list me-2" },
});
if (__VLS_ctx.currentMarker) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.currentMarker.timestamp));
}
if (__VLS_ctx.selectedVideoId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info alert-sm mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedVideoId);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-0" },
    ...{ style: {} },
});
if (__VLS_ctx.showExaminationForm) {
    /** @type {[typeof RequirementGenerator, ]} */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(RequirementGenerator, new RequirementGenerator({
        ...{ class: "requirement-generator-embedded" },
        dataCy: "requirement-generator",
    }));
    const __VLS_15 = __VLS_14({
        ...{ class: "requirement-generator-embedded" },
        dataCy: "requirement-generator",
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-muted py-5 px-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-video fa-3x mb-3 text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
}
if (__VLS_ctx.savedExaminations.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
        'data-cy': "saved-examinations",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-group list-group-flush" },
    });
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.savedExaminations))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (exam.id),
            ...{ class: "list-group-item d-flex justify-content-between align-items-center px-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.formatTime(exam.timestamp));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (exam.examination_type || 'Untersuchung');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.savedExaminations.length > 0))
                        return;
                    __VLS_ctx.jumpToExamination(exam);
                } },
            ...{ class: "btn btn-sm btn-outline-primary me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.savedExaminations.length > 0))
                        return;
                    __VLS_ctx.deleteExamination(exam.id);
                } },
            ...{ class: "btn btn-sm btn-outline-danger" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "material-icons" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['fade']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['fade']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-double']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-clock']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['video-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-video']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-shield-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-cut']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-stethoscope']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-md-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['simple-timeline-track']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['examination-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['debug-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-select']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-button']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-button']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-2x']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-medal']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-clipboard-list']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-0']} */ ;
/** @type {__VLS_StyleScopedClasses['requirement-generator-embedded']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-video']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-flush']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RequirementGenerator: RequirementGenerator,
            Timeline: Timeline,
            formatTime: formatTime,
            getTranslationForLabel: getTranslationForLabel,
            videoStore: videoStore,
            videos: videos,
            rawSegments: rawSegments,
            overview: overview,
            timelineLabels: timelineLabels,
            selectedVideoId: selectedVideoId,
            currentTime: currentTime,
            duration: duration,
            fps: fps,
            isPlaying: isPlaying,
            examinationMarkers: examinationMarkers,
            savedExaminations: savedExaminations,
            currentMarker: currentMarker,
            selectedLabelType: selectedLabelType,
            isMarkingLabel: isMarkingLabel,
            selectedSegmentId: selectedSegmentId,
            errorMessage: errorMessage,
            successMessage: successMessage,
            videoRef: videoRef,
            timelineRef: timelineRef,
            onVideoChange: onVideoChange,
            annotatableVideos: annotatableVideos,
            showExaminationForm: showExaminationForm,
            anonymizedVideoSrc: anonymizedVideoSrc,
            hasVideos: hasVideos,
            noVideosMessage: noVideosMessage,
            timelineSegmentsForSelectedVideo: timelineSegmentsForSelectedVideo,
            groupedSegments: groupedSegments,
            canStartLabeling: canStartLabeling,
            clearErrorMessage: clearErrorMessage,
            clearSuccessMessage: clearSuccessMessage,
            onVideoLoaded: onVideoLoaded,
            handleTimeUpdate: handleTimeUpdate,
            handleTimelineClick: handleTimelineClick,
            handleTimelineSeek: handleTimelineSeek,
            handlePlayPause: handlePlayPause,
            handleSegmentSelect: handleSegmentSelect,
            handleSegmentResize: handleSegmentResize,
            handleSegmentMove: handleSegmentMove,
            handleTimeSelection: handleTimeSelection,
            handleCreateSegment: handleCreateSegment,
            handleSegmentDelete: handleSegmentDelete,
            onLabelSelect: onLabelSelect,
            startLabelMarking: startLabelMarking,
            finishLabelMarking: finishLabelMarking,
            cancelLabelMarking: cancelLabelMarking,
            jumpToExamination: jumpToExamination,
            deleteExamination: deleteExamination,
            submitVideoSegments: submitVideoSegments,
            onVideoError: onVideoError,
            onVideoLoadStart: onVideoLoadStart,
            onVideoCanPlay: onVideoCanPlay,
            getVideoStatusIndicator: getVideoStatusIndicator,
            getVideoCountByStatus: getVideoCountByStatus,
            getStatusBadgeClass: getStatusBadgeClass,
            getStatusText: getStatusText,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
