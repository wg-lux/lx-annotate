import { fetchAiDatasetFrameBucketDistribution, fetchAiDatasetLabelSets, fetchAiDatasetOptions } from '@/api/aiDatasetApi';
import { computed, onMounted, ref, watch } from 'vue';
const datasetOptions = ref([]);
const labelSetOptions = ref([]);
const selectedDatasetId = ref('');
const selectedLabelGroupId = ref('');
const selectedTargetLabelId = ref('');
const predictionSegmentsOnly = ref(true);
const distribution = ref(null);
const loadingOptions = ref(true);
const loadingDistribution = ref(false);
const errorMessage = ref('');
const selectedDataset = computed(() => datasetOptions.value.find((dataset) => String(dataset.id) === selectedDatasetId.value));
const selectedDatasetLabel = computed(() => {
    const dataset = selectedDataset.value;
    if (!dataset)
        return 'Kein Datensatz ausgewählt';
    return `${dataset.label} (ID ${dataset.id})`;
});
const selectedLabelSet = computed(() => labelSetOptions.value.find((group) => String(group.id) === selectedLabelGroupId.value));
const targetLabelOptions = computed(() => {
    if (selectedLabelSet.value)
        return selectedLabelSet.value.labels;
    const byId = new Map();
    for (const group of labelSetOptions.value) {
        for (const label of group.labels) {
            byId.set(label.id, label);
        }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
});
const normalizedTargetBuckets = computed(() => {
    const buckets = new Map(distribution.value?.targetBuckets.map((bucket) => [bucket.bucket, bucket.frameCount]) ?? []);
    return ['positive', 'negative', 'unknown'].map((bucket) => ({
        bucket,
        frameCount: buckets.get(bucket) ?? 0
    }));
});
const targetBucketMax = computed(() => Math.max(1, ...normalizedTargetBuckets.value.map((bucket) => bucket.frameCount)));
const targetBucketSubtitle = computed(() => {
    if (!distribution.value?.targetLabelName) {
        return 'Wählen Sie ein Ziel-Label, um positive, negative und unbekannte Frames zu sehen.';
    }
    return `Ziel-Label: ${distribution.value.targetLabelName}`;
});
function bucketMap(items) {
    return new Map(items.map((item) => [item.labelId, item]));
}
const mergedRows = computed(() => {
    if (!distribution.value)
        return [];
    const annotationByLabel = bucketMap(distribution.value.annotationFrameBuckets);
    const segmentByLabel = bucketMap(distribution.value.segmentFrameBuckets);
    const mergedByLabel = bucketMap(distribution.value.mergedFrameBuckets);
    const labelDistributionByLabel = new Map(distribution.value.labelDistribution.map((entry) => [entry.labelId, entry]));
    const labelIds = new Set([
        ...annotationByLabel.keys(),
        ...segmentByLabel.keys(),
        ...mergedByLabel.keys(),
        ...labelDistributionByLabel.keys()
    ]);
    return [...labelIds]
        .map((labelId) => {
        const merged = mergedByLabel.get(labelId);
        const annotation = annotationByLabel.get(labelId);
        const segment = segmentByLabel.get(labelId);
        const labelDistribution = labelDistributionByLabel.get(labelId);
        return {
            labelId,
            labelName: merged?.labelName ||
                annotation?.labelName ||
                segment?.labelName ||
                labelDistribution?.labelName ||
                `Label ${labelId}`,
            mergedFrames: merged?.frameCount ?? 0,
            annotationFrames: annotation?.frameCount ?? 0,
            segmentFrames: segment?.frameCount ?? 0,
            framePositive: labelDistribution?.framePositive ?? 0,
            frameNegative: labelDistribution?.frameNegative ?? 0,
            segmentCount: labelDistribution?.segmentCount ?? 0
        };
    })
        .sort((a, b) => b.mergedFrames - a.mergedFrames || a.labelName.localeCompare(b.labelName));
});
const mergedFrameMax = computed(() => Math.max(1, ...mergedRows.value.map((row) => row.mergedFrames)));
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
            const activeDataset = datasets.find((dataset) => dataset.isActive) ?? datasets[0];
            selectedDatasetId.value = activeDataset ? String(activeDataset.id) : '';
        }
    }
    catch (error) {
        console.error('Failed to load AI dataset distribution options:', error);
        errorMessage.value = 'Die Datensatz- oder Label-Optionen konnten nicht geladen werden.';
    }
    finally {
        loadingOptions.value = false;
    }
}
async function loadDistribution() {
    if (!selectedDatasetId.value) {
        distribution.value = null;
        return;
    }
    loadingDistribution.value = true;
    errorMessage.value = '';
    try {
        distribution.value = await fetchAiDatasetFrameBucketDistribution(selectedDatasetId.value, {
            labelGroupId: selectedLabelGroupId.value || null,
            targetLabelId: selectedTargetLabelId.value || null,
            predictionSegmentsOnly: predictionSegmentsOnly.value
        });
    }
    catch (error) {
        console.error('Failed to load AI dataset frame bucket distribution:', error);
        distribution.value = null;
        errorMessage.value = 'Die Bucket-Verteilung konnte nicht geladen werden.';
    }
    finally {
        loadingDistribution.value = false;
    }
}
function bucketLabel(bucket) {
    if (bucket === 'positive')
        return 'Positiv';
    if (bucket === 'negative')
        return 'Negativ';
    return 'Unbekannt';
}
function datasetTypeLabel(datasetType) {
    if (datasetType === 'image')
        return 'Bild';
    if (datasetType === 'video')
        return 'Video';
    return datasetType;
}
function aiModelTypeLabel(aiModelType) {
    if (aiModelType === 'image_multilabel_classification')
        return 'Bild-Multilabel-Klassifikation';
    if (aiModelType === 'video_segment_classification')
        return 'Video-Segmentklassifikation';
    return aiModelType;
}
function bucketWidth(value, maxValue) {
    const ratio = maxValue > 0 ? value / maxValue : 0;
    return `${Math.max(0, Math.min(100, ratio * 100))}%`;
}
function formatNumber(value) {
    return new Intl.NumberFormat('de-DE').format(value);
}
function formatDate(value) {
    return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}
