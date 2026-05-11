import { fetchApplicationSettings, fetchApplicationSettingsDropdowns, fetchApplicationVideoDimensionBackfillRun, triggerApplicationBackup, triggerApplicationAiDatasetExport, triggerApplicationVideoDimensionBackfill, updateApplicationSettings } from '@/api/applicationSettingsApi';
import { useTerminologyStore } from '@/stores/terminologyStore';
import { useToastStore } from '@/stores/toastStore';
import { computed, onMounted, reactive, ref } from 'vue';
const EMPTY_OPTION = '';
const VIDEO_DIMENSION_BACKFILL_POLL_INTERVAL_MS = 1000;
const VIDEO_DIMENSION_BACKFILL_MAX_POLLS = 120;
const toast = useToastStore();
const terminology = useTerminologyStore();
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const currentSettings = ref(null);
const backupInProgress = ref(false);
const backupTargetPath = ref('');
const backupResult = ref(null);
const backupError = ref('');
const aiDatasetExportInProgress = ref(false);
const aiDatasetExportResult = ref(null);
const aiDatasetExportError = ref('');
const videoDimensionBackfillInProgress = ref(false);
const videoDimensionBackfillDryRun = ref(true);
const videoDimensionBackfillLimit = ref('');
const videoDimensionBackfillRun = ref(null);
const videoDimensionBackfillError = ref('');
const selectedTerminologyKey = ref('');
const dropdowns = reactive({
    centers: [],
    processors: [],
    annotators: [],
    reportTemplates: [],
    aiDatasets: []
});
const form = reactive({
    centerId: EMPTY_OPTION,
    processorId: EMPTY_OPTION,
    annotatorName: EMPTY_OPTION,
    reportTemplateName: EMPTY_OPTION,
    aiDatasetId: EMPTY_OPTION,
    aiDatasetName: EMPTY_OPTION,
    aiDatasetType: EMPTY_OPTION
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
const selectedAnnotatorLabel = computed(() => {
    const match = dropdowns.annotators.find((option) => option.value === form.annotatorName);
    return match?.label ?? 'Kein Standard-Annotator';
});
const selectedReportTemplateLabel = computed(() => {
    const match = dropdowns.reportTemplates.find((option) => option.value === form.reportTemplateName);
    return match?.label ?? 'Keine Standardvorlage';
});
const selectedAiDatasetOption = computed(() => {
    return dropdowns.aiDatasets.find((option) => String(option.id) === form.aiDatasetId) ?? null;
});
const selectedAiDatasetLabel = computed(() => {
    if (selectedAiDatasetOption.value) {
        return `${selectedAiDatasetOption.value.label} (ID ${selectedAiDatasetOption.value.id})`;
    }
    return form.aiDatasetName || 'Kein KI-Datensatz';
});
const selectedAiDatasetTypeLabel = computed(() => {
    const datasetType = selectedAiDatasetOption.value?.datasetType || form.aiDatasetType;
    if (datasetType === 'image')
        return 'Image';
    if (datasetType === 'video')
        return 'Video';
    return 'Nicht gesetzt';
});
const selectedAiDatasetDuplicateWarning = computed(() => {
    const selected = selectedAiDatasetOption.value;
    if (!selected || selected.nameCount <= 1)
        return '';
    return 'Mehrere Datensätze haben diesen Namen. Der Export verwendet deshalb die eindeutige ID.';
});
const backupReady = computed(() => currentSettings.value?.backupStatus.ready ?? false);
const backupMissingPaths = computed(() => currentSettings.value?.backupStatus.missingPaths ?? []);
const backupSourceRoots = computed(() => currentSettings.value?.backupStatus.sourceRoots ?? []);
const backupRequiredPaths = computed(() => currentSettings.value?.backupStatus.requiredPathCount ?? 0);
const backupAvailablePaths = computed(() => currentSettings.value?.backupStatus.availablePathCount ?? 0);
const backupMessage = computed(() => {
    if (backupError.value)
        return backupError.value;
    if (backupResult.value)
        return `Backup erstellt: ${backupResult.value.targetRoot}`;
    return '';
});
const aiDatasetExportMessage = computed(() => {
    if (aiDatasetExportError.value)
        return aiDatasetExportError.value;
    if (aiDatasetExportResult.value) {
        return `Datensatz exportiert: ${aiDatasetExportResult.value.outputPath}`;
    }
    return '';
});
const videoDimensionBackfillMessage = computed(() => {
    if (videoDimensionBackfillError.value)
        return videoDimensionBackfillError.value;
    const run = videoDimensionBackfillRun.value;
    if (!run)
        return '';
    if (run.error)
        return run.error;
    if (!run.result)
        return `Lauf gestartet: ${run.status}`;
    const repaired = run.result.summary.repaired ?? 0;
    const wouldRepair = run.result.summary.would_repair ?? run.result.summary.wouldRepair ?? 0;
    return `Lauf ${run.status}: ${run.result.count} Videos geprüft, ${repaired} repariert, ${wouldRepair} würden repariert.`;
});
const terminologyStatusMessage = computed(() => {
    if (terminology.error)
        return terminology.error;
    if (terminology.lastSelectionCounts) {
        const total = Object.values(terminology.lastSelectionCounts).reduce((sum, count) => sum + Number(count || 0), 0);
        return `Terminologie aktiviert: ${total} Einträge geladen.`;
    }
    return '';
});
const isDirty = computed(() => {
    if (!currentSettings.value)
        return false;
    return ((currentSettings.value.centerId === null
        ? EMPTY_OPTION
        : String(currentSettings.value.centerId)) !== form.centerId ||
        (currentSettings.value.processorId === null
            ? EMPTY_OPTION
            : String(currentSettings.value.processorId)) !== form.processorId ||
        (currentSettings.value.annotatorName ?? EMPTY_OPTION) !== form.annotatorName ||
        (currentSettings.value.reportTemplateName ?? EMPTY_OPTION) !== form.reportTemplateName ||
        (currentSettings.value.aiDatasetName ?? EMPTY_OPTION) !== form.aiDatasetName ||
        (currentSettings.value.aiDatasetType ?? EMPTY_OPTION) !== form.aiDatasetType);
});
function applySettings(settings) {
    currentSettings.value = settings;
    form.centerId = settings.centerId === null ? EMPTY_OPTION : String(settings.centerId);
    form.processorId = settings.processorId === null ? EMPTY_OPTION : String(settings.processorId);
    form.annotatorName = settings.annotatorName ?? EMPTY_OPTION;
    form.reportTemplateName = settings.reportTemplateName ?? EMPTY_OPTION;
    form.aiDatasetName = settings.aiDatasetName ?? EMPTY_OPTION;
    form.aiDatasetType = settings.aiDatasetType ?? EMPTY_OPTION;
    form.aiDatasetId =
        dropdowns.aiDatasets
            .find((dataset) => dataset.value === form.aiDatasetName && dataset.datasetType === form.aiDatasetType)
            ?.id.toString() ?? EMPTY_OPTION;
}
function resetForm() {
    if (!currentSettings.value)
        return;
    applySettings(currentSettings.value);
}
function applySelectedAiDataset() {
    const selected = selectedAiDatasetOption.value;
    form.aiDatasetName = selected?.value ?? EMPTY_OPTION;
    form.aiDatasetType = selected?.datasetType ?? EMPTY_OPTION;
    aiDatasetExportResult.value = null;
    aiDatasetExportError.value = '';
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
        dropdowns.annotators = nextDropdowns.annotators;
        dropdowns.reportTemplates = nextDropdowns.reportTemplates;
        dropdowns.aiDatasets = nextDropdowns.aiDatasets;
        applySettings(settings);
        backupResult.value = null;
        backupError.value = '';
        aiDatasetExportResult.value = null;
        aiDatasetExportError.value = '';
        videoDimensionBackfillError.value = '';
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
async function loadTerminologyBundles() {
    try {
        await terminology.loadBundles();
        selectedTerminologyKey.value =
            terminology.activeBundleKey ||
                (terminology.filteredBundles[0] ? terminology.bundleKey(terminology.filteredBundles[0]) : '');
    }
    catch (error) {
        console.error('Failed to load terminology bundles:', error);
    }
}
function setMedicalField(value) {
    if (value === 'gastroenterology') {
        terminology.setMedicalField(value);
    }
}
async function activateTerminologyBundle() {
    const bundle = terminology.findBundleByKey(selectedTerminologyKey.value);
    if (!bundle)
        return;
    try {
        await terminology.selectBundle(bundle);
        selectedTerminologyKey.value = terminology.activeBundleKey;
        toast.success({ text: 'Terminologiepaket geladen.' });
    }
    catch (error) {
        console.error('Failed to activate terminology bundle:', error);
    }
}
async function saveSettings() {
    saving.value = true;
    applySelectedAiDataset();
    try {
        const updated = await updateApplicationSettings({
            centerId: form.centerId ? Number(form.centerId) : null,
            processorId: form.processorId ? Number(form.processorId) : null,
            annotatorName: form.annotatorName || null,
            reportTemplateName: form.reportTemplateName || null,
            aiDatasetName: form.aiDatasetName || null,
            aiDatasetType: form.aiDatasetType || null
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
async function runVideoDimensionBackfill() {
    videoDimensionBackfillInProgress.value = true;
    videoDimensionBackfillError.value = '';
    videoDimensionBackfillRun.value = null;
    const limit = String(videoDimensionBackfillLimit.value ?? '').trim();
    try {
        const result = await triggerApplicationVideoDimensionBackfill({
            dryRun: videoDimensionBackfillDryRun.value,
            limit: limit ? Number(limit) : null
        });
        videoDimensionBackfillRun.value = result;
        videoDimensionBackfillRun.value = await pollVideoDimensionBackfillRun(result);
        toast.success({ text: 'Video-Dimensionsprüfung gestartet.' });
    }
    catch (error) {
        videoDimensionBackfillError.value =
            error?.response?.data?.errors?.dryRun ||
                error?.response?.data?.errors?.dry_run ||
                error?.response?.data?.errors?.limit ||
                error?.response?.data?.detail ||
                'Video-Dimensionsprüfung konnte nicht gestartet werden.';
        console.error('Failed to run video dimension backfill:', error);
    }
    finally {
        videoDimensionBackfillInProgress.value = false;
    }
}
async function pollVideoDimensionBackfillRun(initialRun) {
    let run = initialRun;
    for (let attempt = 0; attempt < VIDEO_DIMENSION_BACKFILL_MAX_POLLS; attempt += 1) {
        if (run.status !== 'queued' && run.status !== 'running') {
            return run;
        }
        await new Promise((resolve) => window.setTimeout(resolve, VIDEO_DIMENSION_BACKFILL_POLL_INTERVAL_MS));
        run = await fetchApplicationVideoDimensionBackfillRun(run.runId);
        videoDimensionBackfillRun.value = run;
    }
    throw new Error('Video-Dimensionsprüfung läuft länger als erwartet.');
}
async function runBackup() {
    backupInProgress.value = true;
    backupError.value = '';
    backupResult.value = null;
    try {
        const result = await triggerApplicationBackup({
            targetPath: backupTargetPath.value.trim()
        });
        await loadSettings();
        backupResult.value = result;
        toast.success({ text: 'Backup erfolgreich erstellt.' });
    }
    catch (error) {
        backupError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.errors?.targetPath ||
                'Backup konnte nicht gestartet werden.';
        console.error('Failed to run application backup:', error);
    }
    finally {
        backupInProgress.value = false;
    }
}
async function runAiDatasetExport() {
    const selected = selectedAiDatasetOption.value;
    if (!selected)
        return;
    aiDatasetExportInProgress.value = true;
    aiDatasetExportError.value = '';
    aiDatasetExportResult.value = null;
    try {
        const result = await triggerApplicationAiDatasetExport({
            datasetId: selected.id,
            onlyValidated: true
        });
        aiDatasetExportResult.value = result;
        toast.success({ text: 'KI-Datensatz erfolgreich exportiert.' });
    }
    catch (error) {
        aiDatasetExportError.value =
            error?.response?.data?.errors?.aiDatasetName ||
                error?.response?.data?.errors?.aiDatasetType ||
                error?.response?.data?.detail ||
                'KI-Datensatz konnte nicht exportiert werden.';
        console.error('Failed to export AI dataset:', error);
    }
    finally {
        aiDatasetExportInProgress.value = false;
    }
}
function formatBytes(value) {
    if (!Number.isFinite(value) || value <= 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let amount = value;
    let unitIndex = 0;
    while (amount >= 1024 && unitIndex < units.length - 1) {
        amount /= 1024;
        unitIndex += 1;
    }
    return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
onMounted(() => {
    loadSettings();
    loadTerminologyBundles();
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
/** @type {__VLS_StyleScopedClasses['export-result']} */ ;
/** @type {__VLS_StyleScopedClasses['export-result']} */ ;
/** @type {__VLS_StyleScopedClasses['export-result']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-root-header']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-root']} */ ;
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
        value: (__VLS_ctx.form.annotatorName),
        ...{ class: "form-select" },
        'data-test': "annotator-select",
        disabled: (__VLS_ctx.saving),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.EMPTY_OPTION),
    });
    for (const [annotator] of __VLS_getVForSourceType((__VLS_ctx.dropdowns.annotators))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (annotator.value),
            value: (annotator.value),
        });
        (annotator.label);
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "settings-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.applySelectedAiDataset) },
        value: (__VLS_ctx.form.aiDatasetId),
        ...{ class: "form-select" },
        'data-test': "ai-dataset-select",
        disabled: (__VLS_ctx.saving),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.EMPTY_OPTION),
    });
    for (const [datasetOption] of __VLS_getVForSourceType((__VLS_ctx.dropdowns.aiDatasets))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (`${datasetOption.id}-${datasetOption.datasetType}`),
            value: (String(datasetOption.id)),
        });
        (datasetOption.label);
        (datasetOption.datasetType);
        (datasetOption.id);
    }
    if (__VLS_ctx.selectedAiDatasetDuplicateWarning) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-warning mt-1" },
        });
        (__VLS_ctx.selectedAiDatasetDuplicateWarning);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "settings-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.form.aiDatasetType),
        ...{ class: "form-select" },
        'data-test': "ai-dataset-type-select",
        disabled: (__VLS_ctx.saving || Boolean(__VLS_ctx.form.aiDatasetId)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.EMPTY_OPTION),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "image",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "video",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveSettings) },
        type: "button",
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
    'data-test': "summary-annotator",
});
(__VLS_ctx.selectedAnnotatorLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-report-template",
});
(__VLS_ctx.selectedReportTemplateLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-ai-dataset",
});
(__VLS_ctx.selectedAiDatasetLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-ai-dataset-type",
});
(__VLS_ctx.selectedAiDatasetTypeLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-medical-field",
});
(__VLS_ctx.terminology.medicalFieldLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({
    'data-test': "summary-terminology",
});
(__VLS_ctx.terminology.activeBundleLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "settings-card mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadTerminologyBundles) },
    type: "button",
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.terminology.loading || __VLS_ctx.terminology.selecting),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "settings-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setMedicalField($event.target.value);
        } },
    value: (__VLS_ctx.terminology.selectedMedicalField),
    ...{ class: "form-select" },
    'data-test': "medical-field-select",
    disabled: (__VLS_ctx.terminology.selecting),
});
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.terminology.medicalFieldOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (option.value),
        value: (option.value),
    });
    (option.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "settings-field mt-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedTerminologyKey),
    ...{ class: "form-select" },
    'data-test': "terminology-bundle-select",
    disabled: (__VLS_ctx.terminology.loading || __VLS_ctx.terminology.selecting || !__VLS_ctx.terminology.filteredBundles.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
(__VLS_ctx.terminology.loading
    ? 'Terminologiepakete werden geladen...'
    : __VLS_ctx.terminology.filteredBundles.length
        ? 'Terminologiepaket wählen'
        : 'Keine Pakete im Register');
for (const [bundle] of __VLS_getVForSourceType((__VLS_ctx.terminology.filteredBundles))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (__VLS_ctx.terminology.bundleKey(bundle)),
        value: (__VLS_ctx.terminology.bundleKey(bundle)),
    });
    (bundle.moduleName);
    (bundle.version);
    (bundle.isActive ? ' · aktiv' : '');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-summary terminology-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.terminology.activeBundleLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.terminology.registryPath || 'Nicht gesetzt');
