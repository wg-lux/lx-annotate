<template>
  <a v-if="returnTo" :href="returnTo" class="btn btn-outline-secondary" data-test="hub-recovery-return">Zurück zum Hub-Export</a>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const returnTo = computed(() => {
  const value = route?.query.returnTo
  return typeof value === 'string' && (value === '/hub-export' || value.startsWith('/hub-export?')) ? value : null
})
</script>
