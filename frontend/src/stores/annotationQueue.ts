import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { fetchApplicationSettings } from '@/api/applicationSettingsApi'
import { endpoints } from '@/types/api/endpoints'

const SELECTED_GROUP_STORAGE_KEY = 'annotationQueue.selectedLabelGroupId.v1'
const TASK_MODE_STORAGE_KEY = 'annotationQueue.taskMode.v1'
const TARGET_LABEL_STORAGE_KEY = 'annotationQueue.targetLabelName.v1'
const FILTER_LABEL_STORAGE_KEY = 'annotationQueue.filterLabelName.v1'
const RANDOM_FALLBACK_STORAGE_KEY = 'annotationQueue.allowRandomFallback.v1'
const INFORMATION_SOURCE_STORAGE_KEY = 'annotationQueue.informationSource.v1'
const FRAME_FILE_TYPE_STORAGE_KEY = 'annotationQueue.frameFileType.v1'
const SAMPLING_STRATEGY_STORAGE_KEY = 'annotationQueue.samplingStrategy.v1'
const PREDICTION_SEGMENTS_ONLY_STORAGE_KEY = 'annotationQueue.predictionSegmentsOnly.v1'
const AI_DATASET_ID_STORAGE_KEY = 'annotationQueue.aiDatasetId.v1'
const AI_DATASET_NAME_STORAGE_KEY = 'annotationQueue.aiDatasetName.v1'
const AI_DATASET_TYPE_STORAGE_KEY = 'annotationQueue.aiDatasetType.v1'
const DEBUG_DUMMY_TASK_QUERY_KEY = 'ls_dummy_task'
const DEBUG_DUMMY_TASK_GROUP_ID = '1'
const DEFAULT_TARGET_LABEL_NAME = ''
const DEFAULT_INFORMATION_SOURCE = 'manual_annotation'
const DEFAULT_FRAME_FILE_TYPE = 'auto'
const DEFAULT_SAMPLING_STRATEGY = 'balanced'

export type AnnotationTaskMode = 'random' | 'filtered'
export type AnnotationSamplingStrategy = 'balanced' | 'segments' | 'annotations' | 'none'
export type FrameFileType = 'auto' | 'raw' | 'processed'
export type AnnotationInformationSource =
  | 'manual_annotation'
  | 'frame_annotation_frontend'
  | 'human_annotation'
  | 'lx_anonymizer_evaluation'

function normalizeInformationSource(value: string | null): AnnotationInformationSource {
  if (
    value === 'frame_annotation_frontend' ||
    value === 'human_annotation' ||
    value === 'lx_anonymizer_evaluation'
  ) {
    return value
  }
  return DEFAULT_INFORMATION_SOURCE
}

