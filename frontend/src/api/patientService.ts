import axiosInstance, { r, silentRequestConfig } from './axiosInstance';
import axios, { type AxiosResponse } from 'axios';
import { endpoints } from '@/types/api/endpoints'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('patient-service')

// Shape returned by backend (snake_case); we'll map in the component
export type GeneratePseudonymResponse = {
  patientId: number
  patientHash: string
  persisted: boolean
  source: 'server'
  message?: string
  missingFields?: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value))
}

function isOptionalNullableNumber(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function formatSnippet(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function describeInvalidPatientRow(row: unknown): string {
  if (!isRecord(row)) return 'row is not an object'
  const reasons: string[] = []
  if (typeof row.firstName !== 'string') reasons.push('firstName must be a string')
  if (typeof row.lastName !== 'string') reasons.push('lastName must be a string')
  if (!isOptionalNumber(row.id)) reasons.push('id must be a finite number if provided')
  if (!isOptionalNullableString(row.dob)) reasons.push('dob must be string|null')
  if (!isOptionalNullableString(row.gender)) reasons.push('gender must be string|null')
  if (!isOptionalNullableString(row.center)) reasons.push('center must be string|null')
  if (!isOptionalNullableString(row.centerKey)) reasons.push('centerKey must be string|null')
  if (!isOptionalString(row.email)) reasons.push('email must be a string')
  if (!isOptionalString(row.phone)) reasons.push('phone must be a string')
  if (!isOptionalNullableString(row.patientHash)) reasons.push('patientHash must be string|null')
  if (!isOptionalString(row.comments)) reasons.push('comments must be a string')
  if (row.isRealPerson !== undefined && typeof row.isRealPerson !== 'boolean') {
    reasons.push('isRealPerson must be boolean')
  }
  if (!isOptionalNullableString(row.pseudonymFirstName)) {
    reasons.push('pseudonymFirstName must be string|null')
  }
  if (!isOptionalNullableString(row.pseudonymLastName)) {
    reasons.push('pseudonymLastName must be string|null')
  }
  if (!isOptionalNullableNumber(row.sensitiveMetaId)) {
    reasons.push('sensitiveMetaId must be number|null')
  }
  if (reasons.length > 0) {
    return reasons.join(', ')
  }
  return `row keys: ${formatSnippet(row)}`
}

function isPatient(value: unknown): value is Patient {
  return (
    isRecord(value) &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    isOptionalNumber(value.id) &&
    isOptionalNullableString(value.dob) &&
    isOptionalNullableString(value.gender) &&
    isOptionalNullableString(value.center) &&
    isOptionalNullableString(value.centerKey) &&
    isOptionalString(value.email) &&
    isOptionalString(value.phone) &&
    isOptionalNullableString(value.patientHash) &&
    isOptionalString(value.comments) &&
    (value.isRealPerson === undefined || typeof value.isRealPerson === 'boolean') &&
    isOptionalNullableString(value.pseudonymFirstName) &&
    isOptionalNullableString(value.pseudonymLastName) &&
    isOptionalNullableNumber(value.sensitiveMetaId) &&
    isOptionalNullableNumber(value.age) &&
    isOptionalString(value.createdAt) &&
    isOptionalString(value.updatedAt)
  )
}

function requirePatientList(value: unknown): Patient[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.results)
      ? value.results
      : null
  if (!rows) {
    throw new TypeError(
      `Patient list response does not match the expected contract: no array-like payload (snippet: ${formatSnippet(value)})`
    )
  }
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    if (!isPatient(row)) {
      throw new TypeError(
        `Patient list response does not match the expected contract at index ${index}: ${describeInvalidPatientRow(row)}`
      )
    }
  }
  return rows
}

