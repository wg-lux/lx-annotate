<template>
  <div class="examination-view">
    <!-- HEADER ROW -->
    <div class="exam-header">
      <div class="exam-select">
        <label for="examSelect">Untersuchungstyp:</label>
        <select id="examSelect" v-model="selectedExamId" @change="onExamChange" class="form-select" :disabled="loading">
          <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
            {{ exam.name }}
          </option>
        </select>
        <!-- Refresh button -->
        <button @click="onExamChange" class="refresh-btn" :disabled="loading">🔄 Refresh</button>
      </div>
    </div>

    <!-- Loading and Error Indicators -->
    <div v-if="loading" class="alert alert-info mt-2">Lade Kategorien…</div>
    <div v-if="error" class="alert alert-danger mt-2">{{ error }}</div>

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
          <div v-if="activeCategory === 'locationClassifications'">
            <label>Lokalisations Klassifikation:</label>
            <select v-model="selectedLocationClassificationId" @change="onLocationClassificationChange" class="form-select mb-2">
              <option :value="null">— bitte wählen —</option>
              <option v-for="cls in subcategories.locationClassifications" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </option>
            </select>

            <label>Lokalisation wählen:</label>
            <select v-model="tempSelection.locationChoiceId" class="form-select">
              <option :value="undefined">— bitte wählen —</option>
              <option v-for="opt in subcategories.locationChoices" :key="opt.id" :value="opt.id">
                {{ opt.name }}
              </option>
            </select>
          </div>
          <div v-else-if="activeCategory === 'morphologyClassifications'">
            <label>Morphologie Klassifikation:</label>
            <select v-model="selectedMorphologyClassificationId" @change="onMorphologyClassificationChange" class="form-select mb-2">
              <option :value="null">— bitte wählen —</option>
              <option v-for="cls in subcategories.morphologyClassifications" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </option>
            </select>

            <label>Morphologie wählen:</label>
            <select v-model="tempSelection.morphologyChoiceId" class="form-select">
              <option :value="undefined">— bitte wählen —</option>
              <option v-for="opt in subcategories.morphologyChoices" :key="opt.id" :value="opt.id">
                {{ opt.name }}
              </option>
            </select>
          </div>
          <div v-else-if="activeCategory === 'findings'">
            <label>Finding wählen:</label>
            <select v-model="selectedFindingId" @change="onFindingChange" class="form-select">
              <option :value="null">— bitte wählen —</option>
              <option v-for="finding in subcategories.findings" :key="finding.id" :value="finding.id">
                {{ finding.name }}
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
        </div>

        <!-- Compact classification cards (always visible) -->
        <div class="card-container">
          <ClassificationCard label="Lokalisierung" :options="subcategories.locationChoices"
            v-model="form.selectedLocations"
            :tempValue="tempSelection.locationChoiceId"
            @update:tempValue="tempSelection.locationChoiceId = $event" compact />
          <ClassificationCard label="Morphologie" :options="subcategories.morphologyChoices"
            v-model="form.selectedMorphologyChoices"
            :tempValue="tempSelection.morphologyChoiceId"
            @update:tempValue="tempSelection.morphologyChoiceId = $event" compact />
          <ClassificationCard label="Interventionen" :options="subcategories.interventions"
            v-model="form.selectedInterventions"
            :tempValue="tempSelection.interventionId"
            @update:tempValue="tempSelection.interventionId = $event" compact />
          <ClassificationCard label="Findings" :options="subcategories.findings"
            v-model="form.selectedFindings" compact />
          <ClassificationCard label="Lokalisations Klassifikationen" :options="subcategories.locationClassifications"
            v-model="form.selectedLocationClassifications" compact />
          <ClassificationCard label="Morphologie Klassifikationen" :options="subcategories.morphologyClassifications"
            v-model="form.selectedMorphologyClassifications" compact />
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import type { Examination, SubcategoryMap } from '@/stores/examinationStore';
import { useReportService } from '@/api/reportService';
import ClassificationCard from './ClassificationCard.vue';
import { storeToRefs } from 'pinia';

