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
import NavbarComponent from '../components/NavbarComponent.vue';
import SidebarComponent from '../components/SidebarComponent.vue';
import DashboardComponent from '../components/DashboardComponent.vue';

export default {
name: 'Dashboard',
components: {
NavbarComponent,
SidebarComponent,
DashboardComponent
},
};
</script>

<style>

</style>
