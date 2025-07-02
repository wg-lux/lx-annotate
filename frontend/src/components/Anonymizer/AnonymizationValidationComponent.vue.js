import { ref, computed, watch, onMounted } from 'vue';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
// @ts-ignore
import vueFilePond from 'vue-filepond';
import axiosInstance, { r } from '@/api/axiosInstance';
// @ts-ignore
import { setOptions, registerPlugin } from 'filepond';
import FileDropZone from '@/components/common/FileDropZone.vue';
// @ts-ignore
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
// @ts-ignore
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
registerPlugin(FilePondPluginImagePreview, FilePondPluginFileValidateType);
const FilePond = vueFilePond(FilePondPluginImagePreview, FilePondPluginFileValidateType);
// Store reference
const store = useAnonymizationStore();
// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const editedPatient = ref({
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
    patientDob: '',
    casenumber: ''
});
// Upload-related state
const originalUrl = ref('');
const processedUrl = ref('');
const showOriginal = ref(false);
const isUploading = ref(false);
const hasSuccessfulUpload = ref(false);
// Dirty tracking
const dirty = ref(false);
// Template refs
const pond = ref();
// Computed
const currentItem = computed(() => store.current);
const isExaminationDateValid = computed(() => {
    if (!examinationDate.value || !editedPatient.value.patientDob) {
        return true;
    }
    return new Date(examinationDate.value) >= new Date(editedPatient.value.patientDob);
});
const canSubmit = computed(() => {
    return processedUrl.value && originalUrl.value && isExaminationDateValid.value;
});
// Watch
watch(currentItem, (newItem) => {
    if (newItem) {
        loadCurrentItemData(newItem);
    }
}, { immediate: true });
watch(editedAnonymizedText, () => {
    dirty.value = true;
});
watch(examinationDate, () => {
    dirty.value = true;
});
watch(editedPatient, () => {
    dirty.value = true;
}, { deep: true });
// Methods
const setupFilePond = () => {
    setOptions({
        allowRevert: true,
        chunkUploads: true,
        maxParallelUploads: 3,
        server: {
            process: (fieldName, file, metadata, load, error, progress, abort) => {
                const fd = new FormData();
                fd.append(fieldName, file);
                axiosInstance.post(r('upload-image/'), fd, {
                    onUploadProgress: e => {
                        if (progress) {
                            progress(true, e.loaded ?? 0, e.total ?? 0);
                        }
                    }
                })
                    .then(({ data }) => {
                    originalUrl.value = data.original_image_url;
                    processedUrl.value = data.processed_image_url;
                    if (load) {
                        load(data.upload_id);
                    }
                    hasSuccessfulUpload.value = true;
                })
                    .catch(err => {
                    if (error) {
                        error(err.message);
                    }
                });
                // Return abort function for FilePond to cancel requests if needed
                return {
                    abort: () => {
                        if (abort) {
                            abort();
                        }
                    }
                };
            },
            revert: (id, load) => {
                axiosInstance.delete(r(`upload-image/${id}/`)).finally(() => {
                    if (load) {
                        load();
                    }
                });
            }
        }
    });
};
const fetchNextItem = async () => {
    try {
        await store.fetchNext();
    }
    catch (error) {
        console.error('Error fetching next item:', error);
    }
};
const loadCurrentItemData = (item) => {
    if (!item)
        return;
    editedAnonymizedText.value = item.anonymizedText || '';
    examinationDate.value = item.reportMeta?.examinationDate || '';
    if (item.reportMeta) {
        editedPatient.value.patientFirstName = item.reportMeta.patientFirstName || '';
        editedPatient.value.patientLastName = item.reportMeta.patientLastName || '';
        editedPatient.value.patientGender = item.reportMeta.patientGender || '';
        editedPatient.value.patientDob = item.reportMeta.patientDob || '';
        editedPatient.value.casenumber = item.reportMeta.casenumber || '';
    }
    dirty.value = false;
};
const toggleImage = () => {
    showOriginal.value = !showOriginal.value;
};
const saveAnnotation = async () => {
    if (!canSubmit.value)
        return;
    try {
        const annotationData = {
            original_image_url: originalUrl.value,
            processed_image_url: processedUrl.value,
            patient_data: editedPatient.value,
            examinationDate: examinationDate.value,
            anonymized_text: editedAnonymizedText.value
        };
        await axiosInstance.post(r('save-annotation/'), annotationData);
        // Reset upload state
        originalUrl.value = '';
        processedUrl.value = '';
        hasSuccessfulUpload.value = false;
        if (pond.value) {
            pond.value.removeFiles();
        }
        console.log('Annotation saved successfully');
    }
    catch (error) {
        console.error('Error saving annotation:', error);
    }
};
const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) {
        console.warn('handleFilesSelected: empty file array received');
        return;
    }
    isUploading.value = true;
    try {
        console.log('Processing files:', files.map(f => f.name));
        // Convert File[] to FileList using DataTransfer
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        const result = await store.uploadAndFetch(dataTransfer.files);
        if (result) {
            hasSuccessfulUpload.value = true;
        }
    }
    catch (error) {
        console.error('Error uploading files:', error);
    }
    finally {
        isUploading.value = false;
    }
};
const skipItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
        dirty.value = false;
    }
};
const approveItem = async () => {
    if (!currentItem.value || !isExaminationDateValid.value)
        return;
    try {
        const updatedData = {
            id: currentItem.value.id,
            anonymizedText: editedAnonymizedText.value,
            reportMeta: {
                ...(currentItem.value.reportMeta || {}),
                ...editedPatient.value,
                examinationDate: examinationDate.value,
                id: currentItem.value.reportMeta?.id || 0
            }
        };
        await store.patchPdf(updatedData);
        await fetchNextItem();
        dirty.value = false;
    }
    catch (error) {
        console.error('Error approving item:', error);
    }
};
const rejectItem = async () => {
    if (currentItem.value) {
        await fetchNextItem();
        dirty.value = false;
    }
};
// Lifecycle
onMounted(() => {
    setupFilePond();
    fetchNextItem();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['pdf-viewer-container', 'media-viewer-container', 'media-viewer-container',];
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
    if (!__VLS_ctx.currentItem && !__VLS_ctx.hasSuccessfulUpload) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-4") },
        });
        // @ts-ignore
        /** @type { [typeof FileDropZone, ] } */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(FileDropZone, new FileDropZone({
            ...{ 'onFilesSelected': {} },
            isUploading: ((__VLS_ctx.isUploading)),
            acceptedFileTypes: ("*"),
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onFilesSelected': {} },
            isUploading: ((__VLS_ctx.isUploading)),
            acceptedFileTypes: ("*"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onFilesSelected: (__VLS_ctx.handleFilesSelected)
        };
        let __VLS_2;
        let __VLS_3;
        var __VLS_4;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info d-flex align-items-center") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.currentItem?.reportMeta?.pdfUrl ? 'PDF-Dokument' : 'Video-Datei');
        (__VLS_ctx.currentItem?.reportMeta?.centerName ? `- ${__VLS_ctx.currentItem.reportMeta.centerName}` : '');
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
            value: ((__VLS_ctx.editedPatient.patientFirstName)),
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
            value: ((__VLS_ctx.editedPatient.patientLastName)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ class: ("form-select") },
            value: ((__VLS_ctx.editedPatient.patientGender)),
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
        (__VLS_ctx.editedPatient.patientDob);
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
        const __VLS_7 = {}.FilePond;
        /** @type { [typeof __VLS_components.FilePond, ] } */ ;
        // @ts-ignore
        const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
            ref: ("pond"),
            name: ("file"),
            acceptedFileTypes: ("image/*"),
            labelIdle: ("Bild hier ablegen oder klicken"),
        }));
        const __VLS_9 = __VLS_8({
            ref: ("pond"),
            name: ("file"),
            acceptedFileTypes: ("image/*"),
            labelIdle: ("Bild hier ablegen oder klicken"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_8));
        // @ts-ignore navigation for `const pond = ref()`
        /** @type { typeof __VLS_ctx.pond } */ ;
        var __VLS_13 = {};
        var __VLS_12;
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
        (__VLS_ctx.currentItem?.reportMeta?.pdfUrl ? 'PDF Vorschau' : 'Video Vorschau');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body media-viewer-container") },
        });
        if (__VLS_ctx.currentItem?.reportMeta?.pdfUrl) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                src: ((__VLS_ctx.currentItem.reportMeta.pdfUrl)),
                width: ("100%"),
                height: ("800px"),
                frameborder: ("0"),
                title: ("PDF Vorschau"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((__VLS_ctx.currentItem.reportMeta.pdfUrl)),
            });
        }
        else if (__VLS_ctx.currentItem?.reportMeta?.file) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                controls: (true),
                width: ("100%"),
                height: ("600px"),
                src: ((__VLS_ctx.currentItem.reportMeta.file)),
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
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'mb-4', 'row', 'mb-3', 'col-12', 'alert', 'alert-info', 'd-flex', 'align-items-center', 'fas', 'fa-info-circle', 'me-2', 'row', 'mb-4', 'col-md-5', 'card', 'bg-light', 'mb-4', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'mb-3', 'form-label', 'form-control', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'mt-3', 'img-fluid', 'btn', 'btn-info', 'btn-sm', 'mt-2', 'mt-3', 'btn', 'btn-primary', 'col-md-7', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'media-viewer-container', 'alert', 'alert-secondary', 'row', 'col-12', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'me-2', 'btn', 'btn-success',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'pond': __VLS_13,
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            FileDropZone: FileDropZone,
            FilePond: FilePond,
            store: store,
            editedAnonymizedText: editedAnonymizedText,
            examinationDate: examinationDate,
            editedPatient: editedPatient,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            showOriginal: showOriginal,
            isUploading: isUploading,
            hasSuccessfulUpload: hasSuccessfulUpload,
            dirty: dirty,
            pond: pond,
            currentItem: currentItem,
            isExaminationDateValid: isExaminationDateValid,
            canSubmit: canSubmit,
            toggleImage: toggleImage,
            saveAnnotation: saveAnnotation,
            handleFilesSelected: handleFilesSelected,
            skipItem: skipItem,
            approveItem: approveItem,
            rejectItem: rejectItem,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
