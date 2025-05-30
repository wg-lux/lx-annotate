export interface MedicalDomain {
    id: number;
    name: string;
    examinations: Examination[];
}
export interface Examination {
    id: number;
    name: string;
    domainId?: number;
    applicableClassifications?: string[];
}
export interface LocationClassification {
    id: number;
    name: string;
}
export interface LocationClassificationChoice {
    id: number;
    name: string;
    classificationId: number;
}
export interface MorphologyClassification {
    id: number;
    name: string;
}
export interface MorphologyClassificationChoice {
    id: number;
    name: string;
    classificationId: number;
}
export interface Finding {
    id: number;
    name: string;
}
export interface Intervention {
    id: number;
    name: string;
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
    fetchLocationChoices: (examId: number, locationClassificationId: number) => Promise<void>;
    fetchMorphologyChoices: (examId: number, morphologyClassificationId: number) => Promise<void>;
    fetchInterventions: (examId: number, findingId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
}, "loading" | "error" | "categoriesByExam">>, Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    fetchLocationChoices: (examId: number, locationClassificationId: number) => Promise<void>;
    fetchMorphologyChoices: (examId: number, morphologyClassificationId: number) => Promise<void>;
    fetchInterventions: (examId: number, findingId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
}, never>, Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    fetchLocationChoices: (examId: number, locationClassificationId: number) => Promise<void>;
    fetchMorphologyChoices: (examId: number, morphologyClassificationId: number) => Promise<void>;
    fetchInterventions: (examId: number, findingId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
}, "fetchSubcategoriesForExam" | "fetchLocationChoices" | "fetchMorphologyChoices" | "fetchInterventions" | "getCategories">>;
