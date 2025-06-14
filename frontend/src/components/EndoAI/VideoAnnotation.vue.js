import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import AnonymizationValidator from '../VideoAnnotation/AnonymizationValidator.vue';
import VideoUpload from './VideoUpload.vue';
// Reactive state
const currentVideoData = ref(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const videoError = ref('');
const lastProcessedId = ref(null);
// Video player state
const currentTime = ref(0);
const duration = ref(0);
const videoRef = ref(null);
// Patient editing state
const editingPatientInfo = ref(false);
const editablePatientData = ref({});
const generatingPseudonyms = ref(false);
// Computed properties
const currentVideoStreamUrl = computed(() => {
    if (!currentVideoData.value?.id)
        return '';
    return `/api/videostream/${currentVideoData.value.id}/`;
});
const annotationStatusText = computed(() => {
    const status = currentVideoData.value?.anonymization_status;
    switch (status) {
        case 'anonymized': return 'Anonymisiert';
        case 'validated_pending_anonymization': return 'Validiert - Anonymisierung ausstehend';
        case 'pending_validation': return 'Validierung erforderlich';
        case 'no_sensitive_data': return 'Keine sensitiven Daten';
        default: return 'Status unbekannt';
    }
});
const annotationStatusClass = computed(() => {
    const status = currentVideoData.value?.anonymization_status;
    switch (status) {
        case 'anonymized': return 'badge bg-success';
        case 'validated_pending_anonymization': return 'badge bg-warning';
        case 'pending_validation': return 'badge bg-danger';
        case 'no_sensitive_data': return 'badge bg-info';
        default: return 'badge bg-secondary';
    }
});
const annotationStatusIcon = computed(() => {
    const status = currentVideoData.value?.anonymization_status;
    switch (status) {
        case 'anonymized': return 'fas fa-check-circle';
        case 'validated_pending_anonymization': return 'fas fa-clock';
        case 'pending_validation': return 'fas fa-exclamation-triangle';
        case 'no_sensitive_data': return 'fas fa-info-circle';
        default: return 'fas fa-question-circle';
    }
});
const hasPatientChanges = computed(() => {
    if (!currentVideoData.value || !editablePatientData.value)
        return false;
    return (editablePatientData.value.patient_first_name !== currentVideoData.value.patient_first_name ||
        editablePatientData.value.patient_last_name !== currentVideoData.value.patient_last_name ||
        editablePatientData.value.patient_dob !== currentVideoData.value.patient_dob ||
        editablePatientData.value.examination_date !== currentVideoData.value.examination_date);
});
const isExaminationDateValid = computed(() => {
    if (!editablePatientData.value.examination_date || !editablePatientData.value.patient_dob)
        return true;
    return new Date(editablePatientData.value.examination_date) >= new Date(editablePatientData.value.patient_dob);
});
const canMarkAsValidated = computed(() => {
    return currentVideoData.value && !editingPatientInfo.value;
});
const canApprove = computed(() => {
    return currentVideoData.value && !editingPatientInfo.value && isExaminationDateValid.value;
});
// Methods
async function loadNextVideo() {
    try {
        loading.value = true;
        error.value = '';
        videoError.value = '';
        // Build URL with last_id parameter if we have processed a video before
        const url = lastProcessedId.value
            ? `/api/video/sensitivemeta/?last_id=${lastProcessedId.value}`
            : '/api/video/sensitivemeta/';
        const response = await axios.get(url, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.data) {
            currentVideoData.value = response.data;
            // Generate pseudonyms if needed
            if (response.data.requires_validation && !response.data.pseudonym_first_name) {
                await generateNewPseudonyms();
            }
        }
    }
    catch (err) {
        console.error('Error loading video metadata:', err);
        if (err.response?.status === 404) {
            currentVideoData.value = null;
            error.value = 'Keine weiteren Videos zur Annotation verfügbar.';
        }
        else if (err.response?.status === 400) {
            // Handle the 400 error by showing a helpful message
            const errorDetails = err.response?.data?.details;
            if (errorDetails) {
                const missingFields = Object.keys(errorDetails);
                error.value = `Video-Metadaten unvollständig. Fehlende Felder: ${missingFields.join(', ')}. Bitte Videos über das Dashboard mit vollständigen Patientendaten hochladen.`;
            }
            else {
                error.value = 'Video-Metadaten unvollständig oder fehlerhaft. Bitte prüfen Sie die hochgeladenen Videos.';
            }
            currentVideoData.value = null;
        }
        else {
            error.value = err.response?.data?.error || err.message || 'Fehler beim Laden der Video-Metadaten';
        }
    }
    finally {
        loading.value = false;
    }
}
function startEditingPatientInfo() {
    if (currentVideoData.value) {
        editablePatientData.value = {
            patient_first_name: currentVideoData.value.patient_first_name,
            patient_last_name: currentVideoData.value.patient_last_name,
            patient_dob: currentVideoData.value.patient_dob,
            examination_date: currentVideoData.value.examination_date,
        };
        editingPatientInfo.value = true;
    }
}
function cancelEditingPatientInfo() {
    editingPatientInfo.value = false;
    editablePatientData.value = {};
}
async function savePatientInfo() {
    if (!currentVideoData.value?.sensitive_meta_id || !hasPatientChanges.value)
        return;
    try {
        loading.value = true;
        error.value = '';
        const updateData = {
            sensitive_meta_id: currentVideoData.value.sensitive_meta_id,
            ...editablePatientData.value
        };
        await axios.patch('/api/video/update_sensitivemeta/', updateData);
        // Update current data
        Object.assign(currentVideoData.value, editablePatientData.value);
        editingPatientInfo.value = false;
        successMessage.value = 'Patienteninformationen erfolgreich aktualisiert!';
        // Clear success message after 5 seconds
        setTimeout(() => {
            successMessage.value = '';
        }, 5000);
    }
    catch (err) {
        error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern der Patienteninformationen';
    }
    finally {
        loading.value = false;
    }
}
async function generateNewPseudonyms() {
    if (!currentVideoData.value?.sensitive_meta_id)
        return;
    try {
        generatingPseudonyms.value = true;
        error.value = '';
        const response = await axios.post('/api/generate-temporary-pseudonym/', {
            sensitive_meta_id: currentVideoData.value.sensitive_meta_id,
            regenerate: true
        });
        if (response.data) {
            // Update current video data with new pseudonyms
            if (currentVideoData.value) {
                currentVideoData.value.pseudonym_first_name = response.data.pseudonym_first_name;
                currentVideoData.value.pseudonym_last_name = response.data.pseudonym_last_name;
            }
            successMessage.value = 'Temporäre Pseudonamen generiert!';
            setTimeout(() => { successMessage.value = ''; }, 3000);
        }
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Generieren der Pseudonamen';
    }
    finally {
        generatingPseudonyms.value = false;
    }
}
async function markAsValidated() {
    // This would mark the current video as validated and move to next
    successMessage.value = 'Video als validiert markiert!';
    setTimeout(() => { successMessage.value = ''; }, 2000);
    await loadNextVideo();
}
async function skipVideo() {
    if (currentVideoData.value) {
        lastProcessedId.value = currentVideoData.value.id;
    }
    await loadNextVideo();
}
async function rejectVideo() {
    // This would mark the video as problematic
    successMessage.value = 'Video als problematisch markiert!';
    setTimeout(() => { successMessage.value = ''; }, 2000);
    await skipVideo();
}
async function approveAndNext() {
    if (currentVideoData.value) {
        lastProcessedId.value = currentVideoData.value.id;
        successMessage.value = 'Video erfolgreich validiert!';
        setTimeout(() => { successMessage.value = ''; }, 2000);
    }
    await loadNextVideo();
}
// Anonymization validation event handlers
function onValidationCompleted() {
    successMessage.value = 'Anonymisierungsvalidierung erfolgreich abgeschlossen!';
    if (currentVideoData.value) {
        currentVideoData.value.requires_validation = false;
    }
    setTimeout(() => { successMessage.value = ''; }, 5000);
}
function onCroppingRequired() {
    error.value = 'Video-Cropping erforderlich! Sensitive Daten wurden im Video-Frame gefunden.';
    setTimeout(() => { error.value = ''; }, 10000);
}
function onPatientDataUpdated(updatedData) {
    if (currentVideoData.value) {
        Object.assign(currentVideoData.value, updatedData);
    }
}
// Video player handlers
function onVideoLoaded() {
    if (videoRef.value) {
        duration.value = videoRef.value.duration;
        videoError.value = '';
    }
}
function handleVideoError(event) {
    console.error('Video error:', event);
    videoError.value = 'Video konnte nicht geladen werden. Überprüfen Sie die Datei und Berechtigungen.';
}
function handleTimeUpdate() {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
    }
}
// Handle video upload completion
function onVideoUploaded(videoId) {
    successMessage.value = `Video ${videoId} erfolgreich hochgeladen und bereit für Annotation!`;
    setTimeout(() => { successMessage.value = ''; }, 5000);
    // Reload to get the new video for annotation
    loadNextVideo();
}
// Utility functions
function formatTime(seconds) {
    if (Number.isNaN(seconds) || seconds === null || seconds === undefined)
        return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function formatDate(dateString) {
    if (!dateString)
        return 'Nicht angegeben';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }
    catch (error) {
        return 'Ungültiges Datum';
    }
}
function formatDuration(durationSeconds) {
    if (!durationSeconds || Number.isNaN(durationSeconds))
        return 'Unbekannt';
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} min`;
}
// Load initial data on mount
onMounted(() => {
    loadNextVideo();
});
// Load initial data on mount
onMounted(() => {
    loadNextVideo();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['loading-container', 'video-annotation-container', 'header-actions', 'text-end', 'action-buttons',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("video-annotation-container") },
    });
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.error)))
                        return;
                    __VLS_ctx.error = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.successMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.successMessage)))
                        return;
                    __VLS_ctx.successMessage = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("loading-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (!__VLS_ctx.currentVideoData) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-video-slash fa-3x") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    else if (!__VLS_ctx.currentVideoData && !__VLS_ctx.loading) {
        // @ts-ignore
        /** @type { [typeof VideoUpload, ] } */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(VideoUpload, new VideoUpload({
            ...{ 'onVideoUploaded': {} },
            ...{ 'onBackToAnnotation': {} },
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onVideoUploaded': {} },
            ...{ 'onBackToAnnotation': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onVideoUploaded: (__VLS_ctx.onVideoUploaded)
        };
        const __VLS_7 = {
            onBackToAnnotation: (__VLS_ctx.loadNextVideo)
        };
        let __VLS_2;
        let __VLS_3;
        var __VLS_4;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-info-section mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user-md") },
        });
        if (__VLS_ctx.currentVideoData.pseudonym_first_name) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-info ms-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-user-secret") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("header-actions") },
        });
        if (!__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.startEditingPatientInfo) },
                ...{ class: ("btn btn-outline-primary btn-sm") },
                disabled: ((__VLS_ctx.loading)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
        }
        if (__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.savePatientInfo) },
                ...{ class: ("btn btn-success btn-sm me-2") },
                disabled: ((__VLS_ctx.loading || !__VLS_ctx.hasPatientChanges)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-save") },
            });
        }
        if (__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelEditingPatientInfo) },
                ...{ class: ("btn btn-secondary btn-sm") },
                disabled: ((__VLS_ctx.loading)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-times") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        if (__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                value: ((__VLS_ctx.editablePatientData.patient_first_name)),
                type: ("text"),
                ...{ class: ("form-control form-control-sm") },
                placeholder: ("Vorname eingeben"),
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patient-data-display") },
            });
            (__VLS_ctx.currentVideoData.patient_first_name || 'Nicht angegeben');
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        if (__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                value: ((__VLS_ctx.editablePatientData.patient_last_name)),
                type: ("text"),
                ...{ class: ("form-control form-control-sm") },
                placeholder: ("Nachname eingeben"),
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patient-data-display") },
            });
            (__VLS_ctx.currentVideoData.patient_last_name || 'Nicht angegeben');
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        if (__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                type: ("date"),
                ...{ class: ("form-control form-control-sm") },
            });
            (__VLS_ctx.editablePatientData.patient_dob);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patient-data-display") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.currentVideoData.patient_dob));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        if (__VLS_ctx.editingPatientInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                type: ("date"),
                ...{ class: ("form-control form-control-sm") },
                ...{ class: (({ 'is-invalid': !__VLS_ctx.isExaminationDateValid })) },
            });
            (__VLS_ctx.editablePatientData.examination_date);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patient-data-display") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.currentVideoData.examination_date));
        }
        if (__VLS_ctx.editingPatientInfo && !__VLS_ctx.isExaminationDateValid) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("invalid-feedback") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-data-display") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("font-mono") },
        });
        (__VLS_ctx.currentVideoData.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-data-display") },
        });
        (__VLS_ctx.formatDuration(__VLS_ctx.currentVideoData.duration));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-data-display") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.annotationStatusClass)) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ((__VLS_ctx.annotationStatusIcon)) },
        });
        (__VLS_ctx.annotationStatusText);
        if (__VLS_ctx.currentVideoData.pseudonym_first_name) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3 pt-3 border-top") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("text-muted mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-user-secret") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("pseudo-data") },
            });
            (__VLS_ctx.currentVideoData.pseudonym_first_name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("pseudo-data") },
            });
            (__VLS_ctx.currentVideoData.pseudonym_last_name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.generateNewPseudonyms) },
                ...{ class: ("btn btn-outline-secondary btn-sm") },
                disabled: ((__VLS_ctx.generatingPseudonyms)),
            });
            if (__VLS_ctx.generatingPseudonyms) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("spinner-border spinner-border-sm me-1") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-refresh") },
                });
            }
        }
        if (__VLS_ctx.currentVideoData.requires_validation) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("anonymization-section") },
            });
            // @ts-ignore
            /** @type { [typeof AnonymizationValidator, ] } */ ;
            // @ts-ignore
            const __VLS_8 = __VLS_asFunctionalComponent(AnonymizationValidator, new AnonymizationValidator({
                ...{ 'onValidationCompleted': {} },
                ...{ 'onCroppingRequired': {} },
                ...{ 'onPatientDataUpdated': {} },
                videoId: ((__VLS_ctx.currentVideoData.id)),
                patientData: ((__VLS_ctx.currentVideoData)),
                maxFrames: ((1000)),
            }));
            const __VLS_9 = __VLS_8({
                ...{ 'onValidationCompleted': {} },
                ...{ 'onCroppingRequired': {} },
                ...{ 'onPatientDataUpdated': {} },
                videoId: ((__VLS_ctx.currentVideoData.id)),
                patientData: ((__VLS_ctx.currentVideoData)),
                maxFrames: ((1000)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_8));
            let __VLS_13;
            const __VLS_14 = {
                onValidationCompleted: (__VLS_ctx.onValidationCompleted)
            };
            const __VLS_15 = {
                onCroppingRequired: (__VLS_ctx.onCroppingRequired)
            };
            const __VLS_16 = {
                onPatientDataUpdated: (__VLS_ctx.onPatientDataUpdated)
            };
            let __VLS_10;
            let __VLS_11;
            var __VLS_12;
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-video") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.currentVideoStreamUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
                ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
                ...{ onError: (__VLS_ctx.handleVideoError) },
                ref: ("videoRef"),
                src: ((__VLS_ctx.currentVideoStreamUrl)),
                controls: (true),
                ...{ class: ("video-player mb-3") },
            });
            // @ts-ignore navigation for `const videoRef = ref()`
            /** @type { typeof __VLS_ctx.videoRef } */ ;
        }
        if (__VLS_ctx.videoError) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-exclamation-triangle") },
            });
            (__VLS_ctx.videoError);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-controls") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-8") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-clock") },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4 text-end") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.markAsValidated) },
            ...{ class: ("btn btn-success btn-sm") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.canMarkAsValidated)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-buttons mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 d-flex justify-content-between") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.skipVideo) },
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-step-forward") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.rejectVideo) },
            ...{ class: ("btn btn-warning me-2") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-times") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.approveAndNext) },
            ...{ class: ("btn btn-success") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.canApprove)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-double") },
        });
    }
    ['video-annotation-container', 'alert', 'alert-danger', 'alert-dismissible', 'btn-close', 'alert', 'alert-success', 'alert-dismissible', 'btn-close', 'loading-container', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'py-5', 'fas', 'fa-video-slash', 'fa-3x', 'mt-2', 'row', 'col-md-6', 'patient-info-section', 'mb-4', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-user-md', 'badge', 'bg-info', 'ms-2', 'fas', 'fa-user-secret', 'header-actions', 'btn', 'btn-outline-primary', 'btn-sm', 'fas', 'fa-edit', 'btn', 'btn-success', 'btn-sm', 'me-2', 'fas', 'fa-save', 'btn', 'btn-secondary', 'btn-sm', 'fas', 'fa-times', 'card-body', 'row', 'mb-3', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'patient-data-display', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'patient-data-display', 'row', 'mb-3', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'patient-data-display', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'is-invalid', 'patient-data-display', 'invalid-feedback', 'row', 'col-md-4', 'form-label', 'text-muted', 'patient-data-display', 'font-mono', 'col-md-4', 'form-label', 'text-muted', 'patient-data-display', 'col-md-4', 'form-label', 'text-muted', 'patient-data-display', 'mt-3', 'pt-3', 'border-top', 'text-muted', 'mb-2', 'fas', 'fa-user-secret', 'row', 'col-md-4', 'text-muted', 'pseudo-data', 'col-md-4', 'text-muted', 'pseudo-data', 'col-md-4', 'btn', 'btn-outline-secondary', 'btn-sm', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-refresh', 'anonymization-section', 'col-md-6', 'card', 'card-header', 'mb-0', 'fas', 'fa-video', 'card-body', 'video-player', 'mb-3', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'video-controls', 'row', 'align-items-center', 'col-md-8', 'text-muted', 'fas', 'fa-clock', 'col-md-4', 'text-end', 'btn', 'btn-success', 'btn-sm', 'fas', 'fa-check', 'action-buttons', 'mt-4', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'fas', 'fa-step-forward', 'btn', 'btn-warning', 'me-2', 'fas', 'fa-times', 'btn', 'btn-success', 'fas', 'fa-check-double',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
    };
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
            AnonymizationValidator: AnonymizationValidator,
            VideoUpload: VideoUpload,
            currentVideoData: currentVideoData,
            loading: loading,
            error: error,
            successMessage: successMessage,
            videoError: videoError,
            currentTime: currentTime,
            duration: duration,
            videoRef: videoRef,
            editingPatientInfo: editingPatientInfo,
            editablePatientData: editablePatientData,
            generatingPseudonyms: generatingPseudonyms,
            currentVideoStreamUrl: currentVideoStreamUrl,
            annotationStatusText: annotationStatusText,
            annotationStatusClass: annotationStatusClass,
            annotationStatusIcon: annotationStatusIcon,
            hasPatientChanges: hasPatientChanges,
            isExaminationDateValid: isExaminationDateValid,
            canMarkAsValidated: canMarkAsValidated,
            canApprove: canApprove,
            loadNextVideo: loadNextVideo,
            startEditingPatientInfo: startEditingPatientInfo,
            cancelEditingPatientInfo: cancelEditingPatientInfo,
            savePatientInfo: savePatientInfo,
            generateNewPseudonyms: generateNewPseudonyms,
            markAsValidated: markAsValidated,
            skipVideo: skipVideo,
            rejectVideo: rejectVideo,
            approveAndNext: approveAndNext,
            onValidationCompleted: onValidationCompleted,
            onCroppingRequired: onCroppingRequired,
            onPatientDataUpdated: onPatientDataUpdated,
            onVideoLoaded: onVideoLoaded,
            handleVideoError: handleVideoError,
            handleTimeUpdate: handleTimeUpdate,
            onVideoUploaded: onVideoUploaded,
            formatTime: formatTime,
            formatDate: formatDate,
            formatDuration: formatDuration,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