if (__VLS_ctx.terminologyStatusMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info mb-0" },
        role: "alert",
    });
    (__VLS_ctx.terminologyStatusMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.activateTerminologyBundle) },
    type: "button",
    ...{ class: "btn btn-primary mt-3" },
    'data-test': "activate-terminology-bundle",
    disabled: (__VLS_ctx.terminology.selecting || !__VLS_ctx.selectedTerminologyKey),
});
(__VLS_ctx.terminology.selecting ? 'Terminologie wird geladen…' : 'Terminologie laden');
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "settings-card mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "settings-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
    ...{ class: "form-control" },
    'data-test': "video-dimension-backfill-limit",
    disabled: (__VLS_ctx.videoDimensionBackfillInProgress),
    placeholder: "Alle Videos",
});
(__VLS_ctx.videoDimensionBackfillLimit);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-check mt-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    ...{ class: "form-check-input" },
    'data-test': "video-dimension-backfill-dry-run",
    disabled: (__VLS_ctx.videoDimensionBackfillInProgress),
});
(__VLS_ctx.videoDimensionBackfillDryRun);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "form-check-label" },
});
if (__VLS_ctx.videoDimensionBackfillMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info mt-3 mb-0" },
        role: "alert",
    });
    (__VLS_ctx.videoDimensionBackfillMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.runVideoDimensionBackfill) },
    type: "button",
    ...{ class: "btn btn-warning mt-3" },
    'data-test': "run-video-dimension-backfill",
    disabled: (__VLS_ctx.videoDimensionBackfillInProgress),
});
(__VLS_ctx.videoDimensionBackfillInProgress
    ? 'Dimensionen werden geprüft…'
    : 'Video-Dimensionsprüfung starten');
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "settings-card mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedAiDatasetLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedAiDatasetTypeLabel);
if (__VLS_ctx.aiDatasetExportMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info mb-0" },
        role: "alert",
    });
    (__VLS_ctx.aiDatasetExportMessage);
}
if (__VLS_ctx.aiDatasetExportResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({
        ...{ class: "export-result" },
        'data-test': "ai-dataset-export-result",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.aiDatasetExportResult.sha256 || 'Nicht verfügbar');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatBytes(__VLS_ctx.aiDatasetExportResult.byteSize));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    ((__VLS_ctx.aiDatasetExportResult.summary.imageAnnotationCount ?? 0) +
        (__VLS_ctx.aiDatasetExportResult.summary.videoAnnotationCount ?? 0));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.runAiDatasetExport) },
    type: "button",
    ...{ class: "btn btn-primary mt-3" },
    'data-test': "run-ai-dataset-export",
    disabled: (__VLS_ctx.aiDatasetExportInProgress || !__VLS_ctx.selectedAiDatasetOption),
});
(__VLS_ctx.aiDatasetExportInProgress ? 'Export läuft…' : 'KI-Datensatz exportieren');
if (__VLS_ctx.aiDatasetExportResult?.downloadUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: "btn btn-outline-primary mt-3 ms-2" },
        'data-test': "download-ai-dataset-export",
        href: (__VLS_ctx.aiDatasetExportResult.downloadUrl),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "settings-card mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "backup-chip" },
    ...{ class: ({ 'backup-chip-ready': __VLS_ctx.backupReady, 'backup-chip-blocked': !__VLS_ctx.backupReady }) },
});
(__VLS_ctx.backupReady ? 'Backup bereit' : 'Pfadprüfung fehlgeschlagen');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.backupAvailablePaths);
(__VLS_ctx.backupRequiredPaths);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.backupSourceRoots.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "backup-roots" },
});
for (const [root] of __VLS_getVForSourceType((__VLS_ctx.backupSourceRoots))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (root.path),
        ...{ class: "backup-root" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "backup-root-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (root.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "backup-root-count" },
    });
    (root.fileCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
    (root.path);
}
if (__VLS_ctx.backupMissingPaths.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning mt-3 mb-0" },
        role: "alert",
    });
    (__VLS_ctx.backupMissingPaths.join(', '));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.runBackup) },
    ...{ class: "backup-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "settings-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.backupTargetPath),
    type: "text",
    ...{ class: "form-control" },
    'data-test': "backup-target-path",
    disabled: (__VLS_ctx.backupInProgress),
    placeholder: "/mnt/external-drive",
});
if (__VLS_ctx.backupMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info mb-0" },
        role: "alert",
    });
    (__VLS_ctx.backupMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.runBackup) },
    type: "button",
    ...{ class: "btn btn-dark" },
    'data-test': "run-backup",
    disabled: (__VLS_ctx.backupInProgress || !__VLS_ctx.backupReady || !__VLS_ctx.backupTargetPath.trim()),
});
(__VLS_ctx.backupInProgress ? 'Backup läuft…' : 'Backup auf Laufwerk starten');
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
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
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
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['terminology-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['export-result']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-row']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-chip-ready']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-chip-blocked']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-roots']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-root']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-root-header']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-root-count']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['backup-form']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-dark']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            EMPTY_OPTION: EMPTY_OPTION,
            terminology: terminology,
            loading: loading,
            saving: saving,
            errorMessage: errorMessage,
            backupInProgress: backupInProgress,
            backupTargetPath: backupTargetPath,
            aiDatasetExportInProgress: aiDatasetExportInProgress,
            aiDatasetExportResult: aiDatasetExportResult,
            videoDimensionBackfillInProgress: videoDimensionBackfillInProgress,
            videoDimensionBackfillDryRun: videoDimensionBackfillDryRun,
            videoDimensionBackfillLimit: videoDimensionBackfillLimit,
            selectedTerminologyKey: selectedTerminologyKey,
            dropdowns: dropdowns,
            form: form,
            updatedAtLabel: updatedAtLabel,
            selectedCenterLabel: selectedCenterLabel,
            selectedProcessorLabel: selectedProcessorLabel,
            selectedAnnotatorLabel: selectedAnnotatorLabel,
            selectedReportTemplateLabel: selectedReportTemplateLabel,
            selectedAiDatasetOption: selectedAiDatasetOption,
            selectedAiDatasetLabel: selectedAiDatasetLabel,
            selectedAiDatasetTypeLabel: selectedAiDatasetTypeLabel,
            selectedAiDatasetDuplicateWarning: selectedAiDatasetDuplicateWarning,
            backupReady: backupReady,
            backupMissingPaths: backupMissingPaths,
            backupSourceRoots: backupSourceRoots,
            backupRequiredPaths: backupRequiredPaths,
            backupAvailablePaths: backupAvailablePaths,
            backupMessage: backupMessage,
            aiDatasetExportMessage: aiDatasetExportMessage,
            videoDimensionBackfillMessage: videoDimensionBackfillMessage,
            terminologyStatusMessage: terminologyStatusMessage,
            isDirty: isDirty,
            resetForm: resetForm,
            applySelectedAiDataset: applySelectedAiDataset,
            loadSettings: loadSettings,
            loadTerminologyBundles: loadTerminologyBundles,
            setMedicalField: setMedicalField,
            activateTerminologyBundle: activateTerminologyBundle,
            saveSettings: saveSettings,
            runVideoDimensionBackfill: runVideoDimensionBackfill,
            runBackup: runBackup,
            runAiDatasetExport: runAiDatasetExport,
            formatBytes: formatBytes,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
