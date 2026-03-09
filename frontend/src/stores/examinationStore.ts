import { defineStore } from 'pinia'
import axiosInstance from '@/api/axiosInstance'
import type { Finding } from '@/stores/findingStore'
import { findingsApi, parseFindingsApiError } from '@/api/findingsApi'
import type {
  ClassificationChoiceCore,
  ClassificationCore,
  ExaminationCore
} from '@/types/coreConcepts'

// --- Interfaces ---
export interface Examination extends Pick<ExaminationCore, 'name'> {
  id: number
  nameDe?: string
  nameEn?: string
  name_de?: string
  name_en?: string
  displayName?: string
}

export interface LocationClassificationChoice extends Pick<ClassificationChoiceCore, 'name'> {
  id: number
  nameDe?: string
  name_de?: string
}
export interface MorphologyClassificationChoice extends Pick<ClassificationChoiceCore, 'name'> {
  id: number
  nameDe?: string
  name_de?: string
}

export interface LocationClassification extends Pick<ClassificationCore, 'name'> {
  id: number
  nameDe?: string
  name_de?: string
  choices: LocationClassificationChoice[]
  required?: boolean
}

export interface MorphologyClassification extends Pick<ClassificationCore, 'name'> {
  id: number
  nameDe?: string
  name_de?: string
  choices: MorphologyClassificationChoice[]
  required?: boolean
}

type ClassifPayload = {
  locationClassifications: LocationClassification[]
  morphologyClassifications: MorphologyClassification[]
}

export const useExaminationStore = defineStore('examination', {
  state: () => ({
    loading: false as boolean,
    error: null as string | null,
    exams: [] as Examination[],
    selectedExaminationId: null as number | null,

    // cache (optional)
    findingsByExam: new Map<number, Finding[]>(),
    classificationsByFinding: new Map<number, ClassifPayload>()
  }),

  getters: {
    examinations(state): Examination[] {
      return state.exams
    },
    examinationsDropdown(state): { id: number; name: string; displayName: string }[] {
      return state.exams.map((e) => ({
        id: e.id,
        name: e.name,
        displayName: e.displayName ?? e.nameDe ?? e.name_de ?? e.name
      }))
    },
    selectedExamination(state): Examination | null {
      return state.exams.find((e) => e.id === state.selectedExaminationId) ?? null
    },
    availableFindings(state): Finding[] {
      const id = state.selectedExaminationId
      if (!id) return []
      return state.findingsByExam.get(id) ?? []
    }
  },

  actions: {
    setSelectedExamination(id: number | null) {
      this.selectedExaminationId = id
    },

    /**
     * Load examinations list.
     * We have 2 viable endpoints in your project:
     *  - /api/examinations/  (generic list)
     *  - /api/patient-examinations/examinations_dropdown/ (already tailored for dropdown)
     *
     * While patient Examinations will filter the examinations available for the patient, examinations query will return all available examinations.
     */
    async fetchExaminations(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const res = await axiosInstance.get('/api/examinations/')
        // Normalize to Examination[]
        this.exams = (res.data as any[]).map((e) => ({
          id: e.id,
          name: e.name,
          nameDe: e.nameDe ?? e.name_de,
          nameEn: e.nameEn ?? e.name_en,
          name_de: e.name_de ?? e.nameDe,
          name_en: e.name_en ?? e.nameEn,
          displayName:
            e.displayName ?? e.nameDe ?? e.name_de ?? e.nameEn ?? e.name_en ?? e.name
        }))
      } catch (e: any) {
        this.error = e?.response?.data?.detail ?? e?.message ?? 'Unbekannter Fehler'
      } finally {
        this.loading = false
      }
    },

    /**
     * Findings for the selected exam.
     * URLs (from show_urls): /api/examinations/<int:examination_id>/findings/
     */
    async loadFindingsForExamination(examId: number): Promise<Finding[]> {
      if (!examId) return []
      this.loading = true
      this.error = null
      try {
        const findings: Finding[] = (await findingsApi.getExaminationFindings(
          examId
        )) as Finding[]
        this.findingsByExam.set(examId, findings)
        return findings
      } catch (e: any) {
        const parsed = parseFindingsApiError(e)
        this.error = parsed.message
        return []
      } finally {
        this.loading = false
      }
    },
    async getCurrentExaminationId(): Promise<number | null> {
      if (this.selectedExaminationId) return this.selectedExaminationId
      await this.fetchExaminations()
      return this.selectedExaminationId
    },

    /**
     * Classifications for a finding
     * Your URLs: /api/findings/<int:finding_id>/classifications/
     * (You also have specific endpoints for location/morphology, but the combined one is easiest.)
     */
    async loadFindingClassifications(findingId: number): Promise<ClassifPayload> {
      this.loading = true
      this.error = null
      try {
        const classifications = await findingsApi.getFindingClassifications(findingId)
        const payload: ClassifPayload = {
          locationClassifications: Array.isArray(
            (classifications as any)?.locationClassifications
          )
            ? ((classifications as any).locationClassifications as LocationClassification[])
            : (classifications as LocationClassification[]),
          morphologyClassifications: Array.isArray(
            (classifications as any)?.morphologyClassifications
          )
            ? ((classifications as any).morphologyClassifications as MorphologyClassification[])
            : []
        }
        this.classificationsByFinding.set(findingId, payload)
        return payload
      } catch (e: any) {
        const parsed = parseFindingsApiError(e)
        this.error = parsed.message
        return { locationClassifications: [], morphologyClassifications: [] }
      } finally {
        this.loading = false
      }
    }
  }
})
