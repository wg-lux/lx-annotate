import { defineStore } from 'pinia';
import axiosInstance from '@/api/axiosInstance';
import { ref, readonly, computed } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
function extractApiErrorMessage(err, fallback) {
    const data = err?.response?.data;
    if (typeof data === 'string' && data.trim())
        return data;
    if (typeof data?.detail === 'string' && data.detail.trim())
        return data.detail;
    if (Array.isArray(data?.nonFieldErrors) && data.nonFieldErrors.length) {
        return data.nonFieldErrors.join(', ');
    }
    if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) {
        return data.non_field_errors.join(', ');
    }
    if (data && typeof data === 'object') {
        for (const [field, value] of Object.entries(data)) {
            if (Array.isArray(value) && value.length) {
                return `${field}: ${value.join(', ')}`;
            }
            if (typeof value === 'string' && value.trim()) {
                return `${field}: ${value}`;
            }
        }
    }
    return err?.message || fallback;
}
const usePatientFindingStore = defineStore('patientFinding', () => {
    const patientFindings = ref([]);
    const loading = ref(false);
    const error = ref(null);
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
            const payload = response.data?.results ?? response.data;
            patientFindings.value = Array.isArray(payload) ? payload : [];
        }
        catch (err) {
            error.value =
                'Fehler beim Laden der Patientenbefunde: ' + extractApiErrorMessage(err, '');
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
        return patientFindings.value.filter((pf) => pf.patient.id === currentPatient.id);
    });
    const createPatientFinding = async (patientFindingData) => {
        try {
            loading.value = true;
            error.value = null;
            const normalizedPayload = {
                ...patientFindingData,
                patient_examination: patientFindingData.patient_examination ?? patientFindingData.patientExamination
            };
            delete normalizedPayload.patientExamination;
            const response = await axiosInstance.post('/api/patient-findings/', normalizedPayload);
            const newPatientFinding = response.data;
            // Add to local state
            patientFindings.value.push(newPatientFinding);
            return newPatientFinding;
        }
        catch (err) {
            error.value =
                'Fehler beim Erstellen des Patientenbefunds: ' + extractApiErrorMessage(err, '');
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
            const index = patientFindings.value.findIndex((pf) => pf.id === id);
            if (index !== -1) {
                patientFindings.value[index] = updatedFinding;
            }
            return updatedFinding;
        }
        catch (err) {
            error.value =
                'Fehler beim Aktualisieren des Patientenbefunds: ' + extractApiErrorMessage(err, '');
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
            patientFindings.value = patientFindings.value.filter((pf) => pf.id !== id);
        }
        catch (err) {
            error.value =
                'Fehler beim Löschen des Patientenbefunds: ' + extractApiErrorMessage(err, '');
            console.error('Delete patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    return {
        patientFindings: readonly(patientFindings),
        patientFindingsByCurrentPatient,
        loading: readonly(loading),
        error: readonly(error),
        fetchPatientFindings,
        createPatientFinding,
        updatePatientFinding,
        deletePatientFinding
    };
});
export { usePatientFindingStore };
