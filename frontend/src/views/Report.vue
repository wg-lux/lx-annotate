<template>
    <div class="container-fluid py-4">
  
      <div class="row">
          <div class="col-12">       
              <h1>Befund</h1>
          </div>
          </div>
          <FindingGenerator />
      </div>
    </template>
  
  <script>
    import FindingGenerator from '@/components/CaseGenerator/FindingGeneratorDemo.vue';
  
    export default {
      name: 'Befund',
      components: {
          FindingGenerator
      },
      mounted() {
        console.log("----------------------------Report.vue has been loaded!---------------------");
      }
    };
    </script>
    
    <style>
    </style>
    