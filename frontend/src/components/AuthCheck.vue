<template>
  <div>
    <slot v-if="authStore.isAuthenticated" name="authenticated-content"></slot>
    <slot v-else name="unauthenticated-content"></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useAuthStore } from '@/stores/auth'

export default defineComponent({
  name: 'AuthCheck',
  setup() {
    const authStore = useAuthStore()
    return { authStore }
  }
})
</script>