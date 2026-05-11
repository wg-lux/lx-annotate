import { buildAiDatasetTrainingManifest, fetchAiDatasetLabelSets, fetchAiDatasetOptions } from '@/api/aiDatasetApi';
import { computed, onMounted, reactive, ref } from 'vue';
const datasetOptions = ref([]);
const labelSetOptions = ref([]);
const selectedDatasetId = ref('');
const loadingOptions = ref(true);
const buildingManifest = ref(false);
const errorMessage = ref('');
const manifestPreview = ref(null);
const informationSourceInput = ref('');
const form = reactive({
    labelSetId: '',
    treatUnlabeledAsNegative: false,
    includeFilePaths: false,
    checkFrameFormat: true,
    preprocessingStrategy: 'preserve_dimensions_black_mask',
    recommendedModelInputStrategy: 'crop_to_endoscope_roi',
    informationSourceNames: null
});
const statusLabel = computed(() => {
    if (loadingOptions.value)
        return 'Loading options';
    if (buildingManifest.value)
        return 'Building preview';
    return 'Ready';
});
const frameFormatLabel = computed(() => {
    const status = manifestPreview.value?.summary.frameFormat.status;
    if (status === 'passed')
        return 'Passed';
    if (status === 'failed')
        return 'Failed';
    return 'Not checked';
});
const frameFormatDetail = computed(() => {
    const frameFormat = manifestPreview.value?.summary.frameFormat;
    if (!frameFormat || frameFormat.status === 'not_checked')
        return 'Not checked';
    const dimensions = frameFormat.expectedWidth && frameFormat.expectedHeight
        ? `${frameFormat.expectedWidth} x ${frameFormat.expectedHeight}`
        : 'Unknown dimensions';
    return `${frameFormat.expectedImageFormat || 'Unknown format'} - ${dimensions} - ${frameFormat.expectedMode || 'Unknown mode'}`;
});
const cropTemplateCount = computed(() => {
    const templates = manifestPreview.value?.summary.frameFormat.cropTemplatesByVideoUuid ?? {};
    return Object.values(templates).filter((template) => Array.isArray(template)).length;
});
const lxAiCoreManifestJson = computed(() => {
    if (!manifestPreview.value)
        return '';
    return JSON.stringify(manifestPreview.value.lxAiCoreManifest, null, 2);
});
function strategyLabel(strategy) {
    if (strategy === 'crop_to_endoscope_roi')
        return 'Crop endoscope ROI';
    return 'Preserve dimensions with black mask';
}
function normalizedInformationSourceNames() {
    const names = informationSourceInput.value
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    return names.length ? names : null;
}
async function loadOptions() {
    loadingOptions.value = true;
    errorMessage.value = '';
    try {
        const [datasets, labelSets] = await Promise.all([
            fetchAiDatasetOptions(),
            fetchAiDatasetLabelSets()
        ]);
        datasetOptions.value = datasets;
        labelSetOptions.value = labelSets;
        if (!selectedDatasetId.value) {
            const imageDataset = datasets.find((dataset) => dataset.datasetType === 'image' && dataset.isActive) ??
                datasets.find((dataset) => dataset.datasetType === 'image') ??
                datasets[0];
            selectedDatasetId.value = imageDataset ? String(imageDataset.id) : '';
        }
    }
    catch (error) {
        console.error('Failed to load AI dataset manifest options:', error);
        errorMessage.value = 'Dataset options could not be loaded.';
    }
    finally {
        loadingOptions.value = false;
    }
}
async function buildManifest() {
    if (!selectedDatasetId.value)
        return;
    buildingManifest.value = true;
    errorMessage.value = '';
    manifestPreview.value = null;
    try {
        manifestPreview.value = await buildAiDatasetTrainingManifest(selectedDatasetId.value, {
            ...form,
            labelSetId: form.labelSetId || null,
            informationSourceNames: normalizedInformationSourceNames()
        });
    }
    catch (error) {
        console.error('Failed to build AI dataset training manifest:', error);
        const errors = error?.response?.data?.errors;
        errorMessage.value =
            errors?.manifest ||
                errors?.labelSetId ||
                errors?.preprocessingStrategy ||
                errors?.recommendedModelInputStrategy ||
                'The manifest could not be created with this configuration.';
    }
    finally {
        buildingManifest.value = false;
    }
}
function resetManifest() {
    manifestPreview.value = null;
    errorMessage.value = '';
}
onMounted(() => {
    void loadOptions();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['manifest-json']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-layout']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dataset-settings-page container-fluid py-4 px-3 px-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "section-kicker" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadOptions) },
    type: "button",
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.buildingManifest),
    'data-test': "reload-options",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "status-chip" },
    ...{ class: ({ 'status-chip-busy': __VLS_ctx.loadingOptions || __VLS_ctx.buildingManifest }) },
});
(__VLS_ctx.statusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedDatasetId),
    ...{ class: "form-select" },
    'data-test': "dataset-select",
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.buildingManifest),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasetOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (dataset.id),
        value: (String(dataset.id)),
    });
    (dataset.label);
    (dataset.datasetType);
    (dataset.id);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.labelSetId),
    ...{ class: "form-select" },
    'data-test': "label-set-select",
    disabled: (__VLS_ctx.loadingOptions || __VLS_ctx.buildingManifest),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.labelSetOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (group.id),
        value: (String(group.id)),
    });
    (group.name);
    (group.version);
    (group.labelCount);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.preprocessingStrategy),
    ...{ class: "form-select" },
    'data-test': "preprocessing-strategy-select",
    disabled: (__VLS_ctx.buildingManifest),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "preserve_dimensions_black_mask",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "crop_to_endoscope_roi",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.recommendedModelInputStrategy),
    ...{ class: "form-select" },
    'data-test': "model-input-strategy-select",
    disabled: (__VLS_ctx.buildingManifest),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "crop_to_endoscope_roi",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "preserve_dimensions_black_mask",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    'data-test': "information-source-input",
    disabled: (__VLS_ctx.buildingManifest),
    placeholder: "manual_annotation, prediction",
});
(__VLS_ctx.informationSourceInput);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "check-column" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "check-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-check-input" },
    type: "checkbox",
    'data-test': "unknowns-negative-checkbox",
    disabled: (__VLS_ctx.buildingManifest),
});
(__VLS_ctx.form.treatUnlabeledAsNegative);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "check-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-check-input" },
    type: "checkbox",
    'data-test': "check-frame-format-checkbox",
    disabled: (__VLS_ctx.buildingManifest),
});
(__VLS_ctx.form.checkFrameFormat);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "check-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-check-input" },
    type: "checkbox",
    'data-test': "include-file-paths-checkbox",
    disabled: (__VLS_ctx.buildingManifest),
});
(__VLS_ctx.form.includeFilePaths);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning mb-0 mt-3" },
        role: "alert",
    });
    (__VLS_ctx.errorMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "actions-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.buildManifest) },
    type: "button",
    ...{ class: "btn btn-primary" },
    'data-test': "build-training-manifest",
    disabled: (__VLS_ctx.buildingManifest || !__VLS_ctx.selectedDatasetId),
});
(__VLS_ctx.buildingManifest ? 'Building manifest...' : 'Preview manifest');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetManifest) },
    type: "button",
    ...{ class: "btn btn-outline-secondary" },
    disabled: (__VLS_ctx.buildingManifest),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "settings-panel summary-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
