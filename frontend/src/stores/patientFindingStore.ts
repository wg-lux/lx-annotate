// stores/patientFindingStore.ts
import { defineStore } from "pinia";
import axiosInstance from "@/api/axiosInstance";
import { ref, readonly, computed } from "vue";
import type { Finding, FindingClassification, FindingClassificationChoice } from "@/stores/findingStore";
import type { Patient } from "@/stores/patientStore";

import { usePatientStore } from "@/stores/patientStore";
import type { PatientExamination } from '@/stores/patientExaminationStore';
import { read } from "fs";

/* ---------- Types ---------- */

export interface PatientFindingClassification {
  id: number;
  finding: number; // PatientFinding ID
  classification: FindingClassification;
  classification_choice: FindingClassificationChoice;
  is_active: boolean;
  subcategories?: Record<string, any>;
  numerical_descriptors?: Record<string, any>;
}

export interface PatientFinding {
  id: number;
  examination: string;
  createdAt: number;
  updatedAt: string;
  createdBy?: string; // ISO date string
  updatedBy?: string;
  finding: Finding;
  patient: Patient;
  /** Patient-side (with choices, returned by /api/patient-findings/) */
  classifications?: PatientFindingClassification[];
  /** Definition-side (available/eligible options, from /api/findings/) */
  available_classifications?: FindingClassification[];
}

/* ---------- Type guards & helpers ---------- */

function isValidPatientClassification(x: any): x is PatientFindingClassification {
  return !!(
    x &&
    x.classification &&
    typeof x.classification.id === "number" &&
    x.classification_choice &&
    typeof x.classification_choice.id === "number"
  );
}

function filterValidPatientClassifications(
  arr?: PatientFindingClassification[]
): PatientFindingClassification[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isValidPatientClassification);
}

/* ---------- Store ---------- */

