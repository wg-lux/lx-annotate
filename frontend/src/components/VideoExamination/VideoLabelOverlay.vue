<template>
  <div
    class="label-overlay"
    @click.self="emit('close')"
  >
    <div class="label-overlay-card">
      <div class="label-overlay-header">
        <span>Label auswählen</span>
        <button
          type="button"
          class="label-overlay-close"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="label-overlay-hint">↑/↓ wechseln · Enter übernehmen · Esc schließen</div>
      <div class="label-overlay-list">
        <button
          v-for="label in labels"
          :key="label.id"
          type="button"
          class="label-overlay-item"
          :class="{ active: label.name === selectedLabel }"
          @click="emit('select', label.name)"
        >
          {{ getTranslationForLabel(label.name) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getTranslationForLabel } from '@/utils/videoUtils'

defineProps<{ labels: readonly { id: number; name: string }[]; selectedLabel: string }>()
const emit = defineEmits<{ close: []; select: [name: string] }>()
</script>

<style scoped>
.label-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 2147483647;
}

.label-overlay-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  min-width: 260px;
  max-width: 70%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.label-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 4px;
}

.label-overlay-close {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.label-overlay-hint {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 8px;
}

.label-overlay-list {
  display: grid;
  gap: 6px;
  max-height: 45vh;
  overflow: auto;
}

.label-overlay-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  cursor: pointer;
}

.label-overlay-item.active {
  border-color: #0d6efd;
  background: #e7f1ff;
}
</style>
