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
const canSave = computed(() => firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value);
const canSubmit = computed(() => !!processedUrl.value && !!originalUrl.value && canSave.value);
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
    if (!currentItem.value || !canSave.value || isApproving.value)
        return;
    isApproving.value = true;
    try {
        const normalizedDob = dobISO.value; // guaranteed by canSave
        const normalizedExam = examISO.value || '';
        const snake = buildSensitiveMetaSnake(normalizedDob);
        if (isVideo.value) {
            await videoStore.loadVideo(currentItem.value.id.toString());
            await anonymizationStore.patchVideo({
                sensitive_meta_id: currentItem.value.reportMeta?.id,
                is_verified: true,
                delete_raw_files: true,
                ...snake,
                examination_date: normalizedExam,
            });
            pollingProtection.validateAnonymizationSafeWithProtection(currentItem.value.id, 'video');
        }
        else {
            // Prefer pdfStore when available
            if (currentItem.value.reportMeta?.pdfUrl && currentItem.value.sensitiveMetaId) {
                await pdfStore.updateSensitiveMeta(currentItem.value.sensitiveMetaId, {
                    // send snake_case (for DRF) AND camelCase (if your pdfStore needs it)
                    ...snake,
                    patientFirstName: editedPatient.value.patientFirstName,
                    patientLastName: editedPatient.value.patientLastName,
                    patientGender: editedPatient.value.patientGender,
                    patientDob: normalizedDob,
                    examinationDate: normalizedExam,
                    isVerified: true,
                });
                await pdfStore.updateAnonymizedText(currentItem.value.id, editedAnonymizedText.value);
            }
            else {
                await anonymizationStore.patchPdf({
                    sensitive_meta_id: currentItem.value.reportMeta?.id,
                    is_verified: true,
                    delete_raw_files: true,
                    ...snake,
                    examination_date: normalizedExam,
                    anonymized_text: editedAnonymizedText.value,
                });
            }
            pollingProtection.validateAnonymizationSafeWithProtection(currentItem.value.id, 'pdf');
        }
        // ✅ NEW: Validate the anonymization status after successful approval
        console.log(`Validating anonymization for file ${currentItem.value.id}...`);
        try {
            await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`));
            console.log(`Anonymization validated successfully for file ${currentItem.value.id}`);
            toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });
        }
        catch (validationError) {
            console.error('Error validating anonymization:', validationError);
            toast.warning({ text: 'Dokument bestätigt, aber Validierung fehlgeschlagen' });
        }
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
            if (!canSave.value) {
                toast.error({ text: 'Bitte korrigieren Sie die Validierungsfehler vor dem Speichern.' });
                return;
            }
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
            ...{ class: ("alert alert-info d-flex align-items-center justify-content-between") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.isPdf ? 'PDF-Dokument' : __VLS_ctx.isVideo ? 'Video-Datei' : 'Unbekanntes Format');
        (__VLS_ctx.currentItem?.reportMeta?.centerName ? `- ${__VLS_ctx.currentItem.reportMeta.centerName}` : '');
        if (__VLS_ctx.currentItem && (__VLS_ctx.isVideo || __VLS_ctx.isPdf)) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-end") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-tools me-1") },
            });
            (__VLS_ctx.isVideo ? 'Video-Korrektur verfügbar' : 'Text-Korrektur verfügbar');
        }
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
            ...{ class: (({ 'is-invalid': !__VLS_ctx.firstNameOk })) },
        });
        if (!__VLS_ctx.firstNameOk) {
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patientLastName)),
            ...{ class: (({ 'is-invalid': !__VLS_ctx.lastNameOk })) },
        });
        if (!__VLS_ctx.lastNameOk) {
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
            ...{ class: (({ 'is-invalid': !__VLS_ctx.isDobValid })) },
        });
        (__VLS_ctx.editedPatient.patientDob);
        if (!__VLS_ctx.isDobValid) {
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
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
            disabled: ((__VLS_ctx.isSaving || !__VLS_ctx.canSubmit)),
        });
        if (__VLS_ctx.isSaving) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-2") },
                role: ("status"),
                'aria-hidden': ("true"),
            });
        }
        (__VLS_ctx.isSaving ? 'Speichern...' : 'Annotation speichern');
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
            (__VLS_ctx.currentItem ? __VLS_ctx.mediaStore.detectMediaType(__VLS_ctx.currentItem) : 'N/A');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem ? __VLS_ctx.mediaStore.currentMediaUrl : 'N/A');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.videoUrl || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentItem?.pdfStreamUrl || 'Nicht verfügbar');
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex gap-2") },
        });
        if (__VLS_ctx.currentItem && (__VLS_ctx.isVideo || __VLS_ctx.isPdf)) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.navigateToCorrection) },
                ...{ class: ("btn btn-warning position-relative") },
                disabled: ((__VLS_ctx.isApproving)),
                title: ((__VLS_ctx.isVideo ? 'Video-Korrektur: Maskierung, Frame-Entfernung, etc.' : 'PDF-Korrektur: Text-Annotation anpassen')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit me-1") },
            });
            (__VLS_ctx.isVideo ? 'Video-Korrektur' : 'PDF-Korrektur');
            if (__VLS_ctx.dirty) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger") },
                    ...{ style: ({}) },
                    title: ("Ungespeicherte Änderungen"),
                });
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.rejectItem) },
            ...{ class: ("btn btn-danger me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.approveItem) },
            ...{ class: ("btn btn-success") },
            disabled: ((__VLS_ctx.isApproving || !__VLS_ctx.canSave || !__VLS_ctx.dirty)),
        });
        if (__VLS_ctx.isApproving) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-2") },
                role: ("status"),
                'aria-hidden': ("true"),
            });
        }
        (__VLS_ctx.isApproving ? 'Wird bestätigt...' : 'Bestätigen');
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'alert', 'alert-warning', 'mt-3', 'fas', 'fa-info-circle', 'me-2', 'mt-2', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-eye', 'me-1', 'row', 'mb-3', 'col-12', 'alert', 'alert-info', 'd-flex', 'align-items-center', 'justify-content-between', 'fas', 'fa-info-circle', 'me-2', 'text-end', 'text-muted', 'fas', 'fa-tools', 'me-1', 'row', 'mb-4', 'col-md-5', 'card', 'bg-light', 'mb-4', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'card', 'bg-light', 'card-body', 'card-title', 'mt-3', 'img-fluid', 'btn', 'btn-info', 'btn-sm', 'mt-2', 'mt-3', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-2', 'col-md-7', 'card', 'card-header', 'pb-0', 'mb-0', 'alert', 'alert-info', 'mt-2', 'mb-0', 'fas', 'fa-info-circle', 'me-2', 'card-body', 'media-viewer-container', 'alert', 'alert-warning', 'mb-0', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'd-flex', 'gap-2', 'btn', 'btn-warning', 'position-relative', 'fas', 'fa-edit', 'me-1', 'position-absolute', 'top-0', 'start-100', 'translate-middle', 'badge', 'rounded-pill', 'bg-danger', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success', 'spinner-border', 'spinner-border-sm', 'me-2',];
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
            mediaStore: mediaStore,
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            editedPatient: editedPatient,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            showOriginal: showOriginal,
            firstNameOk: firstNameOk,
            lastNameOk: lastNameOk,
            isDobValid: isDobValid,
            isExaminationDateValid: isExaminationDateValid,
            canSave: canSave,
            canSubmit: canSubmit,
            currentItem: currentItem,
            isPdf: isPdf,
            isVideo: isVideo,
            pdfSrc: pdfSrc,
            videoSrc: videoSrc,
            dirty: dirty,
            isSaving: isSaving,
            isApproving: isApproving,
            toggleImage: toggleImage,
            skipItem: skipItem,
            approveItem: approveItem,
            saveAnnotation: saveAnnotation,
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
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
