import { ref, onMounted } from 'vue';
import { getColorForLabel, jumpToSegment as utilJumpToSegment } from '@/components/EndoAI/segments';
import axios from 'axios';
const staticUrl = window.STATIC_URL || '/static/';
const videoRef = ref(null);
const timelineRef = ref(null);
const segments = ref([]);
const currentTime = ref(0);
const duration = ref(100); // Will be updated when video loads
const labelsList = ref([
    "appendix",
    "blood",
    "diverticule",
    "grasper",
    "ileocaecalvalve",
    "ileum",
    "low_quality",
    "nbi",
    "needle",
    "outside",
    "polyp",
    "snare",
    "water_jet",
    "wound",
]);
const canSave = ref(false);
function calculateLeftPercent(segment) {
    return (segment.startTime / duration.value) * 100;
}
function calculateWidthPercent(segment) {
    return ((segment.endTime - segment.startTime) / duration.value) * 100;
}
function calculateRightPercent(segment) {
    return 100 - calculateLeftPercent(segment) - calculateWidthPercent(segment);
}
function handleTimeUpdate() {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
        duration.value = videoRef.value.duration;
    }
}
function handleLoadedMetadata() {
    if (videoRef.value) {
        duration.value = videoRef.value.duration;
    }
}
function jumpTo(segment) {
    utilJumpToSegment(segment, videoRef.value);
}
function handleTimelineClick(event) {
    if (timelineRef.value && videoRef.value) {
        const rect = timelineRef.value.getBoundingClientRect();
        const clickPosition = event.clientX - rect.left;
        const percentage = clickPosition / rect.width;
        videoRef.value.currentTime = percentage * duration.value;
    }
}
function saveAnnotations() {
    axios.post('http://127.0.0.1:8000/api/annotations/', {
        segments: segments.value,
    })
        .then(response => {
        console.log('Annotations saved:', response.data);
    })
        .catch(error => {
        console.error('Error saving annotations:', error);
    });
}
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
onMounted(() => {
    // For demo purposes, set some sample segments:
    segments.value = [
        {
            id: 'segment1',
            label: 'outside',
            startTime: 0,
            endTime: 20,
            avgConfidence: 0.85,
        },
        {
            id: 'segment2',
            label: 'blood',
            startTime: 25,
            endTime: 35,
            avgConfidence: 0.9,
        },
        {
            id: 'segment3',
            label: 'needle',
            startTime: 40,
            endTime: 45,
            avgConfidence: 0.7,
        },
    ];
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid h-100 w-100 py-1 px-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("video-container mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
        ...{ onLoadedmetadata: (__VLS_ctx.handleLoadedMetadata) },
        ref: ("videoRef"),
        controls: (true),
        ...{ class: ("w-100") },
        src: ((__VLS_ctx.staticUrl + 'video.mp4')),
    });
    // @ts-ignore navigation for `const videoRef = ref()`
    /** @type { typeof __VLS_ctx.videoRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline-container mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleTimelineClick) },
        ...{ class: ("timeline-track") },
        ref: ("timelineRef"),
    });
    // @ts-ignore navigation for `const timelineRef = ref()`
    /** @type { typeof __VLS_ctx.timelineRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-bar") },
        ...{ style: (({ width: `${(__VLS_ctx.currentTime / __VLS_ctx.duration) * 100}%` })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("legend mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.labelsList))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((label)),
            ...{ class: ("legend-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("legend-color") },
            ...{ style: (({ backgroundColor: __VLS_ctx.getColorForLabel(label) })) },
        });
        (label);
    }
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.jumpTo(segment);
                } },
            ...{ class: ("table-responsive") },
            key: ((segment.id)),
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: ("table table-striped table-hover") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: ("custom-segments") },
        });
        (segment.label);
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ style: (({ width: __VLS_ctx.calculateLeftPercent(segment) + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ style: (({ width: __VLS_ctx.calculateWidthPercent(segment) + '%', backgroundColor: __VLS_ctx.getColorForLabel(segment.label), color: '#fff' })) },
        });
        (segment.avgConfidence);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ style: (({ width: __VLS_ctx.calculateRightPercent(segment) + '%' })) },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-responsive") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-striped table-hover") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.jumpTo(segment);
                } },
            key: ((segment.id)),
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ style: (({ backgroundColor: __VLS_ctx.getColorForLabel(segment.label), color: '#fff' })) },
        });
        (segment.label);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatTime(segment.startTime));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatTime(segment.endTime));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        ((segment.avgConfidence * 100).toFixed(1));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("controls mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAnnotations) },
        ...{ class: ("btn btn-success") },
        disabled: ((!__VLS_ctx.canSave)),
    });
    ['container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'card-header', 'pb-0', 'mb-0', 'card-body', 'video-container', 'mb-4', 'w-100', 'timeline-container', 'mb-4', 'timeline-track', 'progress-bar', 'legend', 'mb-4', 'legend-item', 'legend-color', 'table-responsive', 'table', 'table-striped', 'table-hover', 'custom-segments', 'table-responsive', 'table', 'table-striped', 'table-hover', 'controls', 'mt-4', 'btn', 'btn-success',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            getColorForLabel: getColorForLabel,
            staticUrl: staticUrl,
            videoRef: videoRef,
            timelineRef: timelineRef,
            segments: segments,
            currentTime: currentTime,
            duration: duration,
            labelsList: labelsList,
            canSave: canSave,
            calculateLeftPercent: calculateLeftPercent,
            calculateWidthPercent: calculateWidthPercent,
            calculateRightPercent: calculateRightPercent,
            handleTimeUpdate: handleTimeUpdate,
            handleLoadedMetadata: handleLoadedMetadata,
            jumpTo: jumpTo,
            handleTimelineClick: handleTimelineClick,
            saveAnnotations: saveAnnotations,
            formatTime: formatTime,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
