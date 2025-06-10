import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { patientService } from '@/api/patientService';
const props = defineProps();
const emit = defineEmits();
// Composables
const patientStore = usePatientStore();
// Reactive state
const loading = ref(false);
const errors = ref({});
const form = ref({
    id: props.patient.id || null,
    first_name: props.patient.first_name || '',
    last_name: props.patient.last_name || '',
    dob: props.patient.dob || null,
    email: props.patient.email || '',
    phone: props.patient.phone || '',
    gender: props.patient.gender || null, // Keep as string
    center: props.patient.center || null, // Keep as string
    is_real_person: props.patient.is_real_person ?? true,
    patient_hash: props.patient.patient_hash || '',
    comments: props.patient.comments || ''
});
// Computed
const genders = computed(() => patientStore.genders);
const centers = computed(() => patientStore.centers);
const calculatedAge = computed(() => {
    if (!form.value.dob)
        return null;
    try {
        const birthDate = new Date(form.value.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    }
    catch {
        return null;
    }
});
const isFormValid = computed(() => {
    return form.value.first_name.trim() !== '' &&
        form.value.last_name.trim() !== '' &&
        Object.keys(errors.value).length === 0;
});
// Methods
const validateForm = () => {
    errors.value = {};
    // Required fields
    if (!form.value.first_name?.trim()) {
        errors.value.first_name = 'Vorname ist erforderlich';
    }
    if (!form.value.last_name?.trim()) {
        errors.value.last_name = 'Nachname ist erforderlich';
    }
    // Date validation
    if (form.value.dob) {
        const birthDate = new Date(form.value.dob);
        const today = new Date();
        if (birthDate > today) {
            errors.value.dob = 'Geburtsdatum kann nicht in der Zukunft liegen';
        }
    }
    // Email validation
    if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
        errors.value.email = 'Ungültige E-Mail-Adresse';
    }
    return Object.keys(errors.value).length === 0;
};
const handleSubmit = async () => {
    if (!validateForm()) {
        return;
    }
    try {
        loading.value = true;
        // Format data for submission
        const formattedData = patientService.formatPatientData(form.value);
        const updatedPatient = await patientService.updatePatient(props.patient.id, formattedData);
        emit('patient-updated', updatedPatient);
    }
    catch (error) {
        console.error('Error updating patient:', error);
        // Handle validation errors from backend
        if (error.response?.data) {
            const backendErrors = error.response.data;
            if (typeof backendErrors === 'object') {
                Object.keys(backendErrors).forEach(field => {
                    if (Array.isArray(backendErrors[field])) {
                        errors.value[field] = backendErrors[field][0];
                    }
                    else {
                        errors.value[field] = backendErrors[field];
                    }
                });
            }
        }
    }
    finally {
        loading.value = false;
    }
};
const loadLookupData = async () => {
    try {
        // Load genders and centers if not already loaded
        if (genders.value.length === 0) {
            const gendersData = await patientService.getGenders();
            patientStore.genders = gendersData;
        }
        if (centers.value.length === 0) {
            const centersData = await patientService.getCenters();
            patientStore.centers = centersData;
        }
    }
    catch (error) {
        console.error('Error loading lookup data:', error);
    }
};
// Lifecycle
onMounted(() => {
    loadLookupData();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['form-section', 'form-section', 'form-section', 'form-group', 'form-group', 'form-control', 'form-control', 'form-control', 'is-invalid', 'form-control', 'btn', 'btn-primary', 'btn-secondary', 'form-actions', 'form-actions', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-edit-form") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("firstName"),
        ...{ class: ("required") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        value: ((__VLS_ctx.form.first_name)),
        type: ("text"),
        id: ("firstName"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.first_name })) },
        required: (true),
        placeholder: ("Vorname eingeben"),
    });
    if (__VLS_ctx.errors.first_name) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.first_name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("lastName"),
        ...{ class: ("required") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        value: ((__VLS_ctx.form.last_name)),
        type: ("text"),
        id: ("lastName"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.last_name })) },
        required: (true),
        placeholder: ("Nachname eingeben"),
    });
    if (__VLS_ctx.errors.last_name) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.last_name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("dob"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("date"),
        id: ("dob"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.dob })) },
    });
    (__VLS_ctx.form.dob);
    if (__VLS_ctx.errors.dob) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.dob);
    }
    if (__VLS_ctx.calculatedAge) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("form-text text-muted") },
        });
        (__VLS_ctx.calculatedAge);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("gender"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.form.gender)),
        id: ("gender"),
        ...{ class: ("form-control") },
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
        (gender.name_de || gender.name);
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-address-book") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("email"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("email"),
        id: ("email"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.email })) },
        placeholder: ("email@beispiel.de"),
    });
    (__VLS_ctx.form.email);
    if (__VLS_ctx.errors.email) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.email);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("phone"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("tel"),
        id: ("phone"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.phone })) },
        placeholder: ("+49 123 456789"),
    });
    (__VLS_ctx.form.phone);
    if (__VLS_ctx.errors.phone) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.phone);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-hospital") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("center"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.form.center)),
        id: ("center"),
        ...{ class: ("form-control") },
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
        (center.name_de || center.name);
    }
    if (__VLS_ctx.errors.center) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.center);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("checkbox"),
        ...{ class: ("form-check-input me-2") },
    });
    (__VLS_ctx.form.is_real_person);
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("form-text text-muted d-block") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patientHash"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        value: ((__VLS_ctx.form.patient_hash)),
        type: ("text"),
        id: ("patientHash"),
        ...{ class: ("form-control font-mono") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.patient_hash })) },
        placeholder: ("Automatisch generiert"),
        readonly: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("form-text text-muted") },
    });
    if (__VLS_ctx.errors.patient_hash) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.patient_hash);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-actions") },
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
    (__VLS_ctx.loading ? 'Wird gespeichert...' : 'Änderungen speichern');
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('cancel');
            } },
        type: ("button"),
        ...{ class: ("btn btn-secondary ms-2") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-times me-2") },
    });
    ['patient-edit-form', 'form-section', 'fas', 'fa-user', 'row', 'col-md-6', 'form-group', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'row', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-text', 'text-muted', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-section', 'fas', 'fa-address-book', 'row', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-section', 'fas', 'fa-hospital', 'row', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'form-check-input', 'me-2', 'form-text', 'text-muted', 'd-block', 'row', 'col-md-12', 'form-group', 'form-control', 'font-mono', 'is-invalid', 'form-text', 'text-muted', 'invalid-feedback', 'form-actions', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-save', 'me-2', 'btn', 'btn-secondary', 'ms-2', 'fas', 'fa-times', 'me-2',];
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
            errors: errors,
            form: form,
            genders: genders,
            centers: centers,
            calculatedAge: calculatedAge,
            isFormValid: isFormValid,
            handleSubmit: handleSubmit,
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
