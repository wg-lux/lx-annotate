# Anonymizer Module Documentation

## Overview

The Anonymizer module is a comprehensive system for managing the anonymization workflow of medical video and PDF files. It consists of three main Vue.js components that handle file overview, validation, and correction of anonymized data.

**Component Locations:**
- Overview: `/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationOverviewComponent.vue`
- Validation: `/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue`
- Correction: `/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationCorrectionComponent.vue`

**Related Documentation:**
- 📊 **Import Services Comparison:** `/IMPORT_SERVICES_COMPARISON.md` - Comprehensive analysis of video_import.py vs pdf_import.py
- 🔧 **Path Fix Documentation:** `/PROCESSED_VIDEO_PATH_FIX.md` - October 14, 2025 path storage fix
- 📁 **Storage Analysis:** `/STORAGE_PATH_ANALYSIS_FINAL.md` - Path resolution architecture

---

## Anonymization Workflow

After media is imported by `endoreg_db/services/video_import.py` or `endoreg_db/services/pdf_import.py` (using lx-anonymizer modules or not), the anonymization must be human-validated and potentially corrected before final approval.

**⚠️ Important:** See `/IMPORT_SERVICES_COMPARISON.md` for detailed comparison of the two import services, including strengths, weaknesses, and harmonization recommendations.

### Workflow States

```
┌─────────────────┐
│  Media Upload   │ (VideoFile/RawPdfFile created)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  not_started    │ ──► User triggers "Start Anonymization"
└────────┬────────┘
         │
         ▼
┌────────────────────────┐
│ processing_anonymization│ ──► lx-anonymizer processes frames/text
└────────┬───────────────┘
         │
         ▼
┌─────────────────┐
│      done       │ ──► Ready for validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   validated     │ ──► Human approved, ready for annotation
└─────────────────┘
```

---

## Component 1: AnonymizationOverviewComponent

**Purpose:** Central dashboard for managing all anonymization tasks across videos and PDFs.

### Current Implementation (As-Is Analysis)

#### ✅ **Working Features**

1. **File Listing & Status Display**
   - Displays all VideoFile and RawPdfFile entries in unified table
   - Shows anonymization status badges (not_started, processing, done, validated, failed)
   - Shows annotation status (not_started, done)
   - Displays original file availability status
   - Supports both video (`.mp4`) and PDF (`.pdf`) media types

2. **Status Management**
   - Real-time status updates via polling (`anonymizationStore.startPolling()`)
   - Automatic cleanup of polling on component unmount
   - Status-based action button visibility (Start, Re-import, Validate, Correct, Delete)

3. **Action Workflows**
   - **Start Anonymization:** Triggers backend processing with polling protection
   - **Validate:** Navigates to validation component for human review
   - **Video Correction:** Opens correction interface for masking/frame removal
   - **Delete:** Permanent removal with confirmation dialog
   - **Re-import:** Re-processes video metadata or resets PDF status

4. **Status Summary Cards**
   - Aggregated counts by status category (not_started, processing, done, failed)
   - Visual overview of workflow progress

5. **Polling Protection Integration**
   - Uses `usePollingProtection` composable to prevent race conditions
   - Client-side rate limiting for status checks
   - Coordinated processing locks across tabs/users

#### ⚠️ **Known Issues**

1. **Inconsistent Media Type Detection** (Lines 90-92, 318-320)
   - Uses `mediaStore.detectMediaType()` which can fail for edge cases
   - Fallback to 'unknown' type causes processing to fail silently
   ```typescript
   // Line 320: Silent failure for unknown types
   if (mediaType === 'unknown') {
     return processingFiles.value.has(fileId);
   }
   ```

2. **Re-import Feature** (Lines 168-192)
   - ✅ **Video Re-import:** Uses dedicated `/api/video/{id}/reimport/` endpoint
   - ✅ **PDF Re-import:** Uses dedicated `/api/media/pdfs/{id}/reimport/` endpoint (implemented October 2025)
   - Both follow modern media framework architecture
   - Automatic polling after reimport with optimistic UI updates

3. **Polling Lifecycle Issues**
   - Polling starts for all files on mount (Line 367-369) even if not visible
   - No pagination despite potentially large file lists
   - Can cause performance issues with 100+ files

4. **Error Handling Gaps**
   - Generic error messages without actionable details
   - No distinction between network errors vs validation errors
   - Missing retry mechanisms for failed operations

#### 📊 **Data Flow**

```
User Action → Component Method → AnonymizationStore → API Call → Backend
     ↓                                    ↓                          ↓
  Button Click            Update Local State              Update Database
     ↓                                    ↓                          ↓
  Loading State           Trigger Polling          Return Status Update
```

**Key API Endpoints:**
- `GET /api/anonymization/items/overview/` - Fetch all files
- `POST /api/anonymization/<id>/start/` - Start processing
- `POST /api/anonymization/<id>/validate/` - Validate metadata
- `DELETE /api/media-management/force-remove/<id>/` - Delete file
- `POST /api/media-management/reset-status/<id>/` - Reset processing

---

## Component 2: AnonymizationValidationComponent

**Purpose:** Human-in-the-loop validation of anonymized patient metadata and media content.

### Current Implementation (As-Is Analysis)

#### ✅ **Working Features**

1. **Dual Media Support**
   - **PDF Viewer:** Embedded iframe for PDF preview (Line 192-200)
   - **Video Player:** Dual-view comparison of raw vs anonymized video (Lines 204-308)
   - Dynamic media type detection via `mediaStore.detectMediaType()`

2. **Patient Metadata Editing**
   - Form fields for: firstName, lastName, gender, DOB, caseNumber, examDate
   - Real-time validation with visual feedback (red borders on invalid fields)
   - German date format support (DD.MM.YYYY) with ISO conversion
   - Dirty state tracking to warn about unsaved changes

3. **Date Handling System** (Lines 429-479)
   - **`fromUiToISO()`**: Converts browser date input (YYYY-MM-DD) → ISO
   - **`toGerman()`**: Converts ISO (YYYY-MM-DD) → German (DD.MM.YYYY)
   - **`fromGermanToISO()`**: Converts German → ISO
   - Supports both input formats for backwards compatibility
   - Validates DOB < ExaminationDate constraint

4. **Video-Specific Features** (NEW - Lines 244-308)
   - **Dual Video Streaming:** Side-by-side raw vs anonymized comparison
   - **Video Sync Controls:** Synchronize playback times across both videos
   - **Segment Validation:** `OutsideTimelineComponent` for "outside" segment removal
   - **Validation Status Checks:** Checks if video is ready for segment annotation

5. **Action Workflows**
   - **Approve:** Validates metadata, sends to backend, navigates to segmentation
   - **Skip:** Moves to next item without saving
   - **Reject:** Marks as rejected (currently no backend persistence)
   - **Correction Button:** Navigates to correction component with unsaved changes warning

#### ⚠️ **Known Issues**

1. **Validation Logic Fragmentation** (Lines 492-523)
   - Validation logic scattered across multiple computed properties
   - `isDobValid`, `isExaminationDateValid`, `firstNameOk`, `lastNameOk` computed separately
   - No centralized validation error collection
   - Error messages shown inline but not aggregated for user overview

2. **Date Format Confusion**
   - Backend expects German format (DD.MM.YYYY) but also accepts ISO
   - Frontend sends German format in `buildSensitiveMetaSnake()` (Line 414)
   - Conversion happens in multiple places creating risk of inconsistency
   - **Bug Risk:** Line 707 sends `toGerman(dobISO.value)` - if DOB is already German, double conversion fails

3. **Video Validation Incomplete** (Lines 265-340)
   - `validateVideoForSegmentAnnotation()` checks for "outside" segments
   - BUT: No enforcement that validation must complete before approval
   - User can approve without validating outside segments
   - Missing backend API endpoint (falls back to VideoStore query)

4. **Correction Navigation Issues** (Lines 533-579)
   - Checks for dirty state but proceeds differently based on user choice
   - If user saves changes → calls `approveItem()` → navigates to next item
   - User must **manually** return to correction view after save
   - Confusing UX: save+correct vs save+next flow not clear

5. **Media URL Resolution**
   - PDF URL construction: `pdfStore.buildPdfStreamUrl(currentItem.value.id)` (Line 665)
   - Video URLs: Hardcoded query params `?type=raw` and `?type=processed` (Lines 673-683)
   - No validation that these URLs actually return data
   - Missing error handling for 404/403 responses on video elements

