import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { useToastStore } from '@/stores/toastStore';
export const useRequirementStore = defineStore('requirement', () => {
    // State
    const requirementSets = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const currentRequirementSet = ref(null);
    const evaluationResults = ref({});
    const currentRequirementSetIds = ref([]);
    // Actions
    const setCurrentRequirementSet = (requirementSet) => {
        currentRequirementSet.value = requirementSet;
        currentRequirementSetIds.value = requirementSet ? [requirementSet.id] : [];
    };
    const setCurrentRequirementSetIds = (ids) => {
        currentRequirementSetIds.value = ids;
        // When multiple sets are selected, currentRequirementSet (singular) is ambiguous.
        // Let's clear it or set it to the first one if that's the desired behavior.
        // Clearing it seems safer to avoid confusion.
        if (ids.length !== 1) {
            currentRequirementSet.value = null;
        }
        else {
            currentRequirementSet.value = getRequirementSetById(ids[0]) || null;
        }
    };
    const deleteRequirementSetById = (id) => {
        requirementSets.value = requirementSets.value.filter((set) => set.id !== id);
        if (currentRequirementSet.value?.id === id) {
            currentRequirementSet.value = null;
            currentRequirementSetIds.value = [];
        }
        delete evaluationResults.value[id];
    };
    // Computed
    const isRequirementValidated = computed(() => {
        return requirementSets.value.every((set) => set.met);
    });
    const isRequirementSetValidated = computed(() => {
        return currentRequirementSet.value ? currentRequirementSet.value.met : false;
    });
    const metRequirementsCount = computed(() => {
        return requirementSets.value.reduce((count, set) => {
            return count + set.requirements.filter((req) => req.met).length;
        }, 0);
    });
    const totalRequirementsCount = computed(() => {
        return requirementSets.value.reduce((count, set) => {
            return count + set.requirements.length;
        }, 0);
    });
    const fetchRequirementSets = async () => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get('/api/requirement-sets/');
            requirementSets.value = response.data.results || response.data;
        }
        catch (err) {
            error.value =
                'Fehler beim Laden der Anforderungssätze: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch requirement sets error:', err);
        }
        finally {
            loading.value = false;
        }
    };
    const fetchRequirementSet = async (id) => {
        try {
            const response = await axiosInstance.get(`/api/requirement-sets/${id}/`);
            return response.data;
        }
        catch (err) {
            console.error(`Error fetching requirement set ${id}:`, err);
            return null;
        }
    };
    const evaluateRequirements = async (requirementSetIds, patientExaminationId) => {
        try {
            loading.value = true;
            error.value = null;
            const payload = {
                requirement_set_ids: requirementSetIds,
                patient_examination_id: patientExaminationId
            };
            if (patientExaminationId) {
                payload.patient_examination_id = patientExaminationId;
            }
            if (!requirementSetIds) {
                // If no specific sets are provided, evaluate all sets
                payload.requirementSetIds = requirementSets.value.map((set) => set.id);
            }
            else {
                payload.requirementSetIds = requirementSetIds;
            }
            const response = await axiosInstance.post('/api/evaluate-requirements/', payload);
            const results = response.data.results || [];
            // Show debug information about the evaluation
            if (results.length > 0) {
                const toast = useToastStore();
                const failedResults = results.filter((r) => !r.met);
                if (failedResults.length > 0) {
                    toast.warning({
                        text: `${failedResults.length} von ${results.length} Anforderungen nicht erfüllt. Überprüfen Sie die Patientendaten.`,
                        timeout: 5000
                    });
                }
                else {
                    toast.success({
                        text: `Alle ${results.length} Anforderungen erfolgreich erfüllt!`,
                        timeout: 3000
                    });
                }
            }
            // Update evaluation results
            if (requirementSetIds) {
                requirementSetIds.forEach((setId) => {
                    evaluationResults.value[setId] = results.filter((r) => requirementSets.value
                        .find((set) => set.id === setId)
                        ?.requirements.some((req) => req.name === r.requirement_name));
                });
            }
            else {
                // Store results for all sets
                results.forEach((result) => {
                    const setId = requirementSets.value.find((set) => set.requirements.some((req) => req.name === result.requirement_name))?.id;
                    if (setId) {
                        if (!evaluationResults.value[setId]) {
                            evaluationResults.value[setId] = [];
                        }
                        evaluationResults.value[setId].push(result);
                    }
                });
            }
            // Update requirement met status
            updateRequirementsStatus(results);
            return results;
        }
        catch (err) {
            error.value =
                'Fehler bei der Evaluierung der Anforderungen: ' +
                    (err.response?.data?.detail || err.message);
            console.error('Evaluate requirements error:', err);
            // Show error in toast
            const toast = useToastStore();
            toast.error({
                text: 'Fehler bei der Anforderungsevaluierung: ' + (err.response?.data?.detail || err.message),
                timeout: 5000
            });
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const evaluateRequirementSet = async (requirementSetId, patientExaminationId) => {
        try {
            loading.value = true;
            error.value = null;
            const requirementSetIds = currentRequirementSetIds.value.length > 0
                ? currentRequirementSetIds.value
                : [requirementSetId];
            if (requirementSetId.valueOf.length > 0) {
                requirementSetIds.push(requirementSetId);
            }
            const payload = {
                requirement_set_ids: requirementSetIds,
                patient_examination_id: patientExaminationId
            };
            if (patientExaminationId) {
                payload.patient_examination_id = patientExaminationId;
            }
            const response = await axiosInstance.post('/api/evaluate-requirement-set/', payload);
            const results = response.data.results || [];
            // Update evaluation results for this set
            evaluationResults.value[requirementSetId] = results;
            // Update requirement met status
            updateRequirementsStatus(results);
            return results;
        }
        catch (err) {
            error.value =
                'Fehler bei der Evaluierung des Anforderungssatzes: ' +
                    (err.response?.data?.detail || err.message);
            console.error('Evaluate requirement set error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const updateRequirementsStatus = (results) => {
        requirementSets.value.forEach((set) => {
            set.requirements.forEach((requirement) => {
                const result = results.find((r) => r.requirement_name === requirement.name);
                if (result) {
                    requirement.met = result.met;
                    requirement.details = result.details;
                }
            });
            // Update set met status
            set.met = set.requirements.every((req) => req.met);
        });
        // Update current requirement set if it exists
        if (currentRequirementSet.value) {
            const currentSetResults = results.filter((r) => currentRequirementSet.value.requirements.some((req) => req.name === r.requirement_name));
            currentRequirementSet.value.requirements.forEach((requirement) => {
                const result = currentSetResults.find((r) => r.requirement_name === requirement.name);
                if (result) {
                    requirement.met = result.met;
                    requirement.details = result.details;
                }
            });
            currentRequirementSet.value.met = currentRequirementSet.value.requirements.every((req) => req.met);
        }
    };
    const createRequirementLinksFromLookup = (lookupData) => {
        return {
            examinations: lookupData.patientExaminationId ? [lookupData.patientExaminationId] : [],
            findings: lookupData.availableFindings || [],
            finding_classifications: lookupData.findingClassifications || [],
            examination_indications: lookupData.examinationIndications || [],
            indication_choices: lookupData.indicationChoices || [],
            lab_values: lookupData.labValues || [],
            diseases: lookupData.diseases || [],
            disease_classification_choices: lookupData.diseaseClassificationChoices || [],
            events: lookupData.events || [],
            medications: lookupData.medications || [],
            medication_indications: lookupData.medicationIndications || [],
            medication_intake_times: lookupData.medicationIntakeTimes || [],
            medication_schedules: lookupData.medicationSchedules || [],
            genders: lookupData.genders || []
        };
    };
    const evaluateFromLookupData = async (lookupData, requirementSetIds) => {
        const patientExaminationId = lookupData.patientExaminationId;
        return await evaluateRequirements(requirementSetIds, patientExaminationId);
    };
    const evaluateCurrentSetFromLookupData = async (lookupData) => {
        if (!currentRequirementSet.value) {
            throw new Error('No current requirement set selected');
        }
        const patientExaminationId = lookupData.patientExaminationId;
        return await evaluateRequirementSet(currentRequirementSet.value.id, patientExaminationId);
    };
    const getRequirementSetById = (id) => {
        return requirementSets.value.find((set) => set.id === id);
    };
    const getRequirementById = (setId, requirementId) => {
        const set = getRequirementSetById(setId);
        return set?.requirements.find((req) => req.id === requirementId);
    };
    const clearError = () => {
        error.value = null;
    };
    const reset = () => {
        requirementSets.value = [];
        currentRequirementSet.value = null;
        evaluationResults.value = {};
        error.value = null;
    };
    const getRequirementSetEvaluationStatus = (requirementSetId) => {
        const set = getRequirementSetById(requirementSetId);
        if (!set)
            return null;
        const metCount = set.requirements.filter((req) => req.met).length;
        const totalCount = set.requirements.length;
        return {
            met: set.met,
            metRequirementsCount: metCount,
            totalRequirementsCount: totalCount,
            completionPercentage: totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0
        };
    };
    const getRequirementEvaluationStatus = (requirementId) => {
        for (const set of requirementSets.value) {
            const requirement = set.requirements.find((req) => req.id === requirementId);
            if (requirement) {
                return {
                    met: requirement.met,
                    details: requirement.details
                };
            }
        }
        return null;
    };
    const loadRequirementSetsFromLookup = (lookupData) => {
        if (!lookupData.requirementsBySet)
            return;
        const sets = [];
        Object.entries(lookupData.requirementsBySet).forEach(([setId, requirements]) => {
            const setInfo = lookupData.requirementSets?.find((s) => s.id === parseInt(setId));
            if (setInfo) {
                sets.push({
                    id: parseInt(setId),
                    name: setInfo.name,
                    description: setInfo.description,
                    type: setInfo.type,
                    requirements: requirements.map((req) => ({
                        id: req.id,
                        name: req.name,
                        description: req.description,
                        met: lookupData.requirementStatus?.[req.id] || false,
                        details: null
                    })),
                    met: lookupData.requirementSetStatus?.[setId] || false
                });
            }
        });
        requirementSets.value = sets;
    };
    return {
        // State
        requirementSets,
        currentRequirementSet,
        evaluationResults,
        loading,
        error,
        // Computed
        isRequirementValidated,
        isRequirementSetValidated,
        metRequirementsCount,
        totalRequirementsCount,
        // Actions
        setCurrentRequirementSet,
        fetchRequirementSets,
        fetchRequirementSet,
        evaluateRequirements,
        evaluateRequirementSet,
        evaluateFromLookupData,
        evaluateCurrentSetFromLookupData,
        createRequirementLinksFromLookup,
        getRequirementSetById,
        getRequirementById,
        getRequirementSetEvaluationStatus,
        getRequirementEvaluationStatus,
        loadRequirementSetsFromLookup,
        clearError,
        setCurrentRequirementSetIds,
        deleteRequirementSetById,
        reset
    };
});
