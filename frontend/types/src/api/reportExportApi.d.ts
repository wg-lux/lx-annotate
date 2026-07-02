export type ReportExportPatientIdentity = {
    firstName: string;
    lastName: string;
    dob: string;
};
export type MakeReportRequest = {
    patientExaminationId: number;
    reportId?: number | null;
    patient: ReportExportPatientIdentity;
    maxFrames?: number;
};
export type PersistedReportArtifacts = {
    fullReportId?: number | null;
    pdfId?: number | null;
    pdfViewUrl?: string | null;
    pdfDownloadUrl?: string | null;
    patientTimelineUrl?: string | null;
};
export type IncludedReportFrame = {
    segmentId: number;
    videoId: number;
    frameId: number;
    frameNumber: number;
    labelName?: string | null;
    findingName?: string | null;
    streamUrl?: string | null;
    caption?: string | null;
};
export type MakeReportResponse = {
    report: {
        id: number;
        status?: string | null;
        version?: number | null;
    };
    warnings?: string[];
    includedFrameCount: number;
    includedFrames?: IncludedReportFrame[];
    persistedReportArtifactId?: number | null;
    persistedPdfArtifactId?: number | null;
    persistedArtifacts?: PersistedReportArtifacts | null;
};
export declare function makeReport(payload: MakeReportRequest): Promise<MakeReportResponse>;
