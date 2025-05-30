<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <div class="row">
      <div class="col-12">
        <FrameSelection />
      </div>
    </div>
  </div>
</template>

<script>
import FrameSelection from '../components/SelectFrames/FrameSelection.vue';

export default {
  name: 'FrameSelectionView',
  components: {
    FrameSelection
  }
};
</script>

<style>
</style>