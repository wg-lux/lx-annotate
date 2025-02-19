import { patientService } from '@/api/patientService';
export default (await import('vue')).defineComponent({
    name: 'CasesOverview',
    data() {
        return {
            patients: [],
            showPatientForm: false,
            editingPatient: null,
            patientForm: {
                id: null,
                first_name: '',
                last_name: '',
                age: null,
                comments: '',
                gender: null
            },
            errorMessage: ''
        };
    },
    methods: {
        async loadPatients() {
            try {
                this.patients = await patientService.getPatients();
            }
            catch (error) {
                console.error('Error loading patients:', error);
            }
        },
        openPatientForm(patient = null) {
            if (patient) {
                this.editingPatient = patient;
                this.patientForm = { ...patient };
            }
            else {
                this.editingPatient = null;
                this.patientForm = { id: null, first_name: '', last_name: '', age: null, comments: '', gender: null };
            }
            this.showPatientForm = true;
        },
        closePatientForm() {
            this.showPatientForm = false;
            this.editingPatient = null;
            this.patientForm = { id: null, first_name: '', last_name: '', age: null, comments: '', gender: null };
        },
        async submitPatientForm() {
            try {
                if (this.editingPatient) {
                    const response = await patientService.updatePatient(this.patientForm.id, this.patientForm);
                    const index = this.patients.findIndex(p => p.id === this.patientForm.id);
                    if (index !== -1) {
                        this.$set(this.patients, index, response.data);
                    }
                }
                else {
                    const newPatient = await patientService.addPatient(this.patientForm);
                    this.patients.push(newPatient.data);
                }
                this.closePatientForm();
            }
            catch (error) {
                console.error('Error saving patient:', error);
            }
        },
        async deletePatient(id) {
            try {
                await patientService.deletePatient(id);
                this.patients = this.patients.filter(patient => patient.id !== id);
            }
            catch (error) {
                console.error('Error deleting patient:', error);
            }
        }
    },
    mounted() {
        this.loadPatients();
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("patients-section mt-5") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openPatientForm();
            } },
        ...{ class: ("btn btn-primary mb-3") },
    });
    if (__VLS_ctx.showPatientForm) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-container mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.editingPatient ? 'Patient bearbeiten' : 'Neuer Patient');
        __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.submitPatientForm) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientFirstName"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("text"),
            id: ("patientFirstName"),
            value: ((__VLS_ctx.patientForm.first_name)),
            ...{ class: ("form-control") },
            required: (true),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientLastName"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("text"),
            id: ("patientLastName"),
            value: ((__VLS_ctx.patientForm.last_name)),
            ...{ class: ("form-control") },
            required: (true),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientAge"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("number"),
            id: ("patientAge"),
            ...{ class: ("form-control") },
            required: (true),
        });
        (__VLS_ctx.patientForm.age);
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
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("radio"),
            value: ((1)),
            required: (true),
        });
        (__VLS_ctx.patientForm.gender);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("radio"),
            value: ((2)),
            required: (true),
        });
        (__VLS_ctx.patientForm.gender);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("radio"),
            value: ((3)),
            required: (true),
        });
        (__VLS_ctx.patientForm.gender);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: ("submit"),
            ...{ class: ("btn btn-success mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closePatientForm) },
            type: ("button"),
            ...{ class: ("btn btn-secondary mt-2") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-striped") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.patients))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: ((patient.id)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.first_name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.last_name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.gender);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.age);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (patient.comments);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.openPatientForm(patient);
                } },
            ...{ class: ("btn btn-secondary btn-sm") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.deletePatient(patient.id);
                } },
            ...{ class: ("btn btn-danger btn-sm") },
        });
    }
    ['container-fluid', 'py-4', 'patients-section', 'mt-5', 'btn', 'btn-primary', 'mb-3', 'form-container', 'mt-4', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'btn', 'btn-success', 'mt-2', 'btn', 'btn-secondary', 'mt-2', 'table', 'table-striped', 'btn', 'btn-secondary', 'btn-sm', 'btn', 'btn-danger', 'btn-sm',];
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
