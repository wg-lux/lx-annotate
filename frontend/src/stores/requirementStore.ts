import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosInstance from '@/api/axiosInstance'
import { useToastStore } from '@/stores/toastStore'

interface Requirement {
    id: number;
    name: string;
    description?: string;
    met: boolean;
    details?: any;
}

interface RequirementSet {
    id: number;
    name: string;
    description?: string;
    type?: string;
    requirements: Requirement[];
    met: boolean; // Computed property
}

interface RequirementEvaluationResult {
    requirement_name: string;
    met: boolean;
    details: any;
}

interface RequirementLinks {
    examinations?: number[];
    findings?: number[];
    finding_classifications?: number[];
    examination_indications?: number[];
    indication_choices?: number[];
    lab_values?: number[];
    diseases?: number[];
    disease_classification_choices?: number[];
    events?: number[];
    medications?: number[];
    medication_indications?: number[];
    medication_intake_times?: number[];
    medication_schedules?: number[];
    genders?: number[];
}

export interface RequirementIssue {
    id?: number;
    set_id?: number;          // which requirement set it belongs to (if applicable)
    requirement_name?: string;
    code?: string;            // machine code/key
    message: string;          // human-readable
    severity?: 'info' | 'warning' | 'error';
    finding_id?: number;      // when tied to a finding
    extra?: Record<string, any>;
}

