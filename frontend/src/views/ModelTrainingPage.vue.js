import { createModelTrainingRun, fetchModelTrainingOptions, fetchModelTrainingRun } from '@/api/modelTrainingApi';
import { useAnnotationQueueStore } from '@/stores/annotationQueue';
import { useToastStore } from '@/stores/toastStore';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
const toast = useToastStore();
const annotationQueue = useAnnotationQueueStore();
const loading = ref(true);
const runPolling = ref(false);
const errorMessage = ref('');
const runErrorMessage = ref('');
const currentRun = ref(null);
const datasetOptions = ref([]);
const backboneOptions = ref([]);
const featureModeOptions = ref([]);
const pollTimer = ref(null);
const form = reactive({
    datasetId: '',
    samplingStrategy: annotationQueue.samplingStrategy,
    predictionSegmentsOnly: annotationQueue.predictionSegmentsOnly,
    backboneName: 'gastro_rn50',
    featureMode: 'freeze_backbone',
    epochs: 10,
    batchSize: 32,
    labelsetVersion: 2,
    backboneCheckpoint: '',
    treatUnlabeledAsNegative: true
});
const samplingStrategyOptions = [
    {
        value: 'balanced',
        label: 'Ausgewogen: Annotationen und KI-Segmente',
        description: 'Wählt Frames aus Dataset-Annotationen und KI-Segmenten und priorisiert unterrepräsentierte Labels.'
    },
    {
        value: 'segments',
        label: 'KI-Segmentierungen',
        description: 'Wählt Frames aus Segmentbereichen des Datensatzes, optional nur aus Modellvorhersagen.'
    },
    {
        value: 'annotations',
        label: 'Annotationen',
        description: 'Wählt Frames aus positiven Frame-Annotationen des Datensatzes.'
    },
    {
        value: 'none',
        label: 'Zufällig',
        description: 'Deaktiviert Dataset-basiertes Sampling und nutzt die normale zufällige Auswahl.'
    }
];
const selectedBackboneDescription = computed(() => {
    return backboneOptions.value.find((option) => option.value === form.backboneName)?.description ?? '';
});
const selectedFeatureModeDescription = computed(() => {
    return featureModeOptions.value.find((option) => option.value === form.featureMode)?.description ?? '';
});
const selectedSamplingStrategyDescription = computed(() => {
    return (samplingStrategyOptions.find((option) => option.value === form.samplingStrategy)?.description ?? '');
});
const statusChipLabel = computed(() => {
    if (!currentRun.value)
        return loading.value ? 'Lade Optionen' : 'Bereit';
    if (currentRun.value.status === 'queued')
        return 'In Warteschlange';
    if (currentRun.value.status === 'running')
        return 'Training läuft';
    if (currentRun.value.status === 'completed')
        return 'Training abgeschlossen';
    return 'Training fehlgeschlagen';
});
const statusChipClass = computed(() => {
    return {
        'training-status-running': currentRun.value?.status === 'queued' || currentRun.value?.status === 'running',
        'training-status-success': currentRun.value?.status === 'completed',
        'training-status-failed': currentRun.value?.status === 'failed'
    };
});
function stopPolling() {
    if (pollTimer.value !== null) {
        window.clearInterval(pollTimer.value);
        pollTimer.value = null;
    }
}
function applyDefaults() {
    const preferredDataset = datasetOptions.value.find((dataset) => dataset.isActive) ?? datasetOptions.value[0];
    if (!form.datasetId && preferredDataset) {
        form.datasetId = String(preferredDataset.id);
    }
}
function syncAnnotationQueueSelection() {
    annotationQueue.setSamplingStrategy(form.samplingStrategy);
    annotationQueue.setPredictionSegmentsOnly(form.predictionSegmentsOnly);
    const selectedDataset = datasetOptions.value.find((dataset) => String(dataset.id) === form.datasetId);
    annotationQueue.setAiDataset(selectedDataset?.value || selectedDataset?.label || null, selectedDataset?.datasetType || null);
}
async function loadPage() {
    loading.value = true;
    errorMessage.value = '';
    runErrorMessage.value = '';
    try {
        const options = await fetchModelTrainingOptions();
        datasetOptions.value = options.aiDatasets;
        backboneOptions.value = options.backbones;
        featureModeOptions.value = options.featureModes;
        form.backboneName = options.defaults.backboneName;
        form.featureMode = options.defaults.featureMode;
        form.epochs = options.defaults.epochs;
        form.batchSize = options.defaults.batchSize;
        form.labelsetVersion = options.defaults.labelsetVersion;
        form.backboneCheckpoint = options.defaults.backboneCheckpoint ?? '';
        form.treatUnlabeledAsNegative = options.defaults.treatUnlabeledAsNegative;
        applyDefaults();
        syncAnnotationQueueSelection();
    }
    catch (error) {
        console.error('Failed to load model training options:', error);
        errorMessage.value = 'Die Trainingsoptionen konnten nicht geladen werden.';
    }
    finally {
        loading.value = false;
    }
}
watch(() => [form.datasetId, form.samplingStrategy, form.predictionSegmentsOnly], () => {
    syncAnnotationQueueSelection();
});
async function refreshRun(runId) {
    try {
        const run = await fetchModelTrainingRun(runId);
        currentRun.value = run;
        if (run.status === 'completed') {
            runPolling.value = false;
            stopPolling();
            toast.success({ text: 'Training abgeschlossen.' });
        }
        else if (run.status === 'failed') {
            runPolling.value = false;
            stopPolling();
            runErrorMessage.value = run.error || 'Training fehlgeschlagen.';
            toast.error({ text: 'Training fehlgeschlagen.' });
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
    pollTimer.value = window.setInterval(() => {
        void refreshRun(runId);
    }, 2000);
}
async function startTraining() {
    runErrorMessage.value = '';
    try {
        const run = await createModelTrainingRun({
            datasetId: Number(form.datasetId),
            backboneName: form.backboneName,
            featureMode: form.featureMode,
            epochs: form.epochs,
            batchSize: form.batchSize,
            labelsetVersion: form.labelsetVersion,
            treatUnlabeledAsNegative: form.treatUnlabeledAsNegative,
            backboneCheckpoint: form.backboneCheckpoint.trim() || null
        });
        currentRun.value = run;
        runPolling.value = true;
        toast.success({ text: 'Training gestartet.' });
        startPolling(run.runId);
        void refreshRun(run.runId);
    }
    catch (error) {
        console.error('Failed to start training run:', error);
        runErrorMessage.value = 'Der Trainingslauf konnte nicht gestartet werden.';
        toast.error({ text: 'Training konnte nicht gestartet werden.' });
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
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['training-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['training-hero']} */ ;
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
    if (__VLS_ctx.errorMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mb-3" },
            role: "alert",
        });
        (__VLS_ctx.errorMessage);
    }
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
    for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasetOptions))) {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "training-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.samplingStrategy),
        ...{ class: "form-select" },
        'data-test': "training-sampling-strategy-select",
        disabled: (__VLS_ctx.runPolling),
    });
    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.samplingStrategyOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (option.value),
            value: (option.value),
        });
        (option.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted mt-1" },
    });
    (__VLS_ctx.selectedSamplingStrategyDescription);
    if (__VLS_ctx.form.samplingStrategy === 'balanced' || __VLS_ctx.form.samplingStrategy === 'segments') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check training-checkbox" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            id: "prediction-segments-only",
            ...{ class: "form-check-input" },
            type: "checkbox",
            'data-test': "training-prediction-segments-only",
            disabled: (__VLS_ctx.runPolling),
        });
        (__VLS_ctx.form.predictionSegmentsOnly);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "prediction-segments-only",
        });
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startTraining) },
        type: "button",
        ...{ class: "btn btn-primary" },
        'data-test': "start-training-run",
        disabled: (__VLS_ctx.runPolling || !__VLS_ctx.form.datasetId),
    });
    (__VLS_ctx.runPolling ? 'Training läuft…' : 'Training starten');
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
    (__VLS_ctx.currentRun.status);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.currentRun.datasetName || `ID ${__VLS_ctx.currentRun.datasetId}`);
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: "training-log" },
    'data-test': "training-run-log",
});
(__VLS_ctx.currentRun?.stdout || 'No output yet.');
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
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['training-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['training-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
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
/** @type {__VLS_StyleScopedClasses['actions-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
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
            datasetOptions: datasetOptions,
            backboneOptions: backboneOptions,
            featureModeOptions: featureModeOptions,
            form: form,
            samplingStrategyOptions: samplingStrategyOptions,
            selectedBackboneDescription: selectedBackboneDescription,
            selectedFeatureModeDescription: selectedFeatureModeDescription,
            selectedSamplingStrategyDescription: selectedSamplingStrategyDescription,
            statusChipLabel: statusChipLabel,
            statusChipClass: statusChipClass,
            loadPage: loadPage,
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
