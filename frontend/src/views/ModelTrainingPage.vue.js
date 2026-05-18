import { fetchAiDatasetFrameBucketDistribution } from '@/api/aiDatasetApi';
import { createModelTrainingRun, fetchModelTrainingOptions, fetchModelTrainingRun, fetchModelTrainingRuns } from '@/api/modelTrainingApi';
import { useToastStore } from '@/stores/toastStore';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
const toast = useToastStore();
const loading = ref(true);
const runPolling = ref(false);
const errorMessage = ref('');
const runErrorMessage = ref('');
const currentRun = ref(null);
const recentRuns = ref([]);
const trainingTargetOptions = ref([]);
const datasetOptions = ref([]);
const backboneOptions = ref([]);
const featureModeOptions = ref([]);
const phiBaseModelOptions = ref([]);
const imageDefaults = ref(null);
const phiDefaults = ref(null);
const pollTimer = ref(null);
const datasetSummary = ref(null);
const datasetSummaryLoading = ref(false);
const datasetSummaryError = ref('');
let datasetSummaryRequestId = 0;
const annotationSourceOptions = [
    { value: 'all', label: 'Alle' },
    { value: 'frame_only', label: 'Nur Frames' },
    { value: 'segment_only', label: 'Nur Segmente' }
];
const form = reactive({
    trainingTarget: 'image_multilabel',
    annotationSourceScope: 'all',
    datasetId: '',
    datasetYaml: '',
    outputDir: '',
    baseModel: 'yolov8n.pt',
    runName: '',
    backboneName: 'gastro_rn50',
    featureMode: 'freeze_backbone',
    epochs: 10,
    batchSize: 32,
    inputSize: 640,
    device: 'auto',
    workers: 4,
    patience: 25,
    exportOnnx: true,
    confidenceThreshold: 0.35,
    nmsThreshold: 0.45,
    classIds: '',
    labelsetVersion: 2,
    backboneCheckpoint: '',
    treatUnlabeledAsNegative: true
});
const selectedBackboneDescription = computed(() => {
    return backboneOptions.value.find((option) => option.value === form.backboneName)?.description ?? '';
});
const selectedFeatureModeDescription = computed(() => {
    return featureModeOptions.value.find((option) => option.value === form.featureMode)?.description ?? '';
});
const selectedPhiBaseModelDescription = computed(() => {
    return phiBaseModelOptions.value.find((option) => option.value === form.baseModel)?.description ?? '';
});
function isImageMultilabelDataset(dataset) {
    return (dataset.datasetType === 'image' &&
        dataset.aiModelType === 'image_multilabel_classification');
}
const trainingDatasetOptions = computed(() => {
    return datasetOptions.value.filter(isImageMultilabelDataset);
});
const selectedDataset = computed(() => {
    return trainingDatasetOptions.value.find((dataset) => String(dataset.id) === form.datasetId) ?? null;
});
const effectiveTrainingFrameCount = computed(() => {
    const summary = datasetSummary.value?.summary;
    if (!summary)
        return 0;
    if (form.annotationSourceScope === 'frame_only')
        return summary.annotationFrameCount;
    if (form.annotationSourceScope === 'segment_only')
        return summary.segmentFrameCount;
    return summary.mergedFrameCount;
});
const selectedScopeHasNoFrames = computed(() => {
    return Boolean(form.datasetId &&
        datasetSummary.value &&
        !datasetSummaryLoading.value &&
        !datasetSummaryError.value &&
        effectiveTrainingFrameCount.value === 0);
});
const canStartTraining = computed(() => {
    if (form.trainingTarget === 'phi_region_detector') {
        return Boolean(form.datasetYaml.trim());
    }
    return Boolean(form.datasetId &&
        datasetSummary.value &&
        !datasetSummaryLoading.value &&
        !datasetSummaryError.value &&
        effectiveTrainingFrameCount.value > 0);
});
const statusChipLabel = computed(() => {
    if (!currentRun.value)
        return loading.value ? 'Lade Optionen' : 'Bereit';
    return runStatusLabel(currentRun.value.status);
});
const statusChipClass = computed(() => {
    return {
        'training-status-running': currentRun.value?.status === 'queued' || currentRun.value?.status === 'running',
        'training-status-success': currentRun.value?.status === 'completed',
        'training-status-failed': currentRun.value?.status === 'failed' || currentRun.value?.status === 'lost'
    };
});
const artifactEntries = computed(() => {
    const entries = Object.entries(currentRun.value?.artifactPaths ?? {});
    return entries.filter(([key]) => {
        return !['model_path', 'meta_path', 'modelPath', 'metaPath'].includes(key) || !currentRun.value?.result;
    });
});
const runOutputLog = computed(() => {
    const output = [currentRun.value?.stdout, currentRun.value?.stderr]
        .filter((value) => value && value.trim())
        .join('\n');
    return output || 'No output yet.';
});
function isRunActive(run) {
    return run.status === 'queued' || run.status === 'running';
}
function runStatusLabel(status) {
    if (status === 'queued')
        return 'In Warteschlange';
    if (status === 'running')
        return 'Training läuft';
    if (status === 'completed')
        return 'Training abgeschlossen';
    if (status === 'lost')
        return 'Ergebnis verloren';
    return 'Training fehlgeschlagen';
}
function trainingTargetLabel(target) {
    if (target === 'phi_region_detector')
        return 'PHI Region Detector';
    return 'Image Multilabel Model';
}
function annotationSourceLabel(scope) {
    if (scope === 'frame_only')
        return 'Nur Frames';
    if (scope === 'segment_only')
        return 'Nur Segmente';
    return 'Alle';
}
function runDatasetLabel(run) {
    if (run.datasetName)
        return run.datasetName;
    if (run.datasetId)
        return `ID ${run.datasetId}`;
    return 'External dataset';
}
function fieldErrorMessage(error, fallback) {
    const responseError = error;
    const errors = responseError.response?.data?.errors;
    if (!errors)
        return fallback;
    const messages = Object.values(errors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value) => typeof value === 'string' && value.trim().length > 0);
    return messages.length ? messages.join(' ') : fallback;
}
function artifactLabel(key) {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}
function stopPolling() {
    if (pollTimer.value !== null) {
        window.clearInterval(pollTimer.value);
        pollTimer.value = null;
    }
}
function applyDefaults() {
    const preferredDataset = trainingDatasetOptions.value.find((dataset) => dataset.isActive) ??
        trainingDatasetOptions.value[0];
    const currentDatasetIsTrainable = trainingDatasetOptions.value.some((dataset) => String(dataset.id) === form.datasetId);
    if ((!form.datasetId || !currentDatasetIsTrainable) && preferredDataset) {
        form.datasetId = String(preferredDataset.id);
    }
}
async function loadDatasetSummary(datasetId) {
    const requestId = ++datasetSummaryRequestId;
    datasetSummary.value = null;
    datasetSummaryError.value = '';
    if (!datasetId) {
        datasetSummaryLoading.value = false;
        return;
    }
    datasetSummaryLoading.value = true;
    try {
        const summary = await fetchAiDatasetFrameBucketDistribution(datasetId);
        if (requestId === datasetSummaryRequestId) {
            datasetSummary.value = summary;
        }
    }
    catch (error) {
        console.error('Failed to load AI dataset training summary:', error);
        if (requestId === datasetSummaryRequestId) {
            datasetSummaryError.value = 'Die Datensatz-Zusammenfassung konnte nicht geladen werden.';
        }
    }
    finally {
        if (requestId === datasetSummaryRequestId) {
            datasetSummaryLoading.value = false;
        }
    }
}
function applyImageTrainingDefaults(defaults) {
    form.backboneName = defaults.backboneName;
    form.featureMode = defaults.featureMode;
    form.epochs = defaults.epochs;
    form.batchSize = defaults.batchSize;
    form.labelsetVersion = defaults.labelsetVersion;
    form.backboneCheckpoint = defaults.backboneCheckpoint ?? '';
    form.treatUnlabeledAsNegative = defaults.treatUnlabeledAsNegative;
}
function applyPhiDefaults(defaults, includeShared = false) {
    form.datasetYaml = defaults.datasetYaml;
    form.outputDir = defaults.outputDir;
    form.baseModel = defaults.baseModel;
    form.runName = defaults.runName;
    if (includeShared) {
        form.epochs = defaults.epochs;
        form.batchSize = defaults.batchSize;
    }
    form.inputSize = defaults.inputSize;
    form.device = defaults.device;
    form.workers = defaults.workers;
    form.patience = defaults.patience;
    form.exportOnnx = defaults.exportOnnx;
    form.confidenceThreshold = defaults.confidenceThreshold;
    form.nmsThreshold = defaults.nmsThreshold;
    form.classIds = defaults.classIds;
}
function setTrainingTarget(value) {
    if (value === 'image_multilabel' || value === 'phi_region_detector') {
        form.trainingTarget = value;
        errorMessage.value = '';
        if (value === 'phi_region_detector' && phiDefaults.value) {
            applyPhiDefaults(phiDefaults.value, true);
        }
        else if (value === 'image_multilabel' && imageDefaults.value) {
            applyImageTrainingDefaults(imageDefaults.value);
        }
    }
}
async function loadPage() {
    loading.value = true;
    errorMessage.value = '';
    runErrorMessage.value = '';
    stopPolling();
    try {
        const [options, runs] = await Promise.all([
            fetchModelTrainingOptions(),
            fetchModelTrainingRuns()
        ]);
        trainingTargetOptions.value = options.trainingTargets;
        datasetOptions.value = options.aiDatasets;
        backboneOptions.value = options.backbones;
        featureModeOptions.value = options.featureModes;
        phiBaseModelOptions.value = options.phiRegionDetector.baseModels;
        imageDefaults.value = options.defaults;
        phiDefaults.value = options.phiRegionDetector.defaults;
        recentRuns.value = runs;
        applyImageTrainingDefaults(options.defaults);
        applyDefaults();
        if (form.trainingTarget === 'image_multilabel') {
            void loadDatasetSummary(form.datasetId);
        }
        applyPhiDefaults(options.phiRegionDetector.defaults);
        const activeRun = runs.find(isRunActive) ?? runs[0] ?? null;
        currentRun.value = activeRun;
        runErrorMessage.value =
            activeRun && (activeRun.status === 'failed' || activeRun.status === 'lost')
                ? activeRun.error || 'Training fehlgeschlagen.'
                : '';
        runPolling.value = activeRun ? isRunActive(activeRun) : false;
        if (activeRun && isRunActive(activeRun)) {
            startPolling(activeRun.runId);
        }
    }
    catch (error) {
        console.error('Failed to load model training page:', error);
        errorMessage.value = 'Die Trainingsoptionen oder gespeicherten Läufe konnten nicht geladen werden.';
    }
    finally {
        loading.value = false;
    }
}
async function refreshRun(runId) {
    try {
        const run = await fetchModelTrainingRun(runId);
        currentRun.value = run;
        recentRuns.value = [run, ...recentRuns.value.filter((entry) => entry.runId !== run.runId)];
        if (run.status === 'completed') {
            runPolling.value = false;
            stopPolling();
            toast.success({ text: 'Training abgeschlossen.' });
        }
        else if (run.status === 'failed' || run.status === 'lost') {
            runPolling.value = false;
            stopPolling();
            runErrorMessage.value = run.error || 'Training fehlgeschlagen.';
            toast.error({ text: run.status === 'lost' ? 'Trainingsergebnis verloren.' : 'Training fehlgeschlagen.' });
        }
    }
    catch (error) {
        console.error('Failed to refresh training run:', error);
        runPolling.value = false;
        stopPolling();
        runErrorMessage.value = 'Der Trainingsstatus konnte nicht aktualisiert werden.';
    }
}
function startPolling(runId) {
    stopPolling();
    runPolling.value = true;
    pollTimer.value = window.setInterval(() => {
        void refreshRun(runId);
    }, 2000);
}
function selectRun(run) {
    currentRun.value = run;
    runErrorMessage.value = run.error || '';
    if (isRunActive(run)) {
        startPolling(run.runId);
    }
    else {
        runPolling.value = false;
        stopPolling();
    }
}
async function startTraining() {
    runErrorMessage.value = '';
    errorMessage.value = '';
    try {
        const payload = form.trainingTarget === 'phi_region_detector'
            ? {
                trainingTarget: form.trainingTarget,
                datasetYaml: form.datasetYaml.trim(),
                outputDir: form.outputDir.trim(),
                baseModel: form.baseModel,
                runName: form.runName.trim() || null,
                epochs: form.epochs,
                batchSize: form.batchSize,
                inputSize: form.inputSize,
                device: form.device.trim() || 'auto',
                workers: form.workers,
                patience: form.patience,
                exportOnnx: form.exportOnnx,
                confidenceThreshold: form.confidenceThreshold,
                nmsThreshold: form.nmsThreshold,
                classIds: form.classIds.trim()
            }
            : {
                datasetId: Number(form.datasetId),
                annotationSourceScope: form.annotationSourceScope,
                backboneName: form.backboneName,
                featureMode: form.featureMode,
                epochs: form.epochs,
                batchSize: form.batchSize,
                labelsetVersion: form.labelsetVersion,
                treatUnlabeledAsNegative: form.treatUnlabeledAsNegative,
                backboneCheckpoint: form.backboneCheckpoint.trim() || null
            };
        const run = await createModelTrainingRun(payload);
        currentRun.value = run;
        recentRuns.value = [run, ...recentRuns.value.filter((entry) => entry.runId !== run.runId)];
        toast.success({ text: 'Training gestartet.' });
        startPolling(run.runId);
        void refreshRun(run.runId);
    }
    catch (error) {
        console.error('Failed to start training run:', error);
        const message = fieldErrorMessage(error, 'Der Trainingslauf konnte nicht gestartet werden.');
        runErrorMessage.value = message;
        toast.error({ text: message });
    }
}
function formatTimestamp(value) {
    if (!value)
        return 'n/a';
    return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}
