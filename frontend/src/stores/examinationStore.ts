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
    loading: false,
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
      const examinationId = state.selectedExaminationId
      if (!examinationId) return []
      return state.findingsByExam.get(examinationId) ?? []
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
              const examinationRecord = entry as Record<string, unknown>
              const fallbackName =
                typeof examinationRecord.name === 'string'
                  ? examinationRecord.name
                  : typeof examinationRecord.name_de === 'string'
                    ? examinationRecord.name_de
                    : ''
              const name =
                typeof examinationRecord.name === 'string'
                  ? examinationRecord.name
                  : typeof examinationRecord.nameDe === 'string'
                    ? examinationRecord.nameDe
                    : fallbackName
              const nameDe =
                typeof examinationRecord.nameDe === 'string'
                  ? examinationRecord.nameDe
                  : typeof examinationRecord.name_de === 'string'
                    ? examinationRecord.name_de
                    : undefined
              const nameEn =
                typeof examinationRecord.nameEn === 'string'
                  ? examinationRecord.nameEn
                  : typeof examinationRecord.name_en === 'string'
                    ? examinationRecord.name_en
                    : undefined
              const displayNameSource =
                typeof examinationRecord.displayName === 'string'
                  ? examinationRecord.displayName
                  : typeof examinationRecord.display_name === 'string'
                    ? examinationRecord.display_name
                    : undefined

              return {
                id: Number(examinationRecord.id),
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

        const dropdownPayload = await axiosInstance.get<unknown>(
          r(endpoints.examination.examinationsDropdown)
        )
        const dropdownData = dropdownPayload.data
        const dropdownRows: unknown[] = Array.isArray(dropdownData)
          ? dropdownData
          : dropdownData &&
              typeof dropdownData === 'object' &&
              'results' in dropdownData &&
              Array.isArray(dropdownData.results)
            ? dropdownData.results
            : (() => {
                throw new TypeError(
                  'Examination dropdown response does not match the expected contract'
                )
              })()

        normalizeRows(dropdownRows)
      } catch (e: unknown) {
        this.exams = []
        const candidate = e !== null && typeof e === 'object' ? e : {}
        const response =
          'response' in candidate &&
          candidate.response !== null &&
          typeof candidate.response === 'object'
            ? candidate.response
            : {}
        const data =
          'data' in response && response.data !== null && typeof response.data === 'object'
            ? response.data
            : {}
        const detail = 'detail' in data && typeof data.detail === 'string' ? data.detail : null
        const message =
          'message' in candidate && typeof candidate.message === 'string' ? candidate.message : null
        this.error = detail ?? message ?? 'Unbekannter Fehler'
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
      } catch (e: unknown) {
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
      } catch (e: unknown) {
        const parsed = parseFindingsApiError(e)
        this.error = parsed.message
        return { locationClassifications: [], morphologyClassifications: [] }
      } finally {
        this.loading = false
      }
    }
  }
})
