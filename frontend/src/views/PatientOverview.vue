<template>
    <div class="container-fluid h-100 w-100 py-1 px-4">
      <div class="row">

        <PatientDashboard />
      </div>
    </div>
  </template>
  <script>
  import PatientDashboard from '@/components/Patients/PatientDashboard.vue';
  
  export default {
    name: 'Patients',
    components: {
        PatientDashboard,
    },
  };
  </script>
  
  <style>
  </style>