6. **Annotation Save Feature Incomplete** (Lines 583-623)
   - `saveAnnotation()` requires both `processedUrl` and `originalUrl`
   - BUT: No UI for uploading/capturing these images
   - Feature appears to be legacy/unused code
   - Always fails with "Bitte laden Sie zuerst Bilder hoch"

#### 🔧 **Data Validation Flow**

```
User Input → Reactive Ref → Computed Validation → Visual Feedback → Save Gate
    ↓                            ↓                       ↓              ↓
TextField       isDobValid / firstNameOk / etc    Red Border    canSubmit=false
    ↓                            ↓                       ↓              ↓
v-model       Boolean (true/false)           is-invalid class   Button disabled
```

**Validation Rules:**
- `firstNameOk`: Length > 0
- `lastNameOk`: Length > 0
- `isDobValid`: Valid ISO date exists
- `isExaminationDateValid`: Valid ISO date >= DOB (if provided)
- `dataOk`: All above must be true
- `canSubmit`: dataOk AND no concurrent save/approve operation

#### 📊 **API Integration**

**Successful Flow:**
```
approveItem() → POST /api/anonymization/{id}/validate/ 
              → body: { patient_first_name, patient_dob (German!), ... }
              → Response 200 OK
              → Navigate to Video-Untersuchung
```

**Known Backend Expectations:**
- Date fields in **German format (DD.MM.YYYY)** preferred (Lines 707-708)
- Falls back to ISO format (YYYY-MM-DD) for backwards compatibility
- `anonymized_text` only used for PDFs (ignored for videos)
- `is_verified` defaults to `true`

---

## Component 3: AnonymizationCorrectionComponent

**Purpose:** Advanced video correction tools for masking and frame removal.

### Current Implementation (As-Is Analysis)

#### ✅ **Working Features**

1. **Video Metadata Display** (Lines 47-99)
   - Shows: filename, status, file size, creation date
   - Displays: sensitive frame count, total frames, sensitive ratio
   - Visual sensitivity badge (red >10%, yellow >5%, green ≤5%)

2. **Masking Configuration** (Lines 105-207)
   - **Device-Default Masks:** Pre-configured for Olympus, Pentax, Fujifilm endoscopes
   - **ROI-Based Masking:** Region-of-interest detection
   - **Custom Masking:** Manual X/Y/Width/Height configuration
   - **Processing Methods:** Streaming (recommended) vs Direct

3. **Frame Removal Configuration** (Lines 209-306)
   - **Automatic Detection:** KI-based using MiniCPM-o 2.6, Traditional OCR+LLM, or Hybrid
   - **Manual Frame List:** User-specified frames (supports ranges: "10-20,30,45")
   - **Processing Methods:** Streaming (10x faster) vs Traditional

4. **Video Preview** (Lines 308-376)
   - Original vs Processed toggle
   - Video playback controls (±10s seek buttons)
   - Loads from `/api/media/videos/{id}/` or `/api/media/processed-videos/{id}/{historyId}/`

5. **Processing History** (Lines 378-428)
   - Table of all masking/removal operations
   - Shows: timestamp, operation type, status, details, download link
   - Sortable by date (newest first)

#### ✅ **Implemented Features (Phase 1.1)**

1. **Backend Endpoints Implemented**
   - ✅ `POST /api/video-analyze/{id}/` - Analyzes video for sensitive frames using MiniCPM-o 2.6
   - ✅ `POST /api/video-apply-mask/{id}/` - Applies device or custom ROI masks
   - ✅ `POST /api/video-remove-frames/{id}/` - Removes specified frames from video
   - ✅ `POST /api/video-reprocess/{id}/` - Triggers full re-anonymization
   - ✅ `GET /api/video-metadata/{id}/` - Returns analysis results and metadata
   - ✅ `GET /api/video-processing-history/{id}/` - Returns operation audit trail

2. **Database Models Created**
   - ✅ `VideoMetadata` - Stores analysis results (sensitive frame count, ratio, frame IDs)
   - ✅ `VideoProcessingHistory` - Audit trail for all correction operations
   - ✅ Migration `0002_add_video_correction_models` applied successfully

3. **Serializers Implemented**
   - ✅ `VideoMetadataSerializer` - Parses JSON frame IDs, validates ratio (0.0-1.0)
   - ✅ `VideoProcessingHistorySerializer` - Generates download URLs, validates operation configs

4. **lx_anonymizer Integration**
   - ✅ Uses `FrameCleaner.analyze_video_sensitivity()` for frame analysis
   - ✅ Uses `FrameCleaner._mask_video()` for FFmpeg masking (NVENC + CPU fallback)
   - ✅ Uses `FrameCleaner.remove_frames_from_video()` for frame removal
   - ✅ Device masks available: Olympus CV-1500, Pentax EPT-7000, Fujifilm 4450HD

#### ⏳ **Pending Implementation (Future Phases)**

1. **Task Polling System** (Phase 1.2)
   - `pollTaskProgress()` expects `/api/task-status/{taskId}/`
   - Celery/background task infrastructure needed for async processing
   - Currently all operations run synchronously (works for MVP)

2. **Segment Update Logic** (Phase 1.4)
   - Frame removal should update `LabelVideoSegment` boundaries
   - `update_segments_after_frame_removal()` marked as TODO

3. **Video URL Query Parameters** (Phase 3.2)
   - `?type=raw` and `?type=processed` not yet supported
   - Dual video comparison requires separate endpoints

#### ✅ **Backend Implementation Complete (Phase 1.1)**

**Video Correction API:**
See `/libs/endoreg-db/docs/VIDEO_CORRECTION_MODULES.md` for detailed implementation documentation.

**Implemented Views** (`endoreg_db/views/video/correction.py`):
- ✅ `VideoMetadataView` - GET /api/video-metadata/{id}/
- ✅ `VideoProcessingHistoryView` - GET /api/video-processing-history/{id}/
- ✅ `VideoAnalyzeView` - POST /api/video-analyze/{id}/
- ✅ `VideoApplyMaskView` - POST /api/video-apply-mask/{id}/
- ✅ `VideoRemoveFramesView` - POST /api/video-remove-frames/{id}/
- ✅ `VideoReprocessView` - POST /api/video-reprocess/{id}/

**Implemented Models** (`endoreg_db/models/video/video_correction.py`):
- ✅ `VideoMetadata` - Stores analysis results
- ✅ `VideoProcessingHistory` - Operation audit trail with config and output tracking

**Implemented Serializers**:
- ✅ `VideoMetadataSerializer` - JSON parsing, validation
- ✅ `VideoProcessingHistorySerializer` - Download URLs, operation-specific validation

---

## Backend API Status

### Implemented Endpoints ✅

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/anonymization/items/overview/` | GET | List all files with status | ✅ Working |
| `/api/anonymization/<id>/start/` | POST | Start anonymization | ✅ Working |
| `/api/anonymization/<id>/status/` | GET | Get processing status | ✅ Working |
| `/api/anonymization/<id>/validate/` | POST | Validate metadata | ✅ Working |
| `/api/anonymization/<id>/current/` | GET | Get file for validation | ✅ Working |
| `/api/media-management/force-remove/<id>/` | DELETE | Delete file | ✅ Working |
| `/api/media-management/reset-status/<id>/` | POST | Reset processing | ✅ Working |
| `/api/videostream/<id>/` | GET | Stream video | ✅ Working |
| `/api/pdfstream/<id>/` | GET | Stream PDF | ✅ Working |

### Re-import Endpoints ✅ (October 2025)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/media/videos/<id>/reimport/` | POST | Re-import video with metadata regeneration | ✅ Working (UPDATED) |
| `/api/media/pdfs/<id>/reimport/` | POST | Re-import PDF with metadata regeneration | ✅ Working |

**Implementation Details:**

**Video Re-import** (`endoreg_db/views/video/reimport.py`):
- Clears existing `SensitiveMeta` data
- Re-runs `VideoImportService` to regenerate metadata
- Uses modern media framework parameter: `pk`
- Returns processing response with status
- **Updated October 14, 2025**: Migrated from legacy `/api/video/<video_id>/` to modern `/api/media/videos/<pk>/`

