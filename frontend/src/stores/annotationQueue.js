import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1';
const TASK_MODE_STORAGE_KEY = 'annotationQueue.taskMode.v1';
const TARGET_LABEL_STORAGE_KEY = 'annotationQueue.targetLabelName.v1';
const FILTER_LABEL_STORAGE_KEY = 'annotationQueue.filterLabelName.v1';
const RANDOM_FALLBACK_STORAGE_KEY = 'annotationQueue.allowRandomFallback.v1';
const INFORMATION_SOURCE_STORAGE_KEY = 'annotationQueue.informationSource.v1';
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task';
const DEBUG_DUMMY_TASK_GROUP_ID = '1';
const DEFAULT_TARGET_LABEL_NAME = 'Target Label';
const DEFAULT_INFORMATION_SOURCE = 'frame_annotation_frontend';
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
        raw.data?.imageUrl ??
        raw.data?.image_url;
    const existingExternalIdRaw = raw.existingExternalId ??
        raw.existing_external_id ??
        raw.data?.existingExternalId ??
        raw.data?.existing_external_id;
    const idRaw = raw.id ?? raw.taskId ?? raw.task_id;
    const frameId = Number(frameIdRaw);
    const imageUrl = typeof imageUrlRaw === 'string' ? imageUrlRaw : null;
    if (!Number.isFinite(frameId) || !imageUrl)
        return null;
    const existingExternalId = typeof existingExternalIdRaw === 'string' && existingExternalIdRaw.trim()
        ? existingExternalIdRaw
        : undefined;
    return {
        id: typeof idRaw === 'string' || typeof idRaw === 'number'
            ? String(idRaw)
            : crypto.randomUUID(),
        data: {
            frameId,
            imageUrl,
            existingExternalId
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
    const taskQueue = ref([]);
    const isInitialLoading = ref(false);
    const isPrefetching = ref(false);
    const lastError = ref(null);
    const taskQuerySignature = computed(() => `${taskMode.value}|${targetLabelName.value}|${filterLabelName.value ?? ''}|${informationSource.value}|${allowRandomFallback.value ? '1' : '0'}`);
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
        fetchBatch,
        prefetchIfNeeded,
        popNextTask,
        clearQueue,
        primeQueue
    };
});