watch(() => form.datasetId, (datasetId) => {
    if (form.trainingTarget === 'image_multilabel') {
        void loadDatasetSummary(datasetId);
    }
});
watch(() => form.trainingTarget, (trainingTarget) => {
    if (trainingTarget === 'image_multilabel') {
        void loadDatasetSummary(form.datasetId);
    }
});
onMounted(() => {
    void loadPage();
});
onBeforeUnmount(() => {
    stopPolling();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['training-card-contrast']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['training-card-contrast']} */ ;
/** @type {__VLS_StyleScopedClasses['status-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-button']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-runs-header']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-runs-header']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-run-row']} */ ;
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['training-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-run-row']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-control']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-button']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-button']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "training-page container-fluid py-4 px-3 px-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "training-hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "training-eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "training-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "training-intro" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "training-status-chip" },
    ...{ class: (__VLS_ctx.statusChipClass) },
});
(__VLS_ctx.statusChipLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-4 align-items-start" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-xl-7" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "training-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadPage) },
    type: "button",
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading || __VLS_ctx.runPolling),
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.startTraining) },
        ...{ class: "training-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "training-target-control" },
        role: "group",
        'aria-label': "Training target",
    });
    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.trainingTargetOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.setTrainingTarget(option.value);
                } },
            key: (option.value),
            type: "button",
            ...{ class: "training-target-button" },
            ...{ class: ({ 'training-target-button-active': __VLS_ctx.form.trainingTarget === option.value }) },
            disabled: (__VLS_ctx.runPolling),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (option.label);
    }
    if (__VLS_ctx.errorMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mb-3" },
            role: "alert",
        });
        (__VLS_ctx.errorMessage);
    }
    if (__VLS_ctx.form.trainingTarget === 'image_multilabel') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.datasetId),
            ...{ class: "form-select" },
            'data-test': "training-dataset-select",
            disabled: (__VLS_ctx.runPolling),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.trainingDatasetOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (dataset.id),
                value: (String(dataset.id)),
            });
            (dataset.label);
            (dataset.id);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted mt-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "annotation-source-control" },
            role: "group",
            'aria-label': "Annotation source",
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.annotationSourceOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.form.trainingTarget === 'image_multilabel'))
                            return;
                        __VLS_ctx.form.annotationSourceScope = option.value;
                    } },
                key: (option.value),
                type: "button",
                ...{ class: "annotation-source-button" },
                ...{ class: ({ 'annotation-source-button-active': __VLS_ctx.form.annotationSourceScope === option.value }) },
                'data-test': (`annotation-source-${option.value}`),
                disabled: (__VLS_ctx.runPolling),
            });
            (option.label);
        }
        if (__VLS_ctx.form.datasetId) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "dataset-summary-band" },
                'data-test': "training-dataset-summary",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "dataset-summary-heading" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedDataset?.label ?? 'AI Dataset');
            if (__VLS_ctx.datasetSummaryLoading) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.effectiveTrainingFrameCount);
            }
            if (__VLS_ctx.datasetSummaryError) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "dataset-summary-error" },
                    role: "alert",
                });
                (__VLS_ctx.datasetSummaryError);
            }
            else if (__VLS_ctx.datasetSummary) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "dataset-summary-grid" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.imageAnnotationCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.videoAnnotationCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.annotationFrameCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.segmentFrameCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.mergedFrameCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.videoCount);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.datasetSummary.summary.labelCount);
            }
            if (__VLS_ctx.selectedScopeHasNoFrames) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "dataset-summary-error" },
                    role: "alert",
                });
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.backboneName),
            ...{ class: "form-select" },
            'data-test': "training-backbone-select",
            disabled: (__VLS_ctx.runPolling),
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.backboneOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted mt-1" },
        });
        (__VLS_ctx.selectedBackboneDescription);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.featureMode),
            ...{ class: "form-select" },
            'data-test': "training-feature-mode-select",
            disabled: (__VLS_ctx.runPolling),
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.featureModeOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted mt-1" },
        });
        (__VLS_ctx.selectedFeatureModeDescription);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "training-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "1",
            ...{ class: "form-control" },
            'data-test': "training-epochs-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.epochs);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "1",
            ...{ class: "form-control" },
            'data-test': "training-batch-size-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.batchSize);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "1",
            ...{ class: "form-control" },
            'data-test': "training-labelset-version-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.labelsetVersion);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.backboneCheckpoint),
            type: "text",
            ...{ class: "form-control" },
            'data-test': "training-backbone-checkpoint-input",
            disabled: (__VLS_ctx.runPolling),
            placeholder: "/absolute/path/to/checkpoint.pth",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted mt-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check training-checkbox" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            id: "treat-unlabeled-as-negative",
            ...{ class: "form-check-input" },
            type: "checkbox",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.treatUnlabeledAsNegative);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "treat-unlabeled-as-negative",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.datasetYaml),
            type: "text",
            ...{ class: "form-control" },
            'data-test': "phi-dataset-yaml-input",
            disabled: (__VLS_ctx.runPolling),
            placeholder: "/absolute/path/to/dataset.yaml",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.form.baseModel),
            ...{ class: "form-select" },
            'data-test': "phi-base-model-select",
            disabled: (__VLS_ctx.runPolling),
        });
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.phiBaseModelOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (option.value),
                value: (option.value),
            });
            (option.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted mt-1" },
        });
        (__VLS_ctx.selectedPhiBaseModelDescription);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "training-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "1",
            ...{ class: "form-control" },
            'data-test': "phi-epochs-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.epochs);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "1",
            ...{ class: "form-control" },
            'data-test': "phi-batch-size-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.batchSize);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "32",
            step: "32",
            ...{ class: "form-control" },
            'data-test': "phi-input-size-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.inputSize);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "training-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.device),
            type: "text",
            ...{ class: "form-control" },
            'data-test': "phi-device-input",
            disabled: (__VLS_ctx.runPolling),
            placeholder: "auto",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            ...{ class: "form-control" },
            'data-test': "phi-workers-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.workers);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            ...{ class: "form-control" },
            'data-test': "phi-patience-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.patience);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "training-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            max: "1",
            step: "0.01",
            ...{ class: "form-control" },
            'data-test': "phi-confidence-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.confidenceThreshold);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "number",
            min: "0",
            max: "1",
            step: "0.01",
            ...{ class: "form-control" },
            'data-test': "phi-nms-input",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.nmsThreshold);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.classIds),
            type: "text",
            ...{ class: "form-control" },
            'data-test': "phi-class-ids-input",
            disabled: (__VLS_ctx.runPolling),
            placeholder: "0,1",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.outputDir),
            type: "text",
            ...{ class: "form-control" },
            'data-test': "phi-output-dir-input",
            disabled: (__VLS_ctx.runPolling),
            placeholder: "/absolute/path/to/runs",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "training-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.form.runName),
            type: "text",
            ...{ class: "form-control" },
            'data-test': "phi-run-name-input",
            disabled: (__VLS_ctx.runPolling),
            placeholder: "phi-detector-v1",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check training-checkbox" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            id: "phi-export-onnx",
            ...{ class: "form-check-input" },
            type: "checkbox",
            'data-test': "phi-export-onnx-checkbox",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.exportOnnx);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "phi-export-onnx",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startTraining) },
        type: "button",
        ...{ class: "btn btn-primary" },
        'data-test': "start-training-run",
        disabled: (__VLS_ctx.runPolling || !__VLS_ctx.canStartTraining),
    });
    (__VLS_ctx.runPolling ? 'Training läuft…' : 'Training starten');
}
if (__VLS_ctx.recentRuns.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recent-runs" },
        'data-test': "training-runs-list",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recent-runs-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.recentRuns.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recent-runs-table" },
    });
    for (const [run] of __VLS_getVForSourceType((__VLS_ctx.recentRuns))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.recentRuns.length))
                        return;
                    __VLS_ctx.selectRun(run);
                } },
            key: (run.runId),
            type: "button",
            ...{ class: "recent-run-row" },
            ...{ class: ({ 'recent-run-row-active': __VLS_ctx.currentRun?.runId === run.runId }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.runDatasetLabel(run));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.runStatusLabel(run.status));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatTimestamp(run.createdAt));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-xl-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "training-card training-card-contrast" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "status-intro" },
});
if (__VLS_ctx.currentRun) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({
        ...{ class: "training-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.currentRun.runId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.trainingTargetLabel(__VLS_ctx.currentRun.trainingTarget));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.runStatusLabel(__VLS_ctx.currentRun.status));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.runDatasetLabel(__VLS_ctx.currentRun));
    if (__VLS_ctx.currentRun.trainingTarget !== 'phi_region_detector') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
        (__VLS_ctx.annotationSourceLabel(__VLS_ctx.currentRun.annotationSourceScope ?? 'all'));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.currentRun.backboneName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.currentRun.featureMode);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatTimestamp(__VLS_ctx.currentRun.createdAt));
    if (__VLS_ctx.currentRun.finishedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
        (__VLS_ctx.formatTimestamp(__VLS_ctx.currentRun.finishedAt));
    }
    if (__VLS_ctx.currentRun.result?.modelPath) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
        (__VLS_ctx.currentRun.result.modelPath);
    }
    if (__VLS_ctx.currentRun.result?.metaPath) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
        (__VLS_ctx.currentRun.result.metaPath);
    }
    for (const [[label, path]] of __VLS_getVForSourceType((__VLS_ctx.artifactEntries))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (label),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
        (__VLS_ctx.artifactLabel(label));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
        (path);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted mb-0" },
    });
}
if (__VLS_ctx.runErrorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger mt-3 mb-0" },
        role: "alert",
    });
    (__VLS_ctx.runErrorMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "training-card mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "training-log-details" },
    open: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: "training-log" },
    'data-test': "training-run-log",
});
(__VLS_ctx.runOutputLog);
/** @type {__VLS_StyleScopedClasses['training-page']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['training-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['training-eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['training-title']} */ ;
/** @type {__VLS_StyleScopedClasses['training-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['training-status-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-4']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-7']} */ ;
/** @type {__VLS_StyleScopedClasses['training-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line-short']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['training-form']} */ ;
/** @type {__VLS_StyleScopedClasses['training-target-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-target-button']} */ ;
/** @type {__VLS_StyleScopedClasses['training-target-button-active']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-control']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-button']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-source-button-active']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-band']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-error']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-summary-error']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['training-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['training-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['training-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['training-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['actions-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-runs']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-runs-header']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-runs-table']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-run-row']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-run-row-active']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-5']} */ ;
/** @type {__VLS_StyleScopedClasses['training-card']} */ ;
/** @type {__VLS_StyleScopedClasses['training-card-contrast']} */ ;
/** @type {__VLS_StyleScopedClasses['status-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['training-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['training-log-details']} */ ;
/** @type {__VLS_StyleScopedClasses['training-log']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            runPolling: runPolling,
            errorMessage: errorMessage,
            runErrorMessage: runErrorMessage,
            currentRun: currentRun,
            recentRuns: recentRuns,
            trainingTargetOptions: trainingTargetOptions,
            backboneOptions: backboneOptions,
            featureModeOptions: featureModeOptions,
            phiBaseModelOptions: phiBaseModelOptions,
            datasetSummary: datasetSummary,
            datasetSummaryLoading: datasetSummaryLoading,
            datasetSummaryError: datasetSummaryError,
            annotationSourceOptions: annotationSourceOptions,
            form: form,
            selectedBackboneDescription: selectedBackboneDescription,
            selectedFeatureModeDescription: selectedFeatureModeDescription,
            selectedPhiBaseModelDescription: selectedPhiBaseModelDescription,
            trainingDatasetOptions: trainingDatasetOptions,
            selectedDataset: selectedDataset,
            effectiveTrainingFrameCount: effectiveTrainingFrameCount,
            selectedScopeHasNoFrames: selectedScopeHasNoFrames,
            canStartTraining: canStartTraining,
            statusChipLabel: statusChipLabel,
            statusChipClass: statusChipClass,
            artifactEntries: artifactEntries,
            runOutputLog: runOutputLog,
            runStatusLabel: runStatusLabel,
            trainingTargetLabel: trainingTargetLabel,
            annotationSourceLabel: annotationSourceLabel,
            runDatasetLabel: runDatasetLabel,
            artifactLabel: artifactLabel,
            setTrainingTarget: setTrainingTarget,
            loadPage: loadPage,
            selectRun: selectRun,
            startTraining: startTraining,
            formatTimestamp: formatTimestamp,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
