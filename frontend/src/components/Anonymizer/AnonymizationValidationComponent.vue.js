import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { useToastStore } from '@/stores/toastStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import OutsideTimelineComponent from '@/components/Anonymizer/OutsideSegmentComponent.vue';
import { DateConverter, DateValidator } from '@/utils/dateHelpers';
import { buildPdfStreamUrl, buildVideoStreamUrl } from '@/utils/mediaUrls';
import { useRoute } from 'vue-router';
import { useDebug } from '@/composables/useDebug';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
const toast = useToastStore();
const router = useRouter();
const { isDebug } = useDebug();
// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
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
const sourceFileId = ref(Number.isFinite(fileId) ? fileId : null);
const sourceMediaScope = ref(scope === 'video' || scope === 'pdf' ? scope : null);
console.log("fileid and scope", fileId, scope);
if (!Number.isFinite(fileId) || !scope) {
    const restored = restoreLast();
    if (restored.fileId !== undefined)
        fileId = restored.fileId;
    if (restored.scope)
        scope = restored.scope;
    if (restored.scope === 'video' || restored.scope === 'pdf') {
        sourceMediaScope.value = restored.scope;
    }
}
if (!Number.isFinite(fileId) || !scope) {
    console.error('Validation view: cannot determine fileId/scope; aborting mediaStore init.', { fileId, scope });
}
else {
    mediaStore.setCurrentByKey(scope, fileId);
    sourceFileId.value = fileId;
    sourceMediaScope.value = scope;
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
    sourceMediaScope.value = val;
});
// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const noMoreNames = ref(false);
const presetValidationTags = ['Nochmal Überprüfen', 'Ausgeschlossen'];
const selectedTags = ref([]);
const customTagInput = ref('');
const validationComment = ref('');
const caseResolution = ref(null);
const documentTypeOptions = ref([]);
const selectedDocumentType = ref('');
const isLoadingDocumentTypes = ref(false);
const documentTypeLoadError = ref('');
const documentTypeTouched = ref(false);
const patientExaminationOptions = ref([]);
const selectedPatientExaminationOption = ref('');
const manualPatientExaminationId = ref('');
const isLoadingPatientExaminations = ref(false);
const patientExaminationLoadError = ref('');
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
    tags: [],
    validationComment: '',
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
function normalizeValidationTag(tag) {
    return tag.trim().replace(/\s+/g, ' ');
}
function areSortedStringArraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return a.every((value, index) => value === b[index]);
}
function addValidationTag(tag) {
    const normalizedTag = normalizeValidationTag(tag);
    if (!normalizedTag)
        return;
    const hasTag = selectedTags.value.some((entry) => entry.localeCompare(normalizedTag, undefined, { sensitivity: 'base' }) === 0);
    if (hasTag)
        return;
    selectedTags.value = [...selectedTags.value, normalizedTag].sort((a, b) => a.localeCompare(b));
}
function toggleValidationTag(tag) {
    const normalizedTag = normalizeValidationTag(tag);
    const existingIndex = selectedTags.value.findIndex((entry) => entry.localeCompare(normalizedTag, undefined, { sensitivity: 'base' }) === 0);
    if (existingIndex >= 0) {
        selectedTags.value = selectedTags.value.filter((_, index) => index !== existingIndex);
        return;
    }
    addValidationTag(normalizedTag);
}
function removeValidationTag(tag) {
    selectedTags.value = selectedTags.value.filter((entry) => entry.localeCompare(tag, undefined, { sensitivity: 'base' }) !== 0);
}
function addCustomValidationTag() {
    addValidationTag(customTagInput.value);
    customTagInput.value = '';
}
// --- add below your imports/locals ---
// ============================================================================
// DATE CONVERSION UTILITIES - Using centralized DateConverter (Phase 2.1)
// ============================================================================
// Legacy functions removed - now using DateConverter from @/utils/dateHelpers
// Migration: Oct 2025 (Phase 2.1)
function normalizeDateInputToGerman(value) {
    const isoDate = DateConverter.toISO(value);
    if (!isoDate)
        return '';
    return DateConverter.toGerman(isoDate);
}
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
const hasValidDocumentType = computed(() => {
    if (!isPdf.value)
        return true;
    return documentTypeOptions.value.some((option) => option.value === selectedDocumentType.value);
});
const selectedPatientExaminationIdForRouting = computed(() => {
    if (!isPdf.value)
        return null;
    if (selectedPatientExaminationOption.value === '__manual__') {
        return toPositiveInteger(manualPatientExaminationId.value);
    }
    return toPositiveInteger(selectedPatientExaminationOption.value);
});
const hasValidPatientExaminationSelection = computed(() => {
    if (!isPdf.value)
        return true;
    if (selectedPatientExaminationOption.value !== '__manual__')
        return true;
    return selectedPatientExaminationIdForRouting.value !== null;
});
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
    // PDFs require an explicit document type
    if (!hasValidDocumentType.value)
        return false;
    // Manual patient examination selection must be valid if used
    if (!hasValidPatientExaminationSelection.value)
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
    if (!hasValidDocumentType.value) {
        return 'Bitte wählen Sie einen Dokumenttyp für die PDF-Validierung.';
    }
    if (!hasValidPatientExaminationSelection.value) {
        return 'Bitte geben Sie eine gültige PatientExamination-ID ein oder wählen Sie "Automatisch bestimmen".';
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
const patientHashDisplay = computed(() => caseResolution.value?.patientHashDisplay ?? currentItem.value?.patientHashDisplay ?? null);
const examinationHashDisplay = computed(() => caseResolution.value?.examinationHashDisplay ?? currentItem.value?.examinationHashDisplay ?? null);
const pseudoPatientId = computed(() => {
    const value = caseResolution.value?.pseudoPatient?.id ??
        currentItem.value?.pseudoPatientId ??
        currentItem.value?.patientId ??
        null;
    return typeof value === 'number' && value > 0 ? value : null;
});
const linkedPatientExaminationId = computed(() => {
    const value = caseResolution.value?.pseudoExamination?.linkedPatientExaminationId ??
        currentItem.value?.patientExaminationId ??
        caseResolution.value?.recommendedPatientExaminationId ??
        currentItem.value?.pseudoExaminationId ??
        null;
    return typeof value === 'number' && value > 0 ? value : null;
});
const linkageStatus = computed(() => {
    if (caseResolution.value?.matchStatus === 'linked') {
        return 'linked';
    }
    if (caseResolution.value?.matchStatus === 'deferred') {
        return 'deferred';
    }
    if (caseResolution.value?.matchStatus === 'suggested') {
        return 'suggested';
    }
    if (caseResolution.value?.matchStatus === 'unresolved') {
        return 'not_linked';
    }
    if (caseResolution.value?.pseudoExamination?.linkedPatientExaminationId ||
        currentItem.value?.patientExaminationId) {
        return 'linked';
    }
    if (patientHashDisplay.value || examinationHashDisplay.value || pseudoPatientId.value !== null) {
        return 'suggested';
    }
    return 'not_linked';
});
const linkageStatusLabel = computed(() => {
    const labels = {
        not_linked: 'Nicht verknuepft',
        suggested: 'Vorgeschlagen',
        linked: 'Verknuepft',
        deferred: 'Zurueckgestellt'
    };
    return labels[linkageStatus.value];
});
const linkageStatusDescription = computed(() => {
    if (linkageStatus.value === 'linked') {
        if (caseResolution.value?.isAutoResolved) {
            return 'Der Patientenfall wurde automatisch aus den validierten Metadaten zugeordnet.';
        }
        return 'Eine bestehende Fallverknuepfung ist bereits vorhanden.';
    }
    if (linkageStatus.value === 'deferred') {
        return 'Die Fallzuordnung wurde bewusst vertagt und kann spaeter abgeschlossen werden.';
    }
    if (caseResolution.value?.matchStatus === 'suggested' &&
        (caseResolution.value?.suggestedMatchCount ?? 0) > 1) {
        return 'Mehrere passende PatientExaminations wurden gefunden. Eine explizite Auswahl ist spaeter erforderlich.';
    }
    if (caseResolution.value?.matchStatus === 'suggested' &&
        (caseResolution.value?.suggestedMatchCount ?? 0) === 1) {
        return 'Eine passende PatientExamination wurde vorgeschlagen, ist aber noch nicht final bestaetigt.';
    }
    if (linkageStatus.value === 'suggested') {
        return 'Hash- oder Pseudo-Patient-Hinweise sind vorhanden, die Zuordnung ist aber noch nicht final.';
    }
    return 'Derzeit liegt noch keine erkennbare Fallverknuepfung vor.';
});
const linkageStatusBadgeClass = computed(() => {
    const classes = {
        not_linked: 'bg-secondary',
        suggested: 'bg-warning text-dark',
        linked: 'bg-success',
        deferred: 'bg-info text-dark'
    };
    return classes[linkageStatus.value];
});
const pseudoPatientDisplay = computed(() => {
    if (pseudoPatientId.value !== null) {
        const matchCount = caseResolution.value?.pseudoPatient?.matchCount;
        return typeof matchCount === 'number' && matchCount > 0
            ? `#${pseudoPatientId.value} (${matchCount} Treffer)`
            : `#${pseudoPatientId.value}`;
    }
    return 'Nicht verknuepft';
});
const patientExaminationDisplay = computed(() => {
    if (linkedPatientExaminationId.value !== null) {
        return `#${linkedPatientExaminationId.value}`;
    }
    const suggestedId = caseResolution.value?.recommendedPatientExaminationId;
    if (typeof suggestedId === 'number' && suggestedId > 0) {
        return `Vorschlag: #${suggestedId}`;
    }
    return 'Noch keine Zuordnung';
});
const caseResolutionRoute = computed(() => {
    const targetFileId = resolveFileIdFromContext();
    const targetScope = sourceMediaScope.value;
    const query = {
        preferredExamination: 'colonoscopy'
    };
    if (targetFileId !== null && targetScope) {
        query.returnTo = `/anonymisierung/validierung?fileId=${targetFileId}&mediaType=${targetScope}`;
    }
    else {
        query.returnTo = '/anonymisierung/validierung';
    }
    return {
        path: '/reporting/case-resolution',
        query
    };
});
async function fetchCaseResolution() {
    const targetFileId = resolveFileIdFromContext();
    const targetScope = sourceMediaScope.value;
    caseResolution.value = null;
    if (targetFileId === null || !targetScope) {
        return;
    }
    const endpoint = targetScope === 'pdf'
        ? endpoints.media.pdfCaseResolution(targetFileId)
        : endpoints.media.videoCaseResolution(targetFileId);
    try {
        const { data } = await axiosInstance.get(r(endpoint));
        caseResolution.value = data;
    }
    catch (error) {
        console.warn('Case resolution lookup failed; falling back to sensitive metadata payload.', error);
    }
}
async function initializeCurrentItemFromRouteContext() {
    const targetFileId = resolveFileIdFromContext();
    const targetScope = sourceMediaScope.value;
    if (targetFileId === null || !targetScope) {
        return false;
    }
    if (!anonymizationStore.overview.length) {
        await anonymizationStore.fetchOverview();
    }
    const loaded = await anonymizationStore.setCurrentForValidation(targetFileId, targetScope);
    return !!loaded;
}
// ✅ NEW: Raw video URL (original unprocessed video)
const rawVideoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    return buildVideoStreamUrl(fileId, 'raw');
});
// ✅ NEW: Anonymized video URL (processed/anonymized video)
const anonymizedVideoSrc = computed(() => {
    if (!isVideo.value || !currentItem.value)
        return undefined;
    return buildVideoStreamUrl(fileId, 'processed');
});
// ✅ NEW: Raw PDF URL (original unprocessed PDF)
const rawPdfSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    return buildPdfStreamUrl(fileId, 'raw');
});
// ✅ NEW: Anonymized PDF URL (processed/anonymized PDF)
const anonymizedPdfSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    return buildPdfStreamUrl(fileId, 'processed');
});
const rawPdfDownloadSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    return buildPdfStreamUrl(fileId, 'raw', { download: 1 });
});
const anonymizedPdfDownloadSrc = computed(() => {
    if (!isPdf.value || !currentItem.value)
        return undefined;
    return buildPdfStreamUrl(fileId, 'processed', { download: 1 });
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
    if (!rawPdfDownloadSrc.value) {
        toast.warning({ text: 'Original-PDF nicht verfügbar.' });
        return;
    }
    window.open(rawPdfDownloadSrc.value, '_blank');
    console.log('Downloading raw PDF:', rawPdfDownloadSrc.value);
};
const downloadAnonymizedPdf = () => {
    if (!anonymizedPdfDownloadSrc.value) {
        toast.warning({ text: 'Anonymisiertes PDF nicht verfügbar.' });
        return;
    }
    window.open(anonymizedPdfDownloadSrc.value, '_blank');
    console.log('Downloading anonymized PDF:', anonymizedPdfDownloadSrc.value);
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
        console.log(`🔍 Validating video ${currentItem.value.id} for segment annotation...`);
        await videoStore.fetchAllSegments(currentItem.value.id, true);
        const outsideSegments = videoStore.allSegments.filter((segment) => segment.videoID === currentItem.value?.id && segment.label === 'outside');
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
        toast.info({ text: `Video ${currentItem.value.id} validiert` });
    }
    catch (error) {
        console.error('Error validating video for segment annotation:', error);
        videoValidationStatus.value = {
            class: 'alert-danger',
            icon: 'fas fa-times-circle',
            title: 'Validierung fehlgeschlagen',
            message: 'Video konnte nicht für Segment-Annotation validiert werden.',
            details: error?.response?.data?.detail || error?.message || 'Unbekannter Fehler'
        };
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
function normalizeDocumentTypeOptions(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((entry) => {
        if (typeof entry === 'string') {
            return { value: entry, label: entry };
        }
        if (entry &&
            typeof entry === 'object' &&
            typeof entry.value === 'string' &&
            typeof entry.label === 'string') {
            return {
                value: entry.value,
                label: entry.label,
            };
        }
        return null;
    })
        .filter((entry) => entry !== null);
}
async function fetchDocumentTypeOptions() {
    if (isLoadingDocumentTypes.value)
        return;
    isLoadingDocumentTypes.value = true;
    documentTypeLoadError.value = '';
    try {
        const response = await axiosInstance.get(r(endpoints.anonymization.documentTypesDropdown));
        const options = normalizeDocumentTypeOptions(response.data);
        documentTypeOptions.value = options;
        if (!options.some((option) => option.value === selectedDocumentType.value)) {
            selectedDocumentType.value = '';
        }
    }
    catch (error) {
        console.error('Error loading document type options:', error);
        documentTypeOptions.value = [];
        documentTypeLoadError.value =
            error?.response?.data?.error ||
                error?.message ||
                'Dokumenttypen konnten nicht geladen werden.';
    }
    finally {
        isLoadingDocumentTypes.value = false;
    }
}
function normalizePatientExaminationOption(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const row = raw;
    const id = toPositiveInteger(row.id);
    if (id === null)
        return null;
    const examinationName = (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
        (typeof row.examination === 'string' && row.examination.trim()) ||
        'Untersuchung';
    const dateStartRaw = typeof row.date_start === 'string' ? row.date_start : '';
    const dateStart = dateStartRaw ? dateStartRaw.split('T')[0] : '';
    return {
        id,
        label: dateStart
            ? `#${id} · ${examinationName} · ${dateStart}`
            : `#${id} · ${examinationName}`,
    };
}
function addOrReplacePatientExaminationOption(target, option) {
    const existingIndex = target.findIndex((entry) => entry.id === option.id);
    if (existingIndex >= 0) {
        target[existingIndex] = option;
        return;
    }
    target.push(option);
}
async function fetchPatientExaminationOptions() {
    if (!isPdf.value) {
        patientExaminationOptions.value = [];
        patientExaminationLoadError.value = '';
        return;
    }
    if (isLoadingPatientExaminations.value)
        return;
    isLoadingPatientExaminations.value = true;
    patientExaminationLoadError.value = '';
    const options = [];
    const pdfFileId = sourceFileId.value;
    if (pdfFileId === null) {
        patientExaminationOptions.value = options;
        patientExaminationLoadError.value =
            'Datei-ID für die Untersuchungsauswahl konnte nicht bestimmt werden.';
        isLoadingPatientExaminations.value = false;
        return;
    }
    try {
        const pdfDetailResponse = await axiosInstance.get(r(endpoints.media.pdfDetail(pdfFileId)));
        const pdfDetail = pdfDetailResponse?.data;
        const suggestedPatientExaminationId = extractPatientExaminationId(pdfDetail) ??
            extractPatientExaminationId(currentItem.value);
        if (suggestedPatientExaminationId !== null) {
            addOrReplacePatientExaminationOption(options, {
                id: suggestedPatientExaminationId,
                label: `#${suggestedPatientExaminationId} · Bereits zugeordnet`,
            });
        }
        const patientId = extractPatientId(pdfDetail) ?? extractPatientId(currentItem.value);
        if (patientId !== null) {
            const peResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationList), { params: { patient_id: patientId } });
            const rows = Array.isArray(peResponse.data?.results)
                ? peResponse.data.results
                : Array.isArray(peResponse.data)
                    ? peResponse.data
                    : [];
            rows.forEach((row) => {
                const normalized = normalizePatientExaminationOption(row);
                if (normalized) {
                    addOrReplacePatientExaminationOption(options, normalized);
                }
            });
        }
        else if (suggestedPatientExaminationId === null) {
            patientExaminationLoadError.value =
                'Keine bestehende Untersuchung automatisch gefunden. Es wird eine neue Untersuchung angelegt.';
        }
        patientExaminationOptions.value = options.sort((a, b) => b.id - a.id);
    }
    catch (error) {
        console.error('Error loading patient examinations for validation:', error);
        patientExaminationOptions.value = options;
        patientExaminationLoadError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Untersuchungen konnten nicht geladen werden.';
    }
    finally {
        isLoadingPatientExaminations.value = false;
    }
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
    documentTypeTouched.value = false;
    patientExaminationLoadError.value = '';
    manualPatientExaminationId.value = '';
    customTagInput.value = '';
    // dates
    const rawExam = item.examinationDate || '';
    const rawDob = item.patientDobDisplay || item.patientDob;
    examinationDate.value = normalizeDateInputToGerman(rawExam);
    const convertedGender = convertGender(item.patientGenderName);
    editedPatient.value = {
        patientFirstName: item.patientFirstName || '',
        patientLastName: item.patientLastName || '',
        patientGenderName: convertedGender || '',
        patientDob: normalizeDateInputToGerman(rawDob),
        casenumber: item.casenumber || '',
        externalId: item.externalId ?? '',
        externalIdOrigin: item.externalIdOrigin ?? '',
        centerName: item.centerName ?? '',
        text: item.text ?? '',
        anonymizedText: item.anonymizedText ?? '',
        examinersDisplay: item.examinersDisplay ?? '',
        examinationDate: examinationDate.value,
    };
    const normalizedAnonymizedText = item.anonymizedText ?? editedPatient.value.anonymizedText ?? item.text ?? '';
    editedAnonymizedText.value = normalizedAnonymizedText;
    editedPatient.value.anonymizedText = normalizedAnonymizedText;
    selectedTags.value = Array.isArray(item.tags)
        ? [...item.tags].map((tag) => normalizeValidationTag(tag)).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : [];
    validationComment.value =
        item.validationComment ??
            item.validation_comment ??
            '';
    const backendDocumentType = item.documentType ??
        item.document_type ??
        '';
    selectedDocumentType.value = typeof backendDocumentType === 'string' ? backendDocumentType : '';
    const backendPatientExaminationId = extractPatientExaminationId(item);
    selectedPatientExaminationOption.value =
        backendPatientExaminationId !== null ? String(backendPatientExaminationId) : '';
    original.value = {
        anonymizedText: editedAnonymizedText.value,
        examinationDate: examinationDate.value,
        tags: [...selectedTags.value],
        validationComment: validationComment.value,
        patient: { ...editedPatient.value },
    };
    validateAllDates();
    // optional: remember last file in sessionStorage
    const persistedFileId = resolveFileIdFromContext();
    if (persistedFileId !== null) {
        sessionStorage.setItem('last:fileId', String(persistedFileId));
    }
}
// Watch
watch(currentItem, async (newItem) => {
    if (!newItem)
        return;
    loadCurrentItemData(newItem);
    await fetchCaseResolution();
    if (isPdf.value) {
        await fetchPatientExaminationOptions();
    }
}, { immediate: true });
watch(isPdf, async (pdfMode) => {
    if (!pdfMode) {
        patientExaminationOptions.value = [];
        selectedPatientExaminationOption.value = '';
        manualPatientExaminationId.value = '';
        return;
    }
    if (documentTypeOptions.value.length === 0) {
        await fetchDocumentTypeOptions();
    }
    await fetchCaseResolution();
    await fetchPatientExaminationOptions();
});
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
    validationComment.value !== original.value.validationComment ||
    !areSortedStringArraysEqual(selectedTags.value, original.value.tags) ||
    !shallowEqual(editedPatient.value, original.value.patient));
