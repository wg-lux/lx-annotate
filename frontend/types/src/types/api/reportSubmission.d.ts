export type ReportSubmissionStatus = 'draft' | 'final';
export type ReportSubmissionPatientData = {
    patientBirthDate?: string | null;
    patientGender?: string | number | null;
    firstName?: string | null;
    lastName?: string | null;
    center?: string | number | null;
};
export type ReportSubmissionIndication = {
    examinationIndicationId?: number;
    indicationChoiceId?: number | null;
};
export type ReportSubmissionFindingClassification = {
    classification: number | string;
    classificationChoice: number | string;
};
export type ReportSubmissionFindingIntervention = {
    intervention?: number | string;
    state?: string | null;
    date?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
};
export type ReportSubmissionFinding = {
    finding: number | string;
    classifications: ReportSubmissionFindingClassification[];
    interventions: ReportSubmissionFindingIntervention[];
};
export type SaveReportSubmissionRequest = {
    reportId?: number;
    patientExaminationId: number;
    templateName: string;
    status: ReportSubmissionStatus;
    editorPayload: Record<string, unknown>;
    renderedText: string;
    patientData: ReportSubmissionPatientData;
    indications: ReportSubmissionIndication[];
    findings: ReportSubmissionFinding[];
    expectedVersion?: number;
};
export type SaveReportSubmissionResponse = {
    report: {
        id: number;
        status: string;
        version: number;
    };
    created: boolean;
    warnings: string[];
    historyContext: Record<string, unknown> | null;
    persistedReportArtifactId?: number | null;
    persistedPdfArtifactId?: number | null;
    persistedArtifacts: {
        fullReportId?: number | null;
        pdfId?: number | null;
        pdfViewUrl?: string | null;
        pdfDownloadUrl?: string | null;
        patientTimelineUrl?: string | null;
    } | null;
};