function loadStoredGroupId(): string | null {
  try {
    const storedValue = localStorage.getItem(SELECTED_GROUP_STORAGE_KEY)
    return storedValue && storedValue.trim() ? storedValue : null
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
    const storedValue = localStorage.getItem(key)
    return storedValue && storedValue.trim() ? storedValue.trim() : null
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
  const storedValue = loadStoredText(TASK_MODE_STORAGE_KEY)
  return storedValue === 'filtered' ? 'filtered' : 'random'
}

function normalizeSamplingStrategy(value: string | null): AnnotationSamplingStrategy {
  if (value === 'segments' || value === 'annotations' || value === 'none') {
    return value
  }
  return DEFAULT_SAMPLING_STRATEGY
}

function normalizeFrameFileType(value: string | null): FrameFileType {
  if (value === 'raw' || value === 'processed') {
    return value
  }
  return DEFAULT_FRAME_FILE_TYPE
}

function loadStoredSamplingStrategy(): AnnotationSamplingStrategy {
  return normalizeSamplingStrategy(loadStoredText(SAMPLING_STRATEGY_STORAGE_KEY))
}

function normalizeLabelName(value: string | null): string {
  const normalized = value?.trim() ?? ''
  return normalized || DEFAULT_TARGET_LABEL_NAME
}

function loadStoredRandomFallback(): boolean {
  try {
    const storedValue = localStorage.getItem(RANDOM_FALLBACK_STORAGE_KEY)
    if (storedValue === null) {
      return true
    }
    return storedValue === '1' || storedValue.toLowerCase() === 'true'
  } catch {
    return true
  }
}

function loadStoredPredictionSegmentsOnly(): boolean {
  try {
    const storedValue = localStorage.getItem(PREDICTION_SEGMENTS_ONLY_STORAGE_KEY)
    if (storedValue === null) {
      return true
    }
    return storedValue === '1' || storedValue.toLowerCase() === 'true'
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
    videoId?: number
    frameNumber?: number
    relativePath?: string
    imageUrl: string
    frameFileType?: FrameFileType
    existingExternalId?: string
    annotationMode?: string
    datasetSelectionLabelId?: number
    datasetSelectionLabelName?: string
    datasetSelectionSource?: string
    datasetBucket?: string
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
  if (!import.meta.env.DEV) {
    return false
  }
  if (typeof window === 'undefined') {
    return false
  }
  const query = new URLSearchParams(window.location.search)
  const queryValue = query.get(DEBUG_DUMMY_TASK_QUERY_KEY)
  return queryValue === '1' || queryValue === 'true'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function createTaskId(frameId: number): string {
  try {
    const runtimeCrypto: unknown = Reflect.get(globalThis, 'crypto')
    if (isRecord(runtimeCrypto)) {
      const randomUUID: unknown = Reflect.get(runtimeCrypto, 'randomUUID')
      if (typeof randomUUID === 'function') {
        const generated: unknown = Reflect.apply(randomUUID, runtimeCrypto, [])
        if (typeof generated === 'string' && generated) {
          return generated
        }
      }
    }
  } catch {
    // Runtime UUID support is optional; the deterministic frame fallback remains valid.
  }
  return `frame-task-${String(frameId)}`
}

function rawField(raw: RawTask, camelKey: string, snakeKey: string): unknown {
  const nestedData = isRecord(raw.data) ? raw.data : undefined
  return raw[camelKey] ?? raw[snakeKey] ?? nestedData?.[camelKey] ?? nestedData?.[snakeKey]
}

function optionalFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function firstDefined(values: unknown[]): unknown {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value
    }
  }
  return undefined
}

function normalizeLabelOptions(value: unknown): Array<{ id: number; name: string }> {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const labelRecord = item as Record<string, unknown>
      const labelId = Number(labelRecord.id)
      const name = typeof labelRecord.name === 'string' ? labelRecord.name.trim() : ''
      return Number.isFinite(labelId) && name ? { id: labelId, name } : null
    })
    .filter((item): item is { id: number; name: string } => item !== null)
}

function normalizeAnnotationId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }
  const parsedId = Number(value)
  return Number.isFinite(parsedId) ? parsedId : undefined
}

function normalizeAnnotation(item: unknown): NormalizedAnnotation | null {
  if (!item || typeof item !== 'object') {
    return null
  }
  const annotationRecord = item as Record<string, unknown>
  const labelId = Number(firstDefined([annotationRecord.labelId, annotationRecord.label_id]))
  const labelNameRaw = firstDefined([annotationRecord.labelName, annotationRecord.label_name])
  const labelName = typeof labelNameRaw === 'string' ? labelNameRaw.trim() : ''
  if (!Number.isFinite(labelId) || !labelName) {
    return null
  }

  const normalized: NormalizedAnnotation = {
    labelId,
    labelName,
    value: !!annotationRecord.value,
    floatValue:
      typeof annotationRecord.floatValue === 'number'
        ? annotationRecord.floatValue
        : typeof annotationRecord.float_value === 'number'
          ? annotationRecord.float_value
          : null,
    externalAnnotationId:
      typeof annotationRecord.externalAnnotationId === 'string'
        ? annotationRecord.externalAnnotationId
        : typeof annotationRecord.external_annotation_id === 'string'
          ? annotationRecord.external_annotation_id
          : null,
    modelMetaId:
      typeof annotationRecord.modelMetaId === 'number'
        ? annotationRecord.modelMetaId
        : typeof annotationRecord.model_meta_id === 'number'
          ? annotationRecord.model_meta_id
          : null
  }
  const annotationId = normalizeAnnotationId(annotationRecord.id)
  if (annotationId !== undefined) {
    normalized.id = annotationId
  }
  return normalized
}

