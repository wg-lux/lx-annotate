# API Reference

This page documents the frontend-facing API contract used by `lx-annotate`.
The canonical frontend endpoint map is
`frontend/src/types/api/endpoints.ts`.
When adding, renaming, or removing frontend API calls, update that file first
and keep this document in sync.

## Frontend Request Contract

`lx-annotate` exposes two API surfaces with different ownership. New code
should use the explicit mount names; the old names stay available as
compatibility aliases.

| Canonical mount | Compatibility alias | Backing package | Frontend usage |
| --- | --- | --- | --- |
| `/endoreg-api/` | `/api/` | `lx_annotate.api_urls`, including `endoreg_db.urls` plus `lx-annotate` local routes such as hub export and runtime quarantine | Main application API used by `frontend/src/types/api/endpoints.ts` through `endoregApi()` or legacy `r()` |
| `/dtypes-api/` | `/base_api/` | `lx_annotate.base_api_urls`, backed by `lx_dtypes.django.api.main` | Typed lookup, requirement, and report-template contracts sourced from `lx_dtypes`, called through `dtypesApi()` |

Do not document `dtypes-api/` routes as if they were `endoreg_db` routes. The
`endpoints.ts` contract below describes the main `/endoreg-api/` surface. The
`dtypes-api/` surface should be documented from `lx_dtypes` contracts,
especially `LookupState` and `LookupStateDataDict`, and called with
`dtypesApi()`.

The frontend should not hard-code mount prefixes into each endpoint. It imports
`endpoints` and passes endpoint values through `endoregApi()` or the legacy
`r()` helper from
`frontend/src/api/axiosInstance.ts`:

```ts
import axiosInstance, { endoregApi } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

const { data } = await axiosInstance.get(endoregApi(endpoints.anonymization.itemsOverview))
```

Important conventions:

- Endpoint paths in `endpoints.ts` are relative to `endoregApi()` or legacy
  `r()`.
- `endoregApi()` prefixes `VITE_ENDOREG_API_PREFIX`, falling back to
  `VITE_API_PREFIX`, then `/endoreg-api/`.
- `dtypesApi()` prefixes `VITE_DTYPES_API_PREFIX`, defaulting to
  `/dtypes-api/`.
- `dtypes-api/` routes are not represented by the `endpoints.ts` map unless a
  caller explicitly adds a separate typed contract for the `lx_dtypes` API.
- Keep trailing slashes exactly as defined in Django URLs.
- Outgoing JSON payload keys are converted from `camelCase` to `snake_case`.
- Incoming JSON response keys are converted from `snake_case` to `camelCase`.
- `FormData` payloads are passed through without key conversion and without a
  manually set `Content-Type`.
- The CSRF token is read from the `csrftoken` cookie and sent as `X-CSRFToken`.
- Use `silentRequestConfig()` for polling or optional status calls that should
  not show toast errors.

Use backend-native `snake_case` when documenting request and response payloads.
Frontend components will see camel-cased response fields after the Axios
interceptor runs.

## Type Aliases

`endpoints.ts` defines two shared path parameter aliases:

| Type | Shape | Use |
| --- | --- | --- |
| `Id` | `number \| string` | Numeric database IDs and string IDs accepted by route helpers. |
| `UUID` | `string` | Upload job IDs and other UUID route parameters. |

## Authentication

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `auth.bootstrap` | `auth/bootstrap` | `GET` | Bootstrap authentication and runtime context. |
| `auth.context` | `auth/context` | `GET` | Read current authentication context. |
| `auth.publicHome` | `endoreg_db/` | `GET` | Public backend home or health-style entrypoint. |
| `auth.login` | `login/` | `GET` | Start login flow when using backend login routes. |
| `auth.loginCallback` | `login/callback/` | `GET` | Login callback route. |
| `auth.conf` | `conf/` | `GET` | Read frontend/runtime auth configuration. |

The active frontend auth flow may use Keycloak directly. A `401` response from
Axios triggers `auth.login()` through the Keycloak auth store.

## Router And Core Domain Lists

