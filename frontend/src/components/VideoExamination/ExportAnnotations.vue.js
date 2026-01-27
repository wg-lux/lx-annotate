import { computed, ref, withDefaults } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import { formatTime as formatTimeHelper } from '@/utils/timeHelpers';
import { useToastStore } from '@/stores/toastStore';
const props = withDefaults(defineProps(), {
    videoId: null,
    segments: () => []
});
const videoStore = useVideoStore();
const toast = useToastStore();
const getTranslationForLabel = videoStore.getTranslationForLabel;
const isUpdatingVideo = ref(false);
const updatingSegments = ref(new Set());
const isBulkUpdating = ref(false);
const sortedSegments = computed(() => {
    return [...props.segments].sort((a, b) => a.startTime - b.startTime);
});
const videoExportFlag = computed(() => {
    if (!props.videoId)
        return false;
    const video = videoStore.videoList.videos.find((v) => v.id === props.videoId);
    return Boolean(video?.exportSegmentsByVideo);
});
const formatTime = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value))
        return '00:00';
    return formatTimeHelper(value);
};
const isSegmentUpdating = (segmentId) => updatingSegments.value.has(segmentId);
const onToggleVideoExport = async (event) => {
    if (!props.videoId)
        return;
    const target = event.target;
    const nextValue = target.checked;
    isUpdatingVideo.value = true;
    try {
        const ok = await videoStore.setVideoExportFlag(props.videoId, nextValue);
        if (!ok) {
            target.checked = !nextValue;
            toast.error({ text: 'Video-Export-Flag konnte nicht gespeichert werden.' });
        }
    }
    finally {
        isUpdatingVideo.value = false;
    }
};
const onToggleSegmentExport = async (segmentId, event) => {
    const target = event.target;
    const nextValue = target.checked;
    updatingSegments.value.add(segmentId);
    try {
        const ok = await videoStore.setSegmentExportFlag(segmentId, nextValue);
        if (!ok) {
            target.checked = !nextValue;
            toast.error({ text: 'Segment-Export-Flag konnte nicht gespeichert werden.' });
        }
    }
    finally {
        updatingSegments.value.delete(segmentId);
    }
};
const selectAllSegments = async (flag) => {
    if (sortedSegments.value.length === 0)
        return;
    isBulkUpdating.value = true;
    try {
        for (const segment of sortedSegments.value) {
            if (segment.exportSegment === flag)
                continue;
            updatingSegments.value.add(segment.id);
            const ok = await videoStore.setSegmentExportFlag(segment.id, flag);
            if (!ok) {
                toast.error({ text: `Segment ${segment.id} konnte nicht aktualisiert werden.` });
                break;
            }
            updatingSegments.value.delete(segment.id);
        }
    }
    finally {
        updatingSegments.value.clear();
        isBulkUpdating.value = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    videoId: null,
    segments: () => []
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['export-list-header']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card export-annotations" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-muted mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (!__VLS_ctx.videoId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-toggle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "export-all-video",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check form-switch" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onToggleVideoExport) },
        id: "export-all-video",
        ...{ class: "form-check-input" },
        type: "checkbox",
        checked: (__VLS_ctx.videoExportFlag),
        disabled: (__VLS_ctx.isUpdatingVideo),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-list mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-list-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.videoId))
                    return;
                __VLS_ctx.selectAllSegments(true);
            } },
        type: "button",
        ...{ class: "btn btn-sm btn-outline-primary" },
        disabled: (__VLS_ctx.isBulkUpdating),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.videoId))
                    return;
                __VLS_ctx.selectAllSegments(false);
            } },
        type: "button",
        ...{ class: "btn btn-sm btn-outline-secondary" },
        disabled: (__VLS_ctx.isBulkUpdating),
    });
    if (__VLS_ctx.sortedSegments.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted mt-2" },
        });
    }
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.sortedSegments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (segment.id),
            ...{ class: "export-segment" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "export-segment-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "segment-label" },
        });
        (__VLS_ctx.getTranslationForLabel(segment.label));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "segment-time" },
        });
        (__VLS_ctx.formatTime(segment.startTime));
        (__VLS_ctx.formatTime(segment.endTime));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check form-switch" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: ((event) => __VLS_ctx.onToggleSegmentExport(segment.id, event)) },
            ...{ class: "form-check-input" },
            type: "checkbox",
            checked: (segment.exportSegment === true),
            disabled: (__VLS_ctx.isSegmentUpdating(segment.id)),
        });
    }
}
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['export-annotations']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['export-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['export-list']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['export-list-header']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['export-segment']} */ ;
/** @type {__VLS_StyleScopedClasses['export-segment-info']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-label']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-time']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            getTranslationForLabel: getTranslationForLabel,
            isUpdatingVideo: isUpdatingVideo,
            isBulkUpdating: isBulkUpdating,
            sortedSegments: sortedSegments,
            videoExportFlag: videoExportFlag,
            formatTime: formatTime,
            isSegmentUpdating: isSegmentUpdating,
            onToggleVideoExport: onToggleVideoExport,
            onToggleSegmentExport: onToggleSegmentExport,
            selectAllSegments: selectAllSegments,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
