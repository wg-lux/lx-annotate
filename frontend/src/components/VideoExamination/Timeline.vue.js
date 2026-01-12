import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { formatTime as formatTimeHelper, calculateSegmentWidth, calculateSegmentPosition } from '@/utils/timeHelpers';
import { useVideoStore } from '@/stores/videoStore';
import {} from '@/stores/videoStore';
import { useToastStore } from '@/stores/toastStore';
import { getRandomColor } from '@/utils/colorHelpers';
const toast = useToastStore();
const videoStore = useVideoStore();
const props = defineProps();
const emit = defineEmits();
// Refs with proper types
const timeline = ref(null);
const waveformCanvas = ref(null);
const cleanupFunctions = ref([]);
const zoomLevel = ref(1);
const isSelecting = ref(false);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const markerAreaHeight = 36;
const rowHeight = 56;
const rowContentHeight = 48;
const timelinePadding = 12;
const visibleRowCount = 1;
// Context menu
const contextMenu = ref({
    visible: false,
    x: 0,
    y: 0,
    segment: null
});
// Tooltip
const tooltip = ref({
    visible: false,
    x: 0,
    y: 0,
    text: ''
});
// Computed properties
const duration = computed(() => props.video?.duration || 0);
// Protected playhead calculation
const playheadPosition = computed(() => {
    const videoDuration = duration.value;
    const currentVideoTime = props.currentTime ?? 0;
    if (!videoDuration || !Number.isFinite(videoDuration))
        return 0;
    if (!Number.isFinite(currentVideoTime) || currentVideoTime < 0)
        return 0;
    const percentage = (currentVideoTime / videoDuration) * 100;
    if (!Number.isFinite(percentage))
        return 0;
    return Math.max(0, Math.min(100, percentage));
});
const timeMarkers = computed(() => {
    const markers = [];
    const totalTime = duration.value;
    if (!totalTime)
        return markers;
    const baseInterval = 10;
    const interval = baseInterval / zoomLevel.value;
    const markerCount = Math.floor(totalTime / interval);
    for (let i = 0; i <= markerCount; i++) {
        const time = i * interval;
        if (time <= totalTime) {
            markers.push({
                time,
                position: (time / totalTime) * 100
            });
        }
    }
    return markers;
});
// Canonicalization: assume Segment is already camelCase
const getColorForLabel = (label) => {
    return videoStore.getColorForLabel(label);
};
const getTranslationForLabel = (label) => {
    return videoStore.getTranslationForLabel(label);
};
const toCanonical = (s) => {
    const color = s.color ?? getColorForLabel(s.label) ?? getRandomColor();
    return {
        ...s,
        start: s.startTime,
        end: s.endTime,
        color,
        avgConfidence: s.avgConfidence ?? 0,
    };
};
// 1. Define displayedSegments FIRST (Computed)
// This sanitizes raw props into the format the timeline needs
const displayedSegments = computed(() => {
    const segs = props.segments || [];
    if (segs.length === 0)
        return [];
    return segs.map(toCanonical);
});
// 2. Define labelOrder SECOND (Computed)
// This AUTOMATICALLY extracts labels from the segments above.
// No watchers needed!
const labelOrder = computed(() => {
    const labels = new Set();
    displayedSegments.value.forEach(s => labels.add(s.label));
    return Array.from(labels).sort(); // Sorts A-Z. Remove .sort() if you want random order.
});
// 3. Define selectedLabel (State)
const selectedLabel = ref(null);
// 4. Define selectSegment (Action)
const selectSegment = (segment) => {
    selectedLabel.value = segment.label;
    emit('segment-select', Number(segment.id));
};
// 5. Define segmentRows THIRD (Computed)
// This depends on the two computed properties above.
const segmentRows = computed(() => {
    const buckets = {};
    // Group segments by label
    for (const s of displayedSegments.value) {
        if (!s.label)
            continue;
        (buckets[s.label] ||= []).push(s);
    }
    // Determine the order of rows based on selection + labelOrder
    const orderedLabels = selectedLabel.value
        ? [selectedLabel.value, ...labelOrder.value.filter(l => l !== selectedLabel.value)]
        : [...labelOrder.value];
    const rows = [];
    // Create rows based on overlapping logic
    orderedLabels.forEach(label => {
        if (!buckets[label])
            return;
        const segs = buckets[label].sort((a, b) => a.start - b.start);
        let physicalIdx = 0;
        let currentRow = {
            key: `${label}-0`,
            label,
            rowNumber: rows.length,
            segments: [],
            maxEndTime: 0,
        };
        for (const seg of segs) {
            if (seg.start < currentRow.maxEndTime - 1e-4) {
                rows.push(currentRow);
                physicalIdx += 1;
                currentRow = {
                    key: `${label}-${physicalIdx}`,
                    label,
                    rowNumber: rows.length,
                    segments: [],
                    maxEndTime: 0,
                };
            }
            currentRow.segments.push(seg);
            currentRow.maxEndTime = Math.max(currentRow.maxEndTime, seg.end);
        }
        rows.push(currentRow);
    });
    return rows;
});
// Timeline height
const totalRowsHeight = computed(() => segmentRows.value.length * rowHeight);
const visibleRows = computed(() => Math.max(1, Math.min(segmentRows.value.length, visibleRowCount)));
const timelineHeight = computed(() => {
    return markerAreaHeight + (visibleRows.value * rowHeight) + timelinePadding;
});
// Helpers
const formatTime = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds))
        return '00:00';
    return formatTimeHelper(seconds);
};
const formatDuration = (startTime, endTime) => {
    const d = endTime - startTime;
    return formatTimeHelper(d);
};
const getSegmentPosition = (startTime) => {
    const position = calculateSegmentPosition(startTime, duration.value);
    if (!Number.isFinite(position) || position < 0) {
        console.error('[Timeline] Invalid segment position calculated:', {
            startTime,
            duration: duration.value,
            position
        });
        return 0;
    }
    return position;
};
const getSegmentWidth = (startTime, endTime) => {
    const width = calculateSegmentWidth(startTime, endTime, duration.value);
    if (!Number.isFinite(width) || width <= 0) {
        console.error('[Timeline] Invalid segment width calculated:', {
            startTime,
            endTime,
            duration: duration.value,
            width
        });
        return 0;
    }
    return width;
};
function useDragResize(el, opt) {
    let mode = null;
    let pxStart = 0;
    let startLeft = 0;
    let startWidth = 0;
    let draftStart = 0;
    let draftEnd = 0;
    const pxToTime = (px) => (px / opt.trackPx()) * opt.duration();
    function down(ev) {
        const target = ev.target;
        if (target.closest('.segment-delete-btn')) {
            return;
        }
        ev.stopPropagation();
        const handle = target.closest('.resize-handle');
        if (handle?.classList.contains('start-handle'))
            mode = 'start';
        else if (handle?.classList.contains('end-handle'))
            mode = 'end';
        else
            mode = 'drag';
        pxStart = ev.clientX;
        startLeft = el.offsetLeft;
        startWidth = el.offsetWidth;
        el.setPointerCapture(ev.pointerId);
        ev.preventDefault();
    }
    function move(ev) {
        if (!mode)
            return;
        const dx = ev.clientX - pxStart;
        if (mode === 'drag') {
            let left = Math.min(Math.max(0, startLeft + dx), opt.trackPx() - startWidth);
            el.style.left = left + 'px';
            draftStart = left;
            draftEnd = left + startWidth;
        }
        if (mode === 'start') {
            let left = Math.min(startLeft + dx, startLeft + startWidth - 10);
            let width = startWidth + (startLeft - left);
            el.style.left = left + 'px';
            el.style.width = width + 'px';
            draftStart = left;
            draftEnd = left + width;
        }
        if (mode === 'end') {
            let width = Math.max(10, startWidth + dx);
            el.style.width = width + 'px';
            el.style.left = startLeft + 'px';
            draftStart = startLeft;
            draftEnd = startLeft + width;
        }
    }
    function up(ev) {
        if (!mode)
            return;
        move(ev);
        const s = draftStart;
        const e = draftEnd;
        if (mode === 'drag') {
            opt.onMove(pxToTime(s), pxToTime(e));
        }
        else {
            opt.onResize(pxToTime(s), pxToTime(e), mode);
        }
        mode = null;
        el.releasePointerCapture(ev.pointerId);
        opt.onDone();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
    };
}
const initializeDragResize = () => {
    cleanupFunctions.value.forEach(cleanup => cleanup());
    cleanupFunctions.value = [];
    if (!timeline.value)
        return;
    nextTick(() => {
        segmentRows.value.forEach(row => {
            row.segments.forEach(segment => {
                const el = document.querySelector(`[data-id="${segment.id}"]`);
                if (!el)
                    return;
                const cleanup = useDragResize(el, {
                    trackPx: () => timeline.value.offsetWidth,
                    duration: () => duration.value,
                    onMove: (startS, endS) => {
                        const localSegment = displayedSegments.value.find(s => s.id === segment.id);
                        if (localSegment) {
                            localSegment.start = startS;
                            localSegment.end = endS;
                            localSegment.startTime = startS;
                            localSegment.endTime = endS;
                        }
                        emit('segment-move', Number(segment.id), startS, endS);
                    },
                    onResize: (startS, endS, edge) => {
                        const localSegment = displayedSegments.value.find(s => s.id === segment.id);
                        if (localSegment) {
                            localSegment.start = startS;
                            localSegment.end = endS;
                            localSegment.startTime = startS;
                            localSegment.endTime = endS;
                        }
                        emit('segment-resize', Number(segment.id), startS, endS, edge);
                    },
                    onDone: () => {
                        const localSegment = displayedSegments.value.find(s => s.id === segment.id);
                        if (!localSegment)
                            return;
                        const numericId = getNumericSegmentId(segment.id);
                        if (numericId === null)
                            return;
                        emit('segment-resize', numericId, localSegment.start, localSegment.end, 'end', true);
                    }
                });
                cleanupFunctions.value.push(cleanup);
            });
        });
    });
};
// Zoom
const zoomIn = () => {
    if (zoomLevel.value < 5) {
        zoomLevel.value = Math.min(5, zoomLevel.value + 0.5);
    }
};
const zoomOut = () => {
    if (zoomLevel.value > 1) {
        zoomLevel.value = Math.max(1, zoomLevel.value - 0.5);
    }
};
// Playback
const playPause = () => {
    emit('play-pause');
};
const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement))
        return false;
    if (target.isContentEditable)
        return true;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};
