<script setup lang="ts">
import type { PredictionModelMeta } from '@/stores/videoStore'

defineProps<{
  models: readonly Readonly<PredictionModelMeta>[]
  running: boolean
  canRerun: boolean
  buttonLabel: string
}>()
const modelMode = defineModel<'local' | 'huggingface'>('modelMode', { required: true })
const modelMetaId = defineModel<number | null>('modelMetaId', { required: true })
const huggingFaceModelId = defineModel<string>('huggingFaceModelId', { required: true })
const emit = defineEmits<{ rerun: [] }>()

function formatPredictionModelOption(model: Readonly<PredictionModelMeta>): string {
  const activeSuffix = model.isActive ? ' · aktiv' : ''
  return `${model.modelName} / ${model.name} v${model.version}${activeSuffix}`
}
</script>

<template>
  <div class="prediction-rerun-controls mt-2 d-flex gap-2 flex-wrap align-items-center">
    <select
      v-model="modelMode"
      class="form-select form-select-sm model-mode-select"
    >
      <option value="local">Lokales KI-Modell</option>
      <option value="huggingface">Hugging Face</option>
    </select>

    <select
      v-if="modelMode === 'local'"
      v-model.number="modelMetaId"
      class="form-select form-select-sm prediction-model-select"
      :disabled="models.length === 0 || running"
    >
      <option :value="null">KI-Modell auswählen...</option>
      <option
        v-for="model in models"
        :key="model.id"
        :value="model.id"
      >
        {{ formatPredictionModelOption(model) }}
      </option>
    </select>

    <input
      v-else
      v-model.trim="huggingFaceModelId"
      class="form-control form-control-sm huggingface-model-input"
      placeholder="wg-lux/colo_segmentation_RegNetX800MF_base"
      :disabled="running"
    />

    <button
      class="btn btn-outline-primary"
      :disabled="!canRerun"
      @click="emit('rerun')"
    >
      {{ buttonLabel }}
    </button>
  </div>
</template>

<style scoped>
.prediction-rerun-controls .model-mode-select {
  max-width: 180px;
}

.prediction-rerun-controls .prediction-model-select,
.prediction-rerun-controls .huggingface-model-input {
  min-width: min(100%, 280px);
  max-width: 420px;
}
</style>
