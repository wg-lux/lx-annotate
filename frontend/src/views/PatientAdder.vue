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
  
  </style>
  