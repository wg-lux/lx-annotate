import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
export const usePatientExaminationStore = defineStore('patientExamination', {
    state: () => ({
        loading: false,
        error: null,
        patientExaminations: [],
        selectedPatientExaminationId: null
    }),
    getters: {
        getPatientExaminationById: (state) => {
            return (id) => state.patientExaminations.find((pe) => pe.id === id) || null;
        },
        isLoading: (state) => state.loading,
        getError: (state) => state.error,
        getAllPatientExaminations: (state) => state.patientExaminations,
        getSelectedPatientExaminationId: (state) => state.selectedPatientExaminationId
    },
    actions: {
        async doesPatientExaminationExist(id) {
            try {
                this.loading = true;
                this.error = null;
                const response = await axiosInstance.get(`/api/check_pe_exist/${id}/`);
                if (response.status === 200 && typeof response.data.exists === 'boolean') {
                    return response.data.exists;
                }
                return true;
            }
            catch (err) {
                this.error =
                    'Fehler beim Überprüfen der Patientenuntersuchung: ' +
                        (err.response?.data?.detail || err.message);
                console.error('Check patient examination existence error:', err);
                return false;
            }
            finally {
                this.loading = false;
            }
        },
        async fetchPatientExaminations(patientId) {
            try {
                this.loading = true;
                this.error = null;
                if ((await this.doesPatientExaminationExist(patientId)) === false) {
                    this.patientExaminations = [];
                    return;
                }
                const response = await axiosInstance.get(`/api/patient-examinations/?patient_id=${patientId}`);
                this.patientExaminations = response.data.results || response.data;
            }
            catch (err) {
                this.error =
                    'Fehler beim Laden der Patientenuntersuchungen: ' +
                        (err.response?.data?.detail || err.message);
                console.error('Fetch patient examinations error:', err);
            }
            finally {
                this.loading = false;
            }
        },
        async fetchPatientExaminationById(id) {
            try {
                this.loading = true;
                this.error = null;
                const response = await axiosInstance.get(`/api/get_patient_examination/${id}/`);
                const pe = response.data;
                if (pe) {
                    const index = this.patientExaminations.findIndex((existingPe) => existingPe.id === pe.id);
                    if (index !== -1) {
                        this.patientExaminations[index] = pe;
                    }
                    else {
                        this.patientExaminations.push(pe);
                    }
                }
            }
            catch (err) {
                this.error =
                    'Fehler beim Laden der Patientenuntersuchung: ' +
                        (err.response?.data?.detail || err.message);
                console.error('Fetch patient examination by ID error:', err);
            }
            finally {
                this.loading = false;
            }
        },
        addPatientExamination(pe) {
            this.patientExaminations.push(pe);
        },
        removePatientExamination(id) {
            this.patientExaminations = this.patientExaminations.filter((pe) => pe.id !== id);
            if (this.selectedPatientExaminationId === id) {
                this.selectedPatientExaminationId = null;
            }
        },
        setCurrentPatientExaminationId(id) {
            this.selectedPatientExaminationId = id;
        },
        getCurrentPatientExaminationId() {
            return this.selectedPatientExaminationId;
        },
        getCurrentPatientExaminationExaminationId() {
            const pe = this.patientExaminations.find((pe) => pe.id === this.selectedPatientExaminationId);
            return pe ? pe.examination.id : null;
        }
    }
});
