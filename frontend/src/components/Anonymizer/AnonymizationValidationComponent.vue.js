import axiosInstance from '@/api/axiosInstance';
import { ref, computed, reactive, watch } from 'vue';
export default (await import('vue')).defineComponent({
    name: 'AnonymizationValidationComponent',
    setup() {
        const loading = ref(true);
        const error = ref(null);
        const currentItem = ref(null);
        const editMode = ref(false);
        const editedAnonymizedText = ref('');
        const examinationDate = ref('');
        const editedPatient = reactive({
            patient_first_name: '',
            patient_last_name: '',
            patient_gender: '',
            patient_dob: '',
            casenumber: ''
        });
        // Validate examination date
        const isExaminationDateValid = computed(() => {
            if (!examinationDate.value || !editedPatient.patient_dob)
                return true;
            return new Date(examinationDate.value) >= new Date(editedPatient.patient_dob);
        });
        const loadData = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await axiosInstance.get('/api/pdf/anony_text/');
                const data = response.data;
                if (data) {
                    currentItem.value = data;
                    editedAnonymizedText.value = currentItem.value.anonymized_text;
                    // Set patient info
                    const meta = currentItem.value.report_meta;
                    editedPatient.patient_first_name = meta.patient_first_name || '';
                    editedPatient.patient_last_name = meta.patient_last_name || '';
                    editedPatient.patient_gender = meta.patient_gender || '';
                    editedPatient.patient_dob = meta.patient_dob || '';
                    editedPatient.casenumber = meta.casenumber || '';
                    // Extract examination date if available
                    examinationDate.value = meta.examination_date || '';
                }
                else {
                    currentItem.value = null;
                }
            }
            catch (err) {
                error.value = `Fehler beim Laden der Daten: ${err.message}`;
            }
            finally {
                loading.value = false;
            }
        };
        const approveItem = async () => {
            if (!isExaminationDateValid.value)
                return;
            loading.value = true;
            try {
                const updateData = {
                    id: currentItem.value.id,
                    anonymized_text: editedAnonymizedText.value,
                    report_meta: {
                        ...currentItem.value.report_meta,
                        patient_first_name: editedPatient.patient_first_name,
                        patient_last_name: editedPatient.patient_last_name,
                        patient_gender: editedPatient.patient_gender,
                        patient_dob: editedPatient.patient_dob,
                        casenumber: editedPatient.casenumber,
                        examination_date: examinationDate.value
                    }
                };
                await axiosInstance.patch('/api/pdf/update_anony_text/', updateData);
                await loadData();
            }
            catch (err) {
                error.value = `Fehler beim Speichern: ${err.message}`;
            }
            finally {
                loading.value = false;
            }
        };
        const rejectItem = async () => {
            loading.value = true;
            try {
                await axiosInstance.patch('/api/pdf/update_anony_text/', {
                    id: currentItem.value.id,
                    status: 'rejected'
                });
                await loadData();
            }
            catch (err) {
                error.value = `Fehler beim Ablehnen: ${err.message}`;
            }
            finally {
                loading.value = false;
            }
        };
        const skipItem = async () => {
            loadData();
        };
        // Watch for changes in current item
        watch(currentItem, (newItem) => {
            if (newItem) {
                editedAnonymizedText.value = newItem.anonymized_text;
            }
        });
        // Initial data load
        loadData();
        return {
            loading,
            error,
            currentItem,
            editMode,
            editedAnonymizedText,
            editedPatient,
            examinationDate,
            isExaminationDateValid,
            approveItem,
            rejectItem,
            skipItem
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
    }
    else if (!__VLS_ctx.currentItem) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info") },
            role: ("alert"),
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patient_first_name)),
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
            value: ((__VLS_ctx.editedPatient.patient_last_name)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: ("form-select") },
            value: ((__VLS_ctx.editedPatient.patient_gender)),
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
        });
        (__VLS_ctx.editedPatient.patient_dob);
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
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: ("text-wrap") },
        });
        (__VLS_ctx.currentItem.text);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.loading))))
                        return;
                    if (!(!((__VLS_ctx.error))))
                        return;
                    if (!(!((!__VLS_ctx.currentItem))))
                        return;
                    __VLS_ctx.editMode = !__VLS_ctx.editMode;
                } },
            ...{ class: ("btn btn-sm btn-outline-primary") },
        });
        (__VLS_ctx.editMode ? 'Vorschau' : 'Bearbeiten');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.editMode) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                ...{ class: ("form-control") },
                rows: ("10"),
                value: ((__VLS_ctx.editedAnonymizedText)),
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                ...{ class: ("text-wrap") },
            });
            (__VLS_ctx.editedAnonymizedText);
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
            disabled: ((!__VLS_ctx.isExaminationDateValid)),
        });
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'row', 'mb-4', 'col-md-6', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'card', 'mb-4', 'card-header', 'mb-0', 'card-body', 'text-wrap', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-sm', 'btn-outline-primary', 'card-body', 'form-control', 'text-wrap', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success',];
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
