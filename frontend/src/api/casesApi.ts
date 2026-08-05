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
  documents: CaseDocument[]
  patientMedications: number[]
  patientMedicationSchedules: number[]
  patientLabSamples: number[]
  patientLabValues: number[]
}

export type CaseDocument = {
  mediaType: string
  id: number
  uuid?: string
  patientExaminationId: number
  occurrenceAt: string
  fileName?: string | null
  title?: string
  status?: string
  version?: number
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

export type AttachCaseDocumentPayload = {
  mediaType: 'pdf' | 'video'
  mediaId: number
  patientExaminationId: number
}

function normalizeCaseRows(data: unknown): PatientCase[] {
  const rows = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.results)
      ? data.results
      : null
  if (!rows) {
    throw new TypeError('Case list response must be an array or a paginated array')
  }
  return rows.map((row, index) => requirePatientCase(row, `cases[${String(index)}]`))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`Invalid case response at ${path}: expected an object`)
  return value
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid case response at ${path}: expected a string`)
  }
  return value
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : requireString(value, path)
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : requireString(value, path)
}

function optionalNullableString(value: unknown, path: string): string | null | undefined {
  return value === undefined ? undefined : nullableString(value, path)
}

function requireInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`Invalid case response at ${path}: expected a positive integer`)
  }
  return value
}

function optionalInteger(value: unknown, path: string): number | undefined {
  return value === undefined ? undefined : requireInteger(value, path)
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`Invalid case response at ${path}: expected a boolean`)
  }
  return value
}

function requireIntegerArray(value: unknown, path: string): number[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`Invalid case response at ${path}: expected an array`)
  }
  return value.map((entry, index) => requireInteger(entry, `${path}[${String(index)}]`))
}

function requireCasePatientExamination(value: unknown, path: string): CasePatientExamination {
  const record = requireRecord(value, path)
  const patientDataValue = record.patientData
  const patientData =
    patientDataValue === undefined || patientDataValue === null
      ? patientDataValue
      : { id: optionalInteger(requireRecord(patientDataValue, `${path}.patientData`).id, `${path}.patientData.id`) }
  const examinationValue = record.examination
  const examination =
    examinationValue === undefined || examinationValue === null || typeof examinationValue === 'string'
      ? examinationValue
      : {
          id: optionalInteger(
            requireRecord(examinationValue, `${path}.examination`).id,
            `${path}.examination.id`
          ),
          name: optionalString(
            requireRecord(examinationValue, `${path}.examination`).name,
            `${path}.examination.name`
          )
        }
  const examinationName = optionalNullableString(record.examinationName, `${path}.examinationName`)
  const dateStart = optionalNullableString(record.dateStart, `${path}.dateStart`)
  return {
    id: requireInteger(record.id, `${path}.id`),
    ...(patientData === undefined ? {} : { patientData }),
    ...(examination === undefined ? {} : { examination }),
    ...(examinationName === undefined ? {} : { examinationName }),
    ...(dateStart === undefined ? {} : { dateStart })
  }
}

function requireCaseDocument(value: unknown, path: string): CaseDocument {
  const record = requireRecord(value, path)
  const uuid = optionalString(record.uuid, `${path}.uuid`)
  const fileName = optionalNullableString(record.fileName, `${path}.fileName`)
  const title = optionalString(record.title, `${path}.title`)
  const status = optionalString(record.status, `${path}.status`)
  const version = optionalInteger(record.version, `${path}.version`)
  return {
    mediaType: requireString(record.mediaType, `${path}.mediaType`),
    id: requireInteger(record.id, `${path}.id`),
    patientExaminationId: requireInteger(
      record.patientExaminationId,
      `${path}.patientExaminationId`
    ),
    occurrenceAt: requireString(record.occurrenceAt, `${path}.occurrenceAt`),
    ...(uuid === undefined ? {} : { uuid }),
    ...(fileName === undefined ? {} : { fileName }),
    ...(title === undefined ? {} : { title }),
    ...(status === undefined ? {} : { status }),
    ...(version === undefined ? {} : { version })
  }
}

function requirePatientCase(value: unknown, path = 'case'): PatientCase {
  const record = requireRecord(value, path)
  if (!Array.isArray(record.patientExaminations) || !Array.isArray(record.documents)) {
    throw new TypeError(`Invalid case response at ${path}: expected examination/document arrays`)
  }
  return {
    id: requireInteger(record.id, `${path}.id`),
    caseId: requireString(record.caseId, `${path}.caseId`),
    patient: requireInteger(record.patient, `${path}.patient`),
    admissionDate: requireString(record.admissionDate, `${path}.admissionDate`),
    leaveDate: nullableString(record.leaveDate, `${path}.leaveDate`),
    isActive: requireBoolean(record.isActive, `${path}.isActive`),
    isClosed: requireBoolean(record.isClosed, `${path}.isClosed`),
    isDeleted: requireBoolean(record.isDeleted, `${path}.isDeleted`),
    patientExaminations: record.patientExaminations.map((entry, index) =>
      requireCasePatientExamination(entry, `${path}.patientExaminations[${String(index)}]`)
    ),
    documents: record.documents.map((entry, index) =>
      requireCaseDocument(entry, `${path}.documents[${String(index)}]`)
    ),
    patientMedications: requireIntegerArray(record.patientMedications, `${path}.patientMedications`),
    patientMedicationSchedules: requireIntegerArray(
      record.patientMedicationSchedules,
      `${path}.patientMedicationSchedules`
    ),
    patientLabSamples: requireIntegerArray(record.patientLabSamples, `${path}.patientLabSamples`),
    patientLabValues: requireIntegerArray(record.patientLabValues, `${path}.patientLabValues`)
  }
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
  const response = await axiosInstance.post<unknown>(r(endpoints.case.cases), payload)
  return requirePatientCase(response.data)
}

export async function createCaseWithExamination(
  payload: CreateCaseWithExaminationPayload
): Promise<CreateCaseWithExaminationResponse> {
  const response = await axiosInstance.post<unknown>(r(endpoints.case.createWithExamination), payload)
  const record = requireRecord(response.data, 'createCaseWithExamination')
  return {
    case: requirePatientCase(record.case, 'createCaseWithExamination.case'),
    patientExamination: requireCasePatientExamination(
      record.patientExamination,
      'createCaseWithExamination.patientExamination'
    )
  }
}

export async function attachCaseDocument(
  caseId: string,
  payload: AttachCaseDocumentPayload
): Promise<PatientCase> {
  const response = await axiosInstance.post<unknown>(r(endpoints.case.documents(caseId)), payload)
  return requirePatientCase(response.data)
}
