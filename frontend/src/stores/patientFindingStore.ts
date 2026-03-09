import { defineStore } from 'pinia'
import { ref, readonly, computed } from 'vue'
import type {
  Finding,
  FindingClassification,
  FindingClassificationChoice
} from '@/stores/findingStore'
import type { Patient } from '@/stores/patientStore'
import {
  findingsApi,
  parseFindingsApiError,
  type ClassificationSelection,
  type PatientFindingRow
} from '@/api/findingsApi'

import { usePatientStore } from '@/stores/patientStore'

interface PatientFinding extends Partial<PatientFindingRow> {
  id: number
  examination?: string
  createdAt?: number | string
  updatedAt?: string
  createdBy?: string // ISO date string
  updatedBy?: string
  finding: Finding | PatientFindingRow['finding']
  patient?: Patient
  classifications?: PatientFindingRow['classifications']
  patientExamination?: number
  patient_examination?: number
  isActive?: boolean
  is_active?: boolean
}

interface PatientFindingClassification {
  id: number
  finding: number // PatientFinding ID
  classification: FindingClassification
  classification_choice: FindingClassificationChoice
  is_active: boolean
  subcategories?: Record<string, any>
  numerical_descriptors?: Record<string, any>
}

const usePatientFindingStore = defineStore('patientFinding', () => {
  const patientFindings = ref<PatientFinding[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchPatientFindings = async (patientExaminationId: number) => {
    if (!patientExaminationId) {
      console.warn('fetchPatientFindings wurde ohne patientExaminationId aufgerufen.')
      patientFindings.value = []
      return
    }
    try {
      loading.value = true
      error.value = null
      const payload = await findingsApi.listPatientFindings(patientExaminationId)
      patientFindings.value = Array.isArray(payload) ? (payload as PatientFinding[]) : []
    } catch (err: any) {
      const parsed = parseFindingsApiError(err)
      error.value = `Fehler beim Laden der Patientenbefunde (${parsed.code}): ${parsed.message}`
      console.error('Fetch patient findings error:', err)
    } finally {
      loading.value = false
    }
  }

  const patientFindingsByCurrentPatient = computed(() => {
    const patientStore = usePatientStore()
    const currentPatient = patientStore.getCurrentPatient()
    if (!currentPatient) {
      return []
    }
    return patientFindings.value.filter((pf) => pf.patient?.id === currentPatient.id)
  })

  const createPatientFinding = async (patientFindingData: {
    patient_examination?: number
    patientExamination?: number
    finding: number
    classifications?: ClassificationSelection[]
  }): Promise<PatientFinding> => {
    try {
      loading.value = true
      error.value = null
      const newPatientFinding = (await findingsApi.createPatientFinding({
        patientExamination:
          patientFindingData.patient_examination ?? patientFindingData.patientExamination ?? 0,
        finding: patientFindingData.finding,
        classifications: patientFindingData.classifications || []
      })) as PatientFinding

      // Add to local state
      patientFindings.value.push(newPatientFinding)

      return newPatientFinding
    } catch (err: any) {
      const parsed = parseFindingsApiError(err)
      error.value = `Fehler beim Erstellen des Patientenbefunds (${parsed.code}): ${parsed.message}`
      console.error('Create patient finding error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePatientFinding = async (
    id: number,
    updateData: Partial<PatientFinding>
  ): Promise<PatientFinding> => {
    try {
      loading.value = true
      error.value = null
      const updatedFinding = (await findingsApi.updatePatientFinding(id, {
        finding: Number.isFinite(Number((updateData as any).finding))
          ? Number((updateData as any).finding)
          : undefined,
        isActive:
          typeof (updateData as any).is_active === 'boolean'
            ? (updateData as any).is_active
            : typeof (updateData as any).isActive === 'boolean'
              ? (updateData as any).isActive
              : undefined,
        classifications: Array.isArray((updateData as any).classifications)
          ? (updateData as any).classifications
          : undefined
      })) as PatientFinding

      // Update local state
      const index = patientFindings.value.findIndex((pf) => pf.id === id)
      if (index !== -1) {
        patientFindings.value[index] = updatedFinding
      }

      return updatedFinding
    } catch (err: any) {
      const parsed = parseFindingsApiError(err)
      error.value = `Fehler beim Aktualisieren des Patientenbefunds (${parsed.code}): ${parsed.message}`
      console.error('Update patient finding error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePatientFinding = async (id: number): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      await findingsApi.deletePatientFinding(id)

      // Remove from local state
      patientFindings.value = patientFindings.value.filter((pf) => pf.id !== id)
    } catch (err: any) {
      const parsed = parseFindingsApiError(err)
      error.value = `Fehler beim Löschen des Patientenbefunds (${parsed.code}): ${parsed.message}`
      console.error('Delete patient finding error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    patientFindings: readonly(patientFindings),
    patientFindingsByCurrentPatient,
    loading: readonly(loading),
    error: readonly(error),
    fetchPatientFindings,
    createPatientFinding,
    updatePatientFinding,
    deletePatientFinding
  }
})

export { usePatientFindingStore }
