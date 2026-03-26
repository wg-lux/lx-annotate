<template>
  <div class="container-fluid py-4">
    <div class="row mb-3">
      <div class="col-12">
        <h4 class="mb-2">Frame Annotation</h4>
        <p class="text-sm text-muted mb-3">
          Basic frame-level annotation for random or filtered tasks.
        </p>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="label-group-id" class="form-label">Label Group</label>
        <select
          v-if="labelGroupOptions.length > 0"
          id="label-group-id"
          v-model="selectedLabelGroupId"
          class="form-select"
        >
          <option value="">Select label group</option>
          <option
            v-for="group in labelGroupOptions"
            :key="group.id"
            :value="group.id"
          >
            {{ group.name }} (ID: {{ group.id }})
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
            {{ isLoadingLabelGroups ? 'Loading groups...' : 'Reload Groups' }}
          </button>
          <small v-if="labelGroupOptions.length > 0" class="text-muted">
            {{ labelGroupOptions.length }} group(s) available
          </small>
          <small v-else class="text-muted">
            No groups discovered. You can enter a group ID manually.
          </small>
        </div>
        <small v-if="labelGroupLoadError" class="text-danger d-block mt-1">
          {{ labelGroupLoadError }}
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="task-mode" class="form-label">Task Source</label>
        <select
          id="task-mode"
          v-model="taskMode"
          class="form-select"
        >
          <option value="random">Random Frames</option>
          <option value="filtered">Filtered by Previous Label</option>
        </select>
        <small v-if="taskMode === 'random'" class="text-muted d-block mt-1">
          Random mode is active.
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="target-label-name" class="form-label">Label to Annotate</label>
        <input
          id="target-label-name"
          v-model.lazy="targetLabelName"
          type="text"
          class="form-control"
          placeholder="z. B. Polyp"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="information-source" class="form-label">Information Source</label>
        <input
          id="information-source"
          v-model.lazy="informationSource"
          type="text"
          class="form-control"
          placeholder="e.g. frame_annotation_frontend"
          list="information-source-options"
        />
        <datalist id="information-source-options">
          <option value="frame_annotation_frontend" />
          <option value="human_annotation" />
          <option value="model_prediction" />
        </datalist>
      </div>
      <div
        v-if="taskMode === 'filtered'"
        class="col-12 col-md-6 col-lg-4"
      >
        <label for="filter-label-name" class="form-label">Filter by Previous Label</label>
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
            Fallback to random frames when filtered query is empty
          </label>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-8">
        <div class="card frame-card">
          <div class="card-body">
            <div v-if="isLoadingTask" class="text-muted">Loading task...</div>
            <div v-else-if="!queueStore.selectedLabelGroupId" class="text-muted">
              Select a label group to start annotating.
            </div>
            <div v-else-if="!currentTask" class="text-muted">
              No annotation tasks available.
            </div>
            <template v-else>
              <div class="task-meta mb-2">
                <span class="badge bg-light text-dark me-2">Frame #{{ currentTask.data.frameId }}</span>
                <span class="badge bg-light text-dark">Task {{ currentTask.id }}</span>
              </div>
              <img
                :src="currentTask.data.imageUrl"
                class="img-fluid rounded border"
                alt="Frame to annotate"
              />
              <div class="mt-3 d-flex gap-2 flex-wrap">
                <button
                  class="btn btn-success"
                  :disabled="isSubmitting"
                  @click="submitChoice('present')"
                >
                  Mark Present
                </button>
                <button
                  class="btn btn-outline-secondary"
                  :disabled="isSubmitting"
                  @click="submitChoice('absent')"
                >
                  Mark Absent
                </button>
                <button
                  class="btn btn-outline-warning"
                  :disabled="isSubmitting"
                  @click="skipTask"
                >
                  Skip
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="col-12">
        <div v-if="errorMessage" class="alert alert-danger mb-0" role="alert">
          {{ errorMessage }}
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

const queueStore = useAnnotationQueueStore()
const authStore = useAuthKcStore()
const isLoadingTask = ref(false)
const isSubmitting = ref(false)
const currentTask = ref<ReturnType<typeof queueStore.popNextTask> | null>(null)
const errorMessage = ref<string | null>(null)
const isLoadingLabelGroups = ref(false)
const labelGroupLoadError = ref<string | null>(null)
const labelGroupOptions = ref<Array<{ id: string; name: string }>>([])

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

function getAnnotatorPrincipal(): string {
  const rawUser = authStore.user as Record<string, unknown> | null
  const sub =
    typeof rawUser?.sub === 'string'
      ? rawUser.sub.trim()
      : typeof rawUser?.oidcSub === 'string'
        ? rawUser.oidcSub.trim()
        : ''
  if (sub) return `oidc:${sub}`

  const username =
    typeof authStore.user?.username === 'string'
      ? authStore.user.username.trim()
      : ''
  if (username) return username
  return 'unknown'
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
  if (Array.isArray(obj.groups)) {
    return obj.groups.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  return []
}

function parseGroupOption(raw: Record<string, unknown>): { id: string; name: string } | null {
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

  return { id, name }
}

async function loadLabelGroups(): Promise<void> {
  isLoadingLabelGroups.value = true
  labelGroupLoadError.value = null
  try {
    const res = await axiosInstance.get(r(endpoints.media.videoLabelsList))
    const rows = extractListPayload(res.data)
    const byId = new Map<string, { id: string; name: string }>()
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
      'Failed to load label groups.'
  } finally {
    isLoadingLabelGroups.value = false
  }
}

async function loadNextTask(): Promise<void> {
  if (!queueStore.selectedLabelGroupId) {
    currentTask.value = null
    return
  }

  isLoadingTask.value = true
  errorMessage.value = null
  try {
    if (!queueStore.taskQueue.length) {
      await queueStore.fetchBatch(10)
    }
    currentTask.value = queueStore.popNextTask() ?? null
    if (!currentTask.value) {
      currentTask.value = null
    }
  } finally {
    isLoadingTask.value = false
  }
}

async function submitChoice(choice: 'present' | 'absent'): Promise<void> {
  if (!currentTask.value) return
  isSubmitting.value = true
  errorMessage.value = null
  const task = currentTask.value
  const targetLabel = (targetLabelName.value || 'Target Label').trim()
  const externalId =
    task.data.existingExternalId && task.data.existingExternalId.trim()
      ? task.data.existingExternalId
      : uuidv7()
  try {
    await axiosInstance.post(r(endpoints.annotation.bulkUpsert), [
      {
        frameId: task.data.frameId,
        choiceName: `${targetLabel}: ${choice}`,
        value: true,
        floatValue: null,
        informationSourceName: informationSource.value,
        annotator: getAnnotatorPrincipal(),
        externalAnnotationId: externalId,
        modelMetaId: null
      }
    ])
    await loadNextTask()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Failed to submit annotation.'
  } finally {
    isSubmitting.value = false
  }
}

async function skipTask(): Promise<void> {
  if (!currentTask.value) return
  isSubmitting.value = true
  errorMessage.value = null
  try {
    await axiosInstance.post(r(endpoints.annotation.skip), {
      frameId: currentTask.value.data.frameId,
      annotator: getAnnotatorPrincipal()
    })
    await loadNextTask()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Failed to skip task.'
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => [queueStore.selectedLabelGroupId, queueStore.taskQuerySignature],
  async () => {
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
</style>
