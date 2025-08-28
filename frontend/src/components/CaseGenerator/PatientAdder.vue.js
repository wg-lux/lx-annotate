import { ref, onMounted, computed } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
const emit = defineEmits();
// Store
const patientStore = usePatientStore();
// Reactive state
const successMessage = ref('');
// Form data mit korrekten Feldnamen und Typen
const formData = ref({
    firstName: '',
    lastName: '',
    dob: null,
    email: '',
    phone: '',
    gender: null,
    center: null,
    patientHash: '',
    comments: '',
    isRealPerson: true
});
// Computed properties für Store-Daten
const genders = computed(() => patientStore.genders);
const centers = computed(() => patientStore.centers);
// Methods
const resetForm = () => {
    formData.value = {
        firstName: '',
        lastName: '',
        dob: null,
        email: '',
        phone: '',
        gender: null,
        center: null,
        patientHash: '',
        comments: '',
        isRealPerson: true
    };
};
const handleSubmit = async () => {
    patientStore.clearError();
    successMessage.value = '';
    // Validation
    if (!formData.value.firstName?.trim()) {
        patientStore.error = 'Vorname ist erforderlich';
        return;
    }
    if (!formData.value.lastName?.trim()) {
        patientStore.error = 'Nachname ist erforderlich';
        return;
    }
    try {
        // Create patient using store with formatted data
        const formattedData = patientStore.formatPatientForSubmission(formData.value);
        const newPatient = await patientStore.createPatient(formattedData);
        successMessage.value = `Patient "${newPatient.firstName} ${newPatient.lastName}" wurde erfolgreich erstellt!`;
        // Emit event for parent component with error handling
        try {
            emit('patient-created', newPatient);
        }
        catch (emitError) {
            console.error('Error emitting patient-created event:', emitError);
        }
        // Reset form after successful creation
        resetForm();
    }
    catch (error) {
        // Fehler vom Store (z.B. API-Fehler) werden hier weiterhin behandelt
        patientStore.error = error.message || 'Fehler beim Erstellen des Patienten';
        console.error('Error creating patient:', error);
    }
};
const handleCancel = () => {
    try {
        emit('cancel');
    }
    catch (error) {
        console.error('Error emitting cancel event:', error);
    }
};
// Load required data on component mount
onMounted(async () => {
    try {
        // Ensure store is available
        if (!patientStore) {
            console.error('PatientStore is not available');
            return;
        }
        patientStore.clearError();
        // Load genders and centers for dropdowns
        await Promise.all([
            patientStore.fetchGenders(),
            patientStore.fetchCenters()
        ]);
    }
    catch (error) {
        console.error('Error loading dropdown data:', error);
        if (patientStore?.error !== undefined) {
            patientStore.error = 'Fehler beim Laden der Auswahloptionen';
        }
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
        value: ((__VLS_ctx.formData.firstName)),
        id: ("firstName"),
        type: ("text"),
        required: (true),
        placeholder: ("Vorname eingeben"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("lastName"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        value: ((__VLS_ctx.formData.lastName)),
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
        (gender.nameDe || gender.name);
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
        (center.nameDe || center.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("checkbox"),
    });
    (__VLS_ctx.formData.isRealPerson);
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        disabled: ((__VLS_ctx.patientStore.loading)),
        ...{ class: ("btn btn-primary") },
    });
    (__VLS_ctx.patientStore.loading ? 'Wird gespeichert...' : 'Patient erstellen');
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleCancel) },
        type: ("button"),
        ...{ class: ("btn btn-secondary ms-2") },
    });
    if (__VLS_ctx.patientStore.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-2") },
        });
        (__VLS_ctx.patientStore.error);
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success mt-2") },
        });
        (__VLS_ctx.successMessage);
    }
    ['btn', 'btn-primary', 'btn', 'btn-secondary', 'ms-2', 'alert', 'alert-danger', 'mt-2', 'alert', 'alert-success', 'mt-2',];
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
            patientStore: patientStore,
            successMessage: successMessage,
            formData: formData,
            genders: genders,
            centers: centers,
            handleSubmit: handleSubmit,
            handleCancel: handleCancel,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