if (__VLS_ctx.manifestPreview) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "status-chip status-chip-ready" },
        'data-test': "manifest-ready",
    });
    (__VLS_ctx.manifestPreview.summary.sampleCount);
}
if (!__VLS_ctx.manifestPreview) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-state" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-grid" },
        'data-test': "manifest-summary",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.manifestPreview.summary.labelCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.manifestPreview.summary.sampleCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.frameFormatLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.cropTemplateCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({
        ...{ class: "format-list" },
        'data-test': "frame-format-summary",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.frameFormatDetail);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.strategyLabel(__VLS_ctx.manifestPreview.summary.frameFormat.preprocessingStrategy));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.strategyLabel(__VLS_ctx.manifestPreview.summary.frameFormat.recommendedModelInputStrategy));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        ...{ class: "manifest-json" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        'data-test': "lx-ai-core-manifest-json",
    });
    (__VLS_ctx.lxAiCoreManifestJson);
}
/** @type {__VLS_StyleScopedClasses['dataset-settings-page']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip-busy']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['check-column']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['actions-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip-ready']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['manifest-json']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            datasetOptions: datasetOptions,
            labelSetOptions: labelSetOptions,
            selectedDatasetId: selectedDatasetId,
            loadingOptions: loadingOptions,
            buildingManifest: buildingManifest,
            errorMessage: errorMessage,
            manifestPreview: manifestPreview,
            informationSourceInput: informationSourceInput,
            form: form,
            statusLabel: statusLabel,
            frameFormatLabel: frameFormatLabel,
            frameFormatDetail: frameFormatDetail,
            cropTemplateCount: cropTemplateCount,
            lxAiCoreManifestJson: lxAiCoreManifestJson,
            strategyLabel: strategyLabel,
            loadOptions: loadOptions,
            buildManifest: buildManifest,
            resetManifest: resetManifest,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
