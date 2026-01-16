<template>
    <div class="anonymization-overview-page">
      <AnonymizationCorrectionComponent :fileId="1" mediaType="image" />
    </div>
  </template>
  
  <script setup lang="ts">
  import AnonymizationCorrectionComponent from '@/components/Anonymizer/AnonymizationCorrectionComponent.vue';
  import { ref } from 'vue';

  </script>
  <style scoped>
  .anonymization-overview-page {
    min-height: 100vh;
    background-color: #f8f9fa;
  }
  </style>