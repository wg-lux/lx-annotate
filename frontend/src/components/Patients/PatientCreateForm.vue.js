import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { patientService } from '@/api/patientService';
const emit = defineEmits();
// Composables
const patientStore = usePatientStore();
// Reactive state
const loading = ref(false);
const errors = ref({});
const form = ref({
    id: null,
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
    return form.value.firstName.trim() !== '' &&
        form.value.lastName.trim() !== '' &&
        Object.keys(errors.value).length === 0;
});
// Methods
const validateForm = () => {
    errors.value = {};
    // Required fields
    if (!form.value.firstName?.trim()) {
        errors.value.firstName = 'Vorname ist erforderlich';
    }
    if (!form.value.lastName?.trim()) {
        errors.value.lastName = 'Nachname ist erforderlich';
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
    console.log('=== FORM SUBMIT START ===');
    console.log('handleSubmit aufgerufen!', {
        formValid: isFormValid.value,
        loading: loading.value,
        formData: form.value
    });
    if (!validateForm()) {
        console.log('❌ Validierung fehlgeschlagen:', errors.value);
        return;
    }
    let formattedData = null;
    try {
        loading.value = true;
        errors.value = {}; // Reset errors
        console.log('✅ Validation passed, sende Daten:', form.value);
        // Format data for submission using patientStore method
        formattedData = patientStore.formatPatientForSubmission(form.value);
        console.log('📋 Formatierte Daten für API:', formattedData);
        // Log the exact URL that will be called
        console.log('🌐 API-Aufruf wird gestartet...');
        console.log('URL:', `/api/patients/`);
        console.log('Full URL wird zu:', `${window.location.origin}/api/patients/`);
        // Use patientStore instead of patientService for consistency
        const newPatient = await patientStore.createPatient(formattedData);
        console.log('🎉 Patient erfolgreich erstellt:', newPatient);
        // Reset form
        form.value = {
            id: null,
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
        // Emit event with the created patient
        emit('patient-created', newPatient);
        console.log('📤 Event patient-created ausgelöst mit:', newPatient);
        console.log('=== FORM SUBMIT SUCCESS ===');
    }
    catch (error) {
        console.log('=== FORM SUBMIT ERROR ===');
        console.error('❌ KOMPLETTES ERROR-OBJEKT:', error);
        console.error('❌ ERROR STACK:', error.stack);
        console.error('❌ ERROR NAME:', error.name);
        console.error('❌ ERROR MESSAGE:', error.message);
        // Handle different error types
        if (error.message && error.message.includes('HTTP error!')) {
            // This is from our fetch-based patientStore
            errors.value.general = 'Server-Fehler beim Erstellen des Patienten. Prüfen Sie Ihre Verbindung.';
        }
        else {
            errors.value.general = error.message || 'Unbekannter Fehler beim Erstellen des Patienten';
        }
        // Zusätzliche Debugging-Informationen
        console.error('🔍 Zusätzliche Debug-Infos:', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            formattedData: formattedData,
            timestamp: new Date().toISOString()
        });
    }
    finally {
        loading.value = false;
        console.log('🏁 Loading beendet, finaler Zustand:', {
            loading: loading.value,
            errors: errors.value,
            hasErrors: Object.keys(errors.value).length > 0
        });
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
    ['form-section', 'form-section', 'form-section', 'form-group', 'form-group', 'form-control', 'form-control', 'form-control', 'is-invalid', 'btn', 'btn-primary', 'btn-secondary', 'form-actions', 'form-actions', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-create-form") },
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
        value: ((__VLS_ctx.form.firstName)),
        type: ("text"),
        id: ("firstName"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.firstName })) },
        required: (true),
        placeholder: ("Vorname eingeben"),
    });
    if (__VLS_ctx.errors.firstName) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.firstName);
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
        value: ((__VLS_ctx.form.lastName)),
        type: ("text"),
        id: ("lastName"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.lastName })) },
        required: (true),
        placeholder: ("Nachname eingeben"),
    });
    if (__VLS_ctx.errors.lastName) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.lastName);
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
        (center.nameDe || center.name);
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
    (__VLS_ctx.form.isRealPerson);
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("form-text text-muted d-block") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-actions") },
    });
    if (__VLS_ctx.errors.general) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger w-100 mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.errors.general);
    }
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
    (__VLS_ctx.loading ? 'Wird gespeichert...' : 'Patient erstellen');
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
    ['patient-create-form', 'form-section', 'fas', 'fa-user', 'row', 'col-md-6', 'form-group', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'row', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-text', 'text-muted', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-section', 'fas', 'fa-address-book', 'row', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-section', 'fas', 'fa-hospital', 'row', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'form-check-input', 'me-2', 'form-text', 'text-muted', 'd-block', 'form-actions', 'alert', 'alert-danger', 'w-100', 'mb-3', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-save', 'me-2', 'btn', 'btn-secondary', 'ms-2', 'fas', 'fa-times', 'me-2',];
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
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
