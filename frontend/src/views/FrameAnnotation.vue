<template>
  <div class="container-fluid py-4">
    <div class="row mb-3">
      <div class="col-12">
        <h4 class="mb-2">Frame-Annotation</h4>
        <p class="text-sm text-muted mb-3">
          Einfache Frame-basierte Annotation für zufällige oder gefilterte Aufgaben.
        </p>
        <p
          v-if="queueStore.aiDatasetName && queueStore.aiDatasetType"
          class="text-sm text-primary mb-0"
        >
          Aktive KI-Datensatz-Warteschlange: {{ queueStore.aiDatasetName }} ({{ queueStore.aiDatasetType }})
        </p>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="label-group-id" class="form-label">Label-Gruppe</label>
        <select
          v-if="labelGroupOptions.length > 0"
          id="label-group-id"
          v-model="selectedLabelGroupId"
          class="form-select"
        >
          <option value="">Label-Gruppe auswählen</option>
          <option
            v-for="group in labelGroupOptions"
            :key="group.id"
            :value="group.id"
          >
            {{ group.displayName }} (ID: {{ group.id }})
          </option>
        </select>
        <input
          v-else
          id="label-group-id"
          v-model="selectedLabelGroupId"
          type="text"
          class="form-control"
          placeholder="e.g. 1"
        />
        <div class="d-flex align-items-center gap-2 mt-2">
          <button
            class="btn btn-outline-secondary btn-sm mb-0"
            :disabled="isLoadingLabelGroups"
            @click="loadLabelGroups"
          >
            {{ isLoadingLabelGroups ? 'Gruppen werden geladen...' : 'Gruppen neu laden' }}
          </button>
          <small v-if="labelGroupOptions.length > 0" class="text-muted">
            {{ labelGroupOptions.length }} Gruppe(n) verfügbar
          </small>
          <small v-else class="text-muted">
            Keine Gruppen gefunden. Sie können eine Gruppen-ID manuell eingeben.
          </small>
        </div>
        <small v-if="labelGroupLoadError" class="text-danger d-block mt-1">
          {{ labelGroupLoadError }}
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="task-mode" class="form-label">Aufgabenquelle</label>
        <select
          id="task-mode"
          v-model="taskMode"
          class="form-select"
        >
          <option value="random">Zufällige Frames</option>
          <option value="filtered">Nach vorherigem Label gefiltert</option>
        </select>
        <small v-if="taskMode === 'random'" class="text-muted d-block mt-1">
          Zufallsmodus ist aktiv.
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="target-label-name" class="form-label">Zu annotierendes Label</label>
        <input
          id="target-label-name"
          v-model.lazy="targetLabelName"
          type="text"
          class="form-control"
          placeholder="Optional, z. B. polyp"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="information-source" class="form-label">Informationsquelle</label>
        <input
          id="information-source"
          v-model.lazy="informationSource"
          type="text"
          class="form-control"
          placeholder="manual_annotation"
          list="information-source-options"
        />
        <datalist id="information-source-options">
          <option value="manual_annotation" />
          <option value="human_annotation" />
          <option value="frame_annotation_frontend" />
          <option value="model_prediction" />
        </datalist>
      </div>
      <div class="col-12 col-lg-8">
        <label for="frame-annotator-override" class="form-label">Annotator-Scope</label>
        <div class="d-flex flex-wrap gap-2">
          <input
            id="frame-annotator-override"
            v-model.trim="annotatorOverrideInput"
            type="text"
            class="form-control annotator-override-input"
            data-test="annotator-override-input"
            :placeholder="baseAnnotatorPrincipal"
          />
          <button
            type="button"
            class="btn btn-outline-primary mb-0"
            :disabled="isSubmitting || !canApplyAnnotatorOverride"
            data-test="annotator-override-apply"
            @click="restartAnnotationAsOverride"
          >
            Annotation als anderer Nutzer neu starten
          </button>
          <button
            v-if="isAnnotatorOverrideActive"
            type="button"
            class="btn btn-outline-secondary mb-0"
            :disabled="isSubmitting"
            data-test="annotator-override-revert"
            @click="revertAnnotatorOverride"
          >
            Zurück zu meinem Nutzer
          </button>
        </div>
        <small class="text-muted d-block mt-1">Aktiver Annotator: {{ activeAnnotatorLabel }}</small>
      </div>
      <div
        v-if="taskMode === 'filtered'"
        class="col-12 col-md-6 col-lg-4"
      >
        <label for="filter-label-name" class="form-label">Nach vorherigem Label filtern</label>
        <input
          id="filter-label-name"
          v-model.lazy="filterLabelName"
          type="text"
          class="form-control"
          placeholder="z. B. Blut"
        />
      </div>
      <div
        v-if="taskMode === 'filtered'"
        class="col-12 col-md-6 col-lg-4 d-flex align-items-end"
      >
        <div class="form-check mb-2">
          <input
            id="random-fallback"
            v-model="allowRandomFallback"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="random-fallback">
            Auf zufällige Frames zurückfallen, wenn der Filter keine Treffer liefert
          </label>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-8">
        <div class="card frame-card">
          <div class="card-body">
            <div v-if="isLoadingTask" class="text-muted">Aufgabe wird geladen...</div>
            <div v-else-if="!currentTask" class="text-muted">
              Keine Annotationsaufgaben verfügbar.
            </div>
            <template v-else>
              <div class="task-meta mb-2">
                <span class="badge bg-light text-dark me-2">Frame #{{ currentTask.data.frameId }}</span>
                <span class="badge bg-light text-dark">Aufgabe {{ currentTask.id }}</span>
              </div>
              <img
                :src="currentTask.data.imageUrl"
                class="img-fluid rounded border"
                alt="Zu annotierender Frame"
              />
              <div class="mt-3">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <h6 class="mb-0">Multilabel-Status</h6>
                  <button
                    class="btn btn-outline-primary btn-sm mb-0"
                    :disabled="isSubmitting"
                    @click="applySuggestedLabels"
                  >
                    KI-Vorschlag übernehmen
                  </button>
                </div>
                <div v-if="annotationLabelOptions.length === 0" class="text-muted">
                  Keine Labels für diese Frame-Aufgabe verfügbar.
                </div>
                <div v-else class="label-grid">
                  <label
                    v-for="label in annotationLabelOptions"
                    :key="label.id"
                    class="label-option border rounded p-2"
                  >
                    <div class="form-check mb-1">
                      <input
                        :id="`frame-label-${label.id}`"
                        v-model="selectedLabelIds"
                        class="form-check-input"
                        type="checkbox"
                        :value="label.id"
                      />
                      <span class="form-check-label">{{ label.name }}</span>
                    </div>
                    <div class="d-flex gap-1 flex-wrap">
                      <span
                        v-if="manualAnnotationState[label.id]?.value"
                        class="badge bg-success-subtle text-success-emphasis"
                      >
                        Manual
                      </span>
                      <span
                        v-else-if="manualAnnotationState[label.id]"
                        class="badge bg-secondary-subtle text-secondary-emphasis"
                      >
                        Manuell nein
                      </span>
                      <span
                        v-if="predictionAnnotationState[label.id]?.value"
                        class="badge bg-info-subtle text-info-emphasis"
                      >
                        KI
                        <template v-if="predictionAnnotationState[label.id]?.floatValue !== null">
                          {{ formatConfidence(predictionAnnotationState[label.id]?.floatValue) }}
                        </template>
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <div class="mt-3 d-flex gap-2 flex-wrap">
                <button
                  class="btn btn-success sidebar-action-button"
                  :disabled="isSubmitting"
                  @click="submitLabels"
                >
                  Labels speichern
                </button>
                <button
                  class="btn btn-outline-success sidebar-action-button"
                  :disabled="isSubmitting"
                  data-test="positive-example-button"
                  @click="submitPositiveExample"
                >
                  Positives Beispiel
                </button>
                <button
                  class="btn btn-outline-danger sidebar-action-button"
                  :disabled="isSubmitting"
                  data-test="negative-example-button"
                  @click="submitNegativeExample"
                >
                  Negatives Beispiel
                </button>
                <button
                  class="btn btn-outline-secondary sidebar-action-button"
                  :disabled="isSubmitting"
                  @click="clearSelectedLabels"
                >
                  Auswahl leeren
                </button>
                <button
                  class="btn btn-outline-warning sidebar-action-button"
                  :disabled="isSubmitting"
                  data-test="exclude-dataset-button"
                  @click="skipTask"
                >
                  Nicht im Datensatz aufnehmen
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="col-12">
        <div v-if="visibleErrorMessage" class="alert alert-danger mb-0" role="alert">
          {{ visibleErrorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { v7 as uuidv7 } from 'uuid'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import { useAnnotationQueueStore } from '@/stores/annotationQueue'
import { useAuthKcStore } from '@/stores/auth_kc'
import {
  clearAnnotatorOverride,
  getAnnotatorPrincipalFromAuthUser,
  loadAnnotatorOverride,
  saveAnnotatorOverride
} from '@/utils/annotationPrincipal'

interface LabelGroupOption {
  id: string
  name: string
  displayName: string
  version: number | null
  labelCount: number | null
}

const queueStore = useAnnotationQueueStore()
const authStore = useAuthKcStore()
const isLoadingTask = ref(false)
const isSubmitting = ref(false)
const currentTask = ref<ReturnType<typeof queueStore.popNextTask> | null>(null)
const selectedLabelIds = ref<number[]>([])
const errorMessage = ref<string | null>(null)
const isLoadingLabelGroups = ref(false)
const labelGroupLoadError = ref<string | null>(null)
const labelGroupOptions = ref<LabelGroupOption[]>([])
const annotatorOverride = ref<string | null>(null)
const annotatorOverrideInput = ref('')
let isReloadingAnnotationQueue = false

const selectedLabelGroupId = computed({
  get: () => queueStore.selectedLabelGroupId ?? '',
  set: (value: string) => queueStore.setSelectedLabelGroupId(value.trim() || null)
})

const taskMode = computed({
  get: () => queueStore.taskMode,
  set: (value: string) => queueStore.setTaskMode(value === 'filtered' ? 'filtered' : 'random')
})

const targetLabelName = computed({
  get: () => queueStore.targetLabelName,
  set: (value: string) => queueStore.setTargetLabelName(value)
})

const filterLabelName = computed({
  get: () => queueStore.filterLabelName ?? '',
  set: (value: string) => queueStore.setFilterLabelName(value.trim() || null)
})

const allowRandomFallback = computed({
  get: () => queueStore.allowRandomFallback,
  set: (value: boolean) => queueStore.setAllowRandomFallback(value)
})

const informationSource = computed({
  get: () => queueStore.informationSource,
  set: (value: string) => queueStore.setInformationSource(value)
})

const annotationLabelOptions = computed(() => currentTask.value?.data.labelOptions ?? [])
const visibleErrorMessage = computed(() => errorMessage.value || queueStore.lastError)
const baseAnnotatorPrincipal = computed(() =>
  getAnnotatorPrincipalFromAuthUser(authStore.user as Record<string, unknown> | null)
)
const annotatorOverrideScope = computed(
  () => `frame:${queueStore.selectedLabelGroupId ?? 'all'}:${informationSource.value}`
)
const activeAnnotatorPrincipal = computed(
  () => annotatorOverride.value || baseAnnotatorPrincipal.value
)
const isAnnotatorOverrideActive = computed(() => annotatorOverride.value !== null)
const canApplyAnnotatorOverride = computed(() => {
  const normalized = annotatorOverrideInput.value.trim()
  return (
    !!normalized &&
    normalized !== activeAnnotatorPrincipal.value &&
    normalized !== baseAnnotatorPrincipal.value
  )
})
const activeAnnotatorLabel = computed(() =>
  isAnnotatorOverrideActive.value
    ? `${activeAnnotatorPrincipal.value} (Override)`
    : activeAnnotatorPrincipal.value
)

const manualAnnotationState = computed(() =>
  Object.fromEntries(
    (currentTask.value?.data.manualAnnotations ?? []).map((annotation) => [
      annotation.labelId,
      annotation
    ])
  )
)

const predictionAnnotationState = computed(() =>
  Object.fromEntries(
    (currentTask.value?.data.predictionAnnotations ?? []).map((annotation) => [
      annotation.labelId,
      annotation
    ])
  )
)

function syncSelectedLabelsFromTask(task: typeof currentTask.value): void {
  if (!task) {
    selectedLabelIds.value = []
    return
  }
  const manualSelected = (task.data.manualAnnotations ?? [])
    .filter((annotation) => annotation.value)
    .map((annotation) => annotation.labelId)
  if (manualSelected.length > 0) {
    selectedLabelIds.value = [...new Set(manualSelected)]
    return
  }
  selectedLabelIds.value = [...new Set(task.data.suggestedLabelIds ?? [])]
}

function clearSelectedLabels(): void {
  selectedLabelIds.value = []
}

function applySuggestedLabels(): void {
  selectedLabelIds.value = [...new Set(currentTask.value?.data.suggestedLabelIds ?? [])]
}

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return `${Math.round(value * 100)}%`
}

function syncAnnotatorOverrideFromStorage(): void {
  annotatorOverride.value = loadAnnotatorOverride(
    annotatorOverrideScope.value,
    baseAnnotatorPrincipal.value
  )
  annotatorOverrideInput.value = annotatorOverride.value ?? ''
}

function applyActiveAnnotatorToQueue(): void {
  queueStore.setAnnotatorPrincipal?.(activeAnnotatorPrincipal.value)
}

async function reloadAnnotationQueue(): Promise<void> {
  isReloadingAnnotationQueue = true
  try {
    queueStore.clearQueue()
    await loadNextTask()
  } finally {
    isReloadingAnnotationQueue = false
  }
}

async function restartAnnotationAsOverride(): Promise<void> {
  const normalized = annotatorOverrideInput.value.trim()
  if (!normalized) return
  saveAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value, normalized)
  annotatorOverride.value = normalized
  await reloadAnnotationQueue()
}

