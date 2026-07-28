<template>
    <div class="container-fluid h-100 w-100 py-1 px-4">
      <div class="row">
        <div class="col-12">
          <DashboardComponent />
        </div>
      </div>
    </div>

</template>

<script>
import DashboardComponent from '../components/Dashboard/DashboardComponent.vue';

export default {
name: 'Dashboard',
components: {
DashboardComponent
},
};
</script>

<style>

</style>
