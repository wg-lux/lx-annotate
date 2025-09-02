import { defineStore } from "pinia";
import axiosInstance from "@/api/axiosInstance";
import { ref, readonly, computed } from "vue";
import { useExaminationStore } from "@/stores/examinationStore";
export const useFindingStore = defineStore('finding', () => {
    const findings = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const currentFinding = ref(null);
    const FindingClassification = ref([]);
    // Neue Felder für examination-spezifische Findings
    const examinationFindings = ref(new Map());
    const examinationFindingsLoading = ref(new Map());
    const examinationStore = useExaminationStore();
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
            // Prüfe Cache zuerst
            if (examinationFindings.value.has(examinationId)) {
                return examinationFindings.value.get(examinationId);
            }
            // Setze Loading-State
            examinationFindingsLoading.value.set(examinationId, true);
            // Use the existing examination findings endpoint
            const response = await axiosInstance.get(`/api/examinations/${examinationId}/findings/`);
            const findingsData = response.data;
            // Cache die Findings
            examinationFindings.value.set(examinationId, findingsData);
            return findingsData;
        }
        catch (err) {
            console.error(`Error fetching findings for examination ${examinationId}:`, err);
            throw err;
        }
        finally {
            examinationFindingsLoading.value.set(examinationId, false);
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
        // Verwende gecachte Findings falls verfügbar
        if (examinationFindings.value.has(examinationId)) {
            console.log("Using cached findings for examination", examinationId);
            return examinationFindings.value.get(examinationId);
        }
        console.log("No cached findings for examination", examinationId);
        console.log("Using the following findings:");
        // Fallback: Filtere aus allen Findings (für den Fall, dass noch nicht geladen wurde)
        // Dies ist weniger effizient, aber funktioniert als Fallback
        return findings.value.filter(finding => {
            console.log(finding);
            return finding.examinations && finding.examinations.includes(examinationId.toString());
        });
    };
    const getFindingIdsByPatientExaminationId = (patientExaminationId) => {
        const findingIds = [];
        for (const finding of findings.value) {
            if (finding.PatientExaminationId === patientExaminationId) {
                findingIds.push(finding.id);
            }
        }
        return findingIds;
    };
    const isExaminationFindingsLoaded = (examinationId) => {
        return examinationFindings.value.has(examinationId);
    };
    const isExaminationFindingsLoading = (examinationId) => {
        return examinationFindingsLoading.value.get(examinationId) || false;
    };
    const clearExaminationFindingsCache = (examinationId) => {
        if (examinationId) {
            examinationFindings.value.delete(examinationId);
            examinationFindingsLoading.value.delete(examinationId);
        }
        else {
            examinationFindings.value.clear();
            examinationFindingsLoading.value.clear();
        }
    };
    const getCurrentPatientExaminationId = () => {
        return examinationStore.getCurrentExaminationId();
    };
    return {
        findings: readonly(findings),
        FindingClassification: FindingClassification,
        loading: readonly(loading),
        error: readonly(error),
        currentFinding: readonly(currentFinding),
        examinationFindings: readonly(examinationFindings),
        areFindingsLoaded,
        fetchFindings,
        fetchFindingClassifications,
        fetchFindingsByExamination,
        fetchExaminationClassifications,
        getFindingsByExamination,
        getFindingById,
        getFindingIdsByPatientExaminationId,
        setCurrentFinding,
        isExaminationFindingsLoaded,
        isExaminationFindingsLoading,
        clearExaminationFindingsCache,
    };
});
