<template>
  <main class="container-fluid h-100 w-100 py-3 px-4 export-page">
    <div class="btn-group mb-3" role="tablist" aria-label="Exportart">
      <button
        type="button"
        class="btn"
        :class="activeExport === 'cases' ? 'btn-primary' : 'btn-outline-primary'"
        role="tab"
        :aria-selected="activeExport === 'cases'"
        data-test="case-export-tab"
        @click="activeExport = 'cases'"
      >
        Fallliste
      </button>
      <button
        type="button"
        class="btn"
        :class="activeExport === 'segments' ? 'btn-primary' : 'btn-outline-primary'"
        role="tab"
        :aria-selected="activeExport === 'segments'"
        data-test="segment-export-tab"
        @click="activeExport = 'segments'"
      >
        Trainingsdaten
      </button>
    </div>

    <CaseStudyExcelExport v-if="activeExport === 'cases'" />
    <ExportAnnotations v-else />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CaseStudyExcelExport from '@/components/Export/CaseStudyExcelExport.vue'
import ExportAnnotations from '@/components/VideoExamination/ExportAnnotations.vue'

const activeExport = ref<'cases' | 'segments'>('cases')
</script>

<style scoped>
.export-page {
  max-width: 1600px;
}
</style>
