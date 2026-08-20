import { defineStore } from 'pinia'
import axiosInstance, { r } from '@/api/axiosInstance'
import axios from 'axios'
import { endpoints } from '@/types/api/endpoints'

export interface HubNodeSummary {
  nodeKey: string
  displayName: string
  baseUrl: string
  owningCenterKey: string | null
}

export type HubExportAnonymizationStatus =
  | 'not_started'
  | 'extracting_frames'
  | 'processing_anonymization'
  | 'done_processing_anonymization'
  | 'anonymized'
  | 'validated'
  | 'failed'
  | 'started'

export type HubExportSegmentAnnotationStatus =
  | 'not_started'
  | 'cleanup_required'
  | 'cleanup_queued'
  | 'cleanup_running'
  | 'cleanup_failed'
  | 'validated'

export type HubExportIntegrityStatus =
  | 'not_ready'
  | 'missing_processed_media'
  | 'missing_hash'
  | 'hash_metadata_mismatch'
  | 'persisted_verified'
  | 'verified'
  | 'processed_media_unreadable'
  | 'processed_media_hash_mismatch'

export interface HubExportItem {
  id: number
  resourceKind: 'video' | 'report'
  filename: string
  anonymizationStatus: HubExportAnonymizationStatus
  segmentAnnotationStatus: HubExportSegmentAnnotationStatus
  exportIntegrityStatus: HubExportIntegrityStatus
  processedMediaPresent: boolean
  sourceCenterKey: string | null
  sourceCenterName: string | null
  markedForUpload: boolean
  markedByUsername: string | null
  markedAt: string | null
  outboundJobId: string | null
  outboundStatus: string
  failureClass?:
    | 'configuration_rejection'
    | 'authorization_denial'
    | 'integrity_inconsistency'
    | 'transient_retry'
    | null
  lastError: string
  blockedReason?: string
  lastTransferTimestamp: string | null
  targetNodeKey: string | null
  eligible: boolean
  createdAt: string | null
}

export type HubExportRejectionReason =
  | 'missing_center'
  | 'not_ready_for_export'
  | 'missing_processed_file'
  | 'missing_processed_hash'
  | 'processed_hash_metadata_mismatch'
  | 'processed_file_hash_mismatch'
  | 'processed_file_unreadable'
  | 'segment_cleanup_pending'
  | 'segment_cleanup_failed'

export interface HubProcessedFile {
  resourceKind: 'video' | 'report'
  resourceId: number
  filename: string
  resourceHash: string
  processedFileHash: string | null
  centerKey: string
  centerName: string
  eligible: boolean
  transferRegistered: boolean
  transferKey: string | null
  transferStatus: string
  targetNodeKey: string | null
}

export interface HubSyncRejection {
  resourceKind: 'video' | 'report'
  resourceId: number
  filename: string
  centerKey: string | null
  reason: HubExportRejectionReason
  detail: string
}

export interface HubSyncDuplicate {
  resourceKind: 'video' | 'report'
  resourceId: number
  filename: string
  centerKey: string | null
  reason: 'transfer_already_registered'
  transferKey: string
  transferStatus: string
  targetNodeKey: string
}

export interface HubCenterSyncState {
  centerKey: string
  displayName: string
  activeNodeKeys: string[]
  processedFiles: HubProcessedFile[]
  candidateCount: number
  rejectionCount: number
  duplicateCount: number
}

export interface HubFileSyncSummary {
  centers: HubCenterSyncState[]
  rejections: HubSyncRejection[]
  duplicates: HubSyncDuplicate[]
  processedFileCount: number
  candidateCount: number
}

export type HubExportPrivacyStatus = 'pass' | 'warning' | 'unavailable'

export interface HubExportPrivacySummary {
  minK: number
  eligibleResourceCount: number
  eligibleCaseCount: number
  markedResourceCount: number
  smallestEquivalenceClassSize: number | null
  violatingEquivalenceClassCount: number
  passesKAnonymity: boolean
  status: HubExportPrivacyStatus
}

export interface HubExportOverviewResponse {
  selectedTargetNodeKey: string | null
  sourceNodeKey: string | null
  hubNodes: HubNodeSummary[]
  configReady: boolean
  configError: string
  privacySummary: HubExportPrivacySummary | null
  syncSummary: HubFileSyncSummary
  items: HubExportItem[]
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<{ detail?: string; error?: string }>(error)) return fallback
  const detail = (error.response?.data.detail || error.response?.data.error)?.trim()
  return detail || error.message || fallback
}

export interface VideoExportReadinessCandidate {
  id: number
  centerKey: string
}

export interface VideoExportReadinessResult {
  checkedCount: number
  failedCount: number
}

export interface HubEligibleVideoOffloadResult {
  targetNodeKey: string
  discoveredCount: number
  eligibleCount: number
  queuedCount: number
  alreadyRegisteredCount: number
  skippedCount: number
}

export interface HubExportRetryResult {
  outboundJobId: string
  transferKey: string
  localStatus: string
}

