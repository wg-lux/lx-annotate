import { ref, computed, provide, watch, onMounted, onUnmounted } from 'vue';
import Segment from './Segment.vue';
const props = withDefaults(defineProps(), {
    showConfidence: true,
    showRowLabels: true,
    labelTranslations: () => ({}),
    hasVideo: false,
    selectionMode: false,
    minRowHeight: 45,
    maxRows: 20
});
const emit = defineEmits();
// Template refs
const containerRef = ref(null);
// Reactive state
const zoomLevel = ref(1);
const isSelecting = ref(false);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const isDragging = ref(false);
const isResizing = ref(false);
const activeResizeSegmentId = ref(null);
const activeDragSegmentId = ref(null);
// Layout constants
const headerHeight = 30;
const rowHeight = computed(() => Math.max(props.minRowHeight, 45));
// Provide timeline context for child components
provide('timelineContext', {
    isDragging: computed(() => isDragging.value),
    isResizing: computed(() => isResizing.value),
    activeSegmentId: computed(() => activeDragSegmentId.value || activeResizeSegmentId.value)
});
// Enhanced multi-row layout algorithm
const segmentRows = computed(() => {
    const segments = [...props.segments];
    if (segments.length === 0)
        return [];
    // Sort segments by start time for optimal placement
    segments.sort((a, b) => {
        const aStart = a.start_time || a.startTime || 0;
        const bStart = b.start_time || b.startTime || 0;
        return aStart - bStart;
    });
    const rows = [];
    for (const segment of segments) {
        const segmentStart = segment.start_time || segment.startTime || 0;
        const segmentEnd = segment.end_time || segment.endTime || 0;
        // Find the first row where this segment can fit without overlapping
        let targetRow = rows.find(row => {
            // Check if there's enough gap after the last segment in this row
            const gap = segmentStart - row.maxEndTime;
            return gap >= 0.1; // Minimum 0.1 second gap
        });
        if (!targetRow && rows.length < props.maxRows) {
            // Create a new row if no suitable row exists and we haven't reached max rows
            targetRow = {
                id: rows.length,
                segments: [],
                maxEndTime: 0,
                minStartTime: Infinity
            };
            rows.push(targetRow);
        }
        if (targetRow) {
            // Add segment to the row and update bounds
            targetRow.segments.push(segment);
            targetRow.maxEndTime = Math.max(targetRow.maxEndTime, segmentEnd);
            targetRow.minStartTime = Math.min(targetRow.minStartTime, segmentStart);
        }
        else {
            // If we've reached max rows, add to the row with earliest end time
            const earliestRow = rows.reduce((prev, current) => prev.maxEndTime < current.maxEndTime ? prev : current);
            if (earliestRow) {
                earliestRow.segments.push(segment);
                earliestRow.maxEndTime = Math.max(earliestRow.maxEndTime, segmentEnd);
                earliestRow.minStartTime = Math.min(earliestRow.minStartTime, segmentStart);
            }
        }
    }
    console.log(`[TimelineContainer] Arranged ${segments.length} segments into ${rows.length} rows`);
    console.log('Row distribution:', rows.map(r => ({
        id: r.id,
        segments: r.segments.length,
        timeSpan: `${formatTime(r.minStartTime)} - ${formatTime(r.maxEndTime)}`
    })));
    return rows;
});
const totalSegments = computed(() => props.segments.length);
const viewportHeight = computed(() => {
    const baseHeight = headerHeight;
    const rowsHeight = segmentRows.value.length * rowHeight.value;
    const padding = 20;
    return baseHeight + rowsHeight + padding;
});
const playheadPosition = computed(() => {
    if (props.duration <= 0)
        return 0;
    return Math.max(0, Math.min(100, (props.currentTime / props.duration) * 100));
});
// Computed properties for time markers
const timeMarkers = computed(() => {
    const markers = [];
    const totalDuration = props.duration;
    if (totalDuration <= 0)
        return markers;
    // Calculate appropriate interval based on zoom and duration
    const interval = Math.max(1, Math.floor(totalDuration / 10));
    for (let i = 0; i <= totalDuration; i += interval) {
        markers.push({
            position: (i / totalDuration) * 100,
            time: i,
            label: formatTime(i)
        });
    }
    return markers;
});
// Helper methods
const formatTime = (seconds) => {
    if (!seconds || seconds < 0)
        return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
// Event handlers
const handleSegmentSelect = (segment) => {
    emit('segment-select', segment);
};
const handleSegmentContextMenu = (segment, event) => {
    emit('segment-contextmenu', segment, event);
};
const handleDragStart = (segment, event) => {
    isDragging.value = true;
    activeDragSegmentId.value = segment.id;
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    event.preventDefault();
};
const handleDragMove = (event) => {
    if (!isDragging.value || !containerRef.value)
        return;
    // Calculate new position and emit move event
    const rect = containerRef.value.getBoundingClientRect();
    const deltaX = event.movementX;
    const deltaTime = (deltaX / rect.width) * props.duration;
    // Emit real-time update
    if (activeDragSegmentId.value !== null) {
        const segment = props.segments.find(s => s.id === activeDragSegmentId.value);
        if (segment) {
            const currentStart = segment.start_time || segment.startTime || 0;
            const currentEnd = segment.end_time || segment.endTime || 0;
            const duration = currentEnd - currentStart;
            let newStart = currentStart + deltaTime;
            newStart = Math.max(0, Math.min(newStart, props.duration - duration));
            emit('segment-move', activeDragSegmentId.value, newStart, newStart + duration, false);
        }
    }
};
const handleDragEnd = (event) => {
    if (activeDragSegmentId.value !== null) {
        // Emit final position
        const segment = props.segments.find(s => s.id === activeDragSegmentId.value);
        if (segment) {
            const currentStart = segment.start_time || segment.startTime || 0;
            const currentEnd = segment.end_time || segment.endTime || 0;
            emit('segment-move', activeDragSegmentId.value, currentStart, currentEnd, true);
        }
    }
    // Cleanup
    isDragging.value = false;
    activeDragSegmentId.value = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
};
const handleResizeStart = (segment, mode, event) => {
    isResizing.value = true;
    activeResizeSegmentId.value = segment.id;
    // Add global mouse event listeners  
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    event.preventDefault();
};
const handleResizeMove = (event) => {
    if (!isResizing.value || !containerRef.value)
        return;
    // Calculate resize delta and emit resize event
    const rect = containerRef.value.getBoundingClientRect();
    const deltaX = event.movementX;
    const deltaTime = (deltaX / rect.width) * props.duration;
    if (activeResizeSegmentId.value !== null) {
        const segment = props.segments.find(s => s.id === activeResizeSegmentId.value);
        if (segment) {
            const currentStart = segment.start_time || segment.startTime || 0;
            const currentEnd = segment.end_time || segment.endTime || 0;
            // Determine resize mode and calculate new bounds
            // This is simplified - real implementation would track resize mode
            emit('segment-resize', activeResizeSegmentId.value, currentStart, currentEnd + deltaTime, 'end', false);
        }
    }
};
const handleResizeEnd = (event) => {
    if (activeResizeSegmentId.value !== null) {
        // Emit final resize
        const segment = props.segments.find(s => s.id === activeResizeSegmentId.value);
        if (segment) {
            const currentStart = segment.start_time || segment.startTime || 0;
            const currentEnd = segment.end_time || segment.endTime || 0;
            emit('segment-resize', activeResizeSegmentId.value, currentStart, currentEnd, 'end', true);
        }
    }
    // Cleanup
    isResizing.value = false;
    activeResizeSegmentId.value = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
};
const handleTimelineMouseDown = (event) => {
    if (!containerRef.value || isDragging.value || isResizing.value)
        return;
    const rect = containerRef.value.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickTime = (clickX / rect.width) * props.duration;
    if (props.selectionMode) {
        // Start time selection
        isSelecting.value = true;
        selectionStart.value = (clickX / rect.width) * 100;
        selectionEnd.value = selectionStart.value;
        document.addEventListener('mousemove', handleSelectionMove);
        document.addEventListener('mouseup', handleSelectionEnd);
    }
    else {
        // Seek to time
        emit('seek', clickTime);
    }
};
const handleSelectionMove = (event) => {
    if (!isSelecting.value || !containerRef.value)
        return;
    const rect = containerRef.value.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    selectionEnd.value = Math.max(0, Math.min(100, (currentX / rect.width) * 100));
};
const handleSelectionEnd = (event) => {
    if (!isSelecting.value)
        return;
    const startPercent = Math.min(selectionStart.value, selectionEnd.value);
    const endPercent = Math.max(selectionStart.value, selectionEnd.value);
    const startTime = (startPercent / 100) * props.duration;
    const endTime = (endPercent / 100) * props.duration;
    if (endTime - startTime > 0.1) {
        emit('time-selection', { start: startTime, end: endTime });
    }
    // Cleanup
    isSelecting.value = false;
    document.removeEventListener('mousemove', handleSelectionMove);
    document.removeEventListener('mouseup', handleSelectionEnd);
};
const startPlayheadDrag = (event) => {
    const handlePlayheadMove = (e) => {
        if (!containerRef.value)
            return;
        const rect = containerRef.value.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const time = (percentage / 100) * props.duration;
        emit('seek', time);
    };
    const handlePlayheadEnd = () => {
        document.removeEventListener('mousemove', handlePlayheadMove);
        document.removeEventListener('mouseup', handlePlayheadEnd);
    };
    document.addEventListener('mousemove', handlePlayheadMove);
    document.addEventListener('mouseup', handlePlayheadEnd);
    event.preventDefault();
};
const handleWheel = (event) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomLevel.value = Math.max(0.5, Math.min(5, zoomLevel.value * zoomFactor));
};
// Watch for segment changes and log row arrangement
watch(() => props.segments, (newSegments) => {
    if (newSegments.length > 0) {
        console.log(`[TimelineContainer] ${newSegments.length} segments updated`);
    }
}, { immediate: true });
// Cleanup on unmount
onUnmounted(() => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.removeEventListener('mousemove', handleSelectionMove);
    document.removeEventListener('mouseup', handleSelectionEnd);
});
// Expose methods and reactive state for testing
const __VLS_exposed = {
    // Reactive state
    zoomLevel,
    isSelecting,
    selectionStart,
    selectionEnd,
    isDragging,
    isResizing,
    activeResizeSegmentId,
    activeDragSegmentId,
    // Methods
    handleDragStart,
    handleDragEnd,
    handleResizeStart,
    formatTime,
    segmentRows
};
defineExpose({
    // Reactive state
    zoomLevel,
    isSelecting,
    selectionStart,
    selectionEnd,
    isDragging,
    isResizing,
    activeResizeSegmentId,
    activeDragSegmentId,
    // Methods
    handleDragStart,
    handleDragEnd,
    handleResizeStart,
    formatTime,
    segmentRows
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    showConfidence: true,
    showRowLabels: true,
    labelTranslations: () => ({}),
    hasVideo: false,
    selectionMode: false,
    minRowHeight: 45,
    maxRows: 20
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['play-btn', 'play-btn', 'segment-row', 'playhead-handle', 'timeline-interaction', 'timeline-header', 'timeline-controls', 'timeline-info', 'row-label',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-container") },
        ref: ("containerRef"),
    });
    // @ts-ignore navigation for `const containerRef = ref()`
    /** @type { typeof __VLS_ctx.containerRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-controls") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('play-pause');
            } },
        ...{ class: ("play-btn") },
        disabled: ((!__VLS_ctx.hasVideo)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ((__VLS_ctx.isPlaying ? 'fas fa-pause' : 'fas fa-play')) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("time-display") },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-info") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("segment-count") },
    });
    (__VLS_ctx.totalSegments);
    (__VLS_ctx.segmentRows.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("zoom-level") },
    });
    (Math.round(__VLS_ctx.zoomLevel * 100));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-viewport") },
        ...{ style: (({ height: __VLS_ctx.viewportHeight + 'px' })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("time-markers") },
        ...{ style: (({ height: __VLS_ctx.viewportHeight + 'px' })) },
    });
    for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.timeMarkers))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((marker.time)),
            ...{ class: ("time-marker") },
            ...{ style: (({ left: marker.position + '%', height: __VLS_ctx.viewportHeight + 'px' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("marker-line") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("marker-text") },
        });
        (__VLS_ctx.formatTime(marker.time));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("segments-container") },
    });
    for (const [row, rowIndex] of __VLS_getVForSourceType((__VLS_ctx.segmentRows))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((`row-${rowIndex}`)),
            ...{ class: ("segment-row") },
            ...{ style: (({
                    top: (__VLS_ctx.headerHeight + rowIndex * __VLS_ctx.rowHeight) + 'px',
                    height: __VLS_ctx.rowHeight + 'px'
                })) },
        });
        if (__VLS_ctx.showRowLabels) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row-label") },
            });
            (rowIndex + 1);
        }
        for (const [segment] of __VLS_getVForSourceType((row.segments))) {
            // @ts-ignore
            /** @type { [typeof Segment, ] } */ ;
            // @ts-ignore
            const __VLS_0 = __VLS_asFunctionalComponent(Segment, new Segment({
                ...{ 'onSelect': {} },
                ...{ 'onContextmenu': {} },
                ...{ 'onDragStart': {} },
                ...{ 'onResizeStart': {} },
                key: ((segment.id)),
                segment: ((segment)),
                videoDuration: ((__VLS_ctx.duration)),
                isActive: ((segment.id === __VLS_ctx.activeSegmentId)),
                showConfidence: ((__VLS_ctx.showConfidence)),
                labelTranslations: ((__VLS_ctx.labelTranslations)),
            }));
            const __VLS_1 = __VLS_0({
                ...{ 'onSelect': {} },
                ...{ 'onContextmenu': {} },
                ...{ 'onDragStart': {} },
                ...{ 'onResizeStart': {} },
                key: ((segment.id)),
                segment: ((segment)),
                videoDuration: ((__VLS_ctx.duration)),
                isActive: ((segment.id === __VLS_ctx.activeSegmentId)),
                showConfidence: ((__VLS_ctx.showConfidence)),
                labelTranslations: ((__VLS_ctx.labelTranslations)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_0));
            let __VLS_5;
            const __VLS_6 = {
                onSelect: (__VLS_ctx.handleSegmentSelect)
            };
            const __VLS_7 = {
                onContextmenu: (__VLS_ctx.handleSegmentContextMenu)
            };
            const __VLS_8 = {
                onDragStart: (__VLS_ctx.handleDragStart)
            };
            const __VLS_9 = {
                onResizeStart: (__VLS_ctx.handleResizeStart)
            };
            let __VLS_2;
            let __VLS_3;
            var __VLS_4;
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("playhead") },
        ...{ style: (({ left: __VLS_ctx.playheadPosition + '%', height: __VLS_ctx.viewportHeight + 'px' })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("playhead-line") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (__VLS_ctx.startPlayheadDrag) },
        ...{ class: ("playhead-handle") },
    });
    if (__VLS_ctx.isSelecting) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selection-overlay") },
            ...{ style: (({
                    left: Math.min(__VLS_ctx.selectionStart, __VLS_ctx.selectionEnd) + '%',
                    width: Math.abs(__VLS_ctx.selectionEnd - __VLS_ctx.selectionStart) + '%',
                    height: __VLS_ctx.viewportHeight + 'px'
                })) },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (__VLS_ctx.handleTimelineMouseDown) },
        ...{ onWheel: (__VLS_ctx.handleWheel) },
        ...{ class: ("timeline-interaction") },
        ...{ style: (({ height: __VLS_ctx.viewportHeight + 'px' })) },
    });
    ['timeline-container', 'timeline-header', 'timeline-controls', 'play-btn', 'time-display', 'timeline-info', 'segment-count', 'zoom-level', 'timeline-viewport', 'time-markers', 'time-marker', 'marker-line', 'marker-text', 'segments-container', 'segment-row', 'row-label', 'playhead', 'playhead-line', 'playhead-handle', 'selection-overlay', 'timeline-interaction',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'containerRef': __VLS_nativeElements['div'],
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
            Segment: Segment,
            containerRef: containerRef,
            zoomLevel: zoomLevel,
            isSelecting: isSelecting,
            selectionStart: selectionStart,
            selectionEnd: selectionEnd,
            headerHeight: headerHeight,
            rowHeight: rowHeight,
            segmentRows: segmentRows,
            totalSegments: totalSegments,
            viewportHeight: viewportHeight,
            playheadPosition: playheadPosition,
            timeMarkers: timeMarkers,
            formatTime: formatTime,
            handleSegmentSelect: handleSegmentSelect,
            handleSegmentContextMenu: handleSegmentContextMenu,
            handleDragStart: handleDragStart,
            handleResizeStart: handleResizeStart,
            handleTimelineMouseDown: handleTimelineMouseDown,
            startPlayheadDrag: startPlayheadDrag,
            handleWheel: handleWheel,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
