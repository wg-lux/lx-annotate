import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import { makeReport } from '@/api/reportExportApi';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
const route = useRoute();
const flow = useReportingFlowStore();
const loadingReport = ref(false);
const generating = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const warnings = ref([]);
const latestReport = ref(null);
const persistedArtifacts = ref(null);
const includedFrameCount = ref(0);
const patient = ref({
    firstName: '',
    lastName: '',
    dob: ''
});
const patientExaminationId = computed(() => {
    const param = Number(route.params.patient_examination_id);
    if (Number.isFinite(param) && param > 0)
        return param;
    return flow.patientExaminationId;
});
const selectedReportId = computed(() => latestReport.value?.id ?? flow.activeReportId ?? null);
const canMakeReport = computed(() => !!patientExaminationId.value &&
    !!patient.value.firstName &&
    !!patient.value.lastName &&
    !!patient.value.dob);
const reportStatusClass = computed(() => {
    const status = (latestReport.value?.status || '').toLowerCase();
    if (status === 'final')
        return 'bg-success';
    if (status === 'draft')
        return 'bg-warning text-dark';
    return 'bg-secondary';
});
const timelineUrl = computed(() => {
    const url = persistedArtifacts.value?.patientTimelineUrl;
    if (!url)
        return undefined;
    if (!patientExaminationId.value || url.includes('patient_examination_id='))
        return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}patient_examination_id=${patientExaminationId.value}`;
});
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
    warnings.value = [];
}
async function loadLatestReport() {
    if (!patientExaminationId.value) {
        errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    loadingReport.value = true;
    clearMessages();
    try {
        const res = await axiosInstance.get(r(endpoints.report.patientExaminationReportsByPatientExamination(patientExaminationId.value)));
        const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data);
        const items = Array.isArray(rows) ? rows : [];
        latestReport.value = items[0] || null;
        if (latestReport.value?.id) {
            flow.setActiveReportId(latestReport.value.id);
        }
        if (!latestReport.value) {
            successMessage.value = 'Kein Bericht für diesen Fall vorhanden.';
        }
    }
    catch (e) {
        errorMessage.value = e?.response?.data?.detail || e?.message || 'Bericht konnte nicht geladen werden.';
    }
    finally {
        loadingReport.value = false;
    }
}
async function onMakeReport() {
    if (!patientExaminationId.value) {
        errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    if (!canMakeReport.value) {
        errorMessage.value = 'Vorname, Nachname und Geburtsdatum sind erforderlich.';
        return;
    }
    generating.value = true;
    clearMessages();
    persistedArtifacts.value = null;
    includedFrameCount.value = 0;
    try {
        const data = await makeReport({
            patientExaminationId: patientExaminationId.value,
            reportId: selectedReportId.value,
            patient: patient.value,
            maxFrames: 12
        });
        latestReport.value = {
            id: data.report.id,
            status: data.report.status,
            version: data.report.version
        };
        flow.setActiveReportId(data.report.id);
        persistedArtifacts.value = data.persistedArtifacts || null;
        includedFrameCount.value = data.includedFrameCount || 0;
        warnings.value = Array.isArray(data.warnings) ? data.warnings : [];
        successMessage.value = `PDF-Bericht #${data.report.id} wurde erstellt.`;
    }
    catch (e) {
        errorMessage.value = e?.response?.data?.detail || e?.message || 'PDF-Bericht konnte nicht erstellt werden.';
    }
    finally {
        generating.value = false;
    }
}
onMounted(() => {
    void loadLatestReport();
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
    ...{ class: "card-header d-flex justify-content-between align-items-center gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadLatestReport) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loadingReport),
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
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    autocomplete: "off",
});
(__VLS_ctx.patient.firstName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    autocomplete: "off",
});
(__VLS_ctx.patient.lastName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    type: "date",
    autocomplete: "off",
});
(__VLS_ctx.patient.dob);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fw-semibold" },
});
(__VLS_ctx.patientExaminationId ?? 'n/a');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fw-semibold" },
});
(__VLS_ctx.selectedReportId ?? 'n/a');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge" },
    ...{ class: (__VLS_ctx.reportStatusClass) },
});
(__VLS_ctx.latestReport?.status || 'n/a');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-wrap gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.onMakeReport) },
    ...{ class: "btn btn-primary" },
    disabled: (!__VLS_ctx.canMakeReport || __VLS_ctx.generating),
});
if (__VLS_ctx.generating) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-1" },
    });
}
if (__VLS_ctx.patientExaminationId) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ class: "btn btn-outline-secondary" },
        to: (`/reporting/${__VLS_ctx.patientExaminationId}/frame-selector`),
    }));
    const __VLS_2 = __VLS_1({
        ...{ class: "btn btn-outline-secondary" },
        to: (`/reporting/${__VLS_ctx.patientExaminationId}/frame-selector`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    var __VLS_3;
}
if (__VLS_ctx.patientExaminationId) {
    const __VLS_4 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ class: "btn btn-outline-secondary" },
        to: (`/reporting/${__VLS_ctx.patientExaminationId}/finalized`),
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: "btn btn-outline-secondary" },
        to: (`/reporting/${__VLS_ctx.patientExaminationId}/finalized`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    var __VLS_7;
}
if (__VLS_ctx.warnings.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning py-2 mt-3 mb-0" },
    });
    for (const [warning] of __VLS_getVForSourceType((__VLS_ctx.warnings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (warning),
        });
        (warning);
    }
}
if (__VLS_ctx.persistedArtifacts) {
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
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2 mb-3" },
    });
    if (__VLS_ctx.persistedArtifacts.pdfViewUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-dark btn-sm" },
            href: (__VLS_ctx.persistedArtifacts.pdfViewUrl),
            target: "_blank",
            rel: "noopener",
        });
    }
    if (__VLS_ctx.persistedArtifacts.pdfDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-primary btn-sm" },
            href: (__VLS_ctx.persistedArtifacts.pdfDownloadUrl),
            target: "_blank",
            rel: "noopener",
        });
    }
    if (__VLS_ctx.persistedArtifacts.patientTimelineUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            href: (__VLS_ctx.timelineUrl),
            target: "_blank",
            rel: "noopener",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    (__VLS_ctx.includedFrameCount);
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
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
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
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loadingReport: loadingReport,
            generating: generating,
            errorMessage: errorMessage,
            successMessage: successMessage,
            warnings: warnings,
            latestReport: latestReport,
            persistedArtifacts: persistedArtifacts,
            includedFrameCount: includedFrameCount,
            patient: patient,
            patientExaminationId: patientExaminationId,
            selectedReportId: selectedReportId,
            canMakeReport: canMakeReport,
            reportStatusClass: reportStatusClass,
            timelineUrl: timelineUrl,
            loadLatestReport: loadLatestReport,
            onMakeReport: onMakeReport,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
