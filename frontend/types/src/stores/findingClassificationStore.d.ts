import { type Finding, type FindingClassification } from '@/api/findings.contract';
export type { Finding, FindingClassification };
export declare const useFindingClassificationStore: import("pinia").StoreDefinition<"findingsClassificationStore", Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        };
    }>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    getFindingById: (id: number) => Finding | undefined;
    getClassificationsForFinding: (findingId: number) => FindingClassification[];
    getAllFindings: import("vue").ComputedRef<Finding[]>;
    clearFindings: () => void;
    setError: (err: string) => void;
    setLoading: (isLoading: boolean) => void;
    replaceFindings: (entries: Finding[]) => void;
    upsertFindings: (entries: Finding[]) => void;
    setClassificationChoicesFromLookup: (lookupFindings: unknown) => void;
}, "error" | "loading" | "findings">, Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        };
    }>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    getFindingById: (id: number) => Finding | undefined;
    getClassificationsForFinding: (findingId: number) => FindingClassification[];
    getAllFindings: import("vue").ComputedRef<Finding[]>;
    clearFindings: () => void;
    setError: (err: string) => void;
    setLoading: (isLoading: boolean) => void;
    replaceFindings: (entries: Finding[]) => void;
    upsertFindings: (entries: Finding[]) => void;
    setClassificationChoicesFromLookup: (lookupFindings: unknown) => void;
}, "getAllFindings">, Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly patientExaminationId?: number | undefined;
            readonly classifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly locationClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly morphologyClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description?: string | undefined;
                readonly nameDe?: string | undefined;
                readonly required: boolean;
                readonly classificationTypes: readonly string[];
                readonly choices: readonly {
                    readonly id: number;
                    readonly description?: string | undefined;
                    readonly nameDe?: string | undefined;
                    readonly subcategories: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly numericalDescriptors: {
                        readonly [x: string]: Readonly<unknown>;
                    };
                    readonly name: string;
                }[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        };
    }>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    getFindingById: (id: number) => Finding | undefined;
    getClassificationsForFinding: (findingId: number) => FindingClassification[];
    getAllFindings: import("vue").ComputedRef<Finding[]>;
    clearFindings: () => void;
    setError: (err: string) => void;
    setLoading: (isLoading: boolean) => void;
    replaceFindings: (entries: Finding[]) => void;
    upsertFindings: (entries: Finding[]) => void;
    setClassificationChoicesFromLookup: (lookupFindings: unknown) => void;
}, "getFindingById" | "getClassificationsForFinding" | "clearFindings" | "setError" | "setLoading" | "replaceFindings" | "upsertFindings" | "setClassificationChoicesFromLookup">>;