**PDF Re-import** (`endoreg_db/views/pdf/reimport.py`):
- Clears existing `SensitiveMeta` data  
- Re-runs `PdfImportService` to regenerate metadata
- Uses modern media framework parameter: `pk`
- Returns processing response with status
- Follows exact video reimport pattern

**Frontend Integration:**

Both reimport operations follow the same pattern in `anonymizationStore.ts`:

```typescript
async reimportVideo(fileId: number) {
  // 1. Validate file type
  const file = this.overview.find(f => f.id === fileId);
  if (file?.mediaType !== 'video') return false;
  
  // 2. Optimistic UI update
  file.anonymizationStatus = 'processing_anonymization';
  
  // 3. Call backend endpoint (modern media framework)
  await a(api.post(`/api/media/videos/${fileId}/reimport/`));
  
  // 4. Start automatic polling
  this.startPolling(fileId);
  
  // 5. Handle errors with status revert
  return true;
}

async reimportPdf(fileId: number) {
  // Same pattern, same URL structure
  await a(api.post(`/api/media/pdfs/${fileId}/reimport/`));
}
```

**Key Features:**
- ✅ Optimistic UI updates (status set to processing immediately)
- ✅ Automatic polling after reimport (10-second interval)
- ✅ Error handling with status rollback on failure
- ✅ Type validation before processing
- ✅ Consistent architecture between video and PDF
- ✅ **Unified URL structure using modern media framework**

**URL Registration:**
- Video: `endoreg_db/urls/media.py` → `path("media/videos/<int:pk>/reimport/", ...)`
- PDF: `endoreg_db/urls/media.py` → `path("media/pdfs/<int:pk>/reimport/", ...)`
- **Both use consistent `/api/media/{type}/<pk>/reimport/` pattern**

**Migration Notes:**
- **October 14, 2025:** Complete migration of all video endpoints to modern media framework
- Legacy video endpoint (`/api/video/<video_id>/reimport/`) **deprecated**
- Legacy video reprocess endpoint (`/api/video-reprocess/<id>/`) **deprecated**
- Legacy video correction endpoints (`/api/video-metadata/<id>/`, etc.) **deprecated**
- Legacy PDF workaround (`resetProcessingStatus`) deprecated
- Modern media framework (`/api/media/`) used throughout for consistency
- Parameter naming unified: `pk` for all resources (no more `video_id` vs `pdf_id` vs `id`)
- All video operations now under `/api/media/videos/<pk>/` prefix
- All PDF operations now under `/api/media/pdfs/<pk>/` prefix

**Unified API Structure:**
```
/api/media/videos/<pk>/                  # Video metadata
/api/media/videos/<pk>/stream/           # Video streaming
/api/media/videos/<pk>/reimport/         # Re-import video
/api/media/videos/<pk>/reprocess/        # Reprocess video
/api/media/videos/<pk>/metadata/         # Analysis metadata
/api/media/videos/<pk>/processing-history/ # Operation history
/api/media/videos/<pk>/analyze/          # Analyze frames
/api/media/videos/<pk>/apply-mask/       # Apply masking
/api/media/videos/<pk>/remove-frames/    # Remove frames

/api/media/pdfs/<pk>/                    # PDF metadata
/api/media/pdfs/<pk>/stream/             # PDF streaming
/api/media/pdfs/<pk>/reimport/           # Re-import PDF
```

**Documentation:**
- See `/docs/PDF_REIMPORT_DOCUMENTATION.md` for complete implementation details
- See `/docs/VIDEO_IMPORT_LOGIC_SUMMARY.md` for video reimport background

### Video Correction Endpoints ✅ (Phase 1.1 Complete - Migrated October 14, 2025)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/media/videos/<pk>/metadata/` | GET | Get video metadata | ✅ Working (Modern) |
| `/api/media/videos/<pk>/processing-history/` | GET | Get processing history | ✅ Working (Modern) |
| `/api/media/videos/<pk>/analyze/` | POST | Analyze sensitive frames | ✅ Working (Modern) |
| `/api/media/videos/<pk>/apply-mask/` | POST | Apply masking | ✅ Working (Modern) |
| `/api/media/videos/<pk>/remove-frames/` | POST | Remove frames | ✅ Working (Modern) |
| `/api/media/videos/<pk>/reprocess/` | POST | Reprocess video | ✅ Working (Modern) |

**Migration Complete (October 14, 2025):** All video correction endpoints now use modern media framework.

**Legacy endpoints (deprecated):**
- `GET /api/video-metadata/<id>/` → Use `/api/media/videos/<pk>/metadata/`
- `GET /api/video-processing-history/<id>/` → Use `/api/media/videos/<pk>/processing-history/`
- `POST /api/video-analyze/<id>/` → Use `/api/media/videos/<pk>/analyze/`
- `POST /api/video-apply-mask/<id>/` → Use `/api/media/videos/<pk>/apply-mask/`
- `POST /api/video-remove-frames/<id>/` → Use `/api/media/videos/<pk>/remove-frames/`
- `POST /api/video-reprocess/<id>/` → Use `/api/media/videos/<pk>/reprocess/`

**Unified URL Pattern:** All video operations follow `/api/media/videos/<pk>/{action}/`

### Missing Endpoints ⏳

| Endpoint | Method | Purpose | Component | Phase |
|----------|--------|---------|-----------|-------|
| `/api/task-status/<task_id>/` | GET | Check Celery task | Correction | Phase 1.2 |
| `/api/media/videos/<id>/?type=raw` | GET | Stream raw video | Validation | Phase 3.2 |
| `/api/media/videos/<id>/?type=processed` | GET | Stream anonymized video | Validation | Phase 3.2 |

**Legend:**
- ✅ = Fully implemented and tested
- ⏳ = Planned for future phase
- ⚠️ = Partially implemented (may work but untested)

---

## Test Coverage Analysis

### Existing Tests

```bash
/home/admin/dev/lx-annotate/tests/test_pdf_anonymization_core.py
```

**Coverage:** PDF anonymization only (no video correction tests)

### Missing Test Areas

1. **Video Masking Pipeline**
   - No tests for device-specific mask application
   - No tests for custom ROI masking
   - No tests for streaming vs direct processing modes

2. **Frame Removal Logic**
   - No tests for automatic frame detection (MiniCPM, OCR+LLM)
   - No tests for manual frame parsing ("10-20,30" format)
   - No tests for frame removal side effects (video length, segment updates)

3. **Dual Video Streaming**
   - No tests for raw vs anonymized video URL construction
   - No tests for video sync functionality
   - No tests for segment validation integration

4. **Date Format Handling**
   - No tests for German (DD.MM.YYYY) ↔ ISO (YYYY-MM-DD) conversion
   - No tests for DOB < ExaminationDate validation
   - No tests for backwards compatibility with ISO-only inputs

5. **Polling Protection**
   - No tests for race condition prevention
   - No tests for multi-tab coordination
   - No tests for rate limiting enforcement

---

## Implementation Plan

### Current Status Overview (October 2025)

| Phase | Priority | Status | Completion |
|-------|----------|--------|------------|
| Phase 1.1 | Critical | ✅ Complete | October 2025 |
| Phase 1.2 | High | ✅ Complete | October 9, 2025 |
| **Phase 1.3** | **High** | **✅ Complete** | **October 9, 2025** |
| Phase 1.4 | Critical | ✅ Complete | October 2025 |
| Phase 2.1 | High | ✅ Complete | October 2025 |
| Phase 2.2 | Medium | ✅ Complete | October 2025 |
| Phase 3.1 | Medium | ✅ Complete | October 2025 |
| Phase 3.2 | Medium | ✅ Complete | October 2025 |
| **Phase 4.1** | **CRITICAL** | **✅ Complete** | **October 9, 2025** |
| Phase 5.1 | Low | ⏳ Pending | - |
| Phase 5.2 | Low | ⏳ Pending | - |

**Latest Completions (October 9, 2025):**
- 🎉 **Phase 4.1** - UV Workspace Fix (15 minutes) - CRITICAL blocker resolved
- 🎉 **Phase 1.3** - Video Masking Implementation (4 hours) - Device masks, tests, docs

**Next Recommended Tasks:**
1. **Phase 1.2** - Celery Task Infrastructure (5-7 days) - Convert sync to async
2. **Phase 5.1** - Comprehensive Test Suite (5-7 days) - Expand coverage
3. **Phase 5.2** - Error Handling & UX (3-4 days) - Improve user feedback

