import { fetchApplicationSettings, fetchApplicationSettingsDropdowns, updateApplicationSettings } from '@/api/applicationSettingsApi';
import { useToastStore } from '@/stores/toastStore';
import { computed, onMounted, reactive, ref } from 'vue';
const EMPTY_OPTION = '';
const toast = useToastStore();
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const currentSettings = ref(null);
const dropdowns = reactive({
    centers: [],
    processors: [],
    reportTemplates: []
});
const form = reactive({
    centerId: EMPTY_OPTION,
    processorId: EMPTY_OPTION,
    reportTemplateName: EMPTY_OPTION
});
const updatedAtLabel = computed(() => {
    if (!currentSettings.value?.updatedAt)
        return null;
    return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(currentSettings.value.updatedAt));
});
const selectedCenterLabel = computed(() => {
    const match = dropdowns.centers.find((option) => String(option.id) === form.centerId);
    return match?.name ?? 'Kein Standardzentrum';
});
const selectedProcessorLabel = computed(() => {
    const match = dropdowns.processors.find((option) => String(option.id) === form.processorId);
    return match?.name ?? 'Kein Standardprozessor';
});
const selectedReportTemplateLabel = computed(() => {
    const match = dropdowns.reportTemplates.find((option) => option.value === form.reportTemplateName);
    return match?.label ?? 'Keine Standardvorlage';
});
const isDirty = computed(() => {
    if (!currentSettings.value)
        return false;
    return ((currentSettings.value.centerId === null ? EMPTY_OPTION : String(currentSettings.value.centerId)) !==
        form.centerId ||
        (currentSettings.value.processorId === null
            ? EMPTY_OPTION
            : String(currentSettings.value.processorId)) !== form.processorId ||
        (currentSettings.value.reportTemplateName ?? EMPTY_OPTION) !== form.reportTemplateName);
});
function applySettings(settings) {
    currentSettings.value = settings;
    form.centerId = settings.centerId === null ? EMPTY_OPTION : String(settings.centerId);
    form.processorId = settings.processorId === null ? EMPTY_OPTION : String(settings.processorId);
    form.reportTemplateName = settings.reportTemplateName ?? EMPTY_OPTION;
}
function resetForm() {
    if (!currentSettings.value)
        return;
    applySettings(currentSettings.value);
}
async function loadSettings() {
    loading.value = true;
    errorMessage.value = '';
    try {
        const [settings, nextDropdowns] = await Promise.all([
            fetchApplicationSettings(),
            fetchApplicationSettingsDropdowns()
        ]);
        dropdowns.centers = nextDropdowns.centers;
        dropdowns.processors = nextDropdowns.processors;
        dropdowns.reportTemplates = nextDropdowns.reportTemplates;
        applySettings(settings);
    }
    catch (error) {
        console.error('Failed to load application settings:', error);
        errorMessage.value =
            'Die Anwendungseinstellungen konnten nicht geladen werden. Bitte erneut versuchen.';
    }
    finally {
        loading.value = false;
    }
}
async function saveSettings() {
    saving.value = true;
    try {
        const updated = await updateApplicationSettings({
            centerId: form.centerId ? Number(form.centerId) : null,
            processorId: form.processorId ? Number(form.processorId) : null,
            reportTemplateName: form.reportTemplateName || null
        });
        applySettings(updated);
        toast.success({ text: 'Anwendungseinstellungen gespeichert.' });
    }
    catch (error) {
        console.error('Failed to save application settings:', error);
    }
    finally {
        saving.value = false;
    }
}
onMounted(() => {
    loadSettings();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-contrast']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-note']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-note']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-status']} */ ;
/** @type {__VLS_StyleScopedClasses['status-updated']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-page container-fluid py-4 px-3 px-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "settings-eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "settings-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "settings-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-status" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "status-chip" },
    ...{ class: ({ 'status-chip-busy': __VLS_ctx.loading || __VLS_ctx.saving }) },
});
(__VLS_ctx.loading ? 'Lade Einstellungen' : __VLS_ctx.saving ? 'Speichere Änderungen' : 'Bereit');
if (__VLS_ctx.updatedAtLabel) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "status-updated" },
    });
    (__VLS_ctx.updatedAtLabel);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-4 align-items-start" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-xl-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadSettings) },
    type: "button",
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading || __VLS_ctx.saving),
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-state" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "skeleton-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "skeleton-line skeleton-line-short" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "skeleton-line" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.errorMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mb-4" },
            role: "alert",
        });
        (__VLS_ctx.errorMessage);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveSettings) },
        ...{ class: "settings-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "settings-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.centerId),
        ...{ class: "form-select" },
        'data-test': "center-select",
        disabled: (__VLS_ctx.saving),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.EMPTY_OPTION),
    });
    for (const [center] of __VLS_getVForSourceType((__VLS_ctx.dropdowns.centers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (center.id),
            value: (String(center.id)),
        });
        (center.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "settings-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.processorId),
        ...{ class: "form-select" },
        'data-test': "processor-select",
        disabled: (__VLS_ctx.saving),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.EMPTY_OPTION),
    });
    for (const [processor] of __VLS_getVForSourceType((__VLS_ctx.dropdowns.processors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (processor.id),
            value: (String(processor.id)),
        });
        (processor.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "settings-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.reportTemplateName),
        ...{ class: "form-select" },
        'data-test': "report-template-select",
        disabled: (__VLS_ctx.saving),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.EMPTY_OPTION),
    });
    for (const [templateOption] of __VLS_getVForSourceType((__VLS_ctx.dropdowns.reportTemplates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (templateOption.value),
            value: (templateOption.value),
        });
        (templateOption.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: "btn btn-light" },
        'data-test': "save-settings",
        disabled: (__VLS_ctx.saving || __VLS_ctx.loading || !__VLS_ctx.isDirty),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetForm) },
        type: "button",
        ...{ class: "btn btn-outline-secondary" },
        disabled: (__VLS_ctx.saving || __VLS_ctx.loading || !__VLS_ctx.isDirty),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-xl-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "settings-card settings-card-contrast" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "summary-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({
    ...{ class: "settings-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-center",
});
(__VLS_ctx.selectedCenterLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-processor",
});
(__VLS_ctx.selectedProcessorLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-report-template",
});
(__VLS_ctx.selectedReportTemplateLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
/** @type {__VLS_StyleScopedClasses['settings-page']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-status']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip-busy']} */ ;
/** @type {__VLS_StyleScopedClasses['status-updated']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-4']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-8']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line-short']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['actions-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-light']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-4']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-contrast']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-note']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            EMPTY_OPTION: EMPTY_OPTION,
            loading: loading,
            saving: saving,
            errorMessage: errorMessage,
            dropdowns: dropdowns,
            form: form,
            updatedAtLabel: updatedAtLabel,
            selectedCenterLabel: selectedCenterLabel,
            selectedProcessorLabel: selectedProcessorLabel,
            selectedReportTemplateLabel: selectedReportTemplateLabel,
            isDirty: isDirty,
            resetForm: resetForm,
            loadSettings: loadSettings,
            saveSettings: saveSettings,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
