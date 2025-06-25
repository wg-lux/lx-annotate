import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { formatTime as formatTimeHelper, calculateSegmentWidth, calculateSegmentPosition } from '@/utils/timeHelpers';
import { useVideoStore } from '@/stores/videoStore';
import {} from '@/stores/videoStore';
import { convertBackendSegmentToFrontend, convertFrontendSegmentToBackend, convertBackendSegmentsToFrontend, createSegmentUpdatePayload, normalizeSegmentToCamelCase, debugSegmentConversion, } from '@/utils/caseConversion';
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
// Reactive state
const zoomLevel = ref(1);
const isSelecting = ref(false);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const isDragging = ref(false);
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
const resizeMode = ref('');
const dragStartX = ref(0);
const dragStartTime = ref(0);
const originalSegmentData = ref(null);
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
    if (!videoDuration || videoDuration === 0 || !isFinite(videoDuration)) {
        console.warn('[Timeline] Duration is 0 or invalid:', videoDuration);
        return 0;
    }
    if (!isFinite(currentVideoTime) || currentVideoTime < 0) {
        console.warn('[Timeline] CurrentTime is invalid:', currentVideoTime);
        return 0;
    }
    const percentage = (currentVideoTime / videoDuration) * 100;
    // ✅ Additional safety check for percentage
    if (!isFinite(percentage)) {
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
// ✅ FIX: Use fps prop instead of ignoring it
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
const getLabelColor = (labelId) => {
    if (!labelId)
        return '#999';
    const label = (props.labels || []).find((l) => l.id === labelId);
    return label?.color || '#999';
};
const getLabelName = (labelId) => {
    if (!labelId) {
        return '';
    }
    const label = (props.labels || []).find((l) => l.id === labelId);
    return label?.name || '';
};
// New drag and resize methods
const startSegmentDrag = (segment, event) => {
    if (resizingSegmentId.value)
        return; // Don't start drag if resizing
    event.preventDefault();
    draggingSegmentId.value = segment.id;
    dragStartX.value = event.clientX;
    dragStartTime.value = segment.startTime || 0; // ✅ FIX: Use only camelCase property
    originalSegmentData.value = {
        start_time: segment.startTime || 0, // ✅ FIX: Use camelCase source
        end_time: segment.endTime || 0 // ✅ FIX: Use camelCase source
    };
    document.addEventListener('mousemove', onSegmentDragMove);
    document.addEventListener('mouseup', onSegmentDragEnd);
    // Add visual feedback
    document.body.style.cursor = 'grabbing';
};
const onSegmentDragMove = (event) => {
    if (!draggingSegmentId.value || !timeline.value)
        return;
    const rect = timeline.value.getBoundingClientRect();
    const deltaX = event.clientX - dragStartX.value;
    const deltaTime = (deltaX / rect.width) * duration.value;
    const segment = displayedSegments.value.find(s => s.id === draggingSegmentId.value);
    if (!segment)
        return;
    const segmentDuration = originalSegmentData.value.end_time - originalSegmentData.value.start_time;
    let newStartTime = dragStartTime.value + deltaTime;
    // Clamp to timeline bounds
    newStartTime = Math.max(0, Math.min(newStartTime, duration.value - segmentDuration));
    const newEndTime = newStartTime + segmentDuration;
    // Emit move event for real-time update
    emit('segment-move', draggingSegmentId.value, newStartTime, newEndTime);
    segment.start = newStartTime;
    segment.end = newEndTime;
    segment.startTime = newStartTime; // ✅ FIX: Use camelCase properties
    segment.endTime = newEndTime; // ✅ FIX: Use camelCase properties
};
const onSegmentDragEnd = (event) => {
    if (draggingSegmentId.value) {
        const segment = displayedSegments.value.find(s => s.id === draggingSegmentId.value);
        if (segment) {
            const segmentDuration = originalSegmentData.value.end_time - originalSegmentData.value.start_time;
            const rect = timeline.value.getBoundingClientRect();
            const deltaX = event.clientX - dragStartX.value;
            const deltaTime = (deltaX / rect.width) * duration.value;
            let newStartTime = dragStartTime.value + deltaTime;
            newStartTime = Math.max(0, Math.min(newStartTime, duration.value - segmentDuration));
            const newEndTime = newStartTime + segmentDuration;
            // ✅ FIX: Handle draft segments differently - don't convert to numeric ID
            if (typeof draggingSegmentId.value === 'string' &&
                (draggingSegmentId.value === 'draft' || draggingSegmentId.value.startsWith('temp-'))) {
                // For draft segments, emit with original ID (don't convert to numeric)
                console.log('[Timeline] Moving draft segment:', draggingSegmentId.value);
                emit('segment-move', draggingSegmentId.value, newStartTime, newEndTime, true);
            }
            else {
                // For real segments, validate and convert to numeric ID
                const numericId = getNumericSegmentId(draggingSegmentId.value);
                if (numericId === null) {
                    console.warn('[Timeline] Skipping drag end for invalid segment ID:', draggingSegmentId.value);
                    return;
                }
                emit('segment-move', numericId, newStartTime, newEndTime, true);
            }
        }
    }
    // Cleanup
    draggingSegmentId.value = null;
    dragStartX.value = 0;
    dragStartTime.value = 0;
    originalSegmentData.value = null;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onSegmentDragMove);
    document.removeEventListener('mouseup', onSegmentDragEnd);
};
const startResize = (segment, mode, event) => {
    event.preventDefault();
    event.stopPropagation();
    resizingSegmentId.value = segment.id;
    resizeMode.value = mode;
    dragStartX.value = event.clientX;
    originalSegmentData.value = {
        start_time: segment.startTime || 0, // ✅ FIX: Use only camelCase property
        end_time: segment.endTime || 0 // ✅ FIX: Use only camelCase property
    };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    // Add visual feedback
    document.body.style.cursor = 'ew-resize';
};
const onResizeMove = (event) => {
    if (!resizingSegmentId.value || !timeline.value)
        return;
    const rect = timeline.value.getBoundingClientRect();
    const deltaX = event.clientX - dragStartX.value;
    const deltaTime = (deltaX / rect.width) * duration.value; // ✅ FIX: Remove incorrect addition
    const segment = (props.segments || []).find((s) => s.id === resizingSegmentId.value);
    if (!segment)
        return;
    let newStartTime = originalSegmentData.value.start_time;
    let newEndTime = originalSegmentData.value.end_time;
    if (resizeMode.value === 'start') {
        newStartTime = Math.max(0, Math.min(originalSegmentData.value.start_time + deltaTime, originalSegmentData.value.end_time - 0.1));
    }
    else if (resizeMode.value === 'end') {
        newEndTime = Math.max(originalSegmentData.value.start_time + 0.1, Math.min(originalSegmentData.value.end_time + deltaTime, duration.value));
    }
    emit('segment-resize', resizingSegmentId.value, newStartTime, newEndTime, resizeMode.value);
};
const onResizeEnd = (event) => {
    if (resizingSegmentId.value) {
        const segment = displayedSegments.value.find(s => s.id === resizingSegmentId.value);
        if (segment) {
            const rect = timeline.value.getBoundingClientRect();
            const deltaX = event.clientX - dragStartX.value;
            const deltaTime = (deltaX / rect.width) * duration.value;
            let newStartTime = originalSegmentData.value.start_time;
            let newEndTime = originalSegmentData.value.end_time;
            if (resizeMode.value === 'start') {
                newStartTime = Math.max(0, Math.min(originalSegmentData.value.start_time + deltaTime, originalSegmentData.value.end_time - 0.1));
            }
            else if (resizeMode.value === 'end') {
                newEndTime = Math.max(originalSegmentData.value.start_time + 0.1, Math.min(originalSegmentData.value.end_time + deltaTime, duration.value));
            }
            // ✅ FIX: Handle draft segments differently - don't convert to numeric ID
            if (typeof resizingSegmentId.value === 'string' &&
                (resizingSegmentId.value === 'draft' || resizingSegmentId.value.startsWith('temp-'))) {
                // For draft segments, emit with original ID (don't convert to numeric)
                console.log('[Timeline] Resizing draft segment:', resizingSegmentId.value);
                emit('segment-resize', resizingSegmentId.value, newStartTime, newEndTime, resizeMode.value, true);
            }
            else {
                // For real segments, validate and convert to numeric ID
                const numericId = getNumericSegmentId(resizingSegmentId.value);
                if (numericId === null) {
                    console.warn('[Timeline] Skipping resize end for invalid segment ID:', resizingSegmentId.value);
                    return;
                }
                emit('segment-resize', numericId, newStartTime, newEndTime, resizeMode.value, true);
            }
        }
    }
    // Cleanup
    resizingSegmentId.value = null;
    resizeMode.value = '';
    dragStartX.value = 0;
    originalSegmentData.value = null;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
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
    selectionEnd.value = Math.max(0, Math.min(100, (currentX / rect.width) + 100));
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
// ✅ NEW: Debug watch for segments with 0% width
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
    document.addEventListener('mousemove', onSegmentDragMove);
    document.addEventListener('mouseup', onSegmentDragEnd);
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    document.addEventListener('mousemove', onSelectionMouseMove);
    document.addEventListener('mouseup', onSelectionMouseUp);
    // Initialize waveform if needed
    if (props.showWaveform) {
        nextTick(() => {
            initializeWaveform();
        });
    }
    toast.success({ text: '[Timeline] Component mounted and ready' });
});
onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    // Cleanup any ongoing drag/resize operations
    document.removeEventListener('mousemove', onSegmentDragMove);
    document.removeEventListener('mouseup', onSegmentDragEnd);
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.removeEventListener('mousemove', onSelectionMouseMove);
    document.removeEventListener('mouseup', onSelectionMouseUp);
});
// NEW: Helper to convert segmentId to numeric ID for API calls
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
    ['play-btn', 'play-btn', 'zoom-controls', 'zoom-controls', 'zoom-controls', 'segment-row', 'segment', 'segment', 'segment', 'context-menu-item', 'context-menu-item', 'context-menu-item', 'segment', 'resize-handle', 'segment', 'resize-handle', 'resize-handle', 'resize-handle', 'resize-handle', 'resize-handle', 'segment', 'segment', 'segment',];
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
                ...{ onMousedown: (...[$event]) => {
                        __VLS_ctx.startSegmentDrag(segment, $event);
                    } },
                key: ((segment.id)),
                ...{ class: ("segment") },
                ...{ class: (({
                        'active': segment.id === __VLS_ctx.activeSegmentId,
                        'draft': segment.isDraft,
                        'dragging': segment.id === __VLS_ctx.draggingSegmentId
                    })) },
                ...{ style: (({
                        left: __VLS_ctx.getSegmentPosition(segment.start) + '%',
                        width: __VLS_ctx.getSegmentWidth(segment.start, segment.end) + '%',
                        backgroundColor: segment.color || __VLS_ctx.getColorForLabel(segment.label),
                        borderColor: segment.isDraft ? '#ff9800' : 'transparent'
                    })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onMousedown: (...[$event]) => {
                        __VLS_ctx.startResize(segment, 'start', $event);
                    } },
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
                ...{ onMousedown: (...[$event]) => {
                        __VLS_ctx.startResize(segment, 'end', $event);
                    } },
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
    ['timeline-container', 'timeline-header', 'timeline-controls', 'play-btn', 'time-display', 'zoom-controls', 'fas', 'fa-search-minus', 'zoom-level', 'fas', 'fa-search-plus', 'timeline-wrapper', 'timeline', 'time-markers', 'time-marker', 'marker-line', 'marker-text', 'segments-container', 'segment-row', 'active', 'segment', 'active', 'draft', 'dragging', 'resize-handle', 'start-handle', 'fas', 'fa-grip-lines-vertical', 'segment-content', 'segment-label', 'segment-duration', 'resize-handle', 'end-handle', 'fas', 'fa-grip-lines-vertical', 'draft-indicator', 'fas', 'fa-edit', 'playhead', 'playhead-line', 'playhead-handle', 'selection-overlay', 'waveform-container', 'waveform-canvas', 'context-menu', 'context-menu-item', 'fas', 'fa-edit', 'context-menu-item', 'danger', 'fas', 'fa-trash', 'context-menu-separator', 'context-menu-item', 'fas', 'fa-play', 'timeline-tooltip',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'timeline': __VLS_nativeElements['div'],
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
            zoomLevel: zoomLevel,
            isSelecting: isSelecting,
            selectionStart: selectionStart,
            selectionEnd: selectionEnd,
            draggingSegmentId: draggingSegmentId,
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
            startSegmentDrag: startSegmentDrag,
            startResize: startResize,
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