export const useRequirementStore = defineStore('requirement', () => {
    // State
    const requirementSets = ref<RequirementSet[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const currentRequirementSet = ref<RequirementSet | null>(null);
    const evaluationResults = ref<Record<number, RequirementEvaluationResult[]>>({});
    const currentRequirementSetIds = ref<number[]>([]);
    
    // Issues State
    const issuesBySet = ref<Record<number, RequirementIssue[]>>({});
    const issuesGlobal = ref<RequirementIssue[]>([]);

    // Actions
    const setCurrentRequirementSet = (requirementSet: RequirementSet | null) => {
        currentRequirementSet.value = requirementSet;
        currentRequirementSetIds.value = requirementSet ? [requirementSet.id] : [];
    };


    const setCurrentRequirementSetIds = (ids: number[]) => {
        currentRequirementSetIds.value = ids;
        // When multiple sets are selected, currentRequirementSet (singular) is ambiguous.
        // Let's clear it or set it to the first one if that's the desired behavior.
        // Clearing it seems safer to avoid confusion.
        if (ids.length !== 1) {
            currentRequirementSet.value = null;
        } else {
            currentRequirementSet.value = getRequirementSetById(ids[0]) || null;
        }
    };

    const deleteRequirementSetById = (id: number) => {
        requirementSets.value = requirementSets.value.filter(set => set.id !== id);
        if (currentRequirementSet.value?.id === id) {
            currentRequirementSet.value = null;
            currentRequirementSetIds.value = [];
        }
        delete evaluationResults.value[id];
    };



    // Computed
    const isRequirementValidated = computed(() => {
        return requirementSets.value.every(set => set.met);
    });

    const isRequirementSetValidated = computed(() => {
        return currentRequirementSet.value ? currentRequirementSet.value.met : false;
    });

    const metRequirementsCount = computed(() => {
        return requirementSets.value.reduce((count, set) => {
            return count + set.requirements.filter(req => req.met).length;
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
        } catch (err: any) {
            error.value = 'Fehler beim Laden der Anforderungssätze: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch requirement sets error:', err);
        } finally {
            loading.value = false;
        }
    };

    const fetchRequirementSet = async (id: number): Promise<RequirementSet | null> => {
        try {
            const response = await axiosInstance.get(`/api/requirement-sets/${id}/`);
            return response.data;
        } catch (err: any) {
            console.error(`Error fetching requirement set ${id}:`, err);
            return null;
        }
    };


    const evaluateRequirements = async (requirementSetIds?: number[], patientExaminationId?: number) => {
        try {
            loading.value = true;
            error.value = null;

            const payload: any = {
                requirement_set_ids: requirementSetIds,
                patient_examination_id: patientExaminationId
            };

            if (patientExaminationId) {
                payload.patient_examination_id = patientExaminationId;
            }

            if (!requirementSetIds) {
                // If no specific sets are provided, evaluate all sets
                payload.requirementSetIds = requirementSets.value.map(set => set.id);
            }
            else {
                payload.requirementSetIds = requirementSetIds;
            }


            const response = await axiosInstance.post('/api/evaluate-requirements/', payload);
            const results = response.data.results || [];

            // Show debug information about the evaluation
            if (results.length > 0) {
                const toast = useToastStore();
                const failedResults = results.filter((r: any) => !r.met);
                if (failedResults.length > 0) {
                    toast.warning({
                        text: `${failedResults.length} von ${results.length} Anforderungen nicht erfüllt. Überprüfen Sie die Patientendaten.`,
                        timeout: 5000
                    });
                } else {
                    toast.success({
                        text: `Alle ${results.length} Anforderungen erfolgreich erfüllt!`,
                        timeout: 3000
                    });
                }
            }

            // Update evaluation results
            if (requirementSetIds) {
                requirementSetIds.forEach(setId => {
                    evaluationResults.value[setId] = results.filter((r: RequirementEvaluationResult) =>
                        requirementSets.value.find(set => set.id === setId)?.requirements.some(req => req.name === r.requirement_name)
                    );
                });
            } else {
                // Store results for all sets
                results.forEach((result: RequirementEvaluationResult) => {
                    const setId = requirementSets.value.find(set =>
                        set.requirements.some(req => req.name === result.requirement_name)
                    )?.id;
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
            
            // Ingest issues from evaluation response
            ingestIssues(response.data);

            return results;
        } catch (err: any) {
            error.value = 'Fehler bei der Evaluierung der Anforderungen: ' + (err.response?.data?.detail || err.message);
            console.error('Evaluate requirements error:', err);
            
            // Show error in toast
            const toast = useToastStore();
            toast.error({
                text: 'Fehler bei der Anforderungsevaluierung: ' + (err.response?.data?.detail || err.message),
                timeout: 5000
            });
            
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const evaluateRequirementSet = async (requirementSetId: number, patientExaminationId?: number) => {
        try {
            loading.value = true;
            error.value = null;
            const requirementSetIds = currentRequirementSetIds.value.length > 0 ? currentRequirementSetIds.value : [requirementSetId];
            if (requirementSetId.valueOf.length > 0) {
                requirementSetIds.push(requirementSetId);
            }
            const payload: any = {
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
            
            // Ingest issues from evaluation response
            ingestIssues(response.data);

            return results;
        } catch (err: any) {
            error.value = 'Fehler bei der Evaluierung des Anforderungssatzes: ' + (err.response?.data?.detail || err.message);
            console.error('Evaluate requirement set error:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const updateRequirementsStatus = (results: RequirementEvaluationResult[]) => {
        requirementSets.value.forEach(set => {
            set.requirements.forEach(requirement => {
                const result = results.find(r => r.requirement_name === requirement.name);
                if (result) {
                    requirement.met = result.met;
                    requirement.details = result.details;
                }
            });
            // Update set met status
            set.met = set.requirements.every(req => req.met);
        });

        // Update current requirement set if it exists
        if (currentRequirementSet.value) {
            const currentSetResults = results.filter(r =>
                currentRequirementSet.value!.requirements.some(req => req.name === r.requirement_name)
            );
            currentRequirementSet.value.requirements.forEach(requirement => {
                const result = currentSetResults.find(r => r.requirement_name === requirement.name);
                if (result) {
                    requirement.met = result.met;
                    requirement.details = result.details;
                }
            });
            currentRequirementSet.value.met = currentRequirementSet.value.requirements.every(req => req.met);
        }
    };

    const createRequirementLinksFromLookup = (lookupData: any): RequirementLinks => {
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

    const evaluateFromLookupData = async (lookupData: any, requirementSetIds?: number[]) => {
        const patientExaminationId = lookupData.patientExaminationId;
        
        // Ingest issues from lookup data first
        ingestIssues(lookupData);
        
        const result = await evaluateRequirements(requirementSetIds, patientExaminationId);
        
        // Ingest issues from evaluation response if present
        ingestIssues(result);
        
        return result;
    };

    const evaluateCurrentSetFromLookupData = async (lookupData: any) => {
        if (!currentRequirementSet.value) {
            throw new Error('No current requirement set selected');
        }
        const patientExaminationId = lookupData.patientExaminationId;
        
        // Ingest issues from lookup data first
        ingestIssues(lookupData);
        
        const result = await evaluateRequirementSet(currentRequirementSet.value.id, patientExaminationId);
        
        // Ingest issues from evaluation response if present
        ingestIssues(result);
        
        return result;
    };

    const getRequirementSetById = (id: number): RequirementSet | undefined => {
        return requirementSets.value.find(set => set.id === id);
    };

    const getRequirementById = (setId: number, requirementId: number): Requirement | undefined => {
        const set = getRequirementSetById(setId);
        return set?.requirements.find(req => req.id === requirementId);
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

    const getRequirementSetEvaluationStatus = (requirementSetId: number) => {
        const set = getRequirementSetById(requirementSetId);
        if (!set) return null;

        const metCount = set.requirements.filter(req => req.met).length;
        const totalCount = set.requirements.length;

        return {
            met: set.met,
            metRequirementsCount: metCount,
            totalRequirementsCount: totalCount,
            completionPercentage: totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0
        };
    };

    const getRequirementEvaluationStatus = (requirementId: number) => {
        for (const set of requirementSets.value) {
            const requirement = set.requirements.find(req => req.id === requirementId);
            if (requirement) {
                return {
                    met: requirement.met,
                    details: requirement.details
                };
            }
        }
        return null;
    };

    const issues = computed(() => {
        const allIssues: string[] = [];
        requirementSets.value.forEach(set => {
            set.requirements.forEach(req => {
                if (!req.met && req.details) {
                    if (Array.isArray(req.details)) {
                        req.details.forEach((detail: any) => {
                            if (detail.error) {
                                allIssues.push(`Anforderung "${req.name}": ${detail.error}`);
                            }
                        });
                    } else if (req.details.error) {
                        allIssues.push(`Anforderung "${req.name}": ${req.details.error}`);
                    }
                }
            });
        });
        return allIssues;
    });

    // Computed für strukturierte Anforderungsprobleme für RequirementIssues Component
    const requirementIssuesPayload = computed(() => {
        if (requirementSets.value.length === 0) return null;

        const unmetResults: Array<{
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }> = [];

        requirementSets.value.forEach(set => {
            set.requirements.forEach(req => {
                if (!req.met) {
                    unmetResults.push({
                        requirement_set_id: set.id,
                        requirement_set_name: set.name,
                        requirement_name: req.name,
                        met: false,
                        details: req.details || 'Nicht erfüllt',
                        error: null
                    });
                }
            });
        });

        const totalRequirements = requirementSets.value.reduce((sum, set) => sum + set.requirements.length, 0);

        return {
            ok: unmetResults.length === 0,
            errors: [],
            meta: {
                patientExaminationId: null, // wird später gesetzt
                setsEvaluated: requirementSets.value.length,
                requirementsEvaluated: totalRequirements,
                status: unmetResults.length === 0 ? 'ok' as const : 'partial' as const
            },
            results: unmetResults
        };
    });

    const requirementIssuesUnmetBySet = computed(() => {
        if (!requirementIssuesPayload.value) return {};

        const groupedBySet: Record<string, {
            setId: number | null;
            setName: string;
            items: typeof requirementIssuesPayload.value.results;
        }> = {};

        requirementIssuesPayload.value.results.forEach(item => {
            const key = item.requirement_set_id?.toString() || 'unknown';
            if (!groupedBySet[key]) {
                groupedBySet[key] = {
                    setId: item.requirement_set_id,
                    setName: item.requirement_set_name,
                    items: []
                };
            }
            groupedBySet[key].items.push(item);
        });

        return groupedBySet;
    });

    const loadRequirementSetsFromLookup = (lookupData: any) => {
        if (!lookupData.requirementsBySet) return;

        const sets: RequirementSet[] = [];

        Object.entries(lookupData.requirementsBySet).forEach(([setId, requirements]: [string, any]) => {
            const setInfo = lookupData.requirementSets?.find((s: any) => s.id === parseInt(setId));
            if (setInfo) {
                sets.push({
                    id: parseInt(setId),
                    name: setInfo.name,
                    description: setInfo.description,
                    type: setInfo.type,
                    requirements: requirements.map((req: any) => ({
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

    // Issues Management Functions
    const ingestIssues = (payload: any) => {
        const raw =
            payload?.requirementIssues ||
            payload?.requirement_issues ||
            payload?.issues ||
            [];
        
        const normalizedIssues: RequirementIssue[] = Array.isArray(raw) 
            ? raw.map((i: any) => ({
                id: i.id,
                set_id: i.set_id ?? i.requirement_set_id,
                requirement_name: i.requirement_name ?? i.name,
                code: i.code,
                message: i.message ?? i.detail ?? String(i),
                severity: i.severity ?? 'warning',
                finding_id: i.finding_id,
                extra: i.extra ?? i.details ?? {}
            }))
            : [];

        // Clear and repopulate issues
        issuesBySet.value = {};
        issuesGlobal.value = [];
        
        normalizedIssues.forEach(issue => {
            if (issue.set_id) {
                if (!issuesBySet.value[issue.set_id]) {
                    issuesBySet.value[issue.set_id] = [];
                }
                issuesBySet.value[issue.set_id].push(issue);
            } else {
                issuesGlobal.value.push(issue);
            }
        });
        
        console.log('📝 [RequirementStore] Issues ingested:', {
            raw: raw?.length || 0,
            normalized: normalizedIssues.length,
            bySet: Object.keys(issuesBySet.value).length,
            global: issuesGlobal.value.length
        });
    };

    const getIssuesForSet = (setId: number): RequirementIssue[] => {
        return issuesBySet.value[setId] || [];
    };

    const getAllIssues = (): RequirementIssue[] => {
        const allSetIssues = Object.values(issuesBySet.value).flat();
        return [...allSetIssues, ...issuesGlobal.value];
    };

    const getSeverityCounts = (setId?: number) => {
        const issues = setId ? getIssuesForSet(setId) : getAllIssues();
        return {
            info: issues.filter(i => i.severity === 'info').length,
            warning: issues.filter(i => i.severity === 'warning').length,
            error: issues.filter(i => i.severity === 'error').length
        };
    };

    return {
        // State
        requirementSets,
        currentRequirementSet,
        evaluationResults,
        loading,
        error,
        issues,
        issuesBySet,
        issuesGlobal,

        // Computed
        isRequirementValidated,
        isRequirementSetValidated,
        metRequirementsCount,
        totalRequirementsCount,
        requirementIssuesPayload,
        requirementIssuesUnmetBySet,

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
        reset,

        // Issues Functions
        ingestIssues,
        getIssuesForSet,
        getAllIssues,
        getSeverityCounts
    };
});
