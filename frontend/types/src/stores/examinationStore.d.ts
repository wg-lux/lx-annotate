export interface MedicalDomain {
    id: number;
    name: string;
    examinations: Examination[];
}
export interface Examination {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
    domainId?: number;
    applicableClassifications?: string[];
    optionalLocationClassifications?: LocationClassification[];
    requiredLocationClassifications?: LocationClassification[];
    optionalMorphologyClassifications?: MorphologyClassification[];
    requiredMorphologyClassifications?: MorphologyClassification[];
}
export interface LocationClassification {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
    choices: LocationClassificationChoice[];
}
export interface LocationClassificationChoice {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
    classificationId: number;
    subcategories?: Record<string, any>;
    numerical_descriptors?: Record<string, any>;
}
export interface MorphologyClassification {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
    choices: MorphologyClassificationChoice[];
}
export interface MorphologyClassificationChoice {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
    classificationId: number;
    subcategories?: Record<string, any>;
    numerical_descriptors?: Record<string, any>;
}
export interface Finding {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
    optionalLocationClassifications?: LocationClassification[];
    requiredLocationClassifications?: LocationClassification[];
    optionalMorphologyClassifications?: MorphologyClassification[];
    requiredMorphologyClassifications?: MorphologyClassification[];
}
export interface Intervention {
    id: number;
    name: string;
}
export interface PatientFindingData {
    findingId: number;
    selectedLocationChoices: number[];
    selectedMorphologyChoices: number[];
    timestamp?: number;
    videoId?: number;
    notes?: string;
}
export interface SubcategoryMap {
    locationClassifications: LocationClassification[];
    locationChoices: LocationClassificationChoice[];
    morphologyClassifications: MorphologyClassification[];
    morphologyChoices: MorphologyClassificationChoice[];
    findings: Finding[];
    interventions: Intervention[];
}
export interface Classification {
    id: number;
    name: string;
    type: 'morphology' | 'location' | 'intervention' | 'finding';
    applicableExaminations: number[];
    choices: ClassificationChoice[];
}
export interface ClassificationChoice {
    id: number;
    name: string;
    classificationId: number;
    validityRules?: {
        minSize?: number;
        organSystems?: string[];
        contraindications?: string[];
    };
}
export declare const useExaminationStore: import("pinia").StoreDefinition<"examination", import("pinia")._UnwrapAll<Pick<{
    examinations: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly domainId?: number | undefined;
        readonly applicableClassifications?: readonly string[] | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly domainId?: number | undefined;
        readonly applicableClassifications?: readonly string[] | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[]>>;
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[]>>;
    availableFindings: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    }[]>;
    locationClassifications: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[]>>;
    morphologyClassifications: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[]>>;
    selectedExaminationId: Readonly<import("vue").Ref<number | null, number | null>>;
    selectedFindingId: Readonly<import("vue").Ref<number | null, number | null>>;
    currentPatientFinding: Readonly<import("vue").Ref<{
        readonly findingId: number;
        readonly selectedLocationChoices: readonly number[];
        readonly selectedMorphologyChoices: readonly number[];
        readonly timestamp?: number | undefined;
        readonly videoId?: number | undefined;
        readonly notes?: string | undefined;
    } | null, {
        readonly findingId: number;
        readonly selectedLocationChoices: readonly number[];
        readonly selectedMorphologyChoices: readonly number[];
        readonly timestamp?: number | undefined;
        readonly videoId?: number | undefined;
        readonly notes?: string | undefined;
    } | null>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    selectedExamination: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        domainId?: number | undefined;
        applicableClassifications?: string[] | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    } | undefined>;
    selectedFinding: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    } | undefined>;
    availableLocationClassifications: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        choices: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            classificationId: number;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[];
    }[]>;
    availableMorphologyClassifications: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        choices: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            classificationId: number;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[];
    }[]>;
    loadExaminations: () => Promise<void>;
    loadExaminationFindings: (examinationId: number) => Promise<any>;
    loadFindingClassifications: (findingId: number) => Promise<{
        locationClassifications: any[];
        morphologyClassifications: any[];
    }>;
    loadFindings: () => Promise<void>;
    loadClassifications: () => Promise<void>;
    setSelectedExamination: (examinationId: number) => void;
    setSelectedFinding: (findingId: number) => void;
    updateLocationChoices: (choiceIds: number[]) => void;
    updateMorphologyChoices: (choiceIds: number[]) => void;
    updateNotes: (newNotes: string) => void;
    savePatientFinding: (videoId?: number, timestamp?: number, patientId?: number) => Promise<PatientFindingData | null>;
    resetForm: () => void;
    validateRequiredClassifications: () => string[];
    setPatientId: (newPatientId: number | null) => void;
    setError: (errorMessage: string) => void;
    loadFindingsForExamination: (examinationId: number) => Promise<any>;
}, "loading" | "error" | "examinations" | "findings" | "locationClassifications" | "morphologyClassifications" | "selectedExaminationId" | "selectedFindingId" | "currentPatientFinding">>, Pick<{
    examinations: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly domainId?: number | undefined;
        readonly applicableClassifications?: readonly string[] | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly domainId?: number | undefined;
        readonly applicableClassifications?: readonly string[] | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[]>>;
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[]>>;
    availableFindings: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    }[]>;
    locationClassifications: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[]>>;
    morphologyClassifications: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[]>>;
    selectedExaminationId: Readonly<import("vue").Ref<number | null, number | null>>;
    selectedFindingId: Readonly<import("vue").Ref<number | null, number | null>>;
    currentPatientFinding: Readonly<import("vue").Ref<{
        readonly findingId: number;
        readonly selectedLocationChoices: readonly number[];
        readonly selectedMorphologyChoices: readonly number[];
        readonly timestamp?: number | undefined;
        readonly videoId?: number | undefined;
        readonly notes?: string | undefined;
    } | null, {
        readonly findingId: number;
        readonly selectedLocationChoices: readonly number[];
        readonly selectedMorphologyChoices: readonly number[];
        readonly timestamp?: number | undefined;
        readonly videoId?: number | undefined;
        readonly notes?: string | undefined;
    } | null>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    selectedExamination: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        domainId?: number | undefined;
        applicableClassifications?: string[] | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    } | undefined>;
    selectedFinding: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    } | undefined>;
    availableLocationClassifications: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        choices: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            classificationId: number;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[];
    }[]>;
    availableMorphologyClassifications: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        choices: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            classificationId: number;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[];
    }[]>;
    loadExaminations: () => Promise<void>;
    loadExaminationFindings: (examinationId: number) => Promise<any>;
    loadFindingClassifications: (findingId: number) => Promise<{
        locationClassifications: any[];
        morphologyClassifications: any[];
    }>;
    loadFindings: () => Promise<void>;
    loadClassifications: () => Promise<void>;
    setSelectedExamination: (examinationId: number) => void;
    setSelectedFinding: (findingId: number) => void;
    updateLocationChoices: (choiceIds: number[]) => void;
    updateMorphologyChoices: (choiceIds: number[]) => void;
    updateNotes: (newNotes: string) => void;
    savePatientFinding: (videoId?: number, timestamp?: number, patientId?: number) => Promise<PatientFindingData | null>;
    resetForm: () => void;
    validateRequiredClassifications: () => string[];
    setPatientId: (newPatientId: number | null) => void;
    setError: (errorMessage: string) => void;
    loadFindingsForExamination: (examinationId: number) => Promise<any>;
}, "availableFindings" | "selectedExamination" | "selectedFinding" | "availableLocationClassifications" | "availableMorphologyClassifications">, Pick<{
    examinations: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly domainId?: number | undefined;
        readonly applicableClassifications?: readonly string[] | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly domainId?: number | undefined;
        readonly applicableClassifications?: readonly string[] | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[]>>;
    findings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly optionalLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredLocationClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly optionalMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
        readonly requiredMorphologyClassifications?: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly choices: readonly {
                readonly id: number;
                readonly name: string;
                readonly name_de?: string | undefined;
                readonly name_en?: string | undefined;
                readonly description?: string | undefined;
                readonly description_de?: string | undefined;
                readonly description_en?: string | undefined;
                readonly classificationId: number;
                readonly subcategories?: {
                    readonly [x: string]: any;
                } | undefined;
                readonly numerical_descriptors?: {
                    readonly [x: string]: any;
                } | undefined;
            }[];
        }[] | undefined;
    }[]>>;
    availableFindings: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    }[]>;
    locationClassifications: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[]>>;
    morphologyClassifications: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly name_de?: string | undefined;
        readonly name_en?: string | undefined;
        readonly description?: string | undefined;
        readonly description_de?: string | undefined;
        readonly description_en?: string | undefined;
        readonly choices: readonly {
            readonly id: number;
            readonly name: string;
            readonly name_de?: string | undefined;
            readonly name_en?: string | undefined;
            readonly description?: string | undefined;
            readonly description_de?: string | undefined;
            readonly description_en?: string | undefined;
            readonly classificationId: number;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[];
    }[]>>;
    selectedExaminationId: Readonly<import("vue").Ref<number | null, number | null>>;
    selectedFindingId: Readonly<import("vue").Ref<number | null, number | null>>;
    currentPatientFinding: Readonly<import("vue").Ref<{
        readonly findingId: number;
        readonly selectedLocationChoices: readonly number[];
        readonly selectedMorphologyChoices: readonly number[];
        readonly timestamp?: number | undefined;
        readonly videoId?: number | undefined;
        readonly notes?: string | undefined;
    } | null, {
        readonly findingId: number;
        readonly selectedLocationChoices: readonly number[];
        readonly selectedMorphologyChoices: readonly number[];
        readonly timestamp?: number | undefined;
        readonly videoId?: number | undefined;
        readonly notes?: string | undefined;
    } | null>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    selectedExamination: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        domainId?: number | undefined;
        applicableClassifications?: string[] | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    } | undefined>;
    selectedFinding: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        optionalLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredLocationClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        optionalMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
        requiredMorphologyClassifications?: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            choices: {
                id: number;
                name: string;
                name_de?: string | undefined;
                name_en?: string | undefined;
                description?: string | undefined;
                description_de?: string | undefined;
                description_en?: string | undefined;
                classificationId: number;
                subcategories?: Record<string, any> | undefined;
                numerical_descriptors?: Record<string, any> | undefined;
            }[];
        }[] | undefined;
    } | undefined>;
    availableLocationClassifications: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        choices: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            classificationId: number;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[];
    }[]>;
    availableMorphologyClassifications: import("vue").ComputedRef<{
        id: number;
        name: string;
        name_de?: string | undefined;
        name_en?: string | undefined;
        description?: string | undefined;
        description_de?: string | undefined;
        description_en?: string | undefined;
        choices: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            description?: string | undefined;
            description_de?: string | undefined;
            description_en?: string | undefined;
            classificationId: number;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[];
    }[]>;
    loadExaminations: () => Promise<void>;
    loadExaminationFindings: (examinationId: number) => Promise<any>;
    loadFindingClassifications: (findingId: number) => Promise<{
        locationClassifications: any[];
        morphologyClassifications: any[];
    }>;
    loadFindings: () => Promise<void>;
    loadClassifications: () => Promise<void>;
    setSelectedExamination: (examinationId: number) => void;
    setSelectedFinding: (findingId: number) => void;
    updateLocationChoices: (choiceIds: number[]) => void;
    updateMorphologyChoices: (choiceIds: number[]) => void;
    updateNotes: (newNotes: string) => void;
    savePatientFinding: (videoId?: number, timestamp?: number, patientId?: number) => Promise<PatientFindingData | null>;
    resetForm: () => void;
    validateRequiredClassifications: () => string[];
    setPatientId: (newPatientId: number | null) => void;
    setError: (errorMessage: string) => void;
    loadFindingsForExamination: (examinationId: number) => Promise<any>;
}, "loadExaminations" | "loadFindings" | "loadExaminationFindings" | "loadFindingClassifications" | "loadClassifications" | "setSelectedExamination" | "setSelectedFinding" | "updateLocationChoices" | "updateMorphologyChoices" | "updateNotes" | "savePatientFinding" | "resetForm" | "validateRequiredClassifications" | "setPatientId" | "setError" | "loadFindingsForExamination">>;
