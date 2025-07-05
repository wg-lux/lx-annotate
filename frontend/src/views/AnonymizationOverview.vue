<template>
  <div class="anonymization-overview-page">
    <AnonymizationOverviewComponent />
  </div>
</template>

<script setup lang="ts">
import AnonymizationOverviewComponent from '@/components/Anonymizer/AnonymizationOverviewComponent.vue';
</script>

<style scoped>
.anonymization-overview-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}
</style>