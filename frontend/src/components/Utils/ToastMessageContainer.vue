<script setup lang="ts">
import { useToastStore } from '@/stores/toastStore'

import type { ToastStatus, Toast } from '@/stores/toastStore'
import { Teleport, Transition, TransitionGroup } from 'vue'

const toastStore = useToastStore()

/* ToastMessageContainer.vue
  Displays toast messages at the bottom right of the screen.
 * Uses Vue's Teleport and TransitionGroup for smooth animations.
 * Usage:
 * import { useToastStore } from '@/stores/useToastStore'
 * const toast = useToastStore()
 * function save() {
 * try {
 *   await api.saveForm()
 *   toast.success({ text: 'Saved!' })              // default 3 s
 * } catch (e) {
 *   toast.error({ text: 'Server error', timeout: 6000 }) // 6 s
 * }
 *}
 */

/* CSS-class & icon maps keep the template tidy */
const cls: Record<ToastStatus, string> = {
  success: 'bg-green-50 border-green-500 text-green-900',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
  error:   'bg-red-50   border-red-500   text-red-900',
  info:    'bg-slate-50 border-slate-400 text-slate-800'
}
const icon: Record<ToastStatus, string> = {
  success: '✓',  
  warning: '!',
  error:   '✕',
  info:    'ℹ︎'
}
</script>

<template>
  <!-- Render outside #app so it’s above every route -->
  <Teleport to="body">
    <!-- One wrapper div lets us animate the first toast, too -->
    <Transition name="fade">
      <ul
        v-if="toastStore.toasts.length"
        class="fixed bottom-4 right-4 flex flex-col gap-2 z-[1000]"
      >
        <TransitionGroup name="slide" tag="template">
          <li
            v-for="t in toastStore.toasts"
            :key="t.id"
            :class="[
              'flex items-start gap-2 rounded border px-4 py-2 shadow-lg w-72',
              cls[t.status]
            ]"
          >
            <span class="text-lg">{{ icon[t.status] }}</span>
            <span class="flex-1 break-words">{{ t.text }}</span>
          </li>
        </TransitionGroup>
      </ul>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* slide in from the right, fade helper ensures opacity 0→1 */
.slide-enter-from,
.slide-leave-to   { transform: translateX(120%); opacity: 0; }
.slide-enter-active,
.slide-leave-active { transition: all .25s ease; }

.fade-enter-from,
.fade-leave-to   { opacity: 0; }
.fade-enter-active,
.fade-leave-active { transition: opacity .2s ease; }
</style>