function normalizeAnnotationList(value: unknown): NormalizedAnnotation[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map(normalizeAnnotation)
    .filter((item): item is NormalizedAnnotation => item !== null)
}

function normalizeSuggestedLabelIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(Number).filter(Number.isFinite)
}

function resolveTaskImageUrl(raw: RawTask, nestedData: Record<string, unknown>): unknown {
  return firstDefined([
    raw.decodedFrameStreamPath,
    raw.decoded_frame_stream_path,
    nestedData.decodedFrameStreamPath,
    nestedData.decoded_frame_stream_path,
    raw.imageUrl,
    raw.image_url,
    raw.frameStreamPath,
    raw.frame_stream_path,
    nestedData.imageUrl,
    nestedData.image_url,
    nestedData.frameStreamPath,
    nestedData.frame_stream_path
  ])
}

function coerceTask(raw: RawTask): AnnotationTask | null {
  const nestedData = isRecord(raw.data) ? raw.data : {}
  const frameId = Number(rawField(raw, 'frameId', 'frame_id'))
  const imageUrlRaw = resolveTaskImageUrl(raw, nestedData)
  const imageUrl = typeof imageUrlRaw === 'string' ? imageUrlRaw : null
  if (!Number.isFinite(frameId) || !imageUrl) {
    return null
  }

  const idRaw = firstDefined([raw.id, raw.taskId, raw.task_id])
  const frameFileTypeRaw = rawField(raw, 'frameFileType', 'frame_file_type')
  const annotationModeRaw = rawField(raw, 'annotationMode', 'annotation_mode')

  return {
    id:
      typeof idRaw === 'string' || typeof idRaw === 'number'
        ? String(idRaw)
        : createTaskId(frameId),
    data: {
      frameId,
      videoId: optionalFiniteNumber(rawField(raw, 'videoId', 'video_id')),
      frameNumber: optionalFiniteNumber(rawField(raw, 'frameNumber', 'frame_number')),
      relativePath: optionalTrimmedString(rawField(raw, 'relativePath', 'relative_path')),
      imageUrl,
      frameFileType:
        typeof frameFileTypeRaw === 'string' ? normalizeFrameFileType(frameFileTypeRaw) : undefined,
      existingExternalId: optionalNonEmptyString(
        rawField(raw, 'existingExternalId', 'existing_external_id')
      ),
      annotationMode: typeof annotationModeRaw === 'string' ? annotationModeRaw : undefined,
      datasetSelectionLabelId: optionalFiniteNumber(
        rawField(raw, 'datasetSelectionLabelId', 'dataset_selection_label_id')
      ),
      datasetSelectionLabelName: optionalTrimmedString(
        rawField(raw, 'datasetSelectionLabelName', 'dataset_selection_label_name')
      ),
      datasetSelectionSource: optionalTrimmedString(
        rawField(raw, 'datasetSelectionSource', 'dataset_selection_source')
      ),
      datasetBucket: optionalTrimmedString(rawField(raw, 'datasetBucket', 'dataset_bucket')),
      labelOptions: normalizeLabelOptions(rawField(raw, 'labelOptions', 'label_options')),
      manualAnnotations: normalizeAnnotationList(
        rawField(raw, 'manualAnnotations', 'manual_annotations')
      ),
      predictionAnnotations: normalizeAnnotationList(
        rawField(raw, 'predictionAnnotations', 'prediction_annotations')
      ),
      suggestedLabelIds: normalizeSuggestedLabelIds(
        rawField(raw, 'suggestedLabelIds', 'suggested_label_ids')
      )
    }
  }
}

