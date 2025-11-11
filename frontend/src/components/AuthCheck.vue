<!-- frontend/src/components/AuthCheck.vue -->
<template>
  <div>
    <slot v-if="auth.isAuthenticated" name="authenticated-content"></slot>
    <slot v-else name="unauthenticated-content"></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useAuthKcStore } from '@/stores/auth_kc'

export default defineComponent({
  name: 'AuthCheck',
  setup() {
    const auth = useAuthKcStore()
    return { auth }
  }
})
</script>
