import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
// Store
const patientStore = usePatientStore();
// Local state
const showPatientForm = ref(false);
const editingPatient = ref(null);
const formErrors = ref([]);
const patientForm = ref({
    id: null,
    first_name: '',
    last_name: '',
    dob: '',
    gender: null,
    center: null,
    email: '',
    phone: '',
    patient_hash: '',
    comments: ''
});
// Computed
const calculatedAge = computed(() => {
    if (!patientForm.value.dob)
        return null;
    return patientStore.calculatePatientAge(patientForm.value.dob);
});
// Methods
const openPatientForm = (patient) => {
    if (patient) {
        editingPatient.value = patient;
        patientForm.value = {
            id: patient.id || null,
            first_name: patient.first_name,
            last_name: patient.last_name,
            dob: patient.dob || '',
            gender: patient.gender || null,
            center: patient.center || null,
            email: patient.email || '',
            phone: patient.phone || '',
            patient_hash: patient.patient_hash || '',
            comments: patient.comments || ''
        };
    }
    else {
        editingPatient.value = null;
        resetPatientForm();
    }
    showPatientForm.value = true;
    formErrors.value = [];
};
const closePatientForm = () => {
    showPatientForm.value = false;
    editingPatient.value = null;
    resetPatientForm();
    formErrors.value = [];
};
const resetPatientForm = () => {
    patientForm.value = {
        id: null,
        first_name: '',
        last_name: '',
        dob: '',
        gender: null,
        center: null,
        email: '',
        phone: '',
        patient_hash: '',
        comments: ''
    };
};
const submitPatientForm = async () => {
    // Validate form
    const validation = patientStore.validatePatientForm(patientForm.value);
    if (!validation.isValid) {
        formErrors.value = validation.errors;
        return;
    }
    formErrors.value = [];
    try {
        const formattedData = patientStore.formatPatientForSubmission(patientForm.value);
        if (editingPatient.value) {
            await patientStore.updatePatient(editingPatient.value.id, formattedData);
        }
        else {
            await patientStore.createPatient(formattedData);
        }
        closePatientForm();
    }
    catch (error) {
        console.error('Error saving patient:', error);
        // Error is handled by the store and displayed in the template
    }
};
const deletePatient = async (id) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Patienten löschen möchten?')) {
        return;
    }
    try {
        await patientStore.deletePatient(id);
    }
    catch (error) {
        console.error('Error deleting patient:', error);
        // Error is handled by the store and displayed in the template
    }
};
const updateCalculatedAge = () => {
    // Trigger reactivity for calculated age
    // The computed property will automatically recalculate
};
const formatDate = (dateString) => {
    if (!dateString)
        return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }
    catch {
        return '-';
    }
};
// Lifecycle
onMounted(async () => {
    try {
        await Promise.all([
            patientStore.fetchPatients(),
            patientStore.initializeLookupData()
        ]);
    }
    catch (error) {
        console.error('Error initializing component:', error);
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['form-section', 'form-section', 'form-group', 'form-control', 'form-control', 'close', 'form-container', 'table-responsive', 'btn-sm',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    if (__VLS_ctx.patientStore.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        (__VLS_ctx.patientStore.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.patientStore.error)))
                        return;
                    __VLS_ctx.patientStore.clearError();
                } },
            type: ("button"),
            ...{ class: ("close") },
            'aria-label': ("Close"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            'aria-hidden': ("true"),
        });
    }
    if (__VLS_ctx.patientStore.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center my-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("sr-only") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("patients-section mt-5") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.patientStore.patientCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openPatientForm();
            } },
        ...{ class: ("btn btn-primary") },
        disabled: ((__VLS_ctx.patientStore.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus") },
    });
    if (__VLS_ctx.showPatientForm) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-container mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.editingPatient ? 'Patient bearbeiten' : 'Neuer Patient');
        if (__VLS_ctx.formErrors.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("mb-0") },
            });
            for (const [error] of __VLS_getVForSourceType((__VLS_ctx.formErrors))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: ((error)),
                });
                (error);
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.submitPatientForm) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientFirstName"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.patientForm.first_name)),
            type: ("text"),
            id: ("patientFirstName"),
            ...{ class: ("form-control") },
            disabled: ((__VLS_ctx.patientStore.loading)),
            required: (true),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientLastName"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.patientForm.last_name)),
            type: ("text"),
            id: ("patientLastName"),
            ...{ class: ("form-control") },
            disabled: ((__VLS_ctx.patientStore.loading)),
            required: (true),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientDob"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.updateCalculatedAge) },
            type: ("date"),
            id: ("patientDob"),
            ...{ class: ("form-control") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        (__VLS_ctx.patientForm.dob);
        if (__VLS_ctx.calculatedAge) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("form-text text-muted") },
            });
            (__VLS_ctx.calculatedAge);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("gender-options") },
        });
        for (const [gender] of __VLS_getVForSourceType((__VLS_ctx.patientStore.genders))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("form-check form-check-inline") },
                key: ((gender.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                value: ((gender.id)),
                type: ("radio"),
                id: ((`gender-${gender.id}`)),
                ...{ class: ("form-check-input") },
                disabled: ((__VLS_ctx.patientStore.loading)),
            });
            (__VLS_ctx.patientForm.gender);
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                for: ((`gender-${gender.id}`)),
                ...{ class: ("form-check-label") },
            });
            (gender.name_de || gender.name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientEmail"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("email"),
            id: ("patientEmail"),
            ...{ class: ("form-control") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        (__VLS_ctx.patientForm.email);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientPhone"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("tel"),
            id: ("patientPhone"),
            ...{ class: ("form-control") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        (__VLS_ctx.patientForm.phone);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientCenter"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            id: ("patientCenter"),
            value: ((__VLS_ctx.patientForm.center)),
            ...{ class: ("form-control") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [center] of __VLS_getVForSourceType((__VLS_ctx.patientStore.centers))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((center.id)),
                value: ((center.id)),
            });
            (center.name_de || center.name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientHash"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("text"),
            id: ("patientHash"),
            value: ((__VLS_ctx.patientForm.patient_hash)),
            ...{ class: ("form-control") },
            placeholder: ("Optional - wird automatisch generiert"),
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("form-text text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientComments"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            id: ("patientComments"),
            value: ((__VLS_ctx.patientForm.comments)),
            ...{ class: ("form-control") },
            rows: ("3"),
            placeholder: ("Zusätzliche Notizen oder Bemerkungen..."),
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-actions") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: ("submit"),
            ...{ class: ("btn btn-success") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        if (__VLS_ctx.patientStore.loading) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm mr-2") },
                role: ("status"),
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closePatientForm) },
            type: ("button"),
            ...{ class: ("btn btn-secondary ml-2") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-responsive") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-striped table-hover") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: ("thead-primary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.patientStore.patientsWithAge))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: ((patient.id)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.first_name);
        (patient.last_name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatDate(patient.dob));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.age ?? '-');
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.patientStore.getGenderDisplayName(patient.gender?.toString() ?? null));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.email || '-');
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.phone || '-');
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.patientStore.getCenterDisplayName(patient.center?.toString() ?? null));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.openPatientForm(patient);
                } },
            ...{ class: ("btn btn-secondary btn-sm mr-1") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-edit") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.deletePatient(patient.id);
                } },
            ...{ class: ("btn btn-danger btn-sm") },
            disabled: ((__VLS_ctx.patientStore.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-trash") },
        });
    }
    if (__VLS_ctx.patientStore.patients.length === 0 && !__VLS_ctx.patientStore.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("9"),
            ...{ class: ("text-center text-muted") },
        });
    }
    ['container-fluid', 'py-4', 'alert', 'alert-danger', 'close', 'text-center', 'my-4', 'spinner-border', 'sr-only', 'patients-section', 'mt-5', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-3', 'btn', 'btn-primary', 'fas', 'fa-plus', 'form-container', 'mt-4', 'alert', 'alert-warning', 'mb-0', 'form-section', 'form-row', 'form-group', 'col-md-6', 'form-control', 'form-group', 'col-md-6', 'form-control', 'form-row', 'form-group', 'col-md-6', 'form-control', 'form-text', 'text-muted', 'form-group', 'col-md-6', 'gender-options', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'form-section', 'form-row', 'form-group', 'col-md-6', 'form-control', 'form-group', 'col-md-6', 'form-control', 'form-section', 'form-row', 'form-group', 'col-md-6', 'form-control', 'form-group', 'col-md-6', 'form-control', 'form-text', 'text-muted', 'form-section', 'form-group', 'form-control', 'form-actions', 'btn', 'btn-success', 'spinner-border', 'spinner-border-sm', 'mr-2', 'btn', 'btn-secondary', 'ml-2', 'table-responsive', 'table', 'table-striped', 'table-hover', 'thead-primary', 'btn', 'btn-secondary', 'btn-sm', 'mr-1', 'fas', 'fa-edit', 'btn', 'btn-danger', 'btn-sm', 'fas', 'fa-trash', 'text-center', 'text-muted',];
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
            showPatientForm: showPatientForm,
            editingPatient: editingPatient,
            formErrors: formErrors,
            patientForm: patientForm,
            calculatedAge: calculatedAge,
            openPatientForm: openPatientForm,
            closePatientForm: closePatientForm,
            submitPatientForm: submitPatientForm,
            deletePatient: deletePatient,
            updateCalculatedAge: updateCalculatedAge,
            formatDate: formatDate,
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