export default defineComponent({
  components: { ClassificationCard },
  setup() {
    const examStore = useExaminationStore();
    const reportService = useReportService();

    const { loading, error } = storeToRefs(examStore);

    const examinations = ref<Examination[]>([]);
    const selectedExamId = ref<number | null>(null);
    const activeCategory = ref<keyof SubcategoryMap>('locationClassifications');

    const form = ref({
      selectedLocations: [] as number[],
      selectedInterventions: [] as number[],
      selectedFindings: [] as number[],
      selectedLocationClassifications: [] as number[],
      selectedMorphologyClassifications: [] as number[],
      selectedMorphologyChoices: [] as number[],
    });

    const tempSelection = ref({
      locationChoiceId: undefined as number | undefined,
      interventionId: undefined as number | undefined,
      morphologyChoiceId: undefined as number | undefined,
    });

    const selectedLocationClassificationId = ref<number | null>(null);
    const selectedFindingId = ref<number | null>(null);
    const selectedMorphologyClassificationId = ref<number | null>(null);

    const colourMap = {
      locationClassifications: 'border-success',
      locationChoices: 'border-success',
      morphologyClassifications: 'border-success',
      morphologyChoices: 'border-success',
      findings: 'border-success',
      interventions: 'border-success'
    };

    async function loadExams() {
      try {
        examinations.value = await reportService.getExaminations();
        if (examinations.value.length) {
          selectedExamId.value = examinations.value[0].id;
          await onExamChange();
          activeCategory.value = Object.keys(categoryLabels)[0] as keyof SubcategoryMap;
        }
      } catch (err) {
        console.error("Fehler beim Laden der initialen Daten:", err);
      }
    }

    async function onExamChange() {
      if (!selectedExamId.value) return;
      await examStore.fetchSubcategoriesForExam(selectedExamId.value);
      resetForm();
    }

    async function onLocationClassificationChange() {
      if (!selectedExamId.value || !selectedLocationClassificationId.value) return;
      await examStore.fetchLocationChoices(selectedExamId.value, selectedLocationClassificationId.value);
      form.value.selectedLocations = [];
      tempSelection.value.locationChoiceId = undefined;
      
      // Add the selected location classification to the form
      if (!form.value.selectedLocationClassifications.includes(selectedLocationClassificationId.value)) {
        form.value.selectedLocationClassifications.push(selectedLocationClassificationId.value);
      }
    }

    async function onMorphologyClassificationChange() {
      if (!selectedExamId.value || !selectedMorphologyClassificationId.value) return;
      await examStore.fetchMorphologyChoices(selectedExamId.value, selectedMorphologyClassificationId.value);
      form.value.selectedMorphologyChoices = [];
      tempSelection.value.morphologyChoiceId = undefined;
      
      // Add the selected morphology classification to the form
      if (!form.value.selectedMorphologyClassifications.includes(selectedMorphologyClassificationId.value)) {
        form.value.selectedMorphologyClassifications.push(selectedMorphologyClassificationId.value);
      }
    }

    async function onFindingChange() {
      if (!selectedExamId.value || !selectedFindingId.value) return;
      await examStore.fetchInterventions(selectedExamId.value, selectedFindingId.value);
      form.value.selectedInterventions = [];
      tempSelection.value.interventionId = undefined;
      
      // Add the selected finding to the form
      if (!form.value.selectedFindings.includes(selectedFindingId.value)) {
        form.value.selectedFindings.push(selectedFindingId.value);
      }
    }

    function resetForm() {
      form.value = {
        selectedLocations: [],
        selectedInterventions: [],
        selectedFindings: [],
        selectedLocationClassifications: [],
        selectedMorphologyClassifications: [],
        selectedMorphologyChoices: []
      };
      tempSelection.value = {
        locationChoiceId: undefined,
        interventionId: undefined,
        morphologyChoiceId: undefined
      };
      selectedLocationClassificationId.value = null;
      selectedFindingId.value = null;
      selectedMorphologyClassificationId.value = null;
    }

    const subcategories = computed((): SubcategoryMap => {
      return selectedExamId.value !== null
        ? examStore.getCategories(selectedExamId.value)
        : { 
            locationClassifications: [], 
            locationChoices: [], 
            morphologyClassifications: [], 
            morphologyChoices: [], 
            findings: [], 
            interventions: [] 
          };
    });
    
    const categoryLabels = {
      locationClassifications: 'Lokalisierung',
      morphologyClassifications: 'Morphologie',
      findings: 'Findings',
      interventions: 'Interventionen'
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
      onLocationClassificationChange,
      onMorphologyClassificationChange,
      onFindingChange,
      colourMap,
      selectedLocationClassificationId,
      selectedMorphologyClassificationId,
      selectedFindingId,
      loading,
      error,
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