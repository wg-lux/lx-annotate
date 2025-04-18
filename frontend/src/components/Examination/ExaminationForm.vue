<template>
    <div class="examination-grid">
      <!-- Top: Select Examination -->
      <div class="exam-select">
        <label for="examSelect">Untersuchungstyp:</label>
        <select id="examSelect" v-model="selectedExamId" @change="onExamChange" class="form-select">
          <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
            {{ exam.name }}
          </option>
        </select>
      </div>
  
      <!-- Left: Categories list -->
      <div class="categories-panel">
        <h4>Kategorien</h4>
        <ul class="list-group">
          <li
            v-for="(label, key) in categoryLabels"
            :key="key"
            :class="['list-group-item', activeCategory === key ? 'active' : '']"
            @click="activeCategory = key"
          >
            {{ label }}
          </li>
        </ul>
      </div>
  
      <!-- Right: Options for active category -->
      <div class="options-panel">
        <div v-if="activeCategory === 'morphologyChoices'">
          <label>Morphologie Klassifikation wählen:</label>
          <select v-model="form.morphologyChoiceId" class="form-select">
            <option
              v-for="opt in subcategories.morphologyChoices"
              :key="opt.id"
              :value="opt.id"
            >
              {{ opt.name }}
            </option>
          </select>
        </div>
        <div v-else-if="activeCategory === 'locationChoices'">
          <label>Lokalisations Klassifikation wählen:</label>
          <select v-model="form.locationChoiceId" class="form-select">
            <option
              v-for="opt in subcategories.locationChoices"
              :key="opt.id"
              :value="opt.id"
            >
              {{ opt.name }}
            </option>
          </select>
        </div>
        <div v-else-if="activeCategory === 'interventions'">
          <label>Interventionen:</label>
          <div v-for="opt in subcategories.interventions" :key="opt.id" class="form-check">
            <input
              type="checkbox"
              :id="`int-${opt.id}`"
              v-model="form.selectedInterventions"
              :value="opt.id"
              class="form-check-input"
            />
            <label :for="`int-${opt.id}`" class="form-check-label">{{ opt.name }}</label>
          </div>
        </div>
        <div v-else-if="activeCategory === 'instruments'">
          <label>Instrumente:</label>
          <div v-for="opt in subcategories.instruments" :key="opt.id" class="form-check">
            <input
              type="checkbox"
              :id="`inst-${opt.id}`"
              v-model="form.selectedInstruments"
              :value="opt.id"
              class="form-check-input"
            />
            <label :for="`inst-${opt.id}`" class="form-check-label">{{ opt.name }}</label>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref, computed, onMounted } from 'vue';
  import { useExaminationStore } from '@/stores/examinationStore';
  import type { Examination, SubcategoryMap } from '@/stores/examinationStore';
  import { useReportService } from '@/api/reportService';

  export default defineComponent({
    setup() {
      const examStore = useExaminationStore();
      const reportService = useReportService();
  
      const examinations = ref<Examination[]>([]);
      const selectedExamId = ref<number | null>(null);
      const activeCategory = ref<keyof SubcategoryMap>('morphologyChoices');
  
      const form = ref({
        morphologyChoiceId: null as number | null,
        locationChoiceId: null as number | null,
        selectedInterventions: [] as number[],
        selectedInstruments: [] as number[],
      });
  
      async function loadExams() {
        examinations.value = await reportService.getExaminations();
        if (examinations.value.length) {
          selectedExamId.value = examinations.value[0].id;
          await onExamChange();
        }
      }
  
      async function onExamChange() {
        if (!selectedExamId.value) return;
        await examStore.fetchSubcategoriesForExam(selectedExamId.value);
        // reset form
        form.value = { morphologyChoiceId: null, locationChoiceId: null, selectedInterventions: [], selectedInstruments: [] };
      }
  
      const subcategories = computed((): SubcategoryMap => {
        return selectedExamId.value !== null
          ? examStore.getCategories(selectedExamId.value)
          : { morphologyChoices: [], locationChoices: [], interventions: [], instruments: [] };
      });
  
      const categoryLabels = {
        morphologyChoices: 'Morphologie',
        locationChoices: 'Lokalisierung',
        interventions: 'Interventionen',
        instruments: 'Instrumente',
      } as const;
  
      onMounted(loadExams);
  
      return {
        examinations,
        selectedExamId,
        activeCategory,
        form,
        subcategories,
        categoryLabels,
        onExamChange,
      };
    }
  });
  </script>
  
  <style scoped>
  .examination-grid {
    display: grid;
    grid-template-areas:
      "exam-select exam-select"
      "categories-panel options-panel";
    grid-template-columns: 1fr 2fr;
    gap: 1rem;
  }
  .exam-select {
    grid-area: exam-select;
  }
  .categories-panel {
    grid-area: categories-panel;
  }
  .options-panel {
    grid-area: options-panel;
  }
  </style>