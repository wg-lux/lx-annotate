import type { Finding } from '@/stores/findingStore';
export interface Examination {
    id: number;
    name: string;
    name_de?: string;
    name_en?: string;
    displayName?: string;
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
            displayName?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
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
            displayName?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
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
        displayName: string;
    }[];
    selectedExamination(state: {
        loading: boolean;
        error: string | null;
        exams: {
            id: number;
            name: string;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
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
            displayName?: string | undefined;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
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
     * We have 2 viable endpoints in your project:
     *  - /api/examinations/  (generic list)
     *  - /api/patient-examinations/examinations_dropdown/ (already tailored for dropdown)
     *
     * While patient Examinations will filter the examinations available for the patient, examinations query will return all available examinations.
     */
    fetchExaminations(): Promise<void>;
    /**
     * Findings for the selected exam.
     * URLs (from show_urls): /api/examinations/<int:examination_id>/findings/
     */
    loadFindingsForExamination(examId: number): Promise<Finding[]>;
    getCurrentExaminationId(): Promise<number | null>;
    /**
     * Classifications for a finding
     * Your URLs: /api/findings/<int:finding_id>/classifications/
     * (You also have specific endpoints for location/morphology, but the combined one is easiest.)
     */
    loadFindingClassifications(findingId: number): Promise<ClassifPayload>;
}>;
export {};
