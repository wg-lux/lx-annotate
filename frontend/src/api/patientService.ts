import axiosInstance, { r, silentRequestConfig } from './axiosInstance';
import axios, { type AxiosResponse } from 'axios';
import { endpoints } from '@/types/api/endpoints'

// Shape returned by backend (snake_case); we'll map in the component
export type GeneratePseudonymResponse = {
  patientId: number
  patientHash: string
  persisted: boolean
  source: 'server'
  message?: string
  missingFields?: string[]
}

export async function generatePatientPseudonym(id: number): Promise<GeneratePseudonymResponse> {
  if (!Number.isFinite(id) || id <= 0) throw new Error('Ungültige patientId')
  const { data } = await axiosInstance.post(r(endpoints.patient.patientPseudonym(id)))
  return data as GeneratePseudonymResponse
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
    axios.isAxiosError<{ code?: string }>(error) &&
    error.response?.status === 503 &&
    error.response.data?.code === 'medical-ledger-contract-unavailable'
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
      const response: AxiosResponse<Patient[] | PatientListResponse> = await axiosInstance.get(r(endpoints.patient.patients));
      
      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        return response.data.results || [];
      }
    } catch (error) {
      console.error('Error getting patients:', error);
      throw error;
    }
  },

  async addPatient(patientData: PatientCreateData): Promise<Patient> {
    try {
      console.log('PatientService: Sende Patientendaten an API:', patientData);
      const response: AxiosResponse<Patient> = await axiosInstance.post(r(endpoints.patient.patients), patientData);
      console.log('PatientService: Erfolgreiche Antwort erhalten:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('PatientService: Fehler beim Hinzufügen des Patienten:', error);
      
      // Detaillierte Fehleranalyse
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (axios.isAxiosError(error) && error.request) {
        console.error('Request Error:', error.request);
      } else {
        console.error('General Error:', error instanceof Error ? error.message : String(error));
      }
      
      throw error;
    }
  },

  async updatePatient(patientId: number, patientData: Partial<PatientCreateData>): Promise<Patient> {
    try {
      const response: AxiosResponse<Patient> = await axiosInstance.put(r(endpoints.patient.patientById(patientId)), patientData);
      return response.data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  async deletePatient(patientId: number): Promise<void> {
    try {
      await axiosInstance.delete(r(endpoints.patient.patientById(patientId)));
    } catch (error) {
      console.error('Error deleting patient:', error);
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
      console.error('Error getting genders:', error);
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
      console.error('Error getting centers:', error);
      // Fallback Center-Optionen
      return [
        { id: 1, name: 'Hauptzentrum', nameDe: 'Hauptzentrum' }
      ];
    }
  },

  // Hilfsmethoden
  formatPatientData(patientForm: PatientFormData): PatientCreateData {
    const formattedData: PatientCreateData = {
      firstName: patientForm.firstName,
      lastName: patientForm.lastName,
      dob: patientForm.dob || null,
      gender: patientForm.gender || null,
      center: patientForm.centerKey ? null : (patientForm.center || null),
      centerKey: patientForm.centerKey || null,
      email: patientForm.email || undefined,
      phone: patientForm.phone || undefined,
      patientHash: patientForm.patientHash || null,
      isRealPerson: patientForm.isRealPerson ?? true
    };

    if (formattedData.email === '') delete formattedData.email;
    if (formattedData.phone === '') delete formattedData.phone;
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
