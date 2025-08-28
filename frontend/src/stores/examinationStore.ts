import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import type { Finding } from '@/stores/findingStore';

// --- Interfaces ---
export interface Examination {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  displayName?: string;
}


export interface LocationClassificationChoice { id: number; name: string; name_de?: string }
export interface MorphologyClassificationChoice { id: number; name: string; name_de?: string }

export interface LocationClassification {
  id: number; name: string; name_de?: string;
  choices: LocationClassificationChoice[];
  required?: boolean;
}

export interface MorphologyClassification {
  id: number; name: string; name_de?: string;
  choices: MorphologyClassificationChoice[];
  required?: boolean;
}


type ClassifPayload = {
  locationClassifications: LocationClassification[];
  morphologyClassifications: MorphologyClassification[];
};

export const useExaminationStore = defineStore('examination', {
  state: () => ({
    loading: false as boolean,
    error: null as string | null,
    exams: [] as Examination[],
    selectedExaminationId: null as number | null,

    // cache (optional)
    findingsByExam: new Map<number, Finding[]>(),
    classificationsByFinding: new Map<number, ClassifPayload>(),
  }),

  getters: {
    examinations(state): Examination[] {
      return state.exams;
    },
    examinationsDropdown(state): { id: number; name: string; displayName: string }[] {
      return state.exams.map(e => ({
        id: e.id,
        name: e.name,
        displayName: e.displayName ?? e.name_de ?? e.name,
      }));
    },
    selectedExamination(state): Examination | null {
      return state.exams.find(e => e.id === state.selectedExaminationId) ?? null;
    },
    availableFindings(state): Finding[] {
      const id = state.selectedExaminationId;
      if (!id) return [];
      return state.findingsByExam.get(id) ?? [];
    },
  },

  actions: {
    setSelectedExamination(id: number | null) {
      this.selectedExaminationId = id;
    },

    /**
     * Load examinations list.
     * #TODO: You have 2 viable endpoints in your project:
     *  - /api/examinations/  (generic list)
     *  - /api/patient-examinations/examinations_dropdown/ (already tailored for dropdown)
     *
     * Pick ONE. Below I show the dropdown endpoint because it already returns displayName.
     */
    async fetchExaminations(): Promise<void> {
      this.loading = true; this.error = null;
      try {
        const res = await axiosInstance.get('/api/examinations/');
        // Normalize to Examination[]
        this.exams = (res.data as any[]).map((e) => ({
          id: e.id,
          name: e.name,
          name_de: e.name_de,
          name_en: e.name_en,
          displayName: e.displayName ?? e.name_de ?? e.name_en ?? e.name,
        }));
      } catch (e: any) {
        this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler';
      } finally {
        this.loading = false;
      }
    },

    /**
     * Findings for the selected exam.
     * URLs (from show_urls): /api/examinations/<int:examination_id>/findings/
     */
    async loadFindingsForExamination(examId: number): Promise<Finding[]> {
      if (!examId) return [];
      this.loading = true; this.error = null;
      try {
        const res = await axiosInstance.get(`/api/examinations/${examId}/findings/`);
        const findings: Finding[] = res.data;
        this.findingsByExam.set(examId, findings);
        return findings;
      } catch (e: any) {
        this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler';
        return [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Classifications for a finding
     * Your URLs: /api/findings/<int:finding_id>/classifications/
     * (You also have specific endpoints for location/morphology, but the combined one is easiest.)
     */
    async loadFindingClassifications(findingId: number): Promise<ClassifPayload> {
      this.loading = true; this.error = null;
      try {
        const res = await axiosInstance.get(`/api/findings/${findingId}/classifications/`);
        const payload: ClassifPayload = res.data;
        this.classificationsByFinding.set(findingId, payload);
        return payload;
      } catch (e: any) {
        this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler';
        return { locationClassifications: [], morphologyClassifications: [] };
      } finally {
        this.loading = false;
      }
    },
  },
});
