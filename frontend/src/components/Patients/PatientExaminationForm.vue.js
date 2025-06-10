import { ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
const props = defineProps();
const emit = defineEmits();
// Stores
const examinationStore = useExaminationStore();
// Reactive state
const loading = ref(false);
const errors = ref({});
const form = ref({
    patient_id: props.patientId,
    examination_id: '',
    date_start: new Date().toISOString().slice(0, 16), // Default to now
    date_stop: '',
    video_file_id: '',
    report_file_id: '',
    notes: ''
});
// Mock data for videos and reports (you'll need to implement these services)
const availableVideos = ref([]);
const availableReports = ref([]);
// Computed
const availableExaminations = computed(() => examinationStore.examinations);
const selectedExamination = computed(() => availableExaminations.value.find(exam => exam.id === parseInt(form.value.examination_id)));
const isFormValid = computed(() => {
    return form.value.examination_id !== '' &&
        form.value.date_start !== '' &&
        Object.keys(errors.value).length === 0;
});
// Methods
const validateForm = () => {
    errors.value = {};
    // Required fields
    if (!form.value.examination_id) {
        errors.value.examination_id = 'Untersuchungstyp ist erforderlich';
    }
    if (!form.value.date_start) {
        errors.value.date_start = 'Startdatum ist erforderlich';
    }
    // Date validation
    if (form.value.date_start && form.value.date_stop) {
        const startDate = new Date(form.value.date_start);
        const endDate = new Date(form.value.date_stop);
        if (endDate <= startDate) {
            errors.value.date_stop = 'Enddatum muss nach dem Startdatum liegen';
        }
    }
    return Object.keys(errors.value).length === 0;
};
const handleSubmit = async () => {
    console.log('=== EXAMINATION FORM SUBMIT START ===');
    console.log('Form data:', form.value);
    // Check if patient ID is valid
    if (!props.patientId || props.patientId === 0) {
        errors.value.general = 'Patient-ID ist nicht verfügbar. Bitte laden Sie die Seite neu.';
        console.log('❌ Ungültige Patient-ID:', props.patientId);
        return;
    }
    if (!validateForm()) {
        console.log('❌ Validierung fehlgeschlagen:', errors.value);
        return;
    }
    try {
        loading.value = true;
        errors.value = {};
        // Prepare data for submission
        const submissionData = {
            patient_id: props.patientId,
            examination_id: parseInt(form.value.examination_id),
            date_start: form.value.date_start,
            date_stop: form.value.date_stop || form.value.date_start, // Use start date if no end date
            video_file_id: form.value.video_file_id ? parseInt(form.value.video_file_id) : null,
            report_file_id: form.value.report_file_id ? parseInt(form.value.report_file_id) : null,
            notes: form.value.notes
        };
        console.log('📋 Sending examination data:', submissionData);
        // Make API call to create examination
        const response = await fetch('/api/examinations/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(submissionData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Fehler beim Erstellen der Untersuchung');
        }
        const newExamination = await response.json();
        console.log('🎉 Untersuchung erfolgreich erstellt:', newExamination);
        // Reset form
        form.value = {
            patient_id: props.patientId,
            examination_id: '',
            date_start: new Date().toISOString().slice(0, 16),
            date_stop: '',
            video_file_id: '',
            report_file_id: '',
            notes: ''
        };
        // Emit success event
        emit('examination-created', newExamination);
        console.log('📤 Event examination-created ausgelöst');
        console.log('=== EXAMINATION FORM SUBMIT SUCCESS ===');
    }
    catch (error) {
        console.log('=== EXAMINATION FORM SUBMIT ERROR ===');
        console.error('❌ Error creating examination:', error);
        errors.value.general = error.message || 'Unbekannter Fehler beim Erstellen der Untersuchung';
    }
    finally {
        loading.value = false;
        console.log('🏁 Loading beendet');
    }
};
// Helper function to get CSRF token
const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
};
// Load data on mount
onMounted(async () => {
    // Load available examination types
    await examinationStore.loadExaminations();
    // TODO: Load available videos and reports for this patient
    // You'll need to implement these endpoints/services
    try {
        // const videosResponse = await fetch(`/api/patients/${props.patientId}/videos/`)
        // availableVideos.value = await videosResponse.json()
        // const reportsResponse = await fetch(`/api/patients/${props.patientId}/reports/`)
        // availableReports.value = await reportsResponse.json()
    }
    catch (error) {
        console.warn('Could not load videos/reports:', error);
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['patient-badge', 'form-section', 'form-section', 'form-section', 'form-group', 'form-group', 'form-control', 'form-control', 'form-control', 'is-invalid', 'btn', 'btn-primary', 'btn-secondary', 'form-actions', 'form-actions', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-examination-form") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-info-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-badge") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.patientId);
    __VLS_elementAsFunction(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-stethoscope") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examination-type"),
        ...{ class: ("required") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.form.examination_id)),
        id: ("examination-type"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.examination_id })) },
        required: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    for (const [examination] of __VLS_getVForSourceType((__VLS_ctx.availableExaminations))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((examination.id)),
            value: ((examination.id)),
        });
        (examination.name_de || examination.name);
    }
    if (__VLS_ctx.errors.examination_id) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.examination_id);
    }
    if (__VLS_ctx.selectedExamination) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("examination-description") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedExamination.description_de || __VLS_ctx.selectedExamination.description || 'Keine Beschreibung verfügbar');
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-calendar") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("date-start"),
        ...{ class: ("required") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("datetime-local"),
        id: ("date-start"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.date_start })) },
        required: (true),
    });
    (__VLS_ctx.form.date_start);
    if (__VLS_ctx.errors.date_start) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.date_start);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("date-stop"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("datetime-local"),
        id: ("date-stop"),
        ...{ class: ("form-control") },
        ...{ class: (({ 'is-invalid': __VLS_ctx.errors.date_stop })) },
    });
    (__VLS_ctx.form.date_stop);
    if (__VLS_ctx.errors.date_stop) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("invalid-feedback") },
        });
        (__VLS_ctx.errors.date_stop);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-paperclip") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("video-file"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.form.video_file_id)),
        id: ("video-file"),
        ...{ class: ("form-control") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    for (const [video] of __VLS_getVForSourceType((__VLS_ctx.availableVideos))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((video.id)),
            value: ((video.id)),
        });
        (video.filename || `Video ${video.id}`);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("report-file"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: ((__VLS_ctx.form.report_file_id)),
        id: ("report-file"),
        ...{ class: ("form-control") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    for (const [report] of __VLS_getVForSourceType((__VLS_ctx.availableReports))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((report.id)),
            value: ((report.id)),
        });
        (report.title || `Report ${report.id}`);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("notes"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.textarea)({
        value: ((__VLS_ctx.form.notes)),
        id: ("notes"),
        ...{ class: ("form-control") },
        rows: ("4"),
        placeholder: ("Zusätzliche Notizen zur Untersuchung..."),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-actions") },
    });
    if (__VLS_ctx.errors.general) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger w-100 mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.errors.general);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: ("submit"),
        ...{ class: ("btn btn-primary") },
        disabled: ((__VLS_ctx.loading || !__VLS_ctx.isFormValid)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm me-2") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-save me-2") },
        });
    }
    (__VLS_ctx.loading ? 'Wird gespeichert...' : 'Untersuchung erstellen');
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('cancel');
            } },
        type: ("button"),
        ...{ class: ("btn btn-secondary ms-2") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-times me-2") },
    });
    ['patient-examination-form', 'patient-info-header', 'patient-badge', 'fas', 'fa-user', 'form-section', 'fas', 'fa-stethoscope', 'form-group', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'examination-description', 'form-section', 'fas', 'fa-calendar', 'row', 'col-md-6', 'form-group', 'required', 'form-control', 'is-invalid', 'invalid-feedback', 'col-md-6', 'form-group', 'form-control', 'is-invalid', 'invalid-feedback', 'form-section', 'fas', 'fa-paperclip', 'row', 'col-md-6', 'form-group', 'form-control', 'col-md-6', 'form-group', 'form-control', 'form-section', 'form-group', 'form-control', 'form-actions', 'alert', 'alert-danger', 'w-100', 'mb-3', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-save', 'me-2', 'btn', 'btn-secondary', 'ms-2', 'fas', 'fa-times', 'me-2',];
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
            loading: loading,
            errors: errors,
            form: form,
            availableVideos: availableVideos,
            availableReports: availableReports,
            availableExaminations: availableExaminations,
            selectedExamination: selectedExamination,
            isFormValid: isFormValid,
            handleSubmit: handleSubmit,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
