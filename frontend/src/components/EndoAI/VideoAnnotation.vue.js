import { defineComponent, ref, computed } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import Timeline from './Timeline.vue';
export default defineComponent({
    name: 'VideoAnnotation',
    components: { Timeline },
    setup() {
        const videoStore = useVideoStore();
        // assume videoUrl, duration, and allSegments are defined in the store
        const videoUrl = computed(() => videoStore.videoUrl);
        const duration = computed(() => videoStore.duration);
        const allSegments = computed(() => videoStore.allSegments.values); // Fix: Use `value` instead of `values`
        const videoRef = ref(null);
        function handleSegmentResize(id, newEnd) {
            console.log(`Segment ${id} resized to end at ${newEnd}`);
            // Optionally persist/update via store or API call here
        }
        return {
            videoUrl,
            duration,
            allSegments,
            videoRef,
            handleSegmentResize,
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ref: ("videoRef"),
        src: ((__VLS_ctx.videoUrl)),
        controls: (true),
        ...{ class: ("video-player") },
    });
    // @ts-ignore navigation for `const videoRef = ref()`
    /** @type { typeof __VLS_ctx.videoRef } */ ;
    const __VLS_0 = {}.Timeline;
    /** @type { [typeof __VLS_components.Timeline, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onResize': {} },
        segments: ((__VLS_ctx.allSegments)),
        duration: ((__VLS_ctx.duration)),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onResize': {} },
        segments: ((__VLS_ctx.allSegments)),
        duration: ((__VLS_ctx.duration)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_6;
    const __VLS_7 = {
        onResize: (__VLS_ctx.handleSegmentResize)
    };
    let __VLS_3;
    let __VLS_4;
    var __VLS_5;
    ['video-annotation-container', 'video-player',];
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
