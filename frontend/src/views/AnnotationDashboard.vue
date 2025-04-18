<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <div class="row">
      <div class="col-12">    
        <h1>G-Play-Toolkit - Annotationen</h1>
        <p>Hier finden Sie die aktuell verfügbaren Annotationen.</p>
      </div>
      <AnnotationComponent />
      <VideoDashboard />
    </div>
  </div>
</template>
<script>
import AnnotationComponent from '@/components/Dashboard/AnnotationDashboard.vue';
import VideoDashboard from '@/components/EndoAI/VideoDashboard.vue';

export default {
  name: 'Annotationen',
  components: {
    AnnotationComponent,
    VideoDashboard,
  },
};
</script>

<style>
</style>