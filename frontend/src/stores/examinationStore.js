import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
// --- Store ---
export const useExaminationStore = defineStore('examination', () => {
    // state: map examinationId -> fetched subcategories
    const categoriesByExam = reactive({});
    const lastFetchToken = ref(null);
    const loading = ref(false);
    const error = ref(null);
    // Fetch all subcategories for a given examination type
    async function fetchSubcategoriesForExam(examId) {
        const token = Symbol();
        lastFetchToken.value = token;
        error.value = null;
        loading.value = true;
        try {
            // Only fetch endpoints that exist in the backend
            const [locClassRes, findingsRes] = await Promise.all([
                axiosInstance.get(r(`examination/${examId}/location-classifications/`)),
                axiosInstance.get(r(`examination/${examId}/findings/`)),
            ]);
            // Try to fetch morphology classifications, but don't fail if endpoint doesn't exist
            let morphClassRes = { data: [] };
            try {
                morphClassRes = await axiosInstance.get(r(`examination/${examId}/morphology-classifications/`));
            }
            catch (err) {
                console.warn('Morphology classifications endpoint not available:', err);
            }
            // Abbruch, falls ein anderer Request in der Zwischenzeit gestartet wurde
            if (lastFetchToken.value !== token)
                return;
            // Direkte Zuweisung für reaktives Objekt
            categoriesByExam[examId] = {
                locationClassifications: locClassRes.data,
                locationChoices: [], // Will be loaded when location classification is selected
                morphologyClassifications: morphClassRes.data,
                morphologyChoices: [], // Will be loaded when morphology classification is selected
                findings: findingsRes.data,
                interventions: [], // Will be loaded when finding is selected
            };
        }
        catch (err) {
            if (lastFetchToken.value === token) {
                error.value = err instanceof Error ? err.message : 'Failed to fetch examination data';
                console.error('Error fetching subcategories:', err);
            }
        }
        finally {
            if (lastFetchToken.value === token) {
                loading.value = false;
            }
        }
    }
    // Fetch location choices based on selected location classification
    async function fetchLocationChoices(examId, locationClassificationId) {
        if (!categoriesByExam[examId])
            return;
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(r(`examination/${examId}/location-classification/${locationClassificationId}/choices/`));
            // Update the locationChoices for this exam
            categoriesByExam[examId].locationChoices = response.data;
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to fetch location choices';
            console.error('Error fetching location choices:', err);
        }
        finally {
            loading.value = false;
        }
    }
    // Fetch morphology choices based on selected morphology classification
    async function fetchMorphologyChoices(examId, morphologyClassificationId) {
        if (!categoriesByExam[examId])
            return;
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(r(`examination/${examId}/morphology-classification/${morphologyClassificationId}/choices/`));
            // Update the morphologyChoices for this exam
            categoriesByExam[examId].morphologyChoices = response.data;
        }
        catch (err) {
            // Don't treat this as a fatal error since the endpoint might not exist
            console.warn('Morphology choices endpoint not available:', err);
            categoriesByExam[examId].morphologyChoices = [];
        }
        finally {
            loading.value = false;
        }
    }
    // Fetch interventions based on selected finding
    async function fetchInterventions(examId, findingId) {
        if (!categoriesByExam[examId])
            return;
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(r(`examination/${examId}/finding/${findingId}/interventions/`));
            // Update the interventions for this exam
            categoriesByExam[examId].interventions = response.data;
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to fetch interventions';
            console.error('Error fetching interventions:', err);
        }
        finally {
            loading.value = false;
        }
    }
    // Getter: retrieve map or empty defaults
    function getCategories(examId) {
        return categoriesByExam[examId] || {
            locationClassifications: [],
            locationChoices: [],
            morphologyClassifications: [],
            morphologyChoices: [],
            findings: [],
            interventions: [],
        };
    }
    return {
        categoriesByExam,
        loading,
        error,
        fetchSubcategoriesForExam,
        fetchLocationChoices,
        fetchMorphologyChoices,
        fetchInterventions,
        getCategories,
    };
});
