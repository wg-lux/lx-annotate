"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = require("vue");
const videoStore_1 = require("@/stores/videoStore");
exports.default = (0, vue_1.defineComponent)({
    name: 'Timeline',
    props: {
        duration: {
            type: Number,
            required: true,
        },
    },
    emits: ['resize'],
    setup(props, { emit }) {
        const videoStore = (0, videoStore_1.useVideoStore)();
        const timelineRef = (0, vue_1.ref)(null);
        const activeSegment = (0, vue_1.ref)(null);
        const isResizing = (0, vue_1.ref)(false);
        const startX = (0, vue_1.ref)(0);
        const initialWidthPercent = (0, vue_1.ref)(0);
        const lastTimestamp = (0, vue_1.ref)(0);
        const allSegments = (0, vue_1.computed)(() => videoStore.allSegments);
        function calculateWidthPercent(segment) {
            const w = (segment.endTime - segment.startTime) / props.duration * 100;
            return w;
        }
        function onMouseMove(event) {
            const now = Date.now();
            if (now - lastTimestamp.value < 16)
                return;
            lastTimestamp.value = now;
            if (!isResizing.value || !activeSegment.value)
                return;
            const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
            const delta = clientX - startX.value;
            // Calculate new width in percent using the delta and timeline width:
            const timelineWidth = timelineRef.value?.clientWidth || 1;
            const deltaPercent = (delta / timelineWidth) * 100;
            const newWidthPercent = initialWidthPercent.value + deltaPercent;
            // Update using store action (or directly updating the segment)
            videoStore.updateSegment(activeSegment.value.id, {
                endTime: activeSegment.value.startTime + (newWidthPercent * props.duration) / 100,
            });
            emit('resize', activeSegment.value.id, activeSegment.value.endTime);
        }
        function onMouseUp() {
            isResizing.value = false;
            activeSegment.value = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onMouseMove);
            window.removeEventListener('touchend', onMouseUp);
        }
        function startResize(segment, event) {
            isResizing.value = true;
            activeSegment.value = segment;
            const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
            startX.value = clientX;
            initialWidthPercent.value = calculateWidthPercent(segment);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onMouseMove);
            window.addEventListener('touchend', onMouseUp);
        }
        // Optional: handle timeline click
        function handleTimelineClick(event) {
            // Implementation as needed...
        }
        (0, vue_1.onUnmounted)(() => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onMouseMove);
            window.removeEventListener('touchend', onMouseUp);
        });
        return {
            timelineRef,
            allSegments,
            startResize,
            handleTimelineClick,
            getSegmentStyle: videoStore.getSegmentStyle,
            duration: props.duration,
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleTimelineClick) },
        ...{ class: ("timeline-track") },
        ref: ("timelineRef"),
    });
    // @ts-ignore navigation for `const timelineRef = ref()`
    /** @type { typeof __VLS_ctx.timelineRef } */ ;
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.allSegments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((segment.id)),
            ...{ class: ("timeline-segment") },
            ...{ style: ((__VLS_ctx.getSegmentStyle(segment, __VLS_ctx.duration))) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    __VLS_ctx.startResize(segment, $event);
                } },
            ...{ onTouchstart: (...[$event]) => {
                    __VLS_ctx.startResize(segment, $event);
                } },
            ...{ class: ("resize-handle") },
        });
    }
    ['timeline-track', 'timeline-segment', 'resize-handle',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
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
let __VLS_self;
