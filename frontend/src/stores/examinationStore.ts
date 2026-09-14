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

function optionalString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

function normalizeExamination(entry: unknown): Examination | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as Record<string, unknown>
  const fallbackName = optionalString(record, 'name', 'name_de') ?? ''
  const name = optionalString(record, 'name', 'nameDe') ?? fallbackName
  const nameDe = optionalString(record, 'nameDe', 'name_de')
  const nameEn = optionalString(record, 'nameEn', 'name_en')
  const displayName = optionalString(record, 'displayName', 'display_name')
  const id = Number(record.id)
  if (!Number.isFinite(id)) return null
  return {
    id,
    name,
    nameDe,
    nameEn,
    name_de: nameDe,
    name_en: nameEn,
    displayName: getCoreConceptDisplayName({ name, nameDe, nameEn, displayName }, name)
  }
}

function requireDropdownRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object' && 'results' in value && Array.isArray(value.results)) {
    return value.results
  }
  throw new TypeError('Examination dropdown response does not match the expected contract')
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function stringProperty(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' ? value : null
}

function examinationRequestError(error: unknown): string {
  const candidate = objectRecord(error)
  const response = objectRecord(candidate.response)
  const data = objectRecord(response.data)
  return (
    stringProperty(data, 'detail') ?? stringProperty(candidate, 'message') ?? 'Unbekannter Fehler'
  )
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
        const dropdownPayload = await axiosInstance.get<unknown>(
          r(endpoints.examination.examinationsDropdown)
        )
        this.exams = requireDropdownRows(dropdownPayload.data)
          .map(normalizeExamination)
          .filter((entry): entry is Examination => entry !== null)
      } catch (e: unknown) {
        this.exams = []
        this.error = examinationRequestError(e)
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
