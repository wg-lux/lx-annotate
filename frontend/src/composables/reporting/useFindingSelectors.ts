import { computed, ref } from 'vue'

import {
  extractFindingId,
  getFindingDisplayName,
  type Finding,
  type PatientFindingRow
} from '@/api/findings.contract'
import { findingsApi } from '@/api/findingsApi'
import { usePatientFindingStore } from '@/stores/patientFindingStore'

type PatientFindingLike = Partial<PatientFindingRow> & {
  patientExamination?: number
  patient_examination?: number
  isActive?: boolean
  is_active?: boolean
}

const isActivePatientFinding = (row: PatientFindingLike): boolean =>
  row.isActive !== false && row.is_active !== false

const getPatientExaminationIdFromRow = (row: PatientFindingLike): number | null => {
  const candidate = row.patientExamination ?? row.patient_examination
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null
}

export function useFindingSelectors() {
  const patientFindingStore = usePatientFindingStore()
  const catalogState = useFindingCatalogState()

  const catalogFindings = computed<readonly Finding[]>(() => catalogState.findings.value)
  const loading = computed(() => catalogState.loading.value || patientFindingStore.loading)

  const ensureCatalogLoaded = async (): Promise<readonly Finding[]> => {
    if (!catalogState.findings.value.length) {
      await catalogState.fetchFindings()
    }
    return catalogState.findings.value
  }

  const ensurePatientFindingsLoaded = async (
    patientExaminationId: number | null | undefined
  ): Promise<readonly PatientFindingLike[]> => {
    if (!patientExaminationId) return []
    await patientFindingStore.fetchPatientFindings(patientExaminationId)
    return patientFindingStore.patientFindings as PatientFindingLike[]
  }

  const getFindingById = (findingId: number): Finding | undefined =>
    catalogState.findingsById.value.get(findingId)

  const getFindingNameById = (findingId: number, fallbackName?: string): string => {
    if (fallbackName) return fallbackName
    return getFindingDisplayName(getFindingById(findingId) ?? { id: findingId, name: `Befund ${findingId}` })
  }

  const getAttachedFindingIds = (patientExaminationId: number | null | undefined): number[] => {
    if (!patientExaminationId) return []

    const rows = (patientFindingStore.patientFindings as PatientFindingLike[]).filter(
      (row) =>
        isActivePatientFinding(row) && getPatientExaminationIdFromRow(row) === patientExaminationId
    )

    const ids = rows
      .map((row) => extractFindingId(row.finding))
      .filter((findingId): findingId is number => findingId !== null)

    if (ids.length > 0) {
      catalogState.patientFindingIdsByPatientExamination.value.set(
        patientExaminationId,
        Array.from(new Set(ids))
      )
      return ids
    }

    return catalogState.patientFindingIdsByPatientExamination.value.get(patientExaminationId) ?? []
  }

  const isFindingAttached = (
    patientExaminationId: number | null | undefined,
    findingId: number
  ): boolean => getAttachedFindingIds(patientExaminationId).includes(findingId)

  return {
    catalogFindings,
    loading,
    ensureCatalogLoaded,
    ensurePatientFindingsLoaded,
    getFindingById,
    getFindingNameById,
    getAttachedFindingIds,
    isFindingAttached
  }
}

const catalogFindingsState = ref<Finding[]>([])
const catalogFindingsByIdState = ref<Map<number, Finding>>(new Map())
const patientFindingIdsByPatientExaminationState = ref<Map<number, number[]>>(new Map())
const catalogLoadingState = ref(false)
const catalogErrorState = ref<string | null>(null)

function useFindingCatalogState() {
  const fetchFindings = async (): Promise<readonly Finding[]> => {
    try {
      catalogLoadingState.value = true
      catalogErrorState.value = null
      const nextFindings = await findingsApi.listFindings()
      catalogFindingsState.value = nextFindings
      catalogFindingsByIdState.value = new Map(
        nextFindings.map((finding) => [finding.id, finding] as const)
      )
      return catalogFindingsState.value
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown findings error'
      catalogErrorState.value = `Fehler beim Laden der Befunde: ${message}`
      console.error('Fetch findings error:', error)
      return []
    } finally {
      catalogLoadingState.value = false
    }
  }

  return {
    findings: catalogFindingsState,
    findingsById: catalogFindingsByIdState,
    patientFindingIdsByPatientExamination: patientFindingIdsByPatientExaminationState,
    loading: catalogLoadingState,
    error: catalogErrorState,
    fetchFindings
  }
}
