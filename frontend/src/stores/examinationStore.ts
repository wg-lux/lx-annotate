import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';

// --- Interfaces ---
export interface MedicalDomain {
  id: number;
  name: string;  
  examinations: Examination[];
}

export interface Examination {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  description_de?: string;
  description_en?: string;
  domainId?: number;  
  applicableClassifications?: string[];
  // Add fields for available classifications
  optionalLocationClassifications?: LocationClassification[];
  requiredLocationClassifications?: LocationClassification[];
  optionalMorphologyClassifications?: MorphologyClassification[];
  requiredMorphologyClassifications?: MorphologyClassification[];
}

export interface LocationClassification {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  description_de?: string;
  description_en?: string;
  choices: LocationClassificationChoice[];
}

export interface LocationClassificationChoice {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  description_de?: string;
  description_en?: string;
  classificationId: number;
  subcategories?: Record<string, any>;
  numerical_descriptors?: Record<string, any>;
}

export interface MorphologyClassification {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  description_de?: string;
  description_en?: string;
  choices: MorphologyClassificationChoice[];
}

export interface MorphologyClassificationChoice {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  description_de?: string;
  description_en?: string;
  classificationId: number;
  subcategories?: Record<string, any>;
  numerical_descriptors?: Record<string, any>;
}

export interface Finding {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  description_de?: string;
  description_en?: string;
  // Classifications available for this finding
  optionalLocationClassifications?: LocationClassification[];
  requiredLocationClassifications?: LocationClassification[];
  optionalMorphologyClassifications?: MorphologyClassification[];
  requiredMorphologyClassifications?: MorphologyClassification[];
}

export interface Intervention {
  id: number;
  name: string;
}

// Patient Finding Data - what gets saved for a specific patient
export interface PatientFindingData {
  findingId: number;
  selectedLocationChoices: number[]; // IDs of selected LocationClassificationChoices
  selectedMorphologyChoices: number[]; // IDs of selected MorphologyClassificationChoices
  timestamp?: number;
  videoId?: number;
  notes?: string;
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
  // State
  const examinations = ref<Examination[]>([]);
  const findings = ref<Finding[]>([]);
  const locationClassifications = ref<LocationClassification[]>([]);
  const morphologyClassifications = ref<MorphologyClassification[]>([]);
  
  // Current form state
  const selectedExaminationId = ref<number | null>(null);
  const selectedFindingId = ref<number | null>(null);
  const currentPatientFinding = ref<PatientFindingData | null>(null);

  // Loading states
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Computed values
  const selectedExamination = computed(() => 
    examinations.value.find(e => e.id === selectedExaminationId.value)
  );
  
  const selectedFinding = computed(() => 
    findings.value.find(f => f.id === selectedFindingId.value)
  );

  // Get findings available for the selected examination
  const availableFindings = computed(() => {
    if (!selectedExaminationId.value) return [];
    // Filter findings that are applicable to the selected examination
    return findings.value.filter(finding => {
      // This would need to be based on examination-finding relationships from the API
      // For now, return all findings - this should be improved with proper API endpoints
      return true;
    });
  });

  const availableLocationClassifications = computed(() => {
    if (!selectedFinding.value) return [];
    return [
      ...(selectedFinding.value.requiredLocationClassifications || []),
      ...(selectedFinding.value.optionalLocationClassifications || [])
    ];
  });

  const availableMorphologyClassifications = computed(() => {
    if (!selectedFinding.value) return [];
    return [
      ...(selectedFinding.value.requiredMorphologyClassifications || []),
      ...(selectedFinding.value.optionalMorphologyClassifications || [])
    ];
  });

  // Actions
  async function loadExaminations() {
    try {
      loading.value = true;
      error.value = null;
      const response = await axiosInstance.get(r('examinations/'));
      examinations.value = response.data || [];
      console.log('Loaded examinations from store:', examinations.value);
    } catch (err) {
      console.error('Error loading examinations:', err);
      error.value = 'Fehler beim Laden der Untersuchungen';
    } finally {
      loading.value = false;
    }
  }

