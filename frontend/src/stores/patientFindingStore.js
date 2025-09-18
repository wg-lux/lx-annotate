import { defineStore } from "pinia";
import axiosInstance from "@/api/axiosInstance";
import { ref, readonly, computed } from "vue";
import { usePatientStore } from "@/stores/patientStore";
const usePatientFindingStore = defineStore('patientFinding', () => {
    const patientFindings = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const byPatientExamination = ref(new Map());
    const currentPatientExaminationId = ref(null);
    const setCurrentPatientExaminationId = (id) => {
        currentPatientExaminationId.value = id;
    };
    const fetchPatientFindings = async (patientExaminationId) => {
        if (!patientExaminationId) {
            console.warn('fetchPatientFindings wurde ohne patientExaminationId aufgerufen.');
            patientFindings.value = [];
            return;
        }
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get('/api/patient-findings/', {
                params: { patient_examination: patientExaminationId }
            });
            patientFindings.value = response.data.results || response.data;
            const rows = response.data.results || response.data;
            byPatientExamination.value.set(patientExaminationId, rows);
        }
        catch (err) {
            error.value = 'Fehler beim Laden der Patientenbefunde: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch patient findings error:', err);
        }
        finally {
            loading.value = false;
        }
    };
    const patientFindingsByCurrentPatient = computed(() => {
        const patientStore = usePatientStore();
        const currentPatient = patientStore.getCurrentPatient();
        if (!currentPatient) {
            return [];
        }
        return patientFindings.value.filter(pf => pf.patient.id === currentPatient.id);
    });
    const createPatientFinding = async (patientFindingData) => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.post('/api/patient-findings/', patientFindingData);
            const newPatientFinding = response.data;
            // Add to local state
            patientFindings.value.push(newPatientFinding);
            console.log('New finding created', newPatientFinding);
            return newPatientFinding;
        }
        catch (err) {
            error.value = 'Fehler beim Erstellen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Create patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const updatePatientFinding = async (id, updateData) => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.patch(`/api/patient-findings/${id}/`, updateData);
            const updatedFinding = response.data;
            // Update local state
            const index = patientFindings.value.findIndex(pf => pf.id === id);
            if (index !== -1) {
                patientFindings.value[index] = updatedFinding;
            }
            return updatedFinding;
        }
        catch (err) {
            error.value = 'Fehler beim Aktualisieren des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Update patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const deletePatientFinding = async (id) => {
        try {
            loading.value = true;
            error.value = null;
            await axiosInstance.delete(`/api/patient-findings/${id}/`);
            // Remove from local state
            patientFindings.value = patientFindings.value.filter(pf => pf.id !== id);
        }
        catch (err) {
            error.value = 'Fehler beim Löschen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Delete patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const currentPatientFindings = computed(() => {
        const id = currentPatientExaminationId.value;
        return id ? (byPatientExamination.value.get(id) ?? []) : [];
    });
    const getByPatientExamination = (id) => byPatientExamination.value.get(id) ?? [];
    return {
        patientFindings: readonly(currentPatientFindings),
        patientFindingsByCurrentPatient,
        loading: readonly(loading),
        error: readonly(error),
        currentPatientExaminationId: readonly(currentPatientExaminationId),
        setCurrentPatientExaminationId,
        fetchPatientFindings,
        createPatientFinding,
        updatePatientFinding,
        deletePatientFinding,
    };
});
export { usePatientFindingStore };
