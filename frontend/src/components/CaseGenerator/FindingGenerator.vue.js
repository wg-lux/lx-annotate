"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const reportService_1 = require("@/api/reportService");
const patientService_1 = require("@/api/patientService");
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    data() {
        return {
            // Data loaded from the backend
            centers: [],
            examinations: [],
            findings: [],
            locationClassifications: [],
            locationClassificationChoices: [],
            morphologyClassifications: [],
            morphologyClassificationChoices: [],
            interventions: [],
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
            errorMessage: '',
            // Form data
            formData: {
                name: '',
                polypCount: '',
                comments: '',
                gender: '',
                centerId: '',
                examinationId: '',
                findingId: '',
                locationClassificationId: '',
                locationChoiceId: '',
                morphologyClassificationId: '',
                morphologyChoiceId: '',
                selectedInterventions: []
            },
            errorMessage: ''
        };
    },
    computed: {
        filteredLocationChoices() {
            const classificationId = parseInt(this.formData.locationClassificationId, 10);
            return this.locationClassificationChoices.filter((choice) => choice.classificationId === classificationId);
        },
        filteredMorphologyChoices() {
            const classificationId = parseInt(this.formData.morphologyClassificationId, 10);
            return this.morphologyClassificationChoices.filter((choice) => choice.classificationId === classificationId);
        }
    },
    methods: {
        async loadPatients() {
            try {
                this.patients = await patientService_1.patientService.getPatients();
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
                    const response = await patientService_1.patientService.updatePatient(this.patientForm.id, this.patientForm);
                    const index = this.patients.findIndex(p => p.id === this.patientForm.id);
                    if (index !== -1) {
                        this.$set(this.patients, index, response.data);
                    }
                }
                else {
                    const newPatient = await patientService_1.patientService.addPatient(this.patientForm);
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
                await patientService_1.patientService.deletePatient(id);
                this.patients = this.patients.filter(patient => patient.id !== id);
            }
            catch (error) {
                console.error('Error deleting patient:', error);
            }
        },
        async loadCenters() {
            try {
                this.centers = await reportService.getCenters();
            }
            catch (error) {
                console.error('Error loading centers:', error);
            }
        },
        async loadExaminations() {
            console.log("loadExaminations");
            try {
                this.examinations = await reportService.getExaminations();
                console.log(this.examinations);
            }
            catch (error) {
                console.error('Error loading examinations:', error);
            }
        },
        async loadFindings() {
            try {
                this.findings = await reportService.getFindings();
            }
            catch (error) {
                console.error('Error loading findings:', error);
            }
        },
        async loadLocationClassifications() {
            try {
                this.locationClassifications = await reportService.getLocationClassifications();
            }
            catch (error) {
                console.error('Error loading location classifications:', error);
            }
        },
        async loadLocationClassificationChoices() {
            try {
                this.locationClassificationChoices = await reportService.getLocationClassificationChoices();
            }
            catch (error) {
                console.error('Error loading location classification choices:', error);
            }
        },
        async loadMorphologyClassifications() {
            try {
                this.morphologyClassifications = await reportService.getMorphologyClassifications();
            }
            catch (error) {
                console.error('Error loading morphology classifications:', error);
            }
        },
        async loadMorphologyClassificationChoices() {
            try {
                this.morphologyClassificationChoices = await reportService.getMorphologyClassificationChoices();
            }
            catch (error) {
                console.error('Error loading morphology classification choices:', error);
            }
        },
        async loadInterventions() {
            try {
                this.interventions = await reportService.getInterventions();
            }
            catch (error) {
                console.error('Error loading interventions:', error);
            }
        },
        loadLocationChoices() {
            this.formData.locationChoiceId = '';
        },
        loadMorphologyChoices() {
            this.formData.morphologyChoiceId = '';
        },
        getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },
        async handleSubmit() {
            if (!this.formData.name.trim()) {
                this.errorMessage = 'Name cannot be empty. Please enter a name.';
                return;
            }
            if (!this.formData.centerId) {
                this.errorMessage = 'Please select a center.';
                return;
            }
            if (!this.formData.examinationId) {
                this.errorMessage = 'Please select an examination type.';
                return;
            }
            if (!this.formData.findingId) {
                this.errorMessage = 'Please select a finding.';
                return;
            }
            this.errorMessage = '';
            const csrfToken = this.getCookie('csrftoken');
            const payload = { ...this.formData };
            try {
                const response = await axios_1.default.post('api/save-workflow-data/', payload, {
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.data.status === 'success') {
                    alert('Workflow data saved successfully!');
                }
                else {
                    alert('Failed to save data.');
                }
            }
            catch (error) {
                console.error('Error:', error);
            }
        }
    },
    async mounted() {
        await Promise.all([
            this.loadCenters(),
            this.loadExaminations(),
            this.loadFindings(),
            this.loadLocationClassifications(),
            this.loadLocationClassificationChoices(),
            this.loadMorphologyClassifications(),
            this.loadMorphologyClassificationChoices(),
            this.loadInterventions()
        ]);
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
            placeholder: ("Thomas"),
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
            placeholder: ("Lux"),
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
            placeholder: ("30"),
            ...{ class: ("form-control") },
            required: (true),
        });
        (__VLS_ctx.patientForm.age);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patientComments"),
            placeholder: ("Endoskopie zur Diagnose"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("name"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("name"),
        placeholder: ("Enter name"),
        ...{ class: ("form-control") },
    });
    (__VLS_ctx.formData.name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("comments"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: ((__VLS_ctx.formData.comments)),
        id: ("comments"),
        placeholder: ("Comments"),
        ...{ class: ("form-control") },
        rows: ("3"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label d-block") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check form-check-inline") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderFemale"),
        name: ("gender"),
        value: ("female"),
        ...{ class: ("form-check-input") },
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("genderFemale"),
        ...{ class: ("form-check-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check form-check-inline") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderMale"),
        name: ("gender"),
        value: ("male"),
        ...{ class: ("form-check-input") },
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("genderMale"),
        ...{ class: ("form-check-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check form-check-inline") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderDivers"),
        name: ("gender"),
        value: ("divers"),
        ...{ class: ("form-check-input") },
        checked: ("checked"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("genderDivers"),
        ...{ class: ("form-check-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("centerSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.centerId)),
        id: ("centerSelect"),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examTypeSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.examinationId)),
        id: ("examTypeSelect"),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((exam.id)),
            value: ((exam.id)),
        });
        (exam.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("findingSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.findingId)),
        id: ("findingSelect"),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.findings))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((finding.id)),
            value: ((finding.id)),
        });
        (finding.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("locationClassificationSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.loadLocationChoices) },
        value: ((__VLS_ctx.formData.locationClassificationId)),
        id: ("locationClassificationSelect"),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [locClass] of __VLS_getVForSourceType((__VLS_ctx.locationClassifications))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((locClass.id)),
            value: ((locClass.id)),
        });
        (locClass.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("locationChoiceSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.locationChoiceId)),
        id: ("locationChoiceSelect"),
        ...{ class: ("form-select") },
        disabled: ((__VLS_ctx.filteredLocationChoices.length === 0)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [choice] of __VLS_getVForSourceType((__VLS_ctx.filteredLocationChoices))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((choice.id)),
            value: ((choice.id)),
        });
        (choice.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("morphologyClassificationSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.loadMorphologyChoices) },
        value: ((__VLS_ctx.formData.morphologyClassificationId)),
        id: ("morphologyClassificationSelect"),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [morphClass] of __VLS_getVForSourceType((__VLS_ctx.morphologyClassifications))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((morphClass.id)),
            value: ((morphClass.id)),
        });
        (morphClass.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("morphologyChoiceSelect"),
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.morphologyChoiceId)),
        id: ("morphologyChoiceSelect"),
        ...{ class: ("form-select") },
        disabled: ((__VLS_ctx.filteredMorphologyChoices.length === 0)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [choice] of __VLS_getVForSourceType((__VLS_ctx.filteredMorphologyChoices))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((choice.id)),
            value: ((choice.id)),
        });
        (choice.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    for (const [intervention] of __VLS_getVForSourceType((__VLS_ctx.interventions))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((intervention.id)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            disabled: (true),
            value: (""),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        id: ("saveData"),
        ...{ class: ("btn btn-danger") },
    });
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-2") },
        });
        (__VLS_ctx.errorMessage);
    }
    ['container-fluid', 'py-4', 'patients-section', 'mt-5', 'btn', 'btn-primary', 'mb-3', 'form-container', 'mt-4', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'btn', 'btn-success', 'mt-2', 'btn', 'btn-secondary', 'mt-2', 'table', 'table-striped', 'btn', 'btn-secondary', 'btn-sm', 'btn', 'btn-danger', 'btn-sm', 'container', 'mt-4', 'container-fluid', 'py-4', 'mb-0', 'container', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'd-block', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'mb-3', 'btn', 'btn-danger', 'alert', 'alert-danger', 'mt-2',];
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
