import axiosInstance, { r } from './axiosInstance';
import type { AxiosResponse } from 'axios';

// TypeScript Interfaces für Patient-bezogene Daten
export interface Gender {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  abbreviation?: string;
  description?: string;
}

export interface Center {
  id: number;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
}

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  dob?: string | null;
  gender?: string | null;  // Changed to string to match backend
  center?: string | null;  // Changed to string to match backend
  email?: string;
  phone?: string;
  patient_hash?: string | null;
  comments?: string;
  is_real_person?: boolean;  // Added missing property
  
  // Pseudonym properties for anonymization validation
  pseudonym_first_name?: string | null;
  pseudonym_last_name?: string | null;
  sensitive_meta_id?: number | null;
  
  // Computed/readonly fields
  age?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientFormData {
  id?: number | null;
  first_name: string;
  last_name: string;
  dob: string | null | undefined;  // Allow undefined for compatibility
  gender: string | null;  // Changed to string to match backend
  center: string | null;  // Changed to string to match backend
  email: string;
  phone: string;
  patient_hash: string;
  comments: string;
  is_real_person?: boolean;  // Added missing property
}

export interface PatientCreateData {
  first_name: string;
  last_name: string;
  dob?: string | null;
  gender?: string | null;  // Changed to string
  center?: string | null;  // Changed to string
  email?: string;
  phone?: string;
  patient_hash?: string | null;
  is_real_person?: boolean;  // Added missing property
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
      const response: AxiosResponse<Gender[]> = await axiosInstance.get(r('gender/')).catch(async () => {
        // Fallback: Standard Gender-Optionen
        return { 
          data: [
            { id: 1, name: 'female', name_de: 'Weiblich' },
            { id: 2, name: 'male', name_de: 'Männlich' },
            { id: 3, name: 'diverse', name_de: 'Divers' }
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
        { id: 1, name: 'female', name_de: 'Weiblich' },
        { id: 2, name: 'male', name_de: 'Männlich' },
        { id: 3, name: 'diverse', name_de: 'Divers' }
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
            { id: 1, name: 'Hauptzentrum', name_de: 'Hauptzentrum' }
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
        { id: 1, name: 'Hauptzentrum', name_de: 'Hauptzentrum' }
      ];
    }
  },

  // Hilfsmethoden
  formatPatientData(patientForm: PatientFormData): PatientCreateData {
    const formattedData: PatientCreateData = {
      first_name: patientForm.first_name,
      last_name: patientForm.last_name,
      dob: patientForm.dob || null,
      gender: patientForm.gender || null,
      center: patientForm.center || null,
      email: patientForm.email || undefined,
      phone: patientForm.phone || undefined,
      patient_hash: patientForm.patient_hash || null,
      is_real_person: patientForm.is_real_person ?? true
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

    if (!patient.first_name?.trim()) {
      errors.push('Vorname ist erforderlich');
    }

    if (!patient.last_name?.trim()) {
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
  }
};
