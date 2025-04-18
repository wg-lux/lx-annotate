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
export default (await import('vue')).defineComponent({
    data: function () {
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
        filteredLocationChoices: function () {
            var classificationId = parseInt(this.formData.locationClassificationId, 10);
            return this.locationClassificationChoices.filter(function (choice) { return choice.classificationId === classificationId; });
        },
        // Dynamically filter morphology choices
        filteredMorphologyChoices: function () {
            var classificationId = parseInt(this.formData.morphologyClassificationId, 10);
            return this.morphologyClassificationChoices.filter(function (choice) { return choice.classificationId === classificationId; });
        }
    },
    methods: {
        // --- Data Loaders with Axios ---
        loadCenters: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/centers/')];
                        case 1:
                            response = _a.sent();
                            this.centers = response.data; // Expecting a JSON array of centers
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            console.error('Error loading centers:', error_1);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadExaminations: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/examinations/')];
                        case 1:
                            response = _a.sent();
                            this.examinations = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_2 = _a.sent();
                            console.error('Error loading examinations:', error_2);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadFindings: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/findings/')];
                        case 1:
                            response = _a.sent();
                            this.findings = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            console.error('Error loading findings:', error_3);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadLocationClassifications: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api//location-classifications/')];
                        case 1:
                            response = _a.sent();
                            this.locationClassifications = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _a.sent();
                            console.error('Error loading location classifications:', error_4);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadLocationClassificationChoices: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/location-classification-choices/')];
                        case 1:
                            response = _a.sent();
                            this.locationClassificationChoices = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_5 = _a.sent();
                            console.error('Error loading location classification choices:', error_5);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadMorphologyClassifications: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/morphology-classifications/')];
                        case 1:
                            response = _a.sent();
                            this.morphologyClassifications = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_6 = _a.sent();
                            console.error('Error loading morphology classifications:', error_6);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadMorphologyClassificationChoices: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/morphology-classification-choices/')];
                        case 1:
                            response = _a.sent();
                            this.morphologyClassificationChoices = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_7 = _a.sent();
                            console.error('Error loading morphology classification choices:', error_7);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        loadInterventions: function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios.get('api/interventions/')];
                        case 1:
                            response = _a.sent();
                            this.interventions = response.data;
                            return [3 /*break*/, 3];
                        case 2:
                            error_8 = _a.sent();
                            console.error('Error loading interventions:', error_8);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        // Called on classification change
        loadLocationChoices: function () {
            this.formData.locationChoiceId = '';
        },
        loadMorphologyChoices: function () {
            this.formData.morphologyChoiceId = '';
        },
        // Utility to get CSRF token
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
        // Submit Handler using Axios
        handleSubmit: function () {
            return __awaiter(this, void 0, void 0, function () {
                var csrfToken, payload, response, error_9;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Basic validation example
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
                            // Reset error message if all required fields are filled
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
                            // Check backend response
                            if (response.data.status === 'success') {
                                alert('Workflow data saved successfully!');
                                // Possibly reset form data or navigate to a report view
                            }
                            else {
                                alert('Failed to save data.');
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_9 = _a.sent();
                            console.error('Error:', error_9);
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
                    case 0: 
                    // Load all data in parallel or sequentially as you see fit.
                    // Example of parallel loading:
                    return [4 /*yield*/, Promise.all([
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
                        // Load all data in parallel or sequentially as you see fit.
                        // Example of parallel loading:
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)(__assign({ onSubmit: (__VLS_ctx.handleSubmit) }));
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
    for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.centers)); _i < _a.length; _i++) {
        var center = _a[_i][0];
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
    for (var _b = 0, _c = __VLS_getVForSourceType((__VLS_ctx.examinations)); _b < _c.length; _b++) {
        var exam = _c[_b][0];
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
    for (var _d = 0, _e = __VLS_getVForSourceType((__VLS_ctx.findings)); _d < _e.length; _d++) {
        var finding = _e[_d][0];
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ onChange: (__VLS_ctx.loadLocationChoices) }, { value: ((__VLS_ctx.formData.locationClassificationId)), id: ("locationClassificationSelect") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (var _f = 0, _g = __VLS_getVForSourceType((__VLS_ctx.locationClassifications)); _f < _g.length; _f++) {
        var locClass = _g[_f][0];
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
    for (var _h = 0, _j = __VLS_getVForSourceType((__VLS_ctx.filteredLocationChoices)); _h < _j.length; _h++) {
        var choice = _j[_h][0];
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ onChange: (__VLS_ctx.loadMorphologyChoices) }, { value: ((__VLS_ctx.formData.morphologyClassificationId)), id: ("morphologyClassificationSelect") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        disabled: (true),
        value: (""),
    });
    for (var _k = 0, _l = __VLS_getVForSourceType((__VLS_ctx.morphologyClassifications)); _k < _l.length; _k++) {
        var morphClass = _l[_k][0];
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
    for (var _m = 0, _o = __VLS_getVForSourceType((__VLS_ctx.filteredMorphologyChoices)); _m < _o.length; _m++) {
        var choice = _o[_m][0];
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((choice.id)),
            value: ((choice.id)),
        });
        (choice.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    for (var _p = 0, _q = __VLS_getVForSourceType((__VLS_ctx.interventions)); _p < _q.length; _p++) {
        var intervention = _q[_p][0];
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("alert alert-danger mt-2") }));
        (__VLS_ctx.errorMessage);
    }
    ['alert', 'alert-danger', 'mt-2',];
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
