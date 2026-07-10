import { onMounted, ref } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
const records = ref([]);
const loading = ref(false);
const errorMessage = ref(null);
const videoTotal = ref(0);
const pdfTotal = ref(0);
function responseRows(data) {
    if (Array.isArray(data)) {
        return data;
    }
    return data.results || [];
}
function responseCount(data, fallbackCount) {
    return Array.isArray(data) ? fallbackCount : (data.count ?? fallbackCount);
}
async function fetchSensitiveMetadata(mediaType) {
    const { data } = await axiosInstance.get(r(endpoints.media.sensitiveMetadataList), {
        params: {
            content_type: mediaType,
            ordering: '-id'
        }
    });
    const rows = responseRows(data).map((record) => ({
        ...record,
        mediaType
    }));
    return {
        rows,
        total: responseCount(data, rows.length)
    };
}
async function loadSensitiveMetadata() {
    loading.value = true;
    errorMessage.value = null;
    try {
        const [videoResponse, pdfResponse] = await Promise.all([
            fetchSensitiveMetadata('video'),
            fetchSensitiveMetadata('pdf')
        ]);
        records.value = [...videoResponse.rows, ...pdfResponse.rows];
        videoTotal.value = videoResponse.total;
        pdfTotal.value = pdfResponse.total;
    }
    catch (error) {
        errorMessage.value =
            error instanceof Error ? error.message : 'SensitiveMeta data could not be loaded.';
        records.value = [];
        videoTotal.value = 0;
        pdfTotal.value = 0;
    }
    finally {
        loading.value = false;
    }
}
function mediaLabel(mediaType) {
    return mediaType === 'video' ? 'Video' : 'PDF';
}
function mediaBadgeClass(mediaType) {
    return mediaType === 'video' ? 'bg-primary' : 'bg-danger';
}
function displayValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'Not available';
    }
    return String(value);
}
function formatDate(value) {
    if (!value) {
        return 'Not available';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString('de-DE');
}
function truncateText(value) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 80) {
        return normalized;
    }
    return `${normalized.slice(0, 77)}...`;
}
onMounted(() => {
    void loadSensitiveMetadata();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['evaluation-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['sensitive-meta-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sensitive-meta-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sensitive-meta-table']} */ ;
/** @type {__VLS_StyleScopedClasses['text-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['evaluation-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4 anonymization-evaluation" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "evaluation-header mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "evaluation-title mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "evaluation-counts" },
    'aria-label': "Sensitive metadata totals",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge bg-primary" },
});
(__VLS_ctx.videoTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge bg-danger" },
});
(__VLS_ctx.pdfTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge bg-secondary" },
});
(__VLS_ctx.records.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadSensitiveMetadata) },
    ...{ class: "btn btn-outline-primary btn-sm" },
    type: "button",
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-bold-right me-1" },
    ...{ class: ({ 'loading-icon': __VLS_ctx.loading }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "sensitive-meta-panel" },
    'aria-labelledby': "sensitive-meta-heading",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    id: "sensitive-meta-heading",
    ...{ class: "panel-title mb-0" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-muted small" },
    });
}
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger mb-0" },
        role: "alert",
    });
    (__VLS_ctx.errorMessage);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-hover align-middle mb-0 sensitive-meta-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "12",
            ...{ class: "text-center text-muted py-4" },
        });
    }
    else if (__VLS_ctx.records.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "12",
            ...{ class: "text-center text-muted py-4" },
        });
    }
    else {
        for (const [meta] of __VLS_getVForSourceType((__VLS_ctx.records))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (`${meta.mediaType}-${meta.id}`),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
                ...{ class: (__VLS_ctx.mediaBadgeClass(meta.mediaType)) },
            });
            (__VLS_ctx.mediaLabel(meta.mediaType));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (meta.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.displayValue(meta.patientFirstName));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.displayValue(meta.patientLastName));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDate(meta.patientDobDisplay || meta.patientDob));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.displayValue(meta.casenumber));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDate(meta.examinationDateDisplay || meta.examinationDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.displayValue(meta.patientGenderName));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.displayValue(meta.centerName));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
                ...{ class: (meta.isVerified ? 'bg-success' : 'bg-warning text-dark') },
            });
            (meta.isVerified ? 'Yes' : 'No');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-preview-cell" },
            });
            if (meta.text) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
                    ...{ class: "text-preview" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
                (__VLS_ctx.truncateText(meta.text));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
                (meta.text);
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-muted" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-preview-cell" },
            });
            if (meta.anonymizedText) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
                    ...{ class: "text-preview" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
                (__VLS_ctx.truncateText(meta.anonymizedText));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
                (meta.anonymizedText);
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-muted" },
                });
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymization-evaluation']} */ ;
/** @type {__VLS_StyleScopedClasses['evaluation-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['evaluation-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['evaluation-counts']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-bold-right']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['sensitive-meta-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['sensitive-meta-table']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-preview-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-preview-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            records: records,
            loading: loading,
            errorMessage: errorMessage,
            videoTotal: videoTotal,
            pdfTotal: pdfTotal,
            loadSensitiveMetadata: loadSensitiveMetadata,
            mediaLabel: mediaLabel,
            mediaBadgeClass: mediaBadgeClass,
            displayValue: displayValue,
            formatDate: formatDate,
            truncateText: truncateText,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