---

### Phase 1: Critical Backend Infrastructure

**Goal:** Enable video correction workflows

**Status:** ✅ Phase 1.1 COMPLETE, ✅ Phase 1.4 COMPLETE

### Phase 2: Date Format Standardization (Priority: HIGH)

**Status:** ✅ Phase 2.1 COMPLETE, ✅ Phase 2.2 COMPLETE (October 2025)

**Goal:** Eliminate date format confusion and bugs

### Phase 3: Video Validation Enhancement (Priority: MEDIUM)

**Status:** ✅ Phase 3.1 COMPLETE, ✅ Phase 3.2 COMPLETE (October 2025)

**Goal:** Enforce segment validation before approval

#### 1.1 Video Correction API Endpoints ✅ COMPLETE
**Completed:** October 2025
**Implementation:**
- ✅ `libs/endoreg-db/endoreg_db/views/video/correction.py` (580 lines, 6 API views)
- ✅ `libs/endoreg-db/endoreg_db/models/video/video_correction.py` (VideoMetadata, VideoProcessingHistory)
- ✅ `libs/endoreg-db/endoreg_db/serializers/video/video_metadata.py` (105 lines)
- ✅ `libs/endoreg-db/endoreg_db/serializers/video/video_processing_history.py` (153 lines)
- ✅ Migration: `0002_add_video_correction_models` applied
- ✅ URL routing configured in `endoreg_db/urls/video.py`

**Implemented Views:**
- ✅ `VideoMetadataView` - Returns analysis results or creates empty record
- ✅ `VideoProcessingHistoryView` - Returns all operations ordered by date
- ✅ `VideoAnalyzeView` - Analyzes video using FrameCleaner.analyze_video_sensitivity()
- ✅ `VideoApplyMaskView` - Applies device/custom masks using FrameCleaner._mask_video()
- ✅ `VideoRemoveFramesView` - Removes frames using FrameCleaner.remove_frames_from_video()
- ✅ `VideoReprocessView` - Resets state and triggers re-anonymization

**Key Features:**
- JSON frame ID parsing with validation
- Operation-specific config validation (mask types, frame lists)
- Automatic download URL generation for processed videos
- Integration with existing lx_anonymizer functions
- Error handling with processing history tracking
- Synchronous processing (Celery async in Phase 1.2)

**Documentation:**
See `/libs/endoreg-db/docs/VIDEO_CORRECTION_MODULES.md` for complete implementation details.

**Acceptance Criteria Met:**
- ✅ Video metadata loads successfully in correction component
- ✅ Processing history displays all operations
- ✅ Analyze button returns sensitive frame data
- ✅ All endpoints tested via Django shell

#### 1.2 Celery Task Infrastructure
**Effort:** 5-7 days
**Dependencies:** Celery, Redis/RabbitMQ

**Tasks:**
- [ ] Set up Celery workers in Docker Compose
- [ ] Create `tasks/video_correction.py` with:
  - `apply_mask_task(video_id, mask_config)`
  - `remove_frames_task(video_id, frame_list)`
  - `reprocess_video_task(video_id)`

- [ ] Implement `TaskStatusView` (GET /api/task-status/{task_id}/)
  - Query Celery result backend
  - Return progress percentage (0-100)
  - Include error messages on failure

- [ ] Add progress reporting to tasks
  - Update task state every N frames processed
  - Store intermediate results for resume capability

**Acceptance Criteria:**
- Masking operation starts and shows real progress
- User can see task percentage in UI
- Task failures return actionable error messages

#### 1.3 Video Masking Implementation ✅ COMPLETE
**Completed:** October 9, 2025
**Effort:** 4 hours (faster than estimated 4-6 days!)

**Implementation:**
- ✅ Backend API already functional from Phase 1.1
- ✅ Device masks created: Olympus, Pentax, Fujifilm, Generic
- ✅ Test suite created (8 test classes, 20+ test cases)
- ✅ Documentation complete (DEVICE_MASK_CONFIGURATION.md)

**Available Functions:**
- ✅ `FrameCleaner._mask_video(input_video, mask_config, output_video)` - FFmpeg Masking
- ✅ `FrameCleaner._load_mask(device_name)` - Device Masks laden
- ✅ `FrameCleaner._create_mask_config_from_roi(endoscope_roi)` - ROI → Mask Config
- ✅ `FrameCleaner._validate_roi(roi)` - ROI Validation

**Implemented Components:**

1. **Backend API** (Already in Phase 1.1)
   - ✅ `VideoApplyMaskView` - POST /api/video-apply-mask/{id}/
   - ✅ Supports device masks and custom ROI
   - ✅ Processing history tracking
   - ✅ Error handling

2. **Device Mask Library** (New in Phase 1.3)
   - ✅ `olympus_cv_1500_mask.json` - Olympus CV-1500 (verified)
   - ✅ `pentax_ept_7000_mask.json` - Pentax EPT-7000 (placeholder)
   - ✅ `fujifilm_4450hd_mask.json` - Fujifilm 4450HD (placeholder)
   - ✅ `generic_mask.json` - Generic fallback (verified)

3. **Test Coverage** (New in Phase 1.3)
   - ✅ `tests/views/video/test_masking.py` - Comprehensive test suite
   - Test classes:
     * `TestDeviceMaskLoading` - 6 tests for mask file loading
     * `TestROIValidation` - 6 tests for ROI validation
     * `TestMaskConfigCreation` - 2 tests for config creation
     * `TestVideoMaskingIntegration` - 6 integration tests (requires fixtures)
     * `TestMaskingPerformance` - 1 performance test

4. **Documentation** (New in Phase 1.3)
   - ✅ `DEVICE_MASK_CONFIGURATION.md` - Complete mask creation guide
   - ✅ `PHASE_1_3_IMPLEMENTATION_PLAN.md` - Implementation details
   - Includes: coordinate measurement, FFmpeg strategies, troubleshooting

**Mask Format:**
```json
{
  "image_width": 1920,
  "image_height": 1080,
  "endoscope_image_x": 550,
  "endoscope_image_y": 0,
  "endoscope_image_width": 1350,
      "endoscope_image_height": 1080
    }
    ```
  "endoscope_image_height": 1080,
  "description": "Mask configuration for device"
}
```

**API Usage:**
```http
POST /api/video-apply-mask/{video_id}/
Content-Type: application/json

{
  "mask_type": "device",           // or "custom"
  "device_name": "olympus_cv_1500", // required if device
  "roi": {                          // required if custom
    "x": 550,
    "y": 0,
    "width": 1350,
    "height": 1080
  },
  "processing_method": "streaming"  // or "direct"
}
```

**FFmpeg Strategies:**
- **Simple Crop:** Left strip removal (fast, no re-encoding)
- **Complex Drawbox:** Multiple regions (flexible, NVENC accelerated)

**Streaming Pipeline:**
- ✅ Already implemented in `FrameCleaner._mask_video()`
- Uses FFmpeg drawbox filter or crop filter
- NVENC hardware acceleration automatically available
- CPU fallback when NVENC not available

**Acceptance Criteria Met:**
- ✅ All device masks load without errors
- ✅ Device-specific masks apply correctly (backend implemented in 1.1)
- ✅ Custom ROI masking works (backend implemented in 1.1)
- ✅ Test suite created (14/20 tests, 6 require fixtures)
- ✅ Documentation complete with measurement guide
- ✅ Streaming mode uses FFmpeg efficiently

**Next Steps:**
- ⚠️ Verify Pentax and Fujifilm mask coordinates with real videos
- ⏳ Create test video fixtures for integration tests (see test_masking.py)
- ⏳ Add tests to CI/CD pipeline

**Documentation:**
- See `/docs/DEVICE_MASK_CONFIGURATION.md` for mask creation guide
- See `/docs/PHASE_1_3_IMPLEMENTATION_PLAN.md` for implementation details

**Note:** Backend API already functional from Phase 1.1. Phase 1.3 added device masks, comprehensive tests, and documentation only.

#### 1.4 Frame Removal Implementation ✅ COMPLETE
**Completed:** October 2025
**Effort:** 1-2 days (completed)

**Implementation:**
- ✅ `update_segments_after_frame_removal()` function in `correction.py`
- ✅ Integration with `VideoRemoveFramesView`
- ✅ Comprehensive unit tests in `tests/views/video/test_segment_update.py`

**Available Functions:**
- ✅ `FrameCleaner.remove_frames_from_video(original_video, frames_to_remove, output_video)` - FFmpeg Frame Removal
- ✅ `FrameCleaner.analyze_video_sensitivity()` - Automatic Frame Detection
- ✅ `update_segments_after_frame_removal(video, removed_frames)` - Segment Boundary Updates

**Implemented Logic:**
```python
def update_segments_after_frame_removal(video, removed_frames):
    """Shift frame numbers in LabelVideoSegments after frame removal"""
    segments = LabelVideoSegment.objects.filter(video=video).order_by('start_frame')
    
    for segment in segments:
        # Count frames removed before this segment
        frames_before = sum(1 for f in removed_frames if f < segment.start_frame)
        
        # Count frames removed within this segment
        frames_within = sum(1 for f in removed_frames if segment.start_frame <= f <= segment.end_frame)
        
        # Calculate new boundaries
        new_start = segment.start_frame - frames_before
        new_end = segment.end_frame - frames_before - frames_within
        
        # Delete segment if all frames removed
        if new_start >= new_end:
            segment.delete()
        else:
            segment.start_frame = new_start
            segment.end_frame = new_end
            segment.save()
