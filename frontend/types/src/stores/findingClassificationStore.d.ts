import type { ClassificationChoiceCore, ClassificationCore, FindingCore } from '@/types/coreConcepts';
export interface FindingChoice extends Pick<ClassificationChoiceCore, 'name' | 'description'> {
    id: number;
    description: string;
    subcategories: Record<string, any>;
    numerical_descriptors: Record<string, any>;
}
export interface FindingClassification extends Pick<ClassificationCore, 'name' | 'description'> {
    id: number;
    description: string;
    choices: FindingChoice[];
    classification_types: string[];
}
export interface Finding extends Pick<FindingCore, 'name'> {
    id: number;
    description: string;
    nameDe?: string;
    examinations: string[];
    PatientExaminationId?: number;
    FindingClassifications: FindingClassification[];
    findingTypes: FindingCore['findingTypes'];
    findingInterventions: FindingCore['interventions'];
    classifications?: FindingClassification[];
    location_classifications?: FindingClassification[];
    morphology_classifications?: FindingClassification[];
}
export declare const useFindingClassificationStore: import("pinia").StoreDefinition<"findingsClassificationStore", Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly name: string;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
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
    setClassificationChoicesFromLookup: (lookupFindings: unknown) => void;
}, "error" | "loading" | "findings">, Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly name: string;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
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
    setClassificationChoicesFromLookup: (lookupFindings: unknown) => void;
}, "getAllFindings">, Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly name: string;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                    readonly name: string;
                }[];
                readonly classification_types: readonly string[];
                readonly name: string;
            }[] | undefined;
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
    setClassificationChoicesFromLookup: (lookupFindings: unknown) => void;
}, "getFindingById" | "getClassificationsForFinding" | "clearFindings" | "setError" | "setLoading" | "setClassificationChoicesFromLookup">>;
