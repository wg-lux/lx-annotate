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
import VideoAnnotation from '../components/VideoAnnotation.vue';


export default {
name: 'Dashboard',
components: {
    VideoAnnotation
},
};
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900|Roboto+Slab:400,700');
@import url('../assets/css/material-dashboard.css?v=3.1.0');


</style>
