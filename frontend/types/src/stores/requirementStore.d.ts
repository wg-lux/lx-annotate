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
    isRequirementValidated: import("vue").ComputedRef<boolean>;
    isRequirementSetValidated: import("vue").ComputedRef<boolean>;
    metRequirementsCount: import("vue").ComputedRef<number>;
    totalRequirementsCount: import("vue").ComputedRef<number>;
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
}, "loading" | "error" | "requirementSets" | "currentRequirementSet" | "evaluationResults">, Pick<{
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
    isRequirementValidated: import("vue").ComputedRef<boolean>;
    isRequirementSetValidated: import("vue").ComputedRef<boolean>;
    metRequirementsCount: import("vue").ComputedRef<number>;
    totalRequirementsCount: import("vue").ComputedRef<number>;
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
}, "isRequirementValidated" | "isRequirementSetValidated" | "metRequirementsCount" | "totalRequirementsCount">, Pick<{
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
    isRequirementValidated: import("vue").ComputedRef<boolean>;
    isRequirementSetValidated: import("vue").ComputedRef<boolean>;
    metRequirementsCount: import("vue").ComputedRef<number>;
    totalRequirementsCount: import("vue").ComputedRef<number>;
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
}, "clearError" | "reset" | "setCurrentRequirementSet" | "fetchRequirementSets" | "fetchRequirementSet" | "evaluateRequirements" | "evaluateRequirementSet" | "evaluateFromLookupData" | "evaluateCurrentSetFromLookupData" | "createRequirementLinksFromLookup" | "getRequirementSetById" | "getRequirementById" | "getRequirementSetEvaluationStatus" | "getRequirementEvaluationStatus" | "loadRequirementSetsFromLookup" | "setCurrentRequirementSetIds" | "deleteRequirementSetById">>;
export {};
