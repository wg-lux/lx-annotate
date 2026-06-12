/**
 * Typed API endpoint contract for endoreg_db and lx-annotate local routes.
 *
 * Important:
 * - Paths are relative to axios `endoregApi()` or legacy `r()` helper.
 * - lx_dtypes routes use the separate `dtypesApi()` helper.
 * - Keep trailing slashes exactly as defined in Django urls.
 */
export type Id = number | string;
export type UUID = string;
export declare const endpoints: {
    readonly auth: {
        readonly bootstrap: "auth/bootstrap";
        readonly context: "auth/context";
        readonly publicHome: "endoreg_db/";
        readonly login: "login/";
        readonly loginCallback: "login/callback/";
        readonly conf: "conf/";
    };
    readonly router: {
        readonly examinations: "examinations/";
        readonly examinationById: (id: Id) => string;
        readonly findings: "findings/";
        readonly classifications: "classifications/";
        readonly patientFindings: "patient-findings/";
        readonly patientExaminationReports: "patient-examination-reports/";
    };
    readonly patient: {
        readonly patients: "patients/";
        readonly patientById: (id: Id) => string;
        readonly patientPseudonym: (id: Id) => string;
        readonly patientDeletionSafety: (id: Id) => string;
        readonly centers: "centers/";
        readonly genders: "genders/";
        readonly patientFindings: "patient-findings/";
        readonly patientFindingById: (id: Id) => string;
        readonly checkPatientExaminationExists: (id: Id) => string;
    };
    readonly examination: {
        readonly examinationsDropdown: "patient-examinations/examinations_dropdown/";
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
        readonly makeReport: "patient-examination-reports/make-report/";
        readonly segmentFrameSelectorBase: "patient-examination-reports/segment-frame-selector/";
        readonly segmentFrameSelector: (patientExaminationId: Id, reportId?: Id) => string;
        readonly reportHistoryContext: (patientExaminationId: Id, limit?: number) => string;
    };
    readonly annotation: {
        readonly randomTask: "media/annotations/frames/random-task/";
        readonly bulkUpsert: "media/annotations/frames/bulk-upsert/";
        readonly frameBoxes: "media/annotations/frames/boxes/";
        readonly skip: "media/annotations/frames/skip/";
    };
    readonly upload: {
        readonly upload: "upload/";
        readonly uploadStatus: (id: UUID) => string;
    };
    readonly stats: {
        readonly examinations: "examinations/stats/";
        readonly videoSegment: "media/videos/segments/stats/";
        readonly videoSegments: "media/videos/segments/stats/";
        readonly sensitiveMeta: "media/sensitive-metadata/";
        readonly general: "stats/";
    };
    readonly hubExport: {
        readonly overview: "hub-export/overview/";
        readonly mark: "hub-export/mark/";
        readonly unmark: "hub-export/unmark/";
    };
    readonly runtime: {
        readonly quarantine: "runtime/quarantine/";
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
        readonly videoLabelSetsList: "media/videos/label-sets/list/";
        readonly videoPredictionModelsList: "media/videos/prediction-models/list/";
        readonly segmentsCollection: "media/videos/segments/";
        readonly segmentsStats: "media/videos/segments/stats/";
        readonly videoSegments: (pk: Id) => string;
        readonly videoSegmentsBulkMutation: (pk: Id) => string;
        readonly videoSegmentDetail: (pk: Id, segmentId: Id) => string;
        readonly videoSegmentsImportPredictions: (pk: Id) => string;
        readonly videoSegmentsRerunPredictions: (pk: Id) => string;
        readonly videoSegmentValidate: (pk: Id, segmentId: Id) => string;
        readonly videoSegmentsValidateBulk: (pk: Id) => string;
        readonly videoSegmentsValidationStatus: (pk: Id) => string;
        readonly videoSegmentsBlackenOutside: (pk: Id) => string;
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
        readonly anonymizationMetrics: "media/anonymization/metrics/";
        readonly pdfs: "media/pdfs/";
        readonly pdfDetail: (pk: Id) => string;
        readonly pdfStream: (pk: Id) => string;
        readonly pdfReimport: (pk: Id) => string;
    };
};
export type ApiEndpoints = typeof endpoints;