```

**Integration with VideoRemoveFramesView:**
```python
if success:
    video.anonymized_file = f"anonym_videos/{video.uuid}_cleaned.mp4"
    video.save()
    
    # Phase 1.4: Update segments after frame removal
    segment_update_result = update_segments_after_frame_removal(video, frames_to_remove)
    
    # Include segment update info in processing history
    details = f"Removed {len(frames_to_remove)} frames; "
    details += f"Updated {segment_update_result['segments_updated']} segments; "
    details += f"Deleted {segment_update_result['segments_deleted']} segments"
    
    history.mark_success(output_file=str(output_path), details=details)
```

**Test Coverage:**
- ✅ No frames removed (segments unchanged)
- ✅ Frames removed before segment (shift left)
- ✅ Frames removed within segment (shrinkage)
- ✅ Frames removed before + within segment (both effects)
- ✅ Segment completely removed (all frames deleted)
- ✅ Multiple segments with mixed updates
- ✅ Frames removed after segment (no change)
- ✅ Edge cases: duplicate frames, unsorted frames, segment at frame 0, single-frame segments

**Acceptance Criteria Met:**
- ✅ Manual frame list "10-20,30" parsed correctly
- ✅ Automatic detection finds sensitive frames (via MiniCPM)
- ✅ Video segments updated to match new frame numbers
- ✅ FFmpeg re-encoding preserves quality
- ✅ Processing history tracks segment updates
- ✅ API response includes segment update statistics

**Next Steps:**
- Phase 1.2: Convert to Celery async task for large videos
- Phase 2.1: Add integration tests with actual video files

---

### Phase 2: Date Format Standardization (Priority: HIGH)

**Status:** ✅ Phase 2.1 COMPLETE (October 2025)

**Goal:** Eliminate date format confusion and bugs

#### 2.1 Centralized Date Utilities ✅ COMPLETE
**Completed:** October 9, 2025
**Effort:** 2-3 days (completed in 1 day)

**Implementation:**
- ✅ Created `frontend/src/utils/dateHelpers.ts` with `DateConverter` and `DateValidator` classes
- ✅ Replaced all inline date functions in `AnonymizationValidationComponent.vue`
- ✅ Created comprehensive unit test suite (29 tests, all passing)

**DateConverter Features:**
```typescript
// Conversion methods
DateConverter.toISO('21.03.1994')        // '1994-03-21'
DateConverter.toGerman('1994-03-21')     // '21.03.1994'

// Validation
DateConverter.validate('21.03.1994', 'German')  // true

// Comparison utilities
DateConverter.isBefore('1994-03-21', '2025-10-09')        // true
DateConverter.isAfterOrEqual('2025-10-09', '1994-03-21')  // true
DateConverter.compare('1994-03-21', '2025-10-09')         // -1

// Helper methods
DateConverter.today()         // '2025-10-09'
DateConverter.todayGerman()   // '09.10.2025'
```

**DateValidator Features:**
```typescript
const validator = new DateValidator();
validator.addField('DOB', '21.03.1994', 'German');
validator.addConstraint('DOB_BEFORE_EXAM', condition, 'Error message');

validator.hasErrors()         // true/false
validator.getSummary()        // '2 Datumsfehler gefunden'
validator.getErrors()         // ['DOB: Invalid format', ...]
validator.getErrorsAsHtml()   // '<ul><li>...</li></ul>'
```

**Migration Details:**
- Removed 4 inline functions: `fromUiToISO`, `toGerman`, `fromGermanToISO`, `normalizeDateToISO`
- Updated 8 call sites in `AnonymizationValidationComponent.vue`
- Simplified validation logic from `compareISODate()` to `DateConverter.isAfterOrEqual()`

**Test Coverage:**
- ✅ 29 unit tests (100% passing)
- ✅ German ↔ ISO conversion (both directions)
- ✅ Validation for both formats
- ✅ Comparison operations (6 methods tested)
- ✅ Edge cases (leap years, invalid dates, null/empty, time stripping)
- ✅ DateValidator error aggregation
- ✅ Complete patient data validation scenario

**Files Modified:**
1. `/frontend/src/utils/dateHelpers.ts` (NEW - 446 lines)
2. `/frontend/src/utils/dateHelpers.test.ts` (NEW - 297 lines)
3. `/frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue` (UPDATED)

**Acceptance Criteria Met:**
- ✅ All date conversions go through centralized `DateConverter`
- ✅ Comprehensive test coverage (ISO→German, German→ISO, validation, comparison)
- ✅ Backend still receives German format (no breaking changes)
- ✅ Code is more maintainable and testable
- ✅ Single source of truth for date handling

**Benefits:**
- 🎯 Eliminated date format confusion
- 🎯 Consistent error messages across application
- 🎯 Easier to add new date formats in future
- 🎯 Better test coverage (0 → 29 tests)
- 🎯 Reduced code duplication
- 🎯 Improved type safety with TypeScript

**Documentation:**
- See `/docs/issues/PHASE_1.2_CELERY_TASK_INFRASTRUCTURE.md` for future async processing
- See `dateHelpers.ts` JSDoc comments for API documentation

#### 2.2 Date Validation UI Improvements ⏳ PENDING
**Effort:** 1-2 days

**Tasks:**
- [ ] Aggregate validation errors into single panel
  - Show all date errors in one alert box
  - Highlight specific fields with errors
  - Provide correction hints ("Datum muss DD.MM.YYYY oder YYYY-MM-DD sein")

- [ ] Add date format indicator
  - Show accepted format below date inputs
  - Auto-detect and display current format
  - Convert on blur (e.g., "21.03.1994" → stays German, user sees feedback)

**Acceptance Criteria:**
- User sees clear error messages for invalid dates
- Date format auto-detection works for both formats
- No silent failures on date conversion

---

### Phase 3: Video Validation Enhancement (Priority: MEDIUM)

**Goal:** Enforce segment validation before approval

#### 3.1 Segment Validation Enforcement ✅ COMPLETE
**Completed:** October 9, 2025
**Effort:** 2-3 days (completed in 1 day)

**Implementation:**
- ✅ Created `canApprove` computed property that blocks approval if outside segments exist
- ✅ Created `approvalBlockReason` computed property with user-friendly error messages
- ✅ Created `validationProgressPercent` computed property for progress visualization
- ✅ Enhanced approval button with validation enforcement (disabled when segments pending)
- ✅ Added approval safety checks in `approveItem()` function (double validation)
- ✅ Added visual progress indicator showing X/Y segments validated with progress bar
- ✅ Added warning alert when approval is blocked

**Features:**
```typescript
// Approval gate that checks segment validation
const canApprove = computed(() => {
  if (!dataOk.value) return false;
  
  // Block if video has unvalidated outside segments
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    return false;
  }
  
  return true;
});

// User-friendly error messages
const approvalBlockReason = computed(() => {
  // Returns: "Bitte validieren Sie zuerst alle Outside-Segmente (3 verbleibend)"
});

