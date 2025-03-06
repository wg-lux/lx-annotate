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
    import FindingGenerator from '@/components/CaseGenerator/FindingGenerator.vue';
  
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
    @import url('https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900|Roboto+Slab:400,700');
    
    
    </style>
    