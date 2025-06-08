import { defineComponent, ref, onUnmounted, computed } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
export default defineComponent({
    name: 'Timeline',
    props: {
        duration: {
            type: Number,
            required: true,
        },
    },
    emits: ['resize', 'seek'],
    setup(props, { emit }) {
        const videoStore = useVideoStore();
        const timelineRef = ref(null);
        const activeSegment = ref(null);
        const isResizing = ref(false);
        const startX = ref(0);
        const initialWidthPercent = ref(0);
        const lastTimestamp = ref(0);
        const allSegments = computed(() => {
            const segments = videoStore.allSegments;
            // Sort segments by start time for proper layering
            return segments.sort((a, b) => a.startTime - b.startTime);
        });
        // Calculate vertical positioning to avoid overlaps
        const getSegmentVerticalPosition = (segment, allSegs) => {
            const currentIndex = allSegs.findIndex(s => s.id === segment.id);
            const segmentsBefore = allSegs.slice(0, currentIndex);
            // Find segments that overlap with current segment
            const overlappingSegments = segmentsBefore.filter(s => (s.startTime < segment.endTime && s.endTime > segment.startTime));
            // Calculate row based on overlaps (max 3 rows)
            const row = overlappingSegments.length % 3;
            return row * 28; // 28px per row (24px height + 4px gap)
        };
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
            if (!timelineRef.value)
                return;
            const rect = timelineRef.value.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const percentX = (offsetX / rect.width) * 100;
            const targetTime = (percentX / 100) * props.duration;
            // Emit event to parent component to seek video
            emit('seek', targetTime);
        }
        function jumpToSegment(segment) {
            // Calculate the middle point of the segment for seeking
            const middlePoint = (segment.startTime + segment.endTime) / 2;
            emit('seek', middlePoint);
        }
        onUnmounted(() => {
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
            jumpToSegment,
            getEnhancedSegmentStyle: videoStore.getEnhancedSegmentStyle,
            duration: props.duration,
            getSegmentVerticalPosition,
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['timeline-segment', 'resize-handle', 'resize-handle', 'timeline-track',];
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
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.jumpToSegment(segment);
                } },
            key: ((segment.id)),
            ...{ class: ("timeline-segment") },
            ...{ style: ((__VLS_ctx.getEnhancedSegmentStyle(segment))) },
            title: ((`${segment.label_display}: ${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s`)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("segment-label") },
        });
        (segment.label_display);
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
    ['timeline-track', 'timeline-segment', 'segment-label', 'resize-handle',];
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
