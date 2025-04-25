export interface Examination {
    id: number;
    name: string;
}
export interface MorphologyClassificationChoice {
    id: number;
    name: string;
    classification: number;
}
export interface LocationClassificationChoice {
    id: number;
    name: string;
    classification: number;
}
export interface Intervention {
    id: number;
    name: string;
}
export interface Instrument {
    id: number;
    name: string;
}
export interface SubcategoryMap {
    morphologyChoices: MorphologyClassificationChoice[];
    locationChoices: LocationClassificationChoice[];
    interventions: Intervention[];
    instruments: Instrument[];
}
export declare const useExaminationStore: import("pinia").StoreDefinition<"examination", import("pinia")._UnwrapAll<Pick<{
    categoriesByExam: import("vue").Ref<Record<number, SubcategoryMap>, Record<number, SubcategoryMap>>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
}, "loading" | "error" | "categoriesByExam">>, Pick<{
    categoriesByExam: import("vue").Ref<Record<number, SubcategoryMap>, Record<number, SubcategoryMap>>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
}, never>, Pick<{
    categoriesByExam: import("vue").Ref<Record<number, SubcategoryMap>, Record<number, SubcategoryMap>>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    fetchSubcategoriesForExam: (examId: number) => Promise<void>;
    getCategories: (examId: number) => SubcategoryMap;
}, "fetchSubcategoriesForExam" | "getCategories">>;
