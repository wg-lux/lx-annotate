<template>
  <tr
    class="overview-resource-row"
    :class="{ 'table-warning': file.quarantined }"
  >
    <!-- Filename -->
    <td class="sticky-filename-column">
      <div class="d-flex align-items-start filename-cell-content">
        <i
          :class="iconClass"
          class="me-2 flex-shrink-0"
        ></i>
        <div class="filename-details">
          <span class="fw-medium filename-text">{{ getFileDisplayName(file) }}</span>
          <div class="small text-muted mt-1">
            {{ getFileIdLabel(file) }}
          </div>
        </div>
      </div>
    </td>

    <!-- Media Type -->
    <td>
      <span
        :class="mediaTypeBadgeClass"
        class="badge"
      >
        {{ file.mediaType.toUpperCase() }}
      </span>
    </td>
    <!-- Actions -->
    <td>
      <div
        v-if="file.quarantined"
        class="small text-warning quarantine-action-note"
      >
        Serverseitige Quarantäne
        <div
          v-if="getQuarantineReviewLabel(file)"
          class="text-muted mt-1"
        >
          {{ getQuarantineReviewLabel(file) }}
        </div>
      </div>
      <div
        v-else
        class="btn-group btn-group-sm"
        role="group"
      >
        <button
          v-for="action in actions"
          :key="action.intent"
          :class="action.buttonClass"
          :data-test="action.testSelector"
          :title="action.title"
          :aria-label="action.ariaLabel"
          :disabled="
            action.intent === 'retry-import' || action.intent === 'cancel-import'
              ? retryProcessing
              : processing
          "
          @click="emit(action.intent, file)"
        >
          <i
            v-if="action.icon"
            :class="action.icon"
          ></i>
          {{ action.label }}
        </button>

        <!-- Processing indicator -->
        <button
          v-if="
            file.anonymizationStatus === 'processing_anonymization' && !isImportInterrupted(file)
          "
          class="btn btn-outline-info"
          disabled
        >
          <i class="ni ni-settings-gear-65 ni-spin me-1"></i>
          Anonymisierung...
        </button>
        <button
          v-if="file.anonymizationStatus === 'extracting_frames' && !isImportInterrupted(file)"
          class="btn btn-outline-info"
          disabled
        >
          <i class="ni ni-settings-gear-65 ni-spin me-1"></i>
          Einzelbilder werden extrahiert...
        </button>
      </div>
    </td>
    <td class="validation-action-column">
      <div class="d-flex flex-column gap-1">
        <!-- State 1: Ready for Validation / Annotation -->
        <template v-if="file.anonymizationStatus === 'done_processing_anonymization'">
          <button
            class="btn btn-success btn-sm"
            :disabled="!readyForValidation"
            @click="emit('validate', file)"
          >
            <i class="ni ni-user-run me-1"></i>
            Anonymisierung validieren
          </button>

          <button
            v-if="file.mediaType.toUpperCase() === 'VIDEO'"
            class="btn btn-outline-primary btn-sm"
            :disabled="!readyForValidation"
            @click="emit('annotate', file)"
          >
            <i class="ni ni-tag me-1"></i>
            Segmentannotation
          </button>
        </template>

        <!-- State 2: Already Validated -->
        <template v-else-if="file.anonymizationStatus === 'validated'">
          <span class="badge bg-success">
            <i class="ni ni-check-bold me-1"></i>
            Anonymisierung validiert
          </span>
        </template>

        <!-- State 3: Processing Failed -->
        <template v-else-if="file.anonymizationStatus === 'failed'">
          <button
            class="btn btn-outline-danger btn-sm"
            title="Zur Korrektur öffnen"
            @click="emit('correct', file)"
          >
            <i class="ni ni-settings-gear-65 me-1"></i>
            Korrektur
          </button>
        </template>

        <!-- State 4: Default / Pending -->
        <template v-else>
          <span class="text-muted small">Bitte abwarten</span>
        </template>
      </div>
    </td>
    <!-- Clinical Status -->
    <td data-test="clinical-status">
      <span
        class="badge"
        :class="getClinicalStatusBadgeClass(clinicalStatus)"
      >
        {{ clinicalStatus.label }}
      </span>
      <div
        v-if="clinicalStatus.hint"
        class="small text-muted mt-1 clinical-status-hint"
      >
        {{ clinicalStatus.hint }}
      </div>
      <span
        v-if="!technicalDetails && hasHiddenTechnicalIssue(file)"
        class="badge bg-light text-dark border d-inline-block mt-1"
        data-test="technical-issue-marker"
        title="Details unter „Technische Details“"
      >
        <i
          class="ni ni-settings-gear-65 me-1"
          aria-hidden="true"
        ></i>
        Technischer Hinweis
      </span>
    </td>

    <!-- Upload Job Status -->
    <td v-if="technicalDetails">
      <div
        v-if="file.uploadJob"
        class="upload-job-summary"
      >
        <span
          class="badge"
          :class="getUploadJobStatusBadgeClass(file.uploadJob.status)"
        >
          {{ getUploadJobStatusText(file.uploadJob.status) }}
        </span>
        <progress
          v-if="
            ['pending', 'processing', 'retrying', 'cancel_requested'].includes(
              file.uploadJob.status
            )
          "
          class="job-progress d-block mt-1"
          :aria-label="`${getFileDisplayName(file)}: ${getUploadJobStatusText(file.uploadJob.status)}`"
        ></progress>
        <div
          v-if="getUploadJobOriginLabel(file.uploadJob)"
          class="small text-muted mt-1 upload-job-text"
        >
          {{ getUploadJobOriginLabel(file.uploadJob) }}
        </div>
        <div
          v-if="getUploadJobCleanupLabel(file.uploadJob)"
          class="small text-muted upload-job-text"
        >
          {{ getUploadJobCleanupLabel(file.uploadJob) }}
        </div>
        <div
          v-if="file.uploadJob.updatedAt"
          class="small text-muted upload-job-text"
        >
          Aktualisiert: {{ formatDate(file.uploadJob.updatedAt) }}
        </div>
        <div
          v-if="getUploadJobNotice(file)"
          class="small mt-1 upload-job-text"
          :class="getUploadJobNoticeClass(file)"
        >
          {{ getUploadJobNotice(file) }}
        </div>
      </div>
      <span
        v-else
        class="text-muted"
        >-</span
      >
    </td>

    <!-- HTTP Live Streaming Materialization -->
    <td v-if="technicalDetails">
      <div
        v-if="visibleHlsMaterializations(file).length"
        class="hls-materialization-summary"
      >
        <div
          v-for="materialization in visibleHlsMaterializations(file)"
          :key="materialization.artifactKind"
          class="mb-1"
        >
          <span
            class="badge"
            :class="getHlsStatusBadgeClass(materialization.status)"
          >
            {{ getHlsArtifactKindText(materialization.artifactKind) }}:
            {{ getHlsStatusText(materialization.status) }}
          </span>
          <progress
            v-if="['queued', 'materializing'].includes(materialization.status)"
            class="job-progress d-block mt-1"
            :aria-label="`${getFileDisplayName(file)}: HLS ${getHlsArtifactKindText(materialization.artifactKind)} – ${getHlsStatusText(materialization.status)}`"
          ></progress>
          <div class="small text-muted upload-job-text">
            Aktualisiert: {{ formatDate(materialization.updatedAt) }}
          </div>
          <div
            v-if="materialization.status === 'failed'"
            class="small text-danger upload-job-text"
          >
            Stream-Erzeugung (HLS) fehlgeschlagen. Details sind im Server-Log verfügbar.
          </div>
        </div>
      </div>
      <span
        v-else
        class="text-muted"
        >-</span
      >
    </td>

    <!-- Anonymization Status -->
    <td v-if="technicalDetails">
      <span
        v-if="file.importOnly"
        class="text-muted"
        >-</span
      >
      <span
        v-else-if="isImportInterrupted(file)"
        class="badge bg-warning text-dark"
        >Verarbeitung unterbrochen</span
      >
      <span
        v-else
        :class="getStatusBadgeClass(file.anonymizationStatus)"
        class="badge"
      >
        <i
          v-if="file.anonymizationStatus === 'processing_anonymization'"
          class="ni ni-settings-gear-65 ni-spin me-1"
        ></i>
        {{ getStatusText(file.anonymizationStatus) }}
      </span>
    </td>

    <!-- Annotation Status -->
    <td>
      <span
        v-if="file.importOnly"
        class="text-muted"
        >-</span
      >
      <template v-else>
        <span
          :class="getStatusBadgeClass(file.annotationStatus)"
          class="badge"
        >
          {{ getStatusText(file.annotationStatus) }}
        </span>
        <span
          v-if="file.aiPredictionStatus"
          :class="getAiPredictionLabel(file.aiPredictionStatus).badgeClass"
          class="badge d-block mt-1"
          data-test="ai-prediction-status"
        >
          {{ getAiPredictionLabel(file.aiPredictionStatus).text }}
        </span>
      </template>
    </td>

    <!-- Original File Cleanup -->
    <td v-if="technicalDetails">
      <span :class="getOriginalFileDeletionClass(file)">
        <i
          :class="getOriginalFileDeletionIcon(file)"
          class="me-1"
        ></i>
        {{ getOriginalFileDeletionText(file) }}
      </span>
      <div
        v-if="getOriginalFileDeletionHint(file)"
        class="small text-muted raw-file-state-hint"
      >
        {{ getOriginalFileDeletionHint(file) }}
      </div>
    </td>

    <!-- Created Date -->
    <td>
      <small class="text-muted">
        {{ formatDate(file.createdAt) }}
      </small>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileItem } from '@/stores/anonymizationStore'
