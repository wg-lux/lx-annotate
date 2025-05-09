<template>
  <div>
    <div class="main-content">
      <div class="container-fluid">
        <AnonymizationValidationContainer />
      </div>
    </div>
  </div>
</template>

<script>
import AnonymizationValidationContainer from '@/components/Anonymizer/AnonymizationValidationComponent.vue';

export default {
  name: 'ValidierungView',
  components: {
    AnonymizationValidationContainer,
  }
}
</script>

<style scoped>
.main-content {
  position: relative;
  margin-left: 260px;
  min-height: 100vh;
  padding: 1.5rem;
  transition: all 0.3s;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
</style>