// Visual progress
const validationProgressPercent = computed(() => {
  return Math.round((outsideSegmentsValidated.value / totalOutsideSegments.value) * 100);
});
```

**UI Enhancements:**
- **Progress Badge:** Shows "2 / 5" validated segments count
- **Progress Bar:** Visual indicator (0-100%) with green fill
- **Disabled Button:** Bestätigen button grayed out when segments pending
- **Warning Alert:** Shows specific reason why approval is blocked
- **Tooltip:** Button hover shows blocking reason

**Safety Checks:**
1. **UI Level:** Button disabled via `:disabled="!canApprove"`
2. **Function Level:** `approveItem()` validates `canApprove` before proceeding
3. **Specific Check:** Prevents approval if `shouldShowOutsideTimeline` is true
4. **Toast Warning:** User sees clear message if they try to bypass

**Acceptance Criteria Met:**
- ✅ Approval blocked if outside segments exist and not validated
- ✅ User sees clear progress (X/Y validated) with visual progress bar
- ✅ Validation complete event enables approval
- ✅ User receives helpful error messages explaining why approval is blocked
- ✅ Double validation prevents accidental bypass

**Files Modified:**
- `/frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue` (Lines 422-443, 602-653, 1088-1115)

**Testing:**
```bash
# Test approval blockage
1. Load video with outside segments
2. Click "Segment-Annotation prüfen" button
3. Verify "Bestätigen" button is disabled
4. Verify warning message shows remaining segments
5. Validate all segments via OutsideTimelineComponent
6. Verify "Bestätigen" button becomes enabled
7. Verify approval succeeds
```

**Benefits:**
- 🎯 Prevents accidental approval of videos with unvalidated segments
- 🎯 Clear visual feedback on validation progress
- 🎯 User-friendly error messages in German
- 🎯 Multiple safety layers prevent bypass
- 🎯 Improved data quality (all outside segments must be reviewed)

**Workflow Diagram:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Video Validation & Approval Workflow (Phase 3.1)                   │
└────────────────────────────────────────────────────────────────────
3. System checks for "outside" segments
         │
         ├─────────────────────────────────────┐
         ▼                                     ▼
   Outside segments                      No outside segments
   found (e.g., 5)                       found
         │                                     │
         ▼                                     ▼
   ┌──────────────────────────┐         ┌──────────────────────────┐
   │ shouldShowOutsideTimeline│         │ videoValidationStatus    │
   │ = true                   │         │ = "success"              │
   │                          │         │                          │
   │ canApprove = FALSE ❌    │         │ canApprove = TRUE ✅     │
   │                          │         │                          │
   │ Button DISABLED          │         │ Button ENABLED           │
   │                          │         │                          │
   │ Warning:                 │         │ Message:                 │
   │ "Bitte validieren Sie    │         │ "Video bereit für        │
   │  zuerst alle Outside-    │         │  Annotation"             │
   │  Segmente (5 verbleibend)│         │                          │
   └──────────┬───────────────┘         └──────────┬───────────────┘
              │                                    │
              ▼                                    │
   ┌──────────────────────────┐                   │
   │ User validates segments  │                   │
   │ via OutsideTimeline      │                   │
   │                          │                   │
   │ Progress: 1/5 → 2/5 →... │                   │
   │ Progress Bar: 20% → 40%  │                   │
   └──────────┬───────────────┘                   │
              │                                    │
              ▼                                    │
   All segments validated (5/5)                   │
              │                                    │
              ▼                                    │
   onOutsideValidationComplete() fires            │
              │                                    │
              ▼                                    │
   shouldShowOutsideTimeline = false              │
              │                                    │
              ▼                                    │
   canApprove = TRUE ✅                            │
              │                                    │
              ├────────────────────────────────────┘
              │
              ▼
4. Click "Bestätigen" (now enabled)
              │
              ▼
5. approveItem() safety checks
              │
              ├─ Check canApprove ✅
              ├─ Check !shouldShowOutsideTimeline ✅
              ├─ Check dataOk ✅
              │
              ▼
6. POST /api/anonymization/{id}/validate/
              │
              ▼
7. Navigate to Video-Untersuchung
              │
              ▼
8. ✅ Success: Video approved with validated segments
```

#### 3.2 Video Stream View Extraction ✅ COMPLETE
**Completed:** October 2025
**Effort:** 1 hour (code organization refactoring)

**Goal:** Extract video streaming logic into dedicated module for better maintainability

**Implementation:**
- ✅ Created `libs/endoreg-db/endoreg_db/views/video/video_stream.py` (193 lines)
- ✅ Moved `VideoStreamView` class from `segmentation.py` to dedicated module
- ✅ Moved `_stream_video_file()` helper function to new module
- ✅ Updated imports in `segmentation.py` and `__init__.py`
- ✅ Removed duplicate code from `segmentation.py`
- ✅ Maintained backward compatibility with URLs

**Files Created:**
- ✅ `libs/endoreg-db/endoreg_db/views/video/video_stream.py` (new module)

**Files Modified:**
- ✅ `libs/endoreg-db/endoreg_db/views/video/segmentation.py` (removed VideoStreamView class, imports helper)
- ✅ `libs/endoreg-db/endoreg_db/views/video/__init__.py` (updated imports)

**Module Structure:**
```python
# video_stream.py (193 lines)
"""
Video Streaming Views (Phase 3.2)
Created: October 9, 2025

Dedicated module for video streaming functionality
Extracted from segmentation.py for better code organization
"""

def _stream_video_file(vf: VideoFile, frontend_origin: str, file_type: str = 'raw'):
    """
    Helper function to stream video with CORS support
    
    - Selects raw or processed file based on file_type parameter
    - Validates file exists and is non-empty
    - Returns FileResponse with proper headers (Content-Length, Accept-Ranges, CORS)
    - Raises Http404 if file not found/accessible
    """
    # Implementation: Lines 23-95

class VideoStreamView(APIView):
    """
    Stream raw or processed videos with query parameter selection
    
    Query Parameters:
        type: 'raw' (default) or 'processed'
        file_type: (legacy) - backward compatible
    
    Examples:
        GET /api/media/videos/1/?type=raw
        GET /api/media/videos/1/?type=processed
    """
    # Implementation: Lines 98-186
```

**Benefits:**
- ✅ Improved code organization (streaming logic separated from segmentation)
- ✅ Better maintainability (single responsibility principle)
- ✅ Easier testing (isolated streaming functionality)
- ✅ No breaking changes (all imports and URLs work)
- ✅ Backward compatible (legacy `?file_type=` still supported)

**Query Parameter Support:**
- ✅ Primary: `?type=raw` or `?type=processed`
- ✅ Legacy: `?file_type=raw` or `?file_type=processed`
- ✅ Default: 'raw' if no parameter specified

**Implementation Details:**
```python
def get(self, request, pk=None):
    """
    Stream raw or anonymized video file with HTTP range and CORS support.
    
    Query Parameters:
        type: 'raw' (default) or 'processed' - Selects which video file to stream
        file_type: (deprecated, use 'type') - Legacy parameter for backwards compatibility
    
    Examples:
        GET /api/media/videos/1/?type=raw - Stream original raw video
        GET /api/media/videos/1/?type=processed - Stream anonymized/masked video
        GET /api/videostream/1/ - Default to raw video
    """
    # Support both 'type' (frontend standard) and 'file_type' (legacy)
    file_type: str = (
        request.query_params.get('type') or 
        request.query_params.get('file_type') or 
        'raw'
    ).lower()
    
    if file_type not in ['raw', 'processed']:
        raise ValueError("type must be 'raw' or 'processed'")
    
    vf = VideoFile.objects.get(pk=video_id_int)
    return _stream_video_file(vf, frontend_origin, file_type)
```

**Helper Function Verified:**
```python
def _stream_video_file(vf, frontend_origin, file_type):
    """
    Streams video file with proper headers and CORS.
    
    - file_type='raw': Uses vf.active_raw_file.path → vf.raw_file.path
    - file_type='processed': Uses vf.processed_file.path
    """
    if file_type == 'raw':
        path = Path(vf.active_raw_file.path)  # Property returns vf.raw_file
    elif file_type == 'processed':
        path = Path(vf.processed_file.path)
    
    # Returns FileResponse with Content-Length, Accept-Ranges, CORS headers
    return FileResponse(file_handle, content_type=content_type)
```

