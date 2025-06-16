import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
// Reactive state
const currentPdfData = ref(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const pdfError = ref('');
const lastProcessedId = ref(null);
// Patient editing state
const editingPatientInfo = ref(false);
const editablePatientData = ref({});
// Anonymized text editing state
const editingAnonymizedText = ref(false);
const editableAnonymizedText = ref('');
// Verification state
const verificationState = ref({
    dob_verified: false,
    names_verified: false
});
const originalVerificationState = ref({
    dob_verified: false,
    names_verified: false
});
// Computed properties
const currentPdfStreamUrl = computed(() => {
    if (!currentPdfData.value?.pdf_url)
        return '';
    return currentPdfData.value.pdf_url;
});
const verificationStatusText = computed(() => {
    const both = verificationState.value.dob_verified && verificationState.value.names_verified;
    if (both)
        return 'Vollständig verifiziert';
    if (verificationState.value.dob_verified || verificationState.value.names_verified)
        return 'Teilweise verifiziert';
    return 'Nicht verifiziert';
});
const annotationStatusText = computed(() => {
    const status = currentPdfData.value?.verification_status;
    switch (status) {
        case 'verified': return 'Verifiziert';
        case 'pending': return 'Validierung ausstehend';
        case 'rejected': return 'Abgelehnt';
        case 'approved': return 'Genehmigt';
        default: return 'Status unbekannt';
    }
});
const annotationStatusClass = computed(() => {
    const status = currentPdfData.value?.verification_status;
    switch (status) {
        case 'verified': return 'badge bg-success';
        case 'approved': return 'badge bg-success';
        case 'pending': return 'badge bg-warning';
        case 'rejected': return 'badge bg-danger';
        default: return 'badge bg-secondary';
    }
});
const annotationStatusIcon = computed(() => {
    const status = currentPdfData.value?.verification_status;
    switch (status) {
        case 'verified': return 'fas fa-check-circle';
        case 'approved': return 'fas fa-check-circle';
        case 'pending': return 'fas fa-clock';
        case 'rejected': return 'fas fa-times-circle';
        default: return 'fas fa-question-circle';
    }
});
const hasPatientChanges = computed(() => {
    if (!currentPdfData.value || !editablePatientData.value)
        return false;
    return (editablePatientData.value.patient_first_name !== currentPdfData.value.patient_first_name ||
        editablePatientData.value.patient_last_name !== currentPdfData.value.patient_last_name ||
        editablePatientData.value.patient_dob !== currentPdfData.value.patient_dob ||
        editablePatientData.value.examination_date !== currentPdfData.value.examination_date);
});
const hasAnonymizedTextChanges = computed(() => {
    return editableAnonymizedText.value !== (currentPdfData.value?.anonymized_text || '');
});
const hasVerificationChanges = computed(() => {
    return (verificationState.value.dob_verified !== originalVerificationState.value.dob_verified ||
        verificationState.value.names_verified !== originalVerificationState.value.names_verified);
});
const isExaminationDateValid = computed(() => {
    if (!editablePatientData.value.examination_date || !editablePatientData.value.patient_dob)
        return true;
    return new Date(editablePatientData.value.examination_date) >= new Date(editablePatientData.value.patient_dob);
});
const canApprove = computed(() => {
    return currentPdfData.value && !editingPatientInfo.value && !editingAnonymizedText.value && isExaminationDateValid.value;
});
// Methods
async function loadNextPdf() {
    try {
        loading.value = true;
        error.value = '';
        pdfError.value = '';
        // Build URL with last_id parameter if we have processed a PDF before
        const url = lastProcessedId.value
            ? `/api/pdf/sensitivemeta/?last_id=${lastProcessedId.value}`
            : '/api/pdf/sensitivemeta/';
        const response = await axios.get(url, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.data) {
            currentPdfData.value = response.data;
            // Initialize verification state from SensitiveMeta
            if (response.data.sensitive_meta_id) {
                await loadSensitiveMetaData(response.data.sensitive_meta_id);
            }
            // Load anonymized text if available
            if (response.data.id) {
                await loadAnonymizedText(response.data.id);
            }
        }
    }
    catch (err) {
        console.error('Error loading PDF metadata:', err);
        if (err.response?.status === 404) {
            currentPdfData.value = null;
            error.value = 'Keine weiteren PDFs zur Annotation verfügbar.';
        }
        else if (err.response?.status === 400) {
            const errorDetails = err.response?.data?.details;
            if (errorDetails) {
                const missingFields = Object.keys(errorDetails);
                error.value = `PDF-Metadaten unvollständig. Fehlende Felder: ${missingFields.join(', ')}. Bitte PDFs über das Dashboard mit vollständigen Patientendaten hochladen.`;
            }
            else {
                error.value = 'PDF-Metadaten unvollständig oder fehlerhaft. Bitte prüfen Sie die hochgeladenen PDFs.';
            }
            currentPdfData.value = null;
        }
        else {
            error.value = err.response?.data?.error || err.message || 'Fehler beim Laden der PDF-Metadaten';
        }
    }
    finally {
        loading.value = false;
    }
}
async function loadSensitiveMetaData(sensitiveMetaId) {
    try {
        const response = await axios.get(`/api/sensitive-meta/${sensitiveMetaId}/`);
        if (response.data?.sensitive_meta) {
            const meta = response.data.sensitive_meta;
            verificationState.value = {
                dob_verified: meta.dob_verified || false,
                names_verified: meta.names_verified || false
            };
            originalVerificationState.value = { ...verificationState.value };
        }
    }
    catch (err) {
        console.warn('Could not load SensitiveMeta verification state:', err.message);
    }
}
async function loadAnonymizedText(pdfId) {
    try {
        const response = await axios.get(`/api/pdf/anony_text/?id=${pdfId}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.data?.anonymized_text !== undefined) {
            currentPdfData.value.anonymized_text = response.data.anonymized_text;
        }
    }
    catch (err) {
        console.warn('Could not load anonymized text:', err.message);
    }
}
function startEditingPatientInfo() {
    if (currentPdfData.value) {
        editablePatientData.value = {
            patient_first_name: currentPdfData.value.patient_first_name,
            patient_last_name: currentPdfData.value.patient_last_name,
            patient_dob: currentPdfData.value.patient_dob,
            examination_date: currentPdfData.value.examination_date,
        };
        editingPatientInfo.value = true;
    }
}
function cancelEditingPatientInfo() {
    editingPatientInfo.value = false;
    editablePatientData.value = {};
}
async function savePatientInfo() {
    if (!currentPdfData.value?.sensitive_meta_id || !hasPatientChanges.value)
        return;
    try {
        loading.value = true;
        error.value = '';
        const updateData = {
            sensitive_meta_id: currentPdfData.value.sensitive_meta_id,
            ...editablePatientData.value
        };
        await axios.patch('/api/pdf/update_sensitivemeta/', updateData);
        // Update current data
        Object.assign(currentPdfData.value, editablePatientData.value);
        editingPatientInfo.value = false;
        successMessage.value = 'Patienteninformationen erfolgreich aktualisiert!';
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
function startEditingAnonymizedText() {
    editableAnonymizedText.value = currentPdfData.value?.anonymized_text || '';
    editingAnonymizedText.value = true;
}
function cancelEditingAnonymizedText() {
    editingAnonymizedText.value = false;
    editableAnonymizedText.value = '';
}
async function saveAnonymizedText() {
    if (!currentPdfData.value?.id || !hasAnonymizedTextChanges.value)
        return;
    try {
        loading.value = true;
        error.value = '';
        const updateData = {
            id: currentPdfData.value.id,
            anonymized_text: editableAnonymizedText.value
        };
        await axios.patch('/api/pdf/update_anony_text/', updateData);
        // Update current data
        currentPdfData.value.anonymized_text = editableAnonymizedText.value;
        editingAnonymizedText.value = false;
        successMessage.value = 'Anonymisierter Text erfolgreich aktualisiert!';
        setTimeout(() => {
            successMessage.value = '';
        }, 5000);
    }
    catch (err) {
        error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern des anonymisierten Texts';
    }
    finally {
        loading.value = false;
    }
}
async function updateVerificationState() {
    if (!currentPdfData.value?.sensitive_meta_id || !hasVerificationChanges.value)
        return;
    try {
        loading.value = true;
        error.value = '';
        // Use the existing PDF update endpoint instead of the non-existent verify endpoint
        const updateData = {
            sensitive_meta_id: currentPdfData.value.sensitive_meta_id,
            patient_first_name: currentPdfData.value.patient_first_name,
            patient_last_name: currentPdfData.value.patient_last_name,
            patient_dob: currentPdfData.value.patient_dob,
            examination_date: currentPdfData.value.examination_date
        };
        // Use the existing PDF sensitivemeta update endpoint
        await axios.patch('/api/pdf/update_sensitivemeta/', updateData);
        originalVerificationState.value = { ...verificationState.value };
        successMessage.value = 'Patientendaten erfolgreich aktualisiert!';
        setTimeout(() => {
            successMessage.value = '';
        }, 5000);
    }
    catch (err) {
        error.value = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren der Patientendaten';
    }
    finally {
        loading.value = false;
    }
}
async function skipPdf() {
    if (currentPdfData.value) {
        lastProcessedId.value = currentPdfData.value.id;
    }
    await loadNextPdf();
}
async function rejectPdf() {
    // This would mark the PDF as problematic
    successMessage.value = 'PDF als problematisch markiert!';
    setTimeout(() => { successMessage.value = ''; }, 2000);
    await skipPdf();
}
async function approveAndNext() {
    if (currentPdfData.value) {
        lastProcessedId.value = currentPdfData.value.id;
        successMessage.value = 'PDF erfolgreich validiert!';
        setTimeout(() => { successMessage.value = ''; }, 2000);
    }
    await loadNextPdf();
}
// PDF viewer handlers
function handlePdfError() {
    pdfError.value = 'PDF konnte nicht geladen werden. Überprüfen Sie die Datei und Berechtigungen.';
}
// Utility functions
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
function formatFileSize(bytes) {
    if (!bytes || Number.isNaN(bytes))
        return 'Unbekannt';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
}
function getFileName(filePath) {
    if (!filePath)
        return 'Unbekannt';
    return filePath.split('/').pop() || filePath;
}
// Load initial data on mount
onMounted(() => {
    loadNextPdf();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['anonymized-text-display', 'verification-section', 'loading-container', 'pdf-annotation-container', 'pdf-viewer-container', 'pdf-iframe', 'header-actions', 'text-end', 'action-buttons',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("pdf-annotation-container") },
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
    else if (!__VLS_ctx.currentPdfData) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-file-pdf fa-3x") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-5") },
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
        if (__VLS_ctx.currentPdfData.verification_status) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-info ms-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check-circle") },
            });
            (__VLS_ctx.verificationStatusText);
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
            (__VLS_ctx.currentPdfData.patient_first_name || 'Nicht angegeben');
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
            (__VLS_ctx.currentPdfData.patient_last_name || 'Nicht angegeben');
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
            (__VLS_ctx.formatDate(__VLS_ctx.currentPdfData.patient_dob));
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
            (__VLS_ctx.formatDate(__VLS_ctx.currentPdfData.examination_date));
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
        (__VLS_ctx.currentPdfData.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-data-display") },
        });
        (__VLS_ctx.formatFileSize(__VLS_ctx.currentPdfData.file_size));
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("verification-section mb-4") },
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
            ...{ class: ("fas fa-shield-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("checkbox"),
            ...{ class: ("form-check-input") },
            id: ("dobVerified"),
            disabled: ((__VLS_ctx.loading)),
        });
        (__VLS_ctx.verificationState.dob_verified);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("dobVerified"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("checkbox"),
            ...{ class: ("form-check-input") },
            id: ("namesVerified"),
            disabled: ((__VLS_ctx.loading)),
        });
        (__VLS_ctx.verificationState.names_verified);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("namesVerified"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.updateVerificationState) },
            ...{ class: ("btn btn-info btn-sm") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.hasVerificationChanges)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check") },
        });
        if (__VLS_ctx.currentPdfData.anonymized_text !== undefined) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("anonymized-text-section") },
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
                ...{ class: ("fas fa-user-secret") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("header-actions") },
            });
            if (!__VLS_ctx.editingAnonymizedText) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.startEditingAnonymizedText) },
                    ...{ class: ("btn btn-outline-secondary btn-sm") },
                    disabled: ((__VLS_ctx.loading)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-edit") },
                });
            }
            if (__VLS_ctx.editingAnonymizedText) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.saveAnonymizedText) },
                    ...{ class: ("btn btn-success btn-sm me-2") },
                    disabled: ((__VLS_ctx.loading || !__VLS_ctx.hasAnonymizedTextChanges)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-save") },
                });
            }
            if (__VLS_ctx.editingAnonymizedText) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.cancelEditingAnonymizedText) },
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
            if (__VLS_ctx.editingAnonymizedText) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                    value: ((__VLS_ctx.editableAnonymizedText)),
                    ...{ class: ("form-control") },
                    rows: ("8"),
                    placeholder: ("Anonymisierten Text eingeben..."),
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("anonymized-text-display") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
                (__VLS_ctx.currentPdfData.anonymized_text || 'Kein anonymisierter Text verfügbar');
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-7") },
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
            ...{ class: ("fas fa-file-pdf") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body pdf-viewer-container") },
        });
        if (__VLS_ctx.currentPdfStreamUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                ...{ onError: (__VLS_ctx.handlePdfError) },
                src: ((__VLS_ctx.currentPdfStreamUrl)),
                ...{ class: ("pdf-iframe") },
                title: ("PDF Vorschau"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.currentPdfStreamUrl)),
                target: ("_blank"),
            });
        }
        if (__VLS_ctx.pdfError) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-exclamation-triangle") },
            });
            (__VLS_ctx.pdfError);
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.currentPdfStreamUrl)),
                target: ("_blank"),
                ...{ class: ("btn btn-sm btn-outline-primary ms-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-external-link-alt") },
            });
        }
        if (__VLS_ctx.currentPdfData.file) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("pdf-info mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-info-circle") },
            });
            (__VLS_ctx.getFileName(__VLS_ctx.currentPdfData.file));
        }
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
            ...{ onClick: (__VLS_ctx.skipPdf) },
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-step-forward") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.rejectPdf) },
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
    ['pdf-annotation-container', 'alert', 'alert-danger', 'alert-dismissible', 'btn-close', 'alert', 'alert-success', 'alert-dismissible', 'btn-close', 'loading-container', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'py-5', 'fas', 'fa-file-pdf', 'fa-3x', 'mt-2', 'row', 'col-md-5', 'patient-info-section', 'mb-4', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-user-md', 'badge', 'bg-info', 'ms-2', 'fas', 'fa-check-circle', 'header-actions', 'btn', 'btn-outline-primary', 'btn-sm', 'fas', 'fa-edit', 'btn', 'btn-success', 'btn-sm', 'me-2', 'fas', 'fa-save', 'btn', 'btn-secondary', 'btn-sm', 'fas', 'fa-times', 'card-body', 'row', 'mb-3', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'patient-data-display', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'patient-data-display', 'row', 'mb-3', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'patient-data-display', 'col-md-6', 'form-label', 'text-muted', 'form-control', 'form-control-sm', 'is-invalid', 'patient-data-display', 'invalid-feedback', 'row', 'col-md-4', 'form-label', 'text-muted', 'patient-data-display', 'font-mono', 'col-md-4', 'form-label', 'text-muted', 'patient-data-display', 'col-md-4', 'form-label', 'text-muted', 'patient-data-display', 'verification-section', 'mb-4', 'card', 'card-header', 'mb-0', 'fas', 'fa-shield-check', 'card-body', 'row', 'col-md-6', 'form-check', 'form-check-input', 'form-check-label', 'col-md-6', 'form-check', 'form-check-input', 'form-check-label', 'mt-3', 'btn', 'btn-info', 'btn-sm', 'fas', 'fa-check', 'anonymized-text-section', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-user-secret', 'header-actions', 'btn', 'btn-outline-secondary', 'btn-sm', 'fas', 'fa-edit', 'btn', 'btn-success', 'btn-sm', 'me-2', 'fas', 'fa-save', 'btn', 'btn-secondary', 'btn-sm', 'fas', 'fa-times', 'card-body', 'form-control', 'anonymized-text-display', 'col-md-7', 'card', 'card-header', 'mb-0', 'fas', 'fa-file-pdf', 'card-body', 'pdf-viewer-container', 'pdf-iframe', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'btn', 'btn-sm', 'btn-outline-primary', 'ms-2', 'fas', 'fa-external-link-alt', 'pdf-info', 'mt-3', 'text-muted', 'fas', 'fa-info-circle', 'action-buttons', 'mt-4', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'fas', 'fa-step-forward', 'btn', 'btn-warning', 'me-2', 'fas', 'fa-times', 'btn', 'btn-success', 'fas', 'fa-check-double',];
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
            currentPdfData: currentPdfData,
            loading: loading,
            error: error,
            successMessage: successMessage,
            pdfError: pdfError,
            editingPatientInfo: editingPatientInfo,
            editablePatientData: editablePatientData,
            editingAnonymizedText: editingAnonymizedText,
            editableAnonymizedText: editableAnonymizedText,
            verificationState: verificationState,
            currentPdfStreamUrl: currentPdfStreamUrl,
            verificationStatusText: verificationStatusText,
            annotationStatusText: annotationStatusText,
            annotationStatusClass: annotationStatusClass,
            annotationStatusIcon: annotationStatusIcon,
            hasPatientChanges: hasPatientChanges,
            hasAnonymizedTextChanges: hasAnonymizedTextChanges,
            hasVerificationChanges: hasVerificationChanges,
            isExaminationDateValid: isExaminationDateValid,
            canApprove: canApprove,
            startEditingPatientInfo: startEditingPatientInfo,
            cancelEditingPatientInfo: cancelEditingPatientInfo,
            savePatientInfo: savePatientInfo,
            startEditingAnonymizedText: startEditingAnonymizedText,
            cancelEditingAnonymizedText: cancelEditingAnonymizedText,
            saveAnonymizedText: saveAnonymizedText,
            updateVerificationState: updateVerificationState,
            skipPdf: skipPdf,
            rejectPdf: rejectPdf,
            approveAndNext: approveAndNext,
            handlePdfError: handlePdfError,
            formatDate: formatDate,
            formatFileSize: formatFileSize,
            getFileName: getFileName,
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
