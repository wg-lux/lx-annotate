import { defineStore } from 'pinia';
import axiosInstance, { r } from '@/api/axiosInstance';
import { ref } from 'vue';
// --- Store ---
export const useExaminationStore = defineStore('examination', () => {
    // state: map examinationId -> fetched subcategories
    const categoriesByExam = ref({});
    const lastFetchToken = ref(null);
    const loading = ref(false);
    const error = ref(null);
    // Fetch all subcategories for a given examination type
    async function fetchSubcategoriesForExam(examId) {
        // Request-Token erzeugen
        const fetchToken = Symbol();
        lastFetchToken.value = fetchToken;
        error.value = null;
        loading.value = true;
        try {
            const [morphRes, locRes, intRes, instRes] = await Promise.all([
                axiosInstance.get(r(`examinations/${examId}/morphology-classification-choices/`)),
                axiosInstance.get(r(`examinations/${examId}/location-classification-choices/`)),
                axiosInstance.get(r(`examinations/${examId}/interventions/`)),
                axiosInstance.get(r(`examinations/${examId}/instruments/`)),
            ]);
            // Abbruch, falls ein anderer Request in der Zwischenzeit gestartet wurde
            if (lastFetchToken.value !== fetchToken)
                return;
            categoriesByExam.value[examId] = {
                morphologyChoices: morphRes.data,
                locationChoices: locRes.data,
                interventions: intRes.data,
                instruments: instRes.data,
            };
        }
        catch (err) {
            console.error('Error fetching subcategories:', err);
            // Narrowing des Fehlerobjekts eventuell hier hinzufügen
            error.value = (err instanceof Error ? err.message : 'Failed to load subcategories');
        }
        finally {
            loading.value = false;
        }
    }
    // Getter: retrieve map or empty defaults
    function getCategories(examId) {
        return categoriesByExam.value[examId] || {
            morphologyChoices: [],
            locationChoices: [],
            interventions: [],
            instruments: [],
        };
    }
    return {
        categoriesByExam,
        loading,
        error,
        fetchSubcategoriesForExam,
        getCategories,
    };
});
