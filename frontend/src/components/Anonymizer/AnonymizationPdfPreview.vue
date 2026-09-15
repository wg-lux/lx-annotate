<template>
  <div class="pdf-preview" :class="variant">
    <h6 class="text-center mb-3" :class="presentation.textClass">
      <i class="ni me-1" :class="presentation.icon"></i>
      {{ presentation.heading }}
    </h6>
    <iframe
      :src="src"
      class="pdf-frame"
      width="100%"
      height="700px"
      frameborder="0"
      :title="presentation.title"
    >
      Ihr Browser unterstützt keine eingebetteten PDFs.
    </iframe>
    <div class="mt-2 text-center">
      <a v-if="src" class="btn btn-sm" :class="presentation.buttonClass" :href="src" target="_blank" rel="noopener noreferrer">
        {{ presentation.openLabel }}
      </a>
    </div>
    <div class="mt-2 text-center">
      <small class="text-muted">URL: {{ src || 'Nicht verfügbar' }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  src: string | undefined
  variant: 'original' | 'anonymized'
}>()

const presentations = {
  original: {
    textClass: 'text-danger',
    icon: 'ni-single-copy-04',
    heading: 'Original PDF (Raw)',
    title: 'Original PDF Vorschau',
    buttonClass: 'btn-outline-danger',
    openLabel: 'Original-PDF öffnen'
  },
  anonymized: {
    textClass: 'text-success',
    icon: 'ni-check-bold',
    heading: 'Anonymisiertes PDF (Processed)',
    title: 'Anonymisiertes PDF Vorschau',
    buttonClass: 'btn-outline-success',
    openLabel: 'Anonymisiertes PDF öffnen'
  }
}

const presentation = computed(() => presentations[props.variant])
</script>

<style scoped>
.pdf-preview {
  border: 1px solid;
  border-radius: 0.375rem;
  padding: 1rem;
}

.original {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.anonymized {
  border-color: #198754;
  background-color: #f0fff4;
}

.pdf-frame {
  border: 2px solid;
  border-color: inherit;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
