import { defineStore } from 'pinia';
import { reactive, ref } from 'vue'; // reactive importiert
import axiosInstance, { r } from '@/api/axiosInstance';

// --- Interfaces ---
export interface Examination {
  id: number;
  name: string;
}

// NEUE Interface für übergeordnete Morphologie-Klassifikationen
export interface MorphologyClassification {
  id: number;
  name: string;
}

export interface MorphologyClassificationChoice {
  id: number;
  name: string;
  classificationId: number; // Updated field name
}

export interface LocationClassificationChoice {
  id: number;
  name: string;
  classificationId: number; // Updated field name
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
  const categoriesByExam = reactive<Record<number, SubcategoryMap>>({}); // Geändert zu reactive
  const morphologyClassifications = ref<MorphologyClassification[]>([]); // NEUER Zustand
  const lastFetchToken = ref<symbol | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Fetch all subcategories for a given examination type
  async function fetchSubcategoriesForExam(examId: number): Promise<void> {
    // Request-Token erzeugen
    const token = Symbol(); // Umbenannt für Konsistenz mit Vorschlag
    lastFetchToken.value = token;
    error.value = null;
    loading.value = true;
    try {
      const [morphRes, locRes, intRes, instRes] = await Promise.all([
        axiosInstance.get(r(`examination/${examId}/morphology-classification-choices/`)),
        axiosInstance.get(r(`examination/${examId}/location-classification-choices/`)),
        axiosInstance.get(r(`examination/${examId}/interventions/`)),
        axiosInstance.get(r(`examination/${examId}/instruments/`)),
      ]);
      // Abbruch, falls ein anderer Request in der Zwischenzeit gestartet wurde
      if (lastFetchToken.value !== token) return;
      // Direkte Zuweisung für reaktives Objekt
      categoriesByExam[examId] = {
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

  // NEUE Funktion zum Laden der übergeordneten Morphologie-Klassifikationen
  async function fetchMorphologyClassifications(): Promise<void> {
    try {
      const response = await axiosInstance.get(r('get-morphology-choices/')); // Annahme für den Endpunkt
      morphologyClassifications.value = response.data;
    } catch (err) {
      console.error('Error fetching morphology classifications:', err);
      // Hier könnte ein spezifischer Fehlerstatus gesetzt werden, falls erforderlich
    }
  }

  async function fetchLocationClassifications(examId: number): Promise<void> {
    try {
      const response = await axiosInstance.get(r(`get-location-choices/${examId}/`));
  
      // Initialize map if it doesn’t exist
      if (!categoriesByExam[examId]) {
        categoriesByExam[examId] = {
          morphologyChoices: [],
          locationChoices: [],
          interventions: [],
          instruments: [],
        };
      }
  
      categoriesByExam[examId].locationChoices = response.data;
    } catch (err) {
      console.error('Error fetching location classifications:', err);
    }
  }

  async function fetchMorphologyChoices(examId: number): Promise<void> {
    try {
      const response = await axiosInstance.get(r(`get-morphology-choices/${examId}/`));
  
      if (!categoriesByExam[examId]) {
        categoriesByExam[examId] = {
          morphologyChoices: [],
          locationChoices: [],
          interventions: [],
          instruments: [],
        };
      }
  
      categoriesByExam[examId].morphologyChoices = response.data;
    } catch (err) {
      console.error('Error fetching morphology classifications:', err);
    }
  }
  

  // Getter: retrieve map or empty defaults
  function getCategories(examId: number): SubcategoryMap {
    // Zugriff auf reaktives Objekt angepasst
    return categoriesByExam[examId] || {
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
    morphologyClassifications, 
    fetchMorphologyClassifications, 
    fetchLocationClassifications,
    fetchMorphologyChoices,
  };
});
