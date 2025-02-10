<template>
    <div class="container-fluid py-4">
    <div class="row">
        <div class="col-12">       
            <h1>Patient hinzufügen</h1>
        </div>
        </div>
        <PatientAdder />
    </div>
  </template>
  
  <script>
    import PatientAdder from '@/components/CaseGenerator/PatientAdder.vue';

  
  
  export default {
    name: 'Profil',
    components: {
        PatientAdder
    },
  };
  </script>
  
  <style>
  @import url('https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900|Roboto+Slab:400,700');
  @import url('../assets/css/material-dashboard.css?v=3.1.0');
  
  
  </style>
  