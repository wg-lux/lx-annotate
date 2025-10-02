import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
import { usePdfStore } from '@/stores/pdfStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
import { usePollingProtection } from '@/composables/usePollingProtection';
const pollingProtection = usePollingProtection();
const toast = useToastStore();
const router = useRouter();
// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const patientStore = usePatientStore();
const pdfStore = usePdfStore();
const mediaStore = useMediaTypeStore();
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
const noMoreNames = ref(false);
const original = ref({
    anonymizedText: '',
    examinationDate: '',
    patient: {
        patientFirstName: '',
        patientLastName: '',
        patientGender: '',
        patientDob: '',
        casenumber: '',
    },
});
function shallowEqual(a, b) {
    return a.patientFirstName === b.patientFirstName &&
        a.patientLastName === b.patientLastName &&
        a.patientGender === b.patientGender &&
        a.patientDob === b.patientDob &&
        a.casenumber === b.casenumber;
}
// --- add below your imports/locals ---
function normalizeDateToISO(input) {
    if (!input)
        return null;
    const s = input.trim().split(' ')[0]; // remove time if present
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso)
        return s;
    const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (de) {
        const [, dd, mm, yyyy] = de;
        return `${yyyy}-${mm}-${dd}`;
    }
    return null;
}
function buildSensitiveMetaSnake(dobIso) {
    return {
        patient_first_name: editedPatient.value.patientFirstName || '',
        patient_last_name: editedPatient.value.patientLastName || '',
        patient_gender: editedPatient.value.patientGender || '',
        patient_dob: dobIso,
        casenumber: editedPatient.value.casenumber || '',
    };
}
function compareISODate(a, b) {
    if (a === b)
        return 0;
    return a < b ? -1 : 1;
}
// Validations
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk = computed(() => editedPatient.value.patientLastName.trim().length > 0);
const dobISO = computed(() => normalizeDateToISO(editedPatient.value.patientDob));
const examISO = computed(() => normalizeDateToISO(examinationDate.value));
// DOB must be present & valid
const isDobValid = computed(() => !!dobISO.value);
// Exam optional; if present requires valid DOB and must be >= DOB
const isExaminationDateValid = computed(() => {
    if (!examISO.value)
        return true;
    if (!dobISO.value)
        return false;
    return compareISODate(examISO.value, dobISO.value) >= 0;
});
// Global save gates
const dataOk = computed(() => firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value);
const canSubmit = computed(() => !!processedUrl.value && !!originalUrl.value);
// Computed
const currentItem = computed(() => anonymizationStore.current);
// Use MediaStore for consistent media type detection
const isPdf = computed(() => {
    if (!currentItem.value)
        return false;
    return mediaStore.detectMediaType(currentItem.value) === 'pdf';
});
const isVideo = computed(() => {
    if (!currentItem.value)
        return false;
    return mediaStore.detectMediaType(currentItem.value) === 'video';
});
// Media URLs with MediaStore logic
const pdfSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    // Use MediaStore's URL resolution logic
    return mediaStore.getPdfUrl(currentItem.value) ||
        pdfStore.pdfStreamUrl ||
        pdfStore.buildPdfStreamUrl(currentItem.value.id);
});
const videoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    return mediaStore.getVideoUrl(currentItem.value);
});
// Watch
watch(currentItem, (newItem) => {
    if (newItem) {
        // Update MediaStore with current item for consistent type detection
        mediaStore.setCurrentItem(newItem);
        loadCurrentItemData(newItem);
    }
}, { immediate: true });
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
    const rawExam = item.reportMeta?.examinationDate || '';
    const rawDob = item.reportMeta?.patientDob || '';
    examinationDate.value = normalizeDateToISO(rawExam) || '';
    const p = {
        patientFirstName: item.reportMeta?.patientFirstName || '',
        patientLastName: item.reportMeta?.patientLastName || '',
        patientGender: item.reportMeta?.patientGender || '',
        patientDob: normalizeDateToISO(rawDob) || '',
        casenumber: item.reportMeta?.casenumber || '',
    };
    editedPatient.value = { ...p };
    original.value = {
        anonymizedText: editedAnonymizedText.value,
        examinationDate: examinationDate.value,
        patient: { ...p },
    };
};
const dirty = computed(() => editedAnonymizedText.value !== original.value.anonymizedText ||
    examinationDate.value !== original.value.examinationDate ||
    !shallowEqual(editedPatient.value, original.value.patient));
