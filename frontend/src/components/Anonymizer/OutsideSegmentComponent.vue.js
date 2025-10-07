import { ref, computed, watch, onMounted } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { useVideoStore } from '@/stores/videoStore';
import Timeline from '@/components/VideoExamination/Timeline.vue';
const props = defineProps();
const emit = defineEmits();
/**
 * Local state for the player + meta
 */
const videoEl = ref(null);
const videoUrl = ref(''); // backend-provided stream URL
const duration = ref(0); // seconds
const currentTime = ref(0);
const isPlaying = ref(false);
/**
 * Store with segments
 */
const videoStore = useVideoStore();
/**
 * Validation state
 */
const validatedSegments = ref(new Set());
const isValidating = ref(false);
/**
 * Fetch backend detail to get canonical video_url + duration (don't reconstruct in client)
 */
async function loadVideoDetail(videoId) {
    const { data } = await axiosInstance.get(`/api/media/videos/${videoId}/`);
    videoUrl.value = data.video_url;
    duration.value = Number(data.duration ?? 0);
}
/**
 * Keep store segments updated
 */
async function loadSegments(videoId) {
    await videoStore.fetchAllSegments(String(videoId));
}
/**
 * Filter to ONLY 'outside' segments (case-insensitive), clone to avoid readonly issues
 */
const outsideSegments = computed(() => {
    const raw = videoStore.allSegments ?? [];
    return raw
        .filter((s) => (s.label ?? '').toLowerCase() === 'outside')
        .map((s) => ({ ...s })); // shallow mutable copy (prevents readonly->mutable errors in child)
});
/**
 * Get segments that still need validation
 */
const unvalidatedSegments = computed(() => {
    return outsideSegments.value.filter(s => !validatedSegments.value.has(s.id));
});
/**
 * Check if all segments are validated
 */
const allSegmentsValidated = computed(() => {
    return outsideSegments.value.length > 0 && unvalidatedSegments.value.length === 0;
});
/**
 * Validate a specific segment
 */
async function validateSegment(segment) {
    if (validatedSegments.value.has(segment.id) || isValidating.value)
        return;
    isValidating.value = true;
    try {
        // Emit validation event to parent
        validatedSegments.value.add(segment.id);
        emit('segment-validated', segment.id);
        console.log(`✅ Segment ${segment.id} validated`);
        // Check if all segments are now validated
        if (allSegmentsValidated.value) {
            emit('validation-complete');
            console.log('🎉 All outside segments validated!');
        }
    }
    catch (error) {
        console.error('Error validating segment:', error);
        validatedSegments.value.delete(segment.id);
    }
    finally {
        isValidating.value = false;
    }
}
/**
 * Validate all segments at once
 */
async function validateAllSegments() {
    for (const segment of unvalidatedSegments.value) {
        await validateSegment(segment);
    }
}
/**
 * Reset validation state
 */
function resetValidation() {
    validatedSegments.value.clear();
}
/**
 * Format time in MM:SS format
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
/**
 * Keep video element and timeline in sync
 */
onMounted(() => {
    if (!videoEl.value)
        return;
    // If backend didn't return duration, fall back to media metadata
    videoEl.value.addEventListener('loadedmetadata', () => {
        if (!duration.value && videoEl.value)
            duration.value = videoEl.value.duration || 0;
    });
    videoEl.value.addEventListener('timeupdate', () => {
        if (!videoEl.value)
            return;
        currentTime.value = videoEl.value.currentTime;
    });
    videoEl.value.addEventListener('play', () => { isPlaying.value = true; });
    videoEl.value.addEventListener('pause', () => { isPlaying.value = false; });
});
watch(() => props.videoId, async (id) => {
    resetValidation(); // Reset validation when video changes
    await Promise.all([loadVideoDetail(id), loadSegments(id)]);
}, { immediate: true });
/**
 * Wrapper handlers (avoid TS2322 from the child’s template listeners)
 */
