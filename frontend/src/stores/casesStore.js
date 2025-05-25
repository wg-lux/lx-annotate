import { defineStore } from 'pinia';
import { useAnonymizationStore } from "@/stores/anonymizationStore";
import axiosInstance from "@/api/axiosInstance";
import { ref } from 'vue';
export const useCasesStore = defineStore('cases', () => {
    const cases = ref([]);
    const risk = ref([]);
    const medications = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const anonymizationStore = useAnonymizationStore();
    async function fetchCases() {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get('/cases');
            cases.value = response.data;
        }
        catch (err) {
            error.value = 'Error fetching cases';
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchRisk() {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get('/risk');
            risk.value = response.data;
        }
        catch (err) {
            error.value = 'Error fetching risk';
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchMedications() {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get('/medications');
            medications.value = response.data;
        }
        catch (err) {
            error.value = 'Error fetching medications';
        }
        finally {
            loading.value = false;
        }
    }
    async function anonymizeCase(caseId) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.post(`/cases/${caseId}/anonymize`);
            anonymizationStore.addAnonymization(response.data);
        }
        catch (err) {
            error.value = 'Error anonymizing case';
        }
        finally {
            loading.value = false;
        }
    }
    async function deleteCase(caseId) {
        loading.value = true;
        error.value = null;
        try {
            await axiosInstance.delete(`/cases/${caseId}`);
            cases.value = cases.value.filter((c) => c.id !== caseId);
        }
        catch (err) {
            error.value = 'Error deleting case';
        }
        finally {
            loading.value = false;
        }
    }
    async function updateCase(caseId, updatedCase) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.put(`/cases/${caseId}`, updatedCase);
            const index = cases.value.findIndex((c) => c.id === caseId);
            if (index !== -1) {
                cases.value[index] = response.data;
            }
        }
        catch (err) {
            error.value = 'Error updating case';
        }
        finally {
            loading.value = false;
        }
    }
    async function addCase(newCase) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.post('/cases', newCase);
            cases.value.push(response.data);
        }
        catch (err) {
            error.value = 'Error adding case';
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchCaseById(caseId) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases/${caseId}`);
            return response.data;
        }
        catch (err) {
            error.value = 'Error fetching case';
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchCaseByPatientName(patientName) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases?patient_name=${patientName}`);
            return response.data;
        }
        catch (err) {
            error.value = 'Error fetching case';
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchCaseByDateOfBirth(dob) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases?dob=${dob}`);
            return response.data;
        }
        catch (err) {
            error.value = 'Error fetching case';
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchCaseByAnonymizationStatus(status) {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases?anonymization_status=${status}`);
            return response.data;
        }
        catch (err) {
            error.value = 'Error fetching case';
            return null;
        }
        finally {
            loading.value = false;
        }
    }
});
