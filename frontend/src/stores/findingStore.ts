/**
 * @fileoverview Finding Store - Manages medical findings with examination-scoped caching
 * 
 * This store handles the management of medical findings that can be associated with
 * different examinations and patient examinations. It provides efficient caching
 * mechanisms to minimize API calls and improve performance.
 * 
 * Key Features:
 * - Examination-scoped caching: Findings are cached per examination to avoid redundant API calls
 * - Finding classifications: Manages the hierarchical classification system for findings
 * - Patient examination associations: Links findings to specific patient examinations
 * - Flexible data retrieval: Multiple methods for fetching findings based on different criteria
 * 
 * @author LX-Annotate Team
 * @version 2.0.0
 */

import {defineStore} from "pinia";
import axiosInstance from "@/api/axiosInstance";
import {ref, readonly, computed} from "vue";
import type { Patient } from '../api/patientService';
import { useExaminationStore } from "@/stores/examinationStore";

// --- Interfaces ---

/**
 * Represents a medical finding that can be documented during examinations
 * @interface Finding
 */
interface Finding {
    /** Unique identifier for the finding */
    id: number;
    /** English name of the finding */
    name: string;
    /** German name of the finding (optional) */
    nameDe?: string;
    /** Detailed description of the finding */
    description: string;
    /** List of examination types this finding applies to */
    examinations: Array<string>;
    /** Associated Patient Examination ID (optional) */
    PatientExaminationId?: number;
    /** Available classifications for this finding */
    FindingClassifications: Array<FindingClassification>;
    /** Types/categories this finding belongs to */
    findingTypes: Array<string>;
    /** Available interventions for this finding */
    findingInterventions: Array<string>;
}

/**
 * Represents a choice within a finding classification
 * @interface FindingClassificationChoice
 */
interface FindingClassificationChoice {
    /** Unique identifier for the choice */
    id: number;
    /** Display name of the choice */
    name: string;
}

/**
 * Represents a classification system for findings (e.g., severity, location, etc.)
 * @interface FindingClassification
 */
interface FindingClassification {
    /** Unique identifier for the classification */
    id: number;
    /** Name of the classification (optional) */
    name?: string;
    /** Description of what this classification represents (optional) */
    description?: string;
    /** Type of classification system (optional) */
    classificationType?: Array<string>;
    /** Available choices for this classification (optional) */
    choices?: Array<FindingClassificationChoice>;
    /** Whether this classification is required when documenting the finding (optional) */
    required?: boolean | undefined;
}

export type { Finding, FindingClassification, FindingClassificationChoice };

/**
 * Finding Store
 * 
 * Manages medical findings with intelligent caching strategies to optimize
 * performance and reduce API calls. This store handles both global findings
 * and examination-specific findings with separate caching mechanisms.
 * 
 * Architecture:
 * - Global findings cache: For all findings in the system
 * - Examination-scoped cache: Map<examinationId, Finding[]> for findings per examination
 * - Loading state tracking: Per-examination loading states to prevent duplicate requests
 * - Classification management: Handles finding classification data and relationships
 * 
 * @returns Pinia store instance with reactive state and methods
 */