export async function generatePatientPseudonym(id: number): Promise<GeneratePseudonymResponse> {
  if (!Number.isFinite(id) || id <= 0) throw new Error('Ungültige patientId')
  const { data } = await axiosInstance.post<unknown>(r(endpoints.patient.patientPseudonym(id)))
  if (
    !isRecord(data) ||
    typeof data.patientId !== 'number' ||
    typeof data.patientHash !== 'string' ||
    typeof data.persisted !== 'boolean' ||
    data.source !== 'server'
  ) {
    throw new TypeError('Patient pseudonym response does not match the expected contract')
  }
  const message = data.message
  const missingFields = data.missingFields
  if (message !== undefined && typeof message !== 'string') {
    throw new TypeError('Patient pseudonym response contains an invalid message')
  }
  if (
    missingFields !== undefined &&
    (!Array.isArray(missingFields) || !missingFields.every((field) => typeof field === 'string'))
  ) {
    throw new TypeError('Patient pseudonym response contains invalid missing fields')
  }
  return {
    patientId: data.patientId,
    patientHash: data.patientHash,
    persisted: data.persisted,
    source: 'server',
    ...(message === undefined ? {} : { message }),
    ...(missingFields === undefined ? {} : { missingFields })
  }
}

// TypeScript Interfaces für Patient-bezogene Daten
export interface Gender {
  id: number;
  name: string;
  nameDe?: string;
  nameEn?: string;
  abbreviation?: string;
  description?: string;
}

export interface Center {
  id: number;
  centerKey?: string;
  name: string;
  nameDe?: string;
  nameEn?: string;
  description?: string;
}

export interface Patient {
  id?: number;
  firstName: string;
  lastName: string;
  dob?: string | null;
  gender?: string | null;  // Changed to string to match backend
  center?: string | null;  // Changed to string to match backend
  centerKey?: string | null;
  email?: string;
  phone?: string;
  patientHash?: string | null;
  comments?: string;
  isRealPerson?: boolean;  // Added missing property
  
  // Pseudonym properties for anonymization validation
  pseudonymFirstName?: string | null;
  pseudonymLastName?: string | null;
  sensitiveMetaId?: number | null;
  
  // Computed/readonly fields
  age?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientFormData {
  id?: number | null;
  firstName: string;
  lastName: string;
  dob: string | null | undefined;  // Allow undefined for compatibility
  gender: string | null;  // Changed to string to match backend
  center?: string | null;  // Optional because centerKey is the canonical write field
  centerKey?: string | null;
  email: string;
  phone: string;
  patientHash: string;
  comments: string;
  isRealPerson?: boolean;  // Added missing property
}

export interface PatientCreateData {
  firstName: string;
  lastName: string;
  dob?: string | null;
  gender?: string | null;  // Changed to string
  center?: string | null;  // Changed to string
  centerKey?: string | null;
  email?: string;
  phone?: string;
  patientHash?: string | null;
  isRealPerson?: boolean;  // Added missing property
}

export interface PatientUpdateData extends PatientCreateData {
  id: number;
}

export interface PatientListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: Patient[];
}

export type MedicalLedgerJsonValue =
  | string
  | number
  | boolean
  | null
  | MedicalLedgerJsonValue[]
  | { [key: string]: MedicalLedgerJsonValue }

export interface MedicalLedgerIdentity {
  uuid: string
  externalIds: {
    endoregDb: string
  }
  createdAt: string
}

export interface PatientMedicationLedgerRecord extends MedicalLedgerIdentity {
  patient: string
  medicationIndication: string | null
  medication: string
  intakeTimes: string[]
  unit: string | null
  dosage: MedicalLedgerJsonValue
  active: boolean
}

export interface PatientMedicationCreatePayload {
  medication: string
  medicationIndication?: string | null
  intakeTimes?: string[]
  unit?: string | null
  dosage?: MedicalLedgerJsonValue
  active?: boolean
}

export interface PatientMedicationUpdatePayload {
  medication?: string
  medicationIndication?: string | null
  intakeTimes?: string[]
  unit?: string | null
  dosage?: MedicalLedgerJsonValue
  active?: boolean
}

export interface PatientMedicationSchedulePayload {
  medicationIds: number[]
}

export interface PatientMedicationScheduleLedgerRecord extends MedicalLedgerIdentity {
  patient: string
  medications: PatientMedicationLedgerRecord[]
  scheduleCreatedAt: string
  updatedAt: string
}

export interface PatientDiseaseLedgerRecord extends MedicalLedgerIdentity {
  patient: string
  disease: string
  classificationChoices: string[]
  startDate: string | null
  endDate: string | null
  numericalDescriptors: Record<string, MedicalLedgerJsonValue>
  subcategories: Record<string, MedicalLedgerJsonValue>
  lastUpdate: string | null
}

