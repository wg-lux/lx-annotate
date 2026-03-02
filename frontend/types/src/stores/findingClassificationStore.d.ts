export interface FindingChoice {
    id: number;
    name: string;
    description: string;
    subcategories: Record<string, any>;
    numerical_descriptors: Record<string, any>;
}
export interface FindingClassification {
    id: number;
    name: string;
    description: string;
    choices: FindingChoice[];
    classification_types: number[];
}
export interface Finding {
    id: number;
    name: string;
    nameDe?: string;
    description: string;
    examinations: string[];
    PatientExaminationId?: number;
    FindingClassifications: FindingClassification[];
    findingTypes: string[];
    findingInterventions: string[];
    classifications?: FindingClassification[];
    location_classifications?: FindingClassification[];
    morphology_classifications?: FindingClassification[];
}
export declare const useFindingClassificationStore: import("pinia").StoreDefinition<"findingsClassificationStore", Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
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
    setClassificationChoicesFromLookup: (lookupFindings: Finding[]) => void;
}, "error" | "loading" | "findings">, Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
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
    setClassificationChoicesFromLookup: (lookupFindings: Finding[]) => void;
}, "getAllFindings">, Pick<{
    findings: Readonly<import("vue").Ref<{
        readonly [x: number]: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
        };
    }, {
        readonly [x: number]: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly location_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
            readonly morphology_classifications?: readonly {
                readonly id: number;
                readonly name: string;
                readonly description: string;
                readonly choices: readonly {
                    readonly id: number;
                    readonly name: string;
                    readonly description: string;
                    readonly subcategories: {
                        readonly [x: string]: any;
                    };
                    readonly numerical_descriptors: {
                        readonly [x: string]: any;
                    };
                }[];
                readonly classification_types: readonly number[];
            }[] | undefined;
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
    setClassificationChoicesFromLookup: (lookupFindings: Finding[]) => void;
}, "getFindingById" | "getClassificationsForFinding" | "clearFindings" | "setError" | "setLoading" | "setClassificationChoicesFromLookup">>;
