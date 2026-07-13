/**
 * Typed API endpoint contract for endoreg_db and lx-annotate local routes.
 *
 * Important:
 * - Paths are relative to axios `endoregApi()` or legacy `r()` helper.
 * - lx_dtypes routes use the separate `dtypesApi()` helper.
 * - Keep trailing slashes exactly as defined in Django urls.
 */

export type Id = number | string
export type UUID = string

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
    examinationById: (id: Id) => `examinations/${id}/`,
    findings: 'findings/',
    classifications: 'classifications/',
    patientFindings: 'patient-findings/',
    patientExaminationReports: 'patient-examination-reports/'
  },

  patient: {
    patients: 'patients/',
    patientById: (id: Id) => `patients/${id}/`,
    patientPseudonym: (id: Id) => `patients/${id}/pseudonym/`,
    patientDeletionSafety: (id: Id) => `patients/${id}/check_deletion_safety/`,
    centers: 'centers/',
    genders: 'genders/',
    patientFindings: 'patient-findings/',
    patientFindingById: (id: Id) => `patient-findings/${id}/`,
    checkPatientExaminationExists: (id: Id) => `check_pe_exist/${id}/`
  },

  examination: {
    examinationsDropdown: 'patient-examinations/examinations_dropdown/',
    examinationFindings: (examinationId: Id) => `examinations/${examinationId}/findings/`,
    findingClassifications: (findingId: Id) => `findings/${findingId}/classifications/`,
    classificationChoices: (classificationId: Id) => `classifications/${classificationId}/choices/`,

    patientExaminationCreate: 'patient-examinations/create/',
    patientExaminationDetail: (id: Id) => `patient-examinations/${id}/`,
    patientExaminationDraft: (id: Id) => `patient-examinations/${id}/draft/`,
    patientExaminationList: 'patient-examinations/list/',
    patientExaminationLegacyDetail: (id: Id) => `get_patient_examination/${id}/`,
    patientExaminationClassifications: (examId: Id) =>
      `patient-examinations/${examId}/classifications/`,
    patientExaminationFindings: (examinationId: Id) =>
      `patient-examinations/${examinationId}/findings/`
  },

  report: {
    patientExaminationReports: 'patient-examination-reports/',
    patientExaminationReportById: (id: Id) => `patient-examination-reports/${id}/`,
    patientExaminationReportsByPatientExamination: (patientExaminationId: Id) =>
      `patient-examination-reports/?patient_examination_id=${patientExaminationId}`,
    saveReportSubmission: 'patient-examination-reports/save-submission/',
    makeReport: 'patient-examination-reports/make-report/',
    segmentFrameSelectorBase: 'patient-examination-reports/segment-frame-selector/',
    segmentFrameSelector: (patientExaminationId: Id, reportId?: Id) =>
      reportId == null
        ? `patient-examination-reports/segment-frame-selector/?patient_examination_id=${patientExaminationId}`
        : `patient-examination-reports/segment-frame-selector/?patient_examination_id=${patientExaminationId}&report_id=${reportId}`,
    reportHistoryContext: (patientExaminationId: Id, limit?: number) =>
      limit == null
        ? `patient-examination-reports/history-context/?patient_examination_id=${patientExaminationId}`
        : `patient-examination-reports/history-context/?patient_examination_id=${patientExaminationId}&limit=${limit}`
  },

  annotation: {
    randomTask: 'media/annotations/frames/random-task/',
    bulkUpsert: 'media/annotations/frames/bulk-upsert/',
    frameBoxes: 'media/annotations/frames/boxes/',
    skip: 'media/annotations/frames/skip/'
  },

  study: {
    cohortPreview: 'media/studies/cohort-preview/'
  },

  upload: {
    upload: 'upload/',
    uploadStatus: (id: UUID) => `upload/${id}/status/`
  },

  stats: {
    examinations: 'examinations/stats/',
    videoSegment: 'media/videos/segments/stats/',
    videoSegments: 'media/videos/segments/stats/',
    sensitiveMeta: 'media/sensitive-metadata/',
    general: 'stats/'
  },

  hubExport: {
    overview: 'hub-export/overview/',
    mark: 'hub-export/mark/',
    unmark: 'hub-export/unmark/'
  },

  runtime: {
    quarantine: 'runtime/quarantine/'
  },

  workflow: {
    saveWorkflowData: 'save-workflow-data/'
  },

  anonymization: {
    itemsOverview: 'anonymization/items/overview/',
    documentTypesDropdown: 'anonymization/document-types/dropdown/',
    current: (fileId: Id) => `anonymization/${fileId}/current/`,
    start: (fileId: Id) => `anonymization/${fileId}/start/`,
    status: (fileId: Id) => `anonymization/${fileId}/status/`,
    validate: (fileId: Id) => `anonymization/${fileId}/validate/`,
    pollingInfo: 'anonymization/polling-info/',
    clearLocks: 'anonymization/clear-locks/',
    hasRaw: (fileId: Id) => `anonymization/${fileId}/has-raw/`
  },

  mediaManagement: {
    status: 'media-management/status/',
    cleanup: 'media-management/cleanup/',
    forceRemove: (fileId: Id) => `media-management/force-remove/${fileId}/`,
    resetStatus: (fileId: Id) => `media-management/reset-status/${fileId}/`
  },

  media: {
    patientTimeline: (patientId: Id) => `media/patients/${patientId}/timeline/`,
    sensitiveMediaId: (pk: Id, mediaType: string) => `media/sensitive-media-id/${pk}/${mediaType}/`,

    videos: 'media/videos/',
    videoDetail: (pk: Id) => `media/videos/${pk}/details/`,
    videoStream: (pk: Id) => `media/videos/${pk}/stream/`,
    videoHlsPlaylist: (pk: Id) => `media/videos/${pk}/hls/playlist/`,
    videoReimport: (pk: Id) => `media/videos/${pk}/reimport/`,
    exportAnnotated: 'media/videos/export-annotated/',

    videoCorrection: (pk: Id) => `media/videos/video-correction/${pk}`,
    videoMetadata: (pk: Id) => `media/videos/${pk}/metadata/`,
    videoFps: (pk: Id) => `media/videos/${pk}/fps/`,
    videoApplyMask: (pk: Id) => `media/videos/${pk}/apply-mask/`,
    videoRemoveFrames: (pk: Id) => `media/videos/${pk}/remove-frames/`,
    videoLabelsList: 'media/videos/labels/list/',
    videoLabelSetsList: 'media/videos/label-sets/list/',
    videoPredictionModelsList: 'media/videos/prediction-models/list/',

    segmentsCollection: 'media/videos/segments/',
    segmentsStats: 'media/videos/segments/stats/',
    videoSegments: (pk: Id) => `media/videos/${pk}/segments/`,
    videoSegmentsBulkMutation: (pk: Id) => `media/videos/${pk}/segments/bulk/`,
    videoSegmentDetail: (pk: Id, segmentId: Id) => `media/videos/${pk}/segments/${segmentId}/`,
    videoSegmentsImportPredictions: (pk: Id) => `media/videos/${pk}/segments/import-predictions/`,
    videoSegmentsRerunPredictions: (pk: Id) => `media/videos/${pk}/segments/rerun-predictions/`,
    videoSegmentValidate: (pk: Id, segmentId: Id) =>
      `media/videos/${pk}/segments/${segmentId}/validate/`,
    videoSegmentsValidateBulk: (pk: Id) => `media/videos/${pk}/segments/validate-bulk/`,
    videoSegmentsValidationStatus: (pk: Id) => `media/videos/${pk}/segments/validation-status/`,
    videoSegmentsBlackenOutside: (pk: Id) => `media/videos/${pk}/segments/blacken-outside/`,

    ensureSegmentAnnotationsForVideo: (pk: Id) => `media/videos/${pk}/ensure-segment-annotations/`,
    ensureSegmentAnnotationsBulk: 'media/videos/ensure-segment-annotations/',

    videoSensitiveMetadata: (pk: Id) => `media/videos/${pk}/sensitive-metadata/`,
    videoSensitiveMetadataVerify: (pk: Id) => `media/videos/${pk}/sensitive-metadata/verify/`,
    videoCaseResolution: (pk: Id) => `media/videos/${pk}/case-resolution/`,

    pdfSensitiveMetadata: (pk: Id) => `media/pdfs/${pk}/sensitive-metadata/`,
    pdfSensitiveMetadataVerify: (pk: Id) => `media/pdfs/${pk}/sensitive-metadata/verify/`,
    pdfCaseResolution: (pk: Id) => `media/pdfs/${pk}/case-resolution/`,
    sensitiveMetadataList: 'media/sensitive-metadata/',
    pdfSensitiveMetadataList: 'media/pdfs/sensitive-metadata/',
    anonymizationMetrics: 'media/anonymization/metrics/',

    pdfs: 'media/pdfs/',
    pdfDetail: (pk: Id) => `media/pdfs/${pk}/`,
    pdfStream: (pk: Id) => `media/pdfs/${pk}/stream/`,
    pdfReimport: (pk: Id) => `media/pdfs/${pk}/reimport/`,
    processedVideoDownload: (videoId: Id, historyId: Id) =>
      `media/processed-videos/${videoId}/${historyId}/`
  }
} as const

export type ApiEndpoints = typeof endpoints
