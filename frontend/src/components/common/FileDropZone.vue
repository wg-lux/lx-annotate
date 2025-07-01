<template>
  <div
    ref="dropZone"
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
    <!-- Hidden file input for maximum browser compatibility -->
    <input
      ref="fileInput"
      type="file"
      multiple
      class="d-none"
      @change="handleFileSelect"
      :accept="acceptedFileTypes"
    />

    <!-- Drop zone content -->
    <div class="drop-zone-content">
      <i 
        class="fas fa-cloud-upload-alt fa-3x mb-3"
        :class="isDragOver ? 'text-primary' : 'text-muted'"
      ></i>
      
      <div v-if="isDragOver" class="h5 text-primary">
        Datei hier loslassen...
      </div>
      <div v-else>
        <div class="h5 mb-2">
          Dateien hier ablegen oder klicken zum Auswählen
        </div>
        <p class="text-muted mb-0">
          Unterstützte Formate: PDF, MP4, JPG, PNG und weitere
        </p>
      </div>
    </div>

    <!-- Validation error message -->
    <div v-if="hasValidationError" class="alert alert-danger mt-3 mb-0">
      <i class="fas fa-exclamation-triangle me-2"></i>
      Bitte Datei auswählen oder hierher ziehen.
    </div>

    <!-- Loading indicator -->
    <div v-if="isUploading" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75">
      <div class="text-center">
        <div class="spinner-border text-primary mb-2" role="status">
          <span class="visually-hidden">Wird hochgeladen...</span>
        </div>
        <div class="fw-bold">Datei wird hochgeladen...</div>
      </div>
    </div>

    <!-- Accessibility status announcements -->
    <div 
      class="visually-hidden" 
      aria-live="assertive" 
      aria-atomic="true"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

// Props
interface Props {
  acceptedFileTypes?: string;
  isUploading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  acceptedFileTypes: '*',
  isUploading: false
});

const emit = defineEmits<{
  'files-selected': [files: File[]];
}>();

// Template refs
const dropZone = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();

// Reactive state
const isDragOver = ref(false);
const hasValidationError = ref(false);
const statusMessage = ref('');
const dragCounter = ref(0); // Track nested drag events

// Computed
const isInteractive = computed(() => !props.isUploading);

// Methods
const triggerFileInput = () => {
  if (!isInteractive.value) return;
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (files) {
    processFiles(Array.from(files));
  }
};

const handleDragEnter = (event: DragEvent) => {
  if (!isInteractive.value) return;
  
  dragCounter.value++;
  event.dataTransfer!.dropEffect = 'copy';
  
  if (dragCounter.value === 1) {
    isDragOver.value = true;
    statusMessage.value = 'Datei über der Drop-Zone. Loslassen zum Hochladen.';
  }
};

const handleDragOver = (event: DragEvent) => {
  if (!isInteractive.value) return;
  event.dataTransfer!.dropEffect = 'copy';
};

const handleDragLeave = (event: DragEvent) => {
  if (!isInteractive.value) return;
  
  dragCounter.value--;
  
  if (dragCounter.value === 0) {
    isDragOver.value = false;
    statusMessage.value = '';
  }
};

const handleDrop = (event: DragEvent) => {
  if (!isInteractive.value) return;
  
  dragCounter.value = 0;
  isDragOver.value = false;
  
  const files = event.dataTransfer?.files;
  if (files) {
    processFiles(Array.from(files));
    statusMessage.value = `${files.length} Datei(en) ausgewählt.`;
  }
};

const processFiles = (files: File[]) => {
  // Validate that at least one file was selected
  if (files.length === 0) {
    hasValidationError.value = true;
    statusMessage.value = 'Keine Datei ausgewählt. Bitte versuchen Sie es erneut.';
    return;
  }
  
  // Clear validation error
  hasValidationError.value = false;
  
  // Emit the files
  emit('files-selected', files);
  
  // Clear file input for next use
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// Expose public methods if needed
defineExpose({
  triggerFileInput,
  clearValidationError: () => {
    hasValidationError.value = false;
  }
});
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

.file-drop-zone.border-danger {
  background-color: var(--bs-danger-bg-subtle);
}

.file-drop-zone.border-primary {
  background-color: var(--bs-primary-bg-subtle);
}

/* Disable interactions when uploading */
.file-drop-zone:has(.spinner-border) {
  cursor: not-allowed;
  pointer-events: none;
}
</style>