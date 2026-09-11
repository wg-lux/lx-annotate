<!-- frontend/src/components/AuthCheck.vue -->
<template>
  <div
    v-if="failed"
    role="alert"
  >
    <slot name="error">
      <p>Die Anmeldung konnte nicht geprüft werden. Bitte laden Sie die Seite erneut.</p>
    </slot>
  </div>
  <div v-else-if="ready && isAuth">
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
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const store = useAuthKcStore()
const { isAuthenticated } = storeToRefs(store)
const ready = ref(false)
const failed = ref(false)
const logger = createRuntimeLogger('auth-check')

onMounted(async () => {
  try {
    // If middleware redirected you to OIDC already, this won’t run until after login
    await store.loadBootstrap()
  } catch (error: unknown) {
    failed.value = true
    logger.error('bootstrap.failed', error)
  } finally {
    ready.value = true
  }
})

const isAuth = isAuthenticated
</script>
