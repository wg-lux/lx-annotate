import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { useAnnotationStore } from '@/stores/annotationStore';
// Composables
const router = useRouter();
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const annotationStore = useAnnotationStore();
// Local state
const isRefreshing = ref(false);
const processingFiles = ref(new Set());
// Computed
const availableFiles = computed(() => anonymizationStore.overview.filter(file => hasOriginalFile(file)));
const filteredOutCount = computed(() => anonymizationStore.overview.length - availableFiles.value.length);
const hasProcessingFiles = computed(() => availableFiles.value.some(file => file.anonymizationStatus === 'processing_anonymization' || file.anonymizationStatus === 'extracting_frames'));
// Methods
const refreshOverview = async () => {
    isRefreshing.value = true;
    try {
        await anonymizationStore.fetchOverview();
    }
    finally {
        isRefreshing.value = false;
    }
};
const startAnonymization = async (fileId) => {
    processingFiles.value.add(fileId);
    try {
        const success = await anonymizationStore.startAnonymization(fileId);
        if (success) {
            // Refresh overview to get updated status
            await refreshOverview();
            // No redirect needed - user is already on the correct page
            console.log('Anonymization started successfully for file', fileId);
        }
        else {
            console.warn('startAnonymization failed - staying on current page');
        }
    }
    finally {
        processingFiles.value.delete(fileId);
    }
};
const correctVideo = async (fileId) => {
    // Navigate directly to the correction component with the video ID
    router.push(`/anonymisierung/korrektur/${fileId}`);
};
const validateFile = async (fileId) => {
    processingFiles.value.add(fileId);
    try {
        const result = await anonymizationStore.setCurrentForValidation(fileId);
        if (result) {
            /* jump to the validation page that has an actual vue-route */
            router.push('/anonymisierung/validierung');
        }
        else {
            console.warn('setCurrentForValidation returned null - navigation aborted');
        }
    }
    finally {
        processingFiles.value.delete(fileId);
    }
};
const reimportVideo = async (fileId) => {
    processingFiles.value.add(fileId);
    try {
        const success = await anonymizationStore.reimportVideo(fileId);
        if (success) {
            // Refresh overview to get updated status
            await refreshOverview();
            console.log('Video re-imported successfully:', fileId);
        }
        else {
            console.warn('Re-import failed - staying on current page');
        }
    }
    finally {
        processingFiles.value.delete(fileId);
    }
};
const isProcessing = (fileId) => {
    return processingFiles.value.has(fileId);
};
const needsReimport = (file) => {
    return file.mediaType === 'video' && !file.metadataImported;
};
const getFileIcon = (mediaType) => {
    return mediaType === 'video' ? 'fas fa-video text-primary' : 'fas fa-file-pdf text-danger';
};
const getMediaTypeBadgeClass = (mediaType) => {
    return mediaType === 'video' ? 'bg-primary' : 'bg-danger';
};
const getStatusBadgeClass = (status) => {
    const classes = {
        'not_started': 'bg-secondary',
        'processing': 'bg-warning',
        'done': 'bg-success',
        'failed': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
};
const getStatusText = (status) => {
    const texts = {
        'not_started': 'Nicht gestartet',
        'processing': 'In Bearbeitung',
        'done': 'Fertig',
        'failed': 'Fehlgeschlagen'
    };
    return texts[status] || status;
};
const formatDate = (dateString) => {
    if (!dateString)
        return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
const getTotalByStatus = (status) => {
    return availableFiles.value.filter(file => file.anonymizationStatus === status).length;
};
const validateSegmentsFile = async (fileId) => {
    processingFiles.value.add(fileId);
    try {
        const success = await annotationStore.validateSegmentsAndExaminations(fileId);
        if (success) {
            // Refresh overview to get updated status
            await refreshOverview();
            console.log('Segments validated successfully for file', fileId);
        }
        else {
            console.warn('validateSegmentsFile failed - staying on current page');
        }
    }
    finally {
        processingFiles.value.delete(fileId);
    }
};
const hasOriginalFile = (file) => {
    // Check if the file has the necessary properties to indicate original file exists
    if (file.mediaType === 'video') {
        // For videos, check if rawFile exists and has a valid path
        return !!(file.rawFile && file.rawFile.trim() !== '');
    }
    else if (file.mediaType === 'pdf') {
        // For PDFs, check if original_file exists and has a valid path
        return !!(file.rawFile && file.rawFile.trim() !== '');
    }
    // If we can't determine the media type, assume it's available
    return true;
};
// Lifecycle
onMounted(async () => {
    await anonymizationStore.fetchOverview();
    // Start polling if there are processing files
    if (hasProcessingFiles.value) {
        availableFiles.value
            .filter(file => file.anonymizationStatus === 'processing_anonymization')
            .forEach(file => anonymizationStore.startPolling(file.id));
    }
});
onUnmounted(() => {
    // Clean up polling when component is unmounted
    anonymizationStore.stopAllPolling();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['table', 'btn-group-sm', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0 d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshOverview) },
        ...{ class: ("btn btn-outline-primary btn-sm") },
        disabled: ((__VLS_ctx.isRefreshing)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.isRefreshing })) },
    });
    const __VLS_0 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: ("/anonymisierung/validierung"),
        ...{ class: ("btn btn-primary btn-sm") },
    }));
    const __VLS_2 = __VLS_1({
        to: ("/anonymisierung/validierung"),
        ...{ class: ("btn btn-primary btn-sm") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-play me-1") },
    });
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.anonymizationStore.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.anonymizationStore.error);
    }
    if (__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
    }
    else if (!__VLS_ctx.availableFiles.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-folder-open fa-3x text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted mb-4") },
        });
        const __VLS_6 = {}.RouterLink;
        /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
            to: ("/upload"),
            ...{ class: ("btn btn-primary") },
        }));
        const __VLS_8 = __VLS_7({
            to: ("/upload"),
            ...{ class: ("btn btn-primary") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-upload me-2") },
        });
        __VLS_11.slots.default;
        var __VLS_11;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("table-responsive") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: ("table table-hover") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: ("table-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [file] of __VLS_getVForSourceType((__VLS_ctx.availableFiles))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((file.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((__VLS_ctx.getFileIcon(file.mediaType))) },
                ...{ class: ("me-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("fw-medium") },
            });
            (file.filename);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((__VLS_ctx.getMediaTypeBadgeClass(file.mediaType))) },
                ...{ class: ("badge") },
            });
            (file.mediaType.toUpperCase());
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((__VLS_ctx.getStatusBadgeClass(file.anonymizationStatus))) },
                ...{ class: ("badge") },
            });
            if (file.anonymizationStatus === 'processing_anonymization') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-spinner fa-spin me-1") },
                });
            }
            (__VLS_ctx.getStatusText(file.anonymizationStatus));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((__VLS_ctx.getStatusBadgeClass(file.annotationStatus))) },
                ...{ class: ("badge") },
            });
            (__VLS_ctx.getStatusText(file.annotationStatus));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatDate(file.createdAt));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
                role: ("group"),
            });
            if (file.mediaType === 'video' && __VLS_ctx.needsReimport(file)) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!((__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))))
                                return;
                            if (!(!((!__VLS_ctx.availableFiles.length))))
                                return;
                            if (!((file.mediaType === 'video' && __VLS_ctx.needsReimport(file))))
                                return;
                            __VLS_ctx.reimportVideo(file.id);
                        } },
                    ...{ class: ("btn btn-outline-info") },
                    disabled: ((__VLS_ctx.isProcessing(file.id))),
                    title: ("Video erneut importieren und Metadaten aktualisieren"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-redo-alt") },
                });
            }
            if (file.anonymizationStatus === 'not_started') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!((__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))))
                                return;
                            if (!(!((!__VLS_ctx.availableFiles.length))))
                                return;
                            if (!((file.anonymizationStatus === 'not_started')))
                                return;
                            __VLS_ctx.startAnonymization(file.id);
                        } },
                    ...{ class: ("btn btn-outline-primary") },
                    disabled: ((__VLS_ctx.isProcessing(file.id))),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-play") },
                });
            }
            if (file.anonymizationStatus === 'failed') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!((__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))))
                                return;
                            if (!(!((!__VLS_ctx.availableFiles.length))))
                                return;
                            if (!((file.anonymizationStatus === 'failed')))
                                return;
                            __VLS_ctx.startAnonymization(file.id);
                        } },
                    ...{ class: ("btn btn-outline-warning") },
                    disabled: ((__VLS_ctx.isProcessing(file.id))),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-redo") },
                });
            }
            if (file.anonymizationStatus === 'done') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!((__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))))
                                return;
                            if (!(!((!__VLS_ctx.availableFiles.length))))
                                return;
                            if (!((file.anonymizationStatus === 'done')))
                                return;
                            __VLS_ctx.validateFile(file.id);
                        } },
                    ...{ class: ("btn btn-outline-success") },
                    disabled: ((__VLS_ctx.isProcessing(file.id))),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-eye") },
                });
            }
            if (file.mediaType === 'video' && (file.anonymizationStatus === 'done' || file.anonymizationStatus === 'validated')) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!((__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))))
                                return;
                            if (!(!((!__VLS_ctx.availableFiles.length))))
                                return;
                            if (!((file.mediaType === 'video' && (file.anonymizationStatus === 'done' || file.anonymizationStatus === 'validated'))))
                                return;
                            __VLS_ctx.correctVideo(file.id);
                        } },
                    ...{ class: ("btn btn-outline-warning") },
                    disabled: ((__VLS_ctx.isProcessing(file.id))),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-edit") },
                });
            }
            if (file.anonymizationStatus === 'processing_anonymization') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ class: ("btn btn-outline-info") },
                    disabled: (true),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-spinner fa-spin me-1") },
                });
            }
            if (file.anonymizationStatus === 'extracting_frames') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ class: ("btn btn-outline-info") },
                    disabled: (true),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-spinner fa-spin me-1") },
                });
            }
        }
    }
    if (__VLS_ctx.availableFiles.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-secondary fs-6") },
        });
        (__VLS_ctx.getTotalByStatus('not_started'));
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-warning fs-6") },
        });
        (__VLS_ctx.getTotalByStatus('processing'));
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-success fs-6") },
        });
        (__VLS_ctx.getTotalByStatus('done'));
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-danger fs-6") },
        });
        (__VLS_ctx.getTotalByStatus('failed'));
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
    }
    if (__VLS_ctx.filteredOutCount > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-warning mt-3") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.filteredOutCount);
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'd-flex', 'gap-2', 'btn', 'btn-outline-primary', 'btn-sm', 'fas', 'fa-sync-alt', 'fa-spin', 'btn', 'btn-primary', 'btn-sm', 'fas', 'fa-play', 'me-1', 'card-body', 'alert', 'alert-danger', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'text-center', 'py-5', 'mb-4', 'fas', 'fa-folder-open', 'fa-3x', 'text-muted', 'text-muted', 'text-muted', 'mb-4', 'btn', 'btn-primary', 'fas', 'fa-upload', 'me-2', 'table-responsive', 'table', 'table-hover', 'table-light', 'd-flex', 'align-items-center', 'me-2', 'fw-medium', 'badge', 'badge', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'badge', 'text-muted', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-info', 'fas', 'fa-redo-alt', 'btn', 'btn-outline-primary', 'fas', 'fa-play', 'btn', 'btn-outline-warning', 'fas', 'fa-redo', 'btn', 'btn-outline-success', 'fas', 'fa-eye', 'btn', 'btn-outline-warning', 'fas', 'fa-edit', 'btn', 'btn-outline-info', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'btn', 'btn-outline-info', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'row', 'mt-4', 'col-md-12', 'card', 'bg-light', 'card-body', 'card-title', 'row', 'text-center', 'col-md-3', 'mb-2', 'badge', 'bg-secondary', 'fs-6', 'text-muted', 'col-md-3', 'mb-2', 'badge', 'bg-warning', 'fs-6', 'text-muted', 'col-md-3', 'mb-2', 'badge', 'bg-success', 'fs-6', 'text-muted', 'col-md-3', 'mb-2', 'badge', 'bg-danger', 'fs-6', 'text-muted', 'alert', 'alert-warning', 'mt-3', 'fas', 'fa-exclamation-triangle', 'me-2',];
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
            anonymizationStore: anonymizationStore,
            isRefreshing: isRefreshing,
            availableFiles: availableFiles,
            filteredOutCount: filteredOutCount,
            refreshOverview: refreshOverview,
            startAnonymization: startAnonymization,
            correctVideo: correctVideo,
            validateFile: validateFile,
            reimportVideo: reimportVideo,
            isProcessing: isProcessing,
            needsReimport: needsReimport,
            getFileIcon: getFileIcon,
            getMediaTypeBadgeClass: getMediaTypeBadgeClass,
            getStatusBadgeClass: getStatusBadgeClass,
            getStatusText: getStatusText,
            formatDate: formatDate,
            getTotalByStatus: getTotalByStatus,
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
