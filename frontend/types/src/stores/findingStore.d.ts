import type { ClassificationChoiceCore, ClassificationCore, FindingCore } from '@/types/coreConcepts';
interface Finding extends Pick<FindingCore, 'name'> {
    id: number;
    description: string;
    nameDe?: string;
    examinations: Array<string>;
    PatientExaminationId?: number;
    FindingClassifications: Array<FindingClassification>;
    findingTypes: FindingCore['findingTypes'];
    findingInterventions: FindingCore['interventions'];
}
interface FindingClassificationChoice extends Pick<ClassificationChoiceCore, 'name'> {
    id: number;
}
interface FindingClassification extends Partial<Pick<ClassificationCore, 'name' | 'description'>> {
    id: number;
    classificationType?: Array<string>;
    choices?: Array<FindingClassificationChoice>;
    required?: boolean | undefined;
}
export type { Finding, FindingClassification, FindingClassificationChoice };
export declare const useFindingStore: import("pinia").StoreDefinition<"finding", Pick<{
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[], readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[]>>;
    FindingClassification: import("vue").Ref<{
        id: number;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }[], FindingClassification[] | {
        id: number;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentFinding: Readonly<import("vue").Ref<{
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    } | null, {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    } | null>>;
    examinationFindings: Readonly<import("vue").Ref<ReadonlyMap<number, readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[]>, ReadonlyMap<number, readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
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
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[], readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[]>>;
    FindingClassification: import("vue").Ref<{
        id: number;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }[], FindingClassification[] | {
        id: number;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentFinding: Readonly<import("vue").Ref<{
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    } | null, {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    } | null>>;
    examinationFindings: Readonly<import("vue").Ref<ReadonlyMap<number, readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[]>, ReadonlyMap<number, readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
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
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[], readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[]>>;
    FindingClassification: import("vue").Ref<{
        id: number;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }[], FindingClassification[] | {
        id: number;
        classificationType?: string[] | undefined;
        choices?: {
            id: number;
            name: string;
        }[] | undefined;
        required?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentFinding: Readonly<import("vue").Ref<{
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    } | null, {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    } | null>>;
    examinationFindings: Readonly<import("vue").Ref<ReadonlyMap<number, readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
    }[]>, ReadonlyMap<number, readonly {
        readonly id: number;
        readonly description: string;
        readonly nameDe?: string | undefined;
        readonly examinations: readonly string[];
        readonly PatientExaminationId?: number | undefined;
        readonly FindingClassifications: readonly {
            readonly id: number;
            readonly classificationType?: readonly string[] | undefined;
            readonly choices?: readonly {
                readonly id: number;
                readonly name: string;
            }[] | undefined;
            readonly required?: boolean | undefined;
            readonly name?: string | undefined;
            readonly description?: string | undefined;
        }[];
        readonly findingTypes: readonly string[];
        readonly findingInterventions: readonly string[];
        readonly name: string;
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
