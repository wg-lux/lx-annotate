import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
import { usePdfStore } from '@/stores/pdfStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import OutsideTimelineComponent from '@/components/Anonymizer/OutsideSegmentComponent.vue';
import { DateConverter, DateValidator } from '@/utils/dateHelpers';
import { useRoute } from 'vue-router';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
import { usePollingProtection } from '@/composables/usePollingProtection';
const pollingProtection = usePollingProtection();
const toast = useToastStore();
const router = useRouter();
// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
// const patientStore = usePatientStore();
// const pdfStore = usePdfStore();
const mediaStore = useMediaTypeStore();
const route = useRoute();
const isPdf = computed(() => mediaStore.isPdf);
const isVideo = computed(() => mediaStore.isVideo);
function restoreLast() {
    const fid = Number(sessionStorage.getItem('last:fileId') || '');
    const sc = sessionStorage.getItem('last:scope');
    return {
        fileId: Number.isFinite(fid) ? fid : undefined,
        scope: sc || undefined,
    };
}
const props = defineProps();
let fileId = Number(props.fileId || route.query.fileId);
let scope = (props.mediaType || route.query.mediaType);
console.log("fileid and scope", fileId, scope);
if (!Number.isFinite(fileId) || !scope) {
    const restored = restoreLast();
    if (restored.fileId !== undefined)
        fileId = restored.fileId;
    if (restored.scope)
        scope = restored.scope;
}
if (!Number.isFinite(fileId) || !scope) {
    console.error('Validation view: cannot determine fileId/scope; aborting mediaStore init.', { fileId, scope });
}
else {
    mediaStore.setCurrentByKey(scope, fileId);
}
const mediaOptions = [
    { text: 'Video', value: 'video' },
    { text: 'PDF', value: 'pdf' },
];
const mediaInferral = ref('');
const mediaUnknown = computed(() => !isPdf.value && !isVideo.value);
watch(mediaInferral, (val) => {
    if (!val || !currentItem.value)
        return;
    // Remember this type for the current file, both as type and scope
    mediaStore.rememberType(currentItem.value.id, val, val);
    mediaStore.setCurrentByKey(val, currentItem.value.id);
});
// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const noMoreNames = ref(false);
const editedPatient = ref({
    patientFirstName: '',
    patientLastName: '',
    patientGenderName: '',
    patientDob: '',
    casenumber: '',
    externalId: '',
    externalIdOrigin: '',
    centerName: '',
    text: '',
    anonymizedText: '',
    examinersDisplay: '',
    examinationDate: '',
});
// ✨ Phase 2.2: Validation error tracking
const validationErrors = ref([]);
const dobErrorMessage = ref('');
const examDateErrorMessage = ref('');
const dobDisplayFormat = ref('');
const examDateDisplayFormat = ref('');
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
        patientGenderName: '',
        patientDob: '',
        casenumber: '',
    },
});
function shallowEqual(a, b) {
    return a.patientFirstName === b.patientFirstName &&
        a.patientLastName === b.patientLastName &&
        a.patientGenderName === b.patientGenderName &&
        a.patientDob === b.patientDob &&
        a.casenumber === b.casenumber;
}
// --- add below your imports/locals ---
// ============================================================================
// DATE CONVERSION UTILITIES - Using centralized DateConverter (Phase 2.1)
// ============================================================================
// Legacy functions removed - now using DateConverter from @/utils/dateHelpers
// Migration: Oct 2025 (Phase 2.1)
function buildSensitiveMetaSnake(dobGerman) {
    return {
        patient_first_name: editedPatient.value.patientFirstName || '',
        patient_last_name: editedPatient.value.patientLastName || '',
        patient_gender: editedPatient.value.patientGenderName || '',
        patient_dob: dobGerman, // 🎯 Jetzt deutsches Format
        casenumber: editedPatient.value.casenumber || '',
    };
}
// ============================================================================
// COMPUTED PROPERTIES - Validation
// ============================================================================
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk = computed(() => editedPatient.value.patientLastName.trim().length > 0);
// ✨ Phase 2.1: Using centralized DateConverter
const dobISO = computed(() => DateConverter.toISO(editedPatient.value.patientDob));
const examISO = computed(() => DateConverter.toISO(examinationDate.value));
// ✨ Phase 2.2: Validation error summary
const validationErrorSummary = computed(() => {
    const count = validationErrors.value.length;
    if (count === 0)
        return 'Alle Felder sind gültig';
    if (count === 1)
        return '1 Validierungsfehler gefunden';
    return `${count} Validierungsfehler gefunden`;
});
// DOB must be present & valid
const isDobValid = computed(() => !!dobISO.value);
// Exam optional; if present requires valid DOB and must be >= DOB
const isExaminationDateValid = computed(() => {
    if (!examISO.value)
        return true;
    if (!dobISO.value)
        return false;
    return DateConverter.isAfterOrEqual(examISO.value, dobISO.value);
});
// Global save gates
const dataOk = computed(() => firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value);
const canSubmit = computed(() => {
    // For annotation saving, we need both uploaded images AND valid patient data
    return dataOk.value;
});
// ============================================================================
// Phase 3.1: Segment Validation Enforcement
// ============================================================================
/**
 * Determines if approval is allowed based on validation state.
 * Blocks approval if video has unvalidated outside segments.
 */
