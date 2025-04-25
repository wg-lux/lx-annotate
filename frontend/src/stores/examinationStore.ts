import { defineStore } from 'pinia';
import axiosInstance, { r } from '@/api/axiosInstance';
import { ref } from 'vue';

// --- Interfaces ---
export interface Examination {
  id: number;
  name: string;
}

export interface MorphologyClassificationChoice {
  id: number;
  name: string;
  classification: number; // Updated field name to match Back-End model
}

export interface LocationClassificationChoice {
  id: number;
  name: string;
  classification: number; // Updated field name to match Back-End model
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
  const lastFetchToken = ref<symbol | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Fetch all subcategories for a given examination type
  async function fetchSubcategoriesForExam(examId: number): Promise<void> {
    // Request-Token erzeugen
    const fetchToken = Symbol();
    lastFetchToken.value = fetchToken;
    error.value = null;
    loading.value = true;
    try {
      const [morphRes, locRes, intRes, instRes] = await Promise.all([
        axiosInstance.get(r(`examinations/${examId}/morphology-classification-choices/`)),
        axiosInstance.get(r(`examinations/${examId}/location-classification-choices/`)),
        axiosInstance.get(r(`examinations/${examId}/interventions/`)),
        axiosInstance.get(r(`examinations/${examId}/instruments/`)),
      ]);
      // Abbruch, falls ein anderer Request in der Zwischenzeit gestartet wurde
      if (lastFetchToken.value !== fetchToken) return;
      categoriesByExam.value[examId] = {
        morphologyChoices: morphRes.data,
        locationChoices: locRes.data,
        interventions: intRes.data,
        instruments: instRes.data,
      };
    } catch (err: unknown) {
      console.error('Error fetching subcategories:', err);
      // Narrowing des Fehlerobjekts eventuell hier hinzufügen
      error.value = (err instanceof Error ? err.message : 'Failed to load subcategories');
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