watch(selectedLabelGroupId, () => {
    if (selectedTargetLabelId.value &&
        !targetLabelOptions.value.some((label) => String(label.id) === selectedTargetLabelId.value)) {
        selectedTargetLabelId.value = '';
    }
});
watch([selectedDatasetId, selectedLabelGroupId, selectedTargetLabelId, predictionSegmentsOnly], () => {
    void loadDistribution();
});
onMounted(async () => {
    await loadOptions();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-meter']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-meter']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-row']} */ ;
/** @type {__VLS_StyleScopedClasses['scope-list']} */ ;
/** @type {__VLS_StyleScopedClasses['scope-list']} */ ;
/** @type {__VLS_StyleScopedClasses['scope-list']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['content-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-meter']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dataset-buckets-page container-fluid py-4 px-3 px-lg-4" },
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
    ...{ onClick: (__VLS_ctx.loadDistribution) },
    type: "button",
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loadingDistribution || !__VLS_ctx.selectedDatasetId),
    'data-test': "reload-distribution",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "controls-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "controls-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedDatasetId),
    ...{ class: "form-select" },
    'data-test': "dataset-select",
    disabled: (__VLS_ctx.loadingOptions),
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
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedLabelGroupId),
    ...{ class: "form-select" },
    'data-test': "label-group-select",
    disabled: (__VLS_ctx.loadingOptions),
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
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "field-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedTargetLabelId),
    ...{ class: "form-select" },
    'data-test': "target-label-select",
    disabled: (__VLS_ctx.targetLabelOptions.length === 0),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [label] of __VLS_getVForSourceType((__VLS_ctx.targetLabelOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (label.id),
        value: (String(label.id)),
    });
    (label.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "check-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-check-input" },
    type: "checkbox",
    'data-test': "prediction-segments-only",
});
(__VLS_ctx.predictionSegmentsOnly);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning mb-0" },
        role: "alert",
    });
    (__VLS_ctx.errorMessage);
}
if (__VLS_ctx.loadingDistribution) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "loading-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "skeleton-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "skeleton-line skeleton-short" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "skeleton-line" },
    });
}
else if (__VLS_ctx.distribution) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "summary-grid" },
        'aria-label': "Zusammenfassung der Datensatz-Frame-Buckets",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
        'data-test': "summary-merged-frames",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.distribution.summary.mergedFrameCount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.distribution.summary.annotationFrameCount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.distribution.summary.segmentFrameCount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.distribution.summary.labelCount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "distribution-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.targetBucketSubtitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bucket-list" },
        'data-test': "target-buckets",
    });
    for (const [bucket] of __VLS_getVForSourceType((__VLS_ctx.normalizedTargetBuckets))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (bucket.bucket),
            ...{ class: "bucket-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bucket-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "bucket-dot" },
            ...{ class: (`bucket-${bucket.bucket}`) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.bucketLabel(bucket.bucket));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bucket-meter" },
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ style: ({ width: __VLS_ctx.bucketWidth(bucket.frameCount, __VLS_ctx.targetBucketMax) }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatNumber(bucket.frameCount));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "distribution-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.selectedDatasetLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({
        ...{ class: "scope-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.datasetTypeLabel(__VLS_ctx.distribution.datasetType));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.aiModelTypeLabel(__VLS_ctx.distribution.aiModelType));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.distribution.summary.videoCount));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatDate(__VLS_ctx.distribution.updatedAt));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "distribution-panel table-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    if (__VLS_ctx.mergedRows.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-responsive" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "bucket-table" },
            'data-test': "label-bucket-table",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [row] of __VLS_getVForSourceType((__VLS_ctx.mergedRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (row.labelId),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label-name" },
            });
            (row.labelName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "inline-meter" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ style: ({ width: __VLS_ctx.bucketWidth(row.mergedFrames, __VLS_ctx.mergedFrameMax) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.formatNumber(row.mergedFrames));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatNumber(row.annotationFrames));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatNumber(row.segmentFrames));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatNumber(row.framePositive));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatNumber(row.frameNegative));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatNumber(row.segmentCount));
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "empty-state" },
    });
}
/** @type {__VLS_StyleScopedClasses['dataset-buckets-page']} */ ;
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
/** @type {__VLS_StyleScopedClasses['controls-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['field-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['check-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-short']} */ ;
/** @type {__VLS_StyleScopedClasses['skeleton-line']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['content-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-list']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-label']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-meter']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['scope-list']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['bucket-table']} */ ;
/** @type {__VLS_StyleScopedClasses['label-name']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-meter']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            datasetOptions: datasetOptions,
            labelSetOptions: labelSetOptions,
            selectedDatasetId: selectedDatasetId,
            selectedLabelGroupId: selectedLabelGroupId,
            selectedTargetLabelId: selectedTargetLabelId,
            predictionSegmentsOnly: predictionSegmentsOnly,
            distribution: distribution,
            loadingOptions: loadingOptions,
            loadingDistribution: loadingDistribution,
            errorMessage: errorMessage,
            selectedDatasetLabel: selectedDatasetLabel,
            targetLabelOptions: targetLabelOptions,
            normalizedTargetBuckets: normalizedTargetBuckets,
            targetBucketMax: targetBucketMax,
            targetBucketSubtitle: targetBucketSubtitle,
            mergedRows: mergedRows,
            mergedFrameMax: mergedFrameMax,
            loadDistribution: loadDistribution,
            bucketLabel: bucketLabel,
            datasetTypeLabel: datasetTypeLabel,
            aiModelTypeLabel: aiModelTypeLabel,
            bucketWidth: bucketWidth,
            formatNumber: formatNumber,
            formatDate: formatDate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
