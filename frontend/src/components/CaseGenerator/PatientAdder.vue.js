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
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    data() {
        return {
            // Data that will be loaded from the Django backend
            centers: [],
            examinations: [],
            findings: [],
            locationClassifications: [],
            locationClassificationChoices: [],
            morphologyClassifications: [],
            morphologyClassificationChoices: [],
            interventions: [],
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
        // Dynamically filter location choices based on the classification selected
        filteredLocationChoices() {
            const classificationId = parseInt(this.formData.locationClassificationId, 10);
            return this.locationClassificationChoices.filter((choice) => choice.classificationId === classificationId);
        },
        // Dynamically filter morphology choices
        filteredMorphologyChoices() {
            const classificationId = parseInt(this.formData.morphologyClassificationId, 10);
            return this.morphologyClassificationChoices.filter((choice) => choice.classificationId === classificationId);
        }
    },
    methods: {
        // --- Data Loaders with Axios ---
        async loadCenters() {
            try {
                const response = await axios_1.default.get('api/centers/');
                this.centers = response.data; // Expecting a JSON array of centers
            }
            catch (error) {
                console.error('Error loading centers:', error);
            }
        },
        async loadExaminations() {
            try {
                const response = await axios_1.default.get('api/examinations/');
                this.examinations = response.data;
            }
            catch (error) {
                console.error('Error loading examinations:', error);
            }
        },
        async loadFindings() {
            try {
                const response = await axios_1.default.get('api/findings/');
                this.findings = response.data;
            }
            catch (error) {
                console.error('Error loading findings:', error);
            }
        },
        async loadLocationClassifications() {
            try {
                const response = await axios_1.default.get('api//location-classifications/');
                this.locationClassifications = response.data;
            }
            catch (error) {
                console.error('Error loading location classifications:', error);
            }
        },
        async loadLocationClassificationChoices() {
            try {
                const response = await axios_1.default.get('api/location-classification-choices/');
                this.locationClassificationChoices = response.data;
            }
            catch (error) {
                console.error('Error loading location classification choices:', error);
            }
        },
        async loadMorphologyClassifications() {
            try {
                const response = await axios_1.default.get('api/morphology-classifications/');
                this.morphologyClassifications = response.data;
            }
            catch (error) {
                console.error('Error loading morphology classifications:', error);
            }
        },
        async loadMorphologyClassificationChoices() {
            try {
                const response = await axios_1.default.get('api/morphology-classification-choices/');
                this.morphologyClassificationChoices = response.data;
            }
            catch (error) {
                console.error('Error loading morphology classification choices:', error);
            }
        },
        async loadInterventions() {
            try {
                const response = await axios_1.default.get('api/interventions/');
                this.interventions = response.data;
            }
            catch (error) {
                console.error('Error loading interventions:', error);
            }
        },
        // Called on classification change
        loadLocationChoices() {
            this.formData.locationChoiceId = '';
        },
        loadMorphologyChoices() {
            this.formData.morphologyChoiceId = '';
        },
        // Utility to get CSRF token
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
        // Submit Handler using Axios
        async handleSubmit() {
            // Basic validation example
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
            // Reset error message if all required fields are filled
            this.errorMessage = '';
            const csrfToken = this.getCookie('csrftoken');
            // Build payload from the formData
            const payload = { ...this.formData };
            try {
                const response = await axios_1.default.post('api/save-workflow-data/', payload, {
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    }
                });
                // Check backend response
                if (response.data.status === 'success') {
                    alert('Workflow data saved successfully!');
                    // Possibly reset form data or navigate to a report view
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
        // Load all data in parallel or sequentially as you see fit.
        // Example of parallel loading:
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("name"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("name"),
        placeholder: ("Enter name"),
    });
    (__VLS_ctx.formData.name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("polypCount"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        id: ("polypCount"),
        type: ("number"),
        placeholder: ("Anzahl der Polypen"),
    });
    (__VLS_ctx.formData.polypCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("comments"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: ((__VLS_ctx.formData.comments)),
        id: ("comments"),
        placeholder: ("Comments"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderFemale"),
        name: ("gender"),
        value: ("female"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderMale"),
        name: ("gender"),
        value: ("male"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        id: ("genderDivers"),
        name: ("gender"),
        value: ("divers"),
    });
    (__VLS_ctx.formData.gender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("centerSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.centerId)),
        id: ("centerSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (const [center] of __VLS_getVForSourceType((__VLS_ctx.centers))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((center.id)),
            value: ((center.id)),
        });
        (center.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examTypeSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.examinationId)),
        id: ("examTypeSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("findingSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.findingId)),
        id: ("findingSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("locationClassificationSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.loadLocationChoices) },
        value: ((__VLS_ctx.formData.locationClassificationId)),
        id: ("locationClassificationSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("locationChoiceSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.locationChoiceId)),
        id: ("locationChoiceSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("morphologyClassificationSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.loadMorphologyChoices) },
        value: ((__VLS_ctx.formData.morphologyClassificationId)),
        id: ("morphologyClassificationSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("morphologyChoiceSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.formData.morphologyChoiceId)),
        id: ("morphologyChoiceSelect"),
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    for (const [intervention] of __VLS_getVForSourceType((__VLS_ctx.interventions))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((intervention.id)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("checkbox"),
            value: ((intervention.id)),
        });
        (__VLS_ctx.formData.selectedInterventions);
        (intervention.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        id: ("saveData"),
    });
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-2") },
        });
        (__VLS_ctx.errorMessage);
    }
    ['alert', 'alert-danger', 'mt-2',];
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