import {
  isImportInterrupted,
  getOverviewActions,
  type OverviewActionIntent,
  formatDate,
  getFileDisplayName,
  getFileIdLabel,
  getHlsArtifactKindText,
  getHlsStatusBadgeClass,
  getHlsStatusText,
  getOriginalFileDeletionClass,
  getOriginalFileDeletionHint,
  getOriginalFileDeletionIcon,
  getOriginalFileDeletionText,
  getQuarantineReviewLabel,
  getAiPredictionLabel,
  getClinicalStatus,
  getClinicalStatusBadgeClass,
  hasHiddenTechnicalIssue,
  getStatusBadgeClass,
  getStatusText,
  getUploadJobCleanupLabel,
  getUploadJobNotice,
  getUploadJobNoticeClass,
  getUploadJobOriginLabel,
  getUploadJobStatusBadgeClass,
  getUploadJobStatusText,
  visibleHlsMaterializations
} from './overviewPresentation'

const props = defineProps<{
  file: FileItem
  processing: boolean
  retryProcessing: boolean
  readyForValidation: boolean
  iconClass: string
  mediaTypeBadgeClass: string
  technicalDetails: boolean
}>()

// script setup
const emit = defineEmits<(event: OverviewActionIntent | 'validate' | 'annotate' | 'correct', file: FileItem) => void>()
// State repair is an operator tool; clinical staff only see workflow actions.
const actions = computed(() =>
  getOverviewActions(props.file).filter(
    (action) => props.technicalDetails || action.intent !== 'repair-video'
  )
)
const clinicalStatus = computed(() => getClinicalStatus(props.file))
</script>

