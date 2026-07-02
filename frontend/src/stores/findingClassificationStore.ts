import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import {
  mergeFindingClassifications,
  normalizeFindings,
  type Finding,
  type FindingClassification
} from '@/api/findings.contract'

export type { Finding, FindingClassification }

export const useFindingClassificationStore = defineStore('findingsClassificationStore', () => {
  const findings = ref<Record<number, Finding>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  const getClassificationsForFinding = (findingId: number): FindingClassification[] => {
    const finding = findings.value[findingId]
    return mergeFindingClassifications(finding)
  }

  const getAllFindings = computed(() => Object.values(findings.value))

  const getFindingById = (id: number): Finding | undefined => findings.value[id]

  const clearFindings = (): void => {
    findings.value = {}
    error.value = null
  }

  const setError = (err: string): void => {
    error.value = err
  }

  const setLoading = (isLoading: boolean): void => {
    loading.value = isLoading
  }

  const replaceFindings = (entries: Finding[]): void => {
    findings.value = Object.fromEntries(entries.map((finding) => [finding.id, finding]))
  }

  const upsertFindings = (entries: Finding[]): void => {
    if (!entries.length) return
    findings.value = {
      ...findings.value,
      ...Object.fromEntries(entries.map((finding) => [finding.id, finding]))
    }
  }

  const setClassificationChoicesFromLookup = (lookupFindings: unknown): void => {
    const normalized = normalizeFindings(lookupFindings)
    replaceFindings(normalized)
  }

  return {
    findings: readonly(findings),
    loading: readonly(loading),
    error: readonly(error),
    getFindingById,
    getClassificationsForFinding,
    getAllFindings,
    clearFindings,
    setError,
    setLoading,
    replaceFindings,
    upsertFindings,
    setClassificationChoicesFromLookup
  }
})
