<template>
  <div v-if="frames.length" class="segment-frame-picker">
    <div class="frame-preview mb-2 text-center">
      <img
        v-if="currentFrame"
        :src="currentFrame.frameUrl || currentFrame.frame_url"
        :alt="`Frame ${currentIndex + 1}`"
        class="img-fluid rounded border"
        style="max-height: 220px; object-fit: contain;"
      />
      <div v-else class="text-muted">Keine Frames für dieses Segment</div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-2">
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="prev"
        :disabled="frames.length <= 1"
      >
        ◀ Vorheriger
      </button>

      <small class="text-muted">
        Frame {{ currentIndex + 1 }} / {{ frames.length }}
      </small>

      <button
        class="btn btn-outline-secondary btn-sm"
        @click="next"
        :disabled="frames.length <= 1"
      >
        Nächster ▶
      </button>
    </div>

    <div class="text-end">
      <button
        class="btn btn-primary btn-sm"
        @click="selectCurrent"
        :disabled="!currentFrame"
      >
        Diesen Frame für Bericht verwenden
      </button>
    </div>
  </div>

  <div v-else class="text-muted">
    Keine Frames für dieses Segment verfügbar.
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Segment, TimeSegmentFrame } from '@/stores/videoStore'

const props = defineProps<{
  segment: Segment | null
}>()

const emit = defineEmits<{
  (e: 'select', frame: TimeSegmentFrame): void
}>()

const currentIndex = ref(0)

/**
 * Convert the Segment.frames Record<string, TimeSegmentFrame>
 * into a sorted array, ordered by frameId.
 */
const frames = computed<TimeSegmentFrame[]>(() => {
  if (!props.segment?.frames) return []
  return Object.values(props.segment.frames).sort(
    (a, b) => a.frameId - b.frameId
  )
})

const currentFrame = computed<TimeSegmentFrame | null>(() => {
  if (!frames.value.length) return null
  return frames.value[currentIndex.value] ?? null
})

// Reset index whenever segment changes
watch(
  () => props.segment?.id,
  () => {
    currentIndex.value = 0
  }
)

function prev() {
  if (!frames.value.length) return
  currentIndex.value =
    (currentIndex.value - 1 + frames.value.length) % frames.value.length
}

function next() {
  if (!frames.value.length) return
  currentIndex.value = (currentIndex.value + 1) % frames.value.length
}

function selectCurrent() {
  if (currentFrame.value) {
    emit('select', currentFrame.value)
  }
}
</script>

<style scoped>
.segment-frame-picker {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 10px;
  background: #f8f9fa;
}
</style>
