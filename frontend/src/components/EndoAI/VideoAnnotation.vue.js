"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = require("vue");
const videoStore_1 = require("@/stores/videoStore");
const Timeline_vue_1 = __importDefault(require("./Timeline.vue"));
exports.default = (0, vue_1.defineComponent)({
    name: 'VideoAnnotation',
    components: { Timeline: Timeline_vue_1.default },
    setup() {
        const videoStore = (0, videoStore_1.useVideoStore)();
        const videoUrl = (0, vue_1.computed)(() => videoStore.videoUrl);
        const duration = (0, vue_1.computed)(() => videoStore.duration);
        const allSegments = (0, vue_1.computed)(() => videoStore.allSegments); // Fix: Use `value` instead of `values`
        const videoRef = (0, vue_1.ref)(null);
        function handleSegmentResize(id, newEnd) {
            console.log(`Segment ${id} resized to end at ${newEnd}`);
            // Optionally persist/update via store or API call here
        }
        (0, vue_1.onMounted)(() => {
            videoStore.fetchAllVideos();
            videoStore.fetchVideoUrl();
        });
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
    const __VLS_componentsOption = { Timeline: Timeline_vue_1.default };
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
