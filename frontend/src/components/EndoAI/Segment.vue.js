import { computed, inject } from 'vue';
const props = withDefaults(defineProps(), {
    isActive: false,
    showConfidence: true,
    labelTranslations: () => ({})
});
const emit = defineEmits();
// Inject timeline context
const timelineContext = inject('timelineContext', {
    isDragging: false,
    isResizing: false,
    activeSegmentId: null
});
// Computed properties
const isDraft = computed(() => props.segment.id === 'draft' ||
    (typeof props.segment.id === 'string' && props.segment.id.startsWith('temp-')));
const isDragging = computed(() => timelineContext.isDragging && timelineContext.activeSegmentId === props.segment.id);
const isResizing = computed(() => timelineContext.isResizing && timelineContext.activeSegmentId === props.segment.id);
// Enhanced label display - prioritize API's label_name
const displayLabel = computed(() => {
    // 1. Try label_name from API first (this is what the API returns)
    if (props.segment.label_name) {
        return getTranslatedLabel(props.segment.label_name);
    }
    // 2. Fall back to label field
    if (props.segment.label) {
        return getTranslatedLabel(props.segment.label);
    }
    // 3. Fall back to label_display if available
    if (props.segment.label_display) {
        return props.segment.label_display;
    }
    // 4. Final fallback
    return 'Unbekannt';
});
const getTranslatedLabel = (labelKey) => {
    // Use provided translations or default German translations
    const translations = props.labelTranslations.hasOwnProperty(labelKey)
        ? props.labelTranslations
        : defaultTranslations;
    return translations[labelKey] || labelKey;
};
const defaultTranslations = {
    'appendix': 'Appendix',
    'blood': 'Blut',
    'diverticule': 'Divertikel',
    'grasper': 'Greifer',
    'ileocaecalvalve': 'Ileozäkalklappe',
    'ileum': 'Ileum',
    'low_quality': 'Niedrige Bildqualität',
    'nbi': 'Narrow Band Imaging',
    'needle': 'Nadel',
    'outside': 'Außerhalb',
    'polyp': 'Polyp',
    'snare': 'Snare',
    'water_jet': 'Wasserstrahl',
    'wound': 'Wunde'
};
const formatDuration = computed(() => {
    const duration = (props.segment.end_time || props.segment.endTime || 0) -
        (props.segment.start_time || props.segment.startTime || 0);
    if (duration < 60) {
        return `${duration.toFixed(1)}s`;
    }
    else {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
});
const segmentStyle = computed(() => {
    const startTime = props.segment.start_time || props.segment.startTime || 0;
    const endTime = props.segment.end_time || props.segment.endTime || 0;
    if (props.videoDuration <= 0) {
        return { left: '0%', width: '0%', backgroundColor: '#999' };
    }
    const startPercent = (startTime / props.videoDuration) * 100;
    const widthPercent = ((endTime - startTime) / props.videoDuration) * 100;
    return {
        left: `${Math.max(0, Math.min(100, startPercent))}%`,
        width: `${Math.max(0.1, Math.min(100 - startPercent, widthPercent))}%`,
        backgroundColor: getSegmentColor(),
        opacity: isDraft.value ? '0.8' : '1'
    };
});
const getSegmentColor = () => {
    const labelKey = props.segment.label_name || props.segment.label || '';
    const colorMap = {
        'outside': '#e74c3c',
        'polyp': '#f39c12',
        'needle': '#3498db',
        'blood': '#e74c3c',
        'snare': '#9b59b6',
        'grasper': '#2ecc71',
        'water_jet': '#1abc9c',
        'appendix': '#f1c40f',
        'ileum': '#e67e22',
        'diverticule': '#34495e',
        'ileocaecalvalve': '#95a5a6',
        'nbi': '#8e44ad',
        'low_quality': '#7f8c8d',
        'wound': '#c0392b'
    };
    return colorMap[labelKey] || '#95a5a6';
};
// Drag and resize event handlers
const startDrag = (event) => {
    if (event.target === event.currentTarget) {
        emit('dragStart', props.segment, event);
    }
};
const startResize = (mode, event) => {
    emit('resizeStart', props.segment, mode, event);
}; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    isActive: false,
    showConfidence: true,
    labelTranslations: () => ({})
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['segment-pill', 'segment-pill', 'segment-pill', 'segment-pill', 'segment-pill', 'resize-handle', 'segment-pill', 'resize-handle', 'resize-handle', 'resize-handle', 'resize-handle', 'resize-handle', 'segment-pill', 'segment-pill', 'segment-pill', 'segment-pill', 'segment-content', 'segment-pill', 'segment-content', 'segment-pill', 'segment-content', 'segment-label', 'segment-duration', 'resize-handle',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('select', __VLS_ctx.segment);
            } },
        ...{ onContextmenu: (...[$event]) => {
                __VLS_ctx.$emit('contextmenu', __VLS_ctx.segment, $event);
            } },
        ...{ onMousedown: (__VLS_ctx.startDrag) },
        ...{ class: ("segment-pill") },
        ...{ class: (({
                'active': __VLS_ctx.isActive,
                'draft': __VLS_ctx.isDraft,
                'dragging': __VLS_ctx.isDragging,
                'resizing': __VLS_ctx.isResizing
            })) },
        ...{ style: ((__VLS_ctx.segmentStyle)) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (...[$event]) => {
                __VLS_ctx.startResize('start', $event);
            } },
        ...{ class: ("resize-handle start-handle") },
        title: ((`${__VLS_ctx.segment.label_name} - Start ändern`)),
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
    (__VLS_ctx.displayLabel);
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("segment-duration") },
    });
    (__VLS_ctx.formatDuration);
    if (__VLS_ctx.showConfidence) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("segment-confidence") },
        });
        (Math.round(__VLS_ctx.segment.avgConfidence * 100));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (...[$event]) => {
                __VLS_ctx.startResize('end', $event);
            } },
        ...{ class: ("resize-handle end-handle") },
        title: ((`${__VLS_ctx.segment.label_name} - Ende ändern`)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-grip-lines-vertical") },
    });
    if (__VLS_ctx.isDraft) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("draft-indicator") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-edit") },
        });
    }
    if (__VLS_ctx.isActive) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("active-indicator") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check") },
        });
    }
    ['segment-pill', 'active', 'draft', 'dragging', 'resizing', 'resize-handle', 'start-handle', 'fas', 'fa-grip-lines-vertical', 'segment-content', 'segment-label', 'segment-duration', 'segment-confidence', 'resize-handle', 'end-handle', 'fas', 'fa-grip-lines-vertical', 'draft-indicator', 'fas', 'fa-edit', 'active-indicator', 'fas', 'fa-check',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {};
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
            isDraft: isDraft,
            isDragging: isDragging,
            isResizing: isResizing,
            displayLabel: displayLabel,
            formatDuration: formatDuration,
            segmentStyle: segmentStyle,
            startDrag: startDrag,
            startResize: startResize,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