const deleteSelectedSegment = () => {
    if (props.activeSegmentId == null)
        return;
    const segmentToDelete = displayedSegments.value.find(segment => Number(segment.id) === Number(props.activeSegmentId));
    if (!segmentToDelete)
        return;
    emit('segment-delete', segmentToDelete);
};
const handleKeyDown = (event) => {
    if (isEditableTarget(event.target))
        return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (props.activeSegmentId == null)
            return;
        event.preventDefault();
        deleteSelectedSegment();
    }
};
// Context actions
const editSegment = (segment) => {
    if (!segment)
        return;
    hideContextMenu();
    emit('segment-edit', segment);
};
const deleteSegment = (segment) => {
    if (!segment)
        return;
    hideContextMenu();
    emit('segment-delete', segment);
};
const playSegment = (segment) => {
    if (!segment)
        return;
    hideContextMenu();
    emit('seek', segment.startTime || 0);
    emit('play-pause');
};
// Context menu
const showSegmentMenu = (segment, event) => {
    contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        segment
    };
};
const hideContextMenu = () => {
    contextMenu.value.visible = false;
};
// Timeline interaction
const onTimelineMouseDown = (event) => {
    if (!timeline.value)
        return;
    const rect = timeline.value.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration.value;
    if (props.selectionMode) {
        isSelecting.value = true;
        selectionStart.value = (clickX / rect.width) * 100;
        selectionEnd.value = selectionStart.value;
        document.addEventListener('mousemove', onSelectionMouseMove);
        document.addEventListener('mouseup', onSelectionMouseUp);
    }
    else {
        emit('seek', clickTime);
    }
};
const onSelectionMouseMove = (event) => {
    if (!isSelecting.value || !timeline.value)
        return;
    const rect = timeline.value.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    selectionEnd.value = Math.max(0, Math.min(100, (currentX / rect.width) * 100));
};
const onSelectionMouseUp = (event) => {
    if (!isSelecting.value || !timeline.value)
        return;
    const startPercent = Math.min(selectionStart.value, selectionEnd.value);
    const endPercent = Math.max(selectionStart.value, selectionEnd.value);
    const startTime = (startPercent / 100) * duration.value;
    const endTime = (endPercent / 100) * duration.value;
    if (endTime - startTime > 0.1) {
        emit('time-selection', { start: startTime, end: endTime });
    }
    isSelecting.value = false;
    selectionStart.value = 0;
    selectionEnd.value = 0;
    document.removeEventListener('mousemove', onSelectionMouseMove);
    document.removeEventListener('mouseup', onSelectionMouseUp);
};
// Waveform
const initializeWaveform = () => {
    if (!waveformCanvas.value || !props.video)
        return;
    const canvas = waveformCanvas.value;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 2) {
        const amplitude = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
        if (x === 0) {
            ctx.moveTo(x, amplitude);
        }
        else {
            ctx.lineTo(x, amplitude);
        }
    }
    ctx.stroke();
};
// Click outside
const handleClickOutside = (event) => {
    if (contextMenu.value.visible && !event.target?.closest('.context-menu')) {
        hideContextMenu();
    }
};
// Lifecycle
watch(() => props.video, () => {
    if (props.showWaveform) {
        nextTick(() => {
            initializeWaveform();
        });
    }
});
watch(segmentRows, () => nextTick(initializeDragResize), { immediate: true });
watch(segmentRows, (rows) => {
    rows.forEach(row => {
        row.segments.forEach(s => {
            if (getSegmentWidth(s.start, s.end) === 0) {
                console.warn('[Timeline] Segment mit 0% Breite:', s);
            }
        });
    });
}, { immediate: true });
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    nextTick(() => {
        initializeDragResize();
    });
    if (props.showWaveform) {
        nextTick(() => {
            initializeWaveform();
        });
    }
    toast.success({ text: '[Timeline] Component mounted and ready' });
});
onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
    cleanupFunctions.value.forEach(cleanup => cleanup());
    cleanupFunctions.value = [];
    document.removeEventListener('mousemove', onSelectionMouseMove);
    document.removeEventListener('mouseup', onSelectionMouseUp);
});
// Helper for numeric IDs
const getNumericSegmentId = (segmentId) => {
    if (typeof segmentId === 'number' && Number.isFinite(segmentId))
        return segmentId;
    console.error('[Timeline] Unexpected segment ID:', segmentId);
    return null;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['play-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['play-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['control-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['control-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['control-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-row']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-content']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.playPause) },
    ...{ class: "play-btn" },
    disabled: (!__VLS_ctx.video),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: (__VLS_ctx.isPlaying ? 'fas fa-pause' : 'fas fa-play') },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.deleteSelectedSegment) },
    ...{ class: "control-btn danger" },
    disabled: (__VLS_ctx.activeSegmentId == null),
    title: "Ausgewähltes Segment löschen (Entf)",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-trash" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "time-display" },
});
(__VLS_ctx.formatTime(__VLS_ctx.currentTime));
(__VLS_ctx.formatTime(__VLS_ctx.duration));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "zoom-controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.zoomOut) },
    disabled: (__VLS_ctx.zoomLevel <= 1),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-search-minus" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "zoom-level" },
});
(Math.round(__VLS_ctx.zoomLevel * 100));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.zoomIn) },
    disabled: (__VLS_ctx.zoomLevel >= 5),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-search-plus" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-wrapper" },
    ...{ style: ({ height: __VLS_ctx.timelineHeight + 'px' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMousedown: (__VLS_ctx.onTimelineMouseDown) },
    ...{ class: "timeline" },
    ref: "timeline",
    ...{ style: ({ height: __VLS_ctx.timelineHeight + 'px' }) },
});
/** @type {typeof __VLS_ctx.timeline} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "time-markers" },
});
for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.timeMarkers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (marker.time),
        ...{ class: "time-marker" },
        ...{ style: ({ left: marker.position + '%' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "marker-line" },
        ...{ style: ({ height: __VLS_ctx.timelineHeight + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "marker-text" },
    });
    (__VLS_ctx.formatTime(marker.time));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "segments-container" },
    ...{ style: ({
            marginTop: __VLS_ctx.markerAreaHeight + 'px',
            height: __VLS_ctx.totalRowsHeight + 'px'
        }) },
});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.segmentRows))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.key),
        ...{ class: "segment-row" },
        ...{ class: ({ 'active': row.label === __VLS_ctx.selectedLabel }) },
        ...{ style: ({
                top: (row.rowNumber * __VLS_ctx.rowHeight) + 'px',
                height: __VLS_ctx.rowContentHeight + 'px'
            }) },
    });
    for (const [segment] of __VLS_getVForSourceType((row.segments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.selectSegment(segment);
                } },
            ...{ onContextmenu: (...[$event]) => {
                    __VLS_ctx.showSegmentMenu(segment, $event);
                } },
            key: (segment.id),
            ...{ class: "segment" },
            ...{ class: ({
                    'active': segment.id === __VLS_ctx.activeSegmentId,
                    'draft': segment.isDraft,
                    'too-small': __VLS_ctx.getSegmentWidth(segment.start, segment.end) < 5
                }) },
            ...{ style: ({
                    left: __VLS_ctx.getSegmentPosition(segment.start) + '%',
                    width: __VLS_ctx.getSegmentWidth(segment.start, segment.end) + '%',
                    backgroundColor: segment.color || __VLS_ctx.getColorForLabel(segment.label),
                    borderColor: segment.isDraft ? '#ff9800' : 'transparent'
                }) },
            'data-id': (segment.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "resize-handle start-handle" },
            title: ('Segment-Start ändern'),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-grip-lines-vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "segment-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "segment-label" },
        });
        (__VLS_ctx.getTranslationForLabel(segment.label));
        if (__VLS_ctx.getSegmentWidth(segment.start, segment.end) >= 5) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "segment-duration" },
            });
            (__VLS_ctx.formatDuration(segment.start, segment.end));
        }
        if (__VLS_ctx.getSegmentWidth(segment.start, segment.end) >= 8) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.getSegmentWidth(segment.start, segment.end) >= 8))
                            return;
                        __VLS_ctx.deleteSegment(segment);
                    } },
                ...{ class: "segment-delete-btn" },
                title: ('Segment löschen'),
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "resize-handle end-handle" },
            title: ('Segment-Ende ändern'),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-grip-lines-vertical" },
        });
        if (segment.isDraft) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "draft-indicator" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-edit" },
            });
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "playhead" },
    ...{ style: ({ left: __VLS_ctx.playheadPosition + '%', height: __VLS_ctx.timelineHeight + 'px' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "playhead-line" },
    ...{ style: ({ height: __VLS_ctx.timelineHeight + 'px' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "playhead-handle" },
});
if (__VLS_ctx.isSelecting) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selection-overlay" },
        ...{ style: ({
                left: Math.min(__VLS_ctx.selectionStart, __VLS_ctx.selectionEnd) + '%',
                width: Math.abs(__VLS_ctx.selectionEnd - __VLS_ctx.selectionStart) + '%',
                height: __VLS_ctx.timelineHeight + 'px'
            }) },
    });
}
if (__VLS_ctx.showWaveform) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "waveform-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
        ref: "waveformCanvas",
        ...{ class: "waveform-canvas" },
    });
    /** @type {typeof __VLS_ctx.waveformCanvas} */ ;
}
if (__VLS_ctx.contextMenu.visible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: () => { } },
        ...{ class: "context-menu" },
        ...{ style: ({ left: __VLS_ctx.contextMenu.x + 'px', top: __VLS_ctx.contextMenu.y + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.contextMenu.visible))
                    return;
                __VLS_ctx.editSegment(__VLS_ctx.contextMenu.segment);
            } },
        ...{ class: "context-menu-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-edit" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.contextMenu.visible))
                    return;
                __VLS_ctx.deleteSegment(__VLS_ctx.contextMenu.segment);
            } },
        ...{ class: "context-menu-item danger" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-trash" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-menu-separator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.contextMenu.visible))
                    return;
                __VLS_ctx.playSegment(__VLS_ctx.contextMenu.segment);
            } },
        ...{ class: "context-menu-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-play" },
    });
}
if (__VLS_ctx.tooltip.visible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-tooltip" },
        ...{ style: ({ left: __VLS_ctx.tooltip.x + 'px', top: __VLS_ctx.tooltip.y + 'px' }) },
    });
    (__VLS_ctx.tooltip.text);
}
/** @type {__VLS_StyleScopedClasses['timeline-container']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['play-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['control-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash']} */ ;
/** @type {__VLS_StyleScopedClasses['time-display']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-search-minus']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-level']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-search-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['time-markers']} */ ;
/** @type {__VLS_StyleScopedClasses['time-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['marker-line']} */ ;
/** @type {__VLS_StyleScopedClasses['marker-text']} */ ;
/** @type {__VLS_StyleScopedClasses['segments-container']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-row']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['segment']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['draft']} */ ;
/** @type {__VLS_StyleScopedClasses['too-small']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['start-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-grip-lines-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-content']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-label']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-duration']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['end-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-grip-lines-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['draft-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['playhead']} */ ;
/** @type {__VLS_StyleScopedClasses['playhead-line']} */ ;
/** @type {__VLS_StyleScopedClasses['playhead-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['selection-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['waveform-container']} */ ;
/** @type {__VLS_StyleScopedClasses['waveform-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-separator']} */ ;
/** @type {__VLS_StyleScopedClasses['context-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-play']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-tooltip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            timeline: timeline,
            waveformCanvas: waveformCanvas,
            zoomLevel: zoomLevel,
            isSelecting: isSelecting,
            selectionStart: selectionStart,
            selectionEnd: selectionEnd,
            markerAreaHeight: markerAreaHeight,
            rowHeight: rowHeight,
            rowContentHeight: rowContentHeight,
            contextMenu: contextMenu,
            tooltip: tooltip,
            duration: duration,
            playheadPosition: playheadPosition,
            timeMarkers: timeMarkers,
            getColorForLabel: getColorForLabel,
            getTranslationForLabel: getTranslationForLabel,
            selectedLabel: selectedLabel,
            selectSegment: selectSegment,
            segmentRows: segmentRows,
            totalRowsHeight: totalRowsHeight,
            timelineHeight: timelineHeight,
            formatTime: formatTime,
            formatDuration: formatDuration,
            getSegmentPosition: getSegmentPosition,
            getSegmentWidth: getSegmentWidth,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            playPause: playPause,
            deleteSelectedSegment: deleteSelectedSegment,
            editSegment: editSegment,
            deleteSegment: deleteSegment,
            playSegment: playSegment,
            showSegmentMenu: showSegmentMenu,
            onTimelineMouseDown: onTimelineMouseDown,
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
