import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1';
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task';
const DEBUG_DUMMY_TASK_GROUP_ID = '1';
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
    const taskQueue = ref([]);
    const isInitialLoading = ref(false);
    const isPrefetching = ref(false);
    const lastError = ref(null);
    watch(selectedLabelGroupId, (next) => {
        persistGroupId(next);
    });
    function setSelectedLabelGroupId(groupId) {
        selectedLabelGroupId.value = groupId && groupId.trim() ? groupId : null;
    }
    async function fetchBatch(batchSize = 10) {
        if (!selectedLabelGroupId.value) {
            if (!dummyTaskModeEnabled)
                return [];
            selectedLabelGroupId.value = DEBUG_DUMMY_TASK_GROUP_ID;
        }
        lastError.value = null;
        try {
            const res = await axiosInstance.get(r(endpoints.annotation.randomTask), {
                params: {
                    label_group_id: selectedLabelGroupId.value,
                    limit: batchSize
                }
            });
            const parsed = extractTaskList(res.data)
                .map((raw) => coerceTask(raw))
                .filter((task) => task !== null);
            taskQueue.value.push(...parsed);
            if (dummyTaskModeEnabled && parsed.length === 0 && taskQueue.value.length === 0) {
                const dummy = createDummyTask(selectedLabelGroupId.value);
                taskQueue.value.push(dummy);
                return [dummy];
            }
            return parsed;
        }
        catch (error) {
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
        taskQueue,
        isInitialLoading,
        isPrefetching,
        lastError,
        setSelectedLabelGroupId,
        fetchBatch,
        prefetchIfNeeded,
        popNextTask,
        clearQueue,
        primeQueue
    };
});