const canApprove = computed(() => {
    // Basic data validation must pass
    if (!dataOk.value)
        return false;
    // For videos: Check if outside segments need validation
    if (isVideo.value && shouldShowOutsideTimeline.value) {
        // Block approval until all outside segments are validated
        return false;
    }
    // All checks passed
    return true;
});
/**
 * Returns a user-friendly message explaining why approval is blocked.
 */
const approvalBlockReason = computed(() => {
    if (!dataOk.value) {
        const errors = [];
        if (!firstNameOk.value)
            errors.push('Vorname');
        if (!lastNameOk.value)
            errors.push('Nachname');
        if (!isDobValid.value)
            errors.push('gültiges Geburtsdatum');
        if (!isExaminationDateValid.value)
            errors.push('gültiges Untersuchungsdatum');
        return `Bitte korrigieren Sie: ${errors.join(', ')}`;
    }
    if (isVideo.value && shouldShowOutsideTimeline.value) {
        const remaining = totalOutsideSegments.value - outsideSegmentsValidated.value;
        return `Bitte validieren Sie zuerst alle Outside-Segmente (${remaining} verbleibend)`;
    }
    return '';
});
/**
 * Calculates validation progress percentage for progress bar.
 */
const validationProgressPercent = computed(() => {
    if (totalOutsideSegments.value === 0)
        return 0;
    return Math.round((outsideSegmentsValidated.value / totalOutsideSegments.value) * 100);
});
// ============================================================================
// End Phase 3.1
// ============================================================================
// Computed
const currentItem = computed(() => anonymizationStore.current);
// ✅ NEW: Raw video URL (original unprocessed video)
const rawVideoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    // Build raw video URL with explicit raw parameter
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/videos/${fileId}/?type=raw`;
});
// ✅ NEW: Anonymized video URL (processed/anonymized video)
const anonymizedVideoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/videos/${fileId}/?type=processed`;
});
// ✅ NEW: Raw PDF URL (original unprocessed PDF)
const rawPdfSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    // Build raw PDF URL with explicit raw parameter
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/pdfs/${fileId}/stream/?type=raw`;
});
// ✅ NEW: Anonymized PDF URL (processed/anonymized PDF)
const anonymizedPdfSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    // Build anonymized PDF URL with explicit processed parameter
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    return `${base}/api/media/pdfs/${fileId}/stream/?type=processed`;
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
const downloadRawPdf = () => {
    if (!rawPdfSrc.value) {
        toast.warning({ text: 'Original-PDF nicht verfügbar.' });
        return;
    }
    // Open PDF in new tab for download
    window.open(rawPdfSrc.value, '_blank');
    console.log('Downloading raw PDF:', rawPdfSrc.value);
};
const downloadAnonymizedPdf = () => {
    if (!anonymizedPdfSrc.value) {
        toast.warning({ text: 'Anonymisiertes PDF nicht verfügbar.' });
        return;
    }
    window.open(anonymizedPdfSrc.value, '_blank');
    console.log('Downloading anonymized PDF:', anonymizedPdfSrc.value);
};
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
            const outsideSegmentsResponse = await axiosInstance.get(r(`media/videos/${currentItem.value.id}/segments/?label=outside`));
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
            await videoStore.fetchAllSegments(currentItem.value.id);
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
function convertGender(gender) {
    if (gender == undefined) {
        return 'unknown';
    }
    if (['male', 'männlich', 'm'].includes(gender)) {
        return "male";
    }
    else if (['female', 'weiblich', 'f', 'w'].includes(gender)) {
        return "female";
    }
    else if (['other', 'divers', 'd'].includes(gender)) {
        return "unknown"; // #TODO Change to diverse gender once supportec
    }
    return gender;
}
function loadCurrentItemData(item) {
    if (!item)
        return;
    // reset video validation state
    shouldShowOutsideTimeline.value = false;
    videoValidationStatus.value = null;
    outsideSegmentsValidated.value = 0;
    totalOutsideSegments.value = 0;
    isValidatingVideo.value = false;
    // dates
    const rawExam = item.examinationDate || '';
    const rawDob = item.patientDobDisplay || item.patientDob;
    examinationDate.value = DateConverter.toISO(rawExam) || '';
    const convertedGender = convertGender(item.patientGenderName);
    editedPatient.value = {
        patientFirstName: item.patientFirstName || '',
        patientLastName: item.patientLastName || '',
        patientGenderName: convertedGender || '',
        patientDob: DateConverter.toISO(rawDob) || '',
        casenumber: item.casenumber || '',
        externalId: item.externalId ?? '',
        externalIdOrigin: item.externalIdOrigin ?? '',
        centerName: item.centerName ?? '',
        text: item.text ?? '',
        anonymizedText: item.anonymizedText ?? '',
        examinersDisplay: item.examinersDisplay ?? '',
        examinationDate: examinationDate.value,
    };
    // if using a separate ref for anonymized text:
    // editedAnonymizedText.value = item.anonymizedText ?? '';
    original.value = {
        anonymizedText: editedPatient.value.anonymizedText ?? '',
        examinationDate: examinationDate.value,
        patient: { ...editedPatient.value },
    };
    // optional: remember last file in sessionStorage
    sessionStorage.setItem('last:fileId', String(item.id));
}
// Watch
watch(currentItem, (newItem) => {
    if (newItem)
        loadCurrentItemData(newItem);
}, { immediate: true });
const fetchNextItem = async () => {
    try {
        await anonymizationStore.fetchNext();
    }
    catch (error) {
        console.error('Error fetching next item:', error);
    }
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
// ============================================================================
// Phase 2.2: Date Validation Functions
// ============================================================================
/**
 * Validate all dates and update error panel
 */
function validateAllDates() {
    const validator = new DateValidator();
    // Clear previous errors
    validationErrors.value = [];
    dobErrorMessage.value = '';
    examDateErrorMessage.value = '';
    // Validate DOB
    if (editedPatient.value.patientDob) {
        const dobValue = editedPatient.value.patientDob;
        // Try to determine format
        if (DateConverter.validate(dobValue, 'ISO')) {
            dobDisplayFormat.value = 'ISO (YYYY-MM-DD)';
        }
        else if (DateConverter.validate(dobValue, 'German')) {
            dobDisplayFormat.value = 'Deutsch (DD.MM.YYYY)';
        }
        else {
            dobDisplayFormat.value = '';
            dobErrorMessage.value = 'Ungültiges Format. Verwenden Sie DD.MM.YYYY oder YYYY-MM-DD';
            validator.addField('Geburtsdatum', dobValue, 'German'); // Will fail
        }
    }
    else {
        dobDisplayFormat.value = '';
    }
    // Validate Exam Date
    if (examinationDate.value) {
        const examValue = examinationDate.value;
        // Try to determine format
        if (DateConverter.validate(examValue, 'ISO')) {
            examDateDisplayFormat.value = 'ISO (YYYY-MM-DD)';
        }
        else if (DateConverter.validate(examValue, 'German')) {
            examDateDisplayFormat.value = 'Deutsch (DD.MM.YYYY)';
        }
        else {
            examDateDisplayFormat.value = '';
            examDateErrorMessage.value = 'Ungültiges Format. Verwenden Sie DD.MM.YYYY oder YYYY-MM-DD';
            validator.addField('Untersuchungsdatum', examValue, 'ISO'); // Will fail
        }
    }
    else {
        examDateDisplayFormat.value = '';
    }
    // Validate DOB < ExamDate constraint
    if (dobISO.value && examISO.value) {
        validator.addConstraint('DOB_BEFORE_EXAM', DateConverter.isBeforeOrEqual(dobISO.value, examISO.value), 'Geburtsdatum muss vor oder am selben Tag wie das Untersuchungsdatum liegen');
    }
    // Update validation errors
    if (validator.hasErrors()) {
        validationErrors.value = validator.getErrors();
        // Set specific error messages
        const errors = validator.getErrors();
        errors.forEach(error => {
            if (error.includes('Geburtsdatum')) {
                dobErrorMessage.value = error.replace('Geburtsdatum: ', '');
            }
            if (error.includes('Untersuchungsdatum')) {
                examDateErrorMessage.value = error.replace('Untersuchungsdatum: ', '');
            }
        });
    }
}
/**
 * Handle DOB blur event - validate and convert format
 */
function onDobBlur() {
    const value = editedPatient.value.patientDob;
    if (!value)
        return;
    // Try to convert to ISO for consistent storage
    const isoDate = DateConverter.toISO(value);
    if (isoDate) {
        editedPatient.value.patientDob = isoDate;
        dobDisplayFormat.value = 'ISO (YYYY-MM-DD)';
    }
    // Validate all dates
    validateAllDates();
}
/**
 * Handle Exam Date blur event - validate and convert format
 */
function onExamDateBlur() {
    const value = examinationDate.value;
    if (!value)
        return;
    // Try to convert to ISO for consistent storage
    const isoDate = DateConverter.toISO(value);
    if (isoDate) {
        examinationDate.value = isoDate;
        examDateDisplayFormat.value = 'ISO (YYYY-MM-DD)';
    }
    // Validate all dates
    validateAllDates();
}
/**
 * Clear all validation errors
 */
function clearValidationErrors() {
    validationErrors.value = [];
    dobErrorMessage.value = '';
    examDateErrorMessage.value = '';
}
// ============================================================================
// End Phase 2.2
// ============================================================================
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
    // ============================================================================
    // Phase 3.1: Segment Validation Enforcement
    // ============================================================================
    // Additional safety check: Prevent approval if outside segments not validated
    if (!canApprove.value) {
        const reason = approvalBlockReason.value;
        console.warn(`❌ Approval blocked: ${reason}`);
        toast.warning({ text: reason });
        return;
    }
    // For videos with outside segments: Ensure validation was completed
    if (isVideo.value && shouldShowOutsideTimeline.value) {
        console.warn('❌ Outside segments still pending validation');
        toast.error({
            text: 'Bitte validieren Sie zuerst alle Outside-Segmente, bevor Sie das Video bestätigen.'
        });
        return;
    }
    // ============================================================================
    // End Phase 3.1
    // ============================================================================
    isApproving.value = true;
    try {
        console.log(`Validating anonymization for file ${currentItem.value.id}...`);
        try {
            await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`), {
                patient_first_name: editedPatient.value.patientFirstName,
                patient_last_name: editedPatient.value.patientLastName,
                patient_gender: editedPatient.value.patientGenderName,
                patient_dob: DateConverter.toGerman(dobISO.value || '') || '', // 🎯 Phase 2.1: SENDE DEUTSCHES FORMAT
                examination_date: DateConverter.toGerman(examISO.value || '') || '', // 🎯 Phase 2.1: SENDE DEUTSCHES FORMAT
                casenumber: editedPatient.value.casenumber || "",
                anonymized_text: editedPatient.value.anonymizedText || undefined,
                text: editedPatient.value.text || undefined,
                is_verified: 'true',
                file_type: isPdf.value ? 'pdf' : isVideo.value ? 'video' : 'unknown',
                center_name: editedPatient.value.centerName || '',
                external_id: editedPatient.value.externalId || '',
                external_id_origin: editedPatient.value.externalIdOrigin || '',
            });
            console.log(`Anonymization validated successfully for file ${currentItem.value.id}`);
            toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });
        }
        catch (validationError) {
            console.error('Error validating anonymization:', validationError);
            toast.warning({ text: 'Dokument bestätigt, aber Validierung fehlgeschlagen' });
        }
        const mediaKind = isPdf.value ? 'pdf'
            : isVideo.value ? 'video'
                : 'unknown';
        if (mediaKind === 'unknown') {
            toast.error({ text: 'Bitte Medientyp auswählen, bevor bestätigt wird.' });
            return;
        }
        pollingProtection.validateAnonymizationSafeWithProtection(currentItem.value.id, mediaKind);
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
            patient_data: buildSensitiveMetaSnake(DateConverter.toGerman(dobISO.value || '') || ''), // 🎯 Phase 2.1: DEUTSCHES FORMAT
            examinationDate: DateConverter.toGerman(examISO.value || '') || '', // 🎯 Phase 2.1: DEUTSCHES FORMAT
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
    try {
        router.push({ name: 'Anonymisierung Korrektur', params: { fileId: currentItem.value.id.toString() } });
        // approveItem will navigate to next item, so we need to return
        toast.info({ text: 'Änderungen gespeichert. Bitte wählen Sie das Element erneut für die Korrektur aus.' });
        return;
    }
    catch (error) {
        toast.error({ text: 'Fehler beim Speichern. Korrektur-Navigation abgebrochen.' });
        return;
    }
};
onMounted(async () => {
    if (Number.isFinite(fileId) && scope) {
        mediaStore.setCurrentByKey(scope, fileId);
    }
    if (!anonymizationStore.current) {
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
/** @type {__VLS_StyleScopedClasses['dual-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['dual-video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['video-section']} */ ;
/** @type {__VLS_StyleScopedClasses['dual-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['dual-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['dual-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['raw-pdf']} */ ;
/** @type {__VLS_StyleScopedClasses['dual-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymized-pdf']} */ ;
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
        ...{ onLoadstart: (...[$event]) => {
                if (!!(__VLS_ctx.anonymizationStore.loading))
                    return;
                if (!!(__VLS_ctx.anonymizationStore.error))
                    return;
                if (!(!__VLS_ctx.currentItem))
                    return;
                __VLS_ctx.anonymizationStore.fetchNext();
            } },
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
    (__VLS_ctx.currentItem?.centerName ? `- ${__VLS_ctx.currentItem.centerName}` : '');
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
    if (__VLS_ctx.validationErrors.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-danger alert-dismissible fade show" },
            role: "alert",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "alert-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-exclamation-triangle me-2" },
        });
        (__VLS_ctx.validationErrorSummary);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "mb-0" },
        });
        for (const [error, index] of __VLS_getVForSourceType((__VLS_ctx.validationErrors))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (index),
            });
            (error);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearValidationErrors) },
            type: "button",
            ...{ class: "btn-close" },
            'aria-label': "Schließen",
        });
    }
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
        value: (__VLS_ctx.editedPatient.patientGenderName),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "male",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "female",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "unknown",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onBlur: (__VLS_ctx.onDobBlur) },
        type: "date",
        ...{ class: "form-control" },
        ...{ class: ({ 'is-invalid': !__VLS_ctx.isDobValid }) },
    });
    (__VLS_ctx.editedPatient.patientDob);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "form-text text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-1" },
    });
    if (__VLS_ctx.dobDisplayFormat) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ms-2 badge bg-secondary" },
        });
        (__VLS_ctx.dobDisplayFormat);
    }
    if (!__VLS_ctx.isDobValid) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "invalid-feedback" },
        });
        (__VLS_ctx.dobErrorMessage || 'Gültiges Geburtsdatum ist erforderlich.');
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
        ...{ onBlur: (__VLS_ctx.onExamDateBlur) },
        type: "date",
        ...{ class: "form-control" },
        ...{ class: ({ 'is-invalid': !__VLS_ctx.isExaminationDateValid }) },
    });
    (__VLS_ctx.examinationDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "form-text text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-1" },
    });
    if (__VLS_ctx.examDateDisplayFormat) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ms-2 badge bg-secondary" },
        });
        (__VLS_ctx.examDateDisplayFormat);
    }
    if (!__VLS_ctx.isExaminationDateValid) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "invalid-feedback" },
        });
        (__VLS_ctx.examDateErrorMessage || 'Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.');
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
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.externalId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.examinersDisplay),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.externalIdOrigin),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.centerName),
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
        (Math.round((__VLS_ctx.anonymizedPdfSrc?.length || 0) / 1024) || 'Nicht Verfügbar');
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dual-pdf-container" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pdf-section raw-pdf" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "text-center mb-3 text-danger" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-file-pdf me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
            src: (__VLS_ctx.rawPdfSrc),
            width: "100%",
            height: "700px",
            frameborder: "0",
            title: "Original PDF Vorschau",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.rawPdfSrc),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.rawPdfSrc || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pdf-section anonymized-pdf" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "text-center mb-3 text-success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-shield-alt me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
            src: (__VLS_ctx.anonymizedPdfSrc),
            width: "100%",
            height: "700px",
            frameborder: "0",
            title: "Anonymisiertes PDF Vorschau",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.anonymizedPdfSrc),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.anonymizedPdfSrc || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pdf-controls mt-3 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.downloadRawPdf) },
            ...{ class: "btn btn-outline-primary btn-sm me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-download me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.downloadAnonymizedPdf) },
            ...{ class: "btn btn-outline-success btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-download me-1" },
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
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-center" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
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
                ...{ class: "text-end" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "badge bg-warning text-dark fs-6" },
            });
            (__VLS_ctx.outsideSegmentsValidated);
            (__VLS_ctx.totalOutsideSegments);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "progress mt-2" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "progress-bar bg-success" },
                role: "progressbar",
                ...{ style: ({ width: __VLS_ctx.validationProgressPercent + '%' }) },
                'aria-valuenow': (__VLS_ctx.outsideSegmentsValidated),
                'aria-valuemin': (0),
                'aria-valuemax': (__VLS_ctx.totalOutsideSegments),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            (__VLS_ctx.validationProgressPercent);
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
        (__VLS_ctx.isPdf);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.isVideo);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem ? __VLS_ctx.mediaStore.detectMediaType(__VLS_ctx.currentItem) : 'N/A');
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
        disabled: (__VLS_ctx.isApproving || !__VLS_ctx.canApprove),
        title: (__VLS_ctx.approvalBlockReason),
    });
    if (__VLS_ctx.isApproving) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-2" },
            role: "status",
            'aria-hidden': "true",
        });
    }
    (__VLS_ctx.isApproving ? 'Wird bestätigt...' : 'Bestätigen');
    if (__VLS_ctx.mediaUnknown) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mt-2 mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.mediaInferral),
        });
        for (const [mediaOption] of __VLS_getVForSourceType((__VLS_ctx.mediaOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: (mediaOption.value),
            });
            (mediaOption.text);
        }
    }
    if (!__VLS_ctx.canApprove && __VLS_ctx.approvalBlockReason) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mt-2 mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-exclamation-triangle me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.approvalBlockReason);
    }
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
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['fade']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
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
/** @type {__VLS_StyleScopedClasses['dual-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['raw-pdf']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-file-pdf']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-section']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymized-pdf']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-shield-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-download']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-download']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
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
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
/** @type {__VLS_StyleScopedClasses['progress']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
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
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            OutsideTimelineComponent: OutsideTimelineComponent,
            anonymizationStore: anonymizationStore,
            mediaStore: mediaStore,
            isPdf: isPdf,
            isVideo: isVideo,
            mediaOptions: mediaOptions,
            mediaInferral: mediaInferral,
            mediaUnknown: mediaUnknown,
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            noMoreNames: noMoreNames,
            editedPatient: editedPatient,
            validationErrors: validationErrors,
            dobErrorMessage: dobErrorMessage,
            examDateErrorMessage: examDateErrorMessage,
            dobDisplayFormat: dobDisplayFormat,
            examDateDisplayFormat: examDateDisplayFormat,
            isValidatingVideo: isValidatingVideo,
            shouldShowOutsideTimeline: shouldShowOutsideTimeline,
            videoValidationStatus: videoValidationStatus,
            outsideSegmentsValidated: outsideSegmentsValidated,
            totalOutsideSegments: totalOutsideSegments,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            showOriginal: showOriginal,
            firstNameOk: firstNameOk,
            lastNameOk: lastNameOk,
            validationErrorSummary: validationErrorSummary,
            isDobValid: isDobValid,
            isExaminationDateValid: isExaminationDateValid,
            canApprove: canApprove,
            approvalBlockReason: approvalBlockReason,
            validationProgressPercent: validationProgressPercent,
            currentItem: currentItem,
            rawVideoSrc: rawVideoSrc,
            anonymizedVideoSrc: anonymizedVideoSrc,
            rawPdfSrc: rawPdfSrc,
            anonymizedPdfSrc: anonymizedPdfSrc,
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
            downloadRawPdf: downloadRawPdf,
            downloadAnonymizedPdf: downloadAnonymizedPdf,
            validateVideoForSegmentAnnotation: validateVideoForSegmentAnnotation,
            onSegmentValidated: onSegmentValidated,
            onOutsideValidationComplete: onOutsideValidationComplete,
            dirty: dirty,
            isSaving: isSaving,
            isApproving: isApproving,
            toggleImage: toggleImage,
            onDobBlur: onDobBlur,
            onExamDateBlur: onExamDateBlur,
            clearValidationErrors: clearValidationErrors,
            skipItem: skipItem,
            approveItem: approveItem,
            saveAnnotation: saveAnnotation,
            rejectItem: rejectItem,
            navigateToCorrection: navigateToCorrection,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
