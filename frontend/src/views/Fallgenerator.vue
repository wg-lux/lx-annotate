<template>
  <div class="container-fluid py-4">

    <div class="row">
        <div class="col-12">       
            <h1>Fallgenerator</h1>
            <p>Erstellen Sie hier Ihren eigenen Fall.</p>
        </div>
        </div>
        <ReportOverview />
    </div>
  </template>

<script>
    import ReportOverview from '../components/CaseGenerator/PatientOverviewComponent.vue';

  export default {
    name: 'Fallgenerator',
    components: {
        ReportOverview
    },
  };
  </script>
  
  <style>
  
  
  </style>
  