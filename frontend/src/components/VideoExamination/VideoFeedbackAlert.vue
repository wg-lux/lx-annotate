<template>
  <div
    class="alert alert-dismissible fade show"
    :class="presentation.alertClass"
    :role="presentation.role"
  >
    <i
      class="ni me-2"
      :class="presentation.iconClass"
    ></i>
    <strong>{{ heading }}</strong> {{ message }}
    <button
      type="button"
      class="btn-close"
      aria-label="Close"
      @click="emit('dismiss')"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  message: string
  heading: string
  tone: 'danger' | 'info' | 'success' | 'hint'
}>()
const emit = defineEmits<{ dismiss: [] }>()
const tones = {
  danger: { alertClass: 'alert-danger', role: 'alert', iconClass: 'ni-settings-gear-65' },
  info: { alertClass: 'alert-info hint-alert', role: 'status', iconClass: 'ni-bulb-61' },
  hint: { alertClass: 'alert-info hint-alert', role: 'status', iconClass: 'ni-bulb-61' },
  success: { alertClass: 'alert-success', role: 'alert', iconClass: 'ni-check-bold' }
} as const
const presentation = computed(() => tones[props.tone])
</script>

<style scoped>
.hint-alert {
  border-color: #b6effb;
  color: #055160;
  background: #cff4fc;
}
</style>
