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

const pathId = (id: Id): string => String(id)

export const endpoints = {
  auth: {
    bootstrap: 'auth/bootstrap',
    publicHome: 'endoreg_db/',
    login: 'login/',
    loginCallback: 'login/callback/',
    conf: 'conf/'
  },

  patient: {
    patients: 'patients/',
    patientById: (id: Id) => `patients/${pathId(id)}/`,
    patientMedicalLedger: (id: Id) => `patients/${pathId(id)}/medical-ledger/`,
    patientMedications: (id: Id) => `patients/${pathId(id)}/medications/`,
    patientMedicationById: (id: Id, medicationId: Id) =>
      `patients/${pathId(id)}/medications/${pathId(medicationId)}/`,
    patientMedicationSchedules: (id: Id) => `patients/${pathId(id)}/medication-schedules/`,
    patientMedicationScheduleById: (id: Id, scheduleId: Id) =>
      `patients/${pathId(id)}/medication-schedules/${pathId(scheduleId)}/`,
    patientPseudonym: (id: Id) => `patients/${pathId(id)}/pseudonym/`,
    patientDeletionSafety: (id: Id) => `patients/${pathId(id)}/check_deletion_safety/`,
    centers: 'centers/',
    genders: 'genders/',
    checkPatientExaminationExists: (id: Id) => `check_pe_exist/${pathId(id)}/`
  },

  case: {
    cases: 'cases/',
    createWithExamination: 'cases/create-with-examination/',
    documents: (caseId: string) => `cases/${caseId}/documents/`,
    caseById: (caseId: UUID) => `cases/${caseId}/`
  },

  examination: {
    examinationsDropdown: 'patient-examinations/examinations_dropdown/',
    patientExaminationCreate: 'patient-examinations/create/',
    patientExaminationDetail: (id: Id) => `patient-examinations/${pathId(id)}/`,
    patientExaminationDraft: (id: Id) => `patient-examinations/${pathId(id)}/draft/`,
    patientExaminationList: 'patient-examinations/list/'
  },

  report: {
    patientExaminationReports: 'patient-examination-reports/',
    patientExaminationReportById: (id: Id) => `patient-examination-reports/${pathId(id)}`,
    patientExaminationReportsByPatientExamination: (patientExaminationId: Id) =>
      `patient-examination-reports/?patient_examination_id=${pathId(patientExaminationId)}`,
    saveReportSubmission: 'patient-examination-reports/save-submission',
    makeReport: 'patient-examination-reports/make-report',
    segmentFrameSelectorBase: 'patient-examination-reports/segment-frame-selector',
    segmentFrameSelector: (patientExaminationId: Id, reportId?: Id) =>
      reportId == null
        ? `patient-examination-reports/segment-frame-selector?patient_examination_id=${pathId(patientExaminationId)}`
        : `patient-examination-reports/segment-frame-selector?patient_examination_id=${pathId(patientExaminationId)}&report_id=${pathId(reportId)}`,
    reportHistoryContext: (patientExaminationId: Id, limit?: number) =>
      limit == null
        ? `patient-examination-reports/history-context?patient_examination_id=${pathId(patientExaminationId)}`
        : `patient-examination-reports/history-context?patient_examination_id=${pathId(patientExaminationId)}&limit=${pathId(limit)}`
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
    offloadEligibleVideos: 'hub-export/offload-eligible-videos/',
    retry: (jobId: UUID) => `hub-export/jobs/${pathId(jobId)}/retry/`,
    unmark: 'hub-export/unmark/'
  },

  administration: {
    overview: 'administration/overview/',
    storageActions: 'administration/storage-balancing/actions/',
    storagePlacementPreview: 'administration/storage-balancing/placement-preview/',
    storageWorkCancellation: (workItemId: UUID) =>
      `administration/storage-balancing/work-items/${pathId(workItemId)}/cancel/`,
    storageOperatorControls: 'administration/storage-balancing/operator-controls/',
    centerScopes: 'administration/center-scopes/',
    centerScope: (userId: Id) => `administration/center-scopes/${pathId(userId)}/`
  },

  runtime: {
    quarantine: 'runtime/quarantine/'
  },

  anonymization: {
    itemsOverview: 'anonymization/items/overview/',
    retryUploadJob: (jobId: UUID) => `anonymization/upload-jobs/${jobId}/retry/`,
    documentTypesDropdown: 'anonymization/document-types/dropdown/',
    current: (fileId: Id) => `anonymization/${pathId(fileId)}/current/`,
    start: (fileId: Id) => `anonymization/${pathId(fileId)}/start/`,
    status: (fileId: Id) => `anonymization/${pathId(fileId)}/status/`,
    validate: (fileId: Id) => `anonymization/${pathId(fileId)}/validate/`,
    pollingInfo: 'anonymization/polling-info/',
    clearLocks: 'anonymization/clear-locks/',
    hasRaw: (fileId: Id) => `anonymization/${pathId(fileId)}/has-raw/`
  },

  mediaManagement: {
    status: 'media-management/status/',
    cleanup: 'media-management/cleanup/',
    forceRemove: (fileId: Id) => `media-management/force-remove/${pathId(fileId)}/`,
    resetStatus: (fileId: Id) => `media-management/reset-status/${pathId(fileId)}/`
  },

  media: {
    patientTimeline: (patientId: Id) => `media/patients/${pathId(patientId)}/timeline/`,
    sensitiveMediaId: (pk: Id, mediaType: string) =>
      `media/sensitive-media-id/${pathId(pk)}/${mediaType}/`,

    videos: 'media/videos/',
    videoDetail: (pk: Id) => `media/videos/${pathId(pk)}/details/`,
    videoStream: (pk: Id) => `media/videos/${pathId(pk)}/stream/`,
    videoHlsPlaylist: (pk: Id) => `media/videos/${pathId(pk)}/hls/playlist/`,
    videoReimport: (pk: Id) => `media/videos/${pathId(pk)}/reimport/`,
    videoMarkReadyForExport: (pk: Id) => `media/videos/${pathId(pk)}/mark-ready-for-export/`,
    exportAnnotated: 'media/videos/export-annotated/',

    videoCorrection: (pk: Id) => `media/videos/video-correction/${pathId(pk)}`,
    videoCorrectionAnonymization: (pk: Id) =>
      `media/videos/video-correction/${pathId(pk)}/anonymization/`,
    videoMetadata: (pk: Id) => `media/videos/${pathId(pk)}/metadata/`,
    videoProcessingHistory: (pk: Id) => `media/videos/${pathId(pk)}/processing-history/`,
    videoFps: (pk: Id) => `media/videos/${pathId(pk)}/fps/`,
    videoFrameNeighborhood: (pk: Id) => `media/videos/${pathId(pk)}/timeline/frame-neighborhood/`,
    videoSegmentsNormalizeFps: (pk: Id) => `media/videos/${pathId(pk)}/segments/normalize-fps/`,
    videoApplyMask: (pk: Id) => `media/videos/${pathId(pk)}/apply-mask/`,
    videoRemoveFrames: (pk: Id) => `media/videos/${pathId(pk)}/remove-frames/`,
    videoLabelsList: 'media/videos/labels/list/',
    videoLabelSetsList: 'media/videos/label-sets/list/',
    videoPredictionModelsList: 'media/videos/prediction-models/list/',

    segmentsStats: 'media/videos/segments/stats/',
    videoSegments: (pk: Id) => `media/videos/${pathId(pk)}/segments/`,
    videoSegmentsBulkMutation: (pk: Id) => `media/videos/${pathId(pk)}/segments/bulk/`,
    videoSegmentDetail: (pk: Id, segmentId: Id) =>
      `media/videos/${pathId(pk)}/segments/${pathId(segmentId)}/`,
    videoSegmentsImportPredictions: (pk: Id) =>
      `media/videos/${pathId(pk)}/segments/import-predictions/`,
    videoSegmentsRerunPredictions: (pk: Id) =>
      `media/videos/${pathId(pk)}/segments/rerun-predictions/`,
    videoSegmentValidate: (pk: Id, segmentId: Id) =>
      `media/videos/${pathId(pk)}/segments/${pathId(segmentId)}/validate/`,
    videoSegmentsValidateBulk: (pk: Id) => `media/videos/${pathId(pk)}/segments/validate-bulk/`,
    videoSegmentsValidationStatus: (pk: Id) =>
      `media/videos/${pathId(pk)}/segments/validation-status/`,
    videoSegmentsBlackenOutside: (pk: Id) => `media/videos/${pathId(pk)}/segments/blacken-outside/`,

    ensureSegmentAnnotationsForVideo: (pk: Id) =>
      `media/videos/${pathId(pk)}/ensure-segment-annotations/`,
    ensureSegmentAnnotationsBulk: 'media/videos/ensure-segment-annotations/',

    videoSensitiveMetadata: (pk: Id) => `media/videos/${pathId(pk)}/sensitive-metadata/`,
    videoSensitiveMetadataVerify: (pk: Id) =>
      `media/videos/${pathId(pk)}/sensitive-metadata/verify/`,
    videoCaseResolution: (pk: Id) => `media/videos/${pathId(pk)}/case-resolution/`,

    pdfSensitiveMetadata: (pk: Id) => `media/pdfs/${pathId(pk)}/sensitive-metadata/`,
    pdfSensitiveMetadataVerify: (pk: Id) => `media/pdfs/${pathId(pk)}/sensitive-metadata/verify/`,
    pdfCaseResolution: (pk: Id) => `media/pdfs/${pathId(pk)}/case-resolution/`,
    sensitiveMetadataList: 'media/sensitive-metadata/',
    pdfSensitiveMetadataList: 'media/pdfs/sensitive-metadata/',
    anonymizationMetrics: 'media/anonymization/metrics/',

    pdfs: 'media/pdfs/',
    pdfDetail: (pk: Id) => `media/pdfs/${pathId(pk)}/`,
    pdfStream: (pk: Id) => `media/pdfs/${pathId(pk)}/stream/`,
    pdfReimport: (pk: Id) => `media/pdfs/${pathId(pk)}/reimport/`
  }
} as const

export type ApiEndpoints = typeof endpoints
