<template>

    <div class="container-fluid h-100 w-100 py-1 px-4">
      <div class="row">
        <div class="col-12">
          <VideoAnnotation />
        </div>
      </div>
    </div>

</template>

<script>
import VideoAnnotation from '../components/EndoAI/VideoAnnotation.vue';

export default {
name: 'VideoAnnotationView',
components: {
    VideoAnnotation,
},
};
</script>

<style>
</style>
