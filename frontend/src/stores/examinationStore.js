import { defineStore } from 'pinia';
import axios from 'axios';
import { ref } from 'vue';
// --- Store ---
export const useExaminationStore = defineStore('examination', () => {
    // state: map examinationId -> fetched subcategories
    const categoriesByExam = ref({});
    const loading = ref(false);
    const error = ref(null);
    // Fetch all subcategories for a given examination type
    async function fetchSubcategoriesForExam(examId) {
        loading.value = true;
        error.value = null;
        try {
            // API endpoints assumed to follow REST conventions
            const [morphRes, locRes, intRes, instRes] = await Promise.all([
                axios.get(`/api/examinations/${examId}/morphology-classification-choices/`),
                axios.get(`/api/examinations/${examId}/location-classification-choices/`),
                axios.get(`/api/examinations/${examId}/interventions/`),
                axios.get(`/api/examinations/${examId}/instruments/`),
            ]);
            categoriesByExam.value[examId] = {
                morphologyChoices: morphRes.data,
                locationChoices: locRes.data,
                interventions: intRes.data,
                instruments: instRes.data,
            };
        }
        catch (err) {
            console.error('Error fetching subcategories:', err);
            error.value = err.message || 'Failed to load subcategories';
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
