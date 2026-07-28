import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export type CasePatientExamination = {
  id: number
  patientData?: { id?: number } | null
  examination?: string | { id?: number; name?: string } | null
  examinationName?: string | null
  dateStart?: string | null
}

export type PatientCase = {
  id: number
  caseId: string
  patient: number
  admissionDate: string
  leaveDate: string | null
  isActive: boolean
  isClosed: boolean
  isDeleted: boolean
  patientExaminations: CasePatientExamination[]
  patientMedications: number[]
  patientMedicationSchedules: number[]
  patientLabSamples: number[]
  patientLabValues: number[]
}

export type CaseListParams = {
  patientId?: number
  patientExaminationId?: number
}

export type CreatePatientCasePayload = {
  patient: number
  admissionDate: string
  leaveDate?: string | null
  patientExaminationIds?: number[]
  patientMedicationIds?: number[]
  patientMedicationScheduleIds?: number[]
  patientLabSampleIds?: number[]
  patientLabValueIds?: number[]
}

export type CreateCaseWithExaminationPayload = {
  admissionDate: string
  patientExamination: {
    patient: string
    examination: string
    dateStart: string
    patientBirthDate: string | null
    patientGender: string | null
  }
}

export type CreateCaseWithExaminationResponse = {
  case: PatientCase
  patientExamination: CasePatientExamination
}

function normalizeCaseRows(data: unknown): PatientCase[] {
  if (Array.isArray(data)) return data as PatientCase[]
  if (data && typeof data === 'object') {
    const results = (data as { results?: unknown }).results
    if (Array.isArray(results)) return results as PatientCase[]
  }
  return []
}

export async function fetchPatientCases(params: CaseListParams): Promise<PatientCase[]> {
  const response = await axiosInstance.get(r(endpoints.case.cases), {
    params: {
      patient_id: params.patientId,
      patient_examination_id: params.patientExaminationId
    }
  })
  return normalizeCaseRows(response.data)
}

export async function createPatientCase(payload: CreatePatientCasePayload): Promise<PatientCase> {
  const response = await axiosInstance.post(r(endpoints.case.cases), payload)
  return response.data as PatientCase
}

export async function createCaseWithExamination(
  payload: CreateCaseWithExaminationPayload
): Promise<CreateCaseWithExaminationResponse> {
  const response = await axiosInstance.post(r(endpoints.case.createWithExamination), payload)
  return response.data as CreateCaseWithExaminationResponse
}
