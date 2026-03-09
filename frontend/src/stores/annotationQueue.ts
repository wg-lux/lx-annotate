import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1'
const TASK_MODE_STORAGE_KEY = 'annotationQueue.taskMode.v1'
const TARGET_LABEL_STORAGE_KEY = 'annotationQueue.targetLabelName.v1'
const FILTER_LABEL_STORAGE_KEY = 'annotationQueue.filterLabelName.v1'
const RANDOM_FALLBACK_STORAGE_KEY = 'annotationQueue.allowRandomFallback.v1'
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task'
const DEBUG_DUMMY_TASK_GROUP_ID = '1'
const DEFAULT_TARGET_LABEL_NAME = 'Target Label'

export type AnnotationTaskMode = 'random' | 'filtered'

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

function loadStoredText(key: string): string | null {
  try {
    const raw = localStorage.getItem(key)
    return raw && raw.trim() ? raw.trim() : null
  } catch {
    return null
  }
}

function persistText(key: string, value: string | null): void {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // Persistence failure should not block annotation flow.
  }
}

function loadStoredTaskMode(): AnnotationTaskMode {
  const raw = loadStoredText(TASK_MODE_STORAGE_KEY)
  return raw === 'filtered' ? 'filtered' : 'random'
}

function normalizeLabelName(value: string | null): string {
  const normalized = value?.trim() ?? ''
  return normalized || DEFAULT_TARGET_LABEL_NAME
}

function loadStoredRandomFallback(): boolean {
  try {
    const raw = localStorage.getItem(RANDOM_FALLBACK_STORAGE_KEY)
    if (raw === null) return true
    return raw === '1' || raw.toLowerCase() === 'true'
  } catch {
    return true
  }
}

function persistBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
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
  const taskMode = ref<AnnotationTaskMode>(loadStoredTaskMode())
  const targetLabelName = ref<string>(normalizeLabelName(loadStoredText(TARGET_LABEL_STORAGE_KEY)))
  const filterLabelName = ref<string | null>(loadStoredText(FILTER_LABEL_STORAGE_KEY))
  const allowRandomFallback = ref<boolean>(loadStoredRandomFallback())
  const taskQueue = ref<AnnotationTask[]>([])
  const isInitialLoading = ref(false)
  const isPrefetching = ref(false)
  const lastError = ref<string | null>(null)
  const taskQuerySignature = computed(
    () =>
      `${taskMode.value}|${targetLabelName.value}|${filterLabelName.value ?? ''}|${
        allowRandomFallback.value ? '1' : '0'
      }`
  )

  watch(selectedLabelGroupId, (next) => {
    persistGroupId(next)
  })
  watch(taskMode, (next) => {
    persistText(TASK_MODE_STORAGE_KEY, next)
  })
  watch(targetLabelName, (next) => {
    persistText(TARGET_LABEL_STORAGE_KEY, normalizeLabelName(next))
  })
  watch(filterLabelName, (next) => {
    persistText(FILTER_LABEL_STORAGE_KEY, next)
  })
  watch(allowRandomFallback, (next) => {
    persistBoolean(RANDOM_FALLBACK_STORAGE_KEY, next)
  })

  function setSelectedLabelGroupId(groupId: string | null): void {
    selectedLabelGroupId.value = groupId && groupId.trim() ? groupId : null
  }

  function setTaskMode(mode: AnnotationTaskMode): void {
    taskMode.value = mode === 'filtered' ? 'filtered' : 'random'
  }

  function setTargetLabelName(label: string | null): void {
    targetLabelName.value = normalizeLabelName(label)
  }

  function setFilterLabelName(label: string | null): void {
    filterLabelName.value = label && label.trim() ? label.trim() : null
  }

  function setAllowRandomFallback(enabled: boolean): void {
    allowRandomFallback.value = !!enabled
  }

  function buildTaskRequestParams(
    batchSize: number,
    mode: AnnotationTaskMode
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {
      label_group_id: selectedLabelGroupId.value as string,
      limit: batchSize
    }

    params.task_mode = mode
    params.target_label = targetLabelName.value

    if (mode === 'filtered' && filterLabelName.value) {
      params.filter_label = filterLabelName.value
      params.previous_label = filterLabelName.value
    }

    return params
  }

  async function fetchTaskBatchFromApi(
    batchSize: number,
    mode: AnnotationTaskMode
  ): Promise<AnnotationTask[]> {
    const res = await axiosInstance.get(r(endpoints.annotation.randomTask), {
      params: buildTaskRequestParams(batchSize, mode)
    })
    return extractTaskList(res.data)
      .map((raw) => coerceTask(raw))
      .filter((task): task is AnnotationTask => task !== null)
  }

  async function fetchBatch(batchSize = 10): Promise<AnnotationTask[]> {
    if (!selectedLabelGroupId.value) {
      if (!dummyTaskModeEnabled) return []
      selectedLabelGroupId.value = DEBUG_DUMMY_TASK_GROUP_ID
    }

    lastError.value = null
    try {
      let parsed = await fetchTaskBatchFromApi(batchSize, taskMode.value)

      if (
        taskMode.value === 'filtered' &&
        allowRandomFallback.value &&
        parsed.length === 0
      ) {
        parsed = await fetchTaskBatchFromApi(batchSize, 'random')
      }

      taskQueue.value.push(...parsed)
      if (dummyTaskModeEnabled && parsed.length === 0 && taskQueue.value.length === 0) {
        const dummy = createDummyTask(selectedLabelGroupId.value)
        taskQueue.value.push(dummy)
        return [dummy]
      }
      return parsed
    } catch (error: any) {
      if (taskMode.value === 'filtered' && allowRandomFallback.value) {
        try {
          const fallbackParsed = await fetchTaskBatchFromApi(batchSize, 'random')
          taskQueue.value.push(...fallbackParsed)
          if (fallbackParsed.length > 0) {
            return fallbackParsed
          }
        } catch {
          // Ignore fallback error and expose the primary error below.
        }
      }

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
    taskMode,
    targetLabelName,
    filterLabelName,
    allowRandomFallback,
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
    fetchBatch,
    prefetchIfNeeded,
    popNextTask,
    clearQueue,
    primeQueue
  }
})
