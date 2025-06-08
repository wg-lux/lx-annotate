import { ref, computed, onMounted, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useSensitiveMetaStore } from '@/stores/sensitiveMetaStore';
import SensitiveMetaService from '@/api/sensitiveMetaService';
import VideoAnnotation from '../components/EndoAI/VideoAnnotation.vue';
const props = withDefaults(defineProps(), {
    autoFetch: true
});
// --- Reactive State ---
const store = useSensitiveMetaStore();
// Use store state instead of local state
const sensitiveMetaData = computed(() => store.currentMetaData);
const loading = computed(() => store.loading);
const saving = computed(() => store.saving);
const error = computed(() => store.error);
const successMessage = computed(() => store.successMessage);
// Local state for form editing
const editableData = ref({
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    examination_date: ''
});
const validationErrors = ref({});
const mediaType = ref('video');
// --- Computed Properties ---
const isVerified = computed(() => {
    return sensitiveMetaData.value ?
        SensitiveMetaService.isDataVerified(sensitiveMetaData.value) :
        false;
});
const hasChanges = computed(() => {
    if (!sensitiveMetaData.value)
        return false;
    return (editableData.value.patient_first_name !== sensitiveMetaData.value.patient_first_name ||
        editableData.value.patient_last_name !== sensitiveMetaData.value.patient_last_name ||
        editableData.value.patient_dob !== sensitiveMetaData.value.patient_dob ||
        editableData.value.examination_date !== sensitiveMetaData.value.examination_date);
});
// --- Methods ---
async function fetchSensitiveMetaData(nextPatient = false) {
    try {
        let options = {};
        if (props.patientId) {
            options.patientId = props.patientId;
        }
        else if (nextPatient && store.lastFetchedId) {
            options.lastId = store.lastFetchedId;
        }
        const data = await store.fetchSensitiveMetaData({
            ...options,
            mediaType: mediaType.value
        });
        if (data) {
            updateEditableData(data);
        }
    }
    catch (err) {
        console.error('Error in fetchSensitiveMetaData:', err);
    }
}
async function saveSensitiveMetaData() {
    if (!sensitiveMetaData.value)
        return;
    // Validate form using the service
    const validation = SensitiveMetaService.validateSensitiveMetaData(editableData.value);
    if (!validation.isValid) {
        validationErrors.value = validation.errors;
        return;
    }
    try {
        const updateData = {
            sensitive_meta_id: sensitiveMetaData.value.id,
            ...editableData.value
        };
        await store.updateSensitiveMetaData(updateData, mediaType.value);
        // Update editable data with new values
        if (store.currentMetaData) {
            updateEditableData(store.currentMetaData);
        }
        validationErrors.value = {};
    }
    catch (err) {
        console.error('Error saving data:', err);
    }
}
function updateEditableData(data) {
    editableData.value = {
        patient_first_name: data.patient_first_name || '',
        patient_last_name: data.patient_last_name || '',
        patient_dob: data.patient_dob || '',
        examination_date: data.examination_date || ''
    };
}
function resetForm() {
    if (sensitiveMetaData.value) {
        updateEditableData(sensitiveMetaData.value);
        validationErrors.value = {};
    }
}
async function loadNextPatient() {
    await store.fetchNextPatient(mediaType.value);
    if (store.currentMetaData) {
        updateEditableData(store.currentMetaData);
    }
}
function validateForm() {
    const validation = SensitiveMetaService.validateSensitiveMetaData(editableData.value);
    validationErrors.value = validation.errors;
    return validation.isValid;
}
// --- Utility Functions use service methods ---
function formatExaminers(examiners) {
    return SensitiveMetaService.formatExaminers(examiners);
}
function formatHash(hash) {
    return SensitiveMetaService.formatHash(hash);
}
function formatDuration(duration) {
    return SensitiveMetaService.formatDuration(duration);
}
// --- Watchers ---
watch(() => props.patientId, (newId) => {
    if (newId) {
        fetchSensitiveMetaData();
    }
});
// --- Lifecycle ---
onMounted(() => {
    if (props.autoFetch) {
        fetchSensitiveMetaData();
    }
});
// --- Expose for parent components ---
const __VLS_exposed = {
    fetchSensitiveMetaData,
    saveSensitiveMetaData,
    resetForm,
    loadNextPatient
};
defineExpose({
    fetchSensitiveMetaData,
    saveSensitiveMetaData,
    resetForm,
    loadNextPatient
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    autoFetch: true
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['page-title', 'patient-status', 'patient-status', 'loading-container', 'error-container', 'no-data-container', 'no-data-container', 'section-title', 'form-row', 'form-label', 'form-input', 'form-input', 'info-value', 'btn', 'btn-primary', 'btn-secondary', 'btn-info', 'form-actions', 'media-preview', 'video-info',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("merged-annotation-view") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-7 col-12 mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sensitive-meta-annotation") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("annotation-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("page-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user-shield") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-status") },
        ...{ class: (({ 'verified': __VLS_ctx.isVerified, 'pending': !__VLS_ctx.isVerified })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ((__VLS_ctx.isVerified ? 'fas fa-check-circle' : 'fas fa-clock')) },
    });
    (__VLS_ctx.isVerified ? 'Verifiziert' : 'Unvollständig');
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("loading-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("error-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (() => __VLS_ctx.fetchSensitiveMetaData()) },
            ...{ class: ("btn btn-primary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-redo") },
        });
    }
    else if (__VLS_ctx.sensitiveMetaData) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("annotation-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: ("section-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveSensitiveMetaData) },
            ...{ class: ("patient-form") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("firstName"),
            ...{ class: ("form-label required") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            id: ("firstName"),
            value: ((__VLS_ctx.editableData.patient_first_name)),
            type: ("text"),
            ...{ class: ("form-input") },
            ...{ class: (({ 'error': __VLS_ctx.validationErrors.patient_first_name })) },
            placeholder: ("Vorname eingeben"),
            required: (true),
        });
        if (__VLS_ctx.validationErrors.patient_first_name) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("error-message") },
            });
            (__VLS_ctx.validationErrors.patient_first_name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("lastName"),
            ...{ class: ("form-label required") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            id: ("lastName"),
            value: ((__VLS_ctx.editableData.patient_last_name)),
            type: ("text"),
            ...{ class: ("form-input") },
            ...{ class: (({ 'error': __VLS_ctx.validationErrors.patient_last_name })) },
            placeholder: ("Nachname eingeben"),
            required: (true),
        });
        if (__VLS_ctx.validationErrors.patient_last_name) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("error-message") },
            });
            (__VLS_ctx.validationErrors.patient_last_name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("dateOfBirth"),
            ...{ class: ("form-label required") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-calendar-alt") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            id: ("dateOfBirth"),
            type: ("date"),
            ...{ class: ("form-input") },
            ...{ class: (({ 'error': __VLS_ctx.validationErrors.patient_dob })) },
            required: (true),
        });
        (__VLS_ctx.editableData.patient_dob);
        if (__VLS_ctx.validationErrors.patient_dob) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("error-message") },
            });
            (__VLS_ctx.validationErrors.patient_dob);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("examinationDate"),
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-calendar-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            id: ("examinationDate"),
            type: ("date"),
            ...{ class: ("form-input") },
            ...{ class: (({ 'error': __VLS_ctx.validationErrors.examination_date })) },
        });
        (__VLS_ctx.editableData.examination_date);
        if (__VLS_ctx.validationErrors.examination_date) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("error-message") },
            });
            (__VLS_ctx.validationErrors.examination_date);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("subsection-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-grid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("info-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("info-value") },
        });
        (__VLS_ctx.sensitiveMetaData.patient_gender || 'Nicht angegeben');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("info-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("info-value") },
        });
        (__VLS_ctx.sensitiveMetaData.center || 'Nicht angegeben');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("info-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("info-value") },
        });
        (__VLS_ctx.formatExaminers(__VLS_ctx.sensitiveMetaData.examiners));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("info-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("info-value") },
        });
        (__VLS_ctx.sensitiveMetaData.endoscope_type || 'Nicht angegeben');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("info-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("info-value") },
        });
        (__VLS_ctx.sensitiveMetaData.endoscope_sn || 'Nicht angegeben');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("info-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("info-value hash-value") },
        });
        (__VLS_ctx.formatHash(__VLS_ctx.sensitiveMetaData.patient_hash));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-actions") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetForm) },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.saving)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-undo") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.loadNextPatient) },
            type: ("button"),
            ...{ class: ("btn btn-info") },
            disabled: ((__VLS_ctx.saving)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-forward") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: ("submit"),
            ...{ class: ("btn btn-primary") },
            disabled: ((__VLS_ctx.saving || !__VLS_ctx.hasChanges)),
        });
        if (__VLS_ctx.saving) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-save") },
            });
        }
        (__VLS_ctx.saving ? 'Speichere...' : 'Speichern');
        if (__VLS_ctx.sensitiveMetaData.video_file) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("media-section") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                ...{ class: ("section-title") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-video") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("media-preview") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("video-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.sensitiveMetaData.video_file.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.sensitiveMetaData.video_file.original_file_name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.formatDuration(__VLS_ctx.sensitiveMetaData.video_file.duration));
            if (__VLS_ctx.sensitiveMetaData.video_file.video_url) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
                    src: ((__VLS_ctx.sensitiveMetaData.video_file.video_url)),
                    controls: (true),
                    ...{ class: ("video-preview") },
                    preload: ("metadata"),
                });
            }
        }
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("no-data-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-inbox") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (() => __VLS_ctx.fetchSensitiveMetaData()) },
            ...{ class: ("btn btn-primary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-refresh") },
        });
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("success-banner") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle") },
        });
        (__VLS_ctx.successMessage);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-lg-5 col-12") },
    });
    // @ts-ignore
    /** @type { [typeof VideoAnnotation, ] } */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(VideoAnnotation, new VideoAnnotation({}));
    const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
    ['merged-annotation-view', 'row', 'col-lg-7', 'col-12', 'mb-4', 'sensitive-meta-annotation', 'annotation-header', 'page-title', 'fas', 'fa-user-shield', 'patient-status', 'verified', 'pending', 'loading-container', 'spinner', 'error-container', 'fas', 'fa-exclamation-triangle', 'btn', 'btn-primary', 'fas', 'fa-redo', 'annotation-content', 'form-section', 'section-title', 'fas', 'fa-user', 'patient-form', 'form-row', 'form-group', 'form-label', 'required', 'fas', 'fa-user', 'form-input', 'error', 'error-message', 'form-group', 'form-label', 'required', 'fas', 'fa-user', 'form-input', 'error', 'error-message', 'form-row', 'form-group', 'form-label', 'required', 'fas', 'fa-calendar-alt', 'form-input', 'error', 'error-message', 'form-group', 'form-label', 'fas', 'fa-calendar-check', 'form-input', 'error', 'error-message', 'info-section', 'subsection-title', 'fas', 'fa-info-circle', 'info-grid', 'info-item', 'info-label', 'info-value', 'info-item', 'info-label', 'info-value', 'info-item', 'info-label', 'info-value', 'info-item', 'info-label', 'info-value', 'info-item', 'info-label', 'info-value', 'info-item', 'info-label', 'info-value', 'hash-value', 'form-actions', 'btn', 'btn-secondary', 'fas', 'fa-undo', 'btn', 'btn-info', 'fas', 'fa-forward', 'btn', 'btn-primary', 'fas', 'fa-spinner', 'fa-spin', 'fas', 'fa-save', 'media-section', 'section-title', 'fas', 'fa-video', 'media-preview', 'video-info', 'video-preview', 'no-data-container', 'fas', 'fa-inbox', 'btn', 'btn-primary', 'fas', 'fa-refresh', 'success-banner', 'fas', 'fa-check-circle', 'col-lg-5', 'col-12',];
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VideoAnnotation: VideoAnnotation,
            sensitiveMetaData: sensitiveMetaData,
            loading: loading,
            saving: saving,
            error: error,
            successMessage: successMessage,
            editableData: editableData,
            validationErrors: validationErrors,
            isVerified: isVerified,
            hasChanges: hasChanges,
            fetchSensitiveMetaData: fetchSensitiveMetaData,
            saveSensitiveMetaData: saveSensitiveMetaData,
            resetForm: resetForm,
            loadNextPatient: loadNextPatient,
            formatExaminers: formatExaminers,
            formatHash: formatHash,
            formatDuration: formatDuration,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeProps: {},
    props: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
