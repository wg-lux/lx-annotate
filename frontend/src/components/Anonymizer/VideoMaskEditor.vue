<template>
  <div class="mb-3">
    <button type="button" class="btn btn-outline-primary" data-test="capture-mask-frame" @click="captureFrame">
      Standbild zum Zeichnen übernehmen
    </button>
    <p class="small text-muted mt-2">
      Im Originalvideo einen Frame wählen. Im Standbild den sichtbaren Endoskopbereich aufziehen;
      alles außerhalb wird maskiert. Das Bild wird nicht gespeichert.
    </p>
    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <canvas
      v-show="ready"
      ref="canvas"
      class="mask-frame"
      aria-label="Endoskopbereich auf dem Standbild zeichnen"
      @pointerdown="startBox"
      @pointermove="moveBox"
      @pointerup="finishBox"
      @pointercancel="cancelBox"
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { VideoMaskProfile } from '@/api/videoMasks'

type Point = { x: number; y: number }
type Mask = VideoMaskProfile['mask']
const props = defineProps<{ video: HTMLVideoElement | null; sourceKey: string }>()
const emit = defineEmits<{ selected: [mask: Mask] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const error = ref('')
let snapshot: HTMLCanvasElement | null = null
let start: Point | null = null
let selected: Mask | null = null
let pointer: number | null = null

const clearFrame = () => {
  snapshot = null
  start = null
  selected = null
  pointer = null
  ready.value = false
  const target = canvas.value
  target?.getContext('2d')?.clearRect(0, 0, target.width, target.height)
}
watch(() => props.sourceKey, clearFrame)
onUnmounted(clearFrame)

const captureFrame = () => {
  clearFrame()
  error.value = ''
  const video = props.video
  const target = canvas.value
  if (!video || !target || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    error.value = 'Zuerst einen geladenen Frame des Originalvideos auswählen.'
    return
  }
  video.pause()
  snapshot = document.createElement('canvas')
  snapshot.width = target.width = video.videoWidth
  snapshot.height = target.height = video.videoHeight
  try {
    const context = snapshot.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(video, 0, 0)
    ready.value = true
    paint(null)
  } catch {
    clearFrame()
    error.value = 'Das Standbild konnte nicht übernommen werden.'
  }
}

const point = (event: PointerEvent): Point | null => {
  const target = canvas.value
  if (!target) return null
  const bounds = target.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return null
  return {
    x: Math.max(0, Math.min(target.width, (event.clientX - bounds.left) * target.width / bounds.width)),
    y: Math.max(0, Math.min(target.height, (event.clientY - bounds.top) * target.height / bounds.height))
  }
}

const box = (end: Point): Mask | null => {
  if (!start || !snapshot) return null
  const x = Math.floor(Math.min(start.x, end.x))
  const y = Math.floor(Math.min(start.y, end.y))
  return {
    x, y, width: Math.ceil(Math.max(start.x, end.x)) - x,
    height: Math.ceil(Math.max(start.y, end.y)) - y,
    imageWidth: snapshot.width, imageHeight: snapshot.height
  }
}

const paint = (mask: Mask | null) => {
  const target = canvas.value
  const context = target?.getContext('2d')
  if (!target || !context || !snapshot) return
  context.clearRect(0, 0, target.width, target.height)
  context.drawImage(snapshot, 0, 0)
  if (!mask) return
  context.fillStyle = 'rgba(0, 0, 0, 0.7)'
  context.fillRect(0, 0, target.width, target.height)
  if (mask.width > 0 && mask.height > 0) {
    context.drawImage(snapshot, mask.x, mask.y, mask.width, mask.height, mask.x, mask.y, mask.width, mask.height)
    context.strokeStyle = '#00ff80'
    context.lineWidth = Math.max(2, target.width / 400)
    context.strokeRect(mask.x, mask.y, mask.width, mask.height)
  }
}

const startBox = (event: PointerEvent) => {
  if (!ready.value || event.button !== 0 || pointer !== null) return
  start = point(event)
  if (!start) return
  pointer = event.pointerId
  canvas.value?.setPointerCapture(pointer)
  error.value = ''
}
const moveBox = (event: PointerEvent) => {
  if (event.pointerId !== pointer) return
  const end = point(event)
  if (end) paint(box(end))
}
const finishBox = (event: PointerEvent) => {
  if (event.pointerId !== pointer) return
  const end = point(event)
  const mask = end ? box(end) : null
  canvas.value?.releasePointerCapture(event.pointerId)
  start = null
  pointer = null
  if (!mask || mask.width < 2 || mask.height < 2) {
    error.value = 'Einen Bereich mit mindestens 2 × 2 Pixeln aufziehen.'
    paint(selected)
    return
  }
  selected = mask
  paint(mask)
  emit('selected', mask)
}
const cancelBox = () => {
  start = null
  pointer = null
  paint(selected)
}
</script>

<style scoped>
.mask-frame { display: block; width: 100%; height: auto; touch-action: none; cursor: crosshair; }
</style>
