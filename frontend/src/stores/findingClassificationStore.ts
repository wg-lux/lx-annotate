import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';

export interface FindingChoice {
  id: number;
  name: string;
  description: string;
  subcategories: Record<string, any>;
  numerical_descriptors: Record<string, any>;
}

export interface FindingClassification {
  id: number;
  name: string;
  description: string;
  choices: FindingChoice[];
  classification_types: number[];
}

export interface Finding {
  id: number;
  name: string;
  nameDe?: string;
  description: string;
  examinations: string[];
  PatientExaminationId?: number;
  FindingClassifications: FindingClassification[];
  findingTypes: string[];
  findingInterventions: string[];
  classifications?: FindingClassification[]; // Add for compatibility
  location_classifications?: FindingClassification[];
  morphology_classifications?: FindingClassification[];
}

export const useFindingClassificationStore = defineStore('findingsClassificationStore', () => {
  // State
  const findings = ref<Record<number, Finding>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const getClassificationsForFinding = (findingId: number): FindingClassification[] => {
    const finding = findings.value[findingId];
    if (!finding) return [];
    return [
      ...(finding.classifications || []),
      ...(finding.location_classifications || []),
      ...(finding.morphology_classifications || [])
    ];
  };

  const getAllFindings = computed(() => Object.values(findings.value));

  const getFindingById = (id: number): Finding | undefined => {
    if (!findings.value[id]) {
      getAllFindings.value; // Trigger loading if not already loaded
    }
    return findings.value[id];
  };

  // Actions
  const clearFindings = () => {
    findings.value = {};
    error.value = null;
  };

  const setError = (err: string) => {
    error.value = err;
  };

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading;
  };

  const setClassificationChoicesFromLookup = (lookupFindings: Finding[]) => {
    const findingsMap: Record<number, Finding> = {};
    lookupFindings.forEach(finding => {
      findingsMap[finding.id] = finding;
    });
    findings.value = findingsMap;
    console.log('📋 [FindingsClassificationStore] Set findings from lookup:', Object.keys(findingsMap).length, 'findings');
  };

  return {
    // State
    findings: readonly(findings),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    getFindingById,
    getClassificationsForFinding,
    getAllFindings,

    // Actions
    clearFindings,
    setError,
    setLoading,
    setClassificationChoicesFromLookup
  };
});