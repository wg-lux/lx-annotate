import { ref, computed, onMounted, nextTick } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import SimpleExaminationForm from './SimpleExaminationForm.vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import Timeline from '@/components/EndoAI/Timeline.vue';
import { storeToRefs } from 'pinia';
import { useToastStore } from '@/stores/toastStore';
// Store setup
const videoStore = useVideoStore();
const toastStore = useToastStore();
const { allSegments: rawSegments } = storeToRefs(videoStore);
const mappedTimelineSegments = computed(() => rawSegments.value.map((s) => ({
    id: s.id,
    label: s.label,
    label_display: getTranslationForLabel(s.label),
    name: getTranslationForLabel(s.label), // <‑‑ NEW ➜ shown inside pill
    startTime: s.startTime ?? 0,
    endTime: s.endTime ?? 0,
    avgConfidence: s.avgConfidence ?? 1,
    video_id: selectedVideoId.value ?? undefined,
    label_id: s.labelID ?? undefined
})));
// ✅ FIX: Use spread operator to convert readonly array to mutable array
const timelineLabels = computed(() => {
    const storeLabels = videoStore.labels || [];
    return [...storeLabels]; // Convert readonly array to mutable array
});
// Reactive data
const videos = ref([]);
const selectedVideoId = ref(null);
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
// Computed properties
const currentVideoUrl = computed(() => {
    const video = videos.value.find(v => v.id === selectedVideoId.value);
    if (!video)
        return '';
    // Use the dedicated streaming endpoint from urls.py
    return video.video_url || `/api/videostream/${video.id}/`;
});
const showExaminationForm = computed(() => {
    return selectedVideoId.value !== null && currentVideoUrl.value !== '';
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
        currentVideoUrl.value &&
        selectedLabelType.value &&
        !isMarkingLabel.value &&
        duration.value > 0;
});
// Methods
const loadVideos = async () => {
    try {
        console.log('Loading videos from API...');
        const response = await axiosInstance.get(r('videos/'));
        console.log('Videos API response:', response.data);
        // API returns {videos: [...], labels: [...]} structure
        const videosData = response.data.videos || response.data || [];
        // Ensure IDs are numbers and add missing fields
        videos.value = videosData.map((v) => ({
            ...v,
            id: Number(v.id),
            center_name: v.center_name || v.original_file_name || 'Unbekannt',
            processor_name: v.processor_name || v.status || 'Unbekannt',
            video_url: `/api/videostream/${v.id}/`
        }));
        if (videos.value.length > 0) {
            console.log('First video structure after processing:', videos.value[0]);
        }
    }
    catch (error) {
        console.error('Error loading videos:', error);
        videos.value = [];
    }
};
onMounted(loadVideos);
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
const onVideoChange = async () => {
    if (selectedVideoId.value !== null) {
        loadSavedExaminations();
        // ✅ NEW: Load all segments for all labels as requested
        try {
            // 1. Set current video in store FIRST
            await videoStore.loadVideo(selectedVideoId.value.toString());
            // 2. Wait for video metadata to load
            await loadVideoMetadata();
            // 3. ✅ NEW: Fetch segments for ALL labels as specified in requirements
            console.log('Loading segments for all labels...');
            await Promise.all(videoStore.labels.map(l => videoStore.segmentsByLabel));
            // 4. ✅ NEW: Show toast message when all segments are loaded
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
        console.log('🎥 Video loaded - Frontend duration info:');
        console.log(`- Duration from HTML5 video element: ${duration.value}s`);
        console.log(`- Video source URL: ${currentVideoUrl.value}`);
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
    // ✅ FIX: Validate segment ID before processing
    const numericId = typeof segmentId === 'string' ? parseInt(segmentId, 10) : segmentId;
    if (isNaN(numericId) || segmentId === 'draft' || (typeof segmentId === 'string' && segmentId.startsWith('temp-'))) {
        console.warn('[VideoExamination] Ignoring resize for draft/temp segment:', segmentId);
        return;
    }
    if (final) {
        // Final resize - save to backend via store
        videoStore.updateSegment(numericId, {
            startTime: newStart,
            endTime: newEnd
        });
        console.log(`✅ Segment ${numericId} resized: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
    else {
        // Real-time preview - just update local display
        console.log(`Resizing segment ${numericId} ${mode}: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
};
const handleSegmentMove = (segmentId, newStart, newEnd, final) => {
    // ✅ FIX: Validate segment ID before processing  
    const numericId = typeof segmentId === 'string' ? parseInt(segmentId, 10) : segmentId;
    if (isNaN(numericId) || segmentId === 'draft' || (typeof segmentId === 'string' && segmentId.startsWith('temp-'))) {
        console.warn('[VideoExamination] Ignoring move for draft/temp segment:', segmentId);
        return;
    }
    if (final) {
        // Final move - save to backend via store  
        videoStore.updateSegment(numericId, {
            startTime: newStart,
            endTime: newEnd
        });
        console.log(`✅ Segment ${numericId} moved to: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
    else {
        // Real-time preview during drag
        console.log(`Moving segment ${numericId}: ${formatTime(newStart)} - ${formatTime(newEnd)}`);
    }
};
const handleCreateSegment = async (event) => {
    if (selectedVideoId.value) {
        // FIX: Use the correct method signature from videoStore
        await videoStore.createSegment?.(selectedVideoId.value.toString(), event.label, event.start, event.end);
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
const onExaminationSaved = (examination) => {
    // Add new examination to list
    savedExaminations.value.push(examination);
    // Create new marker
    const marker = {
        id: `exam-${examination.id}`,
        timestamp: examination.timestamp,
        examination_data: examination.data
    };
    examinationMarkers.value.push(marker);
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
};
const formatTime = (seconds) => {
    if (!seconds || seconds < 0)
        return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
const getTranslationForLabel = (label) => {
    const translations = {
        'appendix': 'Appendix',
        'blood': 'Blut',
        'diverticule': 'Divertikel',
        'grasper': 'Greifer',
        'ileocaecalvalve': 'Ileozäkalklappe',
        'ileum': 'Ileum',
        'low_quality': 'Niedrige Bildqualität',
        'nbi': 'Narrow Band Imaging',
        'needle': 'Nadel',
        'outside': 'Außerhalb',
        'polyp': 'Polyp',
        'snare': 'Snare',
        'water_jet': 'Wasserstrahl',
        'wound': 'Wunde'
    };
    return translations[label] || label;
};
// Lifecycle
onMounted(async () => {
    await loadVideos();
    if (videos.value.length) {
        selectedVideoId.value = videos.value[0].id;
        await onVideoChange();
    }
    else {
        console.warn('No videos available to select.');
    }
    if (selectedVideoId.value) {
        await loadVideoSegments();
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
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
    for (const [video] of __VLS_getVForSourceType((__VLS_ctx.videos))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((video.id)),
            value: ((video.id)),
        });
        (video.center_name || 'Unbekannt');
        (video.processor_name || 'Unbekannt');
    }
    if (!__VLS_ctx.hasVideos) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.noVideosMessage);
    }
    if (!__VLS_ctx.currentVideoUrl && __VLS_ctx.hasVideos) {
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
    if (__VLS_ctx.currentVideoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
            ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
            ref: ("videoRef"),
            src: ((__VLS_ctx.currentVideoUrl)),
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
            video: (({ duration: __VLS_ctx.duration })),
            segments: ((__VLS_ctx.mappedTimelineSegments)),
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
            video: (({ duration: __VLS_ctx.duration })),
            segments: ((__VLS_ctx.mappedTimelineSegments)),
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
            onTimeSelection: (__VLS_ctx.handleCreateSegment)
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
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
        }
        if (__VLS_ctx.isMarkingLabel) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.finishLabelMarking) },
                ...{ class: ("btn btn-warning btn-sm control-button") },
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
        const __VLS_11 = __VLS_asFunctionalComponent(SimpleExaminationForm, new SimpleExaminationForm({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }));
        const __VLS_12 = __VLS_11({
            ...{ 'onExaminationSaved': {} },
            videoTimestamp: ((__VLS_ctx.currentTime)),
            videoId: ((__VLS_ctx.selectedVideoId)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
        let __VLS_16;
        const __VLS_17 = {
            onExaminationSaved: (__VLS_ctx.onExaminationSaved)
        };
        let __VLS_13;
        let __VLS_14;
        var __VLS_15;
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
            videoStore: videoStore,
            rawSegments: rawSegments,
            mappedTimelineSegments: mappedTimelineSegments,
            timelineLabels: timelineLabels,
            videos: videos,
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
            currentVideoUrl: currentVideoUrl,
            showExaminationForm: showExaminationForm,
            hasVideos: hasVideos,
            noVideosMessage: noVideosMessage,
            groupedSegments: groupedSegments,
            canStartLabeling: canStartLabeling,
            onVideoChange: onVideoChange,
            onVideoLoaded: onVideoLoaded,
            handleTimeUpdate: handleTimeUpdate,
            handleTimelineClick: handleTimelineClick,
            handleTimelineSeek: handleTimelineSeek,
            handleSegmentResize: handleSegmentResize,
            handleSegmentMove: handleSegmentMove,
            handleCreateSegment: handleCreateSegment,
            onLabelSelect: onLabelSelect,
            startLabelMarking: startLabelMarking,
            finishLabelMarking: finishLabelMarking,
            cancelLabelMarking: cancelLabelMarking,
            onExaminationSaved: onExaminationSaved,
            jumpToExamination: jumpToExamination,
            deleteExamination: deleteExamination,
            formatTime: formatTime,
            getTranslationForLabel: getTranslationForLabel,
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
