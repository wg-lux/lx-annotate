<template>
    <div class="anonymization-overview-page">
      <AnonymizationCorrectionComponent />
    </div>
  </template>
  
  <script setup lang="ts">
  import AnonymizationOverviewComponent from '@/components/Anonymizer/AnonymizationCorrectionComponent.vue';
  </script>
  
  <style scoped>
  .anonymization-overview-page {
    min-height: 100vh;
    background-color: #f8f9fa;
  }
  </style>