function extractTaskList(payload: unknown): RawTask[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is RawTask => !!item && typeof item === 'object')
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const taskPayload = payload as Record<string, unknown>
  if (Array.isArray(taskPayload.tasks)) {
    return taskPayload.tasks.filter((item): item is RawTask => !!item && typeof item === 'object')
  }
  if (Array.isArray(taskPayload.results)) {
    return taskPayload.results.filter((item): item is RawTask => !!item && typeof item === 'object')
  }
  if (taskPayload.task && typeof taskPayload.task === 'object') {
    return [taskPayload.task as RawTask]
  }
  return [taskPayload]
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
  const informationSource = ref<AnnotationInformationSource>(
    normalizeInformationSource(loadStoredText(INFORMATION_SOURCE_STORAGE_KEY))
  )
  const frameFileType = ref<FrameFileType>(
    normalizeFrameFileType(loadStoredText(FRAME_FILE_TYPE_STORAGE_KEY))
  )
  const samplingStrategy = ref<AnnotationSamplingStrategy>(loadStoredSamplingStrategy())
  const predictionSegmentsOnly = ref<boolean>(loadStoredPredictionSegmentsOnly())
  const annotatorPrincipal = ref<string | null>(null)
  const taskQueue = ref<AnnotationTask[]>([])
  const reservedFrameIds = new Set<number>()
  let queueGeneration = 0
  const isInitialLoading = ref(false)
  const isPrefetching = ref(false)
  const lastError = ref<string | null>(null)
  const aiDatasetId = ref<string | null>(loadStoredText(AI_DATASET_ID_STORAGE_KEY))
  const aiDatasetName = ref<string | null>(loadStoredText(AI_DATASET_NAME_STORAGE_KEY))
  const aiDatasetType = ref<string | null>(loadStoredText(AI_DATASET_TYPE_STORAGE_KEY))
  const taskQuerySignature = computed(
    () =>
      `${taskMode.value}|${targetLabelName.value}|${filterLabelName.value ?? ''}|${
        informationSource.value
      }|${frameFileType.value}|${allowRandomFallback.value ? '1' : '0'}|${samplingStrategy.value}|${
        predictionSegmentsOnly.value ? '1' : '0'
      }|${aiDatasetId.value ?? ''}|${aiDatasetName.value ?? ''}|${
        aiDatasetType.value ?? ''
      }|${annotatorPrincipal.value ?? ''}`
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
  watch(frameFileType, (next) => {
    persistText(FRAME_FILE_TYPE_STORAGE_KEY, next)
  })
  watch(samplingStrategy, (next) => {
    persistText(SAMPLING_STRATEGY_STORAGE_KEY, next)
  })
  watch(predictionSegmentsOnly, (next) => {
    persistBoolean(PREDICTION_SEGMENTS_ONLY_STORAGE_KEY, next)
  })
  watch(aiDatasetId, (next) => {
    persistText(AI_DATASET_ID_STORAGE_KEY, next)
  })
  watch(aiDatasetName, (next) => {
    persistText(AI_DATASET_NAME_STORAGE_KEY, next)
  })
  watch(aiDatasetType, (next) => {
    persistText(AI_DATASET_TYPE_STORAGE_KEY, next)
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
    allowRandomFallback.value = enabled
  }

  function setInformationSource(source: string | null): void {
    informationSource.value = normalizeInformationSource(source?.trim() ?? null)
  }

  function setFrameFileType(fileType: string | null): void {
    frameFileType.value = normalizeFrameFileType(fileType)
  }

  function setSamplingStrategy(strategy: string | null): void {
    samplingStrategy.value = normalizeSamplingStrategy(strategy)
  }

  function setPredictionSegmentsOnly(enabled: boolean): void {
    predictionSegmentsOnly.value = enabled
  }

  function setAiDataset(
    datasetName: string | null,
    datasetType: string | null,
    datasetId: number | string | null = null
  ): void {
    aiDatasetId.value =
      datasetId !== null && String(datasetId).trim()
        ? String(datasetId).trim()
        : null
    aiDatasetName.value = datasetName?.trim() || null
    aiDatasetType.value = datasetType?.trim() || null
  }

  function setAnnotatorPrincipal(principal: string | null): void {
    annotatorPrincipal.value = principal?.trim() || null
  }

  async function hydrateAiDatasetDefaults(): Promise<void> {
    if (aiDatasetId.value !== null || aiDatasetName.value !== null || aiDatasetType.value !== null) {
      return
    }
    try {
      const settings = await fetchApplicationSettings()
      if (!settings.primaryAnnotationDatasetValid) {
        throw new Error(
          settings.primaryAnnotationDatasetError ||
            'No valid primary annotation dataset is configured.'
        )
      }
      if (settings.aiDatasetId === null) {
        throw new Error('No primary annotation dataset is configured.')
      }
      aiDatasetId.value = String(settings.aiDatasetId)
      aiDatasetName.value = settings.aiDatasetName?.trim() || null
      aiDatasetType.value = settings.aiDatasetType?.trim() || null
    } catch (error) {
      aiDatasetId.value = null
      aiDatasetName.value = null
      aiDatasetType.value = null
      throw error
    }
  }

  function buildTaskRequestParams(
    batchSize: number,
    mode: AnnotationTaskMode
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {
      limit: batchSize
    }

    if (selectedLabelGroupId.value) {
      params.label_group_id = selectedLabelGroupId.value
    }
    params.task_mode = mode
    const targetLabel = targetLabelName.value.trim()
    if (targetLabel) {
      params.target_label = targetLabel
    }
    params.information_source = informationSource.value
    params.information_source_name = informationSource.value
    params.frame_file_type = frameFileType.value
    if (annotatorPrincipal.value) {
      params.annotator = annotatorPrincipal.value
    }

    if (mode === 'filtered' && filterLabelName.value) {
      params.filter_label = filterLabelName.value
      params.previous_label = filterLabelName.value
    }

    if (aiDatasetId.value) {
      params.ai_dataset_id = aiDatasetId.value
    }
    if (aiDatasetName.value) {
      params.ai_dataset_name = aiDatasetName.value
    }
    if (aiDatasetType.value) {
      params.ai_dataset_type = aiDatasetType.value
    }
    params.dataset_frame_filter = samplingStrategy.value
    params.prediction_segments_only = predictionSegmentsOnly.value ? 'true' : 'false'

    return params
  }

  async function fetchTaskBatchFromApi(
    batchSize: number,
    mode: AnnotationTaskMode
  ): Promise<AnnotationTask[]> {
    const response = await axiosInstance.get(r(endpoints.annotation.randomTask), {
      params: buildTaskRequestParams(batchSize, mode)
    })
    return extractTaskList(response.data)
      .map((raw) => coerceTask(raw))
      .filter((task): task is AnnotationTask => task !== null)
  }

  function enqueueUniqueTasks(tasks: AnnotationTask[]): AnnotationTask[] {
    const uniqueTasks: AnnotationTask[] = []
    for (const task of tasks) {
      if (reservedFrameIds.has(task.data.frameId)) {
        continue
      }
      reservedFrameIds.add(task.data.frameId)
      uniqueTasks.push(task)
    }
    taskQueue.value.push(...uniqueTasks)
    return uniqueTasks
  }

  function currentTaskRequestSignature(): string {
    return `${selectedLabelGroupId.value ?? ''}|${taskQuerySignature.value}`
  }

  function isCurrentRequest(generation: number, signature: string): boolean {
    return generation === queueGeneration && signature === currentTaskRequestSignature()
  }

  function enqueueDummyTaskWhenQueueEmpty(generation: number, signature: string): AnnotationTask[] {
    if (!dummyTaskModeEnabled || taskQueue.value.length > 0) {
      return []
    }
    if (!isCurrentRequest(generation, signature)) {
      return []
    }
    const dummy = createDummyTask(selectedLabelGroupId.value)
    enqueueUniqueTasks([dummy])
    return [dummy]
  }

  async function fetchRandomFallback(
    batchSize: number,
    generation: number,
    signature: string
  ): Promise<{ current: boolean; tasks: AnnotationTask[] }> {
    try {
      const fallbackParsed = await fetchTaskBatchFromApi(batchSize, 'random')
      if (!isCurrentRequest(generation, signature)) {
        return { current: false, tasks: [] }
      }
      return { current: true, tasks: enqueueUniqueTasks(fallbackParsed) }
    } catch {
      return { current: true, tasks: [] }
    }
  }

  function getTaskBatchErrorMessage(error: unknown): string {
    const failure = isRecord(error) ? error : {}
    const response = isRecord(failure.response) ? failure.response : {}
    const data = isRecord(response.data) ? response.data : {}
    const candidates = [data.detail, data.error, failure.message]
    const message = candidates.find(
      (candidate): candidate is string => typeof candidate === 'string' && Boolean(candidate)
    )
    return message ?? 'Failed to fetch annotation tasks.'
  }

  async function fetchBatch(batchSize = 10): Promise<AnnotationTask[]> {
    if (!selectedLabelGroupId.value && dummyTaskModeEnabled) {
      selectedLabelGroupId.value = DEBUG_DUMMY_TASK_GROUP_ID
    }

    lastError.value = null
    let requestGeneration = queueGeneration
    let requestSignature = currentTaskRequestSignature()
    try {
      await hydrateAiDatasetDefaults()
      requestGeneration = queueGeneration
      requestSignature = currentTaskRequestSignature()
      let parsed = await fetchTaskBatchFromApi(batchSize, taskMode.value)
      if (!isCurrentRequest(requestGeneration, requestSignature)) {
        return []
      }

      if (taskMode.value === 'filtered' && allowRandomFallback.value && parsed.length === 0) {
        parsed = await fetchTaskBatchFromApi(batchSize, 'random')
        if (!isCurrentRequest(requestGeneration, requestSignature)) {
          return []
        }
      }

      const queuedTasks = enqueueUniqueTasks(parsed)
      return queuedTasks.length > 0
        ? queuedTasks
        : enqueueDummyTaskWhenQueueEmpty(requestGeneration, requestSignature)
    } catch (error: unknown) {
      if (!isCurrentRequest(requestGeneration, requestSignature)) {
        return []
      }
      if (taskMode.value === 'filtered' && allowRandomFallback.value) {
        const fallback = await fetchRandomFallback(batchSize, requestGeneration, requestSignature)
        if (!fallback.current) {
          return []
        }
        if (fallback.tasks.length > 0) {
          return fallback.tasks
        }
      }

      lastError.value = getTaskBatchErrorMessage(error)
      return enqueueDummyTaskWhenQueueEmpty(requestGeneration, requestSignature)
    }
  }

  async function prefetchIfNeeded(): Promise<void> {
    if (isPrefetching.value) {
      return
    }
    if (taskQueue.value.length >= 3) {
      return
    }

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
    queueGeneration += 1
    taskQueue.value = []
    reservedFrameIds.clear()
  }

  async function primeQueue(batchSize = 10): Promise<void> {
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
    frameFileType,
    samplingStrategy,
    predictionSegmentsOnly,
    aiDatasetId,
    aiDatasetName,
    aiDatasetType,
    annotatorPrincipal,
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
    setFrameFileType,
    setSamplingStrategy,
    setPredictionSegmentsOnly,
    setAiDataset,
    setAnnotatorPrincipal,
    hydrateAiDatasetDefaults,
    fetchBatch,
    prefetchIfNeeded,
    popNextTask,
    clearQueue,
    primeQueue
  }
})
