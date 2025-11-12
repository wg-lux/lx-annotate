<!-- frontend/src/components/AuthCheck.vue -->
<template>
  <div v-if="ready && isAuth">
    <slot name="authenticated-content" />
  </div>
  <div v-else-if="ready && !isAuth">
    <slot name="unauthenticated-content">
      <!-- Fallback -->
      <p>Bitte melden Sie sich an…</p>
    </slot>
  </div>
  <div v-else>
    <!-- Loading state -->
    <slot name="loading">
      <p>Lädt…</p>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useAuthKcStore } from '@/stores/auth_kc'

const store = useAuthKcStore()
const { isAuthenticated } = storeToRefs(store)
const ready = ref(false)

onMounted(async () => {
  try {
    // If middleware redirected you to OIDC already, this won’t run until after login
    await store.loadBootstrap()
  } finally {
    ready.value = true
  }
})

const isAuth = isAuthenticated
</script>
