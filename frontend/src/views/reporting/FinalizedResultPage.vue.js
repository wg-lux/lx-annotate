import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
const flow = useReportingFlowStore();
const route = useRoute();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const latestReport = ref(null);
const latestReportDetail = ref(null);
const patientExaminationId = computed(() => {
    const param = Number(route.params.patient_examination_id);
    if (Number.isFinite(param) && param > 0)
        return param;
    return flow.patientExaminationId;
});
const statusClass = computed(() => {
    const status = (latestReport.value?.status || '').toLowerCase();
    if (status === 'final')
        return 'bg-success';
    if (status === 'draft')
        return 'bg-warning text-dark';
    return 'bg-secondary';
});
const persistedArtifacts = computed(() => latestReportDetail.value?.persistedArtifacts || null);
const reportDocumentType = computed(() => {
    const fromArtifacts = persistedArtifacts.value
        ?.documentType ||
        persistedArtifacts.value
            ?.document_type;
    if (typeof fromArtifacts === 'string' && fromArtifacts.trim().length > 0)
        return fromArtifacts;
    const fromDetail = latestReportDetail.value?.documentType || latestReportDetail.value?.document_type;
    if (typeof fromDetail === 'string' && fromDetail.trim().length > 0)
        return fromDetail;
    return null;
});
const fallbackPdfId = computed(() => {
    if (typeof persistedArtifacts.value?.pdfId === 'number')
        return persistedArtifacts.value.pdfId;
    if (typeof latestReportDetail.value?.persistedPdfArtifactId === 'number') {
        return latestReportDetail.value.persistedPdfArtifactId;
    }
    return null;
});
const pdfViewUrl = computed(() => {
    if (persistedArtifacts.value?.pdfViewUrl)
        return persistedArtifacts.value.pdfViewUrl;
    if (fallbackPdfId.value)
        return `/${r(endpoints.media.pdfStream(fallbackPdfId.value))}?type=raw`;
    return null;
});
const pdfDownloadUrl = computed(() => {
    if (persistedArtifacts.value?.pdfDownloadUrl)
        return persistedArtifacts.value.pdfDownloadUrl;
    if (fallbackPdfId.value)
        return `/${r(endpoints.media.pdfStream(fallbackPdfId.value))}?type=raw&download=1`;
    return null;
});
function withPatientExaminationFilter(url) {
    if (!patientExaminationId.value)
        return url;
    if (url.includes('patient_examination_id='))
        return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}patient_examination_id=${patientExaminationId.value}`;
}
const patientTimelineUrl = computed(() => {
    if (persistedArtifacts.value?.patientTimelineUrl) {
        return withPatientExaminationFilter(persistedArtifacts.value.patientTimelineUrl);
    }
    if (flow.selectedPatientId) {
        return withPatientExaminationFilter(`/${r(endpoints.media.patientTimeline(flow.selectedPatientId))}`);
    }
    return null;
});
function formatTimestamp(value) {
    if (!value)
        return 'n/a';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime()))
        return value;
    return dt.toLocaleString();
}
async function loadLatestFinalizedState() {
    if (!patientExaminationId.value) {
        errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    loading.value = true;
    errorMessage.value = null;
    successMessage.value = null;
    latestReport.value = null;
    latestReportDetail.value = null;
    try {
        const listRes = await axiosInstance.get(r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId.value)));
        const rows = (Array.isArray(listRes.data?.results) ? listRes.data.results : listRes.data);
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            successMessage.value = 'Es ist noch kein Bericht vorhanden.';
            return;
        }
        latestReport.value = items[0];
        flow.setActiveReportId(items[0].id);
        const detailRes = await axiosInstance.get(r(endpoints.report.patientExaminationReportById(items[0].id)));
        latestReportDetail.value = (detailRes.data || null);
        successMessage.value = `Bericht #${items[0].id} geladen.`;
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Laden der Finalisierungsdaten.';
    }
    finally {
        loading.value = false;
    }
}
onMounted(async () => {
    await loadLatestFinalizedState();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadLatestFinalizedState) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading),
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    value: (__VLS_ctx.patientExaminationId ?? ''),
    readonly: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    value: (__VLS_ctx.latestReport?.id ?? ''),
    readonly: true,
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else if (!__VLS_ctx.latestReport) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info mb-0" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge" },
        ...{ class: (__VLS_ctx.statusClass) },
    });
    (__VLS_ctx.latestReport.status || 'unknown');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.latestReport.version ?? 'n/a');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.formatTimestamp(__VLS_ctx.latestReport.updatedAt || __VLS_ctx.latestReport.createdAt));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.reportDocumentType || 'n/a');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2" },
    });
    if (__VLS_ctx.pdfViewUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-dark btn-sm" },
            href: (__VLS_ctx.pdfViewUrl),
            target: "_blank",
            rel: "noopener",
        });
    }
    if (__VLS_ctx.pdfDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-primary btn-sm" },
            href: (__VLS_ctx.pdfDownloadUrl),
            target: "_blank",
            rel: "noopener",
        });
    }
    if (__VLS_ctx.patientTimelineUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            href: (__VLS_ctx.patientTimelineUrl),
            target: "_blank",
            rel: "noopener",
        });
    }
    if (!__VLS_ctx.pdfViewUrl && !__VLS_ctx.pdfDownloadUrl && !__VLS_ctx.patientTimelineUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mt-3 mb-0" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "alert alert-secondary mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
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
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            latestReport: latestReport,
            patientExaminationId: patientExaminationId,
            statusClass: statusClass,
            reportDocumentType: reportDocumentType,
            pdfViewUrl: pdfViewUrl,
            pdfDownloadUrl: pdfDownloadUrl,
            patientTimelineUrl: patientTimelineUrl,
            formatTimestamp: formatTimestamp,
            loadLatestFinalizedState: loadLatestFinalizedState,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
