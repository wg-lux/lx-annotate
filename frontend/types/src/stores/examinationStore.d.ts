export interface Examination {
    id: number;
    name: string;
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
export interface LocationClassificationChoice {
    id: number;
    name: string;
    classificationId: number;
}
export interface Intervention {
    id: number;
    name: string;
}
export interface Finding {
    id: number;
    name: string;
}
export interface SubcategoryMap {
    locationChoices: LocationClassificationChoice[];
    interventions: Intervention[];
    findings: Finding[];
}
export declare const useExaminationStore: import("pinia").StoreDefinition<"examination", import("pinia")._UnwrapAll<Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string, string>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
    morphologyClassifications: import("vue").Ref<{
        id: number;
        name: string;
    }[], MorphologyClassification[] | {
        id: number;
        name: string;
    }[]>;
    fetchMorphologyClassifications: () => Promise<void>;
    fetchLocationClassifications: (examId: number) => Promise<void>;
    fetchMorphologyChoices: (examId: number) => Promise<void>;
}, "loading" | "error" | "categoriesByExam" | "morphologyClassifications">>, Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string, string>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
    morphologyClassifications: import("vue").Ref<{
        id: number;
        name: string;
    }[], MorphologyClassification[] | {
        id: number;
        name: string;
    }[]>;
    fetchMorphologyClassifications: () => Promise<void>;
    fetchLocationClassifications: (examId: number) => Promise<void>;
    fetchMorphologyChoices: (examId: number) => Promise<void>;
}, never>, Pick<{
    categoriesByExam: Record<number, SubcategoryMap>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string, string>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
    morphologyClassifications: import("vue").Ref<{
        id: number;
        name: string;
    }[], MorphologyClassification[] | {
        id: number;
        name: string;
    }[]>;
    fetchMorphologyClassifications: () => Promise<void>;
    fetchLocationClassifications: (examId: number) => Promise<void>;
    fetchMorphologyChoices: (examId: number) => Promise<void>;
}, "fetchSubcategoriesForExam" | "getCategories" | "fetchMorphologyClassifications" | "fetchLocationClassifications" | "fetchMorphologyChoices">>;
