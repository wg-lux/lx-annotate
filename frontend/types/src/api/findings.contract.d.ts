import type { ClassificationChoiceCore, ClassificationCore, FindingCore } from '@/types/coreConcepts';
export type JsonMap = Record<string, unknown>;
export interface FindingChoiceDto {
    id: number;
    name: string;
    description?: string | null;
    name_de?: string;
    subcategories?: JsonMap;
    numerical_descriptors?: JsonMap;
}
export interface FindingClassificationDto {
    id: number;
    name: string;
    description?: string | null;
    name_de?: string;
    required?: boolean;
    classification_types: string[];
    choices: FindingChoiceDto[];
}
export interface FindingDto {
    id: number;
    name: string;
    description?: string | null;
    name_de?: string;
    classifications: FindingClassificationDto[];
    location_classifications: FindingClassificationDto[];
    morphology_classifications: FindingClassificationDto[];
    FindingClassifications?: FindingClassificationDto[];
    finding_types?: string[];
    finding_interventions?: string[];
    examinations?: string[];
    patient_examination_id?: number;
}
export interface PatientFindingClassificationDto {
    id: number;
    classification: number;
    classification_choice: number;
    classification_name?: string;
    classification_choice_name?: string;
    subcategories: JsonMap;
    numerical_descriptors: JsonMap;
    is_active: boolean;
}
export interface PatientFindingDto {
    id: number;
    patient_examination: number;
    finding: number | {
        id: number;
    };
    is_active: boolean;
    created_at?: string | null;
    updated_at?: string | null;
    classifications: PatientFindingClassificationDto[];
}
export interface FindingChoice extends Pick<ClassificationChoiceCore, 'name'> {
    id: number;
    description?: string;
    nameDe?: string;
    subcategories: JsonMap;
    numericalDescriptors: JsonMap;
}
export interface FindingClassification extends Partial<Pick<ClassificationCore, 'name' | 'description'>> {
    id: number;
    name: string;
    description?: string;
    nameDe?: string;
    required: boolean;
    classificationTypes: string[];
    choices: FindingChoice[];
}
export interface Finding extends Pick<FindingCore, 'name'> {
    id: number;
    description: string;
    nameDe?: string;
    examinations: string[];
    patientExaminationId?: number;
    classifications: FindingClassification[];
    locationClassifications: FindingClassification[];
    morphologyClassifications: FindingClassification[];
    FindingClassifications: FindingClassification[];
    findingTypes: FindingCore['findingTypes'];
    findingInterventions: FindingCore['interventions'];
}
export interface PatientFindingClassification {
    id: number;
    classification: number;
    classificationChoice: number;
    classificationName?: string;
    classificationChoiceName?: string;
    subcategories: JsonMap;
    numericalDescriptors: JsonMap;
    isActive: boolean;
}
export interface PatientFindingIntervention {
    intervention?: number;
    interventionId?: number;
    state?: string | null;
    date?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
}
export interface PatientFindingRow {
    id: number;
    patientExamination: number;
    finding: number | {
        id: number;
    };
    isActive: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    classifications: PatientFindingClassification[];
    interventions?: Array<number | PatientFindingIntervention>;
}
export interface ClassificationSelection {
    classification: number;
    choice: number;
}
export declare const normalizeFindingChoice: (input: unknown) => FindingChoice;
export declare const normalizeFindingClassification: (input: unknown) => FindingClassification;
export declare const mergeFindingClassifications: (finding: Partial<Finding> | null | undefined) => FindingClassification[];
export declare const normalizeFinding: (input: unknown) => Finding;
export declare const normalizeFindings: (input: unknown) => Finding[];
export declare const normalizePatientFindingClassification: (input: unknown) => PatientFindingClassification;
export declare const normalizePatientFindingRow: (input: unknown) => PatientFindingRow;
export declare const normalizePatientFindingRows: (input: unknown) => PatientFindingRow[];
export declare const getFindingDisplayName: (finding: Pick<Finding, 'name' | 'nameDe' | 'id'> | null | undefined) => string;
export declare const getClassificationDisplayName: (classification: Pick<FindingClassification, 'name' | 'nameDe'> | null | undefined) => string;
export declare const extractFindingId: (value: unknown) => number | null;
