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
var API_URL = 'http://127.0.0.1:8000/api';
export default (await import('vue')).defineComponent({
    name: 'UnifiedAnnotationComponent',
    data: function () {
        return {
            selectedGender: '',
            randomFirstNames: [],
            randomLastNames: [],
            randomFullNames: [],
            droppedNames: [],
            errorMessage: '',
            uploadedFile: null,
            processedImageUrl: null,
            originalImageUrl: null,
            showOriginal: false,
            femaleFirstNames: [],
            femaleLastNames: [],
            maleFirstNames: [],
            maleLastNames: []
        };
    },
    computed: {
        canSubmit: function () {
            return this.processedImageUrl && this.droppedNames.length > 0;
        },
        displayedImageUrl: function () {
            return this.showOriginal ? this.originalImageUrl : this.processedImageUrl;
        }
    },
    methods: {
        loadNames: function () {
            return __awaiter(this, void 0, void 0, function () {
                var loadNameFile, _a, _b, _c, _d, error_1;
                var _this = this;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            loadNameFile = function (filePath) { return __awaiter(_this, void 0, void 0, function () {
                                var response, text, error_2;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, fetch(filePath)];
                                        case 1:
                                            response = _a.sent();
                                            return [4 /*yield*/, response.text()];
                                        case 2:
                                            text = _a.sent();
                                            return [2 /*return*/, text.replace(/\r\n/g, '\n')
                                                    .split('\n')
                                                    .map(function (name) { return name.trim(); })
                                                    .filter(function (name) { return name.length > 0; })];
                                        case 3:
                                            error_2 = _a.sent();
                                            console.error("Error loading names from ".concat(filePath, ":"), error_2);
                                            throw error_2;
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); };
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 6, , 7]);
                            // Load all name files
                            _a = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/first_names_female_ascii.txt')];
                        case 2:
                            // Load all name files
                            _a.femaleFirstNames = _e.sent();
                            _b = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/last_names_female_ascii.txt')];
                        case 3:
                            _b.femaleLastNames = _e.sent();
                            _c = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/first_names_male_ascii.txt')];
                        case 4:
                            _c.maleFirstNames = _e.sent();
                            _d = this;
                            return [4 /*yield*/, loadNameFile('./assets/names-dictionary/last_names_male_ascii.txt')];
                        case 5:
                            _d.maleLastNames = _e.sent();
                            // Validate loaded names
                            if (!this.femaleFirstNames.length || !this.femaleLastNames.length ||
                                !this.maleFirstNames.length || !this.maleLastNames.length) {
                                throw new Error("One or more name lists are empty");
                            }
                            this.errorMessage = "";
                            return [3 /*break*/, 7];
                        case 6:
                            error_1 = _e.sent();
                            this.errorMessage = "Failed to load names: ".concat(error_1.message);
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        },
        getRandomName: function (array) {
            return array[Math.floor(Math.random() * array.length)];
        },
        handleAddRandomFirstName: function () {
            if (!this.selectedGender) {
                this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
                return;
            }
            var nameArray = this.selectedGender === 'male' ? this.maleFirstNames : this.femaleFirstNames;
            var randomName = this.getRandomName(nameArray);
            this.randomFirstNames.push(randomName);
        },
        handleAddRandomLastName: function () {
            if (!this.selectedGender) {
                this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
                return;
            }
            var nameArray = this.selectedGender === 'male' ? this.maleLastNames : this.femaleLastNames;
            var randomName = this.getRandomName(nameArray);
            this.randomLastNames.push(randomName);
        },
        handleAddRandomFullName: function () {
            if (!this.selectedGender) {
                this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
                return;
            }
            var firstNames = this.selectedGender === 'male' ? this.maleFirstNames : this.femaleFirstNames;
            var lastNames = this.selectedGender === 'male' ? this.maleLastNames : this.femaleLastNames;
            var firstName = this.getRandomName(firstNames);
            var lastName = this.getRandomName(lastNames);
            this.randomFullNames.push("".concat(firstName, " ").concat(lastName));
        },
        removeName: function (type, index) {
            switch (type) {
                case 'firstName':
                    this.randomFirstNames.splice(index, 1);
                    break;
                case 'lastName':
                    this.randomLastNames.splice(index, 1);
                    break;
                case 'fullName':
                    this.randomFullNames.splice(index, 1);
                    break;
            }
        },
        handleDragStart: function (nameData, event) {
            event.dataTransfer.setData('text/plain', JSON.stringify(nameData));
        },
        handleDrop: function (event) {
            var rect = this.$refs.imageCard.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            var nameData = JSON.parse(event.dataTransfer.getData('text/plain'));
            this.droppedNames.push(__assign(__assign({}, nameData), { x: x, y: y, displayText: nameData.name }));
        },
        toggleImage: function () {
            this.showOriginal = !this.showOriginal;
        },
        handleFileUpload: function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var file, formData, response, data, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            file = event.target.files[0];
                            if (!file)
                                return [2 /*return*/];
                            formData = new FormData();
                            formData.append('file', file);
                            formData.append('validation', 'true');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, fetch("".concat(API_URL, "/process-file/"), {
                                    method: 'POST',
                                    body: formData
                                })];
                        case 2:
                            response = _a.sent();
                            if (!response.ok)
                                throw new Error('Upload failed');
                            return [4 /*yield*/, response.json()];
                        case 3:
                            data = _a.sent();
                            this.processedImageUrl = data.processed_file_url;
                            this.originalImageUrl = data.original_image_url;
                            this.uploadedFile = file;
                            if (data.gender_pars) {
                                this.selectedGender = data.gender_pars.toLowerCase();
                            }
                            this.errorMessage = '';
                            return [3 /*break*/, 5];
                        case 4:
                            error_3 = _a.sent();
                            this.errorMessage = "Upload failed: ".concat(error_3.message);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        },
        saveAnnotation: function () {
            return __awaiter(this, void 0, void 0, function () {
                var annotationData, response, _a, _b, error_4;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!this.canSubmit)
                                return [2 /*return*/];
                            annotationData = {
                                image_name: (_c = this.uploadedFile) === null || _c === void 0 ? void 0 : _c.name,
                                original_image_url: this.originalImageUrl,
                                processed_image_url: this.processedImageUrl,
                                dropped_names: this.droppedNames.map(function (_a) {
                                    var name = _a.name, type = _a.type, x = _a.x, y = _a.y;
                                    return ({
                                        name: name,
                                        type: type,
                                        x: x,
                                        y: y
                                    });
                                })
                            };
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, fetch("".concat(API_URL, "/annotations/"), {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRFToken': this.getCookie('csrftoken')
                                    },
                                    body: JSON.stringify(annotationData)
                                })];
                        case 2:
                            response = _d.sent();
                            if (!response.ok)
                                throw new Error('Failed to save annotation');
                            _a = this.$emit;
                            _b = ['annotation-saved'];
                            return [4 /*yield*/, response.json()];
                        case 3:
                            _a.apply(this, _b.concat([_d.sent()]));
                            this.resetForm();
                            return [3 /*break*/, 5];
                        case 4:
                            error_4 = _d.sent();
                            this.errorMessage = "Failed to save: ".concat(error_4.message);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        },
        getCookie: function (name) {
            var value = "; ".concat(document.cookie);
            var parts = value.split("; ".concat(name, "="));
            if (parts.length === 2)
                return parts.pop().split(';').shift();
        },
        resetForm: function () {
            this.randomFirstNames = [];
            this.randomLastNames = [];
            this.randomFullNames = [];
            this.droppedNames = [];
            this.uploadedFile = null;
            this.processedImageUrl = null;
            this.originalImageUrl = null;
            this.showOriginal = false;
            this.errorMessage = '';
        }
    },
    created: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadNames()];
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
    ['image-container', 'name-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-header pb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)(__assign({ class: ("mb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign(__assign({ onChange: (__VLS_ctx.handleFileUpload) }, { type: ("file") }), { class: ("form-control") }), { accept: ("image/*") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onDrop: (__VLS_ctx.handleDrop) }, { onDragover: function () { } }), { class: ("card mb-4 position-relative") }), { ref: ("imageCard") }));
    // @ts-ignore navigation for `const imageCard = ref()`
    /** @type { typeof __VLS_ctx.imageCard } */ ;
    if (__VLS_ctx.displayedImageUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)(__assign(__assign({ src: ((__VLS_ctx.displayedImageUrl)) }, { class: ("img-fluid") }), { alt: ("Displayed Image") }));
    }
    if (__VLS_ctx.originalImageUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("position-absolute top-0 end-0 m-2") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.toggleImage) }, { class: ("btn btn-info btn-sm") }));
        (__VLS_ctx.showOriginal ? 'Show Processed' : 'Show Original');
    }
    var _loop_1 = function (nameData, index) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign(__assign({ onDragstart: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.handleDragStart(nameData, $event);
            } }, { key: ((index)) }), { style: (({
                top: nameData.y + 'px',
                left: nameData.x + 'px',
                position: 'absolute',
                cursor: 'move'
            })) }), { class: ("dropped-name") }), { draggable: ("true") }));
        (nameData.displayText);
    };
    for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.droppedNames)); _i < _a.length; _i++) {
        var _b = _a[_i], nameData = _b[0], index = _b[1];
        _loop_1(nameData, index);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card bg-light") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)(__assign({ class: ("card-title") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check form-check-inline") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("radio"), id: ("male"), value: ("male") }));
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }, { for: ("male") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-check form-check-inline") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ class: ("form-check-input") }, { type: ("radio"), id: ("female"), value: ("female") }));
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-check-label") }, { for: ("female") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.handleAddRandomFirstName) }, { class: ("btn btn-info me-2") }), { disabled: ((!__VLS_ctx.selectedGender)) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.handleAddRandomLastName) }, { class: ("btn btn-info me-2") }), { disabled: ((!__VLS_ctx.selectedGender)) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.handleAddRandomFullName) }, { class: ("btn btn-info") }), { disabled: ((!__VLS_ctx.selectedGender)) }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("name-lists mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("name-list mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    var _loop_2 = function (name_1, index) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onDragstart: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.handleDragStart({ type: 'firstName', name: name_1 }, $event);
            } }, { key: (('first-' + index)) }), { class: ("name-item card p-3 d-flex flex-row align-items-center mb-2") }), { draggable: ("true") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (name_1);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.removeName('firstName', index);
            } }, { class: ("btn btn-danger btn-sm ms-auto") }));
    };
    for (var _c = 0, _d = __VLS_getVForSourceType((__VLS_ctx.randomFirstNames)); _c < _d.length; _c++) {
        var _e = _d[_c], name_1 = _e[0], index = _e[1];
        _loop_2(name_1, index);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("name-list mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    var _loop_3 = function (name_2, index) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onDragstart: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.handleDragStart({ type: 'lastName', name: name_2 }, $event);
            } }, { key: (('last-' + index)) }), { class: ("name-item card p-3 d-flex flex-row align-items-center mb-2") }), { draggable: ("true") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (name_2);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.removeName('lastName', index);
            } }, { class: ("btn btn-danger btn-sm ms-auto") }));
    };
    for (var _f = 0, _g = __VLS_getVForSourceType((__VLS_ctx.randomLastNames)); _f < _g.length; _f++) {
        var _h = _g[_f], name_2 = _h[0], index = _h[1];
        _loop_3(name_2, index);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("name-list") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    var _loop_4 = function (name_3, index) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onDragstart: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.handleDragStart({ type: 'fullName', name: name_3 }, $event);
            } }, { key: (('full-' + index)) }), { class: ("name-item card p-3 d-flex flex-row align-items-center mb-2") }), { draggable: ("true") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (name_3);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.removeName('fullName', index);
            } }, { class: ("btn btn-danger btn-sm ms-auto") }));
    };
    for (var _j = 0, _k = __VLS_getVForSourceType((__VLS_ctx.randomFullNames)); _j < _k.length; _j++) {
        var _l = _k[_j], name_3 = _l[0], index = _l[1];
        _loop_4(name_3, index);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.saveAnnotation) }, { class: ("btn btn-primary") }), { disabled: ((!__VLS_ctx.canSubmit)) }));
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("alert alert-danger mt-3") }, { role: ("alert") }));
        (__VLS_ctx.errorMessage);
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'row', 'mb-4', 'col-12', 'form-group', 'form-control-label', 'form-control', 'row', 'mb-4', 'col-12', 'card', 'mb-4', 'position-relative', 'img-fluid', 'position-absolute', 'top-0', 'end-0', 'm-2', 'btn', 'btn-info', 'btn-sm', 'dropped-name', 'row', 'mb-4', 'col-12', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'mb-3', 'btn', 'btn-info', 'me-2', 'btn', 'btn-info', 'me-2', 'btn', 'btn-info', 'name-lists', 'mt-4', 'name-list', 'mb-3', 'name-item', 'card', 'p-3', 'd-flex', 'flex-row', 'align-items-center', 'mb-2', 'btn', 'btn-danger', 'btn-sm', 'ms-auto', 'name-list', 'mb-3', 'name-item', 'card', 'p-3', 'd-flex', 'flex-row', 'align-items-center', 'mb-2', 'btn', 'btn-danger', 'btn-sm', 'ms-auto', 'name-list', 'name-item', 'card', 'p-3', 'd-flex', 'flex-row', 'align-items-center', 'mb-2', 'btn', 'btn-danger', 'btn-sm', 'ms-auto', 'row', 'col-12', 'btn', 'btn-primary', 'alert', 'alert-danger', 'mt-3',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {
        'imageCard': __VLS_nativeElements['div'],
    };
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