These endpoints expose broad list/detail routes used by older router-level
views and by shared stores.

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `router.examinations` | `examinations/` | `GET` | List examinations. |
| `router.examinationById(id)` | `examinations/{id}/` | `GET` | Read one examination. |
| `router.findings` | `findings/` | `GET` | List findings. |
| `router.classifications` | `classifications/` | `GET` | List classifications. |
| `router.patientFindings` | `patient-findings/` | `GET` | List patient finding rows. |
| `router.patientExaminationReports` | `patient-examination-reports/` | `GET` | List reports. |

## Patients

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `patient.patients` | `patients/` | `GET`, `POST` | List or create patients. |
| `patient.patientById(id)` | `patients/{id}/` | `GET`, `PATCH`, `DELETE` | Read, update, or delete a patient. |
| `patient.patientPseudonym(id)` | `patients/{id}/pseudonym/` | `GET` | Read pseudonym information for a patient. |
| `patient.patientDeletionSafety(id)` | `patients/{id}/check_deletion_safety/` | `GET` | Check whether patient deletion is allowed. |
| `patient.centers` | `centers/` | `GET` | List centers. |
| `patient.genders` | `genders/` | `GET` | List gender values. |
| `patient.patientFindings` | `patient-findings/` | `GET`, `POST` | List or create patient findings. |
| `patient.patientFindingById(id)` | `patient-findings/{id}/` | `GET`, `PATCH`, `DELETE` | Read, update, or delete a patient finding. |
| `patient.checkPatientExaminationExists(id)` | `check_pe_exist/{id}/` | `GET` | Check whether a patient examination already exists. |

## Examinations

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `examination.examinationFindings(examinationId)` | `examinations/{examinationId}/findings/` | `GET` | List findings for an examination template. |
| `examination.findingClassifications(findingId)` | `findings/{findingId}/classifications/` | `GET` | List classifications for a finding. |
| `examination.classificationChoices(classificationId)` | `classifications/{classificationId}/choices/` | `GET` | List choices for a classification. |
| `examination.patientExaminationCreate` | `patient-examinations/create/` | `POST` | Create a patient examination. |
| `examination.patientExaminationDetail(id)` | `patient-examinations/{id}/` | `GET`, `PATCH` | Read or update a patient examination. |
| `examination.patientExaminationDraft(id)` | `patient-examinations/{id}/draft/` | `GET`, `PATCH` | Read or update examination draft data. |
| `examination.patientExaminationList` | `patient-examinations/list/` | `GET` | List patient examinations. |
| `examination.patientExaminationClassifications(examId)` | `patient-examinations/{examId}/classifications/` | `GET`, `POST` | List or update classifications for a patient examination. |
| `examination.patientExaminationFindings(examinationId)` | `patient-examinations/{examinationId}/findings/` | `GET`, `POST` | List or update findings for a patient examination. |

## Reports

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `report.patientExaminationReports` | `patient-examination-reports/` | `GET`, `POST` | List or create patient examination reports. |
| `report.patientExaminationReportById(id)` | `patient-examination-reports/{id}/` | `GET`, `PATCH`, `DELETE` | Read, update, or delete a report. |
| `report.patientExaminationReportsByPatientExamination(patientExaminationId)` | `patient-examination-reports/?patient_examination_id={patientExaminationId}` | `GET` | List reports for one patient examination. |
| `report.saveReportSubmission` | `patient-examination-reports/save-submission/` | `POST` | Persist report editor submission state. |
| `report.makeReport` | `patient-examination-reports/make-report/` | `POST` | Generate a report artifact. |
| `report.segmentFrameSelectorBase` | `patient-examination-reports/segment-frame-selector/` | `GET` | Base segment/frame selector endpoint. |
| `report.segmentFrameSelector(patientExaminationId, reportId?)` | `patient-examination-reports/segment-frame-selector/?patient_examination_id={patientExaminationId}[&report_id={reportId}]` | `GET` | Load segment/frame selector context. |
| `report.reportHistoryContext(patientExaminationId, limit?)` | `patient-examination-reports/history-context/?patient_examination_id={patientExaminationId}[&limit={limit}]` | `GET` | Load prior report context for assisted reporting. |

## Frame Annotation