const usePatientFindingStore = defineStore('patientFinding', () => {
  const patientFindings = ref<PatientFinding[]>([]);
  const patientFindingClassifications = ref<Map<number, PatientFindingClassification[]>>(new Map());
  const loading = ref(false);
  const error = ref<string | null>(null);

  const byPatientExamination = ref(new Map<number, PatientFinding[]>());
  const currentPatientExaminationId = ref<number | null>(null);

  const setCurrentPatientExaminationId = (id: number | null) => {
    currentPatientExaminationId.value = id;
  };

  /**
   * Loads patient findings (with patient-side classifications),
   * and augments each item with available_classifications (definitions)
   * without touching the patient-side `classifications`.
   */
  const fetchPatientFindings = async (patientExaminationId: number) => {
    if (!patientExaminationId) {
      console.warn('fetchPatientFindings wurde ohne patientExaminationId aufgerufen.');
      patientFindings.value = [];
      return;
    }
    try {
      loading.value = true;
      error.value = null;
      console.log('🔄 [PatientFindingStore] Fetching patient findings for PE:', patientExaminationId);

      // 1) Patient findings (contains patient-side selections)
      const patientFindingsResponse = await axiosInstance.get('/api/patient-findings/', {
        params: { patient_examination: patientExaminationId }
      });
      console.log('📥 [PatientFindingStore] PatientFindings API Response:', patientFindingsResponse.data);

      // 2) Findings + definitions (available classifications)
      const findingsResponse = await axiosInstance.get('/api/findings/', {
        params: { patient_examination: patientExaminationId }
      });
      console.log('� [PatientFindingStore] Findings API Response:', findingsResponse.data);

      const rawPatientFindings: PatientFinding[] =
        patientFindingsResponse.data.results || patientFindingsResponse.data;

      const findingsWithClassifications: Array<{ id: number; classifications?: FindingClassification[] }> =
        findingsResponse.data.results || findingsResponse.data;

      // Map findingId -> definition classifications
      const findingClassificationMap = new Map<number, FindingClassification[]>();
      findingsWithClassifications.forEach((finding) => {
        findingClassificationMap.set(finding.id, finding.classifications || []);
      });

      // Enhance: attach definitions under `available_classifications`
      const enhancedPatientFindings: PatientFinding[] = rawPatientFindings.map((pf: PatientFinding) => {
        const findingId =
          typeof (pf as any).finding === 'object'
            ? (pf as any).finding?.id
            : (pf as any).finding;

        const defClassifications = findingClassificationMap.get(findingId) || [];

        // Diagnostics for invalid patient-side classifications
        const invalid = (pf.classifications || []).filter((cls: any) => !isValidPatientClassification(cls));
        if (invalid.length > 0) {
          console.error('🚨 [PatientFindingStore] API returned invalid patient classifications', {
            patientFindingId: pf.id,
            findingId,
            totalClassifications: pf.classifications?.length || 0,
            invalidCount: invalid.length,
            sample: invalid.slice(0, 2)
          });
        }

        // DO NOT overwrite pf.classifications (patient data)
        // Only add available_classifications (definitions)
        return {
          ...pf,
          classifications: filterValidPatientClassifications(pf.classifications),
          available_classifications: defClassifications
        };
      });

      // Log completeness
      enhancedPatientFindings.forEach((pf, idx) => {
        console.log(`🔍 [PatientFindingStore] Enhanced PatientFinding ${idx}:`, {
          id: pf.id,
          finding: pf.finding,
          findingId: typeof (pf as any).finding === 'object' ? (pf as any).finding?.id : (pf as any).finding,
          findingName:
            typeof (pf as any).finding === 'object'
              ? ((pf as any).finding?.name || (pf as any).finding?.nameDe)
              : 'ID only',
          findingType: typeof (pf as any).finding,
          classificationsCount: pf.classifications?.length || 0,
          availableDefs: pf.available_classifications?.length || 0
        });
      });

      patientFindings.value = enhancedPatientFindings;
      byPatientExamination.value.set(patientExaminationId, enhancedPatientFindings);

      console.log('✅ [PatientFindingStore] Stored enhanced patient findings:', enhancedPatientFindings.length);
    } catch (err: any) {
      console.error('❌ [PatientFindingStore] Error fetching patient findings:', err);
      error.value = 'Fehler beim Laden der Patientenbefunde: ' + (err.response?.data?.detail || err.message);
    } finally {
      loading.value = false;
    }
  };

  const patientFindingsByCurrentPatient = computed(() => {
    const patientStore = usePatientStore();
    const currentPatient = patientStore.getCurrentPatient();
    if (!currentPatient) return [];
    return patientFindings.value.filter(pf => pf.patient.id === currentPatient.id);
  });

  const createPatientFinding = async (patientFindingData: {
    patientExamination: number;
    finding: number;
    classifications?: Array<{ classification: number; choice: number }>;
  }): Promise<PatientFinding> => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axiosInstance.post('/api/patient-findings/', patientFindingData);
      const newPatientFinding = response.data as PatientFinding;

      // Normalize patient-side classifications immediately
      const normalized: PatientFinding = {
        ...newPatientFinding,
        classifications: filterValidPatientClassifications(newPatientFinding.classifications),
      };

      patientFindings.value.push(normalized);
      patientFindingClassifications.value.set(
        normalized.id,
        normalized.classifications || []
      );

      // Also add to byPatientExamination
      const peId = patientFindingData.patientExamination;
      const existing = byPatientExamination.value.get(peId) || [];
      byPatientExamination.value.set(peId, [...existing, normalized]);

      console.log('New finding created', normalized);
      console.log(`🔧 [PatientFindingStore] Added to byPatientExamination[${peId}], total: ${byPatientExamination.value.get(peId)?.length || 0}`);
      console.log(`🔧 [PatientFindingStore] Current examination ID: ${currentPatientExaminationId.value}`);

      return normalized;
    } catch (err: any) {
      error.value = 'Fehler beim Erstellen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
      console.error('Create patient finding error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePatientFinding = async (id: number, updateData: Partial<PatientFinding>): Promise<PatientFinding> => {
    try {
      loading.value = true;
      error.value = null;
      const response = await axiosInstance.patch(`/api/patient-findings/${id}/`, updateData);
      const updatedFindingRaw = response.data as PatientFinding;

      const updatedFinding: PatientFinding = {
        ...updatedFindingRaw,
        classifications: filterValidPatientClassifications(updatedFindingRaw.classifications),
      };

      // Update top-level list
      const idx = patientFindings.value.findIndex(pf => pf.id === id);
      if (idx !== -1) {
        patientFindings.value[idx] = updatedFinding;
      }

      // Update classifications map
      patientFindingClassifications.value.set(
        updatedFinding.id,
        updatedFinding.classifications || []
      );

      // Update in byPatientExamination
      for (const [examinationId, findings] of byPatientExamination.value.entries()) {
        const fIdx = findings.findIndex(pf => pf.id === id);
        if (fIdx !== -1) {
          const next = findings.slice();
          next[fIdx] = updatedFinding;
          byPatientExamination.value.set(examinationId, next);
        }
      }

      console.log('Finding updated', updatedFinding);
      return updatedFinding;
    } catch (err: any) {
      error.value = 'Fehler beim Aktualisieren des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
      console.error('Update patient finding error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deletePatientFinding = async (id: number): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      await axiosInstance.delete(`/api/patient-findings/${id}/`);

      // Remove from list
      patientFindings.value = patientFindings.value.filter(pf => pf.id !== id);

      // Remove from byPatientExamination
      for (const [examinationId, findings] of byPatientExamination.value.entries()) {
        const filtered = findings.filter(pf => pf.id !== id);
        if (filtered.length !== findings.length) {
          byPatientExamination.value.set(examinationId, filtered);
        }
      }
    } catch (err: any) {
      error.value = 'Fehler beim Löschen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
      console.error('Delete patient finding error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const currentPatientFindings = computed(() => {
    const id = currentPatientExaminationId.value;
    return id ? (byPatientExamination.value.get(id) ?? []) : [];
  });

  const getByPatientExamination = (id: number) =>
    byPatientExamination.value.get(id) ?? [];

  /** Public safe getter for patient-side classifications */
  const getPatientClassifications = (patientFindingId: number): PatientFindingClassification[] => {
    const pf =
      patientFindings.value.find(x => x.id === patientFindingId) ??
      (currentPatientFindings.value.find(x => x.id === patientFindingId) as PatientFinding | undefined);

    return filterValidPatientClassifications(pf?.classifications);
  };

  const readPatientFindings = (id: number) => {
    for(const pf of patientFindings.value) {
      if (pf.id === id) {
        return [pf] as PatientFinding[];
      }
    }
    return [];
  };

  return {
    patientFindings: readonly(currentPatientFindings),
    patientFindingsByCurrentPatient,
    loading: readonly(loading),
    error: readonly(error),
    currentPatientExaminationId: readonly(currentPatientExaminationId),
    setCurrentPatientExaminationId,
    fetchPatientFindings,
    createPatientFinding,
    updatePatientFinding,
    deletePatientFinding,
    // helpers
    getPatientClassifications,
    readPatientFindings,
  };
});

export { usePatientFindingStore };
