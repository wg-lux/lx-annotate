import { defineComponent, ref, onUnmounted, computed, watch } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
export default defineComponent({
    name: 'Timeline',
    props: {
        duration: {
            type: Number,
            required: true,
        },
        currentTime: {
            type: Number,
            default: 0,
        },
        segments: {
            type: Array,
            default: () => [],
        },
        apiSegments: {
            type: Array,
            default: () => [],
        },
        fps: {
            type: Number,
            default: 25, // Standard FPS für Frame-zu-Zeit-Konvertierung
        },
    },
    emits: ['resize', 'seek', 'createSegment'],
    setup(props, { emit }) {
        const videoStore = useVideoStore();
        const timelineRef = ref(null);
        const timeMarkersRef = ref(null);
        const activeSegment = ref(null);
        const isResizing = ref(false);
        const startX = ref(0);
        const initialEndTime = ref(0);
        const lastTimestamp = ref(0);
        // Hilfsfunktion: Frame-Nummer zu Zeit konvertieren
        function frameToTime(frameNumber) {
            return frameNumber / props.fps;
        }
        const selectedSegmentId = ref(null);
        const allSegments = computed(() => {
            return convertedSegments.value.length > 0
                ? convertedSegments.value
                : props.segments || [];
        });
        // Computed; Aktualisiere aktive Segmente bei Änderungen
        const selectedSegment = computed(() => {
            return allSegments.value.find((s) => s.id === selectedSegmentId.value) || null;
        });
        // Hilfsfunktion: Zeit zu Frame-Nummer konvertieren
        function timeToFrame(time) {
            return Math.round(time * props.fps);
        }
        // Computed: API-Segmente zu Timeline-Segmente konvertieren
        const convertedSegments = computed(() => {
            return props.apiSegments.map((apiSegment) => ({
                id: apiSegment.id,
                video_id: apiSegment.video_id,
                label_id: apiSegment.label_id,
                startTime: frameToTime(apiSegment.start_frame_number),
                endTime: frameToTime(apiSegment.end_frame_number),
                start_frame_number: apiSegment.start_frame_number,
                end_frame_number: apiSegment.end_frame_number,
                label: `label_${apiSegment.label_id}`, // Fallback label
                label_display: `Label ${apiSegment.label_id}`, // Temporär, sollte durch echte Label-Namen ersetzt werden
                avgConfidence: 1, // Default value
            }));
        });
        // Computed: Cursor-Position basierend auf aktueller Zeit
        const cursorPosition = computed(() => {
            if (props.duration <= 0)
                return 0;
            return (props.currentTime / props.duration) * 100;
        });
        // Computed: Zeitmarkierungen für bessere Orientierung
        const timeMarkers = computed(() => {
            const markers = [];
            const duration = props.duration;
            if (duration <= 0)
                return markers;
            // Bestimme Intervall basierend auf Videolänge
            let interval = 10; // Standard: 10 Sekunden
            if (duration <= 60)
                interval = 10;
            else if (duration <= 300)
                interval = 30;
            else if (duration <= 600)
                interval = 60;
            else
                interval = 120;
            for (let time = 0; time <= duration; time += interval) {
                markers.push({
                    time,
                    position: (time / duration) * 100,
                });
            }
            return markers;
        });
        // Computed: Organisiere Segmente nach Labels (updated für Store-Integration)
        const organizedSegments = computed(() => {
            // If a specific segment is selected, show only that segment
            if (videoStore.activeSegment) {
                const seg = videoStore.activeSegment;
                return [{
                        labelName: seg.label_display,
                        color: videoStore.getColorForLabel(seg.label),
                        segments: [seg],
                    }];
            }
            // Use segments from store (props.segments comes from store via parent component)
            const allSegments = props.segments || [];
            const labelGroups = new Map();
            allSegments.forEach((segment) => {
                const labelName = segment.label_display || videoStore.getTranslationForLabel(segment.label) || 'Ohne Label';
                if (!labelGroups.has(labelName)) {
                    const color = videoStore.getColorForLabel(segment.label);
                    labelGroups.set(labelName, {
                        labelName,
                        color,
                        segments: [], // Initialize segments array
                    });
                }
                labelGroups.get(labelName).segments.push(segment);
            });
            // Sortiere Segmente innerhalb jeder Gruppe nach Startzeit
            labelGroups.forEach(group => {
                group.segments.sort((a, b) => a.startTime - b.startTime);
            });
            return Array.from(labelGroups.values());
        });
        // Methoden
        function getSegmentStyle(segment, color) {
            const left = (segment.startTime / props.duration) * 100;
            const width = ((segment.endTime - segment.startTime) / props.duration) * 100;
            return {
                left: `${left}%`,
                width: `${Math.max(width, 0.5)}%`, // Mindestbreite für sichtbarkeit
                backgroundColor: color,
                borderColor: color,
            };
        }
        function formatTime(seconds) {
            // Verwende Store-Funktion für konsistente Formatierung
            return videoStore.formatTime(seconds);
        }
        function formatDuration(seconds) {
            if (seconds < 1)
                return '<1s';
            if (seconds < 60)
                return `${Math.round(seconds)}s`;
            const mins = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
        }
        function onMouseMove(event) {
            const now = Date.now();
            if (now - lastTimestamp.value < 16)
                return; // Throttling
            lastTimestamp.value = now;
            if (!isResizing.value || !activeSegment.value || !timelineRef.value)
                return;
            const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
            const rect = timelineRef.value.getBoundingClientRect();
            const relativeX = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
            const newEndTime = (percentage / 100) * props.duration;
            // Stelle sicher, dass End-Zeit nach Start-Zeit liegt
            const minEndTime = activeSegment.value.startTime + (1 / props.fps); // Minimum 1 Frame
            const clampedEndTime = Math.max(minEndTime, Math.min(newEndTime, props.duration));
            // Konvertiere zurück zu Frame-Nummer für API-Kompatibilität
            const newEndFrame = timeToFrame(clampedEndTime);
            // Update segment im Store - das ist bereits reaktiv!
            videoStore.updateSegment(activeSegment.value.id, {
                endTime: clampedEndTime,
                end_frame_number: newEndFrame,
            });
            // Emit mit sowohl Zeit als auch Frame-Nummer
            emit('resize', activeSegment.value.id, clampedEndTime, newEndFrame);
        }
        function onMouseUp() {
            isResizing.value = false;
            activeSegment.value = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        }
        function startResize(segment, event) {
            event.stopPropagation();
            isResizing.value = true;
            activeSegment.value = segment;
            initialEndTime.value = segment.endTime;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onMouseMove);
            document.addEventListener('touchend', onMouseUp);
        }
        function handleTimelineClick(event) {
            if (isResizing.value || !timelineRef.value)
                return;
            const rect = timelineRef.value.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const percentage = (offsetX / rect.width) * 100;
            const targetTime = (percentage / 100) * props.duration;
            const targetFrame = timeToFrame(targetTime);
            // Prüfe, ob Shift gedrückt ist für neues Segment
            if (event.shiftKey) {
                emit('createSegment', targetTime, targetFrame);
            }
            else {
                emit('seek', targetTime);
            }
        }
        function jumpToSegment(segment) {
            // Verwende Store-Funktion für konsistente Navigation
            const jumpTime = segment.startTime + (segment.endTime - segment.startTime) * 0.1; // 10% ins Segment
            emit('seek', jumpTime);
            // Optional: Markiere aktives Segment im Store
            videoStore.setActiveSegment(segment.id);
        }
        onUnmounted(() => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        });
        return {
            timelineRef,
            timeMarkersRef,
            organizedSegments,
            timeMarkers,
            cursorPosition,
            currentTime: computed(() => props.currentTime),
            selectedSegmentId,
            allSegments,
            selectedSegment,
            startResize,
            handleTimelineClick,
            jumpToSegment,
            getSegmentStyle,
            formatTime,
            formatDuration,
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['form-select', 'form-select', 'timeline-track', 'timeline-track', 'timeline-segment', 'resize-handle', 'resize-handle', 'empty-timeline', 'empty-timeline', 'empty-timeline', 'track-header', 'track-content', 'time-label', 'cursor-handle',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-container") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("time-markers") },
        ref: ("timeMarkersRef"),
    });
    // @ts-ignore navigation for `const timeMarkersRef = ref()`
    /** @type { typeof __VLS_ctx.timeMarkersRef } */ ;
    for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.timeMarkers))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((marker.time)),
            ...{ class: ("time-marker") },
            ...{ style: (({ left: marker.position + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("time-label") },
        });
        (__VLS_ctx.formatTime(marker.time));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("marker-line") },
        });
    }
    if (__VLS_ctx.currentTime >= 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("timeline-cursor") },
            ...{ style: (({ left: __VLS_ctx.cursorPosition + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("cursor-line") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("cursor-handle") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    }
    if (false) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("segment-selector") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-tracks") },
        ref: ("timelineRef"),
    });
    // @ts-ignore navigation for `const timelineRef = ref()`
    /** @type { typeof __VLS_ctx.timelineRef } */ ;
    for (const [labelGroup] of __VLS_getVForSourceType((__VLS_ctx.organizedSegments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.handleTimelineClick) },
            key: ((labelGroup.labelName)),
            ...{ class: ("timeline-track") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("track-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label-indicator") },
            ...{ style: (({ backgroundColor: labelGroup.color })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("track-label") },
        });
        (labelGroup.labelName || 'Ohne Label');
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("segment-count") },
        });
        (labelGroup.segments.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("track-content") },
        });
        for (const [segment] of __VLS_getVForSourceType((labelGroup.segments))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        __VLS_ctx.jumpToSegment(segment);
                    } },
                key: ((segment.id)),
                ...{ class: ("timeline-segment") },
                ...{ style: ((__VLS_ctx.getSegmentStyle(segment, labelGroup.color))) },
                title: ((`${segment.label_display}: ${__VLS_ctx.formatTime(segment.startTime)} - ${__VLS_ctx.formatTime(segment.endTime)}`)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("segment-content") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("segment-time") },
            });
            (__VLS_ctx.formatTime(segment.startTime));
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("segment-duration") },
            });
            (__VLS_ctx.formatDuration(segment.endTime - segment.startTime));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onMousedown: (...[$event]) => {
                        __VLS_ctx.startResize(segment, $event);
                    } },
                ...{ onTouchstart: (...[$event]) => {
                        __VLS_ctx.startResize(segment, $event);
                    } },
                ...{ class: ("resize-handle") },
                title: ("Segment-Ende ziehen"),
            });
        }
    }
    if (__VLS_ctx.organizedSegments.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("empty-timeline") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    ['timeline-container', 'timeline-header', 'time-markers', 'time-marker', 'time-label', 'marker-line', 'timeline-cursor', 'cursor-line', 'cursor-handle', 'segment-selector', 'form-select', 'timeline-tracks', 'timeline-track', 'track-header', 'label-indicator', 'track-label', 'segment-count', 'track-content', 'timeline-segment', 'segment-content', 'segment-time', 'segment-duration', 'resize-handle', 'empty-timeline', 'material-icons',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'timeMarkersRef': __VLS_nativeElements['div'],
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
