import axiosInstance, { r } from './axiosInstance';
import type { AxiosResponse } from 'axios';

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
  const { data } = await axiosInstance.post(`/api/patients/${id}/pseudonym/`)
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
  center: string | null;  // Changed to string to match backend
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

export const patientService = {
  async getPatients(): Promise<Patient[]> {
    try {
      const response: AxiosResponse<Patient[] | PatientListResponse> = await axiosInstance.get(r('patients/'));
      
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
      const response: AxiosResponse<Patient> = await axiosInstance.post(r('patients/'), patientData);
      console.log('PatientService: Erfolgreiche Antwort erhalten:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('PatientService: Fehler beim Hinzufügen des Patienten:', error);
      
      // Detaillierte Fehleranalyse
      if (error.response) {
        console.error('Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('Request Error:', error.request);
      } else {
        console.error('General Error:', error.message);
      }
      
      throw error;
    }
  },

  async updatePatient(patientId: number, patientData: Partial<PatientCreateData>): Promise<Patient> {
    try {
      const response: AxiosResponse<Patient> = await axiosInstance.put(r(`patients/${patientId}/`), patientData);
      return response.data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  async deletePatient(patientId: number): Promise<void> {
    try {
      await axiosInstance.delete(r(`patients/${patientId}/`));
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  },

  // Lookup-Daten laden
  async getGenders(): Promise<Gender[]> {
    try {
      // Verwende den korrekten Gender-Endpunkt
      const response: AxiosResponse<Gender[]> = await axiosInstance.get(r('genders/')).catch(async () => {
        // Fallback: Standard Gender-Optionen
        return { 
          data: [
            { id: 1, name: 'female', nameDe: 'Weiblich' },
            { id: 2, name: 'male', nameDe: 'Männlich' },
            { id: 3, name: 'diverse', nameDe: 'Divers' }
          ] as Gender[],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        } as AxiosResponse<Gender[]>;
      });
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
      const response: AxiosResponse<Center[]> = await axiosInstance.get(r('centers/')).catch(async () => {
        // Fallback über andere verfügbare Endpunkte
        return { 
          data: [
            { id: 1, name: 'Hauptzentrum', nameDe: 'Hauptzentrum' }
          ] as Center[],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        } as AxiosResponse<Center[]>;
      });
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
      center: patientForm.center || null,
      email: patientForm.email || undefined,
      phone: patientForm.phone || undefined,
      patientHash: patientForm.patientHash || null,
      isRealPerson: patientForm.isRealPerson ?? true
    };

    // Entferne leere Strings
    Object.keys(formattedData).forEach(key => {
      const value = (formattedData as any)[key];
      if (value === '') {
        delete (formattedData as any)[key];
      }
    });

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
