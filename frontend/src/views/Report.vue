<template>
    <div class="container-fluid py-4">
  
      <div class="row">
          <div class="col-12">       
              <h1>Befund</h1>
          </div>
          </div>
          <ExaminationGenerator />
      </div>
    </template>
  
  <script>
    import ExaminationGenerator from '@/components/Examination/ExaminationForm.vue';
  
    export default {
      name: 'Befund',
      components: {
          ExaminationGenerator
      },
      mounted() {
        console.log("----------------------------Report.vue has been loaded!---------------------");
      }
    };
    </script>
    
    <style>
    </style>
    