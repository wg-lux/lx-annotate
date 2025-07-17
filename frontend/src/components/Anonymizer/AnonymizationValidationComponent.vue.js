import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
// @ts-ignore
// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const patientStore = usePatientStore();
// Polling state
const pollingInterval = ref(null);
const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const editedPatient = ref({
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
    patientDob: '',
    casenumber: ''
});
// Upload-related state
const originalUrl = ref('');
const processedUrl = ref('');
const showOriginal = ref(false);
const hasSuccessfulUpload = ref(false);
// Dirty tracking
const dirty = ref(false);
// Computed
const currentItem = computed(() => anonymizationStore.current);
const isExaminationDateValid = computed(() => {
    if (!examinationDate.value || !editedPatient.value.patientDob) {
        return true;
    }
    return new Date(examinationDate.value) >= new Date(editedPatient.value.patientDob);
});
const canSubmit = computed(() => {
    return processedUrl.value && originalUrl.value && isExaminationDateValid.value;
});
// Watch
watch(currentItem, (newItem) => {
    if (newItem) {
        loadCurrentItemData(newItem);
    }
}, { immediate: true });
watch(editedAnonymizedText, () => {
    dirty.value = true;
});
watch(examinationDate, () => {
    dirty.value = true;
});
watch(editedPatient, () => {
    dirty.value = true;
}, { deep: true });
const fetchNextItem = async () => {
    try {
        await anonymizationStore.fetchNext();
    }
    catch (error) {
        console.error('Error fetching next item:', error);
    }
};
const loadCurrentItemData = (item) => {
    if (!item)
        return;
    editedAnonymizedText.value = item.anonymizedText || '';
    examinationDate.value = item.reportMeta?.examinationDate || '';
    if (item.reportMeta) {
        editedPatient.value.patientFirstName = item.reportMeta.patientFirstName || '';
        editedPatient.value.patientLastName = item.reportMeta.patientLastName || '';
        editedPatient.value.patientGender = item.reportMeta.patientGender || '';
        editedPatient.value.patientDob = item.reportMeta.patientDob || '';
        editedPatient.value.casenumber = item.reportMeta.casenumber || '';
    }
    dirty.value = false;
};
const toggleImage = () => {
    showOriginal.value = !showOriginal.value;
};
const skipItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
        dirty.value = false;
    }
};
function isVideoFile(item) {
    if (item.reportMeta?.file && !item.reportMeta?.pdfUrl) {
        return true; // It's a video file if it has a file but no PDF URL
    }
    return false; // Otherwise, it's not a video file
}
const approveItem = async () => {
    if (!currentItem.value || !isExaminationDateValid.value)
        return;
    try {
        const updatedData = {
            id: currentItem.value.id,
            anonymizedText: editedAnonymizedText.value,
            reportMeta: {
                ...(currentItem.value.reportMeta || {}),
                ...editedPatient.value,
                examinationDate: examinationDate.value,
                id: currentItem.value.reportMeta?.id || 0
            }
        };
        // Determine media type and use appropriate endpoint
        const isVideo = currentItem.value.reportMeta?.file && !currentItem.value.reportMeta?.pdfUrl;
        if (isVideo) {
            // For videos, add validation acceptance flag and trigger raw file deletion
            await videoStore.loadVideo(currentItem.value.id.toString());
            const videoUpdateData = {
                sensitive_meta_id: currentItem.value.reportMeta?.id,
                is_verified: true,
                delete_raw_files: true,
                ...editedPatient.value,
                examination_date: examinationDate.value
            };
            await anonymizationStore.patchVideo(videoUpdateData);
        }
        else {
            // For PDFs, add validation acceptance flag and trigger raw file deletion
            const pdfUpdateData = {
                sensitive_meta_id: currentItem.value.reportMeta?.id,
                is_verified: true,
                delete_raw_files: true,
                ...editedPatient.value,
                examination_date: examinationDate.value,
                anonymized_text: editedAnonymizedText.value
            };
            await anonymizationStore.patchPdf(pdfUpdateData);
        }
        await fetchNextItem();
        dirty.value = false;
    }
    catch (error) {
        console.error('Error approving item:', error);
    }
};
const saveAnnotation = async () => {
    if (!canSubmit.value)
        return;
    try {
        const annotationData = {
            processed_image_url: processedUrl.value,
            patient_data: editedPatient.value,
            examinationDate: examinationDate.value,
            anonymized_text: editedAnonymizedText.value
        };
        if (currentItem.value && isVideoFile(currentItem.value)) {
            await axiosInstance.post(r('save-anonymization-annotation-video/'), {
                ...annotationData,
                itemId: currentItem.value.id
            });
        }
        else if (currentItem.value && currentItem.value.reportMeta?.pdfUrl) {
            await axiosInstance.post(r('save-anonymization-annotation-pdf/'), annotationData);
        }
        else {
            console.warn('No valid item to save annotation for');
            return;
        }
        // Reset upload state
        originalUrl.value = '';
        processedUrl.value = '';
        hasSuccessfulUpload.value = false;
        console.log('Annotation saved successfully');
    }
    catch (error) {
        console.error('Error saving annotation:', error);
    }
};
const rejectItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
        dirty.value = false;
    }
};
// Video streaming methods
const getVideoStreamUrl = () => {
    if (!currentItem.value ||
        !currentItem.value.reportMeta ||
        currentItem.value.reportMeta.pdfUrl) {
        return null;
    }
    return videoStore.videoStreamUrl;
};
// PDF streaming methods - mirroring video streaming functionality
const getPdfStreamUrl = () => {
    if (!currentItem.value?.id)
        return null;
    // Use the PDF stream endpoint with HTTP range support
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/pdfstream/${currentItem.value.id}/`;
};
const debugGetVideoStreamUrl = () => {
    // Debug version that shows the URL construction process
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const itemId = currentItem.value?.id;
    const url = itemId ? `${baseUrl}/api/media/videos/${itemId}/` : 'No item ID available';
    return url;
};
const debugGetPdfStreamUrl = () => {
    // Debug version for PDF stream URL construction
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const itemId = currentItem.value?.id;
    const url = itemId ? `${baseUrl}/api/pdfstream/${itemId}/` : 'No item ID available';
    return url;
};
// Video event handlers
const onVideoError = (event) => {
    console.error('Video loading error:', event);
    const video = event.target;
    console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc
    });
};
const onVideoLoadStart = () => {
    console.log('Video loading started for:', getVideoStreamUrl());
};
const onVideoCanPlay = () => {
    console.log('Video can play, loaded successfully');
};
// Polling function
const startPolling = () => {
    if (pollingInterval.value !== null)
        return; // Already polling
    pollingInterval.value = window.setInterval(async () => {
        try {
            await anonymizationStore.fetchNext();
            console.log('Polling: Fetched next item');
        }
        catch (error) {
            console.error('Error during polling:', error);
        }
    }, POLLING_INTERVAL_MS);
};
const stopPolling = () => {
    if (pollingInterval.value === null)
        return; // Not currently polling
    clearInterval(pollingInterval.value);
    pollingInterval.value = null;
};
// Lifecycle
onMounted(async () => {
    if (!anonymizationStore.current) { // only pull the “next” item if nothing is pre-loaded
        await fetchNextItem();
    }
    startPolling();
});
onUnmounted(() => {
    stopPolling();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['pdf-viewer-container', 'media-viewer-container', 'media-viewer-container',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.anonymizationStore.loading) {
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
    else if (__VLS_ctx.anonymizationStore.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.anonymizationStore.error);
    }
    else if (!__VLS_ctx.currentItem) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info") },
            role: ("alert"),
        });
    }
    if (__VLS_ctx.anonymizationStore.isAnyFileProcessing) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-warning mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.anonymizationStore.processingFiles.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-2") },
        });
        const __VLS_0 = {}.RouterLink;
        /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            to: ("/anonymisierung/uebersicht"),
            ...{ class: ("btn btn-sm btn-outline-primary") },
        }));
        const __VLS_2 = __VLS_1({
            to: ("/anonymisierung/uebersicht"),
            ...{ class: ("btn btn-sm btn-outline-primary") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-eye me-1") },
        });
        __VLS_5.slots.default;
        var __VLS_5;
    }
    if (__VLS_ctx.currentItem) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info d-flex align-items-center") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.reportMeta?.pdfUrl ? 'PDF-Dokument' : 'Video-Datei');
        (__VLS_ctx.currentItem?.reportMeta?.centerName ? `- ${__VLS_ctx.currentItem.reportMeta.centerName}` : '');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-light mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patientFirstName)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patientLastName)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: ("form-select") },
            value: ((__VLS_ctx.editedPatient.patientGender)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("male"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("female"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("other"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("date"),
            ...{ class: ("form-control") },
        });
        (__VLS_ctx.editedPatient.patientDob);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.casenumber)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("date"),
            ...{ class: ("form-control") },
            ...{ class: (({ 'is-invalid': !__VLS_ctx.isExaminationDateValid })) },
        });
        (__VLS_ctx.examinationDate);
        if (!__VLS_ctx.isExaminationDateValid) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("invalid-feedback") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.textarea)({
            ...{ class: ("form-control") },
            rows: ("6"),
            value: ((__VLS_ctx.editedAnonymizedText)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        if (__VLS_ctx.processedUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
                src: ((__VLS_ctx.showOriginal ? __VLS_ctx.originalUrl : __VLS_ctx.processedUrl)),
                ...{ class: ("img-fluid") },
                alt: ("Uploaded Image"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.toggleImage) },
                ...{ class: ("btn btn-info btn-sm mt-2") },
            });
            (__VLS_ctx.showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen');
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveAnnotation) },
            ...{ class: ("btn btn-primary") },
            disabled: ((!__VLS_ctx.canSubmit)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-7") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header pb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        (__VLS_ctx.currentItem?.reportMeta?.pdfUrl ? 'PDF Vorschau' : 'Video Vorschau');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info mt-2 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        if (__VLS_ctx.currentItem?.reportMeta?.pdfUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (Math.round((__VLS_ctx.currentItem.reportMeta.file?.length || 0) / 1024) || 'Unbekannt');
        }
        else if (__VLS_ctx.getVideoStreamUrl()) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.getVideoStreamUrl());
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.currentItem?.id);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body media-viewer-container") },
        });
        if (__VLS_ctx.getPdfStreamUrl() || __VLS_ctx.currentItem?.reportMeta?.pdfUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                src: ((__VLS_ctx.getPdfStreamUrl() || __VLS_ctx.currentItem?.reportMeta?.pdfUrl)),
                width: ("100%"),
                height: ("800px"),
                frameborder: ("0"),
                title: ("PDF Vorschau"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.getPdfStreamUrl() || __VLS_ctx.currentItem?.reportMeta?.pdfUrl)),
            });
        }
        else if (__VLS_ctx.getVideoStreamUrl()) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                ...{ onError: (__VLS_ctx.onVideoError) },
                ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
                ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
                controls: (true),
                width: ("100%"),
                height: ("600px"),
                src: ((__VLS_ctx.getVideoStreamUrl() || undefined)),
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.id || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.sensitiveMetaId || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (!!__VLS_ctx.currentItem?.reportMeta);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.reportMeta?.file || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.debugGetVideoStreamUrl());
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.debugGetPdfStreamUrl());
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 d-flex justify-content-between") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.skipItem) },
            ...{ class: ("btn btn-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.rejectItem) },
            ...{ class: ("btn btn-danger me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.approveItem) },
            ...{ class: ("btn btn-success") },
            disabled: ((!__VLS_ctx.isExaminationDateValid || !__VLS_ctx.dirty)),
        });
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'alert', 'alert-warning', 'mt-3', 'fas', 'fa-info-circle', 'me-2', 'mt-2', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-eye', 'me-1', 'row', 'mb-3', 'col-12', 'alert', 'alert-info', 'd-flex', 'align-items-center', 'fas', 'fa-info-circle', 'me-2', 'row', 'mb-4', 'col-md-5', 'card', 'bg-light', 'mb-4', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'card', 'bg-light', 'card-body', 'card-title', 'mt-3', 'img-fluid', 'btn', 'btn-info', 'btn-sm', 'mt-2', 'mt-3', 'btn', 'btn-primary', 'col-md-7', 'card', 'card-header', 'pb-0', 'mb-0', 'alert', 'alert-info', 'mt-2', 'mb-0', 'fas', 'fa-info-circle', 'me-2', 'card-body', 'media-viewer-container', 'alert', 'alert-warning', 'mb-0', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success',];
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
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            editedPatient: editedPatient,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            showOriginal: showOriginal,
            dirty: dirty,
            currentItem: currentItem,
            isExaminationDateValid: isExaminationDateValid,
            canSubmit: canSubmit,
            toggleImage: toggleImage,
            skipItem: skipItem,
            approveItem: approveItem,
            saveAnnotation: saveAnnotation,
            rejectItem: rejectItem,
            getVideoStreamUrl: getVideoStreamUrl,
            getPdfStreamUrl: getPdfStreamUrl,
            debugGetVideoStreamUrl: debugGetVideoStreamUrl,
            debugGetPdfStreamUrl: debugGetPdfStreamUrl,
            onVideoError: onVideoError,
            onVideoLoadStart: onVideoLoadStart,
            onVideoCanPlay: onVideoCanPlay,
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
