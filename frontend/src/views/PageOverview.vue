<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <div class="row">
      <div class="col-12">
        <DashboardComponent />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardComponent from '../components/Dashboard/DashboardComponent.vue'

defineOptions({ name: 'Dashboard' })

</script>

<style></style>
