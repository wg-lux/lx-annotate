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
export declare const useFindingStore: import("pinia").StoreDefinition<"finding", Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>>;
    FindingClassification: import("vue").Ref<{
        id: number;
        name?: string | undefined;
        description?: string | undefined;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[], FindingClassification[] | {
        id: number;
        name?: string | undefined;
        description?: string | undefined;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentFinding: Readonly<import("vue").Ref<{
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    } | null, {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    } | null>>;
    examinationFindings: Readonly<import("vue").Ref<ReadonlyMap<number, readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>, ReadonlyMap<number, readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>>>;
    areFindingsLoaded: import("vue").ComputedRef<boolean>;
    fetchFindings: () => Promise<void>;
    fetchFindingClassifications: (findingId: number) => Promise<FindingClassification[]>;
    fetchFindingsByExamination: (examinationId: number) => Promise<Finding[]>;
    fetchExaminationClassifications: (examinationId: number) => Promise<FindingClassification[]>;
    getFindingsByExamination: (examinationId: number) => Finding[];
    getFindingById: (id: number) => Finding | undefined;
    getFindingIdsByPatientExaminationId: (patientExaminationId: number) => number[];
    setCurrentFinding: (finding: Finding | null) => void;
    isExaminationFindingsLoaded: (examinationId: number) => boolean;
    isExaminationFindingsLoading: (examinationId: number) => boolean;
    clearExaminationFindingsCache: (examinationId?: number) => void;
    fetchFindingsByPatientExamination: (patientExaminationId: number | null) => Promise<Finding[]>;
}, "loading" | "error" | "findings" | "FindingClassification" | "currentFinding" | "examinationFindings">, Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>>;
    FindingClassification: import("vue").Ref<{
        id: number;
        name?: string | undefined;
        description?: string | undefined;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[], FindingClassification[] | {
        id: number;
        name?: string | undefined;
        description?: string | undefined;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentFinding: Readonly<import("vue").Ref<{
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    } | null, {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    } | null>>;
    examinationFindings: Readonly<import("vue").Ref<ReadonlyMap<number, readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>, ReadonlyMap<number, readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>>>;
    areFindingsLoaded: import("vue").ComputedRef<boolean>;
    fetchFindings: () => Promise<void>;
    fetchFindingClassifications: (findingId: number) => Promise<FindingClassification[]>;
    fetchFindingsByExamination: (examinationId: number) => Promise<Finding[]>;
    fetchExaminationClassifications: (examinationId: number) => Promise<FindingClassification[]>;
    getFindingsByExamination: (examinationId: number) => Finding[];
    getFindingById: (id: number) => Finding | undefined;
    getFindingIdsByPatientExaminationId: (patientExaminationId: number) => number[];
    setCurrentFinding: (finding: Finding | null) => void;
    isExaminationFindingsLoaded: (examinationId: number) => boolean;
    isExaminationFindingsLoading: (examinationId: number) => boolean;
    clearExaminationFindingsCache: (examinationId?: number) => void;
    fetchFindingsByPatientExamination: (patientExaminationId: number | null) => Promise<Finding[]>;
}, "areFindingsLoaded">, Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>>;
    FindingClassification: import("vue").Ref<{
        id: number;
        name?: string | undefined;
        description?: string | undefined;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[], FindingClassification[] | {
        id: number;
        name?: string | undefined;
        description?: string | undefined;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentFinding: Readonly<import("vue").Ref<{
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    } | null, {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    } | null>>;
    examinationFindings: Readonly<import("vue").Ref<ReadonlyMap<number, readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>, ReadonlyMap<number, readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
    }[]>>>;
    areFindingsLoaded: import("vue").ComputedRef<boolean>;
    fetchFindings: () => Promise<void>;
    fetchFindingClassifications: (findingId: number) => Promise<FindingClassification[]>;
    fetchFindingsByExamination: (examinationId: number) => Promise<Finding[]>;
    fetchExaminationClassifications: (examinationId: number) => Promise<FindingClassification[]>;
    getFindingsByExamination: (examinationId: number) => Finding[];
    getFindingById: (id: number) => Finding | undefined;
    getFindingIdsByPatientExaminationId: (patientExaminationId: number) => number[];
    setCurrentFinding: (finding: Finding | null) => void;
    isExaminationFindingsLoaded: (examinationId: number) => boolean;
    isExaminationFindingsLoading: (examinationId: number) => boolean;
    clearExaminationFindingsCache: (examinationId?: number) => void;
    fetchFindingsByPatientExamination: (patientExaminationId: number | null) => Promise<Finding[]>;
}, "fetchFindings" | "fetchFindingClassifications" | "fetchFindingsByExamination" | "fetchExaminationClassifications" | "getFindingsByExamination" | "getFindingById" | "getFindingIdsByPatientExaminationId" | "setCurrentFinding" | "isExaminationFindingsLoaded" | "isExaminationFindingsLoading" | "clearExaminationFindingsCache" | "fetchFindingsByPatientExamination">>;
