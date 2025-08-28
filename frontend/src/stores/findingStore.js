import { defineStore } from "pinia";
import axiosInstance from "@/api/axiosInstance";
import { ref, readonly, computed } from "vue";
export const useFindingStore = defineStore('finding', () => {
    const findings = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const currentFinding = ref(null);
    const FindingClassification = ref([]);
    const fetchFindings = async () => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get('/api/findings/');
            findings.value = response.data.results || response.data;
        }
        catch (err) {
            error.value = 'Fehler beim Laden der Befunde: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch findings error:', err);
        }
        finally {
            loading.value = false;
        }
    };
    const fetchFindingClassifications = async (findingId) => {
        try {
            const response = await axiosInstance.get(`/api/findings/${findingId}/classifications/`);
            return response.data;
        }
        catch (err) {
            console.error(`Error fetching classifications for finding ${findingId}:`, err);
            throw err;
        }
    };
    const fetchFindingsByExamination = async (examinationId) => {
        try {
            // Use the existing examination findings endpoint
            const response = await axiosInstance.get(`/api/examinations/${examinationId}/findings/`);
            return response.data;
        }
        catch (err) {
            console.error(`Error fetching findings for examination ${examinationId}:`, err);
            throw err;
        }
    };
    const fetchExaminationClassifications = async (examinationId) => {
        try {
            const response = await axiosInstance.get(`/api/examinations/${examinationId}/classifications/`);
            return response.data;
        }
        catch (err) {
            console.error(`Error fetching classifications for examination ${examinationId}:`, err);
            throw err;
        }
    };
    const getFindingById = (id) => {
        return findings.value.find(finding => finding.id === id);
    };
    const setCurrentFinding = (finding) => {
        currentFinding.value = finding;
    };
    const setCurrentFindingClassification = (classifications) => {
        return FindingClassification.value = classifications;
    };
    const areFindingsLoaded = computed(() => findings.value.length > 0);
    const getFindingsByExamination = (examinationId) => {
        // For now, return all findings since we don't have examination-specific filtering
        // In the future, this could be enhanced to filter by examination
        return findings.value;
    };
    return {
        findings: readonly(findings),
        FindingClassification: FindingClassification,
        loading: readonly(loading),
        error: readonly(error),
        currentFinding: readonly(currentFinding),
        areFindingsLoaded,
        fetchFindings,
        fetchFindingClassifications,
        fetchFindingsByExamination,
        fetchExaminationClassifications,
        getFindingsByExamination,
        getFindingById,
        setCurrentFinding,
    };
});
