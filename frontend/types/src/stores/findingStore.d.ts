interface Finding {
    id: number;
    name: string;
    nameDe?: string;
    description: string;
    examinations: Array<string>;
    PatientExaminationId?: number;
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
