import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
import { usePdfStore } from '@/stores/pdfStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import OutsideTimelineComponent from '@/components/Anonymizer/OutsideSegmentComponent.vue';
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
const noMoreNames = ref(false);
const editedPatient = ref({
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
    patientDob: '',
    casenumber: ''
});
// ✅ NEW: Video validation state for segment annotation
const isValidatingVideo = ref(false);
const shouldShowOutsideTimeline = ref(false);
const videoValidationStatus = ref(null);
const outsideSegmentsValidated = ref(0);
const totalOutsideSegments = ref(0);
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
function fromUiToISO(input) {
    /**
     * Konvertiert Browser Date Input (YYYY-MM-DD) zu ISO String
     */
    if (!input)
        return null;
    const s = input.trim().split(' ')[0];
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return iso ? s : null;
}
function toGerman(iso) {
    /**
     * Konvertiert ISO-Datum (YYYY-MM-DD) zu deutschem Format (DD.MM.YYYY)
     */
    if (!iso)
        return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m)
        return '';
    const [, y, mo, d] = m;
    return `${d}.${mo}.${y}`;
}
function fromGermanToISO(input) {
    /**
     * Konvertiert deutsches Datum (DD.MM.YYYY) zu ISO-Format (YYYY-MM-DD)
     */
    if (!input)
        return null;
    const s = input.trim();
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (!m)
        return null;
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
}
function normalizeDateToISO(input) {
    /**
     * DEPRECATED: Verwende fromUiToISO oder fromGermanToISO
     * Zur Rückwärtskompatibilität noch vorhanden
     */
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
function buildSensitiveMetaSnake(dobGerman) {
    return {
        patient_first_name: editedPatient.value.patientFirstName || '',
        patient_last_name: editedPatient.value.patientLastName || '',
        patient_gender: editedPatient.value.patientGender || '',
        patient_dob: dobGerman, // 🎯 Jetzt deutsches Format
        casenumber: editedPatient.value.casenumber || '',
    };
}
function compareISODate(a, b) {
    if (a === b)
        return 0;
    return a < b ? -1 : 1;
}
// Validations mit neuen Helfern - intern weiterhin ISO für Vergleiche
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk = computed(() => editedPatient.value.patientLastName.trim().length > 0);
// Unterstütze sowohl UI-Input (ISO) als auch deutsche Eingaben
const dobISO = computed(() => fromUiToISO(editedPatient.value.patientDob) || fromGermanToISO(editedPatient.value.patientDob));
const examISO = computed(() => fromUiToISO(examinationDate.value) || fromGermanToISO(examinationDate.value));
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
const canSubmit = computed(() => {
    // For annotation saving, we need both uploaded images AND valid patient data
    return dataOk.value;
});
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
// ✅ ENHANCED: Dual video streaming for raw vs anonymized comparison
const videoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    return mediaStore.getVideoUrl(currentItem.value);
});
// ✅ NEW: Raw video URL (original unprocessed video)
const rawVideoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    // Build raw video URL with explicit raw parameter
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/videos/${currentItem.value.id}/?type=raw`;
});
// ✅ NEW: Anonymized video URL (processed/anonymized video)
const anonymizedVideoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/videos/${currentItem.value.id}/?type=processed`;
});
// ✅ NEW: Refs for dual video elements
const rawVideoElement = ref(null);
const anonymizedVideoElement = ref(null);
// ✅ NEW: Video event handlers for raw video
const onRawVideoError = (event) => {
    console.error('Raw video error:', event);
    // Handle raw video errors gracefully
};
const onRawVideoLoadStart = () => {
    console.log('Raw video load started');
};
const onRawVideoCanPlay = () => {
    console.log('Raw video can play');
};
// ✅ NEW: Video event handlers for anonymized video
const onAnonymizedVideoError = (event) => {
    console.error('Anonymized video error:', event);
    // Handle anonymized video errors gracefully
};
const onAnonymizedVideoLoadStart = () => {
    console.log('Anonymized video load started');
};
const onAnonymizedVideoCanPlay = () => {
    console.log('Anonymized video can play');
};
// ✅ NEW: Video synchronization functions
const syncVideoTime = (source, event) => {
    if (!rawVideoElement.value || !anonymizedVideoElement.value)
        return;
    const sourceElement = source === 'raw' ? rawVideoElement.value : anonymizedVideoElement.value;
    const targetElement = source === 'raw' ? anonymizedVideoElement.value : rawVideoElement.value;
    // Sync time only if there's a significant difference (avoid infinite loops)
    const timeDiff = Math.abs(sourceElement.currentTime - targetElement.currentTime);
    if (timeDiff > 0.5) { // 0.5 second tolerance
        targetElement.currentTime = sourceElement.currentTime;
    }
};
const syncVideos = () => {
    if (!rawVideoElement.value || !anonymizedVideoElement.value)
        return;
    // Sync to the average time of both videos
    const avgTime = (rawVideoElement.value.currentTime + anonymizedVideoElement.value.currentTime) / 2;
    rawVideoElement.value.currentTime = avgTime;
    anonymizedVideoElement.value.currentTime = avgTime;
    console.log('Videos synchronized to time:', avgTime);
};
const pauseAllVideos = () => {
    if (rawVideoElement.value)
        rawVideoElement.value.pause();
    if (anonymizedVideoElement.value)
        anonymizedVideoElement.value.pause();
    console.log('All videos paused');
};
// ✅ NEW: Video validation functions for segment annotation
const validateVideoForSegmentAnnotation = async () => {
    if (!currentItem.value || !isVideo.value) {
        toast.warning({ text: 'Kein Video zur Validierung ausgewählt.' });
        return;
    }
    isValidatingVideo.value = true;
    shouldShowOutsideTimeline.value = false;
    videoValidationStatus.value = null;
    try {
        // Check if video is eligible for segment annotation
        console.log(`🔍 Validating video ${currentItem.value.id} for segment annotation...`);
        const response = await axiosInstance.get(r(`media/videos/${currentItem.value.id}/validation/segments/`));
        const validation = response.data;
        console.log('Video validation response:', validation);
        if (validation.eligible) {
            // Video is eligible - check for outside segments
            const outsideSegmentsResponse = await axiosInstance.get(r(`video/${currentItem.value.id}/segments/?label=outside`));
            const outsideSegments = outsideSegmentsResponse.data;
            totalOutsideSegments.value = outsideSegments.length;
            outsideSegmentsValidated.value = 0;
            if (outsideSegments.length > 0) {
                shouldShowOutsideTimeline.value = true;
                videoValidationStatus.value = {
                    class: 'alert-warning',
                    icon: 'fas fa-exclamation-triangle',
                    title: 'Segmentvalidierung erforderlich',
                    message: `${outsideSegments.length} "Outside"-Segmente gefunden, die validiert werden müssen.`,
                    details: 'Verwenden Sie die Timeline unten, um die Segmente zu überprüfen und zu bestätigen.'
                };
            }
            else {
                videoValidationStatus.value = {
                    class: 'alert-success',
                    icon: 'fas fa-check-circle',
                    title: 'Video bereit für Annotation',
                    message: 'Keine "Outside"-Segmente gefunden. Video ist bereit für die Segment-Annotation.',
                    details: `Video ID: ${currentItem.value.id} - Alle Validierungen bestanden.`
                };
            }
        }
        else {
            videoValidationStatus.value = {
                class: 'alert-danger',
                icon: 'fas fa-times-circle',
                title: 'Video nicht bereit',
                message: validation.reasons?.join(', ') || 'Video ist nicht für Segment-Annotation geeignet.',
                details: 'Überprüfen Sie die Video-Verarbeitung und Metadaten-Extraktion.'
            };
        }
        toast.info({ text: `Video ${currentItem.value.id} validiert` });
    }
    catch (error) {
        console.error('Error validating video for segment annotation:', error);
        // Fallback validation using video store if API endpoint doesn't exist
        try {
            await videoStore.fetchAllSegments(currentItem.value.id.toString());
            const outsideSegments = videoStore.allSegments.filter(s => s.label === 'outside');
            totalOutsideSegments.value = outsideSegments.length;
            outsideSegmentsValidated.value = 0;
            if (outsideSegments.length > 0) {
                shouldShowOutsideTimeline.value = true;
                videoValidationStatus.value = {
                    class: 'alert-warning',
                    icon: 'fas fa-exclamation-triangle',
                    title: 'Outside-Segmente gefunden (Fallback)',
                    message: `${outsideSegments.length} "Outside"-Segmente zur Validierung gefunden.`,
                    details: 'Fallback-Validierung über VideoStore. API-Endpoint nicht verfügbar.'
                };
            }
            else {
                videoValidationStatus.value = {
                    class: 'alert-info',
                    icon: 'fas fa-info-circle',
                    title: 'Fallback-Validierung',
                    message: 'Keine "Outside"-Segmente gefunden (über VideoStore).',
                    details: 'API-Validierung fehlgeschlagen, Fallback verwendet.'
                };
            }
        }
        catch (fallbackError) {
            videoValidationStatus.value = {
                class: 'alert-danger',
                icon: 'fas fa-times-circle',
                title: 'Validierung fehlgeschlagen',
                message: 'Video konnte nicht für Segment-Annotation validiert werden.',
                details: error?.response?.data?.detail || error?.message || 'Unbekannter Fehler'
            };
        }
    }
    finally {
        isValidatingVideo.value = false;
    }
};
const onSegmentValidated = (segmentId) => {
    outsideSegmentsValidated.value++;
    console.log(`✅ Segment ${segmentId} validated. Progress: ${outsideSegmentsValidated.value}/${totalOutsideSegments.value}`);
    // Update validation status
    if (videoValidationStatus.value) {
        videoValidationStatus.value.message =
            `Fortschritt: ${outsideSegmentsValidated.value}/${totalOutsideSegments.value} Outside-Segmente validiert.`;
    }
};
const onOutsideValidationComplete = () => {
    console.log('🎉 All outside segments validated!');
    shouldShowOutsideTimeline.value = false;
    videoValidationStatus.value = {
        class: 'alert-success',
        icon: 'fas fa-check-circle',
        title: 'Validierung abgeschlossen',
        message: 'Alle Outside-Segmente wurden erfolgreich validiert.',
        details: `Video ${currentItem.value?.id} ist jetzt bereit für die vollständige Segment-Annotation.`
    };
    toast.success({ text: 'Outside-Segment Validierung abgeschlossen!' });
};
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
    // ✅ NEW: Reset video validation state when loading new item
    shouldShowOutsideTimeline.value = false;
    videoValidationStatus.value = null;
    outsideSegmentsValidated.value = 0;
    totalOutsideSegments.value = 0;
    isValidatingVideo.value = false;
    editedAnonymizedText.value = item.anonymizedText || '';
    const rawExam = item.reportMeta?.examinationDate || '';
    const rawDob = item.reportMeta?.patientDob || '';
    // Unterstütze sowohl eingehende ISO- als auch deutsche Daten
    examinationDate.value = fromUiToISO(rawExam) || fromGermanToISO(rawExam) || '';
    const p = {
        patientFirstName: item.reportMeta?.patientFirstName || '',
        patientLastName: item.reportMeta?.patientLastName || '',
        patientGender: item.reportMeta?.patientGender || '',
        patientDob: fromUiToISO(rawDob) || fromGermanToISO(rawDob) || '',
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
// ✅ NEW: Can save computed property
const canSave = computed(() => {
    // Can save if we have a current item and data is not currently being processed
    return currentItem.value && !isSaving.value && !isApproving.value;
});
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
const navigateToSegmentation = () => {
    if (!currentItem.value) {
        toast.error({ text: 'Kein Video zur Segmentierung ausgewählt.' });
        return;
    }
    // Navigate with video ID as query parameter to ensure correct video selection
    router.push({
        name: 'Video-Untersuchung',
        query: { video: currentItem.value.id.toString() }
    });
    console.log(`🎯 Navigating to Video-Untersuchung with video ID: ${currentItem.value.id}`);
};
const approveItem = async () => {
    if (!currentItem.value || !canSave.value || isApproving.value)
        return;
    isApproving.value = true;
    try {
        console.log(`Validating anonymization for file ${currentItem.value.id}...`);
        try {
            await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`), {
                patient_first_name: editedPatient.value.patientFirstName,
                patient_last_name: editedPatient.value.patientLastName,
                patient_gender: editedPatient.value.patientGender,
                patient_dob: toGerman(dobISO.value || '') || '', // 🎯 SENDE DEUTSCHES FORMAT
                examination_date: toGerman(examISO.value || '') || '', // 🎯 SENDE DEUTSCHES FORMAT
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
        await navigateToSegmentation();
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
    if (isSaving.value) {
        return; // Already saving
    }
    if (!canSubmit.value) {
        // Provide more specific error messages
        if (!processedUrl.value || !originalUrl.value) {
            toast.error({ text: 'Bitte laden Sie zuerst Bilder hoch (Original und bearbeitetes Bild).' });
        }
        else if (!dataOk.value) {
            // Specific validation errors
            const errors = [];
            if (!firstNameOk.value)
                errors.push('Vorname');
            if (!lastNameOk.value)
                errors.push('Nachname');
            if (!isDobValid.value)
                errors.push('gültiges Geburtsdatum');
            if (!isExaminationDateValid.value)
                errors.push('gültiges Untersuchungsdatum (darf nicht vor Geburtsdatum liegen)');
            toast.error({ text: `Bitte korrigieren Sie: ${errors.join(', ')}` });
        }
        return;
    }
    isSaving.value = true;
    try {
        const annotationData = {
            processed_image_url: processedUrl.value,
            patient_data: buildSensitiveMetaSnake(toGerman(dobISO.value || '') || ''), // 🎯 DEUTSCHES FORMAT
            examinationDate: toGerman(examISO.value || '') || '', // 🎯 DEUTSCHES FORMAT
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
/** @type {__VLS_StyleScopedClasses['dual-video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['video-section']} */ ;
/** @type {__VLS_StyleScopedClasses['dual-video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['video-section']} */ ;
/** @type {__VLS_StyleScopedClasses['outside-timeline-container']} */ ;
/** @type {__VLS_StyleScopedClasses['outside-timeline-container']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['video-controls']} */ ;
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
        ...{ class: "card-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.patientFirstName),
        ...{ class: ({ 'is-invalid': !__VLS_ctx.firstNameOk }) },
    });
    if (!__VLS_ctx.firstNameOk) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "invalid-feedback" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.patientLastName),
        ...{ class: ({ 'is-invalid': !__VLS_ctx.lastNameOk }) },
    });
    if (!__VLS_ctx.lastNameOk) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "invalid-feedback" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ class: "form-select" },
        value: (__VLS_ctx.editedPatient.patientGender),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "male",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "female",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "other",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "date",
        ...{ class: "form-control" },
        ...{ class: ({ 'is-invalid': !__VLS_ctx.isDobValid }) },
    });
    (__VLS_ctx.editedPatient.patientDob);
    if (!__VLS_ctx.isDobValid) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "invalid-feedback" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "text",
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.casenumber),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "date",
        ...{ class: "form-control" },
        ...{ class: ({ 'is-invalid': !__VLS_ctx.isExaminationDateValid }) },
    });
    (__VLS_ctx.examinationDate);
    if (!__VLS_ctx.isExaminationDateValid) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "invalid-feedback" },
        });
    }
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
        ...{ class: "card bg-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "card-title" },
    });
    if (__VLS_ctx.processedUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: (__VLS_ctx.showOriginal ? __VLS_ctx.originalUrl : __VLS_ctx.processedUrl),
            ...{ class: "img-fluid" },
            alt: "Uploaded Image",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.toggleImage) },
            ...{ class: "btn btn-info btn-sm mt-2" },
        });
        (__VLS_ctx.showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAnnotation) },
        ...{ class: "btn btn-primary" },
    });
    if (__VLS_ctx.isSaving) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-2" },
            role: "status",
            'aria-hidden': "true",
        });
    }
    (__VLS_ctx.isSaving ? 'Speichern...' : 'Annotation zwischenspeichern');
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
        (__VLS_ctx.rawVideoSrc || 'N/A');
        (__VLS_ctx.anonymizedVideoSrc || 'N/A');
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dual-video-container" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-section raw-video" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "text-center mb-3 text-danger" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-eye me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onError: (__VLS_ctx.onRawVideoError) },
            ...{ onLoadstart: (__VLS_ctx.onRawVideoLoadStart) },
            ...{ onCanplay: (__VLS_ctx.onRawVideoCanPlay) },
            ...{ onTimeupdate: ((event) => __VLS_ctx.syncVideoTime('raw', event)) },
            ref: "rawVideoElement",
            src: (__VLS_ctx.rawVideoSrc),
            controls: true,
            ...{ style: {} },
            preload: "metadata",
        });
        /** @type {typeof __VLS_ctx.rawVideoElement} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.rawVideoSrc || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-section anonymized-video" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "text-center mb-3 text-success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-shield-alt me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onError: (__VLS_ctx.onAnonymizedVideoError) },
            ...{ onLoadstart: (__VLS_ctx.onAnonymizedVideoLoadStart) },
            ...{ onCanplay: (__VLS_ctx.onAnonymizedVideoCanPlay) },
            ...{ onTimeupdate: ((event) => __VLS_ctx.syncVideoTime('anonymized', event)) },
            ref: "anonymizedVideoElement",
            src: (__VLS_ctx.anonymizedVideoSrc),
            controls: true,
            ...{ style: {} },
            preload: "metadata",
        });
        /** @type {typeof __VLS_ctx.anonymizedVideoElement} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.anonymizedVideoSrc || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-controls mt-3 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.syncVideos) },
            ...{ class: "btn btn-outline-primary btn-sm me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-sync me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.pauseAllVideos) },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-pause me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.validateVideoForSegmentAnnotation) },
            ...{ class: "btn btn-outline-info btn-sm ms-2" },
            disabled: (__VLS_ctx.isValidatingVideo),
        });
        if (__VLS_ctx.isValidatingVideo) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "spinner-border spinner-border-sm me-1" },
                role: "status",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-check me-1" },
            });
        }
        if (__VLS_ctx.shouldShowOutsideTimeline && __VLS_ctx.currentItem) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "outside-timeline-container mt-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card border-warning" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header bg-warning bg-opacity-10" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: "mb-0 text-warning" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-exclamation-triangle me-2" },
            });
            (__VLS_ctx.currentItem.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body" },
            });
            /** @type {[typeof OutsideTimelineComponent, ]} */ ;
            // @ts-ignore
            const __VLS_4 = __VLS_asFunctionalComponent(OutsideTimelineComponent, new OutsideTimelineComponent({
                ...{ 'onSegmentValidated': {} },
                ...{ 'onValidationComplete': {} },
                videoId: (__VLS_ctx.currentItem.id),
            }));
            const __VLS_5 = __VLS_4({
                ...{ 'onSegmentValidated': {} },
                ...{ 'onValidationComplete': {} },
                videoId: (__VLS_ctx.currentItem.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_4));
            let __VLS_7;
            let __VLS_8;
            let __VLS_9;
            const __VLS_10 = {
                onSegmentValidated: (__VLS_ctx.onSegmentValidated)
            };
            const __VLS_11 = {
                onValidationComplete: (__VLS_ctx.onOutsideValidationComplete)
            };
            var __VLS_6;
        }
        if (__VLS_ctx.videoValidationStatus) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "alert mt-3" },
                ...{ class: (__VLS_ctx.videoValidationStatus.class) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: (__VLS_ctx.videoValidationStatus.icon) },
                ...{ class: "me-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.videoValidationStatus.title);
            (__VLS_ctx.videoValidationStatus.message);
            if (__VLS_ctx.videoValidationStatus.details) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mt-2" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                (__VLS_ctx.videoValidationStatus.details);
            }
        }
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
            disabled: (__VLS_ctx.isApproving),
            title: (__VLS_ctx.isVideo ? 'Video-Korrektur: Maskierung, Frame-Entfernung, etc.' : 'PDF-Korrektur: Text-Annotation anpassen'),
        });
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
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['dual-video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['video-section']} */ ;
/** @type {__VLS_StyleScopedClasses['raw-video']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-eye']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['video-section']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymized-video']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-shield-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['video-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-pause']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['outside-timeline-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-opacity-10']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
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
            OutsideTimelineComponent: OutsideTimelineComponent,
            anonymizationStore: anonymizationStore,
            mediaStore: mediaStore,
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            noMoreNames: noMoreNames,
            editedPatient: editedPatient,
            isValidatingVideo: isValidatingVideo,
            shouldShowOutsideTimeline: shouldShowOutsideTimeline,
            videoValidationStatus: videoValidationStatus,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            showOriginal: showOriginal,
            firstNameOk: firstNameOk,
            lastNameOk: lastNameOk,
            isDobValid: isDobValid,
            isExaminationDateValid: isExaminationDateValid,
            currentItem: currentItem,
            isPdf: isPdf,
            isVideo: isVideo,
            pdfSrc: pdfSrc,
            rawVideoSrc: rawVideoSrc,
            anonymizedVideoSrc: anonymizedVideoSrc,
            rawVideoElement: rawVideoElement,
            anonymizedVideoElement: anonymizedVideoElement,
            onRawVideoError: onRawVideoError,
            onRawVideoLoadStart: onRawVideoLoadStart,
            onRawVideoCanPlay: onRawVideoCanPlay,
            onAnonymizedVideoError: onAnonymizedVideoError,
            onAnonymizedVideoLoadStart: onAnonymizedVideoLoadStart,
            onAnonymizedVideoCanPlay: onAnonymizedVideoCanPlay,
            syncVideoTime: syncVideoTime,
            syncVideos: syncVideos,
            pauseAllVideos: pauseAllVideos,
            validateVideoForSegmentAnnotation: validateVideoForSegmentAnnotation,
            onSegmentValidated: onSegmentValidated,
            onOutsideValidationComplete: onOutsideValidationComplete,
            dirty: dirty,
            isSaving: isSaving,
            isApproving: isApproving,
            toggleImage: toggleImage,
            skipItem: skipItem,
            approveItem: approveItem,
            saveAnnotation: saveAnnotation,
            rejectItem: rejectItem,
            navigateToCorrection: navigateToCorrection,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
