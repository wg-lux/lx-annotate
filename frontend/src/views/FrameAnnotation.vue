<template>
  <div class="container-fluid py-4">
    <div class="row mb-3">
      <div class="col-12">
        <h4 class="mb-2">Label Studio</h4>
        <p class="text-sm text-muted mb-3">
          Route für die Label-Studio-Annotation.
        </p>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="label-group-id" class="form-label">Label Group ID</label>
        <input
          id="label-group-id"
          v-model="selectedLabelGroupId"
          type="text"
          class="form-control"
          placeholder="z. B. 1"
        />
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

    <div class="row">
      <div class="col-12">
        <LabelStudioHost />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LabelStudioHost from '@/components/EndoAI/LabelStudioHost.vue'
import { useAnnotationQueueStore } from '@/stores/annotationQueue'

const queueStore = useAnnotationQueueStore()

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
</script>
