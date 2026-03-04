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
</script>