Frame annotation endpoints must preserve annotator scoping when a user restarts
or overrides an annotation track. Submit the active annotator in task loading,
skip, and write payloads when the UI is operating under an explicit annotator.

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `annotation.randomTask` | `media/annotations/frames/random-task/` | `GET` | Fetch the next frame annotation task. |
| `annotation.bulkUpsert` | `media/annotations/frames/bulk-upsert/` | `POST` | Create or update frame annotations in bulk. |
| `annotation.frameBoxes` | `media/annotations/frames/boxes/` | `GET`, `POST` | Read or write frame box annotations. |
| `annotation.skip` | `media/annotations/frames/skip/` | `POST` | Skip an annotation task. |

## Uploads

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `upload.upload` | `upload/` | `POST` | Upload media through the API upload flow. Use `FormData`. |
| `upload.uploadStatus(id)` | `upload/{id}/status/` | `GET` | Poll an upload job by UUID. |

The upload flow persists source artifacts in protected storage. Failed uploads
may be copied to quarantine by backend ingest handling; current quarantine
support is read-only from the frontend.

## Stats

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `stats.examinations` | `examinations/stats/` | `GET` | Examination statistics. |
| `stats.videoSegment` | `media/videos/segments/stats/` | `GET` | Video segment statistics. |
| `stats.videoSegments` | `media/videos/segments/stats/` | `GET` | Alias for video segment statistics. |
| `stats.sensitiveMeta` | `media/sensitive-metadata/` | `GET` | Sensitive metadata list/stat source. |
| `stats.general` | `stats/` | `GET` | General application statistics. |

## Hub Export

Only anonymized processed media may be sent outbound. Raw media export is not
permitted. Hub transfer behavior must stay within the active roadmap phase:
mTLS for Phase 1 transport/authentication, envelope encryption for standalone
artifacts in Phase 2, and KMS-backed key management in Phase 3.

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `hubExport.overview` | `hub-export/overview/` | `GET` | List exportable and blocked media. |
| `hubExport.mark` | `hub-export/mark/` | `POST` | Mark media for hub export. |
| `hubExport.unmark` | `hub-export/unmark/` | `POST` | Remove media from the export queue. |

## Runtime

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `runtime.quarantine` | `runtime/quarantine/` | `GET` | Read a metadata-only overview of files in quarantine. |

The quarantine overview intentionally omits absolute filesystem paths. It is
used to render read-only failed rows in the anonymization overview. At the time
of writing there is no frontend release, restore, or requeue endpoint for
quarantine files.

## Anonymization Workflow

Do not conflate anonymization validation with segment annotation validation.
`anonymizationStatus` describes the anonymization pipeline. Segment annotation
completion is tracked separately on video-list data as
`segmentAnnotationsValidated`.

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `anonymization.itemsOverview` | `anonymization/items/overview/` | `GET` | List media items and anonymization workflow state. |
| `anonymization.documentTypesDropdown` | `anonymization/document-types/dropdown/` | `GET` | List document type choices for validation. |
| `anonymization.current(fileId)` | `anonymization/{fileId}/current/` | `GET` | Load current validation metadata for a file. |
| `anonymization.start(fileId)` | `anonymization/{fileId}/start/` | `POST` | Start anonymization for a file. |
| `anonymization.status(fileId)` | `anonymization/{fileId}/status/` | `GET` | Poll anonymization status. |
| `anonymization.validate(fileId)` | `anonymization/{fileId}/validate/` | `POST` | Validate anonymization output. |
| `anonymization.pollingInfo` | `anonymization/polling-info/` | `GET` | Read polling coordinator status. |
| `anonymization.clearLocks` | `anonymization/clear-locks/` | `DELETE` | Clear stuck processing locks. Intended as an operational escape hatch. |
| `anonymization.hasRaw(fileId)` | `anonymization/{fileId}/has-raw/` | `GET` | Check whether a raw source exists for the file. |

Common anonymization statuses:

