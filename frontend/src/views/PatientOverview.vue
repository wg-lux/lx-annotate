<template>
  <main
    class="container-fluid h-100 w-100 py-1 px-4"
    aria-label="Patientenübersicht mit Dokumenten, Medikation und Reporting"
  >
    <div class="row">
      <PatientDashboard />
    </div>
  </main>
</template>
<script setup>
import PatientDashboard from '@/components/Patients/PatientDashboard.vue'

defineOptions({ name: 'Patients' })

</script>

<style scoped></style>
