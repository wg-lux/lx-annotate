import { defineStore } from 'pinia'
import axios from 'axios'

export interface AnonymizationState {
  anonymizationStatus: string;
  loading: boolean;
  error: string | null;
}

export interface AnonymizationPageState{
    page: number;
    pageSize: number;
    total: number;
    data: any[];
}

export interface PatientData {
    text: string;
    anonymized_text: string;
    report_meta: {
        casenumber: string | null;
        patient_dob: string | null;
        patient_first_name: string;
        patient_gender: string;
        patient_last_name: string;
        pdf_hash: string;
        examination_date?: string;
    },
    id: string;
    status?: string;
}

const API_URL = 'http://127.0.0.1:8000/api';

export const useAnonymizationStore = defineStore('anonymization', {
  state: (): AnonymizationState & { pendingAnonymizations: PatientData[] } => ({
    anonymizationStatus: 'idle',
    loading: false,
    error: null,
    pendingAnonymizations: []
  }),
  
  actions: {
    async fetchPendingAnonymizations() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_URL}/anonymizations/pending`);
        this.pendingAnonymizations = response.data;
        return this.pendingAnonymizations;
      } catch (error: any) {
        this.error = error.message || 'Fehler beim Laden der Anonymisierungen';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateAnonymization(data: Partial<PatientData>) {
      this.loading = true;
      this.error = null;
      
      try {
        await axios.put(`${API_URL}/anonymizations/${data.id}`, data);
        // Remove the updated item from the pending list
        if (data.status && data.status !== 'pending') {
          this.pendingAnonymizations = this.pendingAnonymizations.filter(
            item => item.id !== data.id
          );
        }
      } catch (error: any) {
        this.error = error.message || 'Fehler beim Aktualisieren der Anonymisierung';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