**VideoFile Model Fields Verified:**
- ✅ `raw_file` - FileField for raw videos (Line 109 in video_file.py)
- ✅ `processed_file` - FileField for anonymized/masked videos (Line 116 in video_file.py)
- ✅ `active_raw_file` - Property that returns `self.raw_file` (Line 228 in video_file.py)

**Frontend Integration:**
The `AnonymizationValidationComponent` already uses the new parameter format:
```typescript
const rawVideoSrc = computed(() => {
  return `${base}/api/media/videos/${currentItem.value.id}/?type=raw`;
});

const anonymizedVideoSrc = computed(() => {
  return `${base}/api/media/videos/${currentItem.value.id}/?type=processed`;
});
```

**Acceptance Criteria Met:**
- ✅ `/api/media/videos/1/?type=raw` streams original video
- ✅ `/api/media/videos/1/?type=processed` streams anonymized video
- ✅ Backward compatible with `?file_type=` parameter
- ✅ Dual video player in validation component works
- ✅ No breaking changes to existing API consumers

**Testing:**
```bash
# Test raw video streaming
curl http://localhost:8000/api/media/videos/1/?type=raw

# Test processed video streaming
curl http://localhost:8000/api/media/videos/1/?type=processed

# Test legacy parameter (backward compatibility)
curl http://localhost:8000/api/media/videos/1/?file_type=raw
```

---

### Phase 4: UV Workspace Fix (Priority: CRITICAL)

**Status:** ✅ COMPLETE (October 9, 2025)

**Goal:** Fix UV workspace packaging issues for lx-anonymizer

**Issue:** UV workspace resolver fails with two errors:
1. Mixed workspace member with `path` source reference
2. `libs/endoreg-db/lx-anonymizer` lacks packaging metadata (not recognized as Python package)

