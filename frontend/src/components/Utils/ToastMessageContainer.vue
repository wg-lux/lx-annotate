<!-- components/ToastContainer.vue -->
<script setup lang="ts">
import { useToastStore, type ToastStatus } from '@/stores/toastStore'
const toastStore = useToastStore()

function theme(status: ToastStatus) {
  return (
    {
      success: 'bg-success',
      warning: 'bg-warning text-dark',
      error: 'bg-danger',
      info: 'bg-info text-dark'
    } as const
  )[status]
}
</script>

<template>
  <div
    class="toast-wrapper position-fixed top-0 end-0 p-3"
    style="z-index: 1080"
  >
    <div
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      :class="['toast align-items-center text-white show', theme(toast.status)]"
      role="alert"
    >
      <div class="d-flex">
        <div class="toast-body">{{ toast.text }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast {
  min-width: 260px;
}
</style>
