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
import axiosInstance from '@/api/axiosInstance';
import { ref, computed, reactive, watch } from 'vue';
export default (await import('vue')).defineComponent({
    name: 'AnonymizationValidationComponent',
    setup: function () {
        var _this = this;
        var loading = ref(true);
        var error = ref(null);
        var currentItem = ref(null);
        var editMode = ref(false);
        var editedAnonymizedText = ref('');
        var examinationDate = ref('');
        var uploadedFile = ref(null);
        var processedImageUrl = ref(null);
        var originalImageUrl = ref(null);
        var showOriginal = ref(false);
        var editedPatient = reactive({
            patient_first_name: '',
            patient_last_name: '',
            patient_gender: '',
            patient_dob: '',
            casenumber: ''
        });
        var isExaminationDateValid = computed(function () {
            if (!examinationDate.value || !editedPatient.patient_dob)
                return true;
            return new Date(examinationDate.value) >= new Date(editedPatient.patient_dob);
        });
        var displayedImageUrl = computed(function () {
            return showOriginal.value ? originalImageUrl.value : processedImageUrl.value;
        });
        var canSubmit = computed(function () {
            return processedImageUrl.value && uploadedFile.value;
        });
        var loadData = function () { return __awaiter(_this, void 0, void 0, function () {
            var response, data, meta, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        loading.value = true;
                        error.value = null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, axiosInstance.get('/api/pdf/anony_text/')];
                    case 2:
                        response = _a.sent();
                        data = response.data;
                        if (data) {
                            currentItem.value = data;
                            editedAnonymizedText.value = currentItem.value.anonymized_text;
                            meta = currentItem.value.report_meta;
                            editedPatient.patient_first_name = meta.patient_first_name || '';
                            editedPatient.patient_last_name = meta.patient_last_name || '';
                            editedPatient.patient_gender = meta.patient_gender || '';
                            editedPatient.patient_dob = meta.patient_dob || '';
                            editedPatient.casenumber = meta.casenumber || '';
                            examinationDate.value = meta.examination_date || '';
                        }
                        else {
                            currentItem.value = null;
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        err_1 = _a.sent();
                        error.value = "Fehler beim Laden der Daten: ".concat(err_1.message);
                        return [3 /*break*/, 5];
                    case 4:
                        loading.value = false;
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        var handleFileUpload = function (event) { return __awaiter(_this, void 0, void 0, function () {
            var file, formData, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        file = event.target.files[0];
                        if (!file)
                            return [2 /*return*/];
                        formData = new FormData();
                        formData.append('file', file);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axiosInstance.post('/api/upload-image/', formData)];
                    case 2:
                        response = _a.sent();
                        processedImageUrl.value = response.data.processed_image_url;
                        originalImageUrl.value = response.data.original_image_url;
                        uploadedFile.value = file;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        error_1.value = "Fehler beim Hochladen: ".concat(error_1.message);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        var saveAnnotation = function () { return __awaiter(_this, void 0, void 0, function () {
            var annotationData, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!canSubmit.value)
                            return [2 /*return*/];
                        annotationData = {
                            image_name: uploadedFile.value.name,
                            processed_image_url: processedImageUrl.value,
                            original_image_url: originalImageUrl.value,
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axiosInstance.post('/api/save-annotation/', annotationData)];
                    case 2:
                        _a.sent();
                        alert('Annotation gespeichert!');
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        error_2.value = "Fehler beim Speichern: ".concat(error_2.message);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        var toggleImage = function () {
            showOriginal.value = !showOriginal.value;
        };
        var approveItem = function () { return __awaiter(_this, void 0, void 0, function () {
            var updateData, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!isExaminationDateValid.value)
                            return [2 /*return*/];
                        loading.value = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 6]);
                        updateData = {
                            id: currentItem.value.id,
                            anonymized_text: editedAnonymizedText.value,
                            report_meta: __assign(__assign({}, currentItem.value.report_meta), { patient_first_name: editedPatient.patient_first_name, patient_last_name: editedPatient.patient_last_name, patient_gender: editedPatient.patient_gender, patient_dob: editedPatient.patient_dob, casenumber: editedPatient.casenumber, examination_date: examinationDate.value })
                        };
                        return [4 /*yield*/, axiosInstance.patch('/api/pdf/update_anony_text/', updateData)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, loadData()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        err_2 = _a.sent();
                        error.value = "Fehler beim Speichern: ".concat(err_2.message);
                        return [3 /*break*/, 6];
                    case 5:
                        loading.value = false;
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        var rejectItem = function () { return __awaiter(_this, void 0, void 0, function () {
            var err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        loading.value = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, axiosInstance.patch('/api/pdf/update_anony_text/', {
                                id: currentItem.value.id,
                                status: 'rejected'
                            })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, loadData()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        err_3 = _a.sent();
                        error.value = "Fehler beim Ablehnen: ".concat(err_3.message);
                        return [3 /*break*/, 6];
                    case 5:
                        loading.value = false;
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        var skipItem = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                loadData();
                return [2 /*return*/];
            });
        }); };
        watch(currentItem, function (newItem) {
            if (newItem) {
                editedAnonymizedText.value = newItem.anonymized_text;
            }
        });
        loadData();
        return {
            loading: loading,
            error: error,
            currentItem: currentItem,
            editMode: editMode,
            editedAnonymizedText: editedAnonymizedText,
            editedPatient: editedPatient,
            examinationDate: examinationDate,
            isExaminationDateValid: isExaminationDateValid,
            approveItem: approveItem,
            rejectItem: rejectItem,
            skipItem: skipItem,
            handleFileUpload: handleFileUpload,
            saveAnnotation: saveAnnotation,
            toggleImage: toggleImage,
            displayedImageUrl: displayedImageUrl,
            canSubmit: canSubmit,
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-header pb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)(__assign({ class: ("mb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("text-center py-5") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("spinner-border text-primary") }, { role: ("status") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("visually-hidden") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)(__assign({ class: ("mt-2") }));
    }
    else if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("alert alert-danger") }, { role: ("alert") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
    }
    else if (!__VLS_ctx.currentItem) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("alert alert-info") }, { role: ("alert") }));
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card bg-light") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)(__assign({ class: ("card-title") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text") }, { class: ("form-control") }), { value: ((__VLS_ctx.editedPatient.patient_first_name)) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text") }, { class: ("form-control") }), { value: ((__VLS_ctx.editedPatient.patient_last_name)) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ class: ("form-select") }, { value: ((__VLS_ctx.editedPatient.patient_gender)) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("male"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("female"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("other"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign({ type: ("date") }, { class: ("form-control") }));
        (__VLS_ctx.editedPatient.patient_dob);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("text") }, { class: ("form-control") }), { value: ((__VLS_ctx.editedPatient.casenumber)) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("date") }, { class: ("form-control") }), { class: (({ 'is-invalid': !__VLS_ctx.isExaminationDateValid })) }));
        (__VLS_ctx.examinationDate);
        if (!__VLS_ctx.isExaminationDateValid) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("invalid-feedback") }));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-md-6") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card bg-light") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)(__assign({ class: ("card-title") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign(__assign({ onChange: (__VLS_ctx.handleFileUpload) }, { type: ("file") }), { class: ("form-control") }), { accept: ("image/*") }));
        if (__VLS_ctx.uploadedFile) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mt-3") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)(__assign(__assign({ src: ((__VLS_ctx.displayedImageUrl)) }, { class: ("img-fluid") }), { alt: ("Uploaded Image") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.toggleImage) }, { class: ("btn btn-info btn-sm mt-2") }));
            (__VLS_ctx.showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen');
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mt-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.saveAnnotation) }, { class: ("btn btn-primary") }), { disabled: ((!__VLS_ctx.canSubmit)) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12 d-flex justify-content-between") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.skipItem) }, { class: ("btn btn-secondary") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.rejectItem) }, { class: ("btn btn-danger me-2") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.approveItem) }, { class: ("btn btn-success") }), { disabled: ((!__VLS_ctx.isExaminationDateValid)) }));
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'row', 'mb-4', 'col-md-6', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mt-3', 'img-fluid', 'btn', 'btn-info', 'btn-sm', 'mt-2', 'mt-3', 'btn', 'btn-primary', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success',];
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
