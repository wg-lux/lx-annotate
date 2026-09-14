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
          <div
            v-if="file.quarantined"
            class="small text-warning mt-1 quarantine-file-note"
          >
            Import blockiert: Datei liegt in Quarantäne.
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
          :disabled="action.intent === 'retry-import' ? retryProcessing : processing"
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
          v-if="file.anonymizationStatus === 'processing_anonymization'"
          class="btn btn-outline-info"
          disabled
        >
          <i class="ni ni-settings-gear-65 ni-spin me-1"></i>
          Anonymisierung...
        </button>
        <button
          v-if="file.anonymizationStatus === 'extracting_frames'"
          class="btn btn-outline-info"
          disabled
        >
          <i class="ni ni-settings-gear-65 ni-spin me-1"></i>
          Einzelbilder werden extrahiert...
        </button>
      </div>
    </td>

    <!-- Upload Job Status -->
    <td>
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
    <td>
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
          <div class="small text-muted upload-job-text">
            Aktualisiert: {{ formatDate(materialization.updatedAt) }}
          </div>
          <div
            v-if="materialization.status === 'failed'"
            class="small text-danger upload-job-text"
          >
            HLS-Erzeugung fehlgeschlagen. Details sind im Server-Log verfügbar.
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
    <td>
      <span
        v-if="file.importOnly"
        class="text-muted"
        >-</span
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
      <span
        v-else
        :class="getStatusBadgeClass(file.annotationStatus)"
        class="badge"
      >
        {{ getStatusText(file.annotationStatus) }}
      </span>
    </td>

    <!-- Validation Action -->
    <td class="validation-action-column">
      <button
        v-if="file.anonymizationStatus === 'done_processing_anonymization'"
        class="btn btn-success btn-sm"
        :disabled="!readyForValidation"
        @click="emit('validate', file)"
      >
        <i class="ni ni-user-run me-1"></i>
        Validieren
      </button>
      <span
        v-else-if="file.anonymizationStatus === 'validated'"
        class="badge bg-success"
      >
        <i class="ni ni-check-bold me-1"></i>
        Validiert
      </span>
      <span
        v-else
        class="text-muted"
        >-</span
      >
    </td>

    <!-- Original File Cleanup -->
    <td>
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
}>()

const emit = defineEmits<(event: OverviewActionIntent | 'validate', file: FileItem) => void>()
const actions = computed(() => getOverviewActions(props.file))
</script>

<style scoped>
.overview-resource-row > * {
  vertical-align: middle;
  background-color: #fff;
}
.overview-resource-row:hover > * {
  background-color: var(--bs-table-hover-bg, #f8f9fa);
}
.overview-resource-row:hover .sticky-filename-column,
.overview-resource-row:hover .validation-action-column {
  background: var(--bs-table-hover-bg, #f8f9fa);
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
  background: #fff;
  box-shadow: 0.25rem 0 0.75rem rgba(0, 0, 0, 0.04);
  z-index: 2;
}
.validation-action-column {
  position: sticky;
  right: 0;
  min-width: 9rem;
  background: #fff;
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