async function revertAnnotatorOverride(): Promise<void> {
  clearAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value)
  annotatorOverride.value = null
  annotatorOverrideInput.value = ''
  await reloadAnnotationQueue()
}

function extractListPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.results)) {
    return obj.results.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.labels)) {
    return obj.labels.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.labelSets)) {
    return obj.labelSets.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.label_sets)) {
    return obj.label_sets.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.groups)) {
    return obj.groups.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  return []
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseGroupOption(raw: Record<string, unknown>): LabelGroupOption | null {
  const nestedLabelGroup =
    raw.labelGroup && typeof raw.labelGroup === 'object'
      ? (raw.labelGroup as Record<string, unknown>)
      : raw.label_group && typeof raw.label_group === 'object'
        ? (raw.label_group as Record<string, unknown>)
        : null

  const groupIdRaw =
    raw.labelGroupId ??
    raw.label_group_id ??
    raw.groupId ??
    raw.group_id ??
    nestedLabelGroup?.id ??
    raw.id
  if (
    groupIdRaw === null ||
    groupIdRaw === undefined ||
    (typeof groupIdRaw !== 'string' && typeof groupIdRaw !== 'number')
  ) {
    return null
  }

  const id = String(groupIdRaw).trim()
  if (!id) return null

  const nameRaw =
    raw.labelGroupName ??
    raw.label_group_name ??
    raw.groupName ??
    raw.group_name ??
    nestedLabelGroup?.name ??
    raw.name
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : `Group ${id}`
  const version = parseOptionalNumber(raw.version ?? nestedLabelGroup?.version)
  const labelCount = parseOptionalNumber(
    raw.labelCount ??
      raw.label_count ??
      nestedLabelGroup?.labelCount ??
      nestedLabelGroup?.label_count
  )
  const displayParts = [name]
  if (version !== null) displayParts.push(`v${version}`)
  if (labelCount !== null) displayParts.push(`${labelCount} Labels`)

  return { id, name, version, labelCount, displayName: displayParts.join(' - ') }
}

async function loadLabelGroups(): Promise<void> {
  isLoadingLabelGroups.value = true
  labelGroupLoadError.value = null
  try {
    const res = await axiosInstance.get(r(endpoints.media.videoLabelSetsList))
    const rows = extractListPayload(res.data)
    const byId = new Map<string, LabelGroupOption>()
    for (const row of rows) {
      const parsed = parseGroupOption(row)
      if (!parsed) continue
      if (!byId.has(parsed.id)) {
        byId.set(parsed.id, parsed)
      }
    }
    labelGroupOptions.value = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

    if (!selectedLabelGroupId.value && labelGroupOptions.value.length > 0) {
      selectedLabelGroupId.value = labelGroupOptions.value[0].id
    }
  } catch (error: any) {
    labelGroupOptions.value = []
    labelGroupLoadError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Label-Gruppen konnten nicht geladen werden.'
  } finally {
    isLoadingLabelGroups.value = false
  }
}

async function loadNextTask(): Promise<void> {
  isLoadingTask.value = true
  errorMessage.value = null
  try {
    applyActiveAnnotatorToQueue()
    if (!queueStore.taskQueue.length) {
      await queueStore.fetchBatch(10)
    }
    currentTask.value = queueStore.popNextTask() ?? null
    syncSelectedLabelsFromTask(currentTask.value)
    if (!currentTask.value && queueStore.lastError) {
      errorMessage.value = queueStore.lastError
    }
  } catch (error: any) {
    currentTask.value = null
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Aufgabe konnte nicht geladen werden.'
  } finally {
    isLoadingTask.value = false
  }
}

function getTargetLabelId(task: NonNullable<typeof currentTask.value>): number | null {
  const targetLabel = queueStore.targetLabelName.trim().toLowerCase()
  if (!targetLabel) return null

  const match = (task.data.labelOptions ?? []).find(
    (label) => label.name.trim().toLowerCase() === targetLabel
  )
  return match?.id ?? null
}

async function submitLabelsWithSelection(selectedIds: number[]): Promise<void> {
  if (!currentTask.value) return
  const task = currentTask.value
  const labelOptions = task.data.labelOptions ?? []
  if (labelOptions.length === 0) {
    errorMessage.value = 'Für diesen Frame sind keine Labels verfügbar.'
    return
  }
  isSubmitting.value = true
  errorMessage.value = null
  const selectedSet = new Set(selectedIds)
  try {
    await axiosInstance.post(
      r(endpoints.annotation.bulkUpsert),
      labelOptions.map((label) => {
        const existingManual = (task.data.manualAnnotations ?? []).find(
          (annotation) => annotation.labelId === label.id
        )
        return {
          frameId: task.data.frameId,
          labelId: label.id,
          value: selectedSet.has(label.id),
          floatValue: null,
          informationSourceName: informationSource.value,
          annotator: activeAnnotatorPrincipal.value,
          externalAnnotationId:
            existingManual?.externalAnnotationId ||
            (task.data.existingExternalId && task.data.existingExternalId.trim()
              ? `${task.data.existingExternalId}:${label.id}`
              : uuidv7()),
          modelMetaId: null
        }
      })
    )
    await loadNextTask()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Annotation konnte nicht gespeichert werden.'
  } finally {
    isSubmitting.value = false
  }
}

async function submitLabels(): Promise<void> {
  await submitLabelsWithSelection(selectedLabelIds.value)
}

async function submitPositiveExample(): Promise<void> {
  if (!currentTask.value) return
  const targetLabelId = getTargetLabelId(currentTask.value)
  if (targetLabelId === null) {
    errorMessage.value = `Ziel-Label "${queueStore.targetLabelName}" ist für diesen Frame nicht verfügbar.`
    return
  }

  const nextSelection = new Set(selectedLabelIds.value)
  nextSelection.add(targetLabelId)
  selectedLabelIds.value = [...nextSelection]
  await submitLabelsWithSelection(selectedLabelIds.value)
}

async function submitNegativeExample(): Promise<void> {
  if (!currentTask.value) return
  const targetLabelId = getTargetLabelId(currentTask.value)
  if (targetLabelId === null) {
    errorMessage.value = `Ziel-Label "${queueStore.targetLabelName}" ist für diesen Frame nicht verfügbar.`
    return
  }

  const nextSelection = new Set(selectedLabelIds.value)
  nextSelection.delete(targetLabelId)
  selectedLabelIds.value = [...nextSelection]
  await submitLabelsWithSelection(selectedLabelIds.value)
}

async function skipTask(): Promise<void> {
  if (!currentTask.value) return
  isSubmitting.value = true
  errorMessage.value = null
  try {
    await axiosInstance.post(r(endpoints.annotation.skip), {
      frameId: currentTask.value.data.frameId,
      annotator: activeAnnotatorPrincipal.value
    })
    await loadNextTask()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Aufgabe konnte nicht übersprungen werden.'
  } finally {
    isSubmitting.value = false
  }
}

watch(
  [baseAnnotatorPrincipal, annotatorOverrideScope],
  () => {
    syncAnnotatorOverrideFromStorage()
    applyActiveAnnotatorToQueue()
  },
  { immediate: true }
)

watch(
  () => currentTask.value?.id,
  () => {
    syncSelectedLabelsFromTask(currentTask.value)
  }
)

watch(
  () => [queueStore.selectedLabelGroupId, queueStore.taskQuerySignature],
  async () => {
    if (isReloadingAnnotationQueue) return
    queueStore.clearQueue()
    await loadNextTask()
  }
)

onMounted(async () => {
  await loadLabelGroups()
  await loadNextTask()
})
</script>

<style scoped>
.frame-card {
  min-height: 320px;
}

.task-meta {
  font-size: 0.875rem;
}

.label-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.label-option {
  background: #fff;
}

.annotator-override-input {
  max-width: 320px;
}

/* Match the rounded/outlined interaction feel used by sidebar nav links. */
.sidebar-action-button {
  border-radius: 0.5rem;
  border-width: 1px;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.sidebar-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}

.sidebar-action-button:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 1px;
}
</style>
