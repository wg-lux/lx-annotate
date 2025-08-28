interface Finding {
    id: number;
    name: string;
    nameDe?: string;
    description: string;
    examinations: Array<string>;
    FindingClassifications: Array<FindingClassification>;
    findingTypes: Array<string>;
    findingInterventions: Array<string>;
}
interface FindingClassificationChoice {
    id: number;
    name: string;
}
interface FindingClassification {
    id: number;
    name?: string;
    description?: string;
    classificationType?: Array<string>;
    choices?: Array<FindingClassificationChoice>;
    required?: boolean | undefined;
}
export type { Finding, FindingClassification, FindingClassificationChoice };
export declare const useFindingStore: import("pinia").StoreDefinition<"finding", import("pinia")._UnwrapAll<Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
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
    areFindingsLoaded: import("vue").ComputedRef<boolean>;
    fetchFindings: () => Promise<void>;
    fetchFindingClassifications: (findingId: number) => Promise<FindingClassification[]>;
    fetchFindingsByExamination: (examinationId: number) => Promise<Finding[]>;
    fetchExaminationClassifications: (examinationId: number) => Promise<FindingClassification[]>;
    getFindingsByExamination: (examinationId: number) => Finding[];
    getFindingById: (id: number) => Finding | undefined;
    setCurrentFinding: (finding: Finding | null) => void;
}, "loading" | "error" | "findings" | "FindingClassification" | "currentFinding">>, Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
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
    areFindingsLoaded: import("vue").ComputedRef<boolean>;
    fetchFindings: () => Promise<void>;
    fetchFindingClassifications: (findingId: number) => Promise<FindingClassification[]>;
    fetchFindingsByExamination: (examinationId: number) => Promise<Finding[]>;
    fetchExaminationClassifications: (examinationId: number) => Promise<FindingClassification[]>;
    getFindingsByExamination: (examinationId: number) => Finding[];
    getFindingById: (id: number) => Finding | undefined;
    setCurrentFinding: (finding: Finding | null) => void;
}, "areFindingsLoaded">, Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly nameDe?: string | undefined;
        readonly description: string;
        readonly examinations: readonly string[];
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
    areFindingsLoaded: import("vue").ComputedRef<boolean>;
    fetchFindings: () => Promise<void>;
    fetchFindingClassifications: (findingId: number) => Promise<FindingClassification[]>;
    fetchFindingsByExamination: (examinationId: number) => Promise<Finding[]>;
    fetchExaminationClassifications: (examinationId: number) => Promise<FindingClassification[]>;
    getFindingsByExamination: (examinationId: number) => Finding[];
    getFindingById: (id: number) => Finding | undefined;
    setCurrentFinding: (finding: Finding | null) => void;
}, "fetchFindings" | "fetchFindingClassifications" | "fetchFindingsByExamination" | "fetchExaminationClassifications" | "getFindingsByExamination" | "getFindingById" | "setCurrentFinding">>;
