import { defineStore } from 'pinia';
import axios from 'axios';
import { ref } from 'vue';

// --- Interfaces ---
export interface Examination {
  id: number;
  name: string;
}

export interface MorphologyClassificationChoice {
  id: number;
  name: string;
  classificationId: number;
}

export interface LocationClassificationChoice {
  id: number;
  name: string;
  classificationId: number;
}

export interface Intervention {
  id: number;
  name: string;
}

export interface Instrument {
  id: number;
  name: string;
}

export interface SubcategoryMap {
  morphologyChoices: MorphologyClassificationChoice[];
  locationChoices: LocationClassificationChoice[];
  interventions: Intervention[];
  instruments: Instrument[];
}

// --- Store ---
export const useExaminationStore = defineStore('examination', () => {
  // state: map examinationId -> fetched subcategories
  const categoriesByExam = ref<Record<number, SubcategoryMap>>({});
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Fetch all subcategories for a given examination type
  async function fetchSubcategoriesForExam(examId: number) {
    loading.value = true;
    error.value = null;

    try {
      // API endpoints assumed to follow REST conventions
      const [morphRes, locRes, intRes, instRes] = await Promise.all([
        axios.get<MorphologyClassificationChoice[]>(`/api/examinations/${examId}/morphology-classification-choices/`),
        axios.get<LocationClassificationChoice[]>(`/api/examinations/${examId}/location-classification-choices/`),
        axios.get<Intervention[]>(`/api/examinations/${examId}/interventions/`),
        axios.get<Instrument[]>(`/api/examinations/${examId}/instruments/`),
      ]);

      categoriesByExam.value[examId] = {
        morphologyChoices: morphRes.data,
        locationChoices: locRes.data,
        interventions: intRes.data,
        instruments: instRes.data,
      };
    } catch (err: any) {
      console.error('Error fetching subcategories:', err);
      error.value = err.message || 'Failed to load subcategories';
    } finally {
      loading.value = false;
    }
  }

  // Getter: retrieve map or empty defaults
  function getCategories(examId: number): SubcategoryMap {
    return categoriesByExam.value[examId] || {
      morphologyChoices: [],
      locationChoices: [],
      interventions: [],
      instruments: [],
    };
  }

  return {
    categoriesByExam,
    loading,
    error,
    fetchSubcategoriesForExam,
    getCategories,
  };
});
