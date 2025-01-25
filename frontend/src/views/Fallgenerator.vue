<template>
  <div class="container-fluid py-4">

    <div class="row">
        <div class="col-12">       
            <h1>Fallgenerator</h1>
            <p>Erstellen Sie hier Ihren eigenen Fall.</p>
        </div>
        </div>
        <CaseGenerator />
    </div>
  </template>

<script>
    import CaseGenerator from '../components/CaseGeneratorComponent.vue';

  export default {
    name: 'Fallgenerator',
    components: {
        CaseGenerator
    },
  };
  </script>
  
  <style>
  @import url('https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900|Roboto+Slab:400,700');
  @import url('../assets/css/material-dashboard.css?v=3.1.0');
  
  
  </style>
  