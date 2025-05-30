<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <VideoExaminationAnnotation />
  </div>
</template>

<script>
import VideoExaminationAnnotation from '@/components/VideoExamination/VideoExaminationAnnotation.vue';

export default {
  name: 'VideoExamination',
  components: {
    VideoExaminationAnnotation
  }
};
</script>

<style>
</style>