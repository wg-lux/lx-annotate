<template>
    <div class="container-fluid py-4">
  
      <div class="row">
          <div class="col-12">       
              <h1>Neue Untersuchung</h1>
          </div>
          </div>
          <ExaminationGenerator />
      </div>
    </template>
  
  <script>
    import ExaminationGenerator from '@/components/RequirementReport/RequirementGenerator.vue';

    export default {
      name: 'Befund',
      components: {
          ExaminationGenerator
      },
    };
    </script>
    
    <style>
    </style>
    