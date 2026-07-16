<template>
  <div
    class="file-drop-zone border border-2 border-dashed rounded p-4 text-center position-relative"
    :class="{
      'border-primary bg-light': isDragOver,
      'border-secondary': !isDragOver,
      'border-danger': hasValidationError
    }"
    role="button"
    tabindex="0"
    @click="triggerFileInput"
    @keydown.enter.prevent="triggerFileInput"
    @keydown.space.prevent="triggerFileInput"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      multiple
      class="d-none"
      :accept="acceptedFileTypes"
      @change="handleFileSelect"
    />

    <div class="drop-zone-content">
      <i
        class="ni ni-cloud-upload-96 ni-3x mb-3"
        :class="isDragOver ? 'text-primary' : 'text-muted'"
      ></i>
      <div v-if="isDragOver" class="h5 text-primary">Datei hier loslassen...</div>
      <div v-else>
        <div class="h5 mb-2">Dateien hier ablegen oder klicken zum Auswählen</div>
        <p class="text-muted mb-0">Unterstützte Formate: PDF, MP4, JPG, PNG und weitere</p>
      </div>
    </div>

    <div v-if="hasValidationError" class="alert alert-danger mt-3 mb-0">
      <i class="ni ni-user-run me-2"></i>
      Bitte Datei auswählen oder hierher ziehen.
    </div>

    <div
      v-if="isUploading"
      class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
    >
      <div class="text-center">
        <div class="spinner-border text-primary mb-2" role="status">
          <span class="visually-hidden">Wird hochgeladen...</span>
        </div>
        <div class="fw-bold">Datei wird hochgeladen...</div>
      </div>
    </div>

    <div class="visually-hidden" aria-live="assertive" aria-atomic="true">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    acceptedFileTypes?: string
    isUploading?: boolean
  }>(),
  { acceptedFileTypes: '*', isUploading: false }
)

const emit = defineEmits<{
  'files-selected': [files: File[]]
}>()

const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const hasValidationError = ref(false)
const statusMessage = ref('')
const dragCounter = ref(0)
const isInteractive = computed(() => !props.isUploading)

function triggerFileInput(): void {
  if (isInteractive.value) fileInput.value?.click()
}

function processFiles(files: File[]): void {
  if (!files.length) {
    hasValidationError.value = true
    statusMessage.value = 'Keine Datei ausgewählt. Bitte versuchen Sie es erneut.'
    return
  }
  hasValidationError.value = false
  emit('files-selected', files)
  if (fileInput.value) fileInput.value.value = ''
}

function handleFileSelect(event: Event): void {
  const files = (event.target as HTMLInputElement).files
  if (files) processFiles(Array.from(files))
}

function handleDragEnter(event: DragEvent): void {
  if (!isInteractive.value) return
  dragCounter.value += 1
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  if (dragCounter.value === 1) isDragOver.value = true
}

function handleDragOver(event: DragEvent): void {
  if (!isInteractive.value) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function handleDragLeave(): void {
  if (!isInteractive.value) return
  dragCounter.value = Math.max(0, dragCounter.value - 1)
  if (dragCounter.value === 0) isDragOver.value = false
}

function handleDrop(event: DragEvent): void {
  if (!isInteractive.value) return
  dragCounter.value = 0
  isDragOver.value = false
  const files = event.dataTransfer?.files
  if (files) processFiles(Array.from(files))
}

defineExpose({
  triggerFileInput,
  clearValidationError: () => {
    hasValidationError.value = false
  }
})
</script>

<style scoped>
.file-drop-zone {
  min-height: 200px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.file-drop-zone:hover:not(.border-primary) {
  border-color: var(--bs-primary) !important;
  background-color: var(--bs-light);
}

.file-drop-zone:focus {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.drop-zone-content {
  pointer-events: none;
}
</style>