export const useFindingStore = defineStore('finding', () => {
    // Global findings state
    const findings = ref<Finding[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const currentFinding = ref<Finding | null>(null);
    const FindingClassification = ref<FindingClassification[]>([]);

    // Examination-scoped caching for findings
    /** Map storing findings grouped by examination ID for efficient caching */
    const examinationFindings = ref<Map<number, Finding[]>>(new Map());
    /** Map tracking loading states for each examination to prevent duplicate requests */
    const examinationFindingsLoading = ref<Map<number, boolean>>(new Map());

    const examinationStore = useExaminationStore();
    
    

    /**
     * Fetches all findings from the API
     * 
     * Loads all available findings in the system and stores them in the global
     * findings array. This is typically called once during application initialization.
     * 
     * @throws Will set error state if the API call fails
     */
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

    /**
     * Fetches classifications for a specific finding
     * 
     * Retrieves the available classification options for a given finding,
     * including choices, requirements, and validation rules.
     * 
     * @param findingId - The ID of the finding to fetch classifications for
     * @returns Promise resolving to array of FindingClassification objects
     * @throws Will throw an error if the API call fails
     */
    const fetchFindingClassifications = async (findingId: number): Promise<FindingClassification[]> => {
        try {
            const response = await axiosInstance.get(`/api/findings/${findingId}/classifications/`);
            return response.data as FindingClassification[];
        } catch (err: any) {
            console.error(`Error fetching classifications for finding ${findingId}:`, err);
            throw err;
        }
    };

    /**
     * Fetches findings filtered by patient examination
     * 
     * Implements examination-scoped caching to optimize performance by avoiding
     * redundant API calls for the same examination. Uses examinationFindings
     * to store results per examination ID.
     * 
     * @param examinationId - The ID of the patient examination to filter by
     * @returns Promise resolving to array of Finding objects for the examination
     * @throws Will set error state if the API call fails
     */
    const fetchFindingsByExamination = async (examinationId: number): Promise<Finding[]> => {
        try {
            // Check cache first to avoid redundant API calls
            if (examinationFindings.value.has(examinationId)) {
                return examinationFindings.value.get(examinationId)!;
            }

            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get(`/api/findings/`, {
                params: { patient_examination: examinationId }
            });
            
            const examFindings = response.data.results || response.data;
            
            // Store in cache for future use
            examinationFindings.value.set(examinationId, examFindings);
            
            return examFindings;
        } catch (err: any) {
            error.value = 'Fehler beim Laden der Befunde: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch examination findings error:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    /**
     * Clears cached findings for a specific examination
     * 
     * Used to invalidate cached data when findings for an examination
     * have been modified, ensuring fresh data on next fetch.
     * 
     * @param examinationId - The examination ID to clear from cache
     */
    const clearExaminationCache = (examinationId: number) => {
        examinationFindings.value.delete(examinationId);
    };

    /**
     * Clears all cached examination findings
     * 
     * Useful for scenarios where global data invalidation is needed,
     * such as after major data updates or user role changes.
     */
    const clearAllCache = () => {
        examinationFindings.value.clear();
    };

    const fetchFindingsByPatientExamination = async (patientExaminationId: number | null): Promise<Finding[]> => {
        if (!patientExaminationId) return [];
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get(`/api/patient-examinations/${patientExaminationId}/findings/`);
            findings.value = response.data.results || response.data;
            return findings.value as Finding[];
        } catch (err: any) {
            error.value = 'Fehler beim Laden der Befunde für die Patientenuntersuchung: ' + (err.response?.data?.detail || err.message);
            console.error('Fetch findings by patient examination error:', err);
            return [];
        } finally {
            loading.value = false;
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

    /**
     * Retrieves a finding by its unique ID
     * 
     * Searches through the global findings array to find a finding
     * with the specified ID.
     * 
     * @param id - The unique ID of the finding to retrieve
     * @returns The Finding object if found, undefined otherwise
     */
    const getFindingById = (id: number): Finding | undefined => {
        return findings.value.find(finding => finding.id === id);
    };

    /**
     * Sets the currently selected finding
     * 
     * Updates the reactive currentFinding state, typically used
     * when a user selects a finding in the UI for detailed viewing.
     * 
     * @param finding - The Finding object to set as current, or null to clear
     */
    const setCurrentFinding = (finding: Finding | null) => {
        currentFinding.value = finding;
    };

    /**
     * Sets the classifications for the current finding
     * 
     * Updates the FindingClassification state with new classification data.
     * This is typically called after fetching classifications for a specific finding.
     * 
     * @param classifications - Array of FindingClassification objects to set
     * @returns The updated FindingClassification array
     */
    const setCurrentFindingClassification = (classifications: FindingClassification[]) => {
        return FindingClassification.value = classifications;
    };

    /**
     * Computed property indicating whether findings have been loaded
     * 
     * Reactive computed that returns true if the global findings array
     * contains any findings, indicating successful data loading.
     * 
     * @returns true if findings are loaded, false otherwise
     */
    const areFindingsLoaded = computed(() => findings.value.length > 0);
    
    /**
     * Retrieves cached findings for a specific examination
     * 
     * Returns findings from the examination cache if available, otherwise
     * falls back to filtering the global findings array. Includes debug
     * logging for cache hit/miss scenarios.
     * 
     * @param examinationId - The ID of the examination to get findings for
     * @returns Array of Finding objects for the examination
     */
    const getFindingsByExamination = (examinationId: number): Finding[] => {
        // Verwende gecachte Findings falls verfügbar
        if (examinationFindings.value.has(examinationId)) {
            console.log("Using cached findings for examination", examinationId);
            return examinationFindings.value.get(examinationId)!;
        }
        console.log("No cached findings for examination", examinationId);
        console.log("Using the following findings:")

        // Fallback: Filtere aus allen Findings (für den Fall, dass noch nicht geladen wurde)
        // Dies ist weniger effizient, aber funktioniert als Fallback
        return findings.value.filter(finding => {
            console.log(finding);
            return finding.examinations && finding.examinations.includes(examinationId.toString());
        });
    };

    /**
     * Retrieves finding IDs associated with a patient examination
     * 
     * Filters through all findings to find those belonging to a specific
     * patient examination and returns their IDs.
     * 
     * @param patientExaminationId - The ID of the patient examination
     * @returns Array of finding IDs belonging to the examination
     */
    const getFindingIdsByPatientExaminationId = (patientExaminationId: number): number[] => {
        const findingIds: number[] = [];
        for (const finding of findings.value) {
            if (finding.PatientExaminationId === patientExaminationId) {
                findingIds.push(finding.id);
            }
        }
        return findingIds;
    };

    /**
     * Checks if findings for an examination are cached
     * 
     * Determines whether findings for a specific examination
     * have been loaded and are available in the cache.
     * 
     * @param examinationId - The examination ID to check
     * @returns true if findings are cached, false otherwise
     */
    const isExaminationFindingsLoaded = (examinationId: number): boolean => {
        return examinationFindings.value.has(examinationId);
    };

    /**
     * Checks if findings for an examination are currently loading
     * 
     * Determines whether an API request is currently in progress
     * for loading findings for a specific examination.
     * 
     * @param examinationId - The examination ID to check
     * @returns true if currently loading, false otherwise
     */
    const isExaminationFindingsLoading = (examinationId: number): boolean => {
        return examinationFindingsLoading.value.get(examinationId) || false;
    };

    /**
     * Clears examination findings cache
     * 
     * Removes cached findings and loading states for a specific examination
     * or clears all cached data if no examination ID is provided.
     * 
     * @param examinationId - Optional examination ID to clear, clears all if omitted
     */
    const clearExaminationFindingsCache = (examinationId?: number) => {
        if (examinationId) {
            examinationFindings.value.delete(examinationId);
            examinationFindingsLoading.value.delete(examinationId);
        } else {
            examinationFindings.value.clear();
            examinationFindingsLoading.value.clear();
        }
    };

    /**
     * Gets the current patient examination ID
     * 
     * Delegates to the examination store to retrieve the currently
     * active patient examination ID.
     * 
     * @returns The current examination ID from the examination store
     */
    const getCurrentPatientExaminationId = () => {
        return examinationStore.getCurrentExaminationId();
    }

        


    /**
     * Store API Export
     * 
     * Returns the public interface of the findings store including reactive state,
     * computed properties, and methods for managing findings and classifications.
     * 
     * State Properties:
     * - findings: Global findings array (readonly)
     * - FindingClassification: Current finding classifications
     * - loading: Global loading state (readonly)
     * - error: Error state with failure messages (readonly)
     * - currentFinding: Currently selected finding (readonly)
     * - examinationFindings: Examination-scoped findings cache (readonly)
     * - areFindingsLoaded: Computed property for load status
     * 
     * Data Fetching Methods:
     * - fetchFindings: Load all available findings
     * - fetchFindingClassifications: Get classifications for a specific finding
     * - fetchFindingsByExamination: Load findings for an examination (with caching)
     * - fetchExaminationClassifications: Get classifications for examination findings
     * - fetchFindingsByPatientExamination: Load findings for patient examination
     * 
     * Data Access Methods:
     * - getFindingsByExamination: Get cached findings for examination
     * - getFindingById: Retrieve finding by ID
     * - getFindingIdsByPatientExaminationId: Get finding IDs for patient examination
     * 
     * State Management Methods:
     * - setCurrentFinding: Set the currently selected finding
     * 
     * Cache Management Methods:
     * - isExaminationFindingsLoaded: Check if examination findings are cached
     * - isExaminationFindingsLoading: Check loading state for examination
     * - clearExaminationFindingsCache: Clear cache for specific or all examinations
     */
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
        fetchFindingsByPatientExamination,
    };
});
