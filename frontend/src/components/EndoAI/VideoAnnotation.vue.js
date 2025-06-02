import { defineComponent, ref, computed, onMounted } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import Timeline from './Timeline.vue';
export default defineComponent({
    name: 'VideoAnnotation',
    components: { Timeline },
    setup() {
        const videoStore = useVideoStore();
        const selectedVideoId = ref(null);
        const currentTime = ref(0);
        const duration = ref(0);
        const videoRef = ref(null);
        // Computed properties
        const hasVideos = computed(() => videoStore.videoList.videos && videoStore.videoList.videos.length > 0);
        const currentVideoStreamUrl = computed(() => {
            if (selectedVideoId.value === null)
                return '';
            return videoStore.urlFor(selectedVideoId.value);
        });
        const allSegments = computed(() => videoStore.allSegments);
        // Methods
        function onVideoChange() {
            if (selectedVideoId.value !== null) {
                // Load video metadata and segments
                videoStore.fetchVideoMeta(selectedVideoId.value);
                videoStore.fetchAllSegments(selectedVideoId.value.toString());
            }
        }
        function onVideoLoaded() {
            if (videoRef.value) {
                duration.value = videoRef.value.duration;
            }
        }
        function handleTimeUpdate() {
            if (videoRef.value) {
                currentTime.value = videoRef.value.currentTime;
            }
        }
        function handleSegmentResize(id, newEnd) {
            console.log(`Segment ${id} resized to end at ${newEnd}`);
            videoStore.updateSegment(id, { endTime: newEnd });
        }
        function handleTimelineSeek(time) {
            if (videoRef.value) {
                videoRef.value.currentTime = time;
            }
        }
        function formatTime(seconds) {
            if (Number.isNaN(seconds) || seconds === null || seconds === undefined)
                return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        onMounted(() => {
            videoStore.fetchAllVideos();
        });
        return {
            videoStore,
            selectedVideoId,
            currentTime,
            duration,
            videoRef,
            hasVideos,
            currentVideoStreamUrl,
            allSegments,
            onVideoChange,
            onVideoLoaded,
            handleTimeUpdate,
            handleSegmentResize,
            handleTimelineSeek,
            formatTime,
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    const __VLS_componentsOption = { Timeline };
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("video-annotation-container") },
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
    for (const [video] of __VLS_getVForSourceType((__VLS_ctx.videoStore.videoList.videos))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((video.id)),
            value: ((video.id)),
        });
        (video.originalFileName || 'Unbekannt');
        (video.status || 'Unbekannt');
    }
    if (!__VLS_ctx.hasVideos) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
    }
    if (!__VLS_ctx.currentVideoStreamUrl && __VLS_ctx.hasVideos) {
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    if (__VLS_ctx.currentVideoStreamUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
            ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
            ref: ("videoRef"),
            src: ((__VLS_ctx.currentVideoStreamUrl)),
            controls: (true),
            ...{ class: ("video-player") },
        });
        // @ts-ignore navigation for `const videoRef = ref()`
        /** @type { typeof __VLS_ctx.videoRef } */ ;
    }
    if (__VLS_ctx.duration > 0) {
        const __VLS_0 = {}.Timeline;
        /** @type { [typeof __VLS_components.Timeline, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onResize': {} },
            ...{ 'onSeek': {} },
            segments: ((__VLS_ctx.allSegments)),
            duration: ((__VLS_ctx.duration)),
            currentTime: ((__VLS_ctx.currentTime)),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onResize': {} },
            ...{ 'onSeek': {} },
            segments: ((__VLS_ctx.allSegments)),
            duration: ((__VLS_ctx.duration)),
            currentTime: ((__VLS_ctx.currentTime)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_6;
        const __VLS_7 = {
            onResize: (__VLS_ctx.handleSegmentResize)
        };
        const __VLS_8 = {
            onSeek: (__VLS_ctx.handleTimelineSeek)
        };
        let __VLS_3;
        let __VLS_4;
        var __VLS_5;
    }
    if (__VLS_ctx.currentVideoStreamUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-controls mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
    }
    ['video-annotation-container', 'mb-3', 'form-label', 'form-select', 'text-muted', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'text-center', 'text-muted', 'py-5', 'material-icons', 'mt-2', 'video-player', 'video-controls', 'mt-3', 'text-muted',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
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
let __VLS_self;
