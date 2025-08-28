import {defineStore} from "pinia";
import axiosInstance from "@/api/axiosInstance";
import {ref, readonly, computed} from "vue";

interface Finding {
    id: number;
    name: string;
    nameDe?: string;
    description: string;
    examinations: Array<string>;
    FindingClassifications: Array<FindingClassification>;
    findingTypes: Array<string>;
    findingInterventions: Array<string>;
}

interface FindingClassificationChoice {
    id: number;
    name: string;
}

interface FindingClassification {
    id: number;
    name?: string;
    description?: string;
    classificationType?: Array<string>;
    choices?: Array<FindingClassificationChoice>;
    required?: boolean | undefined;
}

export type { Finding, FindingClassification, FindingClassificationChoice };

export const useFindingStore = defineStore('finding', () => {
    const findings = ref<Finding[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const currentFinding = ref<Finding | null>(null);
    const FindingClassification = ref<FindingClassification[]>([]);



    const fetchFindings = async () => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get('/api/findings/');
            findings.value = response.data.results || response.data;
        } catch (err: any) {
            error.value = 'Fehler beim Laden der Befunde: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch findings error:', err);
        } finally {
            loading.value = false;
        }
    };

    const fetchFindingClassifications = async (findingId: number): Promise<FindingClassification[]> => {
        try {
            const response = await axiosInstance.get(`/api/findings/${findingId}/classifications/`);
            return response.data as FindingClassification[];
        } catch (err: any) {
            console.error(`Error fetching classifications for finding ${findingId}:`, err);
            throw err;
        }
    };

    const fetchFindingsByExamination = async (examinationId: number): Promise<Finding[]> => {
        try {
            // Use the existing examination findings endpoint
            const response = await axiosInstance.get(`/api/examinations/${examinationId}/findings/`);
            return response.data as Finding[];
        } catch (err: any) {
            console.error(`Error fetching findings for examination ${examinationId}:`, err);
            throw err;
        }
    };

    const fetchExaminationClassifications = async (examinationId: number): Promise<FindingClassification[]> => {
        try {
            const response = await axiosInstance.get(`/api/examinations/${examinationId}/classifications/`);
            return response.data as FindingClassification[];
        } catch (err: any) {
            console.error(`Error fetching classifications for examination ${examinationId}:`, err);
            throw err;
        }
    };

    const getFindingById = (id: number): Finding | undefined => {
        return findings.value.find(finding => finding.id === id);
    };

    const setCurrentFinding = (finding: Finding | null) => {
        currentFinding.value = finding;
    };

    const setCurrentFindingClassification = (classifications: FindingClassification[]) => {
        return FindingClassification.value = classifications;
    };

    const areFindingsLoaded = computed(() => findings.value.length > 0);
    const getFindingsByExamination = (examinationId: number): Finding[] => {
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
