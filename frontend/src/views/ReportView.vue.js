import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
export default (await import('vue')).defineComponent({
    name: 'ReportView',
    setup() {
        const route = useRoute();
        const reportId = computed(() => route.params.id);
        const loading = ref(true);
        const error = ref('');
        const reportData = ref(null);
        const editMode = ref(false);
        const successMessage = ref('');
        const errorMessage = ref('');
        const validationErrors = reactive({});
        const editableData = reactive({
            patient_first_name: '',
            patient_last_name: '',
            patient_gender: 0,
            patient_dob: '',
            examination_date: '',
            anonymized_text: ''
        });
        const loadReport = async () => {
            try {
                loading.value = true;
                error.value = '';
                const response = await axiosInstance.get(r(`reports/${reportId.value}/with-secure-url/`));
                reportData.value = response.data;
                // Populate editable data
                if (reportData.value.report_meta) {
                    editableData.patient_first_name = reportData.value.report_meta.patient_first_name || '';
                    editableData.patient_last_name = reportData.value.report_meta.patient_last_name || '';
                    editableData.patient_gender = reportData.value.report_meta.patient_gender || 0;
                    editableData.patient_dob = formatDateForInput(reportData.value.report_meta.patient_dob);
                    editableData.examination_date = formatDateForInput(reportData.value.report_meta.examination_date);
                }
                editableData.anonymized_text = reportData.value.anonymized_text || '';
            }
            catch (err) {
                console.error('Error loading report:', err);
                error.value = err.response?.data?.detail || err.message || 'Fehler beim Laden des Reports';
            }
            finally {
                loading.value = false;
            }
        };
        const toggleEditMode = async () => {
            if (editMode.value) {
                // Save changes
                await saveChanges();
            }
            else {
                // Enter edit mode
                editMode.value = true;
                // Clear validation errors
                Object.keys(validationErrors).forEach(key => {
                    delete validationErrors[key];
                });
            }
        };
        const saveChanges = async () => {
            try {
                // Clear previous validation errors
                Object.keys(validationErrors).forEach(key => {
                    delete validationErrors[key];
                });
                // Update report metadata
                const metaUpdateData = {
                    patient_first_name: editableData.patient_first_name,
                    patient_last_name: editableData.patient_last_name,
                    patient_gender: parseInt(editableData.patient_gender),
                    patient_dob: editableData.patient_dob,
                    examination_date: editableData.examination_date
                };
                await axiosInstance.patch(r(`reports/${reportId.value}/update-meta/`), metaUpdateData);
                // Update anonymized text
                await axiosInstance.patch(r(`reports/${reportId.value}/update-text/`), { anonymized_text: editableData.anonymized_text });
                successMessage.value = 'Änderungen wurden erfolgreich gespeichert!';
                editMode.value = false;
                // Reload data to show updated values
                await loadReport();
                // Clear success message after 5 seconds
                setTimeout(() => {
                    successMessage.value = '';
                }, 5000);
            }
            catch (err) {
                console.error('Error saving changes:', err);
                if (err.response?.data) {
                    // Handle validation errors
                    const errorData = err.response.data;
                    if (typeof errorData === 'object') {
                        Object.keys(errorData).forEach(key => {
                            if (Array.isArray(errorData[key])) {
                                validationErrors[key] = errorData[key][0];
                            }
                            else {
                                validationErrors[key] = errorData[key];
                            }
                        });
                    }
                }
                errorMessage.value = 'Fehler beim Speichern der Änderungen';
                // Clear error message after 5 seconds
                setTimeout(() => {
                    errorMessage.value = '';
                }, 5000);
            }
        };
        const formatDate = (dateString) => {
            if (!dateString)
                return 'Nicht verfügbar';
            try {
                return new Date(dateString).toLocaleDateString('de-DE');
            }
            catch {
                return 'Ungültiges Datum';
            }
        };
        const formatDateForInput = (dateString) => {
            if (!dateString)
                return '';
            try {
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            }
            catch {
                return '';
            }
        };
        const formatFileSize = (bytes) => {
            if (!bytes)
                return 'Unbekannt';
            if (bytes === 0)
                return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        const getGenderDisplay = (gender) => {
            const genderMap = {
                0: 'Unbekannt',
                1: 'Männlich',
                2: 'Weiblich',
                9: 'Divers'
            };
            return genderMap[gender] || 'Unbekannt';
        };
        const getStatusDisplay = (status) => {
            const statusMap = {
                'pending': 'Ausstehend',
                'processing': 'In Bearbeitung',
                'completed': 'Abgeschlossen',
                'error': 'Fehler'
            };
            return statusMap[status] || status;
        };
        const getStatusBadgeClass = (status) => {
            const classMap = {
                'pending': 'bg-warning',
                'processing': 'bg-info',
                'completed': 'bg-success',
                'error': 'bg-danger'
            };
            return classMap[status] || 'bg-secondary';
        };
        onMounted(() => {
            loadReport();
        });
        return {
            loading,
            error,
            reportData,
            editMode,
            editableData,
            validationErrors,
            successMessage,
            errorMessage,
            toggleEditMode,
            saveChanges,
            formatDate,
            formatFileSize,
            getGenderDisplay,
            getStatusDisplay,
            getStatusBadgeClass
        };
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("btn-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$router.go(-1);
            } },
        ...{ class: ("btn btn-outline-secondary btn-sm") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleEditMode) },
        ...{ class: ("btn btn-primary btn-sm") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons") },
    });
    (__VLS_ctx.editMode ? 'save' : 'edit');
    (__VLS_ctx.editMode ? 'Speichern' : 'Bearbeiten');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
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
            ...{ class: ("mt-2 text-muted") },
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
    }
    else if (__VLS_ctx.reportData) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-lg-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
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
            __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
                ...{ onSubmit: (__VLS_ctx.saveChanges) },
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
                value: ((__VLS_ctx.editableData.patient_first_name)),
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
                type: ("text"),
                ...{ class: ("form-control") },
                value: ((__VLS_ctx.editableData.patient_last_name)),
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
                ...{ class: ("form-select") },
                value: ((__VLS_ctx.editableData.patient_gender)),
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.patient_gender })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("0"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("1"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("2"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("9"),
            });
            if (__VLS_ctx.validationErrors.patient_gender) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.patient_gender);
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
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.patient_dob })) },
            });
            (__VLS_ctx.editableData.patient_dob);
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
            (__VLS_ctx.editableData.examination_date);
            if (__VLS_ctx.validationErrors.examination_date) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.examination_date);
            }
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.reportData.report_meta?.patient_first_name || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.reportData.report_meta?.patient_last_name || 'Nicht verfügbar');
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.getGenderDisplay(__VLS_ctx.reportData.report_meta?.patient_gender));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.reportData.report_meta?.patient_dob));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.formatDate(__VLS_ctx.reportData.report_meta?.examination_date));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-lg-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
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
            ...{ class: ("row mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-8") },
        });
        (__VLS_ctx.reportData.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-8") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge") },
            ...{ class: ((__VLS_ctx.getStatusBadgeClass(__VLS_ctx.reportData.status))) },
        });
        (__VLS_ctx.getStatusDisplay(__VLS_ctx.reportData.status));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-8") },
        });
        (__VLS_ctx.reportData.file_type?.toUpperCase() || 'Unbekannt');
        if (__VLS_ctx.reportData.secure_file_url) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.formatFileSize(__VLS_ctx.reportData.secure_file_url.file_size));
        }
        if (__VLS_ctx.reportData.secure_file_url) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-sm-8") },
            });
            (__VLS_ctx.reportData.secure_file_url.original_filename);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.editMode) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                ...{ class: ("form-control") },
                rows: ("10"),
                value: ((__VLS_ctx.editableData.anonymized_text)),
                ...{ class: (({ 'is-invalid': __VLS_ctx.validationErrors.anonymized_text })) },
            });
            if (__VLS_ctx.validationErrors.anonymized_text) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("invalid-feedback") },
                });
                (__VLS_ctx.validationErrors.anonymized_text);
            }
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("anonymized-text-display") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                ...{ class: ("bg-light p-3 rounded") },
            });
            (__VLS_ctx.reportData.anonymized_text);
        }
        if (__VLS_ctx.reportData.secure_file_url) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mt-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-12") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex justify-content-between align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.reportData.secure_file_url.url)),
                target: ("_blank"),
                ...{ class: ("btn btn-outline-primary btn-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-body") },
            });
            if (__VLS_ctx.reportData.file_type === 'pdf') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("pdf-viewer") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                    src: ((__VLS_ctx.reportData.secure_file_url.url)),
                    width: ("100%"),
                    height: ("600px"),
                    frameborder: ("0"),
                    ...{ style: ({}) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: ((__VLS_ctx.reportData.secure_file_url.url)),
                    target: ("_blank"),
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("text-center py-5 text-muted") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("material-icons") },
                    ...{ style: ({}) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: ("mt-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: ((__VLS_ctx.reportData.secure_file_url.url)),
                    target: ("_blank"),
                    ...{ class: ("btn btn-primary") },
                });
            }
        }
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("position-fixed bottom-0 end-0 p-3") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success alert-dismissible fade show") },
            role: ("alert"),
        });
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
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("position-fixed bottom-0 end-0 p-3") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger alert-dismissible fade show") },
            role: ("alert"),
        });
        (__VLS_ctx.errorMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.errorMessage)))
                        return;
                    __VLS_ctx.errorMessage = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'card', 'card-header', 'pb-0', 'd-flex', 'align-items-center', 'justify-content-between', 'mb-0', 'btn-group', 'btn', 'btn-outline-secondary', 'btn-sm', 'material-icons', 'btn', 'btn-primary', 'btn-sm', 'material-icons', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'text-muted', 'alert', 'alert-danger', 'alert-heading', 'mb-0', 'row', 'col-lg-6', 'card', 'h-100', 'card-header', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-select', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'col-lg-6', 'card', 'h-100', 'card-header', 'mb-0', 'card-body', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'badge', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mb-2', 'col-sm-4', 'col-sm-8', 'row', 'mt-4', 'col-12', 'card', 'card-header', 'mb-0', 'card-body', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'anonymized-text-display', 'bg-light', 'p-3', 'rounded', 'row', 'mt-4', 'col-12', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-outline-primary', 'btn-sm', 'material-icons', 'card-body', 'pdf-viewer', 'text-center', 'py-5', 'text-muted', 'material-icons', 'mt-2', 'btn', 'btn-primary', 'position-fixed', 'bottom-0', 'end-0', 'p-3', 'alert', 'alert-success', 'alert-dismissible', 'fade', 'show', 'btn-close', 'position-fixed', 'bottom-0', 'end-0', 'p-3', 'alert', 'alert-danger', 'alert-dismissible', 'fade', 'show', 'btn-close',];
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
let __VLS_self;
