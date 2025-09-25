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
    met: boolean;
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
    set_id?: number;
    requirement_name?: string;
    code?: string;
    message: string;
    severity?: 'info' | 'warning' | 'error';
    finding_id?: number;
    extra?: Record<string, any>;
}
export declare const useRequirementStore: import("pinia").StoreDefinition<"requirement", Pick<{
    requirementSets: import("vue").Ref<{
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    }[], RequirementSet[] | {
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    }[]>;
    currentRequirementSet: import("vue").Ref<{
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    } | null, RequirementSet | {
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    } | null>;
    evaluationResults: import("vue").Ref<Record<number, RequirementEvaluationResult[]>, Record<number, RequirementEvaluationResult[]>>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    issues: import("vue").ComputedRef<string[]>;
    issuesBySet: import("vue").Ref<Record<number, RequirementIssue[]>, Record<number, RequirementIssue[]>>;
    issuesGlobal: import("vue").Ref<{
        id?: number | undefined;
        set_id?: number | undefined;
        requirement_name?: string | undefined;
        code?: string | undefined;
        message: string;
        severity?: "error" | "warning" | "info" | undefined;
        finding_id?: number | undefined;
        extra?: Record<string, any> | undefined;
    }[], RequirementIssue[] | {
        id?: number | undefined;
        set_id?: number | undefined;
        requirement_name?: string | undefined;
        code?: string | undefined;
        message: string;
        severity?: "error" | "warning" | "info" | undefined;
        finding_id?: number | undefined;
        extra?: Record<string, any> | undefined;
    }[]>;
    isRequirementValidated: import("vue").ComputedRef<boolean>;
    isRequirementSetValidated: import("vue").ComputedRef<boolean>;
    metRequirementsCount: import("vue").ComputedRef<number>;
    totalRequirementsCount: import("vue").ComputedRef<number>;
    requirementIssuesPayload: import("vue").ComputedRef<{
        ok: boolean;
        errors: never[];
        meta: {
            patientExaminationId: null;
            setsEvaluated: number;
            requirementsEvaluated: number;
            status: "ok" | "partial";
        };
        results: {
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }[];
    } | null>;
    requirementIssuesUnmetBySet: import("vue").ComputedRef<Record<string, {
        setId: number | null;
        setName: string;
        items: {
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }[];
    }>>;
    setCurrentRequirementSet: (requirementSet: RequirementSet | null) => void;
    fetchRequirementSets: () => Promise<void>;
    fetchRequirementSet: (id: number) => Promise<RequirementSet | null>;
    evaluateRequirements: (requirementSetIds?: number[], patientExaminationId?: number) => Promise<any>;
    evaluateRequirementSet: (requirementSetId: number, patientExaminationId?: number) => Promise<any>;
    evaluateFromLookupData: (lookupData: any, requirementSetIds?: number[]) => Promise<any>;
    evaluateCurrentSetFromLookupData: (lookupData: any) => Promise<any>;
    createRequirementLinksFromLookup: (lookupData: any) => RequirementLinks;
    getRequirementSetById: (id: number) => RequirementSet | undefined;
    getRequirementById: (setId: number, requirementId: number) => Requirement | undefined;
    getRequirementSetEvaluationStatus: (requirementSetId: number) => {
        met: boolean;
        metRequirementsCount: number;
        totalRequirementsCount: number;
        completionPercentage: number;
    } | null;
    getRequirementEvaluationStatus: (requirementId: number) => {
        met: boolean;
        details: any;
    } | null;
    loadRequirementSetsFromLookup: (lookupData: any) => void;
    clearError: () => void;
    setCurrentRequirementSetIds: (ids: number[]) => void;
    deleteRequirementSetById: (id: number) => void;
    reset: () => void;
    ingestIssues: (payload: any) => void;
    getIssuesForSet: (setId: number) => RequirementIssue[];
    getAllIssues: () => RequirementIssue[];
    getSeverityCounts: (setId?: number) => {
        info: number;
        warning: number;
        error: number;
    };
}, "loading" | "error" | "requirementSets" | "currentRequirementSet" | "evaluationResults" | "issuesBySet" | "issuesGlobal">, Pick<{
    requirementSets: import("vue").Ref<{
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    }[], RequirementSet[] | {
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    }[]>;
    currentRequirementSet: import("vue").Ref<{
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    } | null, RequirementSet | {
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    } | null>;
    evaluationResults: import("vue").Ref<Record<number, RequirementEvaluationResult[]>, Record<number, RequirementEvaluationResult[]>>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    issues: import("vue").ComputedRef<string[]>;
    issuesBySet: import("vue").Ref<Record<number, RequirementIssue[]>, Record<number, RequirementIssue[]>>;
    issuesGlobal: import("vue").Ref<{
        id?: number | undefined;
        set_id?: number | undefined;
        requirement_name?: string | undefined;
        code?: string | undefined;
        message: string;
        severity?: "error" | "warning" | "info" | undefined;
        finding_id?: number | undefined;
        extra?: Record<string, any> | undefined;
    }[], RequirementIssue[] | {
        id?: number | undefined;
        set_id?: number | undefined;
        requirement_name?: string | undefined;
        code?: string | undefined;
        message: string;
        severity?: "error" | "warning" | "info" | undefined;
        finding_id?: number | undefined;
        extra?: Record<string, any> | undefined;
    }[]>;
    isRequirementValidated: import("vue").ComputedRef<boolean>;
    isRequirementSetValidated: import("vue").ComputedRef<boolean>;
    metRequirementsCount: import("vue").ComputedRef<number>;
    totalRequirementsCount: import("vue").ComputedRef<number>;
    requirementIssuesPayload: import("vue").ComputedRef<{
        ok: boolean;
        errors: never[];
        meta: {
            patientExaminationId: null;
            setsEvaluated: number;
            requirementsEvaluated: number;
            status: "ok" | "partial";
        };
        results: {
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }[];
    } | null>;
    requirementIssuesUnmetBySet: import("vue").ComputedRef<Record<string, {
        setId: number | null;
        setName: string;
        items: {
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }[];
    }>>;
    setCurrentRequirementSet: (requirementSet: RequirementSet | null) => void;
    fetchRequirementSets: () => Promise<void>;
    fetchRequirementSet: (id: number) => Promise<RequirementSet | null>;
    evaluateRequirements: (requirementSetIds?: number[], patientExaminationId?: number) => Promise<any>;
    evaluateRequirementSet: (requirementSetId: number, patientExaminationId?: number) => Promise<any>;
    evaluateFromLookupData: (lookupData: any, requirementSetIds?: number[]) => Promise<any>;
    evaluateCurrentSetFromLookupData: (lookupData: any) => Promise<any>;
    createRequirementLinksFromLookup: (lookupData: any) => RequirementLinks;
    getRequirementSetById: (id: number) => RequirementSet | undefined;
    getRequirementById: (setId: number, requirementId: number) => Requirement | undefined;
    getRequirementSetEvaluationStatus: (requirementSetId: number) => {
        met: boolean;
        metRequirementsCount: number;
        totalRequirementsCount: number;
        completionPercentage: number;
    } | null;
    getRequirementEvaluationStatus: (requirementId: number) => {
        met: boolean;
        details: any;
    } | null;
    loadRequirementSetsFromLookup: (lookupData: any) => void;
    clearError: () => void;
    setCurrentRequirementSetIds: (ids: number[]) => void;
    deleteRequirementSetById: (id: number) => void;
    reset: () => void;
    ingestIssues: (payload: any) => void;
    getIssuesForSet: (setId: number) => RequirementIssue[];
    getAllIssues: () => RequirementIssue[];
    getSeverityCounts: (setId?: number) => {
        info: number;
        warning: number;
        error: number;
    };
}, "issues" | "isRequirementValidated" | "isRequirementSetValidated" | "metRequirementsCount" | "totalRequirementsCount" | "requirementIssuesPayload" | "requirementIssuesUnmetBySet">, Pick<{
    requirementSets: import("vue").Ref<{
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    }[], RequirementSet[] | {
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    }[]>;
    currentRequirementSet: import("vue").Ref<{
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    } | null, RequirementSet | {
        id: number;
        name: string;
        description?: string | undefined;
        type?: string | undefined;
        requirements: {
            id: number;
            name: string;
            description?: string | undefined;
            met: boolean;
            details?: any;
        }[];
        met: boolean;
    } | null>;
    evaluationResults: import("vue").Ref<Record<number, RequirementEvaluationResult[]>, Record<number, RequirementEvaluationResult[]>>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    issues: import("vue").ComputedRef<string[]>;
    issuesBySet: import("vue").Ref<Record<number, RequirementIssue[]>, Record<number, RequirementIssue[]>>;
    issuesGlobal: import("vue").Ref<{
        id?: number | undefined;
        set_id?: number | undefined;
        requirement_name?: string | undefined;
        code?: string | undefined;
        message: string;
        severity?: "error" | "warning" | "info" | undefined;
        finding_id?: number | undefined;
        extra?: Record<string, any> | undefined;
    }[], RequirementIssue[] | {
        id?: number | undefined;
        set_id?: number | undefined;
        requirement_name?: string | undefined;
        code?: string | undefined;
        message: string;
        severity?: "error" | "warning" | "info" | undefined;
        finding_id?: number | undefined;
        extra?: Record<string, any> | undefined;
    }[]>;
    isRequirementValidated: import("vue").ComputedRef<boolean>;
    isRequirementSetValidated: import("vue").ComputedRef<boolean>;
    metRequirementsCount: import("vue").ComputedRef<number>;
    totalRequirementsCount: import("vue").ComputedRef<number>;
    requirementIssuesPayload: import("vue").ComputedRef<{
        ok: boolean;
        errors: never[];
        meta: {
            patientExaminationId: null;
            setsEvaluated: number;
            requirementsEvaluated: number;
            status: "ok" | "partial";
        };
        results: {
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }[];
    } | null>;
    requirementIssuesUnmetBySet: import("vue").ComputedRef<Record<string, {
        setId: number | null;
        setName: string;
        items: {
            requirement_set_id: number | null;
            requirement_set_name: string;
            requirement_name: string;
            met: boolean;
            details: string;
            error: string | null;
        }[];
    }>>;
    setCurrentRequirementSet: (requirementSet: RequirementSet | null) => void;
    fetchRequirementSets: () => Promise<void>;
    fetchRequirementSet: (id: number) => Promise<RequirementSet | null>;
    evaluateRequirements: (requirementSetIds?: number[], patientExaminationId?: number) => Promise<any>;
    evaluateRequirementSet: (requirementSetId: number, patientExaminationId?: number) => Promise<any>;
    evaluateFromLookupData: (lookupData: any, requirementSetIds?: number[]) => Promise<any>;
    evaluateCurrentSetFromLookupData: (lookupData: any) => Promise<any>;
    createRequirementLinksFromLookup: (lookupData: any) => RequirementLinks;
    getRequirementSetById: (id: number) => RequirementSet | undefined;
    getRequirementById: (setId: number, requirementId: number) => Requirement | undefined;
    getRequirementSetEvaluationStatus: (requirementSetId: number) => {
        met: boolean;
        metRequirementsCount: number;
        totalRequirementsCount: number;
        completionPercentage: number;
    } | null;
    getRequirementEvaluationStatus: (requirementId: number) => {
        met: boolean;
        details: any;
    } | null;
    loadRequirementSetsFromLookup: (lookupData: any) => void;
    clearError: () => void;
    setCurrentRequirementSetIds: (ids: number[]) => void;
    deleteRequirementSetById: (id: number) => void;
    reset: () => void;
    ingestIssues: (payload: any) => void;
    getIssuesForSet: (setId: number) => RequirementIssue[];
    getAllIssues: () => RequirementIssue[];
    getSeverityCounts: (setId?: number) => {
        info: number;
        warning: number;
        error: number;
    };
}, "clearError" | "reset" | "setCurrentRequirementSet" | "fetchRequirementSets" | "fetchRequirementSet" | "evaluateRequirements" | "evaluateRequirementSet" | "evaluateFromLookupData" | "evaluateCurrentSetFromLookupData" | "createRequirementLinksFromLookup" | "getRequirementSetById" | "getRequirementById" | "getRequirementSetEvaluationStatus" | "getRequirementEvaluationStatus" | "loadRequirementSetsFromLookup" | "setCurrentRequirementSetIds" | "deleteRequirementSetById" | "ingestIssues" | "getIssuesForSet" | "getAllIssues" | "getSeverityCounts">>;
export {};
