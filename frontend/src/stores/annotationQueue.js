import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { fetchApplicationSettings } from '@/api/applicationSettingsApi';
import { endpoints } from '@/types/api/endpoints';
const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1';
const TASK_MODE_STORAGE_KEY = 'annotationQueue.taskMode.v1';
const TARGET_LABEL_STORAGE_KEY = 'annotationQueue.targetLabelName.v1';
const FILTER_LABEL_STORAGE_KEY = 'annotationQueue.filterLabelName.v1';
const RANDOM_FALLBACK_STORAGE_KEY = 'annotationQueue.allowRandomFallback.v1';
const INFORMATION_SOURCE_STORAGE_KEY = 'annotationQueue.informationSource.v1';
const SAMPLING_STRATEGY_STORAGE_KEY = 'annotationQueue.samplingStrategy.v1';
const PREDICTION_SEGMENTS_ONLY_STORAGE_KEY = 'annotationQueue.predictionSegmentsOnly.v1';
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task';
const DEBUG_DUMMY_TASK_GROUP_ID = '1';
const DEFAULT_TARGET_LABEL_NAME = 'Target Label';
const DEFAULT_INFORMATION_SOURCE = 'frame_annotation_frontend';
const DEFAULT_SAMPLING_STRATEGY = 'balanced';
function loadStoredGroupId() {
    try {
        const raw = localStorage.getItem(SELECTED_GROUP_STORAGE_KEY);
        return raw && raw.trim() ? raw : null;
    }
    catch {
        return null;
    }
}
function persistGroupId(groupId) {
    try {
        if (groupId) {
            localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, groupId);
        }
        else {
            localStorage.removeItem(SELECTED_GROUP_STORAGE_KEY);
        }
    }
    catch {
        // Persistence failure should not block annotation flow.
    }
}
function loadStoredText(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw && raw.trim() ? raw.trim() : null;
    }
    catch {
        return null;
    }
}
function persistText(key, value) {
    try {
        if (value) {
            localStorage.setItem(key, value);
        }
        else {
            localStorage.removeItem(key);
        }
    }
    catch {
        // Persistence failure should not block annotation flow.
    }
}
function loadStoredTaskMode() {
    const raw = loadStoredText(TASK_MODE_STORAGE_KEY);
    return raw === 'filtered' ? 'filtered' : 'random';
}
function normalizeSamplingStrategy(value) {
    if (value === 'segments' || value === 'annotations' || value === 'none')
        return value;
    return DEFAULT_SAMPLING_STRATEGY;
}
function loadStoredSamplingStrategy() {
    return normalizeSamplingStrategy(loadStoredText(SAMPLING_STRATEGY_STORAGE_KEY));
}
function normalizeLabelName(value) {
    const normalized = value?.trim() ?? '';
    return normalized || DEFAULT_TARGET_LABEL_NAME;
}
function loadStoredRandomFallback() {
    try {
        const raw = localStorage.getItem(RANDOM_FALLBACK_STORAGE_KEY);
        if (raw === null)
            return true;
        return raw === '1' || raw.toLowerCase() === 'true';
    }
    catch {
        return true;
    }
}
function loadStoredPredictionSegmentsOnly() {
    try {
        const raw = localStorage.getItem(PREDICTION_SEGMENTS_ONLY_STORAGE_KEY);
        if (raw === null)
            return true;
        return raw === '1' || raw.toLowerCase() === 'true';
    }
    catch {
        return true;
    }
}
function persistBoolean(key, value) {
    try {
        localStorage.setItem(key, value ? '1' : '0');
    }
    catch {
        // Persistence failure should not block annotation flow.
    }
}
function isDummyTaskModeEnabled() {
    if (!import.meta.env.DEV)
        return false;
    if (typeof window === 'undefined')
        return false;
    const query = new URLSearchParams(window.location.search);
    const raw = query.get(DEBUG_DUMMY_TASK_QUERY_KEY);
    return raw === '1' || raw === 'true';
}
function createDummyTask(groupId) {
    const activeGroupId = groupId && groupId.trim() ? groupId : DEBUG_DUMMY_TASK_GROUP_ID;
    return {
        id: `dummy-task-${activeGroupId}`,
        data: {
            frameId: 999,
            imageUrl: 'https://picsum.photos/seed/lx-annotate/800/600',
            existingExternalId: `dummy-external-${activeGroupId}`
        }
    };
}
function coerceTask(raw) {
    const frameIdRaw = raw.frameId ??
        raw.frame_id ??
        raw.data?.frameId ??
        raw.data?.frame_id;
    const imageUrlRaw = raw.imageUrl ??
        raw.image_url ??
        raw.frameStreamPath ??
        raw.frame_stream_path ??
        raw.data?.imageUrl ??
        raw.data?.image_url ??
        raw.data?.frameStreamPath ??
        raw.data?.frame_stream_path;
    const existingExternalIdRaw = raw.existingExternalId ??
        raw.existing_external_id ??
        raw.data?.existingExternalId ??
        raw.data?.existing_external_id;
    const idRaw = raw.id ?? raw.taskId ?? raw.task_id;
    const labelOptionsRaw = raw.labelOptions ??
        raw.label_options ??
        raw.data?.labelOptions ??
        raw.data?.label_options;
    const manualAnnotationsRaw = raw.manualAnnotations ??
        raw.manual_annotations ??
        raw.data?.manualAnnotations ??
        raw.data?.manual_annotations;
    const predictionAnnotationsRaw = raw.predictionAnnotations ??
        raw.prediction_annotations ??
        raw.data?.predictionAnnotations ??
        raw.data?.prediction_annotations;
    const suggestedLabelIdsRaw = raw.suggestedLabelIds ??
        raw.suggested_label_ids ??
        raw.data?.suggestedLabelIds ??
        raw.data?.suggested_label_ids;
    const annotationModeRaw = raw.annotationMode ??
        raw.annotation_mode ??
        raw.data?.annotationMode ??
        raw.data?.annotation_mode;
    const frameId = Number(frameIdRaw);
    const imageUrl = typeof imageUrlRaw === 'string' ? imageUrlRaw : null;
    if (!Number.isFinite(frameId) || !imageUrl)
        return null;
    const existingExternalId = typeof existingExternalIdRaw === 'string' && existingExternalIdRaw.trim()
        ? existingExternalIdRaw
        : undefined;
    const labelOptions = Array.isArray(labelOptionsRaw)
        ? labelOptionsRaw
            .map((item) => {
            if (!item || typeof item !== 'object')
                return null;
            const row = item;
            const id = Number(row.id);
            const name = typeof row.name === 'string' ? row.name.trim() : '';
            if (!Number.isFinite(id) || !name)
                return null;
            return { id, name };
        })
            .filter((item) => item !== null)
        : [];
    const normalizeAnnotationList = (value) => {
        if (!Array.isArray(value))
            return [];
        const isNonNull = (item) => item !== null;
        return value
            .map((item) => {
            if (!item || typeof item !== 'object')
                return null;
            const row = item;
            const labelId = Number(row.labelId ?? row.label_id);
            const labelName = typeof (row.labelName ?? row.label_name) === 'string'
                ? String(row.labelName ?? row.label_name).trim()
                : '';
            if (!Number.isFinite(labelId) || !labelName)
                return null;
            const normalized = {
                labelId,
                labelName,
                value: !!row.value
            };
            if (typeof row.id === 'number' && Number.isFinite(row.id)) {
                normalized.id = row.id;
            }
            else if (typeof row.id === 'string' && row.id.trim()) {
                const parsedId = Number(row.id);
                if (Number.isFinite(parsedId)) {
                    normalized.id = parsedId;
                }
            }
            if (typeof row.floatValue === 'number') {
                normalized.floatValue = row.floatValue;
            }
            else if (typeof row.float_value === 'number') {
                normalized.floatValue = row.float_value;
            }
            else {
                normalized.floatValue = null;
            }
            if (typeof row.externalAnnotationId === 'string') {
                normalized.externalAnnotationId = row.externalAnnotationId;
            }
            else if (typeof row.external_annotation_id === 'string') {
                normalized.externalAnnotationId = row.external_annotation_id;
            }
            else {
                normalized.externalAnnotationId = null;
            }
            if (typeof row.modelMetaId === 'number') {
                normalized.modelMetaId = row.modelMetaId;
            }
            else if (typeof row.model_meta_id === 'number') {
                normalized.modelMetaId = row.model_meta_id;
            }
            else {
                normalized.modelMetaId = null;
            }
            return normalized;
        })
            .filter(isNonNull);
    };
    const suggestedLabelIds = Array.isArray(suggestedLabelIdsRaw)
        ? suggestedLabelIdsRaw
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item))
        : [];
    return {
        id: typeof idRaw === 'string' || typeof idRaw === 'number'
            ? String(idRaw)
            : globalThis.crypto?.randomUUID?.() ?? `frame-task-${frameId}`,
        data: {
            frameId,
            imageUrl,
            existingExternalId,
            annotationMode: typeof annotationModeRaw === 'string' ? annotationModeRaw : undefined,
            labelOptions,
            manualAnnotations: normalizeAnnotationList(manualAnnotationsRaw),
            predictionAnnotations: normalizeAnnotationList(predictionAnnotationsRaw),
            suggestedLabelIds
        }
    };
}
function extractTaskList(payload) {
    if (Array.isArray(payload)) {
        return payload.filter((item) => !!item && typeof item === 'object');
    }
    if (!payload || typeof payload !== 'object')
        return [];
    const obj = payload;
    if (Array.isArray(obj.tasks)) {
        return obj.tasks.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.results)) {
        return obj.results.filter((item) => !!item && typeof item === 'object');
    }
    if (obj.task && typeof obj.task === 'object') {
        return [obj.task];
    }
    return [obj];
}
export const useAnnotationQueueStore = defineStore('annotationQueue', () => {
    const dummyTaskModeEnabled = isDummyTaskModeEnabled();
    const selectedLabelGroupId = ref(loadStoredGroupId() ?? (dummyTaskModeEnabled ? DEBUG_DUMMY_TASK_GROUP_ID : null));
    const taskMode = ref(loadStoredTaskMode());
    const targetLabelName = ref(normalizeLabelName(loadStoredText(TARGET_LABEL_STORAGE_KEY)));
    const filterLabelName = ref(loadStoredText(FILTER_LABEL_STORAGE_KEY));
    const allowRandomFallback = ref(loadStoredRandomFallback());
    const informationSource = ref(loadStoredText(INFORMATION_SOURCE_STORAGE_KEY) ?? DEFAULT_INFORMATION_SOURCE);
    const samplingStrategy = ref(loadStoredSamplingStrategy());
    const predictionSegmentsOnly = ref(loadStoredPredictionSegmentsOnly());
    const taskQueue = ref([]);
    const isInitialLoading = ref(false);
    const isPrefetching = ref(false);
    const lastError = ref(null);
    const aiDatasetName = ref(null);
    const aiDatasetType = ref(null);
    const taskQuerySignature = computed(() => `${taskMode.value}|${targetLabelName.value}|${filterLabelName.value ?? ''}|${informationSource.value}|${allowRandomFallback.value ? '1' : '0'}|${samplingStrategy.value}|${predictionSegmentsOnly.value ? '1' : '0'}|${aiDatasetName.value ?? ''}|${aiDatasetType.value ?? ''}`);
    watch(selectedLabelGroupId, (next) => {
        persistGroupId(next);
    });
    watch(taskMode, (next) => {
        persistText(TASK_MODE_STORAGE_KEY, next);
    });
    watch(targetLabelName, (next) => {
        persistText(TARGET_LABEL_STORAGE_KEY, normalizeLabelName(next));
    });
    watch(filterLabelName, (next) => {
        persistText(FILTER_LABEL_STORAGE_KEY, next);
    });
    watch(allowRandomFallback, (next) => {
        persistBoolean(RANDOM_FALLBACK_STORAGE_KEY, next);
    });
    watch(informationSource, (next) => {
        persistText(INFORMATION_SOURCE_STORAGE_KEY, next);
    });
    watch(samplingStrategy, (next) => {
        persistText(SAMPLING_STRATEGY_STORAGE_KEY, next);
    });
    watch(predictionSegmentsOnly, (next) => {
        persistBoolean(PREDICTION_SEGMENTS_ONLY_STORAGE_KEY, next);
    });
    function setSelectedLabelGroupId(groupId) {
        selectedLabelGroupId.value = groupId && groupId.trim() ? groupId : null;
    }
    function setTaskMode(mode) {
        taskMode.value = mode === 'filtered' ? 'filtered' : 'random';
    }
    function setTargetLabelName(label) {
        targetLabelName.value = normalizeLabelName(label);
    }
    function setFilterLabelName(label) {
        filterLabelName.value = label && label.trim() ? label.trim() : null;
    }
    function setAllowRandomFallback(enabled) {
        allowRandomFallback.value = !!enabled;
    }
    function setInformationSource(source) {
        const normalized = source?.trim() ?? '';
        informationSource.value = normalized || DEFAULT_INFORMATION_SOURCE;
    }
    function setSamplingStrategy(strategy) {
        samplingStrategy.value = normalizeSamplingStrategy(strategy);
    }
    function setPredictionSegmentsOnly(enabled) {
        predictionSegmentsOnly.value = !!enabled;
    }
    function setAiDataset(datasetName, datasetType) {
        aiDatasetName.value = datasetName?.trim() || null;
        aiDatasetType.value = datasetType?.trim() || null;
    }
    async function hydrateAiDatasetDefaults() {
        if (aiDatasetName.value !== null || aiDatasetType.value !== null)
            return;
        try {
            const settings = await fetchApplicationSettings();
            aiDatasetName.value = settings.aiDatasetName?.trim() || null;
            aiDatasetType.value = settings.aiDatasetType?.trim() || null;
        }
        catch {
            aiDatasetName.value = null;
            aiDatasetType.value = null;
        }
    }
    function buildTaskRequestParams(batchSize, mode) {
        const params = {
            label_group_id: selectedLabelGroupId.value,
            limit: batchSize
        };
        params.task_mode = mode;
        params.target_label = targetLabelName.value;
        params.information_source = informationSource.value;
        params.information_source_name = informationSource.value;
        if (mode === 'filtered' && filterLabelName.value) {
            params.filter_label = filterLabelName.value;
            params.previous_label = filterLabelName.value;
        }
        if (aiDatasetName.value) {
            params.ai_dataset_name = aiDatasetName.value;
        }
        if (aiDatasetType.value) {
            params.ai_dataset_type = aiDatasetType.value;
        }
        params.dataset_frame_filter = samplingStrategy.value;
        params.prediction_segments_only = predictionSegmentsOnly.value ? 'true' : 'false';
        return params;
    }
    async function fetchTaskBatchFromApi(batchSize, mode) {
        const res = await axiosInstance.get(r(endpoints.annotation.randomTask), {
            params: buildTaskRequestParams(batchSize, mode)
        });
        return extractTaskList(res.data)
            .map((raw) => coerceTask(raw))
            .filter((task) => task !== null);
    }
    async function fetchBatch(batchSize = 10) {
        if (!selectedLabelGroupId.value) {
            if (!dummyTaskModeEnabled)
                return [];
            selectedLabelGroupId.value = DEBUG_DUMMY_TASK_GROUP_ID;
        }
        lastError.value = null;
        try {
            await hydrateAiDatasetDefaults();
            let parsed = await fetchTaskBatchFromApi(batchSize, taskMode.value);
            if (taskMode.value === 'filtered' &&
                allowRandomFallback.value &&
                parsed.length === 0) {
                parsed = await fetchTaskBatchFromApi(batchSize, 'random');
            }
            taskQueue.value.push(...parsed);
            if (dummyTaskModeEnabled && parsed.length === 0 && taskQueue.value.length === 0) {
                const dummy = createDummyTask(selectedLabelGroupId.value);
                taskQueue.value.push(dummy);
                return [dummy];
            }
            return parsed;
        }
        catch (error) {
            if (taskMode.value === 'filtered' && allowRandomFallback.value) {
                try {
                    const fallbackParsed = await fetchTaskBatchFromApi(batchSize, 'random');
                    taskQueue.value.push(...fallbackParsed);
                    if (fallbackParsed.length > 0) {
                        return fallbackParsed;
                    }
                }
                catch {
                    // Ignore fallback error and expose the primary error below.
                }
            }
            lastError.value =
                error?.response?.data?.detail ||
                    error?.response?.data?.error ||
                    error?.message ||
                    'Failed to fetch annotation tasks.';
            if (dummyTaskModeEnabled && taskQueue.value.length === 0) {
                const dummy = createDummyTask(selectedLabelGroupId.value);
                taskQueue.value.push(dummy);
                return [dummy];
            }
            return [];
        }
    }
    async function prefetchIfNeeded() {
        if (isPrefetching.value || !selectedLabelGroupId.value)
            return;
        if (taskQueue.value.length >= 3)
            return;
        isPrefetching.value = true;
        try {
            await fetchBatch(10);
        }
        finally {
            isPrefetching.value = false;
        }
    }
    function popNextTask() {
        const task = taskQueue.value.shift();
        void prefetchIfNeeded();
        return task;
    }
    function clearQueue() {
        taskQueue.value = [];
    }
    async function primeQueue(batchSize = 10) {
        if (!selectedLabelGroupId.value)
            return;
        isInitialLoading.value = true;
        clearQueue();
        try {
            await fetchBatch(batchSize);
        }
        finally {
            isInitialLoading.value = false;
        }
    }
    return {
        selectedLabelGroupId,
        taskMode,
        targetLabelName,
        filterLabelName,
        allowRandomFallback,
        informationSource,
        samplingStrategy,
        predictionSegmentsOnly,
        aiDatasetName,
        aiDatasetType,
        taskQuerySignature,
        taskQueue,
        isInitialLoading,
        isPrefetching,
        lastError,
        setSelectedLabelGroupId,
        setTaskMode,
        setTargetLabelName,
        setFilterLabelName,
        setAllowRandomFallback,
        setInformationSource,
        setSamplingStrategy,
        setPredictionSegmentsOnly,
        setAiDataset,
        hydrateAiDatasetDefaults,
        fetchBatch,
        prefetchIfNeeded,
        popNextTask,
        clearQueue,
        primeQueue
    };
});
