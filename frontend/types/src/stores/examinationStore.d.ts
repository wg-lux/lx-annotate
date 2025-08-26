export interface Examination {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    display_name?: string;
}
export interface Finding {
    id: number;
    name: string;
    name_de?: string;
}
export interface LocationClassificationChoice {
    id: number;
    name: string;
    name_de?: string;
}
export interface MorphologyClassificationChoice {
    id: number;
    name: string;
    name_de?: string;
}
export interface LocationClassification {
    id: number;
    name: string;
    name_de?: string;
    choices: LocationClassificationChoice[];
    required?: boolean;
}
export interface MorphologyClassification {
    id: number;
    name: string;
    name_de?: string;
    choices: MorphologyClassificationChoice[];
    required?: boolean;
}
type ClassifPayload = {
    locationClassifications: LocationClassification[];
    morphologyClassifications: MorphologyClassification[];
};
export declare const useExaminationStore: import("pinia").StoreDefinition<"examination", {
    loading: boolean;
    error: string | null;
    exams: Examination[];
    selectedExaminationId: number | null;
    findingsByExam: Map<number, Finding[]>;
    classificationsByFinding: Map<number, ClassifPayload>;
}, {
    examinations(state: {
        loading: boolean;
        error: string | null;
        exams: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            display_name?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            name_de?: string | undefined;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
        }> & Omit<Map<number, ClassifPayload>, keyof Map<any, any>>;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        exams: Examination[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, Finding[]>;
        classificationsByFinding: Map<number, ClassifPayload>;
    }>): Examination[];
    examinationsDropdown(state: {
        loading: boolean;
        error: string | null;
        exams: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            display_name?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            name_de?: string | undefined;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
        }> & Omit<Map<number, ClassifPayload>, keyof Map<any, any>>;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        exams: Examination[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, Finding[]>;
        classificationsByFinding: Map<number, ClassifPayload>;
    }>): {
        id: number;
        name: string;
        display_name: string;
    }[];
    selectedExamination(state: {
        loading: boolean;
        error: string | null;
        exams: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            display_name?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            name_de?: string | undefined;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
        }> & Omit<Map<number, ClassifPayload>, keyof Map<any, any>>;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        exams: Examination[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, Finding[]>;
        classificationsByFinding: Map<number, ClassifPayload>;
    }>): Examination | null;
    availableFindings(state: {
        loading: boolean;
        error: string | null;
        exams: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            display_name?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            name_de?: string | undefined;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                name_de?: string | undefined;
                choices: {
                    id: number;
                    name: string;
                    name_de?: string | undefined;
                }[];
                required?: boolean | undefined;
            }[];
        }> & Omit<Map<number, ClassifPayload>, keyof Map<any, any>>;
    } & import("pinia").PiniaCustomStateProperties<{
        loading: boolean;
        error: string | null;
        exams: Examination[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, Finding[]>;
        classificationsByFinding: Map<number, ClassifPayload>;
    }>): Finding[];
}, {
    setSelectedExamination(id: number | null): void;
    /**
     * Load examinations list.
     * You have 2 viable endpoints in your project:
     *  - /api/examinations/  (generic list)
     *  - /api/patient-examinations/examinations_dropdown/ (already tailored for dropdown)
     *
     * Pick ONE. Below I show the dropdown endpoint because it already returns display_name.
     */
    fetchExaminations(): Promise<void>;
    /**
     * Findings for the selected exam.
     * Your URLs (from show_urls): /api/examinations/<int:examination_id>/findings/
     */
    loadFindingsForExamination(examId: number): Promise<Finding[]>;
    /**
     * Classifications for a finding
     * Your URLs: /api/findings/<int:finding_id>/classifications/
     * (You also have specific endpoints for location/morphology, but the combined one is easiest.)
     */
    loadFindingClassifications(findingId: number): Promise<ClassifPayload>;
}>;
export {};
