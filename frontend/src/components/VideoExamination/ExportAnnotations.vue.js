import { computed, onMounted, ref, watch, withDefaults } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useVideoStore } from '@/stores/videoStore';
import { formatTime as formatTimeHelper } from '@/utils/timeHelpers';
import { useToastStore } from '@/stores/toastStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { storeToRefs } from 'pinia';
const props = withDefaults(defineProps(), {
    videoId: null,
    segments: () => []
});
const videoStore = useVideoStore();
const toast = useToastStore();
const anonymizationStore = useAnonymizationStore();
const { overview } = storeToRefs(anonymizationStore);
const getTranslationForLabel = videoStore.getTranslationForLabel;
const updatingSegments = ref(new Set());
const isBulkUpdating = ref(false);
const selectedVideoId = ref(props.videoId ?? null);
const isExternalSelection = computed(() => props.videoId !== null && props.videoId !== undefined);
watch(() => props.videoId, (nextId) => {
    if (nextId !== undefined) {
        selectedVideoId.value = nextId ?? null;
    }
});
const videos = computed(() => videoStore.videoList.videos);
const annotatableVideos = computed(() => videos.value);
const hasVideos = computed(() => annotatableVideos.value.length > 0);
const noVideosMessage = computed(() => {
    if (videos.value.length === 0) {
        return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.';
    }
    return 'Keine exportierbaren Videos verfügbar.';
});
const effectiveSegments = computed(() => {
    if (props.videoId !== null && props.videoId !== undefined) {
        return props.segments;
    }
    if (!selectedVideoId.value)
        return [];
    return videoStore.allSegments;
});
const sortedSegments = computed(() => {
    return [...effectiveSegments.value].sort((a, b) => a.startTime - b.startTime);
});
const allSegmentsSelected = computed(() => {
    if (!selectedVideoId.value)
        return false;
    if (sortedSegments.value.length === 0)
        return false;
    return sortedSegments.value.every((s) => s.exportSegment === true);
});
const formatTime = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value))
        return '00:00';
    return formatTimeHelper(value);
};
const isSegmentUpdating = (segmentId) => updatingSegments.value.has(segmentId);
const onToggleAllSegments = async (event) => {
    const target = event.target;
    const nextValue = target.checked;
    const ok = await selectAllSegments(nextValue);
    if (!ok)
        target.checked = !nextValue;
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
        return false;
    isBulkUpdating.value = true;
    let okAll = true;
    try {
        for (const segment of sortedSegments.value) {
            if (segment.exportSegment === flag)
                continue;
            updatingSegments.value.add(segment.id);
            const ok = await videoStore.setSegmentExportFlag(segment.id, flag);
            if (!ok) {
                toast.error({ text: `Segment ${segment.id} konnte nicht aktualisiert werden.` });
                okAll = false;
                break;
            }
            updatingSegments.value.delete(segment.id);
        }
    }
    finally {
        updatingSegments.value.clear();
        isBulkUpdating.value = false;
    }
    return okAll;
};
const getVideoStatusIndicator = (videoId) => {
    const item = overview.value.find((o) => o.id === videoId && o.mediaType === 'video');
    if (!item)
        return '';
    const statusIndicators = {
        not_started: '⏳ Wartend',
        processing_anonymization: '🔄 In Verarbeitung',
        extracting_frames: '🎬 Frames',
        done_processing_anonymization: '✅ Anonymisiert - Validierung steht aus',
        validated: '🛡️ Validiert & Anonymisiert',
        failed: '❌ Fehler'
    };
    return statusIndicators[item.anonymizationStatus] || item.anonymizationStatus;
};
const loadSelectedVideo = async () => {
    if (isExternalSelection.value)
        return;
    if (!selectedVideoId.value) {
        videoStore.clearVideo();
        return;
    }
    try {
        await videoStore.fetchAllSegments(selectedVideoId.value);
        // Occam's razor: export should "just work". Default to selecting all segments after load
        // so the user doesn't have to manually toggle dozens of segment switches.
        await selectAllSegments(true);
    }
    catch (error) {
        console.error('Fehler beim Laden der Segmente:', error);
        toast.error({ text: 'Segmente konnten nicht geladen werden.' });
    }
};
const onVideoChange = () => {
    loadSelectedVideo();
};
const autoSelectInitialVideo = async () => {
    if (isExternalSelection.value)
        return;
    if (selectedVideoId.value)
        return;
    const firstVideo = annotatableVideos.value[0];
    if (firstVideo) {
        selectedVideoId.value = firstVideo.id;
        await loadSelectedVideo();
    }
};
onMounted(async () => {
    if (videoStore.videoList.videos.length === 0) {
        try {
            await videoStore.fetchAllVideos();
        }
        catch (error) {
            console.error('Fehler beim Laden der Videos:', error);
            toast.error({ text: 'Videos konnten nicht geladen werden.' });
        }
    }
    if (overview.value.length === 0) {
        try {
            await anonymizationStore.fetchOverview();
        }
        catch (error) {
            console.error('Fehler beim Laden der Anonymisierungsübersicht:', error);
        }
    }
    await autoSelectInitialVideo();
});
const selectedFormat = ref('csv');
const useExportFlags = ref(true);
const exportVideos = ref(true);
const exportFrames = ref(false);
const transcodeFrames = ref(false);
const transcodeFps = ref(50);
const transcodeQuality = ref(23);
const transcodeExt = ref('mp4');
const useFramePkPaths = ref(false);
const isExporting = ref(false);
const exportMessage = ref(null);
const isBackfilling = ref(false);
const exportBaseDir = computed(() => {
    // output_dir is interpreted on the backend filesystem. Prefer explicit config, otherwise
    // fall back to an app-local path that is typically writable in dev (`data/...`).
    const base = import.meta.env.VITE_EXPORT_OUTPUT_DIR ||
        (import.meta.env.VITE_STORAGE_DIR
            ? `${import.meta.env.VITE_STORAGE_DIR}/export`
            : 'data/export');
    return String(base).replace(/\/+$/, '');
});
const exportOutputDir = computed(() => {
    if (!selectedVideoId.value)
        return exportBaseDir.value;
    return `${exportBaseDir.value}/video_${selectedVideoId.value}_annotated`;
});
const exportSegmentIds = computed(() => sortedSegments.value.filter((segment) => segment.exportSegment === true).map((segment) => segment.id));
const getExportGuardError = () => {
    if (!selectedVideoId.value)
        return 'Bitte zuerst ein Video auswählen.';
    if (!exportOutputDir.value)
        return 'Kein Ausgabe-Verzeichnis konfiguriert.';
    if (!useExportFlags.value && exportSegmentIds.value.length === 0) {
        return 'Bitte mindestens ein Segment markieren oder "Export-Flags verwenden" aktivieren.';
    }
    return null;
};
const exportButtonLabel = computed(() => (isExporting.value ? 'Export läuft …' : 'Export starten'));
const backfillButtonLabel = computed(() => isBackfilling.value ? 'Annotationen werden erzeugt …' : 'Fehlende Annotationen erzeugen');
const backfillAnnotations = async () => {
    exportMessage.value = null;
    if (!selectedVideoId.value) {
        exportMessage.value = { type: 'error', text: 'Bitte zuerst ein Video auswählen.' };
        return;
    }
    isBackfilling.value = true;
    try {
        const resp = await axiosInstance.post(r(`media/videos/${selectedVideoId.value}/ensure-segment-annotations/`), { only_validated: true });
        const created = Number(resp?.data?.annotationsCreated ?? resp?.data?.annotations_created ?? 0);
        exportMessage.value = {
            type: 'success',
            text: `Backfill abgeschlossen. Neu erzeugte Annotationen: ${created}.`
        };
    }
    catch (error) {
        console.error('Backfill request failed', error);
        exportMessage.value = {
            type: 'error',
            text: error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Backfill fehlgeschlagen'
        };
    }
    finally {
        isBackfilling.value = false;
    }
};
const startExport = async () => {
    exportMessage.value = null;
    const guardError = getExportGuardError();
    if (guardError) {
        exportMessage.value = { type: 'error', text: guardError };
        return;
    }
    const payload = {
        output_dir: exportOutputDir.value,
        output_format: selectedFormat.value,
        use_export_flags: useExportFlags.value,
        export_videos: exportVideos.value,
        export_frames: exportFrames.value,
        use_frame_pk_paths: useFramePkPaths.value
    };
    if (selectedVideoId.value)
        payload.video_id = selectedVideoId.value;
    if (exportSegmentIds.value.length > 0) {
        payload.segmentIds = exportSegmentIds.value;
    }
    if (!useExportFlags.value && exportSegmentIds.value.length > 0) {
        payload.segment_ids = exportSegmentIds.value;
    }
    if (transcodeFrames.value) {
        payload.transcode_frames = true;
        payload.transcode_fps = transcodeFps.value;
        payload.transcode_quality = transcodeQuality.value;
        payload.transcode_ext = transcodeExt.value;
    }
    isExporting.value = true;
    try {
        await axiosInstance.post(r('media/videos/export-annotated/'), payload);
        exportMessage.value = {
            type: 'success',
            text: 'Exportauftrag erfolgreich gestartet. Überprüfen Sie die Logs für den Fortschritt.'
        };
    }
    catch (error) {
        console.error('Export request failed', error);
        exportMessage.value = {
            type: 'error',
            text: error?.response?.data?.detail || error?.message || 'Export fehlgeschlagen'
        };
    }
    finally {
        isExporting.value = false;
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
if (!__VLS_ctx.selectedVideoId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.onVideoChange) },
    value: (__VLS_ctx.selectedVideoId),
    ...{ class: "form-select" },
    disabled: (!__VLS_ctx.hasVideos || __VLS_ctx.isExternalSelection),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
});
(__VLS_ctx.hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar');
for (const [video] of __VLS_getVForSourceType((__VLS_ctx.annotatableVideos))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (video.id),
        value: (video.id),
    });
    (video.original_file_name || 'Video Nr. ' + video.id);
    (__VLS_ctx.getVideoStatusIndicator(video.id));
    (video.centerName || 'Unbekannt');
    (video.processorName || 'Unbekannt');
}
if (!__VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.noVideosMessage);
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
        ...{ onChange: (__VLS_ctx.onToggleAllSegments) },
        id: "export-all-video",
        ...{ class: "form-check-input" },
        type: "checkbox",
        checked: (__VLS_ctx.allSegmentsSelected),
        disabled: (__VLS_ctx.isBulkUpdating || __VLS_ctx.sortedSegments.length === 0),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-list mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-list-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
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
if (__VLS_ctx.selectedVideoId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-controls mt-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-dir text-break" },
    });
    (__VLS_ctx.exportOutputDir);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedFormat),
        ...{ class: "form-select form-select-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "csv",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "json",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check form-switch mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "use-export-flags",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.useExportFlags);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "use-export-flags",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-extra d-flex flex-wrap gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check form-switch" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "export-videos",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.exportVideos);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "export-videos",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check form-switch" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "export-frames",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.exportFrames);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "export-frames",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check form-switch" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "use-frame-pk-paths",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.useFramePkPaths);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "use-frame-pk-paths",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "export-extra mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check form-switch" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "transcode-frames",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.transcodeFrames);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "transcode-frames",
    });
    if (__VLS_ctx.transcodeFrames) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "transcode-options row gx-2 mt-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-6 col-md-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label mb-0" },
            for: "transcode-fps",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            id: "transcode-fps",
            type: "number",
            min: "1",
            ...{ class: "form-control form-control-sm" },
        });
        (__VLS_ctx.transcodeFps);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-6 col-md-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label mb-0" },
            for: "transcode-quality",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            id: "transcode-quality",
            type: "number",
            min: "1",
            max: "51",
            ...{ class: "form-control form-control-sm" },
        });
        (__VLS_ctx.transcodeQuality);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-12 col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label mb-0" },
            for: "transcode-ext",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            id: "transcode-ext",
            type: "text",
            ...{ class: "form-control form-control-sm" },
            value: (__VLS_ctx.transcodeExt),
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startExport) },
        type: "button",
        ...{ class: "btn btn-success w-100" },
        disabled: (__VLS_ctx.isExporting),
    });
    (__VLS_ctx.exportButtonLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.backfillAnnotations) },
        type: "button",
        ...{ class: "btn btn-outline-primary w-100 mt-2" },
        disabled: (__VLS_ctx.isBackfilling || !__VLS_ctx.selectedVideoId),
    });
    (__VLS_ctx.backfillButtonLabel);
    if (__VLS_ctx.exportMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: (['alert', __VLS_ctx.exportMessage.type === 'success' ? 'alert-success' : 'alert-danger', 'mt-3']) },
            role: "alert",
        });
        (__VLS_ctx.exportMessage.text);
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
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['export-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['export-list']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['export-list-header']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['export-segment']} */ ;
/** @type {__VLS_StyleScopedClasses['export-segment-info']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-label']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-time']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['export-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-md-row']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-md-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['export-dir']} */ ;
/** @type {__VLS_StyleScopedClasses['text-break']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['export-extra']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['export-extra']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['transcode-options']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['gx-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            getTranslationForLabel: getTranslationForLabel,
            isBulkUpdating: isBulkUpdating,
            selectedVideoId: selectedVideoId,
            isExternalSelection: isExternalSelection,
            annotatableVideos: annotatableVideos,
            hasVideos: hasVideos,
            noVideosMessage: noVideosMessage,
            sortedSegments: sortedSegments,
            allSegmentsSelected: allSegmentsSelected,
            formatTime: formatTime,
            isSegmentUpdating: isSegmentUpdating,
            onToggleAllSegments: onToggleAllSegments,
            onToggleSegmentExport: onToggleSegmentExport,
            getVideoStatusIndicator: getVideoStatusIndicator,
            onVideoChange: onVideoChange,
            selectedFormat: selectedFormat,
            useExportFlags: useExportFlags,
            exportVideos: exportVideos,
            exportFrames: exportFrames,
            transcodeFrames: transcodeFrames,
            transcodeFps: transcodeFps,
            transcodeQuality: transcodeQuality,
            transcodeExt: transcodeExt,
            useFramePkPaths: useFramePkPaths,
            isExporting: isExporting,
            exportMessage: exportMessage,
            isBackfilling: isBackfilling,
            exportOutputDir: exportOutputDir,
            exportButtonLabel: exportButtonLabel,
            backfillButtonLabel: backfillButtonLabel,
            backfillAnnotations: backfillAnnotations,
            startExport: startExport,
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
