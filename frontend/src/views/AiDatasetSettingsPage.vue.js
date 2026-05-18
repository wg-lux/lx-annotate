import { attachAiDatasetAnnotations, buildAiDatasetTrainingManifest, createAiDataset, fetchAiDatasetLabelSets, fetchAiDatasetOptions } from '@/api/aiDatasetApi';
import { computed, onMounted, reactive, ref } from 'vue';
const datasetOptions = ref([]);
const labelSetOptions = ref([]);
const selectedDatasetId = ref('');
const loadingOptions = ref(true);
const buildingManifest = ref(false);
const creatingDataset = ref(false);
const attachingAnnotations = ref(false);
const errorMessage = ref('');
const createdDatasetMessage = ref('');
const attachmentMessage = ref('');
const attachmentResult = ref(null);
const manifestPreview = ref(null);
const informationSourceInput = ref('');
const createDatasetForm = reactive({
    name: '',
    datasetType: 'image'
});
const attachForm = reactive({
    includeFrameAnnotations: true,
    includeVideoAnnotations: true
});
const form = reactive({
    labelSetId: '',
    treatUnlabeledAsNegative: false,
    includeFilePaths: false,
    checkFrameFormat: true,
    preprocessingStrategy: 'preserve_dimensions_black_mask',
    recommendedModelInputStrategy: 'crop_to_endoscope_roi',
    informationSourceNames: null
});
const isBusy = computed(() => {
    return (loadingOptions.value ||
        buildingManifest.value ||
        creatingDataset.value ||
        attachingAnnotations.value);
});
const canCreateDataset = computed(() => {
    return createDatasetForm.name.trim().length > 0 && !isBusy.value;
});
const canAttachExistingAnnotations = computed(() => {
    return (Boolean(selectedDatasetId.value) &&
        (attachForm.includeFrameAnnotations || attachForm.includeVideoAnnotations) &&
        !isBusy.value);
});
const statusLabel = computed(() => {
    if (loadingOptions.value)
        return 'Optionen werden geladen';
    if (creatingDataset.value)
        return 'Datensatz wird erstellt';
    if (attachingAnnotations.value)
        return 'Annotationen werden hinzugefügt';
    if (buildingManifest.value)
        return 'Vorschau wird erstellt';
    return 'Bereit';
});
const frameFormatLabel = computed(() => {
    const status = manifestPreview.value?.summary.frameFormat.status;
    if (status === 'passed')
        return 'Bestanden';
    if (status === 'failed')
        return 'Fehlgeschlagen';
    return 'Nicht geprüft';
});
const frameFormatDetail = computed(() => {
    const frameFormat = manifestPreview.value?.summary.frameFormat;
    if (!frameFormat || frameFormat.status === 'not_checked')
        return 'Nicht geprüft';
    const dimensions = frameFormat.expectedWidth && frameFormat.expectedHeight
        ? `${frameFormat.expectedWidth} x ${frameFormat.expectedHeight}`
        : 'Unbekannte Dimensionen';
    return `${frameFormat.expectedImageFormat || 'Unbekanntes Format'} - ${dimensions} - ${frameFormat.expectedMode || 'Unbekannter Modus'}`;
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
        return 'Endoskop-ROI zuschneiden';
    return 'Dimensionen mit schwarzer Maske beibehalten';
}
function datasetTypeLabel(datasetType) {
    if (datasetType === 'image')
        return 'Bild';
    if (datasetType === 'video')
        return 'Video';
    return datasetType;
}
function aiModelTypeForDatasetType(datasetType) {
    if (datasetType === 'video')
        return 'video_segment_classification';
    return 'image_multilabel_classification';
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
        errorMessage.value = 'Datensatz-Optionen konnten nicht geladen werden.';
    }
    finally {
        loadingOptions.value = false;
    }
}
async function createDataset() {
    if (!canCreateDataset.value)
        return;
    creatingDataset.value = true;
    errorMessage.value = '';
    createdDatasetMessage.value = '';
    attachmentMessage.value = '';
    try {
        const createdDataset = await createAiDataset({
            name: createDatasetForm.name.trim(),
            datasetType: createDatasetForm.datasetType,
            aiModelType: aiModelTypeForDatasetType(createDatasetForm.datasetType),
            isActive: true
        });
        datasetOptions.value = await fetchAiDatasetOptions();
        selectedDatasetId.value = String(createdDataset.id);
        createDatasetForm.name = '';
        createdDatasetMessage.value = `Datensatz "${createdDataset.label}" wurde erstellt und ausgewählt.`;
        resetManifest();
    }
    catch (error) {
        console.error('Failed to create AI dataset:', error);
        const errors = error?.response?.data?.errors;
        if (errors?.name) {
            errorMessage.value = 'Bitte geben Sie einen gültigen Namen für den Datensatz ein.';
        }
        else if (errors?.datasetType) {
            errorMessage.value = 'Bitte wählen Sie einen gültigen Datensatztyp aus.';
        }
        else if (errors?.aiModelType) {
            errorMessage.value = 'Der Modelltyp passt nicht zum ausgewählten Datensatztyp.';
        }
        else {
            errorMessage.value = 'Der Datensatz konnte nicht erstellt werden.';
        }
    }
    finally {
        creatingDataset.value = false;
    }
}
async function attachExistingAnnotations() {
    if (!canAttachExistingAnnotations.value)
        return;
    attachingAnnotations.value = true;
    errorMessage.value = '';
    createdDatasetMessage.value = '';
    attachmentMessage.value = '';
    attachmentResult.value = null;
    manifestPreview.value = null;
    try {
        attachmentResult.value = await attachAiDatasetAnnotations(selectedDatasetId.value, {
            includeAllAnnotations: true,
            includeFrameAnnotations: attachForm.includeFrameAnnotations,
            includeVideoAnnotations: attachForm.includeVideoAnnotations
        });
        attachmentMessage.value =
            `Datensatz enthält ${attachmentResult.value.frameAnnotationCount} Frame-Annotationen ` +
                `und ${attachmentResult.value.videoAnnotationCount} Video-Segmente.`;
    }
    catch (error) {
        console.error('Failed to attach existing AI dataset annotations:', error);
        const errors = error?.response?.data?.errors;
        errorMessage.value =
            errors?.includeAllAnnotations ||
                errors?.include_all_annotations ||
                errors?.includeFrameAnnotations ||
                errors?.include_frame_annotations ||
                errors?.includeVideoAnnotations ||
                errors?.include_video_annotations ||
                'Die Annotationen konnten nicht hinzugefügt werden.';
    }
    finally {
        attachingAnnotations.value = false;
    }
}
async function buildManifest() {
    if (!selectedDatasetId.value)
        return;
    buildingManifest.value = true;
    errorMessage.value = '';
    createdDatasetMessage.value = '';
    attachmentMessage.value = '';
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
                'Das Manifest konnte mit dieser Konfiguration nicht erstellt werden.';
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
/** @type {__VLS_StyleScopedClasses['create-dataset-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['attach-annotations-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['create-dataset-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['format-list']} */ ;
/** @type {__VLS_StyleScopedClasses['manifest-json']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['create-dataset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['attach-options-grid']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "heading-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadOptions) },
    type: "button",
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.isBusy),
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
    ...{ class: ({ 'status-chip-busy': __VLS_ctx.isBusy }) },
});
(__VLS_ctx.statusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.createDataset) },
    ...{ class: "create-dataset-panel" },
    'data-test': "create-dataset-form",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-dataset-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    'data-test': "new-dataset-name-input",
    disabled: (__VLS_ctx.isBusy),
    placeholder: "z. B. Koloskopie Training Mai 2026",
    maxlength: "255",
});
(__VLS_ctx.createDatasetForm.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.createDatasetForm.datasetType),
    ...{ class: "form-select" },
    'data-test': "new-dataset-type-select",
    disabled: (__VLS_ctx.isBusy),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "image",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "video",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    type: "submit",
    ...{ class: "btn btn-outline-primary create-dataset-button" },
    'data-test': "create-dataset-button",
    disabled: (!__VLS_ctx.canCreateDataset),
});
(__VLS_ctx.creatingDataset ? 'Datensatz wird erstellt...' : 'Datensatz erstellen');
if (__VLS_ctx.createdDatasetMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success mb-0 mt-3" },
        role: "status",
    });
    (__VLS_ctx.createdDatasetMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.attachExistingAnnotations) },
    ...{ class: "attach-annotations-panel" },
    'data-test': "attach-annotations-form",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "attach-options-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "check-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-check-input" },
    type: "checkbox",
    'data-test': "attach-frame-annotations-checkbox",
    disabled: (__VLS_ctx.isBusy),
});
(__VLS_ctx.attachForm.includeFrameAnnotations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "check-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-check-input" },
    type: "checkbox",
    'data-test': "attach-video-annotations-checkbox",
    disabled: (__VLS_ctx.isBusy),
});
(__VLS_ctx.attachForm.includeVideoAnnotations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    type: "submit",
    ...{ class: "btn btn-outline-primary attach-annotations-button" },
    'data-test': "attach-existing-annotations",
    disabled: (!__VLS_ctx.canAttachExistingAnnotations),
});
(__VLS_ctx.attachingAnnotations
    ? 'Annotationen werden hinzugefügt...'
    : 'Annotationen hinzufügen');
if (__VLS_ctx.attachmentMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success mb-0 mt-3" },
        role: "status",
    });
    (__VLS_ctx.attachmentMessage);
}
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
    disabled: (__VLS_ctx.isBusy),
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
    (__VLS_ctx.datasetTypeLabel(dataset.datasetType));
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy),
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
    disabled: (__VLS_ctx.isBusy || !__VLS_ctx.selectedDatasetId),
});
(__VLS_ctx.buildingManifest ? 'Manifest wird erstellt...' : 'Manifest-Vorschau erstellen');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetManifest) },
    type: "button",
    ...{ class: "btn btn-outline-secondary" },
    disabled: (__VLS_ctx.isBusy),
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
/** @type {__VLS_StyleScopedClasses['heading-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['status-chip-busy']} */ ;
/** @type {__VLS_StyleScopedClasses['create-dataset-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['create-dataset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['create-dataset-button']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['attach-annotations-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['attach-options-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['attach-annotations-button']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
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
            buildingManifest: buildingManifest,
            creatingDataset: creatingDataset,
            attachingAnnotations: attachingAnnotations,
            errorMessage: errorMessage,
            createdDatasetMessage: createdDatasetMessage,
            attachmentMessage: attachmentMessage,
            manifestPreview: manifestPreview,
            informationSourceInput: informationSourceInput,
            createDatasetForm: createDatasetForm,
            attachForm: attachForm,
            form: form,
            isBusy: isBusy,
            canCreateDataset: canCreateDataset,
            canAttachExistingAnnotations: canAttachExistingAnnotations,
            statusLabel: statusLabel,
            frameFormatLabel: frameFormatLabel,
            frameFormatDetail: frameFormatDetail,
            cropTemplateCount: cropTemplateCount,
            lxAiCoreManifestJson: lxAiCoreManifestJson,
            strategyLabel: strategyLabel,
            datasetTypeLabel: datasetTypeLabel,
            loadOptions: loadOptions,
            createDataset: createDataset,
            attachExistingAnnotations: attachExistingAnnotations,
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
