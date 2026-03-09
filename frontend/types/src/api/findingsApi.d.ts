export type FindingsBackendMode = 'endoreg' | 'dtypes_read' | 'dtypes';
export type FindingsApiErrorCode = 'required-finding' | 'duplicate-finding' | 'invalid-choice' | 'invalid-finding' | 'bad-request' | 'not-found' | 'unknown';
export interface FindingsApiError {
    code: FindingsApiErrorCode;
    message: string;
    status?: number;
    details?: unknown;
}
export interface ClassificationSelection {
    classification: number;
    choice: number;
}
export interface PatientFindingRow {
    id: number;
    patientExamination: number;
    finding: number | {
        id: number;
    };
    isActive?: boolean;
    classifications?: Array<number | {
        id?: number;
        classification?: number;
        classificationChoice?: number;
        classificationId?: number;
        classificationChoiceId?: number;
    }>;
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
    getExaminationFindings(examinationId: number): Promise<any[]>;
    getFindingClassifications(findingId: number): Promise<any[]>;
    getClassificationChoices(classificationId: number): Promise<any[]>;
    listPatientFindings(patientExaminationId: number): Promise<PatientFindingRow[]>;
    createPatientFinding(payload: CreatePatientFindingPayload): Promise<PatientFindingRow>;
    updatePatientFinding(patientFindingId: number, payload: UpdatePatientFindingPayload): Promise<PatientFindingRow>;
    deletePatientFinding(patientFindingId: number): Promise<void>;
    replacePatientFindingClassifications(patientFindingId: number, classifications: ClassificationSelection[]): Promise<PatientFindingRow | null>;
};