export interface PatientEventLedgerRecord extends MedicalLedgerIdentity {
  patient: string
  event: string
  dateStart: string
  dateEnd: string | null
  description: string | null
  classificationChoice: string | null
  numericalDescriptors: Record<string, MedicalLedgerJsonValue>
  subcategories: Record<string, MedicalLedgerJsonValue>
  lastUpdate: string | null
}

export interface LabValueNormalRange {
  min: number | null
  max: number | null
  male: { min: number | null; max: number | null } | null
  female: { min: number | null; max: number | null } | null
  other: { min: number | null; max: number | null } | null
}

export interface PatientLabValueLedgerRecord extends MedicalLedgerIdentity {
  patient: string | null
  labValue: string
  value: number | null
  valueStr: string | null
  sample: string | null
  timestamp: string
  normalRange: LabValueNormalRange
  unit: string | null
}

export interface PatientLabSampleLedgerRecord extends MedicalLedgerIdentity {
  patient: string
  sampleType: string
  date: string
  values: PatientLabValueLedgerRecord[]
}

export interface PatientMedicalLedger extends MedicalLedgerIdentity {
  patient: string
  diseases: PatientDiseaseLedgerRecord[]
  events: PatientEventLedgerRecord[]
  labSamples: PatientLabSampleLedgerRecord[]
  labValues: PatientLabValueLedgerRecord[]
  medications: PatientMedicationLedgerRecord[]
  medicationSchedules: PatientMedicationScheduleLedgerRecord[]
}

export function isMedicalLedgerContractUnavailable(error: unknown): boolean {
  return (
    axios.isAxiosError<unknown>(error) &&
    error.response?.status === 503 &&
    isRecord(error.response.data) &&
    error.response.data.code === 'medical-ledger-contract-unavailable'
  )
}