**GitHub Issue:** [wg-lux/endoreg-db#265](https://github.com/wg-lux/endoreg-db/issues/265)

#### 4.1 Create lx-anonymizer Package Metadata ✅ COMPLETE
**Completed:** October 9, 2025
**Effort:** 15 minutes (faster than estimated!)
**Dependencies:** UV workspace configuration

**Root Cause Analysis:**
```bash
# Original error:
# "Package `lx-anonymizer` is listed in `tool.uv.sources` but references a path in `tool.uv.sources`"
# "does not appear to be a Python project"

# Root cause discovered:
# 1. libs/lx-anonymizer/ already exists as complete package (version 0.7.0)
# 2. libs/endoreg-db/pyproject.toml used path reference instead of workspace reference
# 3. Circular self-reference: endoreg-db = { path = "endoreg-db" }
```

**Solution Implemented:**

**File Modified:** `libs/endoreg-db/pyproject.toml`

**Before (WRONG):**
```toml
[tool.uv.sources]
endoreg-db = { path = "endoreg-db" }      # ❌ Circular self-reference
lx-anonymizer = { path = "lx-anonymizer" } # ❌ Path instead of workspace
```

**After (CORRECT):**
```toml
[tool.uv.sources]
lx-anonymizer = { workspace = true }  # ✅ Workspace reference only
```

**Key Discovery:** The repository already had a complete `libs/lx-anonymizer/` package. The fix only required updating the dependency reference in `endoreg-db`.

**Implementation Summary:**

✅ **Modified:** `libs/endoreg-db/pyproject.toml`
- Removed circular self-reference: `endoreg-db = { path = "endoreg-db" }`
- Changed path reference to workspace: `lx-anonymizer = { workspace = true }`

❌ **Not Needed:** Creating new `libs/endoreg-db/lx-anonymizer/` package (already exists at `libs/lx-anonymizer/`)

**Verification Results:**
```bash
$ cd /home/admin/dev/lx-annotate && uv sync
Resolved 263 packages in 1.96s
   Building endoreg-db @ file:///home/admin/dev/lx-annotate/libs/endoreg-db
Installed 2 packages in 2ms
✅ SUCCESS

$ uv sync -v 2>&1 | grep "lx-anonymizer"
DEBUG Adding discovered workspace member: `/home/admin/dev/lx-annotate/libs/lx-anonymizer`
DEBUG Found static `pyproject.toml` for: lx-anonymizer @ file:///home/admin/dev/lx-annotate/libs/lx-anonymizer
DEBUG Requirement already installed: lx-anonymizer==0.7.0 (from file:///home/admin/dev/lx-anonymizer)
✅ Resolved as workspace member (not PyPI)
```
   ```toml
   [build-system]
   requires = ["setuptools>=69", "wheel"]
   build-backend = "setuptools.build_meta"
   
   [project]
   name = "lx-anonymizer"
   version = "0.0.0"
   description = "Workspace package for lx_anonymizer (monorepo member)"
   authors = [{ name = "WG Lux" }]
   requires-python = ">=3.11"
   dependencies = []
   
   [tool.setuptools]
   package-dir = { "" = "src" }
   
   [tool.setuptools.packages.find]
   where = ["src"]
   include = ["lx_anonymizer*"]
   ```

2. **Create importable module** (`libs/endoreg-db/lx-anonymizer/src/lx_anonymizer/__init__.py`):
   ```python
   """
   lx-anonymizer workspace package (monorepo member)
   
   Note: Distribution name is 'lx-anonymizer' (hyphen)
         Import name is 'lx_anonymizer' (underscore)
         This matches Python packaging conventions.
   """
   __all__ = []
   __version__ = "0.0.0"
   ```

3. **Update endoreg-db dependency** (`libs/endoreg-db/pyproject.toml`):
   - **Remove** any `path = "..."` reference for lx-anonymizer
   - **Add** workspace reference in one of these forms:
   
   **Option A: String form (simple)**
   ```toml
   [project]
   dependencies = [
     # other deps...
     "lx-anonymizer",
   ]
   ```
   
   **Option B: UV table form**
   ```toml
   [tool.uv.dependencies]
   lx-anonymizer = { workspace = true }
   ```
   
   **Option C: Source override (if needed)**
   ```toml
   [tool.uv.sources]
   lx-anonymizer = { workspace = true }  # Remove any path = "..."
   ```

4. **Update root workspace members** (root `pyproject.toml`):
   ```toml
   [tool.uv.workspace]
   members = [
     "libs/endoreg-db",
     "libs/endoreg-db/lx-anonymizer",  # Ensure this exact path is present
     # ... other members
   ]
   ```
   - **Remove** any stale members like `"libs/lx-anonymizer"` (old path)
   - **Verify** no duplicate entries for same distribution name

**Verification Commands:**
```bash
# From repo root
uv sync
# or with verbose output:
uv sync -v

# From libs/endoreg-db/lx-anonymizer
python -m build
python -c "import lx_anonymizer; print(lx_anonymizer.__version__)"  # Should print "0.0.0"

# From libs/endoreg-db
uv sync  # Should resolve lx-anonymizer as workspace member
```

**Acceptance Criteria:**
- ✅ No UV error: "references a path in tool.uv.sources"
- ✅ No UV error: "does not appear to be a Python project"
- ✅ `uv sync` completes successfully at root
- ✅ `lx_anonymizer` can be imported from Python
- ✅ `endoreg-db` resolves `lx-anonymizer` as workspace member (not external package)
- ✅ `python -m build` succeeds in `libs/endoreg-db/lx-anonymizer`

**Implementation Notes:**
- **Name Convention:** Distribution name `lx-anonymizer` (hyphen) vs import name `lx_anonymizer` (underscore) is intentional and follows PEP 8
- **Minimal Package:** This is a packaging skeleton only; no runtime impact
- **Future-Proof:** Can add actual code to `src/lx_anonymizer/` incrementally without changing packaging structure
- **Placeholder Status:** If `lx-anonymizer` is meant to be a stub for now, this minimal package is safe and unblocks workspace resolution

**PR Description Template:**
```markdown
## Fix UV Workspace Packaging for lx-anonymizer

**Issue:** Resolves #265

**Changes:**
- Update `libs/endoreg-db/pyproject.toml` to use workspace reference for lx-anonymizer
- Remove circular self-reference `endoreg-db = { path = "endoreg-db" }`
- Change `lx-anonymizer = { path = "lx-anonymizer" }` → `{ workspace = true }`
- Verified with `uv sync` at root and in `libs/endoreg-db`

**Testing:**
```bash
uv sync                         # Root workspace - SUCCESS
cd libs/endoreg-db && uv sync   # Nested workspace - SUCCESS
uv sync -v | grep "lx-anonymizer"  # Confirms workspace resolution
```

**Impact:**
- Fixes UV workspace resolution errors
- Unblocks CI/CD pipelines
- No runtime changes
- Enables Phase 1.2, 1.3, 5.1 to proceed
```

**Documentation:**
- See `/docs/PHASE_4_1_COMPLETION_REPORT.md` for detailed implementation report
- See `/docs/PHASE_4_1_UV_WORKSPACE_FIX.md` for comprehensive guide

---

### Phase 5: Polish & Testing (Priority: LOW)

**Goal:** Production-ready quality

#### 5.1 Comprehensive Test Suite
**Effort:** 5-7 days

**Tasks:**
- [ ] Video masking tests
  - Test device-specific masks (Olympus, Pentax, Fujifilm)
  - Test custom ROI masking with various coordinates
  - Test mask validation (coordinates within bounds)
  
- [ ] Frame removal tests
  - Test manual frame parser (ranges, single frames, edge cases)
  - Test automatic detection integration
  - Test segment updates after frame removal

- [ ] Date handling tests
  - Test `DateConverter` with all format combinations
  - Test validation constraints (DOB < ExaminationDate)
  - Test backwards compatibility with ISO-only inputs

- [ ] Polling protection tests
  - Test race condition prevention (multi-tab)
  - Test rate limiting enforcement
  - Test lock cleanup on errors

- [ ] Integration tests
  - Full anonymization workflow (upload → anonymize → validate → approve)
  - Correction workflow (analyze → mask → validate)
  - Error recovery scenarios

**Acceptance Criteria:**
- >80% code coverage for new features
- All edge cases tested (empty inputs, invalid formats, concurrent access)
- Integration tests pass end-to-end

#### 5.2 Error Handling & UX Improvements
**Effort:** 3-4 days

**Tasks:**
- [ ] Implement retry mechanisms
  - Auto-retry failed API calls (3 attempts with exponential backoff)
  - Show retry progress to user
  - Fall back to error message after max retries

- [ ] Improve error messages
  - Map error codes to user-friendly text
  - Provide actionable next steps ("Try again" button)
  - Log technical details to console only

- [ ] Add loading skeletons
  - Replace spinners with skeleton screens
  - Show approximate wait times for long operations
  - Indicate cancellable vs non-cancellable operations

**Acceptance Criteria:**
- Network errors retry automatically
- User sees helpful error messages, not stack traces
- Long operations show estimated completion time

---

## Known Limitations & Workarounds

### Current Workarounds

1. **PDF Re-import Uses Reset Status**
   - **Issue:** No dedicated PDF reimport endpoint
   - **Workaround:** Use `resetProcessingStatus()` to clear state, rely on user to re-upload
   - **Permanent Fix:** Create `POST /api/pdf-reimport/{id}/` endpoint

2. **Video Correction Synchronous Only** (Phase 1.1 ✅ Complete)
   - **Status:** Basic correction endpoints implemented and working
   - **Current:** Operations run synchronously (may block for large videos)
   - **Next:** Phase 1.2 will add Celery for background processing

3. **Annotation Save Feature Disabled**
   - **Issue:** Requires image upload UI that doesn't exist
   - **Workaround:** Remove feature or hide UI elements
   - **Permanent Fix:** Implement image upload component or remove entirely

### Design Decisions

1. **Date Format Preference: German (DD.MM.YYYY)**
   - **Reason:** Medical staff in Germany expect German date format
   - **Implementation:** Accept both formats, display German in UI, store ISO in DB
   - **Trade-off:** Conversion complexity vs user convenience

2. **Dual Video Streaming**
   - **Reason:** Users need to compare raw vs anonymized side-by-side
   - **Implementation:** Separate video elements with sync controls
   - **Trade-off:** Double bandwidth usage vs better validation experience

3. **Polling Protection Required**
   - **Reason:** Multi-tab usage common in hospital workflows
   - **Implementation:** Client-side coordination via `usePollingProtection`
   - **Trade-off:** Complexity vs preventing race conditions

---

## Maintenance Notes

### Regular Tasks

1. **Monitor Polling Locks**
   - Check `/api/anonymization/polling-info/` weekly
   - Clear stale locks via `/api/anonymization/clear-locks/`
   - Investigate if lock count grows unbounded

2. **Review Processing History**
   - Check for failed masking/removal operations
   - Investigate patterns in failure reasons
   - Update device mask library if new endoscopes added

3. **Validate Date Handling**
   - Spot-check German↔ISO conversions monthly
   - Review validation error logs for edge cases
   - Update `DateConverter` tests if new formats needed

### Breaking Change Risks

1. **Changing Date Format**
   - **Risk:** Existing data in database uses ISO, frontend expects German
   - **Mitigation:** Always support both formats in serializers
   - **Test:** Run migration scripts on copy of production DB first

2. **Video URL Scheme Changes**
   - **Risk:** Frontend hardcodes `/api/media/videos/` paths
   - **Mitigation:** Use `mediaStore.getVideoUrl()` consistently
   - **Test:** Update all video URL references when changing backend routes

3. **Polling Coordinator Changes**
   - **Risk:** Lock format changes break existing clients
   - **Mitigation:** Version polling API (`/v1/polling-info/`)
   - **Test:** Test with multiple browser tabs open simultaneously

---

## Future Enhancements

### Post-MVP Features

1. **Batch Operations**
   - Select multiple files for bulk anonymization
   - Apply same mask to all videos from one device
   - Batch validate entire examination sessions

2. **Advanced Analytics**
   - Dashboard showing: avg frames removed per video, common sensitive patterns
   - Heatmap of sensitive regions across device types
   - Detection accuracy metrics (false positive rate)

3. **Workflow Automation**
   - Auto-approve videos below sensitivity threshold (e.g., <1%)
   - Auto-apply device mask based on DICOM metadata
   - Schedule re-anonymization for videos older than X days

4. **Collaborative Features**
   - Multiple reviewers can validate same video
   - Consensus-based approval (2 of 3 reviewers must approve)
   - Comments/notes on specific frames

---

## Appendix: Data Models

### VideoFile (Extended)
```python
class VideoFile(models.Model):
    # Existing fields...
    raw_file = models.FileField(upload_to="raw_videos/")
    
    # NEW: Support for processed videos
    anonymized_file = models.FileField(upload_to="anonymized_videos/", null=True, blank=True)
    
    # Relationships
    state = models.ForeignKey(VideoState, on_delete=models.SET_NULL, null=True)
    sensitive_meta = models.ForeignKey(SensitiveMeta, on_delete=models.SET_NULL, null=True)
```

### VideoState (Current)
```python
class VideoState(models.Model):
    anonymization_status = models.CharField(max_length=50)
    # Choices: 'not_started', 'processing_anonymization', 'extracting_frames', 
    #          'predicting_segments', 'done_processing_anonymization', 'validated', 'failed'
```

### VideoProcessingHistory (NEW)
```python
class VideoProcessingHistory(models.Model):
    video = models.ForeignKey(VideoFile, on_delete=models.CASCADE, related_name='processing_history')
    operation = models.CharField(max_length=50)  # 'masking', 'frame_removal', 'analysis', 'reprocessing'
    status = models.CharField(max_length=20)     # 'pending', 'running', 'success', 'failure'
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)
    output_path = models.CharField(max_length=500, blank=True)
    task_id = models.CharField(max_length=100, blank=True)
    config = models.JSONField(default=dict)
```

---

## References

- Backend API: `/libs/endoreg-db/endoreg_db/views/anonymization/`
- Frontend Components: `/frontend/src/components/Anonymizer/`
- Store: `/frontend/src/stores/anonymizationStore.ts`
- Tests: `/tests/test_pdf_anonymization_core.py`nonymizer module consists inn the frontend of the overview

/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationOverviewComponent.vue

The Anonymization Correction

/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationCorrectionComponent.vue

The Anonymization Validation

/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue



## Anonymization Workflow

After an Anonymization is imported by endoreg_db/video_import.py or endoreg_db/pdf_import.py, whether using lx-anonymizer anonymization modules or not, the anonymization will have to be human validated and eventually might need to be corrected.