| Status | Meaning |
| --- | --- |
| `not_started` | Anonymization has not been started. |
| `processing_anonymization` | Anonymization is running. |
| `extracting_frames` | Video frame extraction is running. |
| `predicting_segments` | Video segment prediction is running. |
| `done_processing_anonymization` | Processed media exists and needs anonymization validation. |
| `validated` | Anonymization was accepted and processed media may be used downstream. |
| `failed` | Processing failed. |

## Media Management

These endpoints are operational controls for stuck, failed, or unwanted media
records. They operate on database media records, not synthetic quarantine rows.

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `mediaManagement.status` | `media-management/status/` | `GET` | Read media processing and cleanup status summary. |
| `mediaManagement.cleanup` | `media-management/cleanup/` | `DELETE` | Run cleanup by type, usually with `type` and `force` query params. |
| `mediaManagement.forceRemove(fileId)` | `media-management/force-remove/{fileId}/` | `DELETE` | Remove a media record and related upload job. |
| `mediaManagement.resetStatus(fileId)` | `media-management/reset-status/{fileId}/` | `POST` | Reset stuck processing state for a media record. |

## Media: Shared Routes

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `media.patientTimeline(patientId)` | `media/patients/{patientId}/timeline/` | `GET` | Load patient media timeline. |
| `media.sensitiveMediaId(pk, mediaType)` | `media/sensitive-media-id/{pk}/{mediaType}/` | `GET` | Resolve a sensitive media ID by object ID and media type. |

## Media: Videos

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `media.videos` | `media/videos/` | `GET` | List videos. |
| `media.videoDetail(pk)` | `media/videos/{pk}/details/` | `GET` | Read video details. |
| `media.videoStream(pk)` | `media/videos/{pk}/stream/` | `GET` | Stream a video file. |
| `media.videoReimport(pk)` | `media/videos/{pk}/reimport/` | `POST` | Re-import an existing video from its stored raw source. |
| `media.exportAnnotated` | `media/videos/export-annotated/` | `POST` | Export annotated video data. |
| `media.videoCorrection(pk)` | `media/videos/video-correction/{pk}` | `GET`, `POST` | Load or submit video correction state. |
| `media.videoMetadata(pk)` | `media/videos/{pk}/metadata/` | `GET` | Read video metadata. |
| `media.videoFps(pk)` | `media/videos/{pk}/fps/` | `GET` | Read FPS metadata. |
| `media.videoApplyMask(pk)` | `media/videos/{pk}/apply-mask/` | `POST` | Apply a correction mask. |
| `media.videoRemoveFrames(pk)` | `media/videos/{pk}/remove-frames/` | `POST` | Remove frames from processed output. |
| `media.videoLabelsList` | `media/videos/labels/list/` | `GET` | List video labels. |
| `media.videoLabelSetsList` | `media/videos/label-sets/list/` | `GET` | List video label sets. |
| `media.videoPredictionModelsList` | `media/videos/prediction-models/list/` | `GET` | List available prediction models. |

Video re-import requires the raw source to still exist in managed storage. It
does not release a file from quarantine.

## Media: Video Segments

Prediction segments shown in the KI view are loaded through
`source_kind=prediction` and must correspond to `LabelVideoSegment` rows marked
with prediction metadata or source `prediction`.

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `media.segmentsCollection` | `media/videos/segments/` | `GET`, `POST` | Global segment collection route. |
| `media.segmentsStats` | `media/videos/segments/stats/` | `GET` | Segment statistics. |
| `media.videoSegments(pk)` | `media/videos/{pk}/segments/` | `GET`, `POST` | List or create segments for a video. |
| `media.videoSegmentsBulkMutation(pk)` | `media/videos/{pk}/segments/bulk/` | `POST`, `PATCH` | Bulk mutate segments for a video. |
| `media.videoSegmentDetail(pk, segmentId)` | `media/videos/{pk}/segments/{segmentId}/` | `GET`, `PATCH`, `DELETE` | Read, update, or delete one segment. |
| `media.videoSegmentsImportPredictions(pk)` | `media/videos/{pk}/segments/import-predictions/` | `POST` | Import prediction segments. |
| `media.videoSegmentsRerunPredictions(pk)` | `media/videos/{pk}/segments/rerun-predictions/` | `POST` | Replace existing prediction rows and rerun segment prediction. |
| `media.videoSegmentValidate(pk, segmentId)` | `media/videos/{pk}/segments/{segmentId}/validate/` | `POST` | Validate one segment. |
| `media.videoSegmentsValidateBulk(pk)` | `media/videos/{pk}/segments/validate-bulk/` | `POST` | Validate segments in bulk. Include `annotator` when validating under an override. |
| `media.videoSegmentsValidationStatus(pk)` | `media/videos/{pk}/segments/validation-status/` | `GET` | Read segment validation state for a video. |
| `media.videoSegmentsBlackenOutside(pk)` | `media/videos/{pk}/segments/blacken-outside/` | `POST` | Dispatch outside-segment blackening after segment validation. |
| `media.ensureSegmentAnnotationsForVideo(pk)` | `media/videos/{pk}/ensure-segment-annotations/` | `POST` | Ensure frame-level annotations exist for a video. |
| `media.ensureSegmentAnnotationsBulk` | `media/videos/ensure-segment-annotations/` | `POST` | Ensure frame-level annotations for multiple videos. |

