import { computed, onMounted, ref, watch } from 'vue';
import { v7 as uuidv7 } from 'uuid';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
import { useAnnotationQueueStore } from '@/stores/annotationQueue';
import { useAuthKcStore } from '@/stores/auth_kc';
const queueStore = useAnnotationQueueStore();
const authStore = useAuthKcStore();
const isLoadingTask = ref(false);
const isSubmitting = ref(false);
const currentTask = ref(null);
const selectedLabelIds = ref([]);
const errorMessage = ref(null);
const isLoadingLabelGroups = ref(false);
const labelGroupLoadError = ref(null);
const labelGroupOptions = ref([]);
const selectedLabelGroupId = computed({
    get: () => queueStore.selectedLabelGroupId ?? '',
    set: (value) => queueStore.setSelectedLabelGroupId(value.trim() || null)
});
const taskMode = computed({
    get: () => queueStore.taskMode,
    set: (value) => queueStore.setTaskMode(value === 'filtered' ? 'filtered' : 'random')
});
const targetLabelName = computed({
    get: () => queueStore.targetLabelName,
    set: (value) => queueStore.setTargetLabelName(value)
});
const filterLabelName = computed({
    get: () => queueStore.filterLabelName ?? '',
    set: (value) => queueStore.setFilterLabelName(value.trim() || null)
});
const allowRandomFallback = computed({
    get: () => queueStore.allowRandomFallback,
    set: (value) => queueStore.setAllowRandomFallback(value)
});
const informationSource = computed({
    get: () => queueStore.informationSource,
    set: (value) => queueStore.setInformationSource(value)
});
const annotationLabelOptions = computed(() => currentTask.value?.data.labelOptions ?? []);
const manualAnnotationState = computed(() => Object.fromEntries((currentTask.value?.data.manualAnnotations ?? []).map((annotation) => [
    annotation.labelId,
    annotation
])));
const predictionAnnotationState = computed(() => Object.fromEntries((currentTask.value?.data.predictionAnnotations ?? []).map((annotation) => [
    annotation.labelId,
    annotation
])));
function syncSelectedLabelsFromTask(task) {
    if (!task) {
        selectedLabelIds.value = [];
        return;
    }
    const manualSelected = (task.data.manualAnnotations ?? [])
        .filter((annotation) => annotation.value)
        .map((annotation) => annotation.labelId);
    if (manualSelected.length > 0) {
        selectedLabelIds.value = [...new Set(manualSelected)];
        return;
    }
    selectedLabelIds.value = [...new Set(task.data.suggestedLabelIds ?? [])];
}
function clearSelectedLabels() {
    selectedLabelIds.value = [];
}
function applySuggestedLabels() {
    selectedLabelIds.value = [...new Set(currentTask.value?.data.suggestedLabelIds ?? [])];
}
function formatConfidence(value) {
    if (typeof value !== 'number' || Number.isNaN(value))
        return '';
    return `${Math.round(value * 100)}%`;
}
function getAnnotatorPrincipal() {
    const rawUser = authStore.user;
    const sub = typeof rawUser?.sub === 'string'
        ? rawUser.sub.trim()
        : typeof rawUser?.oidcSub === 'string'
            ? rawUser.oidcSub.trim()
            : '';
    if (sub)
        return `oidc:${sub}`;
    const username = typeof authStore.user?.username === 'string'
        ? authStore.user.username.trim()
        : '';
    if (username)
        return username;
    return 'unknown';
}
function extractListPayload(payload) {
    if (Array.isArray(payload)) {
        return payload.filter((item) => !!item && typeof item === 'object');
    }
    if (!payload || typeof payload !== 'object')
        return [];
    const obj = payload;
    if (Array.isArray(obj.results)) {
        return obj.results.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.labels)) {
        return obj.labels.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.groups)) {
        return obj.groups.filter((item) => !!item && typeof item === 'object');
    }
    return [];
}
function parseGroupOption(raw) {
    const nestedLabelGroup = raw.labelGroup && typeof raw.labelGroup === 'object'
        ? raw.labelGroup
        : raw.label_group && typeof raw.label_group === 'object'
            ? raw.label_group
            : null;
    const groupIdRaw = raw.labelGroupId ??
        raw.label_group_id ??
        raw.groupId ??
        raw.group_id ??
        nestedLabelGroup?.id ??
        raw.id;
    if (groupIdRaw === null ||
        groupIdRaw === undefined ||
        (typeof groupIdRaw !== 'string' && typeof groupIdRaw !== 'number')) {
        return null;
    }
    const id = String(groupIdRaw).trim();
    if (!id)
        return null;
    const nameRaw = raw.labelGroupName ??
        raw.label_group_name ??
        raw.groupName ??
        raw.group_name ??
        nestedLabelGroup?.name ??
        raw.name;
    const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : `Group ${id}`;
    return { id, name };
}
async function loadLabelGroups() {
    isLoadingLabelGroups.value = true;
    labelGroupLoadError.value = null;
    try {
        const res = await axiosInstance.get(r(endpoints.media.videoLabelsList));
        const rows = extractListPayload(res.data);
        const byId = new Map();
        for (const row of rows) {
            const parsed = parseGroupOption(row);
            if (!parsed)
                continue;
            if (!byId.has(parsed.id)) {
                byId.set(parsed.id, parsed);
            }
        }
        labelGroupOptions.value = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
        if (!selectedLabelGroupId.value && labelGroupOptions.value.length > 0) {
            selectedLabelGroupId.value = labelGroupOptions.value[0].id;
        }
    }
    catch (error) {
        labelGroupOptions.value = [];
        labelGroupLoadError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to load label groups.';
    }
    finally {
        isLoadingLabelGroups.value = false;
    }
}
async function loadNextTask() {
    if (!queueStore.selectedLabelGroupId) {
        currentTask.value = null;
        return;
    }
    isLoadingTask.value = true;
    errorMessage.value = null;
    try {
        if (!queueStore.taskQueue.length) {
            await queueStore.fetchBatch(10);
        }
        currentTask.value = queueStore.popNextTask() ?? null;
        syncSelectedLabelsFromTask(currentTask.value);
    }
    finally {
        isLoadingTask.value = false;
    }
}
async function submitLabels() {
    if (!currentTask.value)
        return;
    isSubmitting.value = true;
    errorMessage.value = null;
    const task = currentTask.value;
    const labelOptions = task.data.labelOptions ?? [];
    if (labelOptions.length === 0) {
        errorMessage.value = 'No labels are available for this frame.';
        isSubmitting.value = false;
        return;
    }
    const selectedSet = new Set(selectedLabelIds.value);
    try {
        await axiosInstance.post(r(endpoints.annotation.bulkUpsert), labelOptions.map((label) => {
            const existingManual = (task.data.manualAnnotations ?? []).find((annotation) => annotation.labelId === label.id);
            return {
                frameId: task.data.frameId,
                labelId: label.id,
                value: selectedSet.has(label.id),
                floatValue: null,
                informationSourceName: informationSource.value,
                annotator: getAnnotatorPrincipal(),
                externalAnnotationId: existingManual?.externalAnnotationId ||
                    (task.data.existingExternalId && task.data.existingExternalId.trim()
                        ? `${task.data.existingExternalId}:${label.id}`
                        : uuidv7()),
                modelMetaId: null
            };
        }));
        await loadNextTask();
    }
    catch (error) {
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to submit annotation.';
    }
    finally {
        isSubmitting.value = false;
    }
}
async function skipTask() {
    if (!currentTask.value)
        return;
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
        await axiosInstance.post(r(endpoints.annotation.skip), {
            frameId: currentTask.value.data.frameId,
            annotator: getAnnotatorPrincipal()
        });
        await loadNextTask();
    }
    catch (error) {
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to skip task.';
    }
    finally {
        isSubmitting.value = false;
    }
}
watch(() => currentTask.value?.id, () => {
    syncSelectedLabelsFromTask(currentTask.value);
});
watch(() => [queueStore.selectedLabelGroupId, queueStore.taskQuerySignature], async () => {
    queueStore.clearQueue();
    await loadNextTask();
});
onMounted(async () => {
    await loadLabelGroups();
    await loadNextTask();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-muted mb-3" },
});
if (__VLS_ctx.queueStore.aiDatasetName && __VLS_ctx.queueStore.aiDatasetType) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-primary mb-0" },
    });
    (__VLS_ctx.queueStore.aiDatasetName);
    (__VLS_ctx.queueStore.aiDatasetType);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "label-group-id",
    ...{ class: "form-label" },
});
if (__VLS_ctx.labelGroupOptions.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: "label-group-id",
        value: (__VLS_ctx.selectedLabelGroupId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.labelGroupOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (group.id),
            value: (group.id),
        });
        (group.name);
        (group.id);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "label-group-id",
        value: (__VLS_ctx.selectedLabelGroupId),
        type: "text",
        ...{ class: "form-control" },
        placeholder: "e.g. 1",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex align-items-center gap-2 mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadLabelGroups) },
    ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
    disabled: (__VLS_ctx.isLoadingLabelGroups),
});
(__VLS_ctx.isLoadingLabelGroups ? 'Loading groups...' : 'Reload Groups');
if (__VLS_ctx.labelGroupOptions.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.labelGroupOptions.length);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
}
if (__VLS_ctx.labelGroupLoadError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-danger d-block mt-1" },
    });
    (__VLS_ctx.labelGroupLoadError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "task-mode",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "task-mode",
    value: (__VLS_ctx.taskMode),
    ...{ class: "form-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "random",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "filtered",
});
if (__VLS_ctx.taskMode === 'random') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted d-block mt-1" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "target-label-name",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    id: "target-label-name",
    value: (__VLS_ctx.targetLabelName),
    type: "text",
    ...{ class: "form-control" },
    placeholder: "z. B. Polyp",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "information-source",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    id: "information-source",
    value: (__VLS_ctx.informationSource),
    type: "text",
    ...{ class: "form-control" },
    placeholder: "e.g. frame_annotation_frontend",
    list: "information-source-options",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.datalist, __VLS_intrinsicElements.datalist)({
    id: "information-source-options",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "frame_annotation_frontend",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "human_annotation",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "model_prediction",
});
if (__VLS_ctx.taskMode === 'filtered') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-6 col-lg-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "filter-label-name",
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "filter-label-name",
        value: (__VLS_ctx.filterLabelName),
        type: "text",
        ...{ class: "form-control" },
        placeholder: "z. B. Blut",
    });
}
if (__VLS_ctx.taskMode === 'filtered') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-6 col-lg-4 d-flex align-items-end" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "random-fallback",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.allowRandomFallback);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "random-fallback",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-xl-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card frame-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.isLoadingTask) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else if (!__VLS_ctx.queueStore.selectedLabelGroupId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else if (!__VLS_ctx.currentTask) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "task-meta mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-light text-dark me-2" },
    });
    (__VLS_ctx.currentTask.data.frameId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-light text-dark" },
    });
    (__VLS_ctx.currentTask.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.currentTask.data.imageUrl),
        ...{ class: "img-fluid rounded border" },
        alt: "Frame to annotate",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.applySuggestedLabels) },
        ...{ class: "btn btn-outline-primary btn-sm mb-0" },
        disabled: (__VLS_ctx.isSubmitting),
    });
    if (__VLS_ctx.annotationLabelOptions.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "label-grid" },
        });
        for (const [label] of __VLS_getVForSourceType((__VLS_ctx.annotationLabelOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (label.id),
                ...{ class: "label-option border rounded p-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-check mb-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                id: (`frame-label-${label.id}`),
                ...{ class: "form-check-input" },
                type: "checkbox",
                value: (label.id),
            });
            (__VLS_ctx.selectedLabelIds);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "form-check-label" },
            });
            (label.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex gap-1 flex-wrap" },
            });
            if (__VLS_ctx.manualAnnotationState[label.id]?.value) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-success-subtle text-success-emphasis" },
                });
            }
            else if (__VLS_ctx.manualAnnotationState[label.id]) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-secondary-subtle text-secondary-emphasis" },
                });
            }
            if (__VLS_ctx.predictionAnnotationState[label.id]?.value) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-info-subtle text-info-emphasis" },
                });
                if (__VLS_ctx.predictionAnnotationState[label.id]?.floatValue !== null) {
                    (__VLS_ctx.formatConfidence(__VLS_ctx.predictionAnnotationState[label.id]?.floatValue));
                }
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 d-flex gap-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitLabels) },
        ...{ class: "btn btn-success" },
        disabled: (__VLS_ctx.isSubmitting),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSelectedLabels) },
        ...{ class: "btn btn-outline-secondary" },
        disabled: (__VLS_ctx.isSubmitting),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.skipTask) },
        ...{ class: "btn btn-outline-warning" },
        disabled: (__VLS_ctx.isSubmitting),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger mb-0" },
        role: "alert",
    });
    (__VLS_ctx.errorMessage);
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-8']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['task-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['label-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['label-option']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-secondary-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-info-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            queueStore: queueStore,
            isLoadingTask: isLoadingTask,
            isSubmitting: isSubmitting,
            currentTask: currentTask,
            selectedLabelIds: selectedLabelIds,
            errorMessage: errorMessage,
            isLoadingLabelGroups: isLoadingLabelGroups,
            labelGroupLoadError: labelGroupLoadError,
            labelGroupOptions: labelGroupOptions,
            selectedLabelGroupId: selectedLabelGroupId,
            taskMode: taskMode,
            targetLabelName: targetLabelName,
            filterLabelName: filterLabelName,
            allowRandomFallback: allowRandomFallback,
            informationSource: informationSource,
            annotationLabelOptions: annotationLabelOptions,
            manualAnnotationState: manualAnnotationState,
            predictionAnnotationState: predictionAnnotationState,
            clearSelectedLabels: clearSelectedLabels,
            applySuggestedLabels: applySuggestedLabels,
            formatConfidence: formatConfidence,
            loadLabelGroups: loadLabelGroups,
            submitLabels: submitLabels,
            skipTask: skipTask,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
