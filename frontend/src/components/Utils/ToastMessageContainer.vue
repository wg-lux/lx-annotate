<!-- components/ToastContainer.vue -->
<script setup lang="ts">
import { useToastStore } from '@/stores/toastStore'
const toastStore = useToastStore()
</script>

<template>
  <div
    class="toast-wrapper position-fixed top-0 end-0 p-3"
    style="z-index: 1080"
  >
    <div
      v-for="t in toastStore.toasts"
      :key="t.id"
      :class="['toast align-items-center text-white show', theme(t.status)]"
      role="alert"
    >
      <div class="d-flex">
        <div class="toast-body">{{ t.text }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function theme (s: 'success'|'warning'|'error'|'info') {
  return ({
    success : 'bg-success',
    warning : 'bg-warning text-dark',
    error   : 'bg-danger',
    info    : 'bg-info text-dark'
  } as const)[s]
}
</script>

<style scoped>
.toast { min-width: 260px; }
</style>