Operational queue notes:

- `videoSegmentsRerunPredictions` dispatches
  `endoreg_db.video_temporal_inference` and should be monitored on the
  `inference` queue.
- `videoSegmentsBlackenOutside` dispatches
  `endoreg_db.video_post_validation_rebuild` and should be monitored on the
  `frame_extraction` queue.

## Media: Sensitive Metadata And Case Resolution

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `media.videoSensitiveMetadata(pk)` | `media/videos/{pk}/sensitive-metadata/` | `GET`, `PATCH` | Read or update video sensitive metadata. |
| `media.videoSensitiveMetadataVerify(pk)` | `media/videos/{pk}/sensitive-metadata/verify/` | `POST` | Verify video sensitive metadata. |
| `media.videoCaseResolution(pk)` | `media/videos/{pk}/case-resolution/` | `GET`, `POST` | Resolve or create video case linkage. |
| `media.pdfSensitiveMetadata(pk)` | `media/pdfs/{pk}/sensitive-metadata/` | `GET`, `PATCH` | Read or update PDF sensitive metadata. |
| `media.pdfSensitiveMetadataVerify(pk)` | `media/pdfs/{pk}/sensitive-metadata/verify/` | `POST` | Verify PDF sensitive metadata. |
| `media.pdfCaseResolution(pk)` | `media/pdfs/{pk}/case-resolution/` | `GET`, `POST` | Resolve or create PDF case linkage. |
| `media.sensitiveMetadataList` | `media/sensitive-metadata/` | `GET` | List sensitive metadata. |
| `media.pdfSensitiveMetadataList` | `media/pdfs/sensitive-metadata/` | `GET` | List PDF sensitive metadata. |

Persisted JSON workflow and provenance payloads must be validated at the model
boundary. Do not add loosely typed metadata mutations in frontend-only code.

## Media: PDFs

| Frontend key | Path | Typical method | Purpose |
| --- | --- | --- | --- |
| `media.pdfs` | `media/pdfs/` | `GET` | List PDFs. |
| `media.pdfDetail(pk)` | `media/pdfs/{pk}/` | `GET` | Read PDF details. |
| `media.pdfStream(pk)` | `media/pdfs/{pk}/stream/` | `GET` | Stream a PDF. |
| `media.pdfReimport(pk)` | `media/pdfs/{pk}/reimport/` | `POST` | Re-import an existing PDF from its stored raw source. |

## Updating This Contract

When changing API routes:

1. Update `frontend/src/types/api/endpoints.ts`.
2. Update the relevant frontend API module or store.
3. Keep request payload keys documented in backend `snake_case`.
4. Add or update tests for the route behavior and the frontend caller.
5. Update this page with the frontend key, path, method, and purpose.

Avoid ad hoc URL strings in components. Prefer endpoint helpers so route changes
stay searchable and type-checked.

## Python Module Reference

This section documents the public Python modules exposed by `lx-annotate`.

```{eval-rst}
.. automodule:: lx_annotate
   :members:
   :undoc-members:
   :show-inheritance:
```
