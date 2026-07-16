import { defineStore } from 'pinia'
import axiosInstance, { r } from '@/api/axiosInstance'
import { findingsApi, parseFindingsApiError } from '@/api/findingsApi'
import type { Finding, FindingClassification } from '@/api/findings.contract'
import { endpoints } from '@/types/api/endpoints'
import {
  getCoreConceptDisplayName,
  type ClassificationChoiceCore,
  type ExaminationCore
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
  displayName?: string
}
export interface MorphologyClassificationChoice extends Pick<ClassificationChoiceCore, 'name'> {
  id: number
  nameDe?: string
  name_de?: string
  displayName?: string
}

export type LocationClassification = FindingClassification
export type MorphologyClassification = FindingClassification

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
        displayName: getCoreConceptDisplayName(e, e.name)
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
     * The patient-examinations dropdown action is the canonical endpoint for
     * examination choices used while setting up a reporting case.
     */
    async fetchExaminations(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const normalizeRows = (rows: unknown[]): void => {
          this.exams = rows
            .map((entry) => {
              if (!entry || typeof entry !== 'object') return null
              const row = entry as Record<string, unknown>
              const fallbackName =
                typeof row.name === 'string'
                  ? row.name
                  : typeof row.name_de === 'string'
                    ? row.name_de
                    : ''
              const name =
                typeof row.name === 'string'
                  ? row.name
                  : typeof row.nameDe === 'string'
                    ? String(row.nameDe)
                    : fallbackName
              const nameDe =
                typeof row.nameDe === 'string'
                  ? row.nameDe
                  : typeof row.name_de === 'string'
                    ? row.name_de
                    : undefined
              const nameEn =
                typeof row.nameEn === 'string'
                  ? row.nameEn
                  : typeof row.name_en === 'string'
                    ? row.name_en
                    : undefined
              const displayNameSource =
                typeof row.displayName === 'string'
                  ? String(row.displayName)
                  : typeof row.display_name === 'string'
                    ? String(row.display_name)
                    : undefined

              return {
                id: Number(row.id),
                name,
                nameDe,
                nameEn,
                name_de: nameDe,
                name_en: nameEn,
                displayName: getCoreConceptDisplayName(
                  {
                    name,
                    nameDe,
                    nameEn,
                    displayName: displayNameSource
                  },
                  name
                )
              }
            })
            .filter((entry) => entry && Number.isFinite(entry.id)) as Examination[]
        }

        const dropdownPayload = await axiosInstance.get(endpoints.examination.examinationsDropdown)
        const dropdownRows =
          Array.isArray(dropdownPayload.data) ? dropdownPayload.data :
            Array.isArray(dropdownPayload.data?.results)
              ? dropdownPayload.data.results
              : []

        normalizeRows(dropdownRows)
      } catch (e: any) {
        this.exams = []
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
        const findings = await findingsApi.getExaminationFindings(examId)
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
          locationClassifications: classifications.filter((classification) =>
            classification.classificationTypes.includes('location')
          ),
          morphologyClassifications: classifications.filter((classification) =>
            classification.classificationTypes.includes('morphology')
          )
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
