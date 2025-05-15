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
const vue_1 = require("vue");
const anonymizationStore_1 = require("@/stores/anonymizationStore");
const vue_filepond_1 = __importDefault(require("vue-filepond"));
const axiosInstance_1 = __importStar(require("@/api/axiosInstance"));
const filepond_1 = require("filepond");
const filepond_plugin_image_preview_1 = __importDefault(require("filepond-plugin-image-preview"));
const filepond_plugin_file_validate_type_1 = __importDefault(require("filepond-plugin-file-validate-type"));
(0, filepond_1.registerPlugin)(filepond_plugin_image_preview_1.default, filepond_plugin_file_validate_type_1.default);
const FilePond = (0, vue_filepond_1.default)(filepond_plugin_image_preview_1.default, filepond_plugin_file_validate_type_1.default);
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    name: 'AnonymizationValidationComponent',
    components: { FilePond },
    setup() {
        const store = (0, anonymizationStore_1.useAnonymizationStore)();
        // Lokaler State
        const editedAnonymizedText = (0, vue_1.ref)('');
        const examinationDate = (0, vue_1.ref)('');
        const editedPatient = (0, vue_1.reactive)({
            patient_first_name: '',
            patient_last_name: '',
            patient_gender: '',
            patient_dob: '',
            casenumber: ''
        });
        // Computed Property für das aktuelle Element
        const currentItem = (0, vue_1.computed)(() => store.current);
        // Einmalige Definition der Upload-bezogenen Refs
        const originalUrl = (0, vue_1.ref)('');
        const processedUrl = (0, vue_1.ref)('');
        const showOriginal = (0, vue_1.ref)(false);
        const pond = (0, vue_1.ref)(null);
        // FilePond global konfigurieren – nachdem die Refs existieren
        (0, filepond_1.setOptions)({
            allowRevert: true,
            chunkUploads: true,
            maxParallelUploads: 3,
            server: {
                process(field, file, metadata, load, error, progress) {
                    const fd = new FormData();
                    fd.append(field, file);
                    axiosInstance_1.default.post((0, axiosInstance_1.r)('upload-image/'), fd, {
                        onUploadProgress: e => progress(true, e.loaded ?? 0, e.total ?? 0)
                    })
                        .then(({ data }) => {
                        originalUrl.value = data.original_image_url;
                        processedUrl.value = data.processed_image_url;
                        load(data.upload_id);
                    })
                        .catch(err => error(err.message));
                },
                revert(id, load) {
                    axiosInstance_1.default.delete((0, axiosInstance_1.r)(`upload-image/${id}/`)).finally(load);
                }
            }
        });
        // Fehlende Funktionen und Props
        const toggleImage = () => { showOriginal.value = !showOriginal.value; };
        // Beispiel: Annotation speichern (hier einfach als Platzhalter)
        const saveAnnotation = async () => {
            console.log('Annotation gespeichert');
        };
        // Berechnung, ob das Formular absendbar ist
        const canSubmit = (0, vue_1.computed)(() => {
            return editedAnonymizedText.value.trim() !== '' && isExaminationDateValid.value;
        });
        // Dirty state: prüfen, ob ein Feld geändert wurde
        const dirty = (0, vue_1.computed)(() => {
            if (!currentItem.value)
                return false;
            const meta = currentItem.value.report_meta;
            return editedAnonymizedText.value !== (currentItem.value.anonymized_text ?? '') ||
                editedPatient.patient_first_name !== (meta?.patient_first_name ?? '') ||
                editedPatient.patient_last_name !== (meta?.patient_last_name ?? '') ||
                editedPatient.patient_gender !== (meta?.patient_gender ?? '') ||
                editedPatient.patient_dob !== (meta?.patient_dob?.split(/[ T]/)[0] ?? '') ||
                editedPatient.casenumber !== (meta?.casenumber ?? '') ||
                examinationDate.value !== (meta?.examination_date?.split(/[ T]/)[0] ?? '');
        });
        // Funktion zum Befüllen der Formularfelder
        const populateForm = (item) => {
            console.log('Populating form with item:', item);
            if (!item?.report_meta) {
                console.log('No item or report_meta found, clearing form.');
                editedAnonymizedText.value = '';
                editedPatient.patient_first_name = '';
                editedPatient.patient_last_name = '';
                editedPatient.patient_gender = '';
                editedPatient.patient_dob = '';
                editedPatient.casenumber = '';
                examinationDate.value = '';
                return;
            }
            const m = item.report_meta;
            editedAnonymizedText.value = item.anonymized_text ?? '';
            editedPatient.patient_first_name = m.patient_first_name ?? '';
            editedPatient.patient_last_name = m.patient_last_name ?? '';
            editedPatient.patient_gender = m.patient_gender ?? '';
            editedPatient.patient_dob = m.patient_dob?.split(/[ T]/)[0] ?? '';
            editedPatient.casenumber = m.casenumber ?? '';
            examinationDate.value = m.examination_date?.split(/[ T]/)[0] ?? '';
            console.log('Form populated:', {
                text: editedAnonymizedText.value,
                patient: { ...editedPatient },
                examDate: examinationDate.value
            });
        };
        // Watcher für currentItem
        (0, vue_1.watch)(currentItem, (newItem, oldItem) => {
            if (newItem?.id !== oldItem?.id || (!newItem && oldItem)) {
                console.log('currentItem changed detected, calling populateForm.');
                populateForm(newItem);
            }
            else {
                console.log('currentItem watcher triggered, but no relevant change detected.');
            }
        }, { immediate: true });
        // Laden der Daten über den Store
        const loadData = async () => {
            console.log('loadData called. Current item ID before fetch:', currentItem.value?.id);
            await store.fetchNext();
            console.log('loadData finished fetchNext. Current item ID after fetch:', store.current?.id);
        };
        // Approve flow: nutzt patchPdf vom Store
        const approveItem = async () => {
            if (!isExaminationDateValid.value || !currentItem.value || !currentItem.value.report_meta)
                return;
            try {
                const reportMetaDataToSend = {
                    id: currentItem.value.report_meta.id,
                    patient_first_name: editedPatient.patient_first_name,
                    patient_last_name: editedPatient.patient_last_name,
                    patient_gender: editedPatient.patient_gender,
                    patient_dob: editedPatient.patient_dob,
                    casenumber: editedPatient.casenumber,
                    examination_date: examinationDate.value
                };
                await store.patchPdf({
                    id: currentItem.value.id,
                    anonymized_text: editedAnonymizedText.value,
                    status: 'approved',
                    report_meta: reportMetaDataToSend
                });
                await loadData();
            }
            catch (err) {
                store.error = err.message ?? 'Fehler beim Bestätigen';
            }
        };
        const rejectItem = async () => {
            if (!currentItem.value)
                return;
            try {
                await store.patchPdf({
                    id: currentItem.value.id,
                    status: 'rejected'
                });
                await loadData();
            }
            catch (err) {
                store.error = err.message ?? 'Fehler beim Ablehnen';
            }
        };
        const skipItem = async () => {
            await loadData();
        };
        const isExaminationDateValid = (0, vue_1.computed)(() => {
            if (!examinationDate.value || !editedPatient.patient_dob)
                return true;
            return new Date(examinationDate.value) >= new Date(editedPatient.patient_dob);
        });
        // Prepopulate form fields on component mount
        (0, vue_1.onMounted)(() => {
            console.log('Component mounted, calling initial loadData.');
            loadData();
        });
        return {
            store,
            currentItem,
            editedAnonymizedText,
            editedPatient,
            examinationDate,
            isExaminationDateValid,
            dirty,
            approveItem,
            rejectItem,
            skipItem,
            showOriginal,
            originalUrl,
            processedUrl,
            toggleImage,
            saveAnnotation,
            canSubmit,
            pond,
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    const __VLS_componentsOption = { FilePond };
    let __VLS_components;
    let __VLS_directives;
    ['pdf-viewer-container',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.store.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
    }
    else if (__VLS_ctx.store.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.store.error);
    }
    else if (!__VLS_ctx.currentItem) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info") },
            role: ("alert"),
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-light mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patient_first_name)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.patient_last_name)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: ("form-select") },
            value: ((__VLS_ctx.editedPatient.patient_gender)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("male"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("female"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("other"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("date"),
            ...{ class: ("form-control") },
        });
        (__VLS_ctx.editedPatient.patient_dob);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("text"),
            ...{ class: ("form-control") },
            value: ((__VLS_ctx.editedPatient.casenumber)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: ("date"),
            ...{ class: ("form-control") },
            ...{ class: (({ 'is-invalid': !__VLS_ctx.isExaminationDateValid })) },
        });
        (__VLS_ctx.examinationDate);
        if (!__VLS_ctx.isExaminationDateValid) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("invalid-feedback") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.textarea)({
            ...{ class: ("form-control") },
            rows: ("6"),
            value: ((__VLS_ctx.editedAnonymizedText)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        const __VLS_0 = {}.FilePond;
        /** @type { [typeof __VLS_components.FilePond, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ref: ("pond"),
            name: ("file"),
            acceptedFileTypes: ("image/*"),
            labelIdle: ("Bild hier ablegen oder klicken"),
        }));
        const __VLS_2 = __VLS_1({
            ref: ("pond"),
            name: ("file"),
            acceptedFileTypes: ("image/*"),
            labelIdle: ("Bild hier ablegen oder klicken"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        // @ts-ignore navigation for `const pond = ref()`
        /** @type { typeof __VLS_ctx.pond } */ ;
        var __VLS_6 = {};
        var __VLS_5;
        if (__VLS_ctx.processedUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
                src: ((__VLS_ctx.showOriginal ? __VLS_ctx.originalUrl : __VLS_ctx.processedUrl)),
                ...{ class: ("img-fluid") },
                alt: ("Uploaded Image"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.toggleImage) },
                ...{ class: ("btn btn-info btn-sm mt-2") },
            });
            (__VLS_ctx.showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen');
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveAnnotation) },
            ...{ class: ("btn btn-primary") },
            disabled: ((!__VLS_ctx.canSubmit)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-7") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header pb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body pdf-viewer-container") },
        });
        if (__VLS_ctx.currentItem && __VLS_ctx.currentItem.report_meta && __VLS_ctx.currentItem.report_meta.pdf_url) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                src: ((__VLS_ctx.currentItem.report_meta.pdf_url)),
                width: ("100%"),
                height: ("800px"),
                frameborder: ("0"),
                title: ("PDF Vorschau"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.currentItem.report_meta.pdf_url)),
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-secondary") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 d-flex justify-content-between") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.skipItem) },
            ...{ class: ("btn btn-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.rejectItem) },
            ...{ class: ("btn btn-danger me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.approveItem) },
            ...{ class: ("btn btn-success") },
            disabled: ((!__VLS_ctx.isExaminationDateValid || !__VLS_ctx.dirty)),
        });
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'row', 'mb-4', 'col-md-5', 'card', 'bg-light', 'mb-4', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'mt-3', 'img-fluid', 'btn', 'btn-info', 'btn-sm', 'mt-2', 'mt-3', 'btn', 'btn-primary', 'col-md-7', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'pdf-viewer-container', 'alert', 'alert-secondary', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'pond': __VLS_6,
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
let __VLS_self;