export const patientService = {
  async getPatient(patientId: number): Promise<Patient> {
    const response: AxiosResponse<Patient> = await axiosInstance.get(
      r(endpoints.patient.patientById(patientId))
    );
    return response.data;
  },

  async getMedicalLedger(patientId: number): Promise<PatientMedicalLedger> {
    const response: AxiosResponse<PatientMedicalLedger> = await axiosInstance.get(
      r(endpoints.patient.patientMedicalLedger(patientId)),
      silentRequestConfig()
    )
    return response.data
  },

  async createMedication(
    patientId: number,
    payload: PatientMedicationCreatePayload
  ): Promise<PatientMedicationLedgerRecord> {
    const response: AxiosResponse<PatientMedicationLedgerRecord> = await axiosInstance.post(
      r(endpoints.patient.patientMedications(patientId)),
      payload
    )
    return response.data
  },

  async updateMedication(
    patientId: number,
    medicationId: number,
    payload: PatientMedicationUpdatePayload
  ): Promise<PatientMedicationLedgerRecord> {
    const response: AxiosResponse<PatientMedicationLedgerRecord> = await axiosInstance.patch(
      r(endpoints.patient.patientMedicationById(patientId, medicationId)),
      payload
    )
    return response.data
  },

  async createMedicationSchedule(
    patientId: number,
    payload: PatientMedicationSchedulePayload
  ): Promise<PatientMedicationScheduleLedgerRecord> {
    const response: AxiosResponse<PatientMedicationScheduleLedgerRecord> =
      await axiosInstance.post(
        r(endpoints.patient.patientMedicationSchedules(patientId)),
        payload
      )
    return response.data
  },

  async updateMedicationSchedule(
    patientId: number,
    scheduleId: number,
    payload: PatientMedicationSchedulePayload
  ): Promise<PatientMedicationScheduleLedgerRecord> {
    const response: AxiosResponse<PatientMedicationScheduleLedgerRecord> =
      await axiosInstance.patch(
        r(endpoints.patient.patientMedicationScheduleById(patientId, scheduleId)),
        payload
      )
    return response.data
  },

  async getPatients(): Promise<Patient[]> {
    try {
      const response: AxiosResponse<unknown> = await axiosInstance.get(r(endpoints.patient.patients));
      return requirePatientList(response.data)
    } catch (error) {
      logger.error('patient-list-request-failed', error, {
        operation: 'list',
        outcome: 'rejected'
      })
      throw error;
    }
  },

  async addPatient(patientData: PatientCreateData): Promise<Patient> {
    try {
      logger.debug('patient-create-request-started', { operation: 'create' })
      const response: AxiosResponse<Patient> = await axiosInstance.post(r(endpoints.patient.patients), patientData);
      logger.debug('patient-create-request-completed', {
        operation: 'create',
        outcome: 'accepted'
      })
      return response.data;
    } catch (error: unknown) {
      logger.error('patient-create-request-failed', error, {
        operation: 'create',
        outcome: 'rejected'
      })
      throw error;
    }
  },

  async updatePatient(patientId: number, patientData: Partial<PatientCreateData>): Promise<Patient> {
    try {
      const response: AxiosResponse<Patient> = await axiosInstance.put(r(endpoints.patient.patientById(patientId)), patientData);
      return response.data;
    } catch (error) {
      logger.error('patient-update-request-failed', error, {
        operation: 'update',
        outcome: 'rejected'
      })
      throw error;
    }
  },

  async deletePatient(patientId: number): Promise<void> {
    try {
      await axiosInstance.delete(r(endpoints.patient.patientById(patientId)));
    } catch (error) {
      logger.error('patient-delete-request-failed', error, {
        operation: 'delete',
        outcome: 'rejected'
      })
      throw error;
    }
  },

  // Lookup-Daten laden
  async getGenders(): Promise<Gender[]> {
    try {
      // Verwende den korrekten Gender-Endpunkt
      const response: AxiosResponse<Gender[]> = await axiosInstance.get(r(endpoints.patient.genders));
      return response.data;
    } catch (error) {
      logger.error('gender-list-request-failed', error, {
        operation: 'list',
        outcome: 'fallback'
      })
      // Fallback Gender-Optionen
      return [
        { id: 1, name: 'female', nameDe: 'Weiblich' },
        { id: 2, name: 'male', nameDe: 'Männlich' },
        { id: 3, name: 'diverse', nameDe: 'Divers' }
      ];
    }
  },

  async getCenters(): Promise<Center[]> {
    try {
      // Versuche Centers über verschiedene mögliche Endpunkte zu laden
      const response: AxiosResponse<Center[]> = await axiosInstance.get(r(endpoints.patient.centers));
      return response.data;
    } catch (error) {
      logger.error('center-list-request-failed', error, {
        operation: 'list',
        outcome: 'fallback'
      })
      // Fallback Center-Optionen
      return [
        { id: 1, name: 'Hauptzentrum', nameDe: 'Hauptzentrum' }
      ];
    }
  },

  // Hilfsmethoden
  formatPatientData(patientForm: PatientFormData): PatientCreateData {
    const formattedData: PatientCreateData = {
      firstName: patientForm.firstName.trim(),
      lastName: patientForm.lastName.trim(),
      dob: patientForm.dob || null,
      gender: patientForm.gender || null,
      center: patientForm.centerKey ? null : (patientForm.center || null),
      centerKey: patientForm.centerKey || null,
      email: patientForm.email ?? "",
      phone: patientForm.phone ?? "",
      patientHash: patientForm.patientHash || null,
      isRealPerson: patientForm.isRealPerson ?? true
    };

    if (formattedData.gender === '') delete formattedData.gender;
    if (formattedData.patientHash === '') delete formattedData.patientHash;
    if (formattedData.center === '') delete formattedData.center;
    if (formattedData.centerKey === '') delete formattedData.centerKey;

    if (formattedData.center === null && !formattedData.centerKey) {
      delete formattedData.center;
    }
    if (formattedData.centerKey === null) {
      delete formattedData.centerKey;
    }

    return formattedData;
  },

  calculateAge(dateOfBirth: string | null | undefined): number | null {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    // Validierung des Datums
    if (isNaN(birthDate.getTime())) return null;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  },

  // Validierungshilfsfunktionen
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePatientData(patient: Partial<PatientFormData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!patient.firstName?.trim()) {
      errors.push('Vorname ist erforderlich');
    }

    if (!patient.lastName?.trim()) {
      errors.push('Nachname ist erforderlich');
    }

    if (patient.email && !this.isValidEmail(patient.email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }

    if (patient.dob) {
      const birthDate = new Date(patient.dob);
      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        errors.push('Ungültiges Geburtsdatum');
      } else if (birthDate > today) {
        errors.push('Geburtsdatum kann nicht in der Zukunft liegen');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

};
