import { ref, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { createApiClient } from '@/api/client';
// Store und API Client
const patientStore = usePatientStore();
const apiClient = createApiClient();
// Reactive state
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
// Form data mit korrekten Feldnamen und Typen
const formData = ref({
    first_name: '',
    last_name: '',
    dob: null,
    email: '',
    phone: '',
    gender: null,
    center: null,
    patient_hash: '',
    comments: '',
    is_real_person: true
});
// Computed properties für Store-Daten
const genders = ref(patientStore.genders);
const centers = ref(patientStore.centers);
// Methods
const resetForm = () => {
    formData.value = {
        first_name: '',
        last_name: '',
        dob: null,
        email: '',
        phone: '',
        gender: null,
        center: null,
        patient_hash: '',
        comments: '',
        is_real_person: true
    };
};
const handleSubmit = async () => {
    try {
        loading.value = true;
        errorMessage.value = '';
        successMessage.value = '';
        // Validation
        if (!formData.value.first_name?.trim()) {
            throw new Error('Vorname ist erforderlich');
        }
        if (!formData.value.last_name?.trim()) {
            throw new Error('Nachname ist erforderlich');
        }
        // Create patient using store with formatted data
        const formattedData = patientStore.formatPatientForSubmission(formData.value);
        const newPatient = await patientStore.createPatient(apiClient, formattedData);
        successMessage.value = `Patient "${newPatient.first_name} ${newPatient.last_name}" wurde erfolgreich erstellt!`;
        // Reset form after successful creation
        resetForm();
    }
    catch (error) {
        errorMessage.value = error.message || 'Fehler beim Erstellen des Patienten';
        console.error('Error creating patient:', error);
    }
    finally {
        loading.value = false;
    }
};
// Load required data on component mount
onMounted(async () => {
    try {
        // Load genders and centers for dropdowns
        await Promise.all([
            patientStore.fetchGenders(apiClient),
            patientStore.fetchCenters(apiClient)
        ]);
    }
    catch (error) {
        console.error('Error loading dropdown data:', error);
        errorMessage.value = 'Fehler beim Laden der Auswahloptionen';
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['btn-primary', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("firstName"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        value: ((__VLS_ctx.formData.first_name)),
        id: ("firstName"),
        type: ("text"),
        required: (true),
        placeholder: ("Vorname eingeben"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("lastName"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        value: ((__VLS_ctx.formData.last_name)),
        id: ("lastName"),
        type: ("text"),
        required: (true),
        placeholder: ("Nachname eingeben"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("dob"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("dob"),
        type: ("date"),
        placeholder: ("YYYY-MM-DD"),
    });
    (__VLS_ctx.formData.dob);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("email"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("email"),
        type: ("email"),
        placeholder: ("email@beispiel.de"),
    });
    (__VLS_ctx.formData.email);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("phone"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("phone"),
        type: ("tel"),
        placeholder: ("Telefonnummer"),
    });
    (__VLS_ctx.formData.phone);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.gender)),
        id: ("genderSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("centerSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.center)),
        id: ("centerSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("checkbox"),
    });
    (__VLS_ctx.formData.is_real_person);
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        disabled: ((__VLS_ctx.loading)),
        ...{ class: ("btn btn-primary") },
    });
    (__VLS_ctx.loading ? 'Wird gespeichert...' : 'Patient erstellen');
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-2") },
        });
        (__VLS_ctx.errorMessage);
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success mt-2") },
        });
        (__VLS_ctx.successMessage);
    }
    ['btn', 'btn-primary', 'alert', 'alert-danger', 'mt-2', 'alert', 'alert-success', 'mt-2',];
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
            errorMessage: errorMessage,
            successMessage: successMessage,
            formData: formData,
            genders: genders,
            centers: centers,
            handleSubmit: handleSubmit,
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
