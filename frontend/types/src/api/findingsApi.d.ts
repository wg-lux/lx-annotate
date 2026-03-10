import { type ClassificationSelection, type Finding, type FindingChoice, type FindingClassification, type PatientFindingRow } from '@/api/findings.contract';
export type FindingsBackendMode = 'endoreg' | 'dtypes_read' | 'dtypes';
export type FindingsApiErrorCode = 'required-finding' | 'duplicate-finding' | 'invalid-choice' | 'invalid-finding' | 'bad-request' | 'not-found' | 'unknown';
export interface FindingsApiError {
    code: FindingsApiErrorCode;
    message: string;
    status?: number;
    details?: unknown;
}
export interface CreatePatientFindingPayload {
    patientExamination: number;
    finding: number;
    classifications?: ClassificationSelection[];
}
export interface UpdatePatientFindingPayload {
    finding?: number;
    isActive?: boolean;
    classifications?: ClassificationSelection[];
}
export declare function getFindingsBackendMode(): FindingsBackendMode;
export declare function parseFindingsApiError(error: any): FindingsApiError;
export declare const findingsApi: {
    getBackendMode(): FindingsBackendMode;
    listFindings(): Promise<Finding[]>;
    getExaminationFindings(examinationId: number): Promise<Finding[]>;
    getFindingClassifications(findingId: number): Promise<FindingClassification[]>;
    getClassificationChoices(classificationId: number): Promise<FindingChoice[]>;
    listPatientFindings(patientExaminationId: number): Promise<PatientFindingRow[]>;
    createPatientFinding(payload: CreatePatientFindingPayload): Promise<PatientFindingRow>;
    updatePatientFinding(patientFindingId: number, payload: UpdatePatientFindingPayload): Promise<PatientFindingRow>;
    deletePatientFinding(patientFindingId: number): Promise<void>;
    replacePatientFindingClassifications(patientFindingId: number, classifications: ClassificationSelection[]): Promise<PatientFindingRow | null>;
};
