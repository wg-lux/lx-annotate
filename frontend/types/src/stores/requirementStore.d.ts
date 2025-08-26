export declare const useRequirementStore: import("pinia").StoreDefinition<"requirement", import("pinia")._UnwrapAll<Pick<{
    requirements: import("vue").Ref<{
        id: string;
        name: string;
        description: string;
        status: 'open' | 'true' | 'false';
        errors?: string[] | undefined;
        suggestions?: string[] | undefined;
    }[], Requirement[] | {
        id: string;
        name: string;
        description: string;
        status: 'open' | 'true' | 'false';
        errors?: string[] | undefined;
        suggestions?: string[] | undefined;
    }[]>;
    addRequirement: (requirement: Requirement) => void;
}, "requirements">>, Pick<{
    requirements: import("vue").Ref<{
        id: string;
        name: string;
        description: string;
        status: 'open' | 'true' | 'false';
        errors?: string[] | undefined;
        suggestions?: string[] | undefined;
    }[], Requirement[] | {
        id: string;
        name: string;
        description: string;
        status: 'open' | 'true' | 'false';
        errors?: string[] | undefined;
        suggestions?: string[] | undefined;
    }[]>;
    addRequirement: (requirement: Requirement) => void;
}, never>, Pick<{
    requirements: import("vue").Ref<{
        id: string;
        name: string;
        description: string;
        status: 'open' | 'true' | 'false';
        errors?: string[] | undefined;
        suggestions?: string[] | undefined;
    }[], Requirement[] | {
        id: string;
        name: string;
        description: string;
        status: 'open' | 'true' | 'false';
        errors?: string[] | undefined;
        suggestions?: string[] | undefined;
    }[]>;
    addRequirement: (requirement: Requirement) => void;
}, "addRequirement">>;
export interface Requirement {
    id: string;
    name: string;
    description: string;
    status: 'open' | 'true' | 'false';
    errors?: string[];
    suggestions?: string[];
}
export interface RequirementSet {
    id: string;
    title: string;
    requirements: Requirement[];
    default: boolean;
}
export interface Finding {
    id: number;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    location: string;
    recommendation: string;
    status: 'open' | 'in_progress' | 'resolved';
    createdAt: string;
    updatedAt: string;
    relatedRequirements?: Requirement[];
}
export interface FindingClassification {
    id: number;
    name: string;
    description: string;
    choices: string[];
}
