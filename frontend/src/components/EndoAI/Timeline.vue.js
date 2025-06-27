import { ref, computed, onMounted, onUnmounted, watch, nextTick, ref as vueRef } from 'vue';
import { formatTime as formatTimeHelper, calculateSegmentWidth, calculateSegmentPosition } from '@/utils/timeHelpers';
import { useVideoStore } from '@/stores/videoStore';
import {} from '@/stores/videoStore';
import { normalizeSegmentToCamelCase, } from '@/utils/caseConversion';
import { useToastStore } from '@/stores/toastStore';
import { getRandomColor } from '@/utils/colorHelpers';
const toast = useToastStore();
const videoStore = useVideoStore();
const segmentsByLabel = videoStore.segmentsByLabel;
const props = defineProps();
const emit = defineEmits();
// Refs with proper types
const timeline = ref(null);
const waveformCanvas = ref(null);
const segmentElements = vueRef([]);
const cleanupFunctions = vueRef([]);
const zoomLevel = ref(1);
const isSelecting = ref(false);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const labelOrder = ref([]);
watch(() => props.segments, segs => {
    ;
    (segs || []).forEach(s => {
        if (!labelOrder.value.includes(s.label))
            labelOrder.value.push(s.label);
    });
}, { immediate: true });
// Dragging and resizing state
const draggingSegmentId = ref(null);
const resizingSegmentId = ref(null);
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
// ✅ FIX: Protected playhead calculation to prevent NaN
const playheadPosition = computed(() => {
    const videoDuration = duration.value;
    const currentVideoTime = props.currentTime || 0;
    // ✅ Guard against division by zero and invalid values
    if (!videoDuration || videoDuration === 0 || !Number.isFinite(videoDuration)) {
        console.warn('[Timeline] Duration is 0 or invalid:', videoDuration);
        return 0;
    }
    if (!Number.isFinite(currentVideoTime) || currentVideoTime < 0) {
        console.warn('[Timeline] CurrentTime is invalid:', currentVideoTime);
        return 0;
    }
    const percentage = (currentVideoTime / videoDuration) * 100;
    // ✅ Additional safety check for percentage
    if (!Number.isFinite(percentage)) {
        console.warn('[Timeline] Calculated percentage is NaN:', { currentVideoTime, videoDuration });
        return 0;
    }
    return Math.max(0, Math.min(100, percentage)); // Clamp between 0-100%
});
const timeMarkers = computed(() => {
    const markers = [];
    const totalTime = duration.value;
    if (totalTime === 0)
        return markers;
    // Calculate marker interval based on zoom level
    const baseInterval = 10; // seconds
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
const currentFps = computed(() => props.fps || 50);
const toCanonical = (s) => {
    const n = normalizeSegmentToCamelCase(s);
    const color = getColorForLabel(s.label);
    return {
        ...n,
        start: n.startTime,
        end: n.endTime,
        isDraft: typeof s.id === 'string' && (s.id === 'draft' || s.id.startsWith('temp-')),
        color: color || getRandomColor() || undefined,
        avgConfidence: s.avgConfidence ?? 0,
        label: s.label ?? s.label_name // ✅ FIX: Use label or label_name
    };
};
const selectedLabel = ref(null);
const selectSegment = (segment) => {
    selectedLabel.value = segment.label; // ✅ FIX: Use segment.label instead of segment.label_name
    emit('segment-select', segment);
};
// ✅ FIX: Add getTranslationForLabel function from videoStore
const getTranslationForLabel = (label) => {
    return videoStore.getTranslationForLabel(label);
};
// ✅ FIX: Add getColorForLabel function from videoStore  
const getColorForLabel = (label) => {
    return videoStore.getColorForLabel(label);
};
const displayedSegments = ref([]);
watch(() => props.segments, (segments) => {
    if (segments) {
        displayedSegments.value = segments?.map(toCanonical);
    }
    else {
        displayedSegments.value = [];
    }
}, { immediate: true });
// ✅ NEW: Calculate optimal row layout to prevent overlapping segments
/**
 * Row layout that:
 *  • puts the currently-selected label in the first row (target row)
 *  • creates one row per label that actually has segments
 *  • guarantees segments in a row never overlap in time
 */
const segmentRows = computed(() => {
    const buckets = {};
    // build from the *mutable* working copy so previews are visible
    for (const s of displayedSegments.value) { //THIS IS THE LINE FROM THE PROMPT
        (buckets[s.label] ||= []).push(s);
    }
    // ►  fixed order: first the user-selected label (if any), then our persisted order
    const orderedLabels = selectedLabel.value
        ? [selectedLabel.value, ...labelOrder.value.filter(l => l !== selectedLabel.value)]
        : [...labelOrder.value];
    const rows = [];
    orderedLabels.forEach(label => {
        if (!buckets[label])
            return; // label exists but has no segments yet
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
// ✅ NEW: Calculate total timeline height based on number of rows
const timelineHeight = computed(() => {
    const baseHeight = 60; // Header space for time markers
    const rowHeight = 45; // Height per segment row
    const padding = 10; // Bottom padding
    return baseHeight + (segmentRows.value.length * rowHeight) + padding;
});
// Methods - update to use helper functions
const formatTime = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds))
        return '00:00';
    return formatTimeHelper(seconds);
};
const formatDuration = (startTime, endTime) => {
    const duration = endTime - startTime;
    return formatTimeHelper(duration);
};
const getSegmentPosition = (startTime) => {
    return calculateSegmentPosition(startTime, duration.value);
};
const getSegmentWidth = (startTime, endTime) => {
    return calculateSegmentWidth(startTime, endTime, duration.value);
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
        ev.stopPropagation();
        const handle = ev.target.closest('.resize-handle');
        // Decide what we're doing based on the handle clicked
        if (handle?.classList.contains('start-handle'))
            mode = 'start';
        else if (handle?.classList.contains('end-handle'))
            mode = 'end';
        else
            mode = 'drag';
        pxStart = ev.clientX;
        startLeft = el.offsetLeft;
        startWidth = el.offsetWidth;
        // Avoid iOS scrolling etc.
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
        let s = draftStart;
        let e = draftEnd;
        if (mode === 'drag') {
            opt.onMove(pxToTime(s), pxToTime(e));
        }
        else {
            // Emit final position for drag
            opt.onResize(pxToTime(s), pxToTime(e), mode);
        }
        mode = null;
        el.releasePointerCapture(ev.pointerId);
        opt.onDone();
    }
    // Event listeners
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    // Cleanup function
    return () => {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
    };
}
const initializeDragResize = () => {
    // Cleanup previous listeners
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
                        // Update local state for real-time feedback
                        const localSegment = displayedSegments.value.find(s => s.id === segment.id);
                        if (localSegment) {
                            localSegment.start = startS;
                            localSegment.end = endS;
                            localSegment.startTime = startS;
                            localSegment.endTime = endS;
                        }
                        emit('segment-move', segment.id, startS, endS);
                    },
                    onResize: (startS, endS, edge) => {
                        // Update local state for real-time feedback
                        const localSegment = displayedSegments.value.find(s => s.id === segment.id);
                        if (localSegment) {
                            localSegment.start = startS;
                            localSegment.end = endS;
                            localSegment.startTime = startS;
                            localSegment.endTime = endS;
                        }
                        emit('segment-resize', segment.id, startS, endS, edge);
                    },
                    onDone: () => {
                        const localSegment = displayedSegments.value.find(s => s.id === segment.id);
                        if (localSegment) {
                            // Handle draft segments differently
                            if (typeof segment.id === 'string' &&
                                (segment.id === 'draft' || segment.id.startsWith('temp-'))) {
                                emit('segment-resize', segment.id, localSegment.start, localSegment.end, 'end', true);
                            }
                            else {
                                const numericId = getNumericSegmentId(segment.id);
                                if (numericId !== null) {
                                    emit('segment-resize', numericId, localSegment.start, localSegment.end, 'end', true);
                                }
                            }
                        }
                    }
                });
                cleanupFunctions.value.push(cleanup);
            });
        });
    });
};
// Zoom controls
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
// Playback controls
const playPause = () => {
    emit('play-pause');
};
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
    emit('seek', segment.startTime || 0); // ✅ FIX: Use camelCase property
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
    if (resizingSegmentId.value || draggingSegmentId.value)
        return;
    const rect = timeline.value.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration.value;
    if (props.selectionMode) {
        // Start selection for new segment
        isSelecting.value = true;
        selectionStart.value = (clickX / rect.width) * 100;
        selectionEnd.value = selectionStart.value;
        document.addEventListener('mousemove', onSelectionMouseMove);
        document.addEventListener('mouseup', onSelectionMouseUp);
    }
    else {
        // Seek to position
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
    if (!isSelecting.value)
        return;
    const rect = timeline.value.getBoundingClientRect();
    const startPercent = Math.min(selectionStart.value, selectionEnd.value);
    const endPercent = Math.max(selectionStart.value, selectionEnd.value);
    const startTime = (startPercent / 100) * duration.value;
    const endTime = (endPercent / 100) * duration.value;
    // Only create segment if selection is meaningful (> 0.1 seconds)
    if (endTime - startTime > 0.1) {
        emit('time-selection', { start: startTime, end: endTime });
    }
    // Cleanup
    isSelecting.value = false;
    selectionStart.value = 0;
    selectionEnd.value = 0;
    document.removeEventListener('mousemove', onSelectionMouseMove);
    document.removeEventListener('mouseup', onSelectionMouseUp);
};
// Watch for video changes to update waveform
watch(() => props.video, () => {
    if (props.showWaveform) {
        nextTick(() => {
            initializeWaveform();
        });
    }
});
// Watch for segments to initialize drag+resize
watch(segmentRows, () => nextTick(initializeDragResize), // re-run after every layout change
{ immediate: true });
// Debug watch for segments with 0% width
watch(segmentRows, (rows) => {
    rows.forEach(row => {
        row.segments.forEach(s => {
            if (getSegmentWidth(s.start, s.end) === 0) {
                console.warn('[Timeline] Segment mit 0% Breite:', s);
            }
        });
    });
}, { immediate: true });
// Waveform initialization
const initializeWaveform = () => {
    if (!waveformCanvas.value || !props.video)
        return;
    const canvas = waveformCanvas.value;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    // Simple waveform visualization
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw sample waveform pattern
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
// Click outside to hide context menu
const handleClickOutside = (event) => {
    if (contextMenu.value.visible && !event.target?.closest('.context-menu')) {
        hideContextMenu();
    }
};
// Lifecycle hooks
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    // Initialize drag+resize after mount
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
    // Cleanup all drag+resize listeners
    cleanupFunctions.value.forEach(cleanup => cleanup());
    cleanupFunctions.value = [];
    // Remove old event listeners that are no longer used
    document.removeEventListener('mousemove', onSelectionMouseMove);
    document.removeEventListener('mouseup', onSelectionMouseUp);
});
//  Helper to convert segmentId to numeric ID for API calls
const getNumericSegmentId = (segmentId) => {
    if (typeof segmentId === 'number')
        return segmentId;
    // Handle string IDs
    if (typeof segmentId === 'string') {
        // Skip draft segments (they don't have real IDs yet)
        if (segmentId === 'draft' || segmentId.startsWith('temp-')) {
            console.warn('[Timeline] Ignoring draft/temp segment:', segmentId);
            return null;
        }
        const parsed = parseInt(segmentId, 10);
        if (isNaN(parsed)) {
            console.error('[Timeline] Invalid segment ID:', segmentId);
            return null;
        }
        return parsed;
    }
    console.error('[Timeline] Unexpected segment ID type:', typeof segmentId, segmentId);
    return null;
};
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['play-btn', 'play-btn', 'zoom-controls', 'zoom-controls', 'zoom-controls', 'segment-row', 'segment', 'segment', 'segment', 'context-menu-item', 'context-menu-item', 'context-menu-item', 'resize-handle', 'segment', 'resize-handle', 'resize-handle', 'resize-handle', 'resize-handle', 'segment', 'segment',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-container") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-controls") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.playPause) },
        ...{ class: ("play-btn") },
        disabled: ((!__VLS_ctx.video)),
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
        ...{ class: ("zoom-controls") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.zoomOut) },
        disabled: ((__VLS_ctx.zoomLevel <= 1)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-search-minus") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("zoom-level") },
    });
    (Math.round(__VLS_ctx.zoomLevel * 100));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.zoomIn) },
        disabled: ((__VLS_ctx.zoomLevel >= 5)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-search-plus") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-wrapper") },
        ...{ style: (({ height: __VLS_ctx.timelineHeight + 'px' })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (__VLS_ctx.onTimelineMouseDown) },
        ...{ class: ("timeline") },
        ref: ("timeline"),
        ...{ style: (({ height: __VLS_ctx.timelineHeight + 'px' })) },
    });
    // @ts-ignore navigation for `const timeline = ref()`
    /** @type { typeof __VLS_ctx.timeline } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("time-markers") },
    });
    for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.timeMarkers))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((marker.time)),
            ...{ class: ("time-marker") },
            ...{ style: (({ left: marker.position + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("marker-line") },
            ...{ style: (({ height: __VLS_ctx.timelineHeight + 'px' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("marker-text") },
        });
        (__VLS_ctx.formatTime(marker.time));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("segments-container") },
    });
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.segmentRows))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((row.key)),
            ...{ class: ("segment-row") },
            ...{ class: (({ 'active': row.label === __VLS_ctx.selectedLabel })) },
            ...{ style: (({
                    top: (row.rowNumber * 45) + 'px',
                    height: '40px'
                })) },
        });
        for (const [segment] of __VLS_getVForSourceType((row.segments))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        __VLS_ctx.selectSegment(segment);
                    } },
                ...{ onContextmenu: (...[$event]) => {
                        __VLS_ctx.showSegmentMenu(segment, $event);
                    } },
                key: ((segment.id)),
                ref: ("segmentElements"),
                ...{ class: ("segment") },
                ...{ class: (({
                        'active': segment.id === __VLS_ctx.activeSegmentId,
                        'draft': segment.isDraft,
                    })) },
                ...{ style: (({
                        left: __VLS_ctx.getSegmentPosition(segment.start) + '%',
                        width: __VLS_ctx.getSegmentWidth(segment.start, segment.end) + '%',
                        backgroundColor: segment.color || __VLS_ctx.getColorForLabel(segment.label),
                        borderColor: segment.isDraft ? '#ff9800' : 'transparent'
                    })) },
                'data-id': ((segment.id)),
            });
            // @ts-ignore navigation for `const segmentElements = ref()`
            /** @type { typeof __VLS_ctx.segmentElements } */ ;
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("resize-handle start-handle") },
                title: (('Segment-Start ändern')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-grip-lines-vertical") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("segment-content") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("segment-label") },
            });
            (__VLS_ctx.getTranslationForLabel(segment.label));
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("segment-duration") },
            });
            (__VLS_ctx.formatDuration(segment.start, segment.end));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("resize-handle end-handle") },
                title: (('Segment-Ende ändern')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-grip-lines-vertical") },
            });
            if (segment.isDraft) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("draft-indicator") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-edit") },
                });
            }
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("playhead") },
        ...{ style: (({ left: __VLS_ctx.playheadPosition + '%', height: __VLS_ctx.timelineHeight + 'px' })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("playhead-line") },
        ...{ style: (({ height: __VLS_ctx.timelineHeight + 'px' })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("playhead-handle") },
    });
    if (__VLS_ctx.isSelecting) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selection-overlay") },
            ...{ style: (({
                    left: Math.min(__VLS_ctx.selectionStart, __VLS_ctx.selectionEnd) + '%',
                    width: Math.abs(__VLS_ctx.selectionEnd - __VLS_ctx.selectionStart) + '%',
                    height: __VLS_ctx.timelineHeight + 'px'
                })) },
        });
    }
    if (__VLS_ctx.showWaveform) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("waveform-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
            ref: ("waveformCanvas"),
            ...{ class: ("waveform-canvas") },
        });
        // @ts-ignore navigation for `const waveformCanvas = ref()`
        /** @type { typeof __VLS_ctx.waveformCanvas } */ ;
    }
    if (__VLS_ctx.contextMenu.visible) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
            ...{ class: ("context-menu") },
            ...{ style: (({ left: __VLS_ctx.contextMenu.x + 'px', top: __VLS_ctx.contextMenu.y + 'px' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.contextMenu.visible)))
                        return;
                    __VLS_ctx.editSegment(__VLS_ctx.contextMenu.segment);
                } },
            ...{ class: ("context-menu-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-edit") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.contextMenu.visible)))
                        return;
                    __VLS_ctx.deleteSegment(__VLS_ctx.contextMenu.segment);
                } },
            ...{ class: ("context-menu-item danger") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-trash") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("context-menu-separator") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.contextMenu.visible)))
                        return;
                    __VLS_ctx.playSegment(__VLS_ctx.contextMenu.segment);
                } },
            ...{ class: ("context-menu-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-play") },
        });
    }
    if (__VLS_ctx.tooltip.visible) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("timeline-tooltip") },
            ...{ style: (({ left: __VLS_ctx.tooltip.x + 'px', top: __VLS_ctx.tooltip.y + 'px' })) },
        });
        (__VLS_ctx.tooltip.text);
    }
    ['timeline-container', 'timeline-header', 'timeline-controls', 'play-btn', 'time-display', 'zoom-controls', 'fas', 'fa-search-minus', 'zoom-level', 'fas', 'fa-search-plus', 'timeline-wrapper', 'timeline', 'time-markers', 'time-marker', 'marker-line', 'marker-text', 'segments-container', 'segment-row', 'active', 'segment', 'active', 'draft', 'resize-handle', 'start-handle', 'fas', 'fa-grip-lines-vertical', 'segment-content', 'segment-label', 'segment-duration', 'resize-handle', 'end-handle', 'fas', 'fa-grip-lines-vertical', 'draft-indicator', 'fas', 'fa-edit', 'playhead', 'playhead-line', 'playhead-handle', 'selection-overlay', 'waveform-container', 'waveform-canvas', 'context-menu', 'context-menu-item', 'fas', 'fa-edit', 'context-menu-item', 'danger', 'fas', 'fa-trash', 'context-menu-separator', 'context-menu-item', 'fas', 'fa-play', 'timeline-tooltip',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'timeline': __VLS_nativeElements['div'],
        'segmentElements': [__VLS_nativeElements['div']],
        'waveformCanvas': __VLS_nativeElements['canvas'],
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
            timeline: timeline,
            waveformCanvas: waveformCanvas,
            segmentElements: segmentElements,
            zoomLevel: zoomLevel,
            isSelecting: isSelecting,
            selectionStart: selectionStart,
            selectionEnd: selectionEnd,
            contextMenu: contextMenu,
            tooltip: tooltip,
            duration: duration,
            playheadPosition: playheadPosition,
            timeMarkers: timeMarkers,
            selectedLabel: selectedLabel,
            selectSegment: selectSegment,
            getTranslationForLabel: getTranslationForLabel,
            getColorForLabel: getColorForLabel,
            segmentRows: segmentRows,
            timelineHeight: timelineHeight,
            formatTime: formatTime,
            formatDuration: formatDuration,
            getSegmentPosition: getSegmentPosition,
            getSegmentWidth: getSegmentWidth,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            playPause: playPause,
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
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
