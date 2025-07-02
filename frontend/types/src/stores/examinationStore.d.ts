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
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
    morphologyClassifications: import("vue").Ref<{
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
    fetchMorphologyClassifications: () => Promise<void>;
}, "loading" | "error" | "morphologyClassifications" | "categoriesByExam">>, Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
    morphologyClassifications: import("vue").Ref<{
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
    fetchMorphologyClassifications: () => Promise<void>;
}, never>, Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
    morphologyClassifications: import("vue").Ref<{
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
    fetchMorphologyClassifications: () => Promise<void>;
}, "fetchSubcategoriesForExam" | "getCategories" | "fetchMorphologyClassifications">>;