<style scoped>
.overview-resource-row > * {
  vertical-align: middle;
  background-color: #fff;
}
.overview-resource-row:hover > * {
  background-color: #f8f9fa;
}
.overview-resource-row:hover .sticky-filename-column,
.overview-resource-row:hover .validation-action-column {
  background-color: #f8f9fa;
}
.clinical-status-hint {
  max-width: 14rem;
  white-space: normal;
}

.filename-cell-content,
.filename-details {
  min-width: 0;
  max-width: 100%;
}

.filename-text {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.upload-job-summary {
  width: 17rem;
  min-width: 0;
  max-width: 17rem;
}

.job-progress {
  width: 100%;
  max-width: 17rem;
  height: 0.75rem;
  accent-color: var(--bs-info, #0dcaf0);
}

.upload-job-summary .small,
.upload-job-text,
.raw-file-state-hint {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.badge {
  font-size: 0.75rem;
}

.sticky-filename-column {
  position: sticky;
  left: 0;
  width: 22rem;
  min-width: 18rem;
  max-width: 22rem;
  --bs-table-bg: #fff;
  box-shadow: 0.25rem 0 0.75rem rgba(0, 0, 0, 0.04);
  z-index: 2;
}
.validation-action-column {
  position: sticky;
  right: 0;
  min-width: 9rem;
  --bs-table-bg: #fff;
  box-shadow: -0.25rem 0 0.75rem rgba(0, 0, 0, 0.06);
  z-index: 2;
}

@media (max-width: 768px) {
  .btn-group-sm .btn {
    padding: 0.125rem 0.25rem;
    font-size: 0.7rem;
  }

  .sticky-filename-column {
    width: 15rem;
    min-width: 13rem;
    max-width: 15rem;
  }

  .upload-job-summary {
    width: 14rem;
    max-width: 14rem;
  }
}
</style>
