import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { fetchPatientTimelineLatest, pickPreferredStream } from '@/api/reportingTimelineApi';
const route = useRoute();
const flow = useReportingFlowStore();
const selectedVideoStreamUrl = ref(null);
const selectedFrameStreamUrl = ref(null);
const routePatientExaminationId = computed(() => {
    const parsed = Number(route.params.patient_examination_id);
    if (!Number.isFinite(parsed))
        return null;
    return parsed > 0 ? parsed : null;
});
const pe = computed(() => flow.patientExaminationId || ':patient_examination_id');
const navItems = computed(() => [
    { label: 'Arbeitsliste', to: '/reporting' },
    { label: 'Fall-Setup', to: '/reporting/case-setup' },
    { label: 'Template & Anforderungen', to: `/reporting/${pe.value}/template-requirements` },
    { label: 'Befunde', to: `/reporting/${pe.value}/findings` },
    { label: 'Anforderungsprüfung', to: `/reporting/${pe.value}/requirements-review` },
    { label: 'Berichtseditor', to: `/reporting/${pe.value}/report-editor` },
    { label: 'Frame-Auswahl', to: `/reporting/${pe.value}/frame-selector` },
    { label: 'Finalisierung', to: `/reporting/${pe.value}/finalized` }
]);
const preferredReportStream = computed(() => pickPreferredStream(flow.mediaPreload?.latestReport?.streamOptions || []));
const preferredReportDownload = computed(() => preferredReportStream.value ? `${preferredReportStream.value}${preferredReportStream.value.includes('?') ? '&' : '?'}download=1` : null);
const preferredVideoStream = computed(() => pickPreferredStream(flow.mediaPreload?.latestVideo?.streamOptions || []));
function openUrl(url) {
    if (!url)
        return;
    window.open(url, '_blank', 'noopener,noreferrer');
}
function selectVideoStream(url) {
    selectedVideoStreamUrl.value = url;
}
function selectFrameStream(url) {
    selectedFrameStreamUrl.value = url;
}
async function refreshMediaPreload() {
    if (!flow.selectedPatientId) {
        flow.clearMediaPreload();
        return;
    }
    const patientExaminationId = routePatientExaminationId.value || flow.patientExaminationId;
    flow.setMediaPreloadLoading();
    try {
        const payload = await fetchPatientTimelineLatest({
            patientId: flow.selectedPatientId,
            patientExaminationId
        });
        flow.setMediaPreload(payload);
        selectedVideoStreamUrl.value = pickPreferredStream(payload.latestVideo?.streamOptions || []);
        selectedFrameStreamUrl.value = payload.latestFrames[0]?.streamUrl || null;
    }
    catch (error) {
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail || error?.message;
        const message = status === 404
            ? 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
            : status === 400
                ? 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.'
                : status === 403
                    ? 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.'
                    : `Fehler beim Laden des Medien-Preloads: ${detail || 'unbekannt'}`;
        flow.setMediaPreloadError(message);
    }
}
function isActive(path) {
    return route.path === path;
}
watch([() => flow.selectedPatientId, () => flow.patientExaminationId, routePatientExaminationId], async ([patientId]) => {
    if (!patientId) {
        flow.clearMediaPreload();
        return;
    }
    await refreshMediaPreload();
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-shell container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.flow.mediaPreloadStatus);
if (__VLS_ctx.flow.mediaPreloadError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger py-2 mt-2 mb-0" },
    });
    (__VLS_ctx.flow.mediaPreloadError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-grid mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshMediaPreload) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.flow.mediaPreloadStatus === 'loading' || !__VLS_ctx.flow.selectedPatientId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted px-2 mb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.flow.sessionStatus);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted px-2 mb-3" },
});
(__VLS_ctx.flow.patientExaminationId || 'n/a');
(__VLS_ctx.flow.lookupToken ? 'ja' : 'nein');
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav flex-column gap-1" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: (item.to),
        to: (item.to),
        ...{ class: "workflow-step-btn btn btn-sm text-start" },
        ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
    }));
    const __VLS_2 = __VLS_1({
        key: (item.to),
        to: (item.to),
        ...{ class: "workflow-step-btn btn btn-sm text-start" },
        ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    (item.label);
    var __VLS_3;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-9" },
});
if (__VLS_ctx.flow.mediaPreload) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card shadow-sm mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header d-flex justify-content-between align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.flow.mediaPreload.patient.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "border rounded p-3 h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fw-semibold mb-1" },
    });
    if (__VLS_ctx.flow.mediaPreload.latestReport) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.flow.mediaPreload.latestReport.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.flow.mediaPreload.latestReport.documentType || 'n/a');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 d-flex flex-wrap gap-2" },
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestReport.streamOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                            return;
                        __VLS_ctx.openUrl(option.url);
                    } },
                key: (`report-${option.type}`),
                ...{ class: "btn btn-outline-secondary btn-sm" },
            });
            (option.type);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 d-grid gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.flow.mediaPreload))
                        return;
                    if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                        return;
                    __VLS_ctx.openUrl(__VLS_ctx.preferredReportStream);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
            disabled: (!__VLS_ctx.preferredReportStream),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.flow.mediaPreload))
                        return;
                    if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                        return;
                    __VLS_ctx.openUrl(__VLS_ctx.preferredReportDownload);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
            disabled: (!__VLS_ctx.preferredReportDownload),
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "border rounded p-3 h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fw-semibold mb-1" },
    });
    if (__VLS_ctx.flow.mediaPreload.latestVideo) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.flow.mediaPreload.latestVideo.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 d-flex flex-wrap gap-2" },
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestVideo.streamOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestVideo))
                            return;
                        __VLS_ctx.selectVideoStream(option.url);
                    } },
                key: (`video-${option.type}`),
                ...{ class: "btn btn-outline-secondary btn-sm" },
            });
            (option.type);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 d-grid gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.flow.mediaPreload))
                        return;
                    if (!(__VLS_ctx.flow.mediaPreload.latestVideo))
                        return;
                    __VLS_ctx.selectVideoStream(__VLS_ctx.preferredVideoStream);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
            disabled: (!__VLS_ctx.preferredVideoStream),
        });
        if (__VLS_ctx.selectedVideoStreamUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
                ...{ class: "w-100 mt-2 rounded border" },
                controls: true,
                src: (__VLS_ctx.selectedVideoStreamUrl),
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "border rounded p-3 h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fw-semibold mb-1" },
    });
    if (__VLS_ctx.flow.mediaPreload.latestFrames.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small d-grid gap-2" },
        });
        for (const [frame] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestFrames))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestFrames.length))
                            return;
                        __VLS_ctx.selectFrameStream(frame.streamUrl);
                    } },
                key: (`${frame.videoId}-${frame.frameNumber}`),
                ...{ class: "btn btn-outline-secondary btn-sm text-start" },
            });
            (frame.frameNumber);
            (frame.category || 'fallback');
        }
        if (__VLS_ctx.selectedFrameStreamUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                ...{ class: "img-fluid rounded border mt-1" },
                src: (__VLS_ctx.selectedFrameStreamUrl),
                alt: "Selected frame stream preview",
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
}
const __VLS_4 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-9']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            flow: flow,
            selectedVideoStreamUrl: selectedVideoStreamUrl,
            selectedFrameStreamUrl: selectedFrameStreamUrl,
            navItems: navItems,
            preferredReportStream: preferredReportStream,
            preferredReportDownload: preferredReportDownload,
            preferredVideoStream: preferredVideoStream,
            openUrl: openUrl,
            selectVideoStream: selectVideoStream,
            selectFrameStream: selectFrameStream,
            refreshMediaPreload: refreshMediaPreload,
            isActive: isActive,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
