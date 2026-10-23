import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { PatientMedicalLedger, PatientMedicationCreatePayload } from '@/api/patientService'

export interface MedicalReference {
  recordType: 'medication' | 'lab_value' | 'unit'
  name: string
  defaultUnit?: { name: string; version: number | null } | null
  abbreviation?: string | null
}

export interface CaseMedicalPayload {
  patient: string
  caseId: number
  medications?: PatientMedicationCreatePayload[]
  labValues?: {
    labValue: string
    value?: number
    valueStr?: string
    timestamp: string
    unit: string | null
  }[]
}

export async function fetchMedicalTerminology(patientId: number): Promise<MedicalReference[]> {
  const response = await axiosInstance.get<{ records: MedicalReference[] }>(
    r(`${endpoints.patient.patientById(patientId)}medical-terminology/`)
  )
  return response.data.records
}

export async function createCaseMedicalRecords(
  patientId: number,
  payload: CaseMedicalPayload,
  idempotencyKey: string
): Promise<PatientMedicalLedger> {
  const response = await axiosInstance.post<PatientMedicalLedger>(
    r(endpoints.patient.patientMedicalLedger(patientId)),
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } }
  )
  return response.data
}
