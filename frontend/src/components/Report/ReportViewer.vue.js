import { ref, computed, watch, onMounted } from 'vue';
import axiosInstance from '@/api/axiosInstance';
const props = defineProps();
const emit = defineEmits();
// Reactive data
const loading = ref(false);
const error = ref('');
const reportData = ref(null);
const editMode = ref(false);
const savingMetadata = ref(false);
const editableMetadata = ref({});
const editableText = ref('');
const validationErrors = ref({});
// Computed
const isUrlExpired = computed(() => {
    if (!reportData.value?.secure_file_url?.expires_at)
        return false;
    return new Date() >= new Date(reportData.value.secure_file_url.expires_at);
});
// Watchers
watch(() => props.reportId, (newId) => {
    if (newId) {
        loadReport();
    }
    else {
        reportData.value = null;
    }
}, { immediate: true });
// Methods
async function loadReport() {
    if (!props.reportId)
        return;
    loading.value = true;
    error.value = '';
    try {
        const response = await axiosInstance.get(`/api/reports/${props.reportId}/with-secure-url/`);
        reportData.value = response.data;
        resetEditableData();
        emit('reportLoaded', response.data);
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Laden des Reports';
        emit('error', error.value);
    }
    finally {
        loading.value = false;
    }
}
function toggleEditMode() {
    editMode.value = !editMode.value;
    if (editMode.value) {
        resetEditableData();
    }
    validationErrors.value = {};
}
function resetEditableData() {
    if (reportData.value) {
        editableMetadata.value = { ...reportData.value.report_meta };
        editableText.value = reportData.value.anonymized_text;
        // Convert dates to YYYY-MM-DD format for input[type="date"]
        if (editableMetadata.value.patient_dob) {
            editableMetadata.value.patient_dob = editableMetadata.value.patient_dob.split('T')[0];
        }
        if (editableMetadata.value.examination_date) {
            editableMetadata.value.examination_date = editableMetadata.value.examination_date.split('T')[0];
        }
    }
}
function validateMetadata() {
    validationErrors.value = {};
    if (!editableMetadata.value.patient_first_name?.trim()) {
        validationErrors.value.patient_first_name = 'Vorname ist erforderlich';
    }
    if (!editableMetadata.value.patient_last_name?.trim()) {
        validationErrors.value.patient_last_name = 'Nachname ist erforderlich';
    }
    if (!editableText.value?.trim()) {
        validationErrors.value.anonymized_text = 'Anonymisierter Text ist erforderlich';
    }
    if (editableText.value?.length > 10000) {
        validationErrors.value.anonymized_text = 'Text ist zu lang (max. 10.000 Zeichen)';
    }
    return Object.keys(validationErrors.value).length === 0;
}
async function saveMetadata() {
    if (!validateMetadata())
        return;
    savingMetadata.value = true;
    try {
        // Update metadata
        const metadataResponse = await axiosInstance.patch(`/api/pdf/sensitivemeta/update/`, {
            id: reportData.value.report_meta.id,
            ...editableMetadata.value
        });
        // Update anonymized text
        const textResponse = await axiosInstance.patch(`/api/pdf/update_anony_text/`, {
            id: reportData.value.id,
            anonymized_text: editableText.value
        });
        // Update local data
        reportData.value.report_meta = { ...reportData.value.report_meta, ...editableMetadata.value };
        reportData.value.anonymized_text = editableText.value;
        editMode.value = false;
        emit('metadataUpdated', reportData.value);
        // Show success message
        console.log('Metadaten erfolgreich gespeichert');
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Speichern der Metadaten';
        emit('error', error.value);
    }
    finally {
        savingMetadata.value = false;
    }
}
function cancelEdit() {
    editMode.value = false;
    resetEditableData();
    validationErrors.value = {};
}
// Utility functions
function formatDate(dateString) {
    if (!dateString)
        return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch {
        return dateString;
    }
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function getStatusColor(status) {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        case 'pending': return 'warning';
        default: return 'secondary';
    }
}
function getStatusLabel(status) {
    switch (status) {
        case 'approved': return 'Genehmigt';
        case 'rejected': return 'Abgelehnt';
        case 'pending': return 'Ausstehend';
        default: return 'Unbekannt';
    }
}
function getGenderLabel(gender) {
    switch (gender) {
        case 1: return 'Männlich';
        case 2: return 'Weiblich';
        case 3: return 'Divers';
        default: return 'Unbekannt';
    }
}
// Lifecycle
onMounted(() => {
    if (props.reportId) {
        loadReport();
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['report-actions',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("report-viewer") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("report-header mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("report-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadReport) },
        ...{ class: ("btn btn-primary btn-sm me-2") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("bi bi-arrow-clockwise") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleEditMode) },
        ...{ class: ("btn btn-outline-secondary btn-sm") },
        disabled: ((!__VLS_ctx.reportData)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("bi bi-pencil") },
    });
    (__VLS_ctx.editMode ? 'Bearbeitung beenden' : 'Metadaten bearbeiten');
    if (__VLS_ctx.loading) {
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
    else if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("alert-heading") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-0") },
        });
        (__VLS_ctx.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadReport) },
            ...{ class: ("btn btn-outline-danger btn-sm mt-2") },
        });
    }
    else if (__VLS_ctx.reportData) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("report-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-lg-8") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        if (__VLS_ctx.reportData.secure_file_url) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.reportData.secure_file_url.expires_at));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body p-0") },
        });
        if (__VLS_ctx.reportData.secure_file_url && !__VLS_ctx.isUrlExpired) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("pdf-container") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                src: ((__VLS_ctx.reportData.secure_file_url.url + '#toolbar=1&navpanes=0&scrollbar=1')),
                width: ("100%"),
                height: ("600px"),
                frameborder: ("0"),
                ...{ class: ("pdf-frame") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("p-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.reportData.secure_file_url.url)),
                target: ("_blank"),
                rel: ("noopener noreferrer"),
            });
        }
        else if (__VLS_ctx.isUrlExpired) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-5") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("bi bi-clock-history display-1 text-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.loadReport) },
                ...{ class: ("btn btn-primary") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-5") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("bi bi-file-earmark-x display-1 text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-lg-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((`badge bg-${__VLS_ctx.getStatusColor(__VLS_ctx.reportData.status)}`)) },
        });
        (__VLS_ctx.getStatusLabel(__VLS_ctx.reportData.status));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        if (__VLS_ctx.editMode) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("bi bi-pencil") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.editMode) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("edit-form") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                value: ((__VLS_ctx.editableMetadata.patient_first_name)),
                type: ("text"),
                ...{ class: ("form-control") },
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.patient_first_name })) },
            });
            if (__VLS_ctx.validationErrors.patient_first_name) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.patient_first_name);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                value: ((__VLS_ctx.editableMetadata.patient_last_name)),
                type: ("text"),
                ...{ class: ("form-control") },
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.patient_last_name })) },
            });
            if (__VLS_ctx.validationErrors.patient_last_name) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.patient_last_name);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: ((__VLS_ctx.editableMetadata.patient_gender)),
                modelModifiers: { number: true, },
                ...{ class: ("form-select") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ((1)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ((2)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ((3)),
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
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.patient_dob })) },
            });
            (__VLS_ctx.editableMetadata.patient_dob);
            if (__VLS_ctx.validationErrors.patient_dob) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.patient_dob);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: ("date"),
                ...{ class: ("form-control") },
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.examination_date })) },
            });
            (__VLS_ctx.editableMetadata.examination_date);
            if (__VLS_ctx.validationErrors.examination_date) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.examination_date);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex gap-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.saveMetadata) },
                ...{ class: ("btn btn-success btn-sm") },
                disabled: ((__VLS_ctx.savingMetadata)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("bi bi-check-lg") },
            });
            (__VLS_ctx.savingMetadata ? 'Speichern...' : 'Speichern');
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelEdit) },
                ...{ class: ("btn btn-secondary btn-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("bi bi-x-lg") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("metadata-display") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.reportData.report_meta.patient_first_name);
            (__VLS_ctx.reportData.report_meta.patient_last_name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.getGenderLabel(__VLS_ctx.reportData.report_meta.patient_gender));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.reportData.report_meta.patient_dob));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.reportData.report_meta.examination_date));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.editMode) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("edit-form") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                value: ((__VLS_ctx.editableText)),
                ...{ class: ("form-control") },
                rows: ("10"),
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.anonymized_text })) },
            });
            if (__VLS_ctx.validationErrors.anonymized_text) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.anonymized_text);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("form-text text-muted") },
            });
            (__VLS_ctx.editableText.length);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("anonymized-text") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-content") },
            });
            (__VLS_ctx.reportData.anonymized_text);
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.reportData.anonymized_text.length);
        }
        if (__VLS_ctx.reportData.secure_file_url) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-body") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.reportData.secure_file_url.original_filename);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.formatFileSize(__VLS_ctx.reportData.secure_file_url.file_size));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.reportData.file_type.toUpperCase());
        }
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("bi bi-file-earmark-text display-1 text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
    }
    ['report-viewer', 'report-header', 'mb-4', 'd-flex', 'justify-content-between', 'align-items-center', 'report-actions', 'btn', 'btn-primary', 'btn-sm', 'me-2', 'bi', 'bi-arrow-clockwise', 'btn', 'btn-outline-secondary', 'btn-sm', 'bi', 'bi-pencil', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert-heading', 'mb-0', 'btn', 'btn-outline-danger', 'btn-sm', 'mt-2', 'report-content', 'row', 'col-lg-8', 'card', 'card-header', 'mb-0', 'text-muted', 'card-body', 'p-0', 'pdf-container', 'pdf-frame', 'p-3', 'text-center', 'py-5', 'bi', 'bi-clock-history', 'display-1', 'text-warning', 'mt-3', 'text-muted', 'btn', 'btn-primary', 'text-center', 'py-5', 'bi', 'bi-file-earmark-x', 'display-1', 'text-muted', 'mt-3', 'text-muted', 'col-lg-4', 'card', 'mb-3', 'card-header', 'mb-0', 'card-body', 'd-flex', 'justify-content-between', 'align-items-center', 'card', 'mb-3', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'text-warning', 'bi', 'bi-pencil', 'card-body', 'edit-form', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'd-flex', 'gap-2', 'btn', 'btn-success', 'btn-sm', 'bi', 'bi-check-lg', 'btn', 'btn-secondary', 'btn-sm', 'bi', 'bi-x-lg', 'metadata-display', 'mb-2', 'text-muted', 'mb-1', 'mb-2', 'text-muted', 'mb-1', 'mb-2', 'text-muted', 'mb-1', 'mb-2', 'text-muted', 'mb-1', 'card', 'mb-3', 'card-header', 'mb-0', 'card-body', 'edit-form', 'form-control', 'is-invalid', 'invalid-feedback', 'form-text', 'text-muted', 'anonymized-text', 'text-content', 'text-muted', 'card', 'card-header', 'mb-0', 'card-body', 'mb-2', 'text-muted', 'mb-1', 'mb-2', 'text-muted', 'mb-1', 'mb-2', 'text-muted', 'mb-1', 'text-center', 'py-5', 'bi', 'bi-file-earmark-text', 'display-1', 'text-muted', 'mt-3', 'text-muted',];
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
            loading: loading,
            error: error,
            reportData: reportData,
            editMode: editMode,
            savingMetadata: savingMetadata,
            editableMetadata: editableMetadata,
            editableText: editableText,
            validationErrors: validationErrors,
            isUrlExpired: isUrlExpired,
            loadReport: loadReport,
            toggleEditMode: toggleEditMode,
            saveMetadata: saveMetadata,
            cancelEdit: cancelEdit,
            formatDate: formatDate,
            formatFileSize: formatFileSize,
            getStatusColor: getStatusColor,
            getStatusLabel: getStatusLabel,
            getGenderLabel: getGenderLabel,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
