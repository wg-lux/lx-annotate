import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
const store = useAnonymizationStore();
const router = useRouter();
// Computed properties for statistics
const notStartedCount = computed(() => store.overview.filter(f => f.anonymizationStatus === 'not_started').length);
const processingCount = computed(() => store.overview.filter(f => f.anonymizationStatus === 'processing').length);
const completedCount = computed(() => store.overview.filter(f => f.anonymizationStatus === 'done' && f.annotationStatus === 'done').length);
// Lifecycle
onMounted(async () => {
    await store.fetchOverview();
});
onUnmounted(() => {
    // Clean up any polling when component is destroyed
    store.stopAllPolling();
});
// Actions
async function refreshOverview() {
    await store.refreshOverview();
}
async function startAnonymization(file) {
    const success = await store.startAnonymization(file.id);
    if (success) {
        // Could show a toast notification here
        console.log(`Anonymization started for ${file.filename}`);
    }
}
async function validateFile(file) {
    const data = await store.setCurrentForValidation(file.id);
    if (data) {
        // Navigate to validation view
        router.push('/anonymization/validate');
    }
}
// Helper functions
function getFileIcon(mediaType) {
    return {
        pdf: 'fas fa-file-pdf fa-lg text-danger',
        video: 'fas fa-video fa-lg text-primary'
    }[mediaType] || 'fas fa-file fa-lg text-muted';
}
function getMediaTypeClass(mediaType) {
    return {
        pdf: 'bg-danger',
        video: 'bg-primary'
    }[mediaType] || 'bg-secondary';
}
function getStatusClass(status) {
    const baseClass = 'badge';
    const statusClasses = {
        'not_started': 'bg-secondary',
        'processing': 'bg-info',
        'done': 'bg-success',
        'failed': 'bg-danger'
    };
    return `${baseClass} ${statusClasses[status] || 'bg-secondary'}`;
}
function getStatusIcon(status) {
    return {
        'not_started': 'fas fa-clock',
        'processing': 'fas fa-spinner fa-spin',
        'done': 'fas fa-check',
        'failed': 'fas fa-times'
    }[status] || 'fas fa-question';
}
function getStatusText(status) {
    return {
        'not_started': 'Nicht gestartet',
        'processing': 'In Bearbeitung',
        'done': 'Abgeschlossen',
        'failed': 'Fehlgeschlagen'
    }[status] || status;
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['table',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card shadow-sm") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header bg-primary text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-file-alt me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshOverview) },
        ...{ class: ("btn btn-outline-light btn-sm") },
        disabled: ((__VLS_ctx.store.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt me-1") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.store.loading })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("text-primary") },
    });
    (__VLS_ctx.store.overview.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("text-secondary") },
    });
    (__VLS_ctx.notStartedCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("text-info") },
    });
    (__VLS_ctx.processingCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("text-success") },
    });
    (__VLS_ctx.completedCount);
    if (__VLS_ctx.store.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger alert-dismissible fade show") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle me-2") },
        });
        (__VLS_ctx.store.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.store.error)))
                        return;
                    __VLS_ctx.store.error = null;
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card shadow-sm") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body p-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-responsive") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-hover align-middle mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: ("bg-light") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: ("col"),
        ...{ class: ("px-4 py-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-file me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: ("col"),
        ...{ class: ("px-4 py-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-tags me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: ("col"),
        ...{ class: ("px-4 py-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user-secret me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: ("col"),
        ...{ class: ("px-4 py-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check-circle me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: ("col"),
        ...{ class: ("px-4 py-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-calendar me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: ("col"),
        ...{ class: ("px-4 py-3 text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-cogs me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    if (__VLS_ctx.store.overview.length === 0 && !__VLS_ctx.store.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("6"),
            ...{ class: ("text-center py-5 text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-inbox fa-3x mb-3 d-block") },
        });
    }
    if (__VLS_ctx.store.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("6"),
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
    }
    for (const [file] of __VLS_getVForSourceType((__VLS_ctx.store.overview))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: ((file.id)),
            ...{ class: ("border-bottom") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: ("px-4 py-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ((__VLS_ctx.getFileIcon(file.mediaType))) },
            ...{ class: ("me-3 text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("fw-bold") },
        });
        (file.filename);
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (file.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: ("px-4 py-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.getMediaTypeClass(file.mediaType))) },
            ...{ class: ("badge") },
        });
        (file.mediaType.toUpperCase());
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: ("px-4 py-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.getStatusClass(file.anonymizationStatus))) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ((__VLS_ctx.getStatusIcon(file.anonymizationStatus))) },
            ...{ class: ("me-1") },
        });
        (__VLS_ctx.getStatusText(file.anonymizationStatus));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: ("px-4 py-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.getStatusClass(file.annotationStatus))) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ((__VLS_ctx.getStatusIcon(file.annotationStatus))) },
            ...{ class: ("me-1") },
        });
        (__VLS_ctx.getStatusText(file.annotationStatus));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: ("px-4 py-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.formatDate(file.createdAt));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: ("px-4 py-3 text-center") },
        });
        if (file.anonymizationStatus === 'not_started') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((file.anonymizationStatus === 'not_started')))
                            return;
                        __VLS_ctx.startAnonymization(file);
                    } },
                ...{ class: ("btn btn-sm btn-primary me-2") },
                disabled: ((__VLS_ctx.store.isAnyFileProcessing)),
                'data-bs-toggle': ("tooltip"),
                title: ("Anonymisierung starten"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-play me-1") },
            });
        }
        else if (file.anonymizationStatus === 'processing') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-info me-2") },
                'data-bs-toggle': ("tooltip"),
                title: ("Anonymisierung läuft..."),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin me-1") },
            });
        }
        else if (file.anonymizationStatus === 'done' && file.annotationStatus === 'not_started') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((file.anonymizationStatus === 'not_started'))))
                            return;
                        if (!(!((file.anonymizationStatus === 'processing'))))
                            return;
                        if (!((file.anonymizationStatus === 'done' && file.annotationStatus === 'not_started')))
                            return;
                        __VLS_ctx.validateFile(file);
                    } },
                ...{ class: ("btn btn-sm btn-success me-2") },
                'data-bs-toggle': ("tooltip"),
                title: ("Validierung starten"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check me-1") },
            });
        }
        else if (file.anonymizationStatus === 'failed') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-danger me-2") },
                'data-bs-toggle': ("tooltip"),
                title: ("Anonymisierung fehlgeschlagen"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-times-circle me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-success") },
                'data-bs-toggle': ("tooltip"),
                title: ("Vollständig abgeschlossen"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check-circle me-1") },
            });
        }
    }
    if (__VLS_ctx.store.isAnyFileProcessing) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.store.processingFiles.length);
    }
    ['container-fluid', 'py-4', 'row', 'mb-4', 'col-12', 'card', 'shadow-sm', 'card-header', 'bg-primary', 'text-white', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-file-alt', 'me-2', 'btn', 'btn-outline-light', 'btn-sm', 'fas', 'fa-sync-alt', 'me-1', 'fa-spin', 'row', 'mb-4', 'col-md-3', 'card', 'text-center', 'card-body', 'card-title', 'text-muted', 'text-primary', 'col-md-3', 'card', 'text-center', 'card-body', 'card-title', 'text-muted', 'text-secondary', 'col-md-3', 'card', 'text-center', 'card-body', 'card-title', 'text-muted', 'text-info', 'col-md-3', 'card', 'text-center', 'card-body', 'card-title', 'text-muted', 'text-success', 'row', 'mb-4', 'col-12', 'alert', 'alert-danger', 'alert-dismissible', 'fade', 'show', 'fas', 'fa-exclamation-triangle', 'me-2', 'btn-close', 'row', 'col-12', 'card', 'shadow-sm', 'card-header', 'mb-0', 'card-body', 'p-0', 'table-responsive', 'table', 'table-hover', 'align-middle', 'mb-0', 'bg-light', 'px-4', 'py-3', 'fas', 'fa-file', 'me-2', 'px-4', 'py-3', 'fas', 'fa-tags', 'me-2', 'px-4', 'py-3', 'fas', 'fa-user-secret', 'me-2', 'px-4', 'py-3', 'fas', 'fa-check-circle', 'me-2', 'px-4', 'py-3', 'fas', 'fa-calendar', 'me-2', 'px-4', 'py-3', 'text-center', 'fas', 'fa-cogs', 'me-2', 'text-center', 'py-5', 'text-muted', 'fas', 'fa-inbox', 'fa-3x', 'mb-3', 'd-block', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'border-bottom', 'px-4', 'py-3', 'd-flex', 'align-items-center', 'me-3', 'text-muted', 'fw-bold', 'text-muted', 'px-4', 'py-3', 'badge', 'px-4', 'py-3', 'me-1', 'px-4', 'py-3', 'me-1', 'px-4', 'py-3', 'text-muted', 'px-4', 'py-3', 'text-center', 'btn', 'btn-sm', 'btn-primary', 'me-2', 'fas', 'fa-play', 'me-1', 'text-info', 'me-2', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'btn', 'btn-sm', 'btn-success', 'me-2', 'fas', 'fa-check', 'me-1', 'text-danger', 'me-2', 'fas', 'fa-times-circle', 'me-1', 'text-success', 'fas', 'fa-check-circle', 'me-1', 'row', 'mt-4', 'col-12', 'alert', 'alert-info', 'fas', 'fa-info-circle', 'me-2',];
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
            store: store,
            notStartedCount: notStartedCount,
            processingCount: processingCount,
            completedCount: completedCount,
            refreshOverview: refreshOverview,
            startAnonymization: startAnonymization,
            validateFile: validateFile,
            getFileIcon: getFileIcon,
            getMediaTypeClass: getMediaTypeClass,
            getStatusClass: getStatusClass,
            getStatusIcon: getStatusIcon,
            getStatusText: getStatusText,
            formatDate: formatDate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
