import { ref, computed, reactive, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { patientService } from '@/api/patientService';
const props = defineProps();
const emit = defineEmits();
// Composables
const patientStore = usePatientStore();
// Reactive state
const loading = ref(false);
const deleting = ref(false);
const showDeleteModal = ref(false);
const generalError = ref('');
const deletionInfo = ref(null);
// Form data
const form = reactive({
    id: props.patient.id || null,
    firstName: props.patient.firstName || '',
    lastName: props.patient.lastName || '',
    dob: props.patient.dob ? props.patient.dob.split('T')[0] : null,
    gender: props.patient.gender || null,
    center: props.patient.center || null,
    email: props.patient.email || '',
    phone: props.patient.phone || '',
    patientHash: props.patient.patientHash || '',
    comments: '', // Not used in this form
    isRealPerson: props.patient.isRealPerson ?? true
});
// Validation errors
const errors = reactive({
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    center: '',
    email: '',
    phone: '',
    patientHash: ''
});
// Computed
const genders = computed(() => patientStore.genders);
const centers = computed(() => patientStore.centers);
const maxDate = computed(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
});
const isFormValid = computed(() => {
    return form.firstName.trim() && form.lastName.trim() && !Object.values(errors).some(error => error);
});
// Methods
const validateForm = () => {
    // Clear previous errors
    Object.keys(errors).forEach(key => {
        errors[key] = '';
    });
    let isValid = true;
    // Validate required fields
    if (!form.firstName.trim()) {
        errors.firstName = 'Vorname ist erforderlich';
        isValid = false;
    }
    if (!form.lastName.trim()) {
        errors.lastName = 'Nachname ist erforderlich';
        isValid = false;
    }
    // Validate email format
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'Ungültige E-Mail-Adresse';
        isValid = false;
    }
    // Validate date
    if (form.dob) {
        const birthDate = new Date(form.dob);
        const today = new Date();
        if (birthDate > today) {
            errors.dob = 'Geburtsdatum kann nicht in der Zukunft liegen';
            isValid = false;
        }
    }
    return isValid;
};
const handleSubmit = async () => {
    if (!validateForm()) {
        return;
    }
    try {
        loading.value = true;
        generalError.value = '';
        const patientData = patientService.formatPatientData(form);
        const updatedPatient = await patientService.updatePatient(props.patient.id, patientData);
        emit('patient-updated', updatedPatient);
    }
    catch (err) {
        console.error('Error updating patient:', err);
        if (err.response?.data) {
            // Handle validation errors from backend
            const backendErrors = err.response.data;
            if (typeof backendErrors === 'object') {
                Object.keys(backendErrors).forEach(key => {
                    if (key in errors) {
                        errors[key] = Array.isArray(backendErrors[key])
                            ? backendErrors[key][0]
                            : backendErrors[key];
                    }
                });
            }
            generalError.value = backendErrors.detail || backendErrors.message || 'Fehler beim Aktualisieren des Patienten';
        }
        else {
            generalError.value = err.message || 'Unbekannter Fehler beim Aktualisieren des Patienten';
        }
    }
    finally {
        loading.value = false;
    }
};
const confirmDelete = async () => {
    try {
        deleting.value = true;
        await patientService.deletePatient(props.patient.id);
        emit('patient-deleted', props.patient.id);
        showDeleteModal.value = false;
    }
    catch (err) {
        console.error('Error deleting patient:', err);
        generalError.value = err.message || 'Fehler beim Löschen des Patienten';
        showDeleteModal.value = false;
    }
    finally {
        deleting.value = false;
    }
};
const loadDeletionInfo = async () => {
    try {
        // This would call the safety check endpoint to get deletion impact
        const response = await fetch(`/api/patients/${props.patient.id}/check_deletion_safety/`);
        if (response.ok) {
            const data = await response.json();
            deletionInfo.value = data.related_objects;
        }
    }
    catch (error) {
        console.error('Error loading deletion info:', error);
    }
};
// Lifecycle
onMounted(() => {
    loadDeletionInfo();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['section-title', 'form-label', 'form-control', 'form-select', 'form-control', 'form-select', 'is-invalid', 'btn-primary', 'btn-outline-danger', 'btn', 'deletion-info', 'deletion-info', 'form-grid', 'form-actions', 'action-group', 'delete-section', 'modal-dialog',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-edit-form") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
        ...{ class: ("edit-form") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-grid") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("section-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("firstName"),
        ...{ class: ("form-label required") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        id: ("firstName"),
        value: ((__VLS_ctx.form.firstName)),
        type: ("text"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.firstName })) },
        required: (true),
        maxlength: ("100"),
    });
    if (__VLS_ctx.errors.firstName) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.firstName);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("lastName"),
        ...{ class: ("form-label required") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        id: ("lastName"),
        value: ((__VLS_ctx.form.lastName)),
        type: ("text"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.lastName })) },
        required: (true),
        maxlength: ("100"),
    });
    if (__VLS_ctx.errors.lastName) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.lastName);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("dob"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        id: ("dob"),
        type: ("date"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.dob })) },
        max: ((__VLS_ctx.maxDate)),
    });
    (__VLS_ctx.form.dob);
    if (__VLS_ctx.errors.dob) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.dob);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("form-text text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("gender"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("gender"),
        value: ((__VLS_ctx.form.gender)),
        ...{ class: ("form-select") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.gender })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    for (const [gender] of __VLS_getVForSourceType((__VLS_ctx.genders))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((gender.id)),
            value: ((gender.name)),
        });
        (gender.nameDe || gender.name);
    }
    if (__VLS_ctx.errors.gender) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.gender);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("section-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-address-book") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("email"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        id: ("email"),
        type: ("email"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.email })) },
        maxlength: ("254"),
    });
    (__VLS_ctx.form.email);
    if (__VLS_ctx.errors.email) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.email);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("phone"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        id: ("phone"),
        type: ("tel"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.phone })) },
        maxlength: ("20"),
    });
    (__VLS_ctx.form.phone);
    if (__VLS_ctx.errors.phone) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.phone);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("center"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("center"),
        value: ((__VLS_ctx.form.center)),
        ...{ class: ("form-select") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.center })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    for (const [center] of __VLS_getVForSourceType((__VLS_ctx.centers))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((center.id)),
            value: ((center.name)),
        });
        (center.nameDe || center.name);
    }
    if (__VLS_ctx.errors.center) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.center);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        id: ("isRealPerson"),
        ...{ class: ("form-check-input") },
        type: ("checkbox"),
    });
    (__VLS_ctx.form.isRealPerson);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-check-label") },
        for: ("isRealPerson"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("d-block text-muted") },
    });
    if (__VLS_ctx.generalError) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.generalError);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("action-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('cancel');
            } },
        type: ("button"),
        ...{ class: ("btn btn-secondary") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-times") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        ...{ class: ("btn btn-primary") },
        disabled: ((__VLS_ctx.loading || !__VLS_ctx.isFormValid)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm me-2") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-save me-2") },
        });
    }
    (__VLS_ctx.loading ? 'Wird gespeichert...' : 'Speichern');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("delete-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showDeleteModal = true;
            } },
        type: ("button"),
        ...{ class: ("btn btn-outline-danger") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-trash") },
    });
    if (__VLS_ctx.showDeleteModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-overlay") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-dialog") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("modal-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle text-danger") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-warning") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.patient.firstName);
        (__VLS_ctx.patient.lastName);
        if (__VLS_ctx.deletionInfo) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("deletion-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("mb-0") },
            });
            if (__VLS_ctx.deletionInfo.examinations > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.deletionInfo.examinations);
            }
            if (__VLS_ctx.deletionInfo.findings > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.deletionInfo.findings);
            }
            if (__VLS_ctx.deletionInfo.videos > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.deletionInfo.videos);
            }
            if (__VLS_ctx.deletionInfo.reports > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.deletionInfo.reports);
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-footer") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.showDeleteModal)))
                        return;
                    __VLS_ctx.showDeleteModal = false;
                } },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.deleting)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmDelete) },
            type: ("button"),
            ...{ class: ("btn btn-danger") },
            disabled: ((__VLS_ctx.deleting)),
        });
        if (__VLS_ctx.deleting) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-2") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-trash me-2") },
            });
        }
        (__VLS_ctx.deleting ? 'Wird gelöscht...' : 'Endgültig löschen');
    }
    ['patient-edit-form', 'edit-form', 'form-grid', 'form-section', 'section-title', 'fas', 'fa-user', 'form-group', 'form-label', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'form-group', 'form-label', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'form-group', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'form-text', 'text-muted', 'form-group', 'form-label', 'form-select', 'is-invalid', 'invalid-feedback', 'form-section', 'section-title', 'fas', 'fa-address-book', 'form-group', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'form-group', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'form-group', 'form-label', 'form-select', 'is-invalid', 'invalid-feedback', 'form-group', 'form-check', 'form-check-input', 'form-check-label', 'd-block', 'text-muted', 'alert', 'alert-danger', 'fas', 'fa-exclamation-triangle', 'form-actions', 'action-group', 'btn', 'btn-secondary', 'fas', 'fa-times', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-save', 'me-2', 'delete-section', 'btn', 'btn-outline-danger', 'fas', 'fa-trash', 'modal-overlay', 'modal-dialog', 'modal-content', 'modal-header', 'modal-title', 'fas', 'fa-exclamation-triangle', 'text-danger', 'modal-body', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'deletion-info', 'mb-0', 'modal-footer', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-trash', 'me-2',];
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
            deleting: deleting,
            showDeleteModal: showDeleteModal,
            generalError: generalError,
            deletionInfo: deletionInfo,
            form: form,
            errors: errors,
            genders: genders,
            centers: centers,
            maxDate: maxDate,
            isFormValid: isFormValid,
            handleSubmit: handleSubmit,
            confirmDelete: confirmDelete,
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
