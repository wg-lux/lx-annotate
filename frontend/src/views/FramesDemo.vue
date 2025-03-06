<template>
    <div class="container-fluid py-4">
  
      <div class="row">
          <div class="col-12">       
              <h1>Frame Annotation</h1>
          </div>
          </div>
          <Demo />
      </div>
</template>

<script>
import Demo from '@/components/SelectFrames/Demo.vue';

  
export default {
      name: 'Frames',
      components: {
          Demo
      },
    };

</script>

