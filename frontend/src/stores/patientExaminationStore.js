import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
export const usePatientExaminationStore = defineStore('patientExamination', {
    state: () => ({
        loading: false,
        error: null,
        patientExaminations: [],
        selectedPatientExaminationId: null,
    }),
    getters: {
        getPatientExaminationById: (state) => {
            return (id) => state.patientExaminations.find(pe => pe.id === id) || null;
        },
        isLoading: (state) => state.loading,
        getError: (state) => state.error,
        getAllPatientExaminations: (state) => state.patientExaminations,
        getSelectedPatientExaminationId: (state) => state.selectedPatientExaminationId,
    },
    actions: {
        async fetchPatientExaminations(patientId) {
            try {
                this.loading = true;
                this.error = null;
                const response = await axiosInstance.get(`/api/patient-examinations/?patient_id=${patientId}`);
                this.patientExaminations = response.data.results || response.data;
            }
            catch (err) {
                this.error = 'Fehler beim Laden der Patientenuntersuchungen: ' + (err.response?.data?.detail || err.message);
                console.error('Fetch patient examinations error:', err);
            }
            finally {
                this.loading = false;
            }
        },
        addPatientExamination(pe) {
            this.patientExaminations.push(pe);
        },
        removePatientExamination(id) {
            this.patientExaminations = this.patientExaminations.filter(pe => pe.id !== id);
            if (this.selectedPatientExaminationId === id) {
                this.selectedPatientExaminationId = null;
            }
        },
        setCurrentPatientExaminationId(id) {
            this.selectedPatientExaminationId = id;
        },
        getCurrentPatientExaminationId() {
            return this.selectedPatientExaminationId;
        }
    },
});
