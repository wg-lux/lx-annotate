import { defineStore } from 'pinia';
import { AxiosInstance } from 'axios';
import { ref } from 'vue';
export const usePatientStore = defineStore('patient', () => {
    // State
    const patients = ref([]);
    const currentPatient = ref(null);
    const patientExaminations = ref([]);
    const patientFindings = ref([]);
    const loading = ref(false);
    const error = ref(null);
    // Actions
    const fetchPatients = async () => {
        try {
            loading.value = true;
            error.value = null;
            // Simulate API call
            // Replace with actual API call to fetch patients
            patients.value = []; // Fetch from API
        }
        catch (err) {
            error.value = 'Failed to fetch patients';
        }
        finally {
            loading.value = false;
        }
    };
    return {
        patients,
        currentPatient,
        patientExaminations,
        patientFindings,
        loading,
        error,
        fetchPatients
    };
});
