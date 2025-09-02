import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import type { Finding } from '@/stores/findingStore';
import type { Patient} from '@/stores/patientStore';
import type { Video } from '@/stores/videoStore';
import type { Examination } from './examinationStore';

// --- Interfaces ---
export interface PatientExamination {
  patient: Patient;
  examination: Examination;
  video: Video | null;
  id: number;
}

export const usePatientExaminationStore = defineStore('patientExamination', {
  state: () => ({
    loading: false as boolean,
    error: null as string | null,
    patientExaminations: [] as PatientExamination[],
    selectedPatientExaminationId: null as number | null,
  }),
  
  getters: {
    getPatientExaminationById: (state) => {
      return (id: number) => state.patientExaminations.find(pe => pe.id === id) || null;
    },
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getAllPatientExaminations: (state) => state.patientExaminations,
    getSelectedPatientExaminationId: (state) => state.selectedPatientExaminationId,
  },
actions: {
    async fetchPatientExaminations(patientId: number) {
      try {
        this.loading = true;
        this.error = null;
        const response = await axiosInstance.get(`/api/patient-examinations/?patient_id=${patientId}`);
        this.patientExaminations = response.data.results || response.data;
      } catch (err: any) {
        this.error = 'Fehler beim Laden der Patientenuntersuchungen: ' + (err.response?.data?.detail || err.message);
        console.error('Fetch patient examinations error:', err);
      } finally {
        this.loading = false;
      }
    },
    addPatientExamination(pe: PatientExamination) {
      this.patientExaminations.push(pe);
    },
    removePatientExamination(id: number) {
      this.patientExaminations = this.patientExaminations.filter(pe => pe.id !== id);
      if (this.selectedPatientExaminationId === id) {
        this.selectedPatientExaminationId = null;
      }
    },
    setCurrentPatientExaminationId(id: number | null) {
      this.selectedPatientExaminationId = id;
    },
    getCurrentPatientExaminationId(): number | null {
      return this.selectedPatientExaminationId;
    }
  },
});
