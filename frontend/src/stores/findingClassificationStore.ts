import { defineStore } from 'pinia'
import { reactive, ref, computed, readonly } from 'vue'
import type { ClassificationChoiceCore, ClassificationCore, FindingCore } from '@/types/coreConcepts'

export interface FindingChoice extends Pick<ClassificationChoiceCore, 'name' | 'description'> {
  id: number
  description: string
  subcategories: Record<string, any>
  numerical_descriptors: Record<string, any>
}

export interface FindingClassification extends Pick<ClassificationCore, 'name' | 'description'> {
  id: number
  description: string
  choices: FindingChoice[]
  classification_types: string[]
}

export interface Finding extends Pick<FindingCore, 'name'> {
  id: number
  description: string
  nameDe?: string
  examinations: string[]
  PatientExaminationId?: number
  FindingClassifications: FindingClassification[]
  findingTypes: FindingCore['findingTypes']
  findingInterventions: FindingCore['interventions']
  classifications?: FindingClassification[] // Add for compatibility
  location_classifications?: FindingClassification[]
  morphology_classifications?: FindingClassification[]
}

export const useFindingClassificationStore = defineStore('findingsClassificationStore', () => {
  // State
  const findings = ref<Record<number, Finding>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const getClassificationsForFinding = (findingId: number): FindingClassification[] => {
    const finding = findings.value[findingId]
    if (!finding) return []
    const primaryClassifications =
      Array.isArray(finding.classifications) && finding.classifications.length
        ? finding.classifications
        : Array.isArray(finding.FindingClassifications)
          ? finding.FindingClassifications
          : []
    return [
      ...primaryClassifications,
      ...(Array.isArray(finding.location_classifications) ? finding.location_classifications : []),
      ...(Array.isArray(finding.morphology_classifications)
        ? finding.morphology_classifications
        : [])
    ]
  }

  const getAllFindings = computed(() => Object.values(findings.value))

  const getFindingById = (id: number): Finding | undefined => {
    if (!findings.value[id]) {
      getAllFindings.value // Trigger loading if not already loaded
    }
    return findings.value[id]
  }

  // Actions
  const clearFindings = () => {
    findings.value = {}
    error.value = null
  }

  const setError = (err: string) => {
    error.value = err
  }

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }

  const setClassificationChoicesFromLookup = (lookupFindings: unknown) => {
    const list = Array.isArray(lookupFindings) ? lookupFindings : []
    const findingsMap: Record<number, Finding> = {}
    list.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return
      const finding = entry as Finding
      const id = Number((finding as any).id)
      if (!Number.isFinite(id)) return
      findingsMap[id] = {
        ...finding,
        id
      }
    })
    findings.value = findingsMap
    console.log(
      '📋 [FindingsClassificationStore] Set findings from lookup:',
      Object.keys(findingsMap).length,
      'findings'
    )
  }

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
  }
})
