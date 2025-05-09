<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <div class="row">
      <div class="col-12">    
        <h1>G-Play-Toolkit - Annotationen</h1>
        <p>Hier finden Sie die aktuell verfügbaren Annotationen.</p>
      </div>
      <ScrollingFrames />
      <AnnotationComponent />
    </div>
  </div>
</template>
<script>
import ScrollingFrames from '../components/SelectFrames/ScrollingFrames.vue';

export default {
  name: 'Annotationen',
  components: {
    ScrollingFrames,
  },
};
</script>

<style>
/* Add relevant styles here */
</style>