// Concurrency guards
const isSaving = ref(false);
const isApproving = ref(false);
const toggleImage = () => {
    showOriginal.value = !showOriginal.value;
};
const skipItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
    }
};
const approveItem = async () => {
    if (!currentItem.value || isApproving.value)
        return;
    isApproving.value = true;
    try {
        console.log(`Validating anonymization for file ${currentItem.value.id}...`);
        try {
            await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`), {
                patient_first_name: editedPatient.value.patientFirstName,
                patient_last_name: editedPatient.value.patientLastName,
                patient_gender: editedPatient.value.patientGender, // if used by SensitiveMeta
                patient_dob: dobISO.value, // "YYYY-MM-DD"
                examination_date: examISO.value || "",
                casenumber: editedPatient.value.casenumber || "",
                anonymized_text: isPdf.value ? editedAnonymizedText.value : undefined,
                is_verified: true,
            });
            console.log(`Anonymization validated successfully for file ${currentItem.value.id}`);
            toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });
        }
        catch (validationError) {
            console.error('Error validating anonymization:', validationError);
            toast.warning({ text: 'Dokument bestätigt, aber Validierung fehlgeschlagen' });
        }
        pollingProtection.validateAnonymizationSafeWithProtection(currentItem.value.id, 'pdf');
        await fetchNextItem();
    }
    catch (error) {
        console.error('Error approving item:', error);
        toast.error({ text: 'Fehler beim Bestätigen des Elements' });
    }
    finally {
        isApproving.value = false;
    }
};
const saveAnnotation = async () => {
    if (isSaving.value || !canSubmit.value) {
        if (!isSaving.value)
            toast.error({ text: 'Bitte Namen und gültiges Geburtsdatum angeben.' });
        return;
    }
    isSaving.value = true;
    try {
        const annotationData = {
            processed_image_url: processedUrl.value,
            patient_data: buildSensitiveMetaSnake(dobISO.value),
            examinationDate: examISO.value || '',
            anonymized_text: editedAnonymizedText.value,
        };
        if (currentItem.value && isVideo.value) {
            await axiosInstance.post(r('save-anonymization-annotation-video/'), {
                ...annotationData,
                itemId: currentItem.value.id,
            });
        }
        else if (currentItem.value && isPdf.value) {
            await axiosInstance.post(r('save-anonymization-annotation-pdf/'), annotationData);
        }
        else {
            toast.error({ text: 'Keine gültige Anonymisierung zum Speichern gefunden.' });
            return;
        }
        originalUrl.value = '';
        processedUrl.value = '';
        hasSuccessfulUpload.value = false;
        toast.success({ text: 'Annotation erfolgreich gespeichert' });
    }
    catch (error) {
        console.error('Error saving annotation:', error);
        toast.error({ text: 'Fehler beim Speichern der Annotation' });
    }
    finally {
        isSaving.value = false;
    }
};
const rejectItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
    }
};
const navigateToCorrection = async () => {
    if (!currentItem.value) {
        toast.error({ text: 'Kein Element zur Korrektur ausgewählt.' });
        return;
    }
    // Check for unsaved changes
    if (dirty.value) {
        const saveFirst = confirm('Sie haben ungespeicherte Änderungen!\n\n' +
            'Möchten Sie diese zuerst speichern, bevor Sie zur Korrektur wechseln?\n\n' +
            '• Ja = Änderungen speichern und zur Korrektur\n' +
            '• Nein = Änderungen verwerfen und zur Korrektur\n' +
            '• Abbrechen = Hier bleiben');
        if (saveFirst === null) {
            // User cancelled
            return;
        }
        if (saveFirst) {
            // User wants to save first
            try {
                await approveItem();
                // approveItem will navigate to next item, so we need to return
                toast.info({ text: 'Änderungen gespeichert. Bitte wählen Sie das Element erneut für die Korrektur aus.' });
                return;
            }
            catch (error) {
                toast.error({ text: 'Fehler beim Speichern. Korrektur-Navigation abgebrochen.' });
                return;
            }
        }
        // If saveFirst is false, continue with navigation (discard changes)
    }
    // Ensure MediaStore has the current item for consistent navigation
    mediaStore.setCurrentItem(currentItem.value);
    // Different confirmation messages based on media type
    const mediaType = isVideo.value ? 'Video' : isPdf.value ? 'PDF' : 'Dokument';
    const correctionOptions = isVideo.value
        ? 'Verfügbare Optionen: Maskierung, Frame-Entfernung, Neuverarbeitung'
        : 'Verfügbare Optionen: Text-Annotation anpassen, Metadaten korrigieren';
    // Log navigation for debugging
    console.log(`🔧 Navigating to correction for ${mediaType}:`, {
        id: currentItem.value.id,
        mediaType,
        detectedType: mediaStore.detectMediaType(currentItem.value),
        mediaUrl: mediaStore.currentMediaUrl
    });
    // Navigate to correction component with the current item's ID
    router.push({
        name: 'AnonymisierungKorrektur',
        params: { fileId: currentItem.value.id.toString() }
    });
    toast.info({
        text: `${mediaType}-Korrektur geöffnet. ${correctionOptions}`
    });
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
    console.log('Video loading started for:', videoSrc.value);
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
onUnmounted(() => {
    fetchNextItem();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['pdf-viewer-container']} */ ;
/** @type {__VLS_StyleScopedClasses['media-viewer-container']} */ ;
/** @type {__VLS_StyleScopedClasses['media-viewer-container']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.anonymizationStore.loading) {
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
else if (__VLS_ctx.anonymizationStore.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.anonymizationStore.error);
}
else if (!__VLS_ctx.currentItem) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
        role: "alert",
    });
}
if (__VLS_ctx.anonymizationStore.isAnyFileProcessing) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.anonymizationStore.processingFiles.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2" },
    });
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: "/anonymisierung/uebersicht",
        ...{ class: "btn btn-sm btn-outline-primary" },
    }));
    const __VLS_2 = __VLS_1({
        to: "/anonymisierung/uebersicht",
        ...{ class: "btn btn-sm btn-outline-primary" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-eye me-1" },
    });
    var __VLS_3;
}
if (__VLS_ctx.currentItem) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info d-flex align-items-center justify-content-between" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.isPdf ? 'PDF-Dokument' : __VLS_ctx.isVideo ? 'Video-Datei' : 'Unbekanntes Format');
    (__VLS_ctx.currentItem?.reportMeta?.centerName ? `- ${__VLS_ctx.currentItem.reportMeta.centerName}` : '');
    if (__VLS_ctx.currentItem && (__VLS_ctx.isVideo || __VLS_ctx.isPdf)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-tools me-1" },
        });
        (__VLS_ctx.isVideo ? 'Video-Korrektur verfügbar' : 'Text-Korrektur verfügbar');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "checkbox",
        ...{ class: "form-check-input" },
        id: "noMoreNames",
    });
    (__VLS_ctx.noMoreNames);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "noMoreNames",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card bg-light mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "card-title d-flex align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-eye me-2 text-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control bg-light" },
        value: (__VLS_ctx.editedPatient.patientFirstName),
        readonly: true,
        disabled: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control bg-light" },
        value: (__VLS_ctx.editedPatient.patientLastName),
        readonly: true,
        disabled: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control bg-light" },
        value: (__VLS_ctx.editedPatient.patientGender === 'male' ? 'Männlich' : __VLS_ctx.editedPatient.patientGender === 'female' ? 'Weiblich' : __VLS_ctx.editedPatient.patientGender === 'other' ? 'Divers' : __VLS_ctx.editedPatient.patientGender),
        readonly: true,
        disabled: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control bg-light" },
        value: (__VLS_ctx.editedPatient.patientDob),
        readonly: true,
        disabled: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control bg-light" },
        value: (__VLS_ctx.editedPatient.casenumber),
        readonly: true,
        disabled: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control bg-light" },
        value: (__VLS_ctx.examinationDate),
        readonly: true,
        disabled: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ class: "form-control" },
        rows: "6",
        value: (__VLS_ctx.editedAnonymizedText),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-7" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "mb-0" },
    });
    (__VLS_ctx.isPdf ? 'PDF Vorschau' : 'Video Vorschau');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info mt-2 mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    if (__VLS_ctx.isPdf) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (Math.round((__VLS_ctx.currentItem?.reportMeta?.file?.length || 0) / 1024) || 'Unbekannt');
    }
    else if (__VLS_ctx.isVideo) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.videoSrc);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.currentItem?.id);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body media-viewer-container" },
    });
    if (__VLS_ctx.isPdf) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
            src: (__VLS_ctx.pdfSrc),
            width: "100%",
            height: "800px",
            frameborder: "0",
            title: "PDF Vorschau",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.pdfSrc),
        });
    }
    else if (__VLS_ctx.isVideo) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onError: (__VLS_ctx.onVideoError) },
            ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
            ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
            controls: true,
            width: "100%",
            height: "600px",
            src: (__VLS_ctx.videoSrc),
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.id || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.sensitiveMetaId || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.isPdf);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.isVideo);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem ? __VLS_ctx.mediaStore.detectMediaType(__VLS_ctx.currentItem) : 'N/A');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem ? __VLS_ctx.mediaStore.currentMediaUrl : 'N/A');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.videoUrl || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.pdfStreamUrl || 'Nicht verfügbar');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 d-flex justify-content-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.skipItem) },
        ...{ class: "btn btn-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex gap-2" },
    });
    if (__VLS_ctx.currentItem && (__VLS_ctx.isVideo || __VLS_ctx.isPdf)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.navigateToCorrection) },
            ...{ class: "btn btn-warning position-relative" },
            disabled: (__VLS_ctx.isApproving || !__VLS_ctx.noMoreNames),
            title: (__VLS_ctx.isVideo ? 'Video-Korrektur: Maskierung, Frame-Entfernung, etc.' : 'PDF-Korrektur: Text-Annotation anpassen'),
        });
        if (!__VLS_ctx.noMoreNames) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" },
                ...{ style: {} },
                title: "Bitte bestätigen Sie, dass keine weiteren Namen im Video oder PDF vorhanden sind.",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-edit me-1" },
        });
        (__VLS_ctx.isVideo ? 'Video-Korrektur' : 'PDF-Korrektur');
        if (__VLS_ctx.dirty) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" },
                ...{ style: {} },
                title: "Ungespeicherte Änderungen",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.rejectItem) },
        ...{ class: "btn btn-danger me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.approveItem) },
        ...{ class: "btn btn-success" },
        disabled: (__VLS_ctx.isApproving),
    });
    if (__VLS_ctx.isApproving) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-2" },
            role: "status",
            'aria-hidden': "true",
        });
    }
    (__VLS_ctx.isApproving ? 'Wird bestätigt...' : 'Bestätigen');
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-eye']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-5']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-eye']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-info']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-7']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['media-viewer-container']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['position-relative']} */ ;
/** @type {__VLS_StyleScopedClasses['position-absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['start-100']} */ ;
/** @type {__VLS_StyleScopedClasses['translate-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['position-absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['start-100']} */ ;
/** @type {__VLS_StyleScopedClasses['translate-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            anonymizationStore: anonymizationStore,
            mediaStore: mediaStore,
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            editedPatient: editedPatient,
            noMoreNames: noMoreNames,
            currentItem: currentItem,
            isPdf: isPdf,
            isVideo: isVideo,
            pdfSrc: pdfSrc,
            videoSrc: videoSrc,
            dirty: dirty,
            isApproving: isApproving,
            skipItem: skipItem,
            approveItem: approveItem,
            rejectItem: rejectItem,
            navigateToCorrection: navigateToCorrection,
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
});
; /* PartiallyEnd: #4569/main.vue */
