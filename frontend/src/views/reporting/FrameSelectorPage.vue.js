import { computed, onMounted, ref, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
const CLEAR_FINDING_SENTINEL = -1;
const flow = useReportingFlowStore();
const { catalogFindings, ensureCatalogLoaded } = useFindingSelectors();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const frameSelectorState = ref(null);
const selectedSegmentId = ref(null);
const manualFrameNumber = ref(null);
const selectedFindingIdForSegment = ref(null);
const findings = computed(() => catalogFindings.value);
const latest_frames = computed(() => flow.mediaPreload?.latestFrames || []);
const segments = computed(() => frameSelectorState.value?.results || []);
const selectedSegment = computed(() => segments.value.find((s) => s.segmentId === selectedSegmentId.value) || null);
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function open_stream_url(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
}
function selectorUrl() {
    if (!flow.patientExaminationId)
        return null;
    return r(endpoints.report.segmentFrameSelector(flow.patientExaminationId, flow.activeReportId ?? undefined));
}
async function ensureFindingsLoaded() {
    await ensureCatalogLoaded();
}
function syncSelectionDefaults() {
    if (!segments.value.length) {
        selectedSegmentId.value = null;
        manualFrameNumber.value = null;
        selectedFindingIdForSegment.value = null;
        return;
    }
    if (!selectedSegmentId.value || !segments.value.some((s) => s.segmentId === selectedSegmentId.value)) {
        selectedSegmentId.value = segments.value[0]?.segmentId ?? null;
    }
    const seg = selectedSegment.value;
    if (!seg)
        return;
    manualFrameNumber.value =
        seg.selectedFrameNumber ??
            latest_frames.value[0]?.frameNumber ??
            seg.startFrameNumber;
    selectedFindingIdForSegment.value = seg.attachedFinding?.findingId ?? null;
}
async function loadFrameSelectorState() {
    const url = selectorUrl();
    if (!url) {
        errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.';
        return;
    }
    loading.value = true;
    clearMessages();
    try {
        const res = await axiosInstance.get(url);
        frameSelectorState.value = res.data;
        if (frameSelectorState.value?.reportId) {
            flow.setActiveReportId(frameSelectorState.value.reportId);
        }
        syncSelectionDefaults();
        successMessage.value = 'Segment-Frame-Status geladen.';
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Laden der Segment-Frame-Auswahl.';
    }
    finally {
        loading.value = false;
    }
}
function buildPatchBody(base) {
    if (!flow.patientExaminationId || !selectedSegment.value)
        return null;
    const body = {
        patientExaminationId: flow.patientExaminationId,
        ...(flow.activeReportId ? { reportId: flow.activeReportId } : {}),
        segmentId: selectedSegment.value.segmentId,
        ...base
    };
    if (selectedFindingIdForSegment.value === CLEAR_FINDING_SENTINEL) {
        body.findingId = null;
    }
    else if (typeof selectedFindingIdForSegment.value === 'number') {
        body.findingId = selectedFindingIdForSegment.value;
    }
    return body;
}
async function patchSegmentAction(action, step) {
    const body = buildPatchBody({
        action,
        ...(typeof step === 'number' ? { step } : {})
    });
    if (!body) {
        errorMessage.value = 'Kein Segment ausgewählt.';
        return;
    }
    loading.value = true;
    clearMessages();
    try {
        const res = await axiosInstance.patch(r(endpoints.report.segmentFrameSelectorBase), body);
        frameSelectorState.value = res.data;
        if (frameSelectorState.value?.reportId) {
            flow.setActiveReportId(frameSelectorState.value.reportId);
        }
        syncSelectionDefaults();
        successMessage.value = 'Segment aktualisiert.';
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Aktualisieren des Segments.';
    }
    finally {
        loading.value = false;
    }
}
async function setFrameManual() {
    if (!selectedSegment.value) {
        errorMessage.value = 'Kein Segment ausgewählt.';
        return;
    }
    const frameNumber = Number(manualFrameNumber.value);
    if (!Number.isFinite(frameNumber)) {
        errorMessage.value = 'Bitte eine gültige Frame-Nummer eingeben.';
        return;
    }
    const body = buildPatchBody({
        action: 'set',
        frameNumber
    });
    if (!body)
        return;
    loading.value = true;
    clearMessages();
    try {
        const res = await axiosInstance.patch(r(endpoints.report.segmentFrameSelectorBase), body);
        frameSelectorState.value = res.data;
        if (frameSelectorState.value?.reportId) {
            flow.setActiveReportId(frameSelectorState.value.reportId);
        }
        syncSelectionDefaults();
        successMessage.value = 'Frame manuell gesetzt.';
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Setzen des Frames.';
    }
    finally {
        loading.value = false;
    }
}
watch(selectedSegment, (segment) => {
    if (!segment)
        return;
    manualFrameNumber.value = segment.selectedFrameNumber ?? segment.startFrameNumber;
    selectedFindingIdForSegment.value = segment.attachedFinding?.findingId ?? null;
});
onMounted(async () => {
    await ensureFindingsLoaded();
    if (flow.patientExaminationId) {
        await loadFrameSelectorState();
    }
    else {
        errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.';
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex justify-content-between align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadFrameSelectorState) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.flow.patientExaminationId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger py-2" },
    });
    (__VLS_ctx.errorMessage);
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success py-2" },
    });
    (__VLS_ctx.successMessage);
}
/** @type {[typeof LookupStatusPanel, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(LookupStatusPanel, new LookupStatusPanel({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    selectedExaminationId: (__VLS_ctx.flow.selectedExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
}));
const __VLS_1 = __VLS_0({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    selectedExaminationId: (__VLS_ctx.flow.selectedExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card border mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.latest_frames.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2" },
    });
    for (const [frame] of __VLS_getVForSourceType((__VLS_ctx.latest_frames))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.latest_frames.length))
                        return;
                    __VLS_ctx.open_stream_url(frame.streamUrl);
                } },
            key: (`${frame.videoId}-${frame.frameNumber}`),
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
        (frame.frameNumber);
        (frame.category || 'fallback');
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
}
if (!__VLS_ctx.flow.patientExaminationId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-lg-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card border h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header bg-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body p-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2 px-2 small text-muted" },
    });
    (__VLS_ctx.frameSelectorState?.count ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-group segment-list" },
    });
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.flow.patientExaminationId))
                        return;
                    __VLS_ctx.selectedSegmentId = segment.segmentId;
                } },
            key: (segment.segmentId),
            type: "button",
            ...{ class: "list-group-item list-group-item-action text-start" },
            ...{ class: ({ active: __VLS_ctx.selectedSegmentId === segment.segmentId }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold" },
        });
        (segment.labelName || `Segment ${segment.segmentId}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small opacity-75" },
        });
        (segment.startFrameNumber);
        (segment.endFrameNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small opacity-75" },
        });
        (segment.selectedFrameNumber ?? 'keine');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-lg-8" },
    });
    if (__VLS_ctx.selectedSegment) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card border h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header d-flex justify-content-between align-items-center bg-light" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-0" },
        });
        (__VLS_ctx.selectedSegment.labelName || `Segment ${__VLS_ctx.selectedSegment.segmentId}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.selectedSegment.startFrameNumber);
        (__VLS_ctx.selectedSegment.endFrameNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-secondary" },
        });
        (__VLS_ctx.selectedSegment.selectedFrameNumber ?? 'keine');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row g-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-7" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "frame-preview rounded border p-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-2" },
        });
        if (__VLS_ctx.selectedSegment.selectedFrame) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedSegment.selectedFrame.frameId);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedSegment.selectedFrame.frameNumber);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedSegment.selectedFrame.timestamp ?? 'n/a');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedSegment.selectedFrame.relativePath || 'n/a');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedSegment.selectedFrame.fileExists ? 'ja' : 'nein');
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-muted small" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 text-muted small" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "input-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            type: "number",
            min: (__VLS_ctx.selectedSegment.startFrameNumber),
            max: (__VLS_ctx.selectedSegment.endFrameNumber),
        });
        (__VLS_ctx.manualFrameNumber);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.setFrameManual) },
            ...{ class: "btn btn-outline-primary" },
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.selectedFindingIdForSegment),
            ...{ class: "form-select" },
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (null),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (__VLS_ctx.CLEAR_FINDING_SENTINEL),
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.findings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (finding.id),
                value: (finding.id),
            });
            (finding.nameDe || finding.name || `Befund ${finding.id}`);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted mt-1" },
        });
        (__VLS_ctx.selectedSegment.attachedFinding?.findingName || 'kein Befund');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-grid gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.flow.patientExaminationId))
                        return;
                    if (!(__VLS_ctx.selectedSegment))
                        return;
                    __VLS_ctx.patchSegmentAction('random');
                } },
            ...{ class: "btn btn-outline-secondary" },
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.flow.patientExaminationId))
                        return;
                    if (!(__VLS_ctx.selectedSegment))
                        return;
                    __VLS_ctx.patchSegmentAction('step', -5);
                } },
            ...{ class: "btn btn-outline-secondary" },
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.flow.patientExaminationId))
                        return;
                    if (!(__VLS_ctx.selectedSegment))
                        return;
                    __VLS_ctx.patchSegmentAction('step', 5);
                } },
            ...{ class: "btn btn-outline-secondary" },
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.flow.patientExaminationId))
                        return;
                    if (!(__VLS_ctx.selectedSegment))
                        return;
                    __VLS_ctx.patchSegmentAction('clear');
                } },
            ...{ class: "btn btn-outline-danger" },
            disabled: (__VLS_ctx.loading),
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card border h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body text-muted" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['segment-list']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item-action']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-75']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-75']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-8']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-7']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LookupStatusPanel: LookupStatusPanel,
            CLEAR_FINDING_SENTINEL: CLEAR_FINDING_SENTINEL,
            flow: flow,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            frameSelectorState: frameSelectorState,
            selectedSegmentId: selectedSegmentId,
            manualFrameNumber: manualFrameNumber,
            selectedFindingIdForSegment: selectedFindingIdForSegment,
            findings: findings,
            latest_frames: latest_frames,
            segments: segments,
            selectedSegment: selectedSegment,
            open_stream_url: open_stream_url,
            loadFrameSelectorState: loadFrameSelectorState,
            patchSegmentAction: patchSegmentAction,
            setFrameManual: setFrameManual,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
