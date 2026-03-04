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
        publicHome: 'endoreg_db/',
        login: 'login/',
        loginCallback: 'login/callback/',
        conf: 'conf/'
    },
    router: {
        examinations: 'examinations/',
        findings: 'findings/',
        classifications: 'classifications/',
        patientFindings: 'patient-findings/',
        patientExaminations: 'patient-examinations/',
        patientExaminationReports: 'patient-examination-reports/'
    },
    patient: {
        patients: 'patients/',
        patientById: (id) => `patients/${id}/`,
        patientPseudonym: (id) => `patients/${id}/pseudonym/`,
        centers: 'centers/',
        genders: 'genders/',
        patientFindings: 'patient-findings/',
        checkPatientExaminationExists: (id) => `check_pe_exist/${id}/`
    },
    examination: {
        examinationFindings: (examinationId) => `examinations/${examinationId}/findings/`,
        findingClassifications: (findingId) => `findings/${findingId}/classifications/`,
        classificationChoices: (classificationId) => `classifications/${classificationId}/choices/`,
        patientExaminationCreate: 'patient-examinations/create/',
        patientExaminationDetail: (id) => `patient-examinations/${id}/`,
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
    requirements: {
        lookup: 'lookup/',
        lookupInit: 'lookup/init/',
        lookupAll: (token) => `lookup/${token}/all/`,
        lookupParts: (token, keys) => {
            if (!keys?.length)
                return `lookup/${token}/parts/`;
            return `lookup/${token}/parts/?keys=${encodeURIComponent(keys.join(','))}`;
        },
        lookupRecompute: (token) => `lookup/${token}/recompute/`,
        evaluateRequirements: 'evaluate-requirements/'
    },
    stats: {
        examinations: 'examinations/stats/',
        videoSegment: 'video-segment/stats/',
        videoSegments: 'video-segments/stats/',
        sensitiveMeta: 'video/sensitivemeta/stats/',
        general: 'stats/'
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
        videoDetailStream: (pk) => `media/videos/${pk}/`,
        videoDetail: (pk) => `media/videos/${pk}/details/`,
        videoStream: (pk) => `media/videos/${pk}/stream/`,
        videoReimport: (pk) => `media/videos/${pk}/reimport/`,
        exportAnnotated: 'media/videos/export-annotated/',
        videoCorrection: (pk) => `media/videos/video-correction/${pk}`,
        videoMetadata: (pk) => `media/videos/${pk}/metadata/`,
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
        pdfSensitiveMetadata: (pk) => `media/pdfs/${pk}/sensitive-metadata/`,
        pdfSensitiveMetadataVerify: (pk) => `media/pdfs/${pk}/sensitive-metadata/verify/`,
        sensitiveMetadataList: 'media/sensitive-metadata/',
        pdfSensitiveMetadataList: 'media/pdfs/sensitive-metadata/',
        pdfs: 'media/pdfs/',
        pdfDetail: (pk) => `media/pdfs/${pk}/`,
        pdfStream: (pk) => `media/pdfs/${pk}/stream/`,
        pdfReimport: (pk) => `media/pdfs/${pk}/reimport/`
    }
};
