import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import { usePollingProtection } from '@/composables/usePollingProtection';
import { useMediaManagement } from '@/api/mediaManagement';
import {} from '../../stores/mediaTypeStore';
// Composables
const router = useRouter();
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const annotationStore = useAnnotationStore();
const mediaStore = useMediaTypeStore();
const pollingProtection = usePollingProtection();
const mediaManagement = useMediaManagement();
// Local state
const isRefreshing = ref(false);
const processingFiles = ref(new Set());
// Computed properties
const availableFiles = computed(() => anonymizationStore.overview);
const filteredOutCount = computed(() => anonymizationStore.overview.length - availableFiles.value.length);
// Methods
const refreshOverview = async () => {
    isRefreshing.value = true;
    try {
        await anonymizationStore.fetchOverview();
        mediaStore.seedTypesFromOverview(anonymizationStore.overview);
    }
    finally {
        isRefreshing.value = false;
    }
};
const startAnonymization = async (fileId) => {
    // Find the file to determine media type
    const file = availableFiles.value.find(f => f.id === fileId);
    if (!file) {
        console.warn('File not found for anonymization:', fileId);
        return;
    }
    const mediaType = file.mediaType === 'video' ? 'video' : 'pdf';
    // Use polling protection for start anonymization
    const result = await pollingProtection.startAnonymizationSafeWithProtection(fileId, mediaType);
    if (result?.success) {
        // Refresh overview to get updated status
        await refreshOverview();
        console.log('Anonymization started successfully for file', fileId);
    }
    else {
        console.warn('startAnonymization failed - staying on current page');
    }
};
const correctVideo = async (fileId) => {
    // Find the file to set it in MediaStore for consistency
    const file = availableFiles.value.find(f => f.id === fileId);
    if (file) {
        mediaStore.setCurrentItem(file);
    }
    else {
        console.warn('File not found for correction:', fileId);
        return;
    }
    // Navigate directly to the correction component with the video ID
    router.push({ name: 'Anonymisierung Korrektur', params: { fileId, mediaType: file.mediaType } });
};
const isReadyForValidation = (fileId) => {
    // Check if the file is ready for validation
    const file = availableFiles.value.find(f => f.id === fileId);
    if (!file)
        return false;
    // Only allow validation if anonymization is done
    return file.anonymizationStatus === 'done' || file.anonymizationStatus === 'validated';
};
const isValidated = (fileId) => {
    // Check if the file is validated
    const file = availableFiles.value.find(f => f.id === fileId);
    if (!file)
        return false;
    // Only allow validation if anonymization is done
    return file.anonymizationStatus === 'validated';
};
const validateFile = async (fileId) => {
    // Find the file to determine media type
    processingFiles.value.add(fileId);
    if (!fileId) {
        console.warn('File not found for validation:', fileId);
        return;
    }
    try {
        // Set the file in MediaStore for consistency
        const result = await anonymizationStore.setCurrentForValidation(fileId);
        if (result) {
            const file = availableFiles.value.find(f => f.id === fileId);
            if (!file) {
                console.warn('File not found for validation:', fileId);
                return;
            }
            else {
                mediaStore.setCurrentItem(file);
                const kind = file.mediaType;
                // file id mapping
                try {
                    mediaStore.rememberType(fileId, kind, kind);
                }
                catch (e) {
                    console.error('Error remembering media type for file:', fileId, e);
                }
                // meta id mapping
                if (file.sensitiveMetaId) {
                    mediaStore.rememberType(file.sensitiveMetaId, kind, 'meta');
                }
                // persist for navigation fallback
                sessionStorage.setItem('last:fileId', String(fileId));
                sessionStorage.setItem('last:scope', kind);
            }
            console.log('File set for validation:', fileId, 'file media type:', file.mediaType);
            // Simply navigate to validation page without changing status
            // The status should only change when user actually completes validation
            router.push({ name: 'AnonymisierungValidierung', params: { fileId, mediaType: file.mediaType } });
        }
    }
    catch (error) {
        console.error('Navigation to validation failed:', error);
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
const reimportPdf = async (fileId) => {
    processingFiles.value.add(fileId);
    try {
        // Use the dedicated PDF reimport endpoint from the anonymization store
        const success = await anonymizationStore.reimportPdf(fileId);
        if (success) {
            // Refresh overview to get updated status
            await refreshOverview();
            console.log('PDF re-imported successfully:', fileId);
        }
        else {
            console.warn('PDF re-import failed - staying on current page');
        }
    }
    catch (error) {
        console.error('PDF re-import failed:', error);
    }
    finally {
        processingFiles.value.delete(fileId);
    }
};
const deleteFile = async (fileId) => {
    // Find the file for confirmation
    const file = availableFiles.value.find(f => f.id === fileId);
    if (!file) {
        console.warn('File not found for deletion:', fileId);
        return;
    }
    // Ask for confirmation
    const confirmed = confirm(`Sind Sie sicher, dass Sie die Datei "${file.filename}" permanent löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`);
    if (!confirmed) {
        return;
    }
    processingFiles.value.add(fileId);
    try {
        // Use the media management API to delete the file
        const result = await mediaManagement.deleteMediaFile(fileId);
        if (result) {
            // Refresh overview to remove the deleted file from the list
            await refreshOverview();
            console.log('File deleted successfully:', fileId);
        }
        else {
            console.warn('File deletion failed');
        }
    }
    catch (error) {
        console.error('File deletion failed:', error);
    }
    finally {
        processingFiles.value.delete(fileId);
    }
};
const isProcessing = (fileId) => {
    // Find the file to determine media type
    const file = availableFiles.value.find(f => f.id === fileId);
    if (!file)
        return false;
    const mediaType = mediaStore.detectMediaType(file);
    // Check both local processing and polling protection
    // Handle unknown media type by falling back to local processing check only
    if (mediaType === 'unknown') {
        return processingFiles.value.has(fileId);
    }
    return processingFiles.value.has(fileId) ||
        !pollingProtection.canProcessMedia.value(fileId, mediaType);
};
const needsReimport = (file) => {
    // Video files need re-import if metadata is missing
    if (file.mediaType === 'video') {
        return !file.metadataImported;
    }
    // PDF files might need re-import if anonymization failed or no text extracted
    if (file.mediaType === 'pdf') {
        return file.anonymizationStatus === 'failed' || file.anonymizationStatus === 'not_started';
    }
    return false;
};
const getFileIcon = (mediaType) => {
    return mediaStore.getMediaTypeIcon(mediaType);
};
const getMediaTypeBadgeClass = (mediaType) => {
    return mediaStore.getMediaTypeBadgeClass(mediaType);
};
const getStatusBadgeClass = (status) => {
    const classes = {
        'not_started': 'bg-secondary',
        'processing_anonymization': 'bg-warning',
        'extracting_frames': 'bg-info',
        'predicting_segments': 'bg-info',
        'done': 'bg-success',
        'validated': 'bg-success',
        'failed': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
};
const getStatusText = (status) => {
    const texts = {
        'not_started': 'Nicht gestartet',
        'processing_anonymization': 'Anonymisierung läuft',
        'extracting_frames': 'Frames extrahieren',
        'predicting_segments': 'Segmente vorhersagen',
        'done': 'Fertig',
        'validated': 'Validiert',
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
    const statusMap = {
        'not_started': ['not_started'],
        'processing': ['processing_anonymization', 'extracting_frames', 'predicting_segments'],
        'done': ['done', 'validated'],
        'failed': ['failed']
    };
    const relevantStatuses = statusMap[status] || [status];
    return availableFiles.value.filter(file => relevantStatuses.includes(file.anonymizationStatus)).length;
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
        return videoStore.hasRawVideoFile?.valueOf() ?? false;
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
    // Fetch overview data
    await anonymizationStore.fetchOverview();
    mediaStore.seedTypesFromOverview(anonymizationStore.overview);
    console.table(anonymizationStore.overview.map(f => ({
        id: f.id,
        fromOverview: f.mediaType,
        remembered: mediaStore.getType(f.id) // scans both pdf/video scopes
    })));
    // ✅ FIX: Only start polling for files that are actively processing
    // Don't poll files with final states: 'done', 'validated', 'failed', 'not_started'
    const processingStatuses = ['processing_anonymization', 'extracting_frames', 'predicting_segments'];
    anonymizationStore.overview.forEach((file) => {
        if (processingStatuses.includes(file.anonymizationStatus)) {
            console.log(`Starting polling for processing file ${file.id} (status: ${file.anonymizationStatus})`);
            anonymizationStore.startPolling(file.id);
        }
        else {
            console.log(`Skipping polling for file ${file.id} (status: ${file.anonymizationStatus})`);
        }
    });
});
onUnmounted(() => {
    // Clean up all polling when component is unmounted
    anonymizationStore.stopAllPolling();
    // Clear any remaining processing locks
    pollingProtection.clearAllLocalLocks();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0 d-flex justify-content-between align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshOverview) },
    ...{ class: "btn btn-outline-primary btn-sm" },
    disabled: (__VLS_ctx.isRefreshing),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-sync-alt" },
    ...{ class: ({ 'fa-spin': __VLS_ctx.isRefreshing }) },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/anonymisierung/validierung",
    ...{ class: "btn btn-primary btn-sm" },
}));
const __VLS_2 = __VLS_1({
    to: "/anonymisierung/validierung",
    ...{ class: "btn btn-primary btn-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-play me-1" },
});
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.anonymizationStore.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.anonymizationStore.error);
}
if (__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5" },
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
else if (!__VLS_ctx.availableFiles.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-folder-open fa-3x text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted mb-4" },
    });
    const __VLS_4 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        to: "/upload",
        ...{ class: "btn btn-primary" },
    }));
    const __VLS_6 = __VLS_5({
        to: "/upload",
        ...{ class: "btn btn-primary" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-upload me-2" },
    });
    var __VLS_7;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-hover" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: "table-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [file] of __VLS_getVForSourceType((__VLS_ctx.availableFiles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (file.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: (__VLS_ctx.getFileIcon(file.mediaType)) },
            ...{ class: "me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "fw-medium" },
        });
        (file.filename);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getMediaTypeBadgeClass(file.mediaType)) },
            ...{ class: "badge" },
        });
        (file.mediaType.toUpperCase());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getStatusBadgeClass(file.anonymizationStatus)) },
            ...{ class: "badge" },
        });
        if (file.anonymizationStatus === 'processing_anonymization') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-spinner fa-spin me-1" },
            });
        }
        (__VLS_ctx.getStatusText(file.anonymizationStatus));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getStatusBadgeClass(file.annotationStatus)) },
            ...{ class: "badge" },
        });
        (__VLS_ctx.getStatusText(file.annotationStatus));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (__VLS_ctx.hasOriginalFile(file)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-success" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-check-circle me-1" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-danger" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-times-circle me-1" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.formatDate(file.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "btn-group btn-group-sm" },
            role: "group",
        });
        if (file.mediaType === 'video' && __VLS_ctx.needsReimport(file)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                            return;
                        if (!!(!__VLS_ctx.availableFiles.length))
                            return;
                        if (!(file.mediaType === 'video' && __VLS_ctx.needsReimport(file)))
                            return;
                        __VLS_ctx.reimportVideo(file.id);
                    } },
                ...{ class: "btn btn-outline-info" },
                disabled: (__VLS_ctx.isProcessing(file.id)),
                title: "Video erneut importieren und Metadaten aktualisieren",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-redo-alt" },
            });
        }
        if (file.mediaType === 'pdf' && __VLS_ctx.needsReimport(file)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                            return;
                        if (!!(!__VLS_ctx.availableFiles.length))
                            return;
                        if (!(file.mediaType === 'pdf' && __VLS_ctx.needsReimport(file)))
                            return;
                        __VLS_ctx.reimportPdf(file.id);
                    } },
                ...{ class: "btn btn-outline-info" },
                disabled: (__VLS_ctx.isProcessing(file.id)),
                title: "PDF erneut importieren und verarbeiten",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-redo-alt" },
            });
        }
        if (file.anonymizationStatus === 'not_started') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                            return;
                        if (!!(!__VLS_ctx.availableFiles.length))
                            return;
                        if (!(file.anonymizationStatus === 'not_started'))
                            return;
                        __VLS_ctx.startAnonymization(file.id);
                    } },
                ...{ class: "btn btn-outline-primary" },
                disabled: (__VLS_ctx.isProcessing(file.id)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-play" },
            });
        }
        if (file.anonymizationStatus === 'failed') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                            return;
                        if (!!(!__VLS_ctx.availableFiles.length))
                            return;
                        if (!(file.anonymizationStatus === 'failed'))
                            return;
                        __VLS_ctx.startAnonymization(file.id);
                    } },
                ...{ class: "btn btn-outline-warning" },
                disabled: (__VLS_ctx.isProcessing(file.id)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-redo" },
            });
        }
        if (file.anonymizationStatus === 'done') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                            return;
                        if (!!(!__VLS_ctx.availableFiles.length))
                            return;
                        if (!(file.anonymizationStatus === 'done'))
                            return;
                        __VLS_ctx.validateFile(file.id);
                    } },
                ...{ class: "btn btn-outline-success bg-success" },
                disabled: (!__VLS_ctx.isReadyForValidation(file.id)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-eye" },
            });
        }
        if (file.mediaType === 'video' && (file.anonymizationStatus === 'done' || file.anonymizationStatus === 'validated')) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                            return;
                        if (!!(!__VLS_ctx.availableFiles.length))
                            return;
                        if (!(file.mediaType === 'video' && (file.anonymizationStatus === 'done' || file.anonymizationStatus === 'validated')))
                            return;
                        __VLS_ctx.correctVideo(file.id);
                    } },
                ...{ class: "btn btn-outline-warning" },
                disabled: (__VLS_ctx.isProcessing(file.id)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-edit" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.anonymizationStore.loading && !__VLS_ctx.availableFiles.length))
                        return;
                    if (!!(!__VLS_ctx.availableFiles.length))
                        return;
                    __VLS_ctx.deleteFile(file.id);
                } },
            ...{ class: "btn btn-outline-danger" },
            disabled: (__VLS_ctx.isProcessing(file.id)),
            title: "Datei permanent löschen",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-trash" },
        });
        if (file.anonymizationStatus === 'processing_anonymization') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: "btn btn-outline-info" },
                disabled: true,
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-spinner fa-spin me-1" },
            });
        }
        if (file.anonymizationStatus === 'extracting_frames') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: "btn btn-outline-info" },
                disabled: true,
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-spinner fa-spin me-1" },
            });
        }
    }
}
if (__VLS_ctx.availableFiles.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row mt-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card bg-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "card-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-secondary fs-6" },
    });
    (__VLS_ctx.getTotalByStatus('not_started'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-warning fs-6" },
    });
    (__VLS_ctx.getTotalByStatus('processing'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-warning fs-6" },
    });
    (__VLS_ctx.getTotalByStatus('started'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-success fs-6" },
    });
    (__VLS_ctx.getTotalByStatus('done'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-danger fs-6" },
    });
    (__VLS_ctx.getTotalByStatus('failed'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
}
if (__VLS_ctx.filteredOutCount > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning mt-3" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-exclamation-triangle me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.filteredOutCount);
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-play']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-folder-open']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-upload']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['table-light']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-times-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-redo-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-redo-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-play']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-redo']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-eye']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
var __VLS_dollars;
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
            isReadyForValidation: isReadyForValidation,
            validateFile: validateFile,
            reimportVideo: reimportVideo,
            reimportPdf: reimportPdf,
            deleteFile: deleteFile,
            isProcessing: isProcessing,
            needsReimport: needsReimport,
            getFileIcon: getFileIcon,
            getMediaTypeBadgeClass: getMediaTypeBadgeClass,
            getStatusBadgeClass: getStatusBadgeClass,
            getStatusText: getStatusText,
            formatDate: formatDate,
            getTotalByStatus: getTotalByStatus,
            hasOriginalFile: hasOriginalFile,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
