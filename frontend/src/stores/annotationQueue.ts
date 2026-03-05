import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1'
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task'
const DEBUG_DUMMY_TASK_GROUP_ID = '1'

function loadStoredGroupId(): string | null {
  try {
    const raw = localStorage.getItem(SELECTED_GROUP_STORAGE_KEY)
    return raw && raw.trim() ? raw : null
  } catch {
    return null
  }
}

function persistGroupId(groupId: string | null): void {
  try {
    if (groupId) {
      localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, groupId)
    } else {
      localStorage.removeItem(SELECTED_GROUP_STORAGE_KEY)
    }
  } catch {
    // Persistence failure should not block annotation flow.
  }
}

export interface AnnotationTask {
  id: string
  data: {
    frameId: number
    imageUrl: string
    existingExternalId?: string
  }
}

function isDummyTaskModeEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  if (typeof window === 'undefined') return false
  const query = new URLSearchParams(window.location.search)
  const raw = query.get(DEBUG_DUMMY_TASK_QUERY_KEY)
  return raw === '1' || raw === 'true'
}

function createDummyTask(groupId: string | null): AnnotationTask {
  const activeGroupId = groupId && groupId.trim() ? groupId : DEBUG_DUMMY_TASK_GROUP_ID
  return {
    id: `dummy-task-${activeGroupId}`,
    data: {
      frameId: 999,
      imageUrl: 'https://picsum.photos/seed/lx-annotate/800/600',
      existingExternalId: `dummy-external-${activeGroupId}`
    }
  }
}

type RawTask = Record<string, unknown>

function coerceTask(raw: RawTask): AnnotationTask | null {
  const frameIdRaw =
    raw.frameId ??
    raw.frame_id ??
    (raw.data as Record<string, unknown> | undefined)?.frameId ??
    (raw.data as Record<string, unknown> | undefined)?.frame_id
  const imageUrlRaw =
    raw.imageUrl ??
    raw.image_url ??
    (raw.data as Record<string, unknown> | undefined)?.imageUrl ??
    (raw.data as Record<string, unknown> | undefined)?.image_url
  const existingExternalIdRaw =
    raw.existingExternalId ??
    raw.existing_external_id ??
    (raw.data as Record<string, unknown> | undefined)?.existingExternalId ??
    (raw.data as Record<string, unknown> | undefined)?.existing_external_id
  const idRaw = raw.id ?? raw.taskId ?? raw.task_id

  const frameId = Number(frameIdRaw)
  const imageUrl = typeof imageUrlRaw === 'string' ? imageUrlRaw : null
  if (!Number.isFinite(frameId) || !imageUrl) return null

  const existingExternalId =
    typeof existingExternalIdRaw === 'string' && existingExternalIdRaw.trim()
      ? existingExternalIdRaw
      : undefined

  return {
    id:
      typeof idRaw === 'string' || typeof idRaw === 'number'
        ? String(idRaw)
        : crypto.randomUUID(),
    data: {
      frameId,
      imageUrl,
      existingExternalId
    }
  }
}

function extractTaskList(payload: unknown): RawTask[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is RawTask => !!item && typeof item === 'object')
  }
  if (!payload || typeof payload !== 'object') return []

  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.tasks)) {
    return obj.tasks.filter((item): item is RawTask => !!item && typeof item === 'object')
  }
  if (Array.isArray(obj.results)) {
    return obj.results.filter((item): item is RawTask => !!item && typeof item === 'object')
  }
  if (obj.task && typeof obj.task === 'object') {
    return [obj.task as RawTask]
  }
  return [obj]
}

export const useAnnotationQueueStore = defineStore('annotationQueue', () => {
  const dummyTaskModeEnabled = isDummyTaskModeEnabled()
  const selectedLabelGroupId = ref<string | null>(
    loadStoredGroupId() ?? (dummyTaskModeEnabled ? DEBUG_DUMMY_TASK_GROUP_ID : null)
  )
  const taskQueue = ref<AnnotationTask[]>([])
  const isInitialLoading = ref(false)
  const isPrefetching = ref(false)
  const lastError = ref<string | null>(null)

  watch(selectedLabelGroupId, (next) => {
    persistGroupId(next)
  })

  function setSelectedLabelGroupId(groupId: string | null): void {
    selectedLabelGroupId.value = groupId && groupId.trim() ? groupId : null
  }

  async function fetchBatch(batchSize = 10): Promise<AnnotationTask[]> {
    if (!selectedLabelGroupId.value) {
      if (!dummyTaskModeEnabled) return []
      selectedLabelGroupId.value = DEBUG_DUMMY_TASK_GROUP_ID
    }

    lastError.value = null
    try {
      const res = await axiosInstance.get(r(endpoints.annotation.randomTask), {
        params: {
          label_group_id: selectedLabelGroupId.value,
          limit: batchSize
        }
      })
      const parsed = extractTaskList(res.data)
        .map((raw) => coerceTask(raw))
        .filter((task): task is AnnotationTask => task !== null)
      taskQueue.value.push(...parsed)
      if (dummyTaskModeEnabled && parsed.length === 0 && taskQueue.value.length === 0) {
        const dummy = createDummyTask(selectedLabelGroupId.value)
        taskQueue.value.push(dummy)
        return [dummy]
      }
      return parsed
    } catch (error: any) {
      lastError.value =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to fetch annotation tasks.'
      if (dummyTaskModeEnabled && taskQueue.value.length === 0) {
        const dummy = createDummyTask(selectedLabelGroupId.value)
        taskQueue.value.push(dummy)
        return [dummy]
      }
      return []
    }
  }

  async function prefetchIfNeeded(): Promise<void> {
    if (isPrefetching.value || !selectedLabelGroupId.value) return
    if (taskQueue.value.length >= 3) return

    isPrefetching.value = true
    try {
      await fetchBatch(10)
    } finally {
      isPrefetching.value = false
    }
  }

  function popNextTask(): AnnotationTask | undefined {
    const task = taskQueue.value.shift()
    void prefetchIfNeeded()
    return task
  }

  function clearQueue(): void {
    taskQueue.value = []
  }

  async function primeQueue(batchSize = 10): Promise<void> {
    if (!selectedLabelGroupId.value) return
    isInitialLoading.value = true
    clearQueue()
    try {
      await fetchBatch(batchSize)
    } finally {
      isInitialLoading.value = false
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
  }
})