function onSeek(...args) {
    const [time] = args;
    if (videoEl.value && Number.isFinite(time)) {
        videoEl.value.currentTime = time;
    }
    currentTime.value = time;
}
function onPlayPause() {
    if (!videoEl.value)
        return;
    if (videoEl.value.paused)
        videoEl.value.play().catch(() => { });
    else
        videoEl.value.pause();
    isPlaying.value = !videoEl.value.paused;
}
// These are no-ops (read-only view). Keep them if you want to log.
function onSegmentCreate() { }
function onSegmentResize() { }
function onSegmentMove() { }
function onTimeSelection() { }
function onSegmentSelect() { }
function onSegmentEdit() { }
function onSegmentDelete() { }
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['video-with-outside-timeline']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "video-with-outside-timeline" },
});
if (__VLS_ctx.outsideSegments.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "validation-status mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-8" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "progress" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "progress-bar" },
        ...{ class: (__VLS_ctx.allSegmentsValidated ? 'bg-success' : 'bg-warning') },
        ...{ style: (`width: ${(__VLS_ctx.validatedSegments.size / __VLS_ctx.outsideSegments.length) * 100}%`) },
    });
    (__VLS_ctx.validatedSegments.size);
    (__VLS_ctx.outsideSegments.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-4 text-end" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.validateAllSegments) },
        ...{ class: "btn btn-sm btn-success me-2" },
        disabled: (__VLS_ctx.isValidating || __VLS_ctx.allSegmentsValidated),
    });
    if (__VLS_ctx.isValidating) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-1" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-check-double me-1" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetValidation) },
        ...{ class: "btn btn-sm btn-outline-secondary" },
        disabled: (__VLS_ctx.isValidating || __VLS_ctx.validatedSegments.size === 0),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-redo me-1" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
    ref: "videoEl",
    src: (__VLS_ctx.videoUrl),
    controls: true,
    ...{ style: {} },
});
/** @type {typeof __VLS_ctx.videoEl} */ ;
if (__VLS_ctx.outsideSegments.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "segments-overview mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    (__VLS_ctx.outsideSegments.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "segments-list" },
    });
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.outsideSegments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (segment.id),
            ...{ class: "segment-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded" },
            ...{ class: ({
                    'border-success bg-success bg-opacity-10': __VLS_ctx.validatedSegments.has(segment.id),
                    'border-warning bg-warning bg-opacity-10': !__VLS_ctx.validatedSegments.has(segment.id)
                }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (segment.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ms-2 text-muted" },
        });
        (__VLS_ctx.formatTime(segment.startTime));
        (__VLS_ctx.formatTime(segment.endTime));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ms-2 badge bg-secondary" },
        });
        (segment.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        if (!__VLS_ctx.validatedSegments.has(segment.id)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.outsideSegments.length > 0))
                            return;
                        if (!(!__VLS_ctx.validatedSegments.has(segment.id)))
                            return;
                        __VLS_ctx.validateSegment(segment);
                    } },
                ...{ class: "btn btn-sm btn-outline-success" },
                disabled: (__VLS_ctx.isValidating),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-check me-1" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-success" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-check-circle me-1" },
            });
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-2" },
    });
    (props.videoId);
}
if (__VLS_ctx.outsideSegments.length > 0) {
    /** @type {[typeof Timeline, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(Timeline, new Timeline({
        ...{ 'onSeek': {} },
        ...{ 'onPlayPause': {} },
        ...{ 'onSegmentCreate': {} },
        ...{ 'onSegmentResize': {} },
        ...{ 'onSegmentMove': {} },
        ...{ 'onTimeSelection': {} },
        ...{ 'onSegmentSelect': {} },
        ...{ 'onSegmentEdit': {} },
        ...{ 'onSegmentDelete': {} },
        video: ({ duration: __VLS_ctx.duration }),
        segments: (__VLS_ctx.outsideSegments),
        currentTime: (__VLS_ctx.currentTime),
        isPlaying: (__VLS_ctx.isPlaying),
        selectionMode: (false),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSeek': {} },
        ...{ 'onPlayPause': {} },
        ...{ 'onSegmentCreate': {} },
        ...{ 'onSegmentResize': {} },
        ...{ 'onSegmentMove': {} },
        ...{ 'onTimeSelection': {} },
        ...{ 'onSegmentSelect': {} },
        ...{ 'onSegmentEdit': {} },
        ...{ 'onSegmentDelete': {} },
        video: ({ duration: __VLS_ctx.duration }),
        segments: (__VLS_ctx.outsideSegments),
        currentTime: (__VLS_ctx.currentTime),
        isPlaying: (__VLS_ctx.isPlaying),
        selectionMode: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSeek: (__VLS_ctx.onSeek)
    };
    const __VLS_7 = {
        onPlayPause: (__VLS_ctx.onPlayPause)
    };
    const __VLS_8 = {
        onSegmentCreate: (__VLS_ctx.onSegmentCreate)
    };
    const __VLS_9 = {
        onSegmentResize: (__VLS_ctx.onSegmentResize)
    };
    const __VLS_10 = {
        onSegmentMove: (__VLS_ctx.onSegmentMove)
    };
    const __VLS_11 = {
        onTimeSelection: (__VLS_ctx.onTimeSelection)
    };
    const __VLS_12 = {
        onSegmentSelect: (__VLS_ctx.onSegmentSelect)
    };
    const __VLS_13 = {
        onSegmentEdit: (__VLS_ctx.onSegmentEdit)
    };
    const __VLS_14 = {
        onSegmentDelete: (__VLS_ctx.onSegmentDelete)
    };
    var __VLS_2;
}
/** @type {__VLS_StyleScopedClasses['video-with-outside-timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['progress']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-double']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-redo']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['segments-overview']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['segments-list']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-success']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-opacity-10']} */ ;
/** @type {__VLS_StyleScopedClasses['border-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-opacity-10']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Timeline: Timeline,
            videoEl: videoEl,
            videoUrl: videoUrl,
            duration: duration,
            currentTime: currentTime,
            isPlaying: isPlaying,
            validatedSegments: validatedSegments,
            isValidating: isValidating,
            outsideSegments: outsideSegments,
            allSegmentsValidated: allSegmentsValidated,
            validateSegment: validateSegment,
            validateAllSegments: validateAllSegments,
            resetValidation: resetValidation,
            formatTime: formatTime,
            onSeek: onSeek,
            onPlayPause: onPlayPause,
            onSegmentCreate: onSegmentCreate,
            onSegmentResize: onSegmentResize,
            onSegmentMove: onSegmentMove,
            onTimeSelection: onTimeSelection,
            onSegmentSelect: onSegmentSelect,
            onSegmentEdit: onSegmentEdit,
            onSegmentDelete: onSegmentDelete,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
