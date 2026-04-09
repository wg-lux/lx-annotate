/**
 * Typed API endpoint contract for endoreg_db routes.
 *
 * Important:
 * - Paths are relative to axios `r()` helper (which prefixes `api/`).
 * - Keep trailing slashes exactly as defined in Django urls.
 */
export const endpoints = {
    auth: {
        bootstrap: 'auth/bootstrap',
        context: 'auth/context',
        publicHome: 'endoreg_db/',
        login: 'login/',
        loginCallback: 'login/callback/',
        conf: 'conf/'
    },
    router: {
        examinations: 'examinations/',
        examinationById: (id) => `examinations/${id}/`,
        findings: 'findings/',
        classifications: 'classifications/',
        patientFindings: 'patient-findings/',
        // Legacy placeholder kept for existing callers. Current endoreg_db exposes
        // create/list/detail under `examination.patientExamination*`.
        patientExaminations: 'patient-examinations/',
        patientExaminationReports: 'patient-examination-reports/'
    },
    patient: {
        patients: 'patients/',
        patientById: (id) => `patients/${id}/`,
        patientPseudonym: (id) => `patients/${id}/pseudonym/`,
        patientDeletionSafety: (id) => `patients/${id}/check_deletion_safety/`,
        centers: 'centers/',
        genders: 'genders/',
        patientFindings: 'patient-findings/',
        patientFindingById: (id) => `patient-findings/${id}/`,
        checkPatientExaminationExists: (id) => `check_pe_exist/${id}/`
    },
    examination: {
        examinationFindings: (examinationId) => `examinations/${examinationId}/findings/`,
        findingClassifications: (findingId) => `findings/${findingId}/classifications/`,
        classificationChoices: (classificationId) => `classifications/${classificationId}/choices/`,
        patientExaminationCreate: 'patient-examinations/create/',
        patientExaminationDetail: (id) => `patient-examinations/${id}/`,
        patientExaminationDraft: (id) => `patient-examinations/${id}/draft/`,
        patientExaminationList: 'patient-examinations/list/',
        patientExaminationClassifications: (examId) => `patient-examinations/${examId}/classifications/`,
        patientExaminationFindings: (examinationId) => `patient-examinations/${examinationId}/findings/`
    },
    report: {
        patientExaminationReports: 'patient-examination-reports/',
        patientExaminationReportById: (id) => `patient-examination-reports/${id}/`,
        patientExaminationReportsByPatientExamination: (patientExaminationId) => `patient-examination-reports/?patient_examination_id=${patientExaminationId}`,
        saveReportSubmission: 'patient-examination-reports/save-submission/',
        segmentFrameSelectorBase: 'patient-examination-reports/segment-frame-selector/',
        segmentFrameSelector: (patientExaminationId, reportId) => reportId == null
            ? `patient-examination-reports/segment-frame-selector/?patient_examination_id=${patientExaminationId}`
            : `patient-examination-reports/segment-frame-selector/?patient_examination_id=${patientExaminationId}&report_id=${reportId}`,
        reportHistoryContext: (patientExaminationId, limit) => limit == null
            ? `patient-examination-reports/history-context/?patient_examination_id=${patientExaminationId}`
            : `patient-examination-reports/history-context/?patient_examination_id=${patientExaminationId}&limit=${limit}`
    },
    annotation: {
        randomTask: 'media/annotations/frames/random-task/',
        bulkUpsert: 'media/annotations/frames/bulk-upsert/',
        skip: 'media/annotations/frames/skip/'
    },
    upload: {
        upload: 'upload/',
        uploadStatus: (id) => `upload/${id}/status/`
    },
    stats: {
        examinations: 'examinations/stats/',
        videoSegment: 'video-segment/stats/',
        videoSegments: 'video-segments/stats/',
        sensitiveMeta: 'video/sensitivemeta/stats/',
        general: 'stats/'
    },
    hubExport: {
        overview: 'hub-export/overview/',
        mark: 'hub-export/mark/',
        unmark: 'hub-export/unmark/'
    },
    anonymization: {
        itemsOverview: 'anonymization/items/overview/',
        documentTypesDropdown: 'anonymization/document-types/dropdown/',
        current: (fileId) => `anonymization/${fileId}/current/`,
        start: (fileId) => `anonymization/${fileId}/start/`,
        status: (fileId) => `anonymization/${fileId}/status/`,
        validate: (fileId) => `anonymization/${fileId}/validate/`,
        pollingInfo: 'anonymization/polling-info/',
        clearLocks: 'anonymization/clear-locks/',
        hasRaw: (fileId) => `anonymization/${fileId}/has-raw/`
    },
    mediaManagement: {
        status: 'media-management/status/',
        cleanup: 'media-management/cleanup/',
        forceRemove: (fileId) => `media-management/force-remove/${fileId}/`,
        resetStatus: (fileId) => `media-management/reset-status/${fileId}/`
    },
    media: {
        patientTimeline: (patientId) => `media/patients/${patientId}/timeline/`,
        sensitiveMediaId: (pk, mediaType) => `media/sensitive-media-id/${pk}/${mediaType}/`,
        videos: 'media/videos/',
        videoDetail: (pk) => `media/videos/${pk}/details/`,
        videoStream: (pk) => `media/videos/${pk}/stream/`,
        videoReimport: (pk) => `media/videos/${pk}/reimport/`,
        exportAnnotated: 'media/videos/export-annotated/',
        videoCorrection: (pk) => `media/videos/video-correction/${pk}`,
        videoMetadata: (pk) => `media/videos/${pk}/metadata/`,
        videoFps: (pk) => `media/videos/${pk}/fps/`,
        videoApplyMask: (pk) => `media/videos/${pk}/apply-mask/`,
        videoRemoveFrames: (pk) => `media/videos/${pk}/remove-frames/`,
        videoLabelsList: 'media/videos/labels/list/',
        segmentsCollection: 'media/videos/segments/',
        segmentsStats: 'media/videos/segments/stats/',
        videoSegments: (pk) => `media/videos/${pk}/segments/`,
        videoSegmentDetail: (pk, segmentId) => `media/videos/${pk}/segments/${segmentId}/`,
        videoSegmentValidate: (pk, segmentId) => `media/videos/${pk}/segments/${segmentId}/validate/`,
        videoSegmentsValidateBulk: (pk) => `media/videos/${pk}/segments/validate-bulk/`,
        videoSegmentsValidationStatus: (pk) => `media/videos/${pk}/segments/validation-status/`,
        ensureSegmentAnnotationsForVideo: (pk) => `media/videos/${pk}/ensure-segment-annotations/`,
        ensureSegmentAnnotationsBulk: 'media/videos/ensure-segment-annotations/',
        videoSensitiveMetadata: (pk) => `media/videos/${pk}/sensitive-metadata/`,
        videoSensitiveMetadataVerify: (pk) => `media/videos/${pk}/sensitive-metadata/verify/`,
        videoCaseResolution: (pk) => `media/videos/${pk}/case-resolution/`,
        pdfSensitiveMetadata: (pk) => `media/pdfs/${pk}/sensitive-metadata/`,
        pdfSensitiveMetadataVerify: (pk) => `media/pdfs/${pk}/sensitive-metadata/verify/`,
        pdfCaseResolution: (pk) => `media/pdfs/${pk}/case-resolution/`,
        sensitiveMetadataList: 'media/sensitive-metadata/',
        pdfSensitiveMetadataList: 'media/pdfs/sensitive-metadata/',
        pdfs: 'media/pdfs/',
        pdfDetail: (pk) => `media/pdfs/${pk}/`,
        pdfStream: (pk) => `media/pdfs/${pk}/stream/`,
        pdfReimport: (pk) => `media/pdfs/${pk}/reimport/`
    }
};
