import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useFileUrl } from '@/composables/useFileUrl';
const props = withDefaults(defineProps(), {
    fileType: 'pdf',
    viewerHeight: '600px',
    showMetaInfo: false,
    autoRefresh: true,
    refreshInterval: 30
});
const emit = defineEmits();
// File URL Composable
const { loading, error, currentReport, secureUrl, urlExpiresAt, isUrlExpired, timeUntilExpiry, isUrlAvailable, loadReportWithSecureUrl, generateSecureUrl, validateCurrentUrl, refreshUrl, clearCurrentUrl, formatTimeUntilExpiry } = useFileUrl();
// Local reactive state
const autoRefreshTimer = ref(null);
// Computed properties
const isImageFile = computed(() => {
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(props.fileType.toLowerCase());
});
// Watchers
watch(() => props.reportId, async (newReportId, oldReportId) => {
    if (newReportId && newReportId !== oldReportId) {
        await loadReport(newReportId);
    }
    else if (!newReportId) {
        clearCurrentUrl();
    }
}, { immediate: true });
watch(isUrlExpired, (expired) => {
    if (expired) {
        emit('urlExpired');
    }
});
watch(currentReport, (report) => {
    if (report) {
        emit('reportLoaded', report);
    }
});
watch(error, (errorMsg) => {
    if (errorMsg) {
        emit('error', errorMsg);
    }
});
// Auto-refresh setup
watch(() => props.autoRefresh, (enabled) => {
    if (enabled) {
        setupAutoRefresh();
    }
    else {
        clearAutoRefresh();
    }
});
// Methods
async function loadReport(reportId) {
    try {
        await loadReportWithSecureUrl(reportId);
        if (props.autoRefresh) {
            setupAutoRefresh();
        }
    }
    catch (err) {
        console.error('Fehler beim Laden des Reports:', err);
    }
}
async function handleRefreshUrl() {
    if (!props.reportId)
        return;
    try {
        await refreshUrl(props.reportId, props.fileType);
    }
    catch (err) {
        console.error('Fehler beim Erneuern der URL:', err);
    }
}
async function handleValidateUrl() {
    const isValid = await validateCurrentUrl();
    if (!isValid) {
        console.warn('URL ist nicht mehr gültig');
    }
}
async function handleRetry() {
    if (props.reportId) {
        await loadReport(props.reportId);
    }
}
function openInNewTab() {
    if (secureUrl.value) {
        window.open(secureUrl.value, '_blank', 'noopener,noreferrer');
    }
}
function setupAutoRefresh() {
    clearAutoRefresh();
    if (props.autoRefresh && props.reportId) {
        const intervalMs = props.refreshInterval * 60 * 1000; // Convert to milliseconds
        autoRefreshTimer.value = setInterval(() => {
            if (props.reportId) {
                refreshUrl(props.reportId, props.fileType);
            }
        }, intervalMs);
    }
}
function clearAutoRefresh() {
    if (autoRefreshTimer.value) {
        clearInterval(autoRefreshTimer.value);
        autoRefreshTimer.value = null;
    }
}
// Event handlers
function onFrameLoad() {
    console.log('PDF erfolgreich geladen');
}
function onFrameError() {
    console.error('Fehler beim Laden des PDFs');
}
function onImageLoad() {
    console.log('Bild erfolgreich geladen');
}
function onImageError() {
    console.error('Fehler beim Laden des Bildes');
}
// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function formatDate(dateString) {
    if (!dateString)
        return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch {
        return dateString;
    }
}
function getStatusColor(status) {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        case 'pending': return 'warning';
        default: return 'secondary';
    }
}
function getStatusLabel(status) {
    switch (status) {
        case 'approved': return 'Genehmigt';
        case 'rejected': return 'Abgelehnt';
        case 'pending': return 'Ausstehend';
        default: return 'Unbekannt';
    }
}
// Lifecycle
onMounted(() => {
    if (props.reportId) {
        loadReport(props.reportId);
    }
});
// Cleanup
const __VLS_exposed = {
    loadReport,
    refreshUrl: handleRefreshUrl,
    validateUrl: handleValidateUrl,
    clearReport: clearCurrentUrl
};
defineExpose(__VLS_exposed);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    fileType: 'pdf',
    viewerHeight: '600px',
    showMetaInfo: false,
    autoRefresh: true,
    refreshInterval: 30
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['report-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['viewer-actions']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "universal-report-viewer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "viewer-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex justify-content-between align-items-center mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "viewer-status" },
});
if (__VLS_ctx.isUrlAvailable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-success" },
        title: (`URL gültig bis: ${__VLS_ctx.urlExpiresAt?.toLocaleString()}`),
    });
    (__VLS_ctx.formatTimeUntilExpiry());
}
else if (__VLS_ctx.isUrlExpired) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-warning" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-secondary" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "viewer-actions mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleRefreshUrl) },
    ...{ class: "btn btn-primary btn-sm me-2" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.reportId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-arrow-clockwise" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleValidateUrl) },
    ...{ class: "btn btn-outline-secondary btn-sm me-2" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.secureUrl),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-check-circle" },
});
if (__VLS_ctx.secureUrl && !__VLS_ctx.isUrlExpired) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openInNewTab) },
        ...{ class: "btn btn-outline-info btn-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-box-arrow-up-right" },
    });
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2" },
    });
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "alert-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-exclamation-triangle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-0" },
    });
    (__VLS_ctx.error);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleRetry) },
        ...{ class: "btn btn-outline-danger btn-sm" },
    });
}
else if (__VLS_ctx.isUrlAvailable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "file-viewer" },
    });
    if (__VLS_ctx.fileType === 'pdf') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pdf-viewer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
            ...{ onLoad: (__VLS_ctx.onFrameLoad) },
            ...{ onError: (__VLS_ctx.onFrameError) },
            src: (__VLS_ctx.secureUrl + '#toolbar=1&navpanes=0&scrollbar=1'),
            width: "100%",
            height: (__VLS_ctx.viewerHeight),
            frameborder: "0",
            ...{ class: "pdf-frame" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.secureUrl),
            target: "_blank",
            rel: "noopener noreferrer",
        });
    }
    else if (__VLS_ctx.isImageFile) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "image-viewer text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onLoad: (__VLS_ctx.onImageLoad) },
            ...{ onError: (__VLS_ctx.onImageError) },
            src: (__VLS_ctx.secureUrl),
            alt: (__VLS_ctx.currentReport?.report_meta?.casenumber || 'Report Image'),
            ...{ class: "img-fluid" },
            ...{ style: {} },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "file-download text-center py-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-file-earmark-text display-1 text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.currentReport?.secure_file_url?.original_filename || 'Unbekannte Datei');
        if (__VLS_ctx.currentReport?.secure_file_url?.file_size) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatFileSize(__VLS_ctx.currentReport.secure_file_url.file_size));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.secureUrl),
            ...{ class: "btn btn-primary" },
            target: "_blank",
            rel: "noopener noreferrer",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-download" },
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "no-file-state text-center py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-file-earmark-x display-1 text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.reportId ? 'Für diesen Report ist keine Datei hinterlegt.' : 'Bitte wählen Sie einen Report aus.');
}
if (__VLS_ctx.showMetaInfo && __VLS_ctx.currentReport) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "report-meta mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
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
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-2" },
    });
    (__VLS_ctx.currentReport.report_meta.patient_first_name);
    (__VLS_ctx.currentReport.report_meta.patient_last_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-2" },
    });
    (__VLS_ctx.currentReport.report_meta.casenumber || 'N/A');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-2" },
    });
    (__VLS_ctx.formatDate(__VLS_ctx.currentReport.report_meta.examination_date));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (`badge bg-${__VLS_ctx.getStatusColor(__VLS_ctx.currentReport.status)}`) },
    });
    (__VLS_ctx.getStatusLabel(__VLS_ctx.currentReport.status));
}
/** @type {__VLS_StyleScopedClasses['universal-report-viewer']} */ ;
/** @type {__VLS_StyleScopedClasses['viewer-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['viewer-status']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['viewer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-clockwise']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-box-arrow-up-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['file-viewer']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-viewer']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-frame']} */ ;
/** @type {__VLS_StyleScopedClasses['image-viewer']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['file-download']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-file-earmark-text']} */ ;
/** @type {__VLS_StyleScopedClasses['display-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-download']} */ ;
/** @type {__VLS_StyleScopedClasses['no-file-state']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-file-earmark-x']} */ ;
/** @type {__VLS_StyleScopedClasses['display-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['report-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            currentReport: currentReport,
            secureUrl: secureUrl,
            urlExpiresAt: urlExpiresAt,
            isUrlExpired: isUrlExpired,
            isUrlAvailable: isUrlAvailable,
            formatTimeUntilExpiry: formatTimeUntilExpiry,
            isImageFile: isImageFile,
            handleRefreshUrl: handleRefreshUrl,
            handleValidateUrl: handleValidateUrl,
            handleRetry: handleRetry,
            openInNewTab: openInNewTab,
            onFrameLoad: onFrameLoad,
            onFrameError: onFrameError,
            onImageLoad: onImageLoad,
            onImageError: onImageError,
            formatFileSize: formatFileSize,
            formatDate: formatDate,
            getStatusColor: getStatusColor,
            getStatusLabel: getStatusLabel,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
