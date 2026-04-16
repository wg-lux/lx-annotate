import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1'
const TASK_MODE_STORAGE_KEY = 'annotationQueue.taskMode.v1'
const TARGET_LABEL_STORAGE_KEY = 'annotationQueue.targetLabelName.v1'
const FILTER_LABEL_STORAGE_KEY = 'annotationQueue.filterLabelName.v1'
const RANDOM_FALLBACK_STORAGE_KEY = 'annotationQueue.allowRandomFallback.v1'
const INFORMATION_SOURCE_STORAGE_KEY = 'annotationQueue.informationSource.v1'
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task'
const DEBUG_DUMMY_TASK_GROUP_ID = '1'
const DEFAULT_TARGET_LABEL_NAME = 'Target Label'
const DEFAULT_INFORMATION_SOURCE = 'frame_annotation_frontend'

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
    annotationMode?: string
    labelOptions?: Array<{ id: number; name: string }>
    manualAnnotations?: Array<{
      id?: number
      labelId: number
      labelName: string
      value: boolean
      floatValue?: number | null
      externalAnnotationId?: string | null
    }>
    predictionAnnotations?: Array<{
      id?: number
      labelId: number
      labelName: string
      value: boolean
      floatValue?: number | null
      modelMetaId?: number | null
    }>
    suggestedLabelIds?: number[]
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
type NormalizedAnnotation = {
  id?: number
  labelId: number
  labelName: string
  value: boolean
  floatValue?: number | null
  externalAnnotationId?: string | null
  modelMetaId?: number | null
}

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
  const labelOptionsRaw =
    raw.labelOptions ??
    raw.label_options ??
    (raw.data as Record<string, unknown> | undefined)?.labelOptions ??
    (raw.data as Record<string, unknown> | undefined)?.label_options
  const manualAnnotationsRaw =
    raw.manualAnnotations ??
    raw.manual_annotations ??
    (raw.data as Record<string, unknown> | undefined)?.manualAnnotations ??
    (raw.data as Record<string, unknown> | undefined)?.manual_annotations
  const predictionAnnotationsRaw =
    raw.predictionAnnotations ??
    raw.prediction_annotations ??
    (raw.data as Record<string, unknown> | undefined)?.predictionAnnotations ??
    (raw.data as Record<string, unknown> | undefined)?.prediction_annotations
  const suggestedLabelIdsRaw =
    raw.suggestedLabelIds ??
    raw.suggested_label_ids ??
    (raw.data as Record<string, unknown> | undefined)?.suggestedLabelIds ??
    (raw.data as Record<string, unknown> | undefined)?.suggested_label_ids
  const annotationModeRaw =
    raw.annotationMode ??
    raw.annotation_mode ??
    (raw.data as Record<string, unknown> | undefined)?.annotationMode ??
    (raw.data as Record<string, unknown> | undefined)?.annotation_mode

  const frameId = Number(frameIdRaw)
  const imageUrl = typeof imageUrlRaw === 'string' ? imageUrlRaw : null
  if (!Number.isFinite(frameId) || !imageUrl) return null

  const existingExternalId =
    typeof existingExternalIdRaw === 'string' && existingExternalIdRaw.trim()
      ? existingExternalIdRaw
      : undefined
  const labelOptions = Array.isArray(labelOptionsRaw)
    ? labelOptionsRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const id = Number(row.id)
          const name = typeof row.name === 'string' ? row.name.trim() : ''
          if (!Number.isFinite(id) || !name) return null
          return { id, name }
        })
        .filter((item): item is { id: number; name: string } => item !== null)
    : []
  const normalizeAnnotationList = (value: unknown): NormalizedAnnotation[] => {
    if (!Array.isArray(value)) return []

    const isNonNull = <T>(item: T | null): item is T => item !== null

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        const labelId = Number(row.labelId ?? row.label_id)
        const labelName =
          typeof (row.labelName ?? row.label_name) === 'string'
            ? String(row.labelName ?? row.label_name).trim()
            : ''
        if (!Number.isFinite(labelId) || !labelName) return null
        const normalized: NormalizedAnnotation = {
          labelId,
          labelName,
          value: !!row.value
        }

        if (typeof row.id === 'number' && Number.isFinite(row.id)) {
          normalized.id = row.id
        } else if (typeof row.id === 'string' && row.id.trim()) {
          const parsedId = Number(row.id)
          if (Number.isFinite(parsedId)) {
            normalized.id = parsedId
          }
        }

        if (typeof row.floatValue === 'number') {
          normalized.floatValue = row.floatValue
        } else if (typeof row.float_value === 'number') {
          normalized.floatValue = row.float_value
        } else {
          normalized.floatValue = null
        }

        if (typeof row.externalAnnotationId === 'string') {
          normalized.externalAnnotationId = row.externalAnnotationId
        } else if (typeof row.external_annotation_id === 'string') {
          normalized.externalAnnotationId = row.external_annotation_id
        } else {
          normalized.externalAnnotationId = null
        }

        if (typeof row.modelMetaId === 'number') {
          normalized.modelMetaId = row.modelMetaId
        } else if (typeof row.model_meta_id === 'number') {
          normalized.modelMetaId = row.model_meta_id
        } else {
          normalized.modelMetaId = null
        }

        return normalized
      })
      .filter(isNonNull)
  }
  const suggestedLabelIds = Array.isArray(suggestedLabelIdsRaw)
    ? suggestedLabelIdsRaw
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    : []

  return {
    id:
      typeof idRaw === 'string' || typeof idRaw === 'number'
        ? String(idRaw)
        : crypto.randomUUID(),
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
  const informationSource = ref<string>(
    loadStoredText(INFORMATION_SOURCE_STORAGE_KEY) ?? DEFAULT_INFORMATION_SOURCE
  )
  const taskQueue = ref<AnnotationTask[]>([])
  const isInitialLoading = ref(false)
  const isPrefetching = ref(false)
  const lastError = ref<string | null>(null)
  const taskQuerySignature = computed(
    () =>
      `${taskMode.value}|${targetLabelName.value}|${filterLabelName.value ?? ''}|${
        informationSource.value
      }|${
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
  watch(informationSource, (next) => {
    persistText(INFORMATION_SOURCE_STORAGE_KEY, next)
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

  function setInformationSource(source: string | null): void {
    const normalized = source?.trim() ?? ''
    informationSource.value = normalized || DEFAULT_INFORMATION_SOURCE
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
    params.information_source = informationSource.value
    params.information_source_name = informationSource.value

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
  }
})
