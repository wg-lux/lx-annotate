import { defineStore } from 'pinia'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { Patient } from '@/stores/patientStore'
import type { Video } from '@/stores/videoStore'
import type { Examination } from './examinationStore'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('patient-examination-store')

// --- Interfaces ---
export interface PatientExamination {
  patient: Patient
  examination: Examination
  video: Video | null
  id: number
  knowledgeBaseModule?: string | null
  knowledgeBaseVersion?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isPatient(value: unknown): value is Patient {
  return isRecord(value) && typeof value.firstName === 'string' && typeof value.lastName === 'string'
}

function isExamination(value: unknown): value is Examination {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string'
}

function isVideo(value: unknown): value is Video {
  return isRecord(value) && typeof value.id === 'number'
}

function isPatientExamination(value: unknown): value is PatientExamination {
  return isRecord(value) && typeof value.id === 'number' && isPatient(value.patient) &&
    isExamination(value.examination) && (value.video === null || isVideo(value.video)) &&
    (value.knowledgeBaseModule === undefined || value.knowledgeBaseModule === null ||
      typeof value.knowledgeBaseModule === 'string') &&
    (value.knowledgeBaseVersion === undefined || value.knowledgeBaseVersion === null ||
      typeof value.knowledgeBaseVersion === 'string')
}

function requirePatientExamination(value: unknown): PatientExamination {
  if (!isPatientExamination(value)) {
    throw new TypeError('Patient examination response does not match the expected contract')
  }
  return value
}

function requirePatientExaminationList(value: unknown): PatientExamination[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.results)
      ? value.results
      : null
  if (!rows || !rows.every((row: unknown) => isPatientExamination(row))) {
    throw new TypeError('Patient examination list response does not match the expected contract')
  }
  return rows.filter((row: unknown): row is PatientExamination => isPatientExamination(row))
}

function requestErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Unbekannter Fehler'
  }
  const candidate = error as {
    message?: unknown
    response?: { data?: { detail?: unknown } }
  }
  const detail = candidate.response?.data?.detail
  if (typeof detail === 'string' && detail) {
    return detail
  }
  return typeof candidate.message === 'string' && candidate.message
    ? candidate.message
    : 'Unbekannter Fehler'
}

export const usePatientExaminationStore = defineStore('patientExamination', {
  state: () => ({
    loading: false,
    error: null as string | null,
    patientExaminations: [] as PatientExamination[],
    selectedPatientExaminationId: null as number | null
  }),

  getters: {
    getPatientExaminationById: (state) => {
      return (id: number) => state.patientExaminations.find((pe) => pe.id === id) || null
    },
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getAllPatientExaminations: (state) => state.patientExaminations,
    getSelectedPatientExaminationId: (state) => state.selectedPatientExaminationId
  },
  actions: {
    async doesPatientExaminationExist(id: number): Promise<boolean> {
      try {
        this.loading = true
        this.error = null
        const response = await axiosInstance.get<unknown>(
          r(endpoints.patient.checkPatientExaminationExists(id))
        )
        if (
          response.status === 200 && isRecord(response.data) &&
          typeof response.data.exists === 'boolean'
        ) {
          return response.data.exists
        }

        throw new TypeError(
          'Patient examination existence response does not match the expected contract'
        )
      } catch (err: unknown) {
        this.error =
          'Fehler beim Überprüfen der Patientenuntersuchung: ' +
          requestErrorMessage(err)
        logger.error('existence-check-failed', err, {
          operation: 'check',
          outcome: 'rejected'
        })
        return false
      } finally {
        this.loading = false
      }
    },
    async fetchPatientExaminations(patientId: number) {
      try {
        this.loading = true
        this.error = null
        if (!(await this.doesPatientExaminationExist(patientId))) {
          this.patientExaminations = []
          return
        }
        const response = await axiosInstance.get<unknown>(
          r(endpoints.examination.patientExaminationList),
          { params: { patient_id: patientId } }
        )
        this.patientExaminations = requirePatientExaminationList(response.data)
      } catch (err: unknown) {
        this.error =
          'Fehler beim Laden der Patientenuntersuchungen: ' +
          requestErrorMessage(err)
        logger.error('examination-list-load-failed', err, {
          operation: 'list',
          outcome: 'rejected'
        })
      } finally {
        this.loading = false
      }
    },

    async fetchPatientExaminationById(id: number) {
      try {
        this.loading = true
        this.error = null
        const response = await axiosInstance.get<unknown>(
          r(endpoints.examination.patientExaminationDetail(id))
        )
        const patientExamination = requirePatientExamination(response.data)
        const index = this.patientExaminations.findIndex((existingPe) => existingPe.id === patientExamination.id)
        if (index !== -1) {
          this.patientExaminations[index] = patientExamination
        } else {
          this.patientExaminations.push(patientExamination)
        }
      } catch (err: unknown) {
        this.error =
          'Fehler beim Laden der Patientenuntersuchung: ' +
          requestErrorMessage(err)
        logger.error('examination-detail-load-failed', err, {
          operation: 'detail',
          outcome: 'rejected'
        })
      } finally {
        this.loading = false
      }
    },

    addPatientExamination(pe: PatientExamination) {
      this.patientExaminations.push(pe)
    },
    removePatientExamination(id: number) {
      this.patientExaminations = this.patientExaminations.filter((pe) => pe.id !== id)
      if (this.selectedPatientExaminationId === id) {
        this.selectedPatientExaminationId = null
      }
    },
    setCurrentPatientExaminationId(id: number | null) {
      this.selectedPatientExaminationId = id
    },
    getCurrentPatientExaminationId(): number | null {
      return this.selectedPatientExaminationId
    },
    getCurrentPatientExaminationExaminationId(): number | null {
      const patientExamination = this.patientExaminations.find((pe) => pe.id === this.selectedPatientExaminationId)
      return patientExamination ? patientExamination.examination.id : null
    }
  }
})
