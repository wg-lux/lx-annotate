<template>
  <div class="examination-view">
    <!-- HEADER ROW -->
    <div class="exam-header">
      <div class="exam-select">
        <label for="examSelect">Untersuchungstyp:</label>
        <select id="examSelect" v-model="selectedExamId" @change="onExamChange" class="form-select">
          <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
            {{ exam.name }}
          </option>
        </select>
        <!-- Refresh button -->
        <button @click="onExamChange" class="refresh-btn">🔄 Refresh</button>
      </div>
    </div>

    <!-- BODY ROW: Sidebar (categories) + Editor -->
    <div class="exam-body">
      <aside class="categories-panel">
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
      </aside>

      <section class="editor-panel">
        <!-- Dynamic editor for active category with colour cue -->
        <div class="category-editor" :class="colourMap[activeCategory]">
          <div v-if="activeCategory === 'morphologyChoices'">
            <label>Morphologie Klassifikation wählen:</label>
            <select v-model="tempSelection.morphologyChoiceId" class="form-select">
              <option v-for="opt in subcategories.morphologyChoices" :key="opt.id" :value="opt.id">
                {{ opt.name }}
              </option>
            </select>
          </div>
          <div v-else-if="activeCategory === 'locationChoices'">
            <label>Lokalisations Klassifikation wählen:</label>
            <select v-model="tempSelection.locationChoiceId" class="form-select">
              <option v-for="opt in subcategories.locationChoices" :key="opt.id" :value="opt.id">
                {{ opt.name }}
              </option>
            </select>
          </div>
          <div v-else-if="activeCategory === 'interventions'">
            <label>Interventionen:</label>
            <div v-for="opt in subcategories.interventions" :key="opt.id" class="form-check">
              <input type="checkbox" :id="`int-${opt.id}`" v-model="form.selectedInterventions" :value="opt.id" class="form-check-input" />
              <label :for="`int-${opt.id}`" class="form-check-label">{{ opt.name }}</label>
            </div>
          </div>
          <div v-else-if="activeCategory === 'instruments'">
            <label>Instrumente:</label>
            <div v-for="opt in subcategories.instruments" :key="opt.id" class="form-check">
              <input type="checkbox" :id="`inst-${opt.id}`" v-model="form.selectedInstruments" :value="opt.id" class="form-check-input" />
              <label :for="`inst-${opt.id}`" class="form-check-label">{{ opt.name }}</label>
            </div>
          </div>
        </div>

        <!-- Compact classification cards (always visible) -->
        <div class="card-container">
          <ClassificationCard label="Morphologie" :options="subcategories.morphologyChoices"
            v-model="form.selectedMorphologies"
            :tempValue="tempSelection.morphologyChoiceId"
            @update:tempValue="tempSelection.morphologyChoiceId = $event" compact />
          <ClassificationCard label="Lokalisierung" :options="subcategories.locationChoices"
            v-model="form.selectedLocations"
            :tempValue="tempSelection.locationChoiceId"
            @update:tempValue="tempSelection.locationChoiceId = $event" compact />
          <ClassificationCard label="Interventionen" :options="subcategories.interventions"
            v-model="form.selectedInterventions"
            :tempValue="tempSelection.interventionId"
            @update:tempValue="tempSelection.interventionId = $event" compact />
          <ClassificationCard label="Instrumente" :options="subcategories.instruments"
            v-model="form.selectedInstruments"
            :tempValue="tempSelection.instrumentId"
            @update:tempValue="tempSelection.instrumentId = $event" compact />
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import type { Examination, SubcategoryMap } from '@/stores/examinationStore';
import { useReportService } from '@/api/reportService';
import ClassificationCard from './ClassificationCard.vue';

export default defineComponent({
  components: { ClassificationCard },
  setup() {
    const examStore = useExaminationStore();
    const reportService = useReportService();

    const examinations = ref<Examination[]>([]);
    const selectedExamId = ref<number | null>(null);
    const activeCategory = ref<keyof SubcategoryMap>('morphologyChoices');

    const form = ref({
      selectedMorphologies: [] as number[],
      selectedLocations: [] as number[],
      selectedInterventions: [] as number[],
      selectedInstruments: [] as number[],
    });

    const tempSelection = ref({
      morphologyChoiceId: undefined as number | undefined,
      locationChoiceId: undefined as number | undefined,
      interventionId: undefined as number | undefined,
      instrumentId: undefined as number | undefined,
    });

    // Add a colour map for active category cues:
    const colourMap = {
      morphologyChoices: 'border-success',
      locationChoices: 'border-success',
      interventions: 'border-success',
      instruments: 'border-success'
    };

    async function loadExams() {
      examinations.value = await reportService.getExaminations();
      if (examinations.value.length) {
        selectedExamId.value = examinations.value[0].id;
        await onExamChange();
        activeCategory.value = Object.keys(categoryLabels)[0] as keyof SubcategoryMap;
      }
    }

    async function onExamChange() {
      if (!selectedExamId.value) return;
      await examStore.fetchSubcategoriesForExam(selectedExamId.value);
      form.value = {
        selectedMorphologies: [],
        selectedLocations: [],
        selectedInterventions: [],
        selectedInstruments: []
      };
      tempSelection.value = {
        morphologyChoiceId: undefined,
        locationChoiceId: undefined,
        interventionId: undefined,
        instrumentId: undefined
      };
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
      instruments: 'Instrumente'
    } as const;

    onMounted(loadExams);

    return {
      examinations,
      selectedExamId,
      activeCategory,
      form,
      tempSelection,
      subcategories,
      categoryLabels,
      onExamChange,
      colourMap
    };
  }
});
</script>

<style scoped>
/* New 2-row layout */
.examination-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Header row */
.exam-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Body row: Sidebar + Editor */
.exam-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.25rem;
}

/* Sidebar: categories (tabs) */
.categories-panel {
  border-right: 1px solid var(--bs-gray-300);
  padding-right: 1rem;
}

/* Editor column */
.editor-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Category-specific editor */
.category-editor {
  border: 1px solid var(--bs-gray-300);
  border-radius: 0.5rem;
  padding: 1rem;
  min-height: 140px;
}

/* Compact cards: four in a row */
.editor-panel .card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Optionally, define .border-success if not already present */
.border-success {
  border: 2px dotted green;
}
</style>