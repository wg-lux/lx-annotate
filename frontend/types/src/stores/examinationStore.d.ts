import type { Finding, FindingClassification } from '@/api/findings.contract';
import type { ClassificationChoiceCore, ExaminationCore } from '@/types/coreConcepts';
export interface Examination extends Pick<ExaminationCore, 'name'> {
    id: number;
    nameDe?: string;
    nameEn?: string;
    name_de?: string;
    name_en?: string;
    displayName?: string;
}
export interface LocationClassificationChoice extends Pick<ClassificationChoiceCore, 'name'> {
    id: number;
    nameDe?: string;
    name_de?: string;
}
export interface MorphologyClassificationChoice extends Pick<ClassificationChoiceCore, 'name'> {
    id: number;
    nameDe?: string;
    name_de?: string;
}
export type LocationClassification = FindingClassification;
export type MorphologyClassification = FindingClassification;
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
            nameDe?: string | undefined;
            nameEn?: string | undefined;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
            name: string;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
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
            nameDe?: string | undefined;
            nameEn?: string | undefined;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
            name: string;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
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
            nameDe?: string | undefined;
            nameEn?: string | undefined;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
            name: string;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
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
            nameDe?: string | undefined;
            nameEn?: string | undefined;
            name_de?: string | undefined;
            name_en?: string | undefined;
            displayName?: string | undefined;
            name: string;
        }[];
        selectedExaminationId: number | null;
        findingsByExam: Map<number, {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            patientExaminationId?: number | undefined;
            classifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            FindingClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        }[]> & Omit<Map<number, Finding[]>, keyof Map<any, any>>;
        classificationsByFinding: Map<number, {
            locationClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
            }[];
            morphologyClassifications: {
                id: number;
                name: string;
                description?: string | undefined;
                nameDe?: string | undefined;
                required: boolean;
                classificationTypes: string[];
                choices: {
                    id: number;
                    description?: string | undefined;
                    nameDe?: string | undefined;
                    subcategories: import("@/api/findings.contract").JsonMap;
                    numericalDescriptors: import("@/api/findings.contract").JsonMap;
                    name: string;
                }[];
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
