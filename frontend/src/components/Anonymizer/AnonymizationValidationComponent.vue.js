import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { usePdfStore } from '@/stores/pdfStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
// @ts-ignore
const toast = useToastStore();
// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const pdfStore = usePdfStore();
const patientStore = usePatientStore();
// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref(''); // ISO for backend
const examinationDateDisplay = ref(''); // DD.MM.YYYY for UI
const patientDobISO = ref(''); // ISO for validation
const editedPatient = ref({
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
    patientDob: '', // Display format for UI
    casenumber: ''
});
// Upload-related state
const originalUrl = ref('');
const processedUrl = ref('');
const showOriginal = ref(false);
const hasSuccessfulUpload = ref(false);
// In-flight operation guards
const isSaving = ref(false);
const isApproving = ref(false);
let fetchingNext = false;
// Dirty tracking
const dirty = ref(false);
// Computed
const currentItem = computed(() => anonymizationStore.current);
const mediaType = computed(() => currentItem.value?.reportMeta?.pdfUrl
    ? 'pdf'
    : currentItem.value?.videoUrl || currentItem.value?.reportMeta?.file
        ? 'video'
        : 'unknown');
const isPdf = computed(() => mediaType.value === 'pdf');
const isVideo = computed(() => mediaType.value === 'video');
// Media URLs
const pdfSrc = computed(() => {
    if (!isPdf.value)
        return undefined;
    // First try to use the pdfUrl from reportMeta (provided by VoPPatientDataSerializer)
    if (currentItem.value?.reportMeta?.pdfUrl) {
        return currentItem.value.reportMeta.pdfUrl;
    }
    // Fallback to generating URL using PDF store
    if (currentItem.value?.id) {
        return pdfStore.buildPdfStreamUrl(currentItem.value.id);
    }
    // Final fallback to manual URL construction
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/pdfstream/${currentItem.value.id}/`;
});
const videoSrc = computed(() => {
    if (!isVideo.value)
        return undefined;
    return currentItem.value?.videoUrl || undefined;
});
const isExaminationDateValid = computed(() => {
    if (!examinationDate.value || !patientDobISO.value) {
        return true;
    }
    // Parse dates using ISO format for accurate validation
    try {
        const examDate = new Date(examinationDate.value);
        const birthDate = new Date(patientDobISO.value);
        // Check if dates are valid
        if (isNaN(examDate.getTime()) || isNaN(birthDate.getTime())) {
            return true; // Don't validate if dates are invalid
        }
        return examDate >= birthDate;
    }
    catch (error) {
        console.warn('Date validation error:', error);
        return true; // Don't block if there's an error
    }
});
const canSubmit = computed(() => {
    return processedUrl.value && originalUrl.value && isExaminationDateValid.value && !isSaving.value;
});
const canApprove = computed(() => {
    // Don't allow approval if currently processing
    if (isApproving.value) {
        return false;
    }
    // Basic validation: examination date must be valid
    if (!isExaminationDateValid.value) {
        return false;
    }
    // For approval, we need at least patient data to be present
    // Don't require dirty flag - user should be able to approve even without changes
    const hasRequiredData = currentItem.value && (editedPatient.value.patientFirstName ||
        editedPatient.value.patientLastName ||
        examinationDate.value);
    return !!hasRequiredData;
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
    if (fetchingNext)
        return;
    fetchingNext = true;
    try {
        await anonymizationStore.fetchNext();
    }
    catch (error) {
        console.error('Error fetching next item:', error);
    }
    finally {
        fetchingNext = false;
    }
};
const loadCurrentItemData = (item) => {
    if (!item)
        return;
    editedAnonymizedText.value = item.anonymizedText || '';
    // Set both ISO and display formats for examination date
    examinationDate.value = item.reportMeta?.examinationDate || '';
    examinationDateDisplay.value = formatDateForDisplay(item.reportMeta?.examinationDate) || '';
    if (item.reportMeta) {
        editedPatient.value.patientFirstName = item.reportMeta.patientFirstName || '';
        editedPatient.value.patientLastName = item.reportMeta.patientLastName || '';
        editedPatient.value.patientGender = item.reportMeta.patientGender || '';
        // Keep ISO format for validation
        patientDobISO.value = item.reportMeta.patientDob || '';
        // Set display format for UI
        editedPatient.value.patientDob = formatDateForDisplay(item.reportMeta.patientDob) || '';
        editedPatient.value.casenumber = item.reportMeta.casenumber || '';
    }
    // Load PDF data if this is a PDF item and we have an ID
    if (isPdf.value && item.id) {
        loadPdfData(item.id);
    }
    // Set dirty to true if we have data loaded (allows approval without further changes)
    dirty.value = !!(item.reportMeta?.patientFirstName || item.reportMeta?.patientLastName || item.anonymizedText);
};
const formatDateForDisplay = (dateStr) => {
    if (!dateStr)
        return '';
    // If it's already in ISO format YYYY-MM-DD, convert to German format DD.MM.YYYY for user-friendly display
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year}`;
    }
    // If it's already in German format or other format, return as is
    return dateStr;
};
const loadPdfData = async (pdfId) => {
    try {
        console.log(`Loading PDF data for pdf_id: ${pdfId}`);
        // Load PDF metadata using the PDF store
        // Note: pdfId here is the RawPdfFile.id (pdf_id), not sensitive_meta_id
        await pdfStore.loadPdf(pdfId);
        if (pdfStore.errorMessage) {
            console.warn(`PDF store error: ${pdfStore.errorMessage}`);
        }
        else {
            console.log(`PDF data loaded successfully for pdf_id: ${pdfId}`);
            console.log(`PDF stream URL: ${pdfStore.pdfStreamUrl}`);
        }
    }
    catch (error) {
        console.error(`Error loading PDF data for pdf_id ${pdfId}:`, error);
    }
};
const formatDateOfBirth = () => {
    if (!editedPatient.value.patientDob)
        return;
    let dateStr = editedPatient.value.patientDob.trim();
    // Handle German format DD.MM.YYYY
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const [day, month, year] = dateStr.split('.');
        // Convert to ISO format YYYY-MM-DD for backend and validation
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        patientDobISO.value = isoDate;
        editedPatient.value.patientDob = isoDate;
    }
    // Handle partial German format DD.MM.YY (assuming 19XX or 20XX)
    else if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
        const [day, month, year] = dateStr.split('.');
        const fullYear = parseInt(year) > 30 ? `19${year}` : `20${year}`;
        const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        patientDobISO.value = isoDate;
        editedPatient.value.patientDob = isoDate;
    }
    // Handle ISO format YYYY-MM-DD (keep as is, just validate)
    else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const [year, month, day] = dateStr.split('-');
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        patientDobISO.value = isoDate;
        editedPatient.value.patientDob = isoDate;
    }
    // Handle other formats or invalid input
    else if (dateStr.length > 0) {
        console.warn(`Invalid date format: ${dateStr}`);
        // Don't change the value, let user correct it
    }
};
const formatExaminationDate = () => {
    if (!examinationDateDisplay.value)
        return;
    let dateStr = examinationDateDisplay.value.trim();
    // Handle German format DD.MM.YYYY
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const [day, month, year] = dateStr.split('.');
        // Convert to ISO format YYYY-MM-DD for consistency
        examinationDate.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Handle partial German format DD.MM.YY (assuming 19XX or 20XX)
    else if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
        const [day, month, year] = dateStr.split('.');
        const fullYear = parseInt(year) > 30 ? `19${year}` : `20${year}`;
        examinationDate.value = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Handle ISO format YYYY-MM-DD (convert to display format)
    else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const [year, month, day] = dateStr.split('-');
        examinationDate.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        examinationDateDisplay.value = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
    }
    // Handle other formats or invalid input
    else if (dateStr.length > 0) {
        console.warn(`Invalid examination date format: ${dateStr}`);
        // Don't change the value, let user correct it
        examinationDate.value = ''; // Clear invalid ISO value
    }
    else {
        examinationDate.value = '';
    }
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
    if (isApproving.value)
        return; // Prevent double-clicks
    isApproving.value = true;
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
    finally {
        isApproving.value = false;
    }
};
const saveAnnotation = async () => {
    // Enforce UI rules inside the method
    if (!isPdf.value)
        return;
    if (!canSubmit.value)
        return;
    if (isSaving.value)
        return; // Prevent double-clicks
    isSaving.value = true;
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
            toast.error({ text: 'Keine gültige Anonymisierung zum Speichern gefunden.' });
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
    finally {
        isSaving.value = false;
    }
};
const rejectItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
        dirty.value = false;
    }
};
// Video streaming methods
const getVideoStreamUrl = () => currentItem.value?.videoUrl || null;
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
// Lifecycle
onMounted(async () => {
    if (!anonymizationStore.current) { // nur wenn wirklich leer
        await fetchNextItem();
    }
    else {
        loadCurrentItemData(anonymizationStore.current);
    }
});
// Removed onUnmounted fetchNextItem to prevent navigation races
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
            ...{ onBlur: (__VLS_ctx.formatDateOfBirth) },
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patientDob)),
            placeholder: ("TT.MM.JJJJ oder JJJJ-MM-TT"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("form-text text-muted") },
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
            value: ((__VLS_ctx.editedPatient.casenumber)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ onBlur: (__VLS_ctx.formatExaminationDate) },
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.examinationDateDisplay)),
            placeholder: ("TT.MM.JJJJ"),
            inputmode: ("numeric"),
            ...{ class: (({ 'is-invalid': !__VLS_ctx.isExaminationDateValid })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("form-text text-muted") },
        });
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
            disabled: ((!__VLS_ctx.canSubmit || __VLS_ctx.isSaving)),
        });
        if (__VLS_ctx.isSaving) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
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
        (__VLS_ctx.isPdf ? 'PDF Vorschau' : 'Video Vorschau');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info mt-2 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        if (__VLS_ctx.isPdf) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (Math.round((__VLS_ctx.currentItem?.reportMeta?.file?.length || 0) / 1024) || 'Unbekannt');
        }
        else if (__VLS_ctx.isVideo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.videoSrc);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.currentItem?.id);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body media-viewer-container") },
        });
        if (__VLS_ctx.isPdf) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                src: ((__VLS_ctx.pdfSrc)),
                width: ("100%"),
                height: ("800px"),
                frameborder: ("0"),
                title: ("PDF Vorschau"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.pdfSrc)),
            });
        }
        else if (__VLS_ctx.isVideo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                ...{ onError: (__VLS_ctx.onVideoError) },
                ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
                ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
                controls: (true),
                width: ("100%"),
                height: ("600px"),
                src: ((__VLS_ctx.videoSrc)),
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
            (__VLS_ctx.isPdf);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.isVideo);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.pdfSrc || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.videoUrl || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.id ? __VLS_ctx.pdfStore.buildPdfStreamUrl(__VLS_ctx.currentItem.id) : 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.pdfStore.pdfStreamUrl || 'Nicht verfügbar');
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
            disabled: ((!__VLS_ctx.canApprove || __VLS_ctx.isApproving)),
            title: ((__VLS_ctx.canApprove ? 'Zur Bestätigung bereit' : 'Fehlende oder ungültige Daten')),
        });
        if (__VLS_ctx.isApproving) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        if (!__VLS_ctx.canApprove) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-12") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.isExaminationDateValid);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (!!(__VLS_ctx.editedPatient.patientFirstName || __VLS_ctx.editedPatient.patientLastName));
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (!!__VLS_ctx.examinationDate);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.examinationDateDisplay);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.examinationDate);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.editedPatient.patientDob);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.patientDobISO);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.isSaving);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.isApproving);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.dirty);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.canApprove);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.canSubmit);
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (!!__VLS_ctx.currentItem);
        }
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'alert', 'alert-warning', 'mt-3', 'fas', 'fa-info-circle', 'me-2', 'mt-2', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-eye', 'me-1', 'row', 'mb-3', 'col-12', 'alert', 'alert-info', 'd-flex', 'align-items-center', 'fas', 'fa-info-circle', 'me-2', 'row', 'mb-4', 'col-md-5', 'card', 'bg-light', 'mb-4', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'form-text', 'text-muted', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'form-text', 'text-muted', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'card', 'bg-light', 'card-body', 'card-title', 'mt-3', 'img-fluid', 'btn', 'btn-info', 'btn-sm', 'mt-2', 'mt-3', 'btn', 'btn-primary', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'col-md-7', 'card', 'card-header', 'pb-0', 'mb-0', 'alert', 'alert-info', 'mt-2', 'mb-0', 'fas', 'fa-info-circle', 'me-2', 'card-body', 'media-viewer-container', 'alert', 'alert-warning', 'mb-0', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'row', 'mt-3', 'col-12', 'alert', 'alert-warning', 'mb-0',];
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
            pdfStore: pdfStore,
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            examinationDateDisplay: examinationDateDisplay,
            patientDobISO: patientDobISO,
            editedPatient: editedPatient,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            showOriginal: showOriginal,
            isSaving: isSaving,
            isApproving: isApproving,
            dirty: dirty,
            currentItem: currentItem,
            isPdf: isPdf,
            isVideo: isVideo,
            pdfSrc: pdfSrc,
            videoSrc: videoSrc,
            isExaminationDateValid: isExaminationDateValid,
            canSubmit: canSubmit,
            canApprove: canApprove,
            formatDateOfBirth: formatDateOfBirth,
            formatExaminationDate: formatExaminationDate,
            toggleImage: toggleImage,
            skipItem: skipItem,
            approveItem: approveItem,
            saveAnnotation: saveAnnotation,
            rejectItem: rejectItem,
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