  async function loadExaminationFindings(examinationId: number) {
    try {
      loading.value = true;
      error.value = null;
      const response = await axiosInstance.get(r(`examinations/${examinationId}/findings/`));
      // Update the findings for this specific examination
      const examinationFindings = response.data || [];
      
      // Replace findings with examination-specific ones
      findings.value = examinationFindings;
      
      console.log(`Loaded ${examinationFindings.length} findings for examination ${examinationId}`);
      return examinationFindings;
    } catch (err) {
      console.error('Error loading examination findings:', err);
      error.value = 'Fehler beim Laden der Befunde';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function loadFindingClassifications(findingId: number) {
    try {
      loading.value = true;
      error.value = null;
      
      // Load both location and morphology classifications for the specific finding
      const [locationResponse, morphologyResponse] = await Promise.all([
        axiosInstance.get(r(`findings/${findingId}/location-classifications/`)),
        axiosInstance.get(r(`findings/${findingId}/morphology-classifications/`))
      ]);
      
      // Process location classifications - load choices for each
      const locationClassificationsWithChoices = [];
      for (const locationClass of locationResponse.data || []) {
        try {
          const choicesResponse = await axiosInstance.get(
            r(`location-classifications/${locationClass.id}/choices/`)
          );
          locationClassificationsWithChoices.push({
            ...locationClass,
            choices: choicesResponse.data || []
          });
        } catch (err) {
          console.warn(`Failed to load choices for location classification ${locationClass.id}:`, err);
          locationClassificationsWithChoices.push({
            ...locationClass,
            choices: []
          });
        }
      }
      
      // Process morphology classifications - load choices for each
      const morphologyClassificationsWithChoices = [];
      for (const morphologyClass of morphologyResponse.data || []) {
        try {
          const choicesResponse = await axiosInstance.get(
            r(`morphology-classifications/${morphologyClass.id}/choices/`)
          );
          morphologyClassificationsWithChoices.push({
            ...morphologyClass,
            choices: choicesResponse.data || []
          });
        } catch (err) {
          console.warn(`Failed to load choices for morphology classification ${morphologyClass.id}:`, err);
          morphologyClassificationsWithChoices.push({
            ...morphologyClass,
            choices: []
          });
        }
      }
      
      // Update the selected finding with its classifications
      const findingIndex = findings.value.findIndex(f => f.id === findingId);
      if (findingIndex !== -1) {
        findings.value[findingIndex] = {
          ...findings.value[findingIndex],
          requiredLocationClassifications: locationClassificationsWithChoices.filter(c => c.required),
          optionalLocationClassifications: locationClassificationsWithChoices.filter(c => !c.required),
          requiredMorphologyClassifications: morphologyClassificationsWithChoices.filter(c => c.required),
          optionalMorphologyClassifications: morphologyClassificationsWithChoices.filter(c => !c.required)
        };
      }
      
      console.log(`Loaded classifications for finding ${findingId}:`, {
        locationClassifications: locationClassificationsWithChoices.length,
        morphologyClassifications: morphologyClassificationsWithChoices.length
      });
      
      return {
        locationClassifications: locationClassificationsWithChoices,
        morphologyClassifications: morphologyClassificationsWithChoices
      };
    } catch (err) {
      console.error('Error loading finding classifications:', err);
      error.value = 'Fehler beim Laden der Klassifikationen';
      return {
        locationClassifications: [],
        morphologyClassifications: []
      };
    } finally {
      loading.value = false;
    }
  }

  async function loadFindings() {
    try {
      loading.value = true;
      error.value = null;
      const response = await axiosInstance.get(r('findings/'));
      findings.value = response.data || [];
    } catch (err) {
      console.error('Error loading findings:', err);
      error.value = 'Fehler beim Laden der Befunde';
    } finally {
      loading.value = false;
    }
  }

  async function loadClassifications() {
    try {
      loading.value = true;
      error.value = null;
      const [locationResponse, morphologyResponse] = await Promise.all([
        axiosInstance.get(r('location-classifications/')),
        axiosInstance.get(r('morphology-classifications/'))
      ]);
      locationClassifications.value = locationResponse.data || [];
      morphologyClassifications.value = morphologyResponse.data || [];
    } catch (err) {
      console.error('Error loading classifications:', err);
      error.value = 'Fehler beim Laden der Klassifikationen';
    } finally {
      loading.value = false;
    }
  }

  function setSelectedExamination(examinationId: number) {
    selectedExaminationId.value = examinationId;
    // Reset finding selection when examination changes
    selectedFindingId.value = null;
    currentPatientFinding.value = null;
    
    // Load findings for the selected examination
    loadExaminationFindings(examinationId);
  }

  function setSelectedFinding(findingId: number) {
    selectedFindingId.value = findingId;
    // Initialize new patient finding data
    currentPatientFinding.value = {
      findingId,
      selectedLocationChoices: [],
      selectedMorphologyChoices: []
    };
    
    // Load classifications for the selected finding
    loadFindingClassifications(findingId);
  }

  function updateLocationChoices(choiceIds: number[]) {
    if (currentPatientFinding.value) {
      currentPatientFinding.value.selectedLocationChoices = [...choiceIds];
    }
  }

  function updateMorphologyChoices(choiceIds: number[]) {
    if (currentPatientFinding.value) {
      currentPatientFinding.value.selectedMorphologyChoices = [...choiceIds];
    }
  }

  function updateNotes(newNotes: string) {
    if (currentPatientFinding.value) {
      currentPatientFinding.value.notes = newNotes;
    }
  }

  async function savePatientFinding(videoId?: number, timestamp?: number): Promise<PatientFindingData | null> {
    if (!currentPatientFinding.value) return null;

    try {
      loading.value = true;
      error.value = null;
      
      // Create PatientFinding first
      const patientFindingData = {
        patient_id: videoId,
        finding_id: currentPatientFinding.value.findingId,
        examination_id: selectedExaminationId.value,
        timestamp: timestamp,
        notes: currentPatientFinding.value.notes,
        date_start: new Date().toISOString(),
        date_stop: new Date().toISOString()
      };

      const patientFindingResponse = await axiosInstance.post(r('patient-findings/'), patientFindingData);
      const patientFindingId = patientFindingResponse.data.id;
      
      // Save location classifications
      for (const choiceId of currentPatientFinding.value.selectedLocationChoices) {
        await axiosInstance.post(r('patient-finding-locations/'), {
          patient_finding_id: patientFindingId,
          location_classification_choice_id: choiceId
        });
      }
      
      // Save morphology classifications
      for (const choiceId of currentPatientFinding.value.selectedMorphologyChoices) {
        await axiosInstance.post(r('patient-finding-morphologies/'), {
          patient_finding_id: patientFindingId,
          morphology_classification_choice_id: choiceId
        });
      }
      
      // Reset form after successful save
      currentPatientFinding.value = null;
      selectedFindingId.value = null;
      
      return patientFindingResponse.data;
    } catch (err) {
      console.error('Error saving patient finding:', err);
      error.value = 'Fehler beim Speichern der Untersuchung';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    selectedExaminationId.value = null;
    selectedFindingId.value = null;
    currentPatientFinding.value = null;
    error.value = null;
  }

  // Validation helpers
  function validateRequiredClassifications(): string[] {
    const errors: string[] = [];
    
    if (!selectedFinding.value || !currentPatientFinding.value) {
      return errors;
    }

    // Check required location classifications
    const requiredLocationClassifications = selectedFinding.value.requiredLocationClassifications || [];
    for (const classification of requiredLocationClassifications) {
      const hasChoice = classification.choices.some(choice => 
        currentPatientFinding.value!.selectedLocationChoices.includes(choice.id)
      );
      if (!hasChoice) {
        errors.push(`Bitte wählen Sie eine Option für ${classification.name}`);
      }
    }

    // Check required morphology classifications
    const requiredMorphologyClassifications = selectedFinding.value.requiredMorphologyClassifications || [];
    for (const classification of requiredMorphologyClassifications) {
      const hasChoice = classification.choices.some(choice => 
        currentPatientFinding.value!.selectedMorphologyChoices.includes(choice.id)
      );
      if (!hasChoice) {
        errors.push(`Bitte wählen Sie eine Option für ${classification.name}`);
      }
    }

    return errors;
  }

  return {
    // State
    examinations: readonly(examinations),
    findings: readonly(findings),
    availableFindings,
    locationClassifications: readonly(locationClassifications),
    morphologyClassifications: readonly(morphologyClassifications),
    selectedExaminationId: readonly(selectedExaminationId),
    selectedFindingId: readonly(selectedFindingId),
    currentPatientFinding: readonly(currentPatientFinding),
    loading: readonly(loading),
    error: readonly(error),
    
    // Computed
    selectedExamination,
    selectedFinding,
    availableLocationClassifications,
    availableMorphologyClassifications,
    
    // Actions
    loadExaminations,
    loadExaminationFindings,
    loadFindingClassifications,
    loadFindings,
    loadClassifications,
    setSelectedExamination,
    setSelectedFinding,
    updateLocationChoices,
    updateMorphologyChoices,
    updateNotes,
    savePatientFinding,
    resetForm,
    validateRequiredClassifications
  };
});
