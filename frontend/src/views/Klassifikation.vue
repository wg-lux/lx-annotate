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
  import ClassificationComponent from '../components/VideoExamination/VideoClassification.vue';
  
  export default {
    name: 'ClassificationComponent',
    components: {
      FrameSelection
    }
  };
  </script>
  
  <style>
  </style>