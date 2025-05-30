import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';

// --- Interfaces ---
export interface MedicalDomain {
  id: number;
  name: string; // "Gastroenterologie", "Pneumologie"
  examinations: Examination[];
}

export interface Examination {
  id: number;
  name: string;
  domainId?: number; // Optional for backward compatibility
  applicableClassifications?: string[]; // ["morphology", "location", "intervention"]
}

export interface LocationClassification {
  id: number;
  name: string;
}

export interface LocationClassificationChoice {
  id: number;
  name: string;
  classificationId: number;
}

export interface MorphologyClassification {
  id: number;
  name: string;
}

export interface MorphologyClassificationChoice {
  id: number;
  name: string;
  classificationId: number;
}

export interface Finding {
  id: number;
  name: string;
}

export interface Intervention {
  id: number;
  name: string;
}

export interface SubcategoryMap {
  locationClassifications: LocationClassification[];
  locationChoices: LocationClassificationChoice[];
  morphologyClassifications: MorphologyClassification[];
  morphologyChoices: MorphologyClassificationChoice[];
  findings: Finding[];
  interventions: Intervention[];
}

// Future-oriented interfaces for enhanced flexibility
export interface Classification {
  id: number;
  name: string;
  type: 'morphology' | 'location' | 'intervention' | 'finding';
  applicableExaminations: number[]; // Examination IDs
  choices: ClassificationChoice[];
}

export interface ClassificationChoice {
  id: number;
  name: string;
  classificationId: number;
  validityRules?: {
    minSize?: number;
    organSystems?: string[];
    contraindications?: string[];
  };
}

// --- Store ---
export const useExaminationStore = defineStore('examination', () => {
  // state: map examinationId -> fetched subcategories
  const categoriesByExam = reactive<Record<number, SubcategoryMap>>({});
  const lastFetchToken = ref<symbol | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Fetch all subcategories for a given examination type
  async function fetchSubcategoriesForExam(examId: number): Promise<void> {
    const token = Symbol();
    lastFetchToken.value = token;
    error.value = null;
    loading.value = true;
    try {
      // Only fetch endpoints that exist in the backend
      const [locClassRes, findingsRes] = await Promise.all([
        axiosInstance.get(r(`examination/${examId}/location-classifications/`)),
        axiosInstance.get(r(`examination/${examId}/findings/`)),
      ]);
      
      // Try to fetch morphology classifications, but don't fail if endpoint doesn't exist
      let morphClassRes = { data: [] };
      try {
        morphClassRes = await axiosInstance.get(r(`examination/${examId}/morphology-classifications/`));
      } catch (err) {
        console.warn('Morphology classifications endpoint not available:', err);
      }
      
      // Abbruch, falls ein anderer Request in der Zwischenzeit gestartet wurde
      if (lastFetchToken.value !== token) return;
      
      // Direkte Zuweisung für reaktives Objekt
      categoriesByExam[examId] = {
        locationClassifications: locClassRes.data,
        locationChoices: [], // Will be loaded when location classification is selected
        morphologyClassifications: morphClassRes.data,
        morphologyChoices: [], // Will be loaded when morphology classification is selected
        findings: findingsRes.data,
        interventions: [], // Will be loaded when finding is selected
      };
    } catch (err) {
      if (lastFetchToken.value === token) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch examination data';
        console.error('Error fetching subcategories:', err);
      }
    } finally {
      if (lastFetchToken.value === token) {
        loading.value = false;
      }
    }
  }

  // Fetch location choices based on selected location classification
  async function fetchLocationChoices(examId: number, locationClassificationId: number): Promise<void> {
    if (!categoriesByExam[examId]) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axiosInstance.get(
        r(`examination/${examId}/location-classification/${locationClassificationId}/choices/`)
      );
      
      // Update the locationChoices for this exam
      categoriesByExam[examId].locationChoices = response.data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch location choices';
      console.error('Error fetching location choices:', err);
    } finally {
      loading.value = false;
    }
  }

  // Fetch morphology choices based on selected morphology classification
  async function fetchMorphologyChoices(examId: number, morphologyClassificationId: number): Promise<void> {
    if (!categoriesByExam[examId]) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axiosInstance.get(
        r(`examination/${examId}/morphology-classification/${morphologyClassificationId}/choices/`)
      );
      
      // Update the morphologyChoices for this exam
      categoriesByExam[examId].morphologyChoices = response.data;
    } catch (err) {
      // Don't treat this as a fatal error since the endpoint might not exist
      console.warn('Morphology choices endpoint not available:', err);
      categoriesByExam[examId].morphologyChoices = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch interventions based on selected finding
  async function fetchInterventions(examId: number, findingId: number): Promise<void> {
    if (!categoriesByExam[examId]) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axiosInstance.get(
        r(`examination/${examId}/finding/${findingId}/interventions/`)
      );
      
      // Update the interventions for this exam
      categoriesByExam[examId].interventions = response.data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch interventions';
      console.error('Error fetching interventions:', err);
    } finally {
      loading.value = false;
    }
  }

  // Getter: retrieve map or empty defaults
  function getCategories(examId: number): SubcategoryMap {
    return categoriesByExam[examId] || {
      locationClassifications: [],
      locationChoices: [],
      morphologyClassifications: [],
      morphologyChoices: [],
      findings: [],
      interventions: [],
    };
  }

  return {
    categoriesByExam,
    loading,
    error,
    fetchSubcategoriesForExam,
    fetchLocationChoices,
    fetchMorphologyChoices,
    fetchInterventions,
    getCategories,
  };
});
