import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
export const useFindingClassificationStore = defineStore('findingsClassificationStore', () => {
    // State
    const findings = ref({});
    const loading = ref(false);
    const error = ref(null);
    // Getters
    const getClassificationsForFinding = (findingId) => {
        const finding = findings.value[findingId];
        if (!finding)
            return [];
        const primaryClassifications = Array.isArray(finding.classifications) && finding.classifications.length
            ? finding.classifications
            : Array.isArray(finding.FindingClassifications)
                ? finding.FindingClassifications
                : [];
        return [
            ...primaryClassifications,
            ...(Array.isArray(finding.location_classifications) ? finding.location_classifications : []),
            ...(Array.isArray(finding.morphology_classifications)
                ? finding.morphology_classifications
                : [])
        ];
    };
    const getAllFindings = computed(() => Object.values(findings.value));
    const getFindingById = (id) => {
        if (!findings.value[id]) {
            getAllFindings.value; // Trigger loading if not already loaded
        }
        return findings.value[id];
    };
    // Actions
    const clearFindings = () => {
        findings.value = {};
        error.value = null;
    };
    const setError = (err) => {
        error.value = err;
    };
    const setLoading = (isLoading) => {
        loading.value = isLoading;
    };
    const setClassificationChoicesFromLookup = (lookupFindings) => {
        const list = Array.isArray(lookupFindings) ? lookupFindings : [];
        const findingsMap = {};
        list.forEach((entry) => {
            if (!entry || typeof entry !== 'object')
                return;
            const finding = entry;
            const id = Number(finding.id);
            if (!Number.isFinite(id))
                return;
            findingsMap[id] = {
                ...finding,
                id
            };
        });
        findings.value = findingsMap;
        console.log('📋 [FindingsClassificationStore] Set findings from lookup:', Object.keys(findingsMap).length, 'findings');
    };
    return {
        // State
        findings: readonly(findings),
        loading: readonly(loading),
        error: readonly(error),
        // Getters
        getFindingById,
        getClassificationsForFinding,
        getAllFindings,
        // Actions
        clearFindings,
        setError,
        setLoading,
        setClassificationChoicesFromLookup
    };
});
