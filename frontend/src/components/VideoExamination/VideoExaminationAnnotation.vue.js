import { ref, computed, onMounted, watch } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useAuthStore } from '@/stores/authStore';
import SimpleExaminationForm from './SimpleExaminationForm.vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import Timeline from '@/components/EndoAI/Timeline.vue';
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
 * helper: returns true when a video's anonymization status is 'done'
 */
function isAnonymized(videoId) {
    const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video');
    return item?.anonymizationStatus === 'done';
}
// Reactive data
const selectedVideoId = ref(initialVideoId);
const currentTime = ref(0);
const duration = ref(0);
const fps = ref(50);
const examinationMarkers = ref([]);
const savedExaminations = ref([]);
const currentMarker = ref(null);
const selectedLabelType = ref('');
const isMarkingLabel = ref(false);
const labelMarkingStart = ref(0);
const selectedSegmentId = ref(null);
// Template refs
const videoRef = ref(null);
const timelineRef = ref(null);
// Video Dropdown Watcher
async function loadSelectedVideo() {
    if (selectedVideoId.value == null) {
        videoStore.clearVideo();
        return;
    }
    try {
        await videoStore.loadVideo(String(selectedVideoId.value));
        await loadSavedExaminations(); // was only in the old onVideoChange
        await loadVideoMetadata(); // keep segment behaviour
    }
    catch (err) {
        console.error('loadVideo failed', err);
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
    return selectedVideoId.value !== null && videoStreamUrl.value !== '';
});
const hasVideos = computed(() => {
    return videos.value && videos.value.length > 0;
});
const noVideosMessage = computed(() => {
    return videos.value.length === 0 ?
        'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.' :
        '';
});
const groupedSegments = computed(() => {
    return videoStore.segmentsByLabel;
});
const canStartLabeling = computed(() => {
    return selectedVideoId.value &&
        videoStreamUrl.value &&
        selectedLabelType.value &&
        !isMarkingLabel.value &&
        duration.value > 0;
});
onMounted(videoStore.fetchAllVideos);
const loadSavedExaminations = async () => {
    if (selectedVideoId.value === null)
        return;
    try {
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
        savedExaminations.value = [];
        examinationMarkers.value = [];
    }
};
const _onVideoChange = async () => {
    if (selectedVideoId.value !== null) {
        loadSavedExaminations();
        // Load all segments for all labels
        try {
            // 1. Set current video in store FIRST
            await videoStore.loadVideo(selectedVideoId.value.toString());
            // 2. Wait for video metadata to load
            await loadVideoMetadata();
            // 3. Fetch segments for all labels as specified in requirements
            console.log('Loading segments for all labels...');
            await Promise.all(videoStore.labels.map(l => videoStore.segmentsByLabel));
            // 4. Show toast message when all segments are loaded
            toastStore.success({
                text: `Alle Segmente für Video ${selectedVideoId.value} geladen`
            });
            // 5. Debug log the loaded segments
            console.log('📊 Segments loaded:');
            console.log('- Timeline segments:', rawSegments.value.length);
            console.log('- Store segments by label:', Object.keys(videoStore.segmentsByLabel).length);
            console.log('- First few segments:', rawSegments.value.slice(0, 3));
        }
        catch (error) {
            console.error('Error loading video data:', error);
            toastStore.error({
                text: 'Fehler beim Laden der Video-Segmente'
            });
        }
        currentMarker.value = null;
    }
    else {
        // Clear everything when no video selected
        examinationMarkers.value = [];
        savedExaminations.value = [];
        currentMarker.value = null;
        videoStore.clearVideo();
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
        await videoStore.fetchAllSegments(selectedVideoId.value.toString());
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
        console.log('🎥 Video loaded - Frontend');
        console.log(`- Video source URL: ${videoStreamUrl.value}`);
        console.log(`- Video readyState: ${videoRef.value.readyState}`);
        console.log(`- Video networkState: ${videoRef.value.networkState}`);
        if (videoRef.value.videoWidth && videoRef.value.videoHeight) {
            console.log(`- Video dimensions: ${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`);
        }
        if (duration.value < 10) {
            console.warn(`⚠️ WARNING: Video duration seems very short (${duration.value}s)`);
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
const handleTimelineSeek = (time) => {
    seekToTime(time);
};
const handleSegmentResize = (segmentId, newStart, newEnd, mode, final) => {
    // ✅ NEW: Verbesserte Guard für Draft/Temp-Segmente (camelCase in finalen PATCH-Aufrufen)
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
        // ✅ NEW: Sofortige Previews + Speichern bei Mouse-Up
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        videoStore.updateSegment(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`✅ Segment ${numericId} resized and saved: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
    else {
        // ✅ NEW: Real-time preview während Drag ohne Backend-Aufruf
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`Preview resize segment ${numericId} ${mode}: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
};
const handleSegmentMove = (segmentId, newStart, newEnd, final) => {
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
        // ✅ NEW: Real-time preview während Drag ohne Backend-Aufruf
        videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd });
        console.log(`Preview move segment ${numericId}: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
};
const handleTimeSelection = (data) => {
    // Handle time selection for creating new segments
    if (selectedLabelType.value && selectedVideoId.value) {
        handleCreateSegment({
            label: selectedLabelType.value,
            start: data.start,
            end: data.end
        });
    }
};
const handleCreateSegment = async (event) => {
    if (selectedVideoId.value) {
        // FIX: Use the correct method signature from videoStore
        await videoStore.createSegment?.(selectedVideoId.value.toString(), event.label, event.start, event.end);
    }
};
const handleSegmentDelete = async (segment) => {
    if (!segment.id || typeof segment.id !== 'number') {
        console.warn('Cannot delete draft or temporary segment:', segment.id);
        return;
    }
    try {
        // 1. Remove from store
        videoStore.removeSegment(segment.id);
        // 2. Perform API call
        await videoStore.deleteSegment(segment.id);
        toastStore.success({
            text: `Segment gelöscht: ${getTranslationForLabel(segment.label)}`
        });
    }
    catch (err) {
        console.error('Segment konnte nicht gelöscht werden:', err);
        toastStore.error({
            text: 'Fehler beim Löschen des Segments'
        });
    }
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
    // ✅ NEW: Create corresponding annotation for examination
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
        console.log('Examination deleted:', examinationId);
    }
    catch (error) {
        console.error('Error deleting examination:', error);
    }
}; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['examination-marker', 'list-group-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-8") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onVideoChange) },
        value: ((__VLS_ctx.selectedVideoId)),
        modelModifiers: { number: true, },
        ...{ class: ("form-select") },
        disabled: ((!__VLS_ctx.hasVideos)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
    });
    (__VLS_ctx.hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar');
    for (const [annotatableVideos] of __VLS_getVForSourceType((__VLS_ctx.videos))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((annotatableVideos.id)),
            value: ((annotatableVideos.id)),
        });
        (annotatableVideos.original_file_name || 'Video Nr. ' + annotatableVideos.id);
        ('Center:' + annotatableVideos.centerName || 'Unbekanntes Zentrum');
        ('Processor:' + annotatableVideos.processorName || 'Unbekannter Prozessor');
    }
    if (!__VLS_ctx.hasVideos) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.noVideosMessage);
    }
    if (!__VLS_ctx.videoStreamUrl && __VLS_ctx.hasVideos) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
    }
    if (!__VLS_ctx.hasVideos) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
        (__VLS_ctx.noVideosMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    if (__VLS_ctx.videoStreamUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
            ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
            ref: ("videoRef"),
            'data-cy': ("video-player"),
            src: ((__VLS_ctx.videoStreamUrl)),
            controls: (true),
            ...{ class: ("w-100") },
            ...{ style: ({}) },
        });
        // @ts-ignore navigation for `const videoRef = ref()`
        /** @type { typeof __VLS_ctx.videoRef } */ ;
    }
    if (__VLS_ctx.duration > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("timeline-wrapper mt-3") },
        });
        // @ts-ignore
        /** @type { [typeof Timeline, ] } */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(Timeline, new Timeline({
            ...{ 'onSeek': {} },
            ...{ 'onSegmentResize': {} },
            ...{ 'onSegmentMove': {} },
            ...{ 'onSegmentCreate': {} },
            ...{ 'onTimeSelection': {} },
            ...{ 'onDeleteSegment': {} },
            video: (({ duration: __VLS_ctx.duration })),
            segments: ((__VLS_ctx.timelineSegments)),
            labels: ((__VLS_ctx.timelineLabels)),
            currentTime: ((__VLS_ctx.currentTime)),
            isPlaying: ((false)),
            activeSegmentId: ((__VLS_ctx.selectedSegmentId)),
            showWaveform: ((false)),
            selectionMode: ((true)),
            fps: ((__VLS_ctx.fps)),
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onSeek': {} },
            ...{ 'onSegmentResize': {} },
            ...{ 'onSegmentMove': {} },
            ...{ 'onSegmentCreate': {} },
            ...{ 'onTimeSelection': {} },
            ...{ 'onDeleteSegment': {} },
            video: (({ duration: __VLS_ctx.duration })),
            segments: ((__VLS_ctx.timelineSegments)),
            labels: ((__VLS_ctx.timelineLabels)),
            currentTime: ((__VLS_ctx.currentTime)),
            isPlaying: ((false)),
            activeSegmentId: ((__VLS_ctx.selectedSegmentId)),
            showWaveform: ((false)),
            selectionMode: ((true)),
            fps: ((__VLS_ctx.fps)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onSeek: (__VLS_ctx.handleTimelineSeek)
        };
        const __VLS_7 = {
            onSegmentResize: (__VLS_ctx.handleSegmentResize)
        };
        const __VLS_8 = {
            onSegmentMove: (__VLS_ctx.handleSegmentMove)
        };
        const __VLS_9 = {
            onSegmentCreate: (__VLS_ctx.handleCreateSegment)
        };
        const __VLS_10 = {
            onTimeSelection: (__VLS_ctx.handleTimeSelection)
        };
        const __VLS_11 = {
            onDeleteSegment: (__VLS_ctx.handleSegmentDelete)
        };
        let __VLS_2;
        let __VLS_3;
        var __VLS_4;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.handleTimelineClick) },
            ...{ class: ("simple-timeline-track mt-2") },
            ref: ("timelineRef"),
        });
        // @ts-ignore navigation for `const timelineRef = ref()`
        /** @type { typeof __VLS_ctx.timelineRef } */ ;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar") },
            ...{ style: (({ width: `${(__VLS_ctx.currentTime / __VLS_ctx.duration) * 100}%` })) },
        });
        for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.examinationMarkers))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((marker.id)),
                ...{ class: ("examination-marker") },
                ...{ style: (({ left: `${(marker.timestamp / __VLS_ctx.duration) * 100}%` })) },
                title: ((`Untersuchung bei ${__VLS_ctx.formatTime(marker.timestamp)}`)),
            });
        }
    }
    if (__VLS_ctx.duration > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("debug-info mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.rawSegments.length);
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
        (Object.keys(__VLS_ctx.groupedSegments).length);
    }
    if (__VLS_ctx.selectedVideoId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("timeline-controls mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center gap-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label mb-0 me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onLabelSelect) },
            value: ((__VLS_ctx.selectedLabelType)),
            ...{ class: ("form-select form-select-sm control-select") },
            'data-cy': ("label-select"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("appendix"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("blood"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("diverticule"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("grasper"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("ileocaecalvalve"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("ileum"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("low_quality"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("nbi"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("needle"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("outside"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("polyp"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("snare"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("water_jet"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("wound"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center gap-2") },
        });
        if (!__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.startLabelMarking) },
                ...{ class: ("btn btn-success btn-sm control-button") },
                disabled: ((!__VLS_ctx.canStartLabeling)),
                'data-cy': ("start-label-button"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
        if (__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.finishLabelMarking) },
                ...{ class: ("btn btn-warning btn-sm control-button") },
                'data-cy': ("finish-label-button"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
        if (__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelLabelMarking) },
                ...{ class: ("btn btn-outline-secondary btn-sm control-button") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("ms-3 text-muted") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
        if (__VLS_ctx.videoStore.draftSegment) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-info mt-2 mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons align-middle me-1") },
                ...{ style: ({}) },
            });
            (__VLS_ctx.getTranslationForLabel(__VLS_ctx.videoStore.draftSegment.label));
            if (__VLS_ctx.videoStore.draftSegment.end) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.start));
                (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.end));
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.start));
            }
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    if (__VLS_ctx.currentMarker) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentMarker.timestamp));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.showExaminationForm) {
        // @ts-ignore
        /** @type { [typeof SimpleExaminationForm, ] } */ ;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent(SimpleExaminationForm, new SimpleExaminationForm({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
            dataCy: ("examination-form"),
        }));
        const __VLS_13 = __VLS_12({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
            dataCy: ("examination-form"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
        let __VLS_17;
        const __VLS_18 = {
            onExaminationSaved: (__VLS_ctx.onExaminationSaved)
        };
        let __VLS_14;
        let __VLS_15;
        var __VLS_16;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
    }
    if (__VLS_ctx.savedExaminations.length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header pb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
            'data-cy': ("saved-examinations"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("list-group list-group-flush") },
        });
        for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.savedExaminations))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((exam.id)),
                ...{ class: ("list-group-item d-flex justify-content-between align-items-center px-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatTime(exam.timestamp));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (exam.examination_type || 'Untersuchung');
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.savedExaminations.length > 0)))
                            return;
                        __VLS_ctx.jumpToExamination(exam);
                    } },
                ...{ class: ("btn btn-sm btn-outline-primary me-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.savedExaminations.length > 0)))
                            return;
                        __VLS_ctx.deleteExamination(exam.id);
                    } },
                ...{ class: ("btn btn-sm btn-outline-danger") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'row', 'col-lg-8', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-select', 'text-muted', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'video-container', 'w-100', 'timeline-wrapper', 'mt-3', 'simple-timeline-track', 'mt-2', 'progress-bar', 'examination-marker', 'debug-info', 'mt-2', 'text-muted', 'timeline-controls', 'mt-4', 'd-flex', 'align-items-center', 'gap-3', 'd-flex', 'align-items-center', 'form-label', 'mb-0', 'me-2', 'form-select', 'form-select-sm', 'control-select', 'd-flex', 'align-items-center', 'gap-2', 'btn', 'btn-success', 'btn-sm', 'control-button', 'material-icons', 'btn', 'btn-warning', 'btn-sm', 'control-button', 'material-icons', 'btn', 'btn-outline-secondary', 'btn-sm', 'control-button', 'ms-3', 'text-muted', 'alert', 'alert-info', 'mt-2', 'mb-0', 'material-icons', 'align-middle', 'me-1', 'col-lg-4', 'card', 'card-header', 'pb-0', 'mb-0', 'text-muted', 'card-body', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'card', 'mt-3', 'card-header', 'pb-0', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'px-0', 'text-muted', 'btn', 'btn-sm', 'btn-outline-primary', 'me-2', 'material-icons', 'btn', 'btn-sm', 'btn-outline-danger', 'material-icons',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
        'timelineRef': __VLS_nativeElements['div'],
    };
    var $refs;
    var $el;
    return {
        attrs: {},
        slots: __VLS_slots,
        refs: $refs,
        rootEl: $el,
    };
}
;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            SimpleExaminationForm: SimpleExaminationForm,
            Timeline: Timeline,
            formatTime: formatTime,
            getTranslationForLabel: getTranslationForLabel,
            videoStore: videoStore,
            videoStreamUrl: videoStreamUrl,
            timelineSegments: timelineSegments,
            videos: videos,
            rawSegments: rawSegments,
            timelineLabels: timelineLabels,
            selectedVideoId: selectedVideoId,
            currentTime: currentTime,
            duration: duration,
            fps: fps,
            examinationMarkers: examinationMarkers,
            savedExaminations: savedExaminations,
            currentMarker: currentMarker,
            selectedLabelType: selectedLabelType,
            isMarkingLabel: isMarkingLabel,
            selectedSegmentId: selectedSegmentId,
            videoRef: videoRef,
            timelineRef: timelineRef,
            onVideoChange: onVideoChange,
            showExaminationForm: showExaminationForm,
            hasVideos: hasVideos,
            noVideosMessage: noVideosMessage,
            groupedSegments: groupedSegments,
            canStartLabeling: canStartLabeling,
            onVideoLoaded: onVideoLoaded,
            handleTimeUpdate: handleTimeUpdate,
            handleTimelineClick: handleTimelineClick,
            handleTimelineSeek: handleTimelineSeek,
            handleSegmentResize: handleSegmentResize,
            handleSegmentMove: handleSegmentMove,
            handleTimeSelection: handleTimeSelection,
            handleCreateSegment: handleCreateSegment,
            handleSegmentDelete: handleSegmentDelete,
            onLabelSelect: onLabelSelect,
            startLabelMarking: startLabelMarking,
            finishLabelMarking: finishLabelMarking,
            cancelLabelMarking: cancelLabelMarking,
            onExaminationSaved: onExaminationSaved,
            jumpToExamination: jumpToExamination,
            deleteExamination: deleteExamination,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
