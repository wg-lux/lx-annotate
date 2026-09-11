<template>
  <main class="container-fluid h-100 w-100 py-3 px-4 export-page">
    <div
      class="btn-group mb-3"
      role="tablist"
      aria-label="Exportart"
    >
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
        :class="activeExport === 'cohort' ? 'btn-primary' : 'btn-outline-primary'"
        role="tab"
        :aria-selected="activeExport === 'cohort'"
        data-test="cohort-export-tab"
        @click="activeExport = 'cohort'"
      >
        Studienkohorte
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
    <StudyCohortExcelExport v-else-if="activeExport === 'cohort'" />
    <ExportAnnotations v-else />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import CaseStudyExcelExport from '@/components/Export/CaseStudyExcelExport.vue'
import StudyCohortExcelExport from '@/components/Export/StudyCohortExcelExport.vue'
import ExportAnnotations from '@/components/VideoExamination/ExportAnnotations.vue'

type ExportMode = 'cases' | 'cohort' | 'segments'

const route = useRoute()
const requestedMode = route.query.mode
const activeExport = ref<ExportMode>(requestedMode === 'cohort' ? 'cohort' : 'cases')
</script>

<style scoped>
.export-page {
  max-width: 1600px;
}
</style>