// ✅ NEW: Can save computed property
const canSave = computed(() => {
    // Can save if we have a current item and data is not currently being processed
    return currentItem.value && !isApproving.value;
});
// Concurrency guards
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
        if (DateConverter.validate(dobValue, 'German')) {
            dobDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
        }
        else {
            dobDisplayFormat.value = '';
            dobErrorMessage.value = 'Ungültiges Format. Verwenden Sie TT.MM.JJJJ';
            validator.addField('Geburtsdatum', dobValue, 'German'); // Will fail
        }
    }
    else {
        dobDisplayFormat.value = '';
    }
    // Validate Exam Date
    if (examinationDate.value) {
        const examValue = examinationDate.value;
        if (DateConverter.validate(examValue, 'German')) {
            examDateDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
        }
        else {
            examDateDisplayFormat.value = '';
            examDateErrorMessage.value = 'Ungültiges Format. Verwenden Sie TT.MM.JJJJ';
            validator.addField('Untersuchungsdatum', examValue, 'German'); // Will fail
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
    // Normalize to German for consistent UI entry format
    const germanDate = normalizeDateInputToGerman(value);
    if (germanDate) {
        editedPatient.value.patientDob = germanDate;
        dobDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
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
    // Normalize to German for consistent UI entry format
    const germanDate = normalizeDateInputToGerman(value);
    if (germanDate) {
        examinationDate.value = germanDate;
        examDateDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
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
    const videoFileId = resolveFileIdFromContext();
    if (videoFileId === null) {
        toast.error({ text: 'Video-Datei-ID konnte nicht bestimmt werden.' });
        return;
    }
    // Navigate with video ID as query parameter to ensure correct video selection
    router.push({
        name: 'Video-Untersuchung',
        query: { video: String(videoFileId) }
    });
    console.log(`🎯 Navigating to Video-Untersuchung with video ID: ${videoFileId}`);
};
function toPositiveInteger(value) {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value)
            : Number.NaN;
    if (!Number.isFinite(parsed)) {
        return null;
    }
    const normalized = Math.trunc(parsed);
    return normalized > 0 ? normalized : null;
}
function resolveFileIdFromContext() {
    const fromSource = toPositiveInteger(sourceFileId.value);
    if (fromSource !== null) {
        return fromSource;
    }
    return toPositiveInteger(sessionStorage.getItem('last:fileId'));
}
function extractPatientExaminationId(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const obj = payload;
    const directMatch = toPositiveInteger(obj.patient_examination_id ??
        obj.patient_examination ??
        obj.patientExaminationId ??
        obj.examination_id ??
        obj.examinationId);
    if (directMatch !== null) {
        return directMatch;
    }
    const reportFile = obj.report_file;
    if (reportFile && typeof reportFile === 'object') {
        const nestedMatch = extractPatientExaminationId(reportFile);
        if (nestedMatch !== null) {
            return nestedMatch;
        }
    }
    const patientExamination = obj.patient_examination;
    if (patientExamination && typeof patientExamination === 'object') {
        const nestedId = toPositiveInteger(patientExamination.id);
        if (nestedId !== null) {
            return nestedId;
        }
    }
    const caseResolution = obj.case_resolution;
    if (caseResolution && typeof caseResolution === 'object') {
        const nestedId = extractPatientExaminationId(caseResolution);
        if (nestedId !== null) {
            return nestedId;
        }
    }
    return null;
}
function extractPatientId(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const obj = payload;
    const directMatch = toPositiveInteger(obj.patient_id ?? obj.patientId ?? obj.pseudo_patient_id);
    if (directMatch !== null) {
        return directMatch;
    }
    const patientObject = obj.patient;
    if (patientObject && typeof patientObject === 'object') {
        const nestedId = toPositiveInteger(patientObject.id);
        if (nestedId !== null) {
            return nestedId;
        }
    }
    return null;
}
async function resolvePatientExaminationIdForPdf(pdfFileId, validateResponseData) {
    const fromValidateResponse = extractPatientExaminationId(validateResponseData);
    if (fromValidateResponse !== null) {
        return fromValidateResponse;
    }
    const fromCurrentItem = extractPatientExaminationId(currentItem.value);
    if (fromCurrentItem !== null) {
        return fromCurrentItem;
    }
    try {
        const { data: pdfDetail } = await axiosInstance.get(r(endpoints.media.pdfDetail(pdfFileId)));
        const fromPdfDetail = extractPatientExaminationId(pdfDetail);
        if (fromPdfDetail !== null) {
            return fromPdfDetail;
        }
        const patientId = extractPatientId(pdfDetail) ?? extractPatientId(currentItem.value);
        if (patientId === null) {
            return null;
        }
        const { data: timeline } = await axiosInstance.get(r(endpoints.media.patientTimeline(patientId)));
        const results = Array.isArray(timeline?.results) ? timeline.results : [];
        const matchingItem = results.find((item) => {
            if (!item || typeof item !== 'object') {
                return false;
            }
            const entry = item;
            const mediaType = String(entry.media_type ?? '');
            const entryId = toPositiveInteger(entry.id);
            const rawPdfId = toPositiveInteger(entry.raw_pdf_id);
            return ((mediaType === 'pdf' && entryId === pdfFileId) ||
                (mediaType === 'full_report' && rawPdfId === pdfFileId));
        });
        return extractPatientExaminationId(matchingItem);
    }
    catch (error) {
        console.warn('Could not resolve patient_examination_id for PDF deep-link.', error);
        return null;
    }
}
const navigateAfterApproval = async (mediaKind, validateResponseData) => {
    if (mediaKind === 'video') {
        navigateToSegmentation();
        return;
    }
    const explicitPatientExaminationId = selectedPatientExaminationIdForRouting.value;
    if (explicitPatientExaminationId !== null) {
        sessionStorage.setItem('last:patientExaminationId', String(explicitPatientExaminationId));
        await router.push(`/reporting/${explicitPatientExaminationId}/report-editor`);
        toast.info({
            text: `PDF validiert. Gewählte Untersuchung ${explicitPatientExaminationId} im Berichtseditor geöffnet.`,
        });
        return;
    }
    const resolvedPatientExaminationId = await resolvePatientExaminationIdForPdf(resolveFileIdFromContext() ?? 0, validateResponseData);
    if (resolvedPatientExaminationId !== null) {
        sessionStorage.setItem('last:patientExaminationId', String(resolvedPatientExaminationId));
        await router.push(`/reporting/${resolvedPatientExaminationId}/report-editor`);
        toast.info({
            text: `PDF validiert. Patientenfall ${resolvedPatientExaminationId} wurde automatisch zugeordnet und im Berichtseditor geöffnet.`,
        });
        return;
    }
    await fetchCaseResolution();
    await router.push(caseResolutionRoute.value);
    toast.warning({
        text: 'Die automatische Fallzuordnung war nicht eindeutig. Bitte pruefen Sie den Ausnahmefall.',
    });
};
const approveItem = async () => {
    if (!currentItem.value || !canSave.value || isApproving.value)
        return;
    documentTypeTouched.value = true;
    editedPatient.value.anonymizedText = editedAnonymizedText.value;
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
    const mediaKind = sourceMediaScope.value === 'pdf' || sourceMediaScope.value === 'video'
        ? sourceMediaScope.value
        : isPdf.value
            ? 'pdf'
            : isVideo.value
                ? 'video'
                : 'unknown';
    if (mediaKind === 'unknown') {
        toast.error({ text: 'Bitte Medientyp auswählen, bevor bestätigt wird.' });
        return;
    }
    const validationPayload = {
        patient_first_name: editedPatient.value.patientFirstName,
        patient_last_name: editedPatient.value.patientLastName,
        patient_gender: editedPatient.value.patientGenderName,
        patient_dob: DateConverter.toGerman(dobISO.value || '') || '',
        examination_date: DateConverter.toGerman(examISO.value || '') || '',
        casenumber: editedPatient.value.casenumber || '',
        anonymized_text: editedAnonymizedText.value || undefined,
        text: editedPatient.value.text || undefined,
        is_verified: 'true',
        file_type: mediaKind,
        center_name: editedPatient.value.centerName || '',
        external_id: editedPatient.value.externalId || '',
        external_id_origin: editedPatient.value.externalIdOrigin || '',
        tags: selectedTags.value,
        validation_comment: validationComment.value || '',
    };
    if (isPdf.value) {
        validationPayload.document_type = selectedDocumentType.value;
    }
    const validationFileId = resolveFileIdFromContext();
    if (validationFileId === null) {
        toast.error({ text: 'Datei-ID konnte nicht bestimmt werden. Bitte Datei aus der Übersicht erneut öffnen.' });
        return;
    }
    isApproving.value = true;
    try {
        console.log(`Validating anonymization for file ${validationFileId}...`);
        const response = await axiosInstance.post(r(endpoints.anonymization.validate(validationFileId)), validationPayload);
        const reportFileId = response?.data?.report_file?.id;
        if (typeof reportFileId === 'number') {
            sessionStorage.setItem('last:reportFileId', String(reportFileId));
        }
        console.log(`Anonymization validated successfully for file ${validationFileId}`);
        toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });
        await navigateAfterApproval(mediaKind, response?.data);
    }
    catch (error) {
        console.error('Error approving item:', error);
        const allowedTypes = normalizeDocumentTypeOptions(error?.response?.data?.allowed_document_types);
        if (allowedTypes.length > 0) {
            documentTypeOptions.value = allowedTypes;
        }
        const backendMessage = error?.response?.data?.error;
        toast.error({
            text: backendMessage
                ? `Fehler beim Bestätigen: ${backendMessage}`
                : 'Fehler beim Bestätigen des Elements',
        });
    }
    finally {
        isApproving.value = false;
    }
};
const saveAnnotation = async () => {
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
        const correctionFileId = resolveFileIdFromContext();
        if (correctionFileId === null) {
            toast.error({ text: 'Datei-ID für Korrektur konnte nicht bestimmt werden.' });
            return;
        }
        router.push({ name: 'Anonymisierung Korrektur', params: { fileId: String(correctionFileId) } });
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
    if (isPdf.value) {
        await fetchDocumentTypeOptions();
    }
    if (Number.isFinite(fileId) && scope) {
        mediaStore.setCurrentByKey(scope, fileId);
    }
    const initializedFromRoute = await initializeCurrentItemFromRouteContext();
    if (!initializedFromRoute && !anonymizationStore.current) {
        await fetchNextItem();
    }
    else if (anonymizationStore.current) {
        loadCurrentItemData(anonymizationStore.current);
        await fetchCaseResolution();
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
        type: "text",
        ...{ class: "form-control" },
        value: (__VLS_ctx.editedPatient.patientDob),
        ...{ class: ({ 'is-invalid': !__VLS_ctx.isDobValid }) },
        placeholder: "TT.MM.JJJJ",
        inputmode: "numeric",
        autocomplete: "bday",
    });
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
        type: "text",
        ...{ class: "form-control" },
        value: (__VLS_ctx.examinationDate),
        ...{ class: ({ 'is-invalid': !__VLS_ctx.isExaminationDateValid }) },
        placeholder: "TT.MM.JJJJ",
        inputmode: "numeric",
        autocomplete: "off",
    });
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
    if (__VLS_ctx.isPdf) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: "form-select" },
            value: (__VLS_ctx.selectedDocumentType),
            ...{ class: ({ 'is-invalid': __VLS_ctx.documentTypeTouched && !__VLS_ctx.hasValidDocumentType }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
            disabled: true,
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.documentTypeOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        if (__VLS_ctx.isLoadingDocumentTypes) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "form-text text-muted" },
            });
        }
        else if (__VLS_ctx.documentTypeLoadError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "form-text text-danger" },
            });
            (__VLS_ctx.documentTypeLoadError);
        }
        if (__VLS_ctx.documentTypeTouched && !__VLS_ctx.hasValidDocumentType) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "invalid-feedback" },
            });
        }
    }
    if (__VLS_ctx.isPdf) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: "form-select" },
            value: (__VLS_ctx.selectedPatientExaminationOption),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.patientExaminationOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.id),
                value: (String(option.id)),
            });
            (option.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "__manual__",
        });
        if (__VLS_ctx.selectedPatientExaminationOption === '__manual__') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: "number",
                min: "1",
                step: "1",
                ...{ class: "form-control mt-2" },
                placeholder: "PatientExamination-ID eingeben",
            });
            (__VLS_ctx.manualPatientExaminationId);
        }
        if (__VLS_ctx.isLoadingPatientExaminations) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "form-text text-muted" },
            });
        }
        else if (__VLS_ctx.patientExaminationLoadError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "form-text text-danger" },
            });
            (__VLS_ctx.patientExaminationLoadError);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "form-text text-muted d-block mt-1" },
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
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2 mb-2" },
    });
    for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.presetValidationTags))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.currentItem))
                        return;
                    __VLS_ctx.toggleValidationTag(tag);
                } },
            key: (tag),
            type: "button",
            ...{ class: "btn btn-sm" },
            ...{ class: (__VLS_ctx.selectedTags.includes(tag) ? 'btn-primary' : 'btn-outline-primary') },
        });
        (tag);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "input-group mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onKeyup: (__VLS_ctx.addCustomValidationTag) },
        value: (__VLS_ctx.customTagInput),
        type: "text",
        ...{ class: "form-control" },
        placeholder: "Eigenen Tag eingeben",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addCustomValidationTag) },
        type: "button",
        ...{ class: "btn btn-outline-secondary" },
    });
    if (__VLS_ctx.selectedTags.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-wrap gap-2" },
        });
        for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.selectedTags))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (tag),
                ...{ class: "badge bg-secondary d-inline-flex align-items-center gap-1" },
            });
            (tag);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.currentItem))
                            return;
                        if (!(__VLS_ctx.selectedTags.length))
                            return;
                        __VLS_ctx.removeValidationTag(tag);
                    } },
                type: "button",
                ...{ class: "btn-close btn-close-white btn-close-sm" },
                'aria-label': "Tag entfernen",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ class: "form-control" },
        rows: "3",
        value: (__VLS_ctx.validationComment),
        placeholder: "Freitext für Hinweise wie Nachkontrolle oder Ausschluss",
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 text-center" },
        });
        if (__VLS_ctx.rawPdfSrc) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ class: "btn btn-outline-danger btn-sm" },
                href: (__VLS_ctx.rawPdfSrc),
                target: "_blank",
                rel: "noopener noreferrer",
            });
        }
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 text-center" },
        });
        if (__VLS_ctx.anonymizedPdfSrc) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ class: "btn btn-outline-success btn-sm" },
                href: (__VLS_ctx.anonymizedPdfSrc),
                target: "_blank",
                rel: "noopener noreferrer",
            });
        }
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card border-light-subtle shadow-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "card-title mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge" },
        ...{ class: (__VLS_ctx.linkageStatusBadgeClass) },
    });
    (__VLS_ctx.linkageStatusLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-value" },
    });
    (__VLS_ctx.pseudoPatientDisplay);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-value" },
    });
    (__VLS_ctx.patientExaminationDisplay);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "linkage-meta-value" },
    });
    (__VLS_ctx.linkageStatusDescription);
    if (__VLS_ctx.isDebug) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linkage-meta-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linkage-meta-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linkage-meta-value" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.patientHashDisplay || 'Nicht verfuegbar');
    }
    if (__VLS_ctx.isDebug) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linkage-meta-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linkage-meta-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linkage-meta-value" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.examinationHashDisplay || 'Nicht verfuegbar');
    }
    if (__VLS_ctx.linkageStatus !== 'linked') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-secondary mt-3 mb-0" },
            role: "alert",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 d-flex flex-wrap gap-2" },
        });
        const __VLS_12 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.caseResolutionRoute),
        }));
        const __VLS_14 = __VLS_13({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.caseResolutionRoute),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_15.slots.default;
        var __VLS_15;
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
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
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
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['input-group']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['d-inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close-white']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close-sm']} */ ;
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
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
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
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
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
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border-light-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-box']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-box']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-box']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-box']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-box']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-label']} */ ;
/** @type {__VLS_StyleScopedClasses['linkage-meta-value']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            OutsideTimelineComponent: OutsideTimelineComponent,
            isDebug: isDebug,
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
            presetValidationTags: presetValidationTags,
            selectedTags: selectedTags,
            customTagInput: customTagInput,
            validationComment: validationComment,
            documentTypeOptions: documentTypeOptions,
            selectedDocumentType: selectedDocumentType,
            isLoadingDocumentTypes: isLoadingDocumentTypes,
            documentTypeLoadError: documentTypeLoadError,
            documentTypeTouched: documentTypeTouched,
            patientExaminationOptions: patientExaminationOptions,
            selectedPatientExaminationOption: selectedPatientExaminationOption,
            manualPatientExaminationId: manualPatientExaminationId,
            isLoadingPatientExaminations: isLoadingPatientExaminations,
            patientExaminationLoadError: patientExaminationLoadError,
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
            toggleValidationTag: toggleValidationTag,
            removeValidationTag: removeValidationTag,
            addCustomValidationTag: addCustomValidationTag,
            firstNameOk: firstNameOk,
            lastNameOk: lastNameOk,
            validationErrorSummary: validationErrorSummary,
            isDobValid: isDobValid,
            isExaminationDateValid: isExaminationDateValid,
            hasValidDocumentType: hasValidDocumentType,
            canApprove: canApprove,
            approvalBlockReason: approvalBlockReason,
            validationProgressPercent: validationProgressPercent,
            currentItem: currentItem,
            patientHashDisplay: patientHashDisplay,
            examinationHashDisplay: examinationHashDisplay,
            linkageStatus: linkageStatus,
            linkageStatusLabel: linkageStatusLabel,
            linkageStatusDescription: linkageStatusDescription,
            linkageStatusBadgeClass: linkageStatusBadgeClass,
            pseudoPatientDisplay: pseudoPatientDisplay,
            patientExaminationDisplay: patientExaminationDisplay,
            caseResolutionRoute: caseResolutionRoute,
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
            isApproving: isApproving,
            toggleImage: toggleImage,
            onDobBlur: onDobBlur,
            onExamDateBlur: onExamDateBlur,
            clearValidationErrors: clearValidationErrors,
            skipItem: skipItem,
            approveItem: approveItem,
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
