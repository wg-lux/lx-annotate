import { ref, computed, onMounted } from 'vue';
import vueFilePond from 'vue-filepond';
import { setOptions, registerPlugin } from 'filepond';
import axios from 'axios';
// Import FilePond plugins
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
// Import CSS
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
// Register plugins
registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);
// Create FilePond component
const FilePond = vueFilePond(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);
const emit = defineEmits();
// Reactive state
const pond = ref(null);
const files = ref([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadedVideoId = ref(null);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
// Patient data form
const patientData = ref({
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    examination_date: '',
    patient_gender: '',
    casenumber: ''
});
// Computed properties
const isExaminationDateValid = computed(() => {
    if (!patientData.value.examination_date || !patientData.value.patient_dob)
        return true;
    return new Date(patientData.value.examination_date) >= new Date(patientData.value.patient_dob);
});
const isFormValid = computed(() => {
    return patientData.value.patient_first_name.trim() !== '' &&
        patientData.value.patient_last_name.trim() !== '' &&
        patientData.value.patient_dob !== '' &&
        patientData.value.examination_date !== '' &&
        isExaminationDateValid.value;
});
// FilePond server configuration
const serverConfig = {
    process: {
        url: '/api/video/upload/',
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken()
        },
        onload: (response) => {
            try {
                const data = JSON.parse(response);
                uploadedVideoId.value = data.video_id;
                successMessage.value = 'Video erfolgreich hochgeladen!';
                return data.video_id;
            }
            catch (e) {
                console.error('Error parsing upload response:', e);
                return response;
            }
        },
        onerror: (response) => {
            console.error('Upload error:', response);
            error.value = 'Fehler beim Hochladen des Videos';
            return response;
        }
    },
    revert: {
        url: '/api/video/upload/',
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCsrfToken()
        }
    }
};
// Methods
function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') || '' : '';
}
function handleFilePondInit() {
    console.log('FilePond initialized');
}
function onFileAdd(error, file) {
    if (error) {
        console.error('File add error:', error);
        return;
    }
    uploading.value = true;
    uploadProgress.value = 0;
    error.value = '';
    successMessage.value = '';
    uploadedVideoId.value = null;
    console.log('File added:', file.filename);
}
function onFileProcessed(error, file) {
    if (error) {
        console.error('File process error:', error);
        uploading.value = false;
        return;
    }
    uploading.value = false;
    uploadProgress.value = 100;
    console.log('File processed successfully:', file.filename);
    // Set default examination date to today
    if (!patientData.value.examination_date) {
        patientData.value.examination_date = new Date().toISOString().split('T')[0];
    }
}
function onFileRemove(error, file) {
    if (error) {
        console.error('File remove error:', error);
        return;
    }
    // Reset state when file is removed
    uploadedVideoId.value = null;
    uploading.value = false;
    uploadProgress.value = 0;
    successMessage.value = '';
    // Clear patient data
    patientData.value = {
        patient_first_name: '',
        patient_last_name: '',
        patient_dob: '',
        examination_date: '',
        patient_gender: '',
        casenumber: ''
    };
    console.log('File removed:', file.filename);
}
function onUploadError(error) {
    console.error('Upload error:', error);
    uploading.value = false;
    error.value = 'Fehler beim Hochladen des Videos: ' + (error.body || error.message || 'Unbekannter Fehler');
}
async function submitPatientData() {
    if (!uploadedVideoId.value || !isFormValid.value)
        return;
    try {
        submitting.value = true;
        error.value = '';
        const payload = {
            video_id: uploadedVideoId.value,
            ...patientData.value
        };
        const response = await axios.post('/api/video/set_patient_data/', payload);
        if (response.data.success) {
            successMessage.value = 'Video und Patientendaten erfolgreich gespeichert!';
            // Emit event to parent component
            emit('video-uploaded', uploadedVideoId.value);
            // Clear form after short delay
            setTimeout(() => {
                resetForm();
            }, 2000);
        }
    }
    catch (err) {
        console.error('Error submitting patient data:', err);
        error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern der Patientendaten';
    }
    finally {
        submitting.value = false;
    }
}
function cancelUpload() {
    // Remove file from FilePond
    if (pond.value) {
        pond.value.removeFile();
    }
    resetForm();
}
function resetForm() {
    uploadedVideoId.value = null;
    uploading.value = false;
    uploadProgress.value = 0;
    submitting.value = false;
    error.value = '';
    successMessage.value = '';
    patientData.value = {
        patient_first_name: '',
        patient_last_name: '',
        patient_dob: '',
        examination_date: '',
        patient_gender: '',
        casenumber: ''
    };
    files.value = [];
}
// Initialize FilePond options on mount
onMounted(() => {
    setOptions({
        allowRevert: true,
        allowProcess: true,
        allowMultiple: false,
        maxFiles: 1,
        labelIdle: '<i class="fas fa-cloud-upload-alt"></i><br>Video hier ablegen oder <span class="filepond--label-action">durchsuchen</span>',
        labelFileProcessing: 'Hochladen...',
        labelFileProcessingComplete: 'Upload abgeschlossen',
        labelFileProcessingAborted: 'Upload abgebrochen',
        labelFileProcessingError: 'Fehler beim Upload',
        labelTapToCancel: 'Zum Abbrechen tippen',
        labelTapToRetry: 'Zum Wiederholen tippen',
        labelTapToUndo: 'Zum Rückgängigmachen tippen',
        labelButtonRemoveItem: 'Entfernen',
        labelButtonAbortItemLoad: 'Abbrechen',
        labelButtonRetryItemLoad: 'Wiederholen',
        labelButtonAbortItemProcessing: 'Abbrechen',
        labelButtonUndoItemProcessing: 'Rückgängig',
        labelButtonRetryItemProcessing: 'Wiederholen',
        labelButtonProcessItem: 'Hochladen'
    });
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['filepond--panel-root', 'video-upload-container', 'upload-instructions', 'filepond--drop-label',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("video-upload-container") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-cloud-upload-alt text-primary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("text-muted mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.error)))
                        return;
                    __VLS_ctx.error = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.successMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.successMessage)))
                        return;
                    __VLS_ctx.successMessage = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("upload-instructions mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-8 offset-md-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-info-circle text-info mb-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("list-unstyled text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check text-success") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check text-success") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check text-success") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("upload-section") },
    });
    const __VLS_0 = {}.FilePond;
    /** @type { [typeof __VLS_components.FilePond, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onInit': {} },
        ...{ 'onAddfile': {} },
        ...{ 'onProcessfile': {} },
        ...{ 'onRemovefile': {} },
        ...{ 'onError': {} },
        ref: ("pond"),
        name: ("video"),
        labelIdle: ("<i class='fas fa-cloud-upload-alt'></i><br>Video hier ablegen oder <span class='filepond--label-action'>durchsuchen</span>"),
        allowMultiple: ((false)),
        maxFiles: ((1)),
        server: ((__VLS_ctx.serverConfig)),
        files: ((__VLS_ctx.files)),
        acceptedFileTypes: ("video/mp4"),
        allowFileTypeValidation: ((true)),
        allowFileSizeValidation: ((true)),
        maxFileSize: (('500MB')),
        disabled: ((__VLS_ctx.uploading)),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onInit': {} },
        ...{ 'onAddfile': {} },
        ...{ 'onProcessfile': {} },
        ...{ 'onRemovefile': {} },
        ...{ 'onError': {} },
        ref: ("pond"),
        name: ("video"),
        labelIdle: ("<i class='fas fa-cloud-upload-alt'></i><br>Video hier ablegen oder <span class='filepond--label-action'>durchsuchen</span>"),
        allowMultiple: ((false)),
        maxFiles: ((1)),
        server: ((__VLS_ctx.serverConfig)),
        files: ((__VLS_ctx.files)),
        acceptedFileTypes: ("video/mp4"),
        allowFileTypeValidation: ((true)),
        allowFileSizeValidation: ((true)),
        maxFileSize: (('500MB')),
        disabled: ((__VLS_ctx.uploading)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    // @ts-ignore navigation for `const pond = ref()`
    /** @type { typeof __VLS_ctx.pond } */ ;
    var __VLS_6 = {};
    let __VLS_7;
    const __VLS_8 = {
        onInit: (__VLS_ctx.handleFilePondInit)
    };
    const __VLS_9 = {
        onAddfile: (__VLS_ctx.onFileAdd)
    };
    const __VLS_10 = {
        onProcessfile: (__VLS_ctx.onFileProcessed)
    };
    const __VLS_11 = {
        onRemovefile: (__VLS_ctx.onFileRemove)
    };
    const __VLS_12 = {
        onError: (__VLS_ctx.onUploadError)
    };
    let __VLS_3;
    let __VLS_4;
    var __VLS_5;
    if (__VLS_ctx.uploading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("upload-progress mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border spinner-border-sm text-primary me-2") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.uploadProgress);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar progress-bar-striped progress-bar-animated") },
            role: ("progressbar"),
            ...{ style: (({ width: __VLS_ctx.uploadProgress + '%' })) },
            'aria-valuenow': ((__VLS_ctx.uploadProgress)),
            'aria-valuemin': ("0"),
            'aria-valuemax': ("100"),
        });
    }
    if (__VLS_ctx.uploadedVideoId && !__VLS_ctx.uploading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-form mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card border-success") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header bg-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user-md text-success") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.submitPatientData) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patient_first_name"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.patientData.patient_first_name)),
            type: ("text"),
            ...{ class: ("form-control") },
            id: ("patient_first_name"),
            required: (true),
            disabled: ((__VLS_ctx.submitting)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patient_last_name"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.patientData.patient_last_name)),
            type: ("text"),
            ...{ class: ("form-control") },
            id: ("patient_last_name"),
            required: (true),
            disabled: ((__VLS_ctx.submitting)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patient_dob"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("date"),
            ...{ class: ("form-control") },
            id: ("patient_dob"),
            required: (true),
            disabled: ((__VLS_ctx.submitting)),
        });
        (__VLS_ctx.patientData.patient_dob);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("examination_date"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("date"),
            ...{ class: ("form-control") },
            id: ("examination_date"),
            required: (true),
            disabled: ((__VLS_ctx.submitting)),
            ...{ class: (({ 'is-invalid': !__VLS_ctx.isExaminationDateValid })) },
        });
        (__VLS_ctx.patientData.examination_date);
        if (!__VLS_ctx.isExaminationDateValid) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("invalid-feedback") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patient_gender"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.patientData.patient_gender)),
            ...{ class: ("form-select") },
            id: ("patient_gender"),
            disabled: ((__VLS_ctx.submitting)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("M"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("F"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("D"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("U"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("casenumber"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.patientData.casenumber)),
            type: ("text"),
            ...{ class: ("form-control") },
            id: ("casenumber"),
            placeholder: ("Optional"),
            disabled: ((__VLS_ctx.submitting)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelUpload) },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.submitting)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-times") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: ("submit"),
            ...{ class: ("btn btn-primary") },
            disabled: ((__VLS_ctx.submitting || !__VLS_ctx.isFormValid)),
        });
        if (__VLS_ctx.submitting) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-2") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-save") },
            });
        }
        (__VLS_ctx.submitting ? 'Speichere...' : 'Video mit Patientendaten speichern');
    }
    if (!__VLS_ctx.uploadedVideoId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-buttons mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((!__VLS_ctx.uploadedVideoId)))
                        return;
                    __VLS_ctx.$emit('back-to-annotation');
                } },
            ...{ class: ("btn btn-outline-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-arrow-left") },
        });
    }
    ['video-upload-container', 'card', 'card-header', 'text-center', 'mb-0', 'fas', 'fa-cloud-upload-alt', 'text-primary', 'text-muted', 'mb-0', 'card-body', 'alert', 'alert-danger', 'alert-dismissible', 'btn-close', 'alert', 'alert-success', 'alert-dismissible', 'btn-close', 'upload-instructions', 'mb-4', 'row', 'col-md-8', 'offset-md-2', 'text-center', 'fas', 'fa-info-circle', 'text-info', 'mb-2', 'list-unstyled', 'text-muted', 'fas', 'fa-check', 'text-success', 'fas', 'fa-check', 'text-success', 'fas', 'fa-check', 'text-success', 'upload-section', 'upload-progress', 'mt-4', 'd-flex', 'align-items-center', 'spinner-border', 'spinner-border-sm', 'text-primary', 'me-2', 'visually-hidden', 'progress', 'mt-2', 'progress-bar', 'progress-bar-striped', 'progress-bar-animated', 'patient-form', 'mt-4', 'card', 'border-success', 'card-header', 'bg-light', 'mb-0', 'fas', 'fa-user-md', 'text-success', 'text-muted', 'card-body', 'row', 'col-md-6', 'mb-3', 'form-label', 'form-control', 'col-md-6', 'mb-3', 'form-label', 'form-control', 'row', 'col-md-6', 'mb-3', 'form-label', 'form-control', 'col-md-6', 'mb-3', 'form-label', 'form-control', 'is-invalid', 'invalid-feedback', 'row', 'col-md-6', 'mb-3', 'form-label', 'form-select', 'col-md-6', 'mb-3', 'form-label', 'form-control', 'd-flex', 'justify-content-between', 'btn', 'btn-secondary', 'fas', 'fa-times', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-save', 'action-buttons', 'mt-4', 'text-center', 'btn', 'btn-outline-secondary', 'fas', 'fa-arrow-left',];
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            FilePond: FilePond,
            pond: pond,
            files: files,
            uploading: uploading,
            uploadProgress: uploadProgress,
            uploadedVideoId: uploadedVideoId,
            submitting: submitting,
            error: error,
            successMessage: successMessage,
            patientData: patientData,
            isExaminationDateValid: isExaminationDateValid,
            isFormValid: isFormValid,
            serverConfig: serverConfig,
            handleFilePondInit: handleFilePondInit,
            onFileAdd: onFileAdd,
            onFileProcessed: onFileProcessed,
            onFileRemove: onFileRemove,
            onUploadError: onUploadError,
            submitPatientData: submitPatientData,
            cancelUpload: cancelUpload,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
