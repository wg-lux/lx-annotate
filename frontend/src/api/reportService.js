// @api/reportService.ts
import { ref } from 'vue';
import axiosInstance, { r } from './axiosInstance';
// --- The composable ---
export function useReportService() {
    // reactive state
    const centers = ref([]);
    const examinations = ref([]);
    const findings = ref([]);
    const locationClassifications = ref([]);
    const locationClassificationChoices = ref([]);
    const morphologyClassifications = ref([]);
    const morphologyClassificationChoices = ref([]);
    const interventions = ref([]);
    // fetch helpers
    async function getCenters() {
        try {
            const { data } = await axiosInstance.get(r('centers/'));
            centers.value = data;
        }
        catch (e) {
            console.error('Error fetching centers:', e);
        }
    }
    async function getExaminations() {
        try {
            const { data } = await axiosInstance.get(r('examinations/'));
            examinations.value = data;
            return data;
        }
        catch (e) {
            console.error('Error fetching examinations:', e);
            return [];
        }
    }
    async function getFindings() {
        try {
            const { data } = await axiosInstance.get(r('findings/'));
            findings.value = data;
        }
        catch (e) {
            console.error('Error fetching findings:', e);
        }
    }
    async function getLocationClassifications() {
        try {
            const { data } = await axiosInstance.get(r('location-classifications/'));
            locationClassifications.value = data;
        }
        catch (e) {
            console.error('Error fetching location classifications:', e);
        }
    }
    async function getLocationClassificationChoices() {
        try {
            // Annahme: API liefert { id: number, name: string, classification_id: number }
            const { data } = await axiosInstance.get(r('location-classification-choices/'));
            // Manuelles Mapping von snake_case zu camelCase
            locationClassificationChoices.value = data.map((item) => ({
                id: item.id,
                name: item.name,
                classificationId: item.classification_id // Mapping hier
            }));
        }
        catch (e) {
            console.error('Error fetching location classification choices:', e);
        }
    }
    async function getMorphologyClassifications() {
        try {
            const { data } = await axiosInstance.get(r('morphology-classifications/'));
            morphologyClassifications.value = data;
        }
        catch (e) {
            console.error('Error fetching morphology classifications:', e);
        }
    }
    async function getMorphologyClassificationChoices() {
        try {
            // Annahme: API liefert { id: number, name: string, classification_id: number }
            const { data } = await axiosInstance.get(r('morphology-classification-choices/'));
            // Manuelles Mapping von snake_case zu camelCase
            morphologyClassificationChoices.value = data.map((item) => ({
                id: item.id,
                name: item.name,
                classificationId: item.classification_id // Mapping hier
            }));
        }
        catch (e) {
            console.error('Error fetching morphology classification choices:', e);
        }
    }
    async function getInterventions() {
        try {
            const { data } = await axiosInstance.get(r('interventions/'));
            interventions.value = data;
        }
        catch (e) {
            console.error('Error fetching interventions:', e);
        }
    }
    return {
        // state
        centers,
        examinations,
        findings,
        locationClassifications,
        locationClassificationChoices,
        morphologyClassifications,
        morphologyClassificationChoices,
        interventions,
        // actions
        getCenters,
        getExaminations,
        getFindings,
        getLocationClassifications,
        getLocationClassificationChoices,
        getMorphologyClassifications,
        getMorphologyClassificationChoices,
        getInterventions
    };
}
