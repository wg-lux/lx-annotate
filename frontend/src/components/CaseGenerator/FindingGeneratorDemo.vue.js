var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import axios from 'axios';
import { reportService } from '@/api/reportService.js';
import { patientService } from '@/api/patientService.js';
export default (await import('vue')).defineComponent({
    data: function () {
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
        filteredLocationChoices: function () {
            var classificationId = parseInt(this.formData.locationClassificationId, 10);
            return this.locationClassificationChoices.filter(function (choice) { return choice.classificationId === classificationId; });
        },
        filteredMorphologyChoices: function () {
            var classificationId = parseInt(this.formData.morphologyClassificationId, 10);
            return this.morphologyClassificationChoices.filter(function (choice) { return choice.classificationId === classificationId; });
        }
    },
    methods: {
        loadPatients: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, patientService.getPatients()];
                        case 1:
                            _a.patients = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _b.sent();
                            console.error('Error loading patients:', error_1);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        openPatientForm: function (patient) {
            if (patient === void 0) { patient = null; }
            if (patient) {
                this.editingPatient = patient;
                this.patientForm = __assign({}, patient);
            }
            else {
                this.editingPatient = null;
                this.patientForm = { id: null, first_name: '', last_name: '', age: null, comments: '', gender: null };
            }
            this.showPatientForm = true;
        },
        closePatientForm: function () {
            this.showPatientForm = false;
            this.editingPatient = null;
            this.patientForm = { id: null, first_name: '', last_name: '', age: null, comments: '', gender: null };
        },
        submitPatientForm: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, index, newPatient, error_2;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            if (!this.editingPatient) return [3 /*break*/, 2];
                            return [4 /*yield*/, patientService.updatePatient(this.patientForm.id, this.patientForm)];
                        case 1:
                            response = _a.sent();
                            index = this.patients.findIndex(function (p) { return p.id === _this.patientForm.id; });
                            if (index !== -1) {
                                this.$set(this.patients, index, response.data);
                            }
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, patientService.addPatient(this.patientForm)];
                        case 3:
                            newPatient = _a.sent();
                            this.patients.push(newPatient.data);
                            _a.label = 4;
                        case 4:
                            this.closePatientForm();
                            return [3 /*break*/, 6];
                        case 5:
                            error_2 = _a.sent();
                            console.error('Error saving patient:', error_2);
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        },
        deletePatient: function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, patientService.deletePatient(id)];
                        case 1:
                            _a.sent();
                            this.patients = this.patients.filter(function (patient) { return patient.id !== id; });
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            console.error('Error deleting patient:', error_3);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadCenters: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_4;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getCenters()];
                        case 1:
                            _a.centers = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _b.sent();
                            console.error('Error loading centers:', error_4);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadExaminations: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_5;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            console.log("loadExaminations");
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            _a = this;
                            return [4 /*yield*/, reportService.getExaminations()];
                        case 2:
                            _a.examinations = _b.sent();
                            console.log(this.examinations);
                            return [3 /*break*/, 4];
                        case 3:
                            error_5 = _b.sent();
                            console.error('Error loading examinations:', error_5);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        },
        loadFindings: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_6;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getFindings()];
                        case 1:
                            _a.findings = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_6 = _b.sent();
                            console.error('Error loading findings:', error_6);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadLocationClassifications: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_7;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getLocationClassifications()];
                        case 1:
                            _a.locationClassifications = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_7 = _b.sent();
                            console.error('Error loading location classifications:', error_7);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadLocationClassificationChoices: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_8;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getLocationClassificationChoices()];
                        case 1:
                            _a.locationClassificationChoices = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_8 = _b.sent();
                            console.error('Error loading location classification choices:', error_8);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadMorphologyClassifications: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_9;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getMorphologyClassifications()];
                        case 1:
                            _a.morphologyClassifications = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_9 = _b.sent();
                            console.error('Error loading morphology classifications:', error_9);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadMorphologyClassificationChoices: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_10;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getMorphologyClassificationChoices()];
                        case 1:
                            _a.morphologyClassificationChoices = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_10 = _b.sent();
                            console.error('Error loading morphology classification choices:', error_10);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadInterventions: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, error_11;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            _a = this;
                            return [4 /*yield*/, reportService.getInterventions()];
                        case 1:
                            _a.interventions = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_11 = _b.sent();
                            console.error('Error loading interventions:', error_11);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadLocationChoices: function () {
            this.formData.locationChoiceId = '';
        },
        loadMorphologyChoices: function () {
            this.formData.morphologyChoiceId = '';
        },
        getCookie: function (name) {
            var cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },
        handleSubmit: function () {
            return __awaiter(this, void 0, void 0, function () {
                var csrfToken, payload, response, error_12;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.formData.name.trim()) {
                                this.errorMessage = 'Name cannot be empty. Please enter a name.';
                                return [2 /*return*/];
                            }
                            if (!this.formData.centerId) {
                                this.errorMessage = 'Please select a center.';
                                return [2 /*return*/];
                            }
                            if (!this.formData.examinationId) {
                                this.errorMessage = 'Please select an examination type.';
                                return [2 /*return*/];
                            }
                            if (!this.formData.findingId) {
                                this.errorMessage = 'Please select a finding.';
                                return [2 /*return*/];
                            }
                            this.errorMessage = '';
                            csrfToken = this.getCookie('csrftoken');
                            payload = __assign({}, this.formData);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, axios.post('api/save-workflow-data/', payload, {
                                    headers: {
                                        'X-CSRFToken': csrfToken,
                                        'Content-Type': 'application/json'
                                    }
                                })];
                        case 2:
                            response = _a.sent();
                            if (response.data.status === 'success') {
                                alert('Workflow data saved successfully!');
                            }
                            else {
                                alert('Failed to save data.');
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_12 = _a.sent();
                            console.error('Error:', error_12);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        }
    },
    mounted: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.loadCenters(),
                            this.loadExaminations(),
                            this.loadFindings(),
                            this.loadLocationClassifications(),
                            this.loadLocationClassificationChoices(),
                            this.loadMorphologyClassifications(),
                            this.loadMorphologyClassificationChoices(),
                            this.loadInterventions()
                        ])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.html, __VLS_intrinsicElements.html)({
        lang: ("de"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.head, __VLS_intrinsicElements.head)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.meta, __VLS_intrinsicElements.meta)({
        charset: ("UTF-8"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.title, __VLS_intrinsicElements.title)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        href: ("path/to/bootstrap.css"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        href: ("path/to/material-dashboard.css"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.body, __VLS_intrinsicElements.body)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)(__assign({ class: ("patients-section mt-5") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ class: ("btn btn-primary mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-container mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patientFirstName"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text"), id: ("patientFirstName") }, { class: ("form-control") }), { required: (true) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patientLastName"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text"), id: ("patientLastName") }, { class: ("form-control") }), { required: (true) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patientAge"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("number"), id: ("patientAge") }, { class: ("form-control") }), { required: (true) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patientComments"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)(__assign({ id: ("patientComments") }, { class: ("form-control") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: ("radio"),
        name: ("gender"),
        value: ("weiblich"),
        required: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: ("radio"),
        name: ("gender"),
        value: ("männlich"),
        required: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: ("radio"),
        name: ("gender"),
        value: ("divers"),
        required: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ type: ("submit") }, { class: ("btn btn-success mt-2") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ type: ("button") }, { class: ("btn btn-secondary mt-2") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)(__assign({ class: ("table table-striped mt-4") }));
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ class: ("btn btn-secondary btn-sm") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ class: ("btn btn-danger btn-sm") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("name") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ id: ("name"), placeholder: ("Name") }, { class: ("form-control") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("polypCount") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ id: ("polypCount"), type: ("number"), placeholder: ("Anzahl der Polypen") }, { class: ("form-control") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("comments") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)(__assign(__assign({ id: ("comments"), placeholder: ("Kommentare") }, { class: ("form-control") }), { rows: ("3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)(__assign({ class: ("mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("centerSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("centerSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("1"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("2"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("3"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("2"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ("2"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)(__assign({ class: ("mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("examTypeSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("examTypeSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)(__assign({ class: ("mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("findingSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("findingSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)(__assign({ class: ("mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("locationClassificationSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("locationClassificationSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        selected: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("locationChoiceSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("locationChoiceSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)(__assign({ class: ("mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("morphologyClassificationSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("morphologyClassificationSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("morphologyChoiceSelect") }, { class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ id: ("morphologyChoiceSelect") }, { class: ("form-select") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        selected: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)(__assign({ class: ("mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention1") }, { class: ("form-check-input") }), { value: ("cold-snare") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention1") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention2") }, { class: ("form-check-input") }), { value: ("hot-snare") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention2") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention3") }, { class: ("form-check-input") }), { value: ("injection-liftup") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention3") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention4") }, { class: ("form-check-input") }), { value: ("injection-vasoactive") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention4") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention5") }, { class: ("form-check-input") }), { value: ("biopsy") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention5") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention6") }, { class: ("form-check-input") }), { value: ("emr") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention6") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention7") }, { class: ("form-check-input") }), { value: ("esd") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention7") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("checkbox"), id: ("intervention8") }, { class: ("form-check-input") }), { value: ("clip") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ for: ("intervention8") }, { class: ("form-check-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ type: ("submit") }, { class: ("btn btn-danger") }));
    ['container-fluid', 'py-4', 'patients-section', 'mt-5', 'btn', 'btn-primary', 'mb-3', 'form-container', 'mt-4', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'form-control', 'form-group', 'btn', 'btn-success', 'mt-2', 'btn', 'btn-secondary', 'mt-2', 'table', 'table-striped', 'mt-4', 'btn', 'btn-secondary', 'btn-sm', 'btn', 'btn-danger', 'btn-sm', 'container', 'mt-4', 'container-fluid', 'py-4', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-select', 'mt-4', 'mb-3', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'mb-3', 'btn', 'btn-danger',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {};
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
var __VLS_self;
