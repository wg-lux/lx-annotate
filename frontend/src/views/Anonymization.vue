<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <div class="row">
      <div class="col-12">    
        <h1>G-Play-Toolkit - Anonymisierung</h1>
        <p>Hier finden Sie die aktuell verfügbaren Anonymisierungen.</p>
      </div>
      <AnonymizationValidationComponent />
      <AnonymizationOverview />
    </div>
  </div>
</template>

<script>
import AnonymizationValidationComponent from '../components/Anonymizer/AnonymizationValidationComponent.vue';

export default {
  name: 'Anonymisierung',
  components: {
    AnonymizationValidationComponent,
  }
}
</script>