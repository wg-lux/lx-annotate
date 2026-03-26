/**
 * Typed API endpoint contract for endoreg_db routes.
 *
 * Important:
 * - Paths are relative to axios `r()` helper (which prefixes `api/`).
 * - Keep trailing slashes exactly as defined in Django urls.
 */
export type Id = number | string;
export type UUID = string;
export declare const endpoints: {
    readonly auth: {
        readonly bootstrap: "auth/bootstrap";
        readonly publicHome: "endoreg_db/";
        readonly login: "login/";
        readonly loginCallback: "login/callback/";
        readonly conf: "conf/";
    };
    readonly router: {
        readonly examinations: "examinations/";
        readonly findings: "findings/";
        readonly classifications: "classifications/";
        readonly patientFindings: "patient-findings/";
        readonly patientExaminations: "patient-examinations/";
        readonly patientExaminationReports: "patient-examination-reports/";
    };
    readonly patient: {
        readonly patients: "patients/";
        readonly patientById: (id: Id) => string;
        readonly patientPseudonym: (id: Id) => string;
        readonly centers: "centers/";
        readonly genders: "genders/";
        readonly patientFindings: "patient-findings/";
        readonly checkPatientExaminationExists: (id: Id) => string;
    };
    readonly examination: {
        readonly examinationFindings: (examinationId: Id) => string;
        readonly findingClassifications: (findingId: Id) => string;
        readonly classificationChoices: (classificationId: Id) => string;
        readonly patientExaminationCreate: "patient-examinations/create/";
        readonly patientExaminationDetail: (id: Id) => string;
        readonly patientExaminationDraft: (id: Id) => string;
        readonly patientExaminationList: "patient-examinations/list/";
        readonly patientExaminationClassifications: (examId: Id) => string;
        readonly patientExaminationFindings: (examinationId: Id) => string;
    };
    readonly report: {
        readonly patientExaminationReports: "patient-examination-reports/";
        readonly patientExaminationReportById: (id: Id) => string;
        readonly patientExaminationReportsByPatientExamination: (patientExaminationId: Id) => string;
        readonly saveReportSubmission: "patient-examination-reports/save-submission/";
        readonly segmentFrameSelectorBase: "patient-examination-reports/segment-frame-selector/";
        readonly segmentFrameSelector: (patientExaminationId: Id, reportId?: Id) => string;
        readonly reportHistoryContext: (patientExaminationId: Id, limit?: number) => string;
    };
    readonly annotation: {
        readonly randomTask: "media/annotations/frames/random-task/";
        readonly bulkUpsert: "media/annotations/frames/bulk-upsert/";
        readonly skip: "media/annotations/frames/skip/";
    };
    readonly upload: {
        readonly upload: "upload/";
        readonly uploadStatus: (id: UUID) => string;
    };
    readonly stats: {
        readonly examinations: "examinations/stats/";
        readonly videoSegment: "video-segment/stats/";
        readonly videoSegments: "video-segments/stats/";
        readonly sensitiveMeta: "video/sensitivemeta/stats/";
        readonly general: "stats/";
    };
    readonly anonymization: {
        readonly itemsOverview: "anonymization/items/overview/";
        readonly documentTypesDropdown: "anonymization/document-types/dropdown/";
        readonly current: (fileId: Id) => string;
        readonly start: (fileId: Id) => string;
        readonly status: (fileId: Id) => string;
        readonly validate: (fileId: Id) => string;
        readonly pollingInfo: "anonymization/polling-info/";
        readonly clearLocks: "anonymization/clear-locks/";
        readonly hasRaw: (fileId: Id) => string;
    };
    readonly mediaManagement: {
        readonly status: "media-management/status/";
        readonly cleanup: "media-management/cleanup/";
        readonly forceRemove: (fileId: Id) => string;
        readonly resetStatus: (fileId: Id) => string;
    };
    readonly media: {
        readonly patientTimeline: (patientId: Id) => string;
        readonly sensitiveMediaId: (pk: Id, mediaType: string) => string;
        readonly videos: "media/videos/";
        readonly videoDetailStream: (pk: Id) => string;
        readonly videoDetail: (pk: Id) => string;
        readonly videoStream: (pk: Id) => string;
        readonly videoReimport: (pk: Id) => string;
        readonly exportAnnotated: "media/videos/export-annotated/";
        readonly videoCorrection: (pk: Id) => string;
        readonly videoMetadata: (pk: Id) => string;
        readonly videoFps: (pk: Id) => string;
        readonly videoApplyMask: (pk: Id) => string;
        readonly videoRemoveFrames: (pk: Id) => string;
        readonly videoLabelsList: "media/videos/labels/list/";
        readonly segmentsCollection: "media/videos/segments/";
        readonly segmentsStats: "media/videos/segments/stats/";
        readonly videoSegments: (pk: Id) => string;
        readonly videoSegmentDetail: (pk: Id, segmentId: Id) => string;
        readonly videoSegmentValidate: (pk: Id, segmentId: Id) => string;
        readonly videoSegmentsValidateBulk: (pk: Id) => string;
        readonly videoSegmentsValidationStatus: (pk: Id) => string;
        readonly ensureSegmentAnnotationsForVideo: (pk: Id) => string;
        readonly ensureSegmentAnnotationsBulk: "media/videos/ensure-segment-annotations/";
        readonly videoSensitiveMetadata: (pk: Id) => string;
        readonly videoSensitiveMetadataVerify: (pk: Id) => string;
        readonly videoCaseResolution: (pk: Id) => string;
        readonly pdfSensitiveMetadata: (pk: Id) => string;
        readonly pdfSensitiveMetadataVerify: (pk: Id) => string;
        readonly pdfCaseResolution: (pk: Id) => string;
        readonly sensitiveMetadataList: "media/sensitive-metadata/";
        readonly pdfSensitiveMetadataList: "media/pdfs/sensitive-metadata/";
        readonly pdfs: "media/pdfs/";
        readonly pdfDetail: (pk: Id) => string;
        readonly pdfStream: (pk: Id) => string;
        readonly pdfReimport: (pk: Id) => string;
    };
};
export type ApiEndpoints = typeof endpoints;