export const useHubExportStore = defineStore('hubExport', {
  state: () => ({
    loading: false,
    error: null as string | null,
    mutationError: null as string | null,
    selectedTargetNodeKey: null as string | null,
    sourceNodeKey: null as string | null,
    hubNodes: [] as HubNodeSummary[],
    items: [] as HubExportItem[],
    configReady: false,
    configError: '',
    privacySummary: null as HubExportPrivacySummary | null,
    syncSummary: null as HubFileSyncSummary | null
  }),
  getters: {
    eligibleItems: (state) => state.items.filter((item) => item.eligible),
    markedItems: (state) => state.items.filter((item) => item.markedForUpload)
  },
  actions: {
    async fetchOverview(targetNodeKey?: string | null) {
      this.loading = true
      this.error = null
      try {
        const params = targetNodeKey ? { target_node_key: targetNodeKey } : undefined
        const { data } = await axiosInstance.get<HubExportOverviewResponse>(
          r(endpoints.hubExport.overview),
          { params }
        )
        this.selectedTargetNodeKey = data.selectedTargetNodeKey
        this.sourceNodeKey = data.sourceNodeKey
        this.hubNodes = data.hubNodes
        this.items = data.items
        this.configReady = data.configReady
        this.configError = data.configError
        this.privacySummary = data.privacySummary
        this.syncSummary = data.syncSummary
        return data
      } catch (error: unknown) {
        this.error =
          (axios.isAxiosError<{ detail?: string }>(error)
            ? error.response?.data.detail || error.message
            : error instanceof Error
              ? error.message
              : null) || 'Fehler beim Laden der Hub-Export-Übersicht.'
        throw error
      } finally {
        this.loading = false
      }
    },
    async markResources(resources: Array<{ id: number; resourceKind: 'video' | 'report' }>) {
      if (!this.selectedTargetNodeKey) {
        throw new Error('Kein Hub-Ziel ausgewählt.')
      }
      this.mutationError = null
      try {
        await axiosInstance.post(r(endpoints.hubExport.mark), {
          targetNodeKey: this.selectedTargetNodeKey,
          resources
        })
        await this.fetchOverview(this.selectedTargetNodeKey)
      } catch (error: unknown) {
        this.mutationError = mutationErrorMessage(
          error,
          'Die ausgewählten Ressourcen konnten nicht für den Hub-Export vorgemerkt werden.'
        )
        throw error
      }
    },
    async unmarkResources(resources: Array<{ id: number; resourceKind: 'video' | 'report' }>) {
      if (!this.selectedTargetNodeKey) {
        throw new Error('Kein Hub-Ziel ausgewählt.')
      }
      this.mutationError = null
      try {
        await axiosInstance.post(r(endpoints.hubExport.unmark), {
          targetNodeKey: this.selectedTargetNodeKey,
          resources
        })
        await this.fetchOverview(this.selectedTargetNodeKey)
      } catch (error: unknown) {
        this.mutationError = mutationErrorMessage(
          error,
          'Die Vormerkung der ausgewählten Ressourcen konnte nicht aufgehoben werden.'
        )
        throw error
      }
    },
    async offloadEligibleVideos(): Promise<HubEligibleVideoOffloadResult> {
      if (!this.selectedTargetNodeKey) {
        throw new Error('Kein Hub-Ziel ausgewählt.')
      }
      this.mutationError = null
      try {
        const { data } = await axiosInstance.post<HubEligibleVideoOffloadResult>(
          r(endpoints.hubExport.offloadEligibleVideos),
          { targetNodeKey: this.selectedTargetNodeKey }
        )
        await this.fetchOverview(this.selectedTargetNodeKey)
        return data
      } catch (error: unknown) {
        this.mutationError = mutationErrorMessage(
          error,
          'Die geeigneten Videos konnten nicht zur Hub-Übertragung eingeplant werden.'
        )
        throw error
      }
    },
    async retryFailedJob(outboundJobId: string): Promise<HubExportRetryResult> {
      this.mutationError = null
      try {
        const { data } = await axiosInstance.post<HubExportRetryResult>(
          r(endpoints.hubExport.retry(outboundJobId))
        )
        await this.fetchOverview(this.selectedTargetNodeKey)
        return data
      } catch (error: unknown) {
        this.mutationError = mutationErrorMessage(
          error,
          'Der fehlgeschlagene Hub-Transfer konnte nicht erneut eingeplant werden.'
        )
        throw error
      }
    },
    async checkVideoExportReadiness(
      videos: VideoExportReadinessCandidate[]
    ): Promise<VideoExportReadinessResult> {
      this.mutationError = null
      const results = await Promise.allSettled(
        videos.map((video) =>
          axiosInstance.post(r(endpoints.media.videoMarkReadyForExport(video.id)), {
            centerKey: video.centerKey
          })
        )
      )
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      )
      await this.fetchOverview(this.selectedTargetNodeKey)
      if (failures.length) {
        const firstFailure = mutationErrorMessage(
          failures[0].reason,
          'Die Exportfreigabe konnte nicht geprüft werden.'
        )
        this.mutationError = `${String(videos.length - failures.length)} von ${String(videos.length)} Videos geprüft. ${firstFailure}`
      }
      return {
        checkedCount: videos.length - failures.length,
        failedCount: failures.length
      }
    }
  }
})
