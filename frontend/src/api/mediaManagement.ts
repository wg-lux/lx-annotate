// frontend/src/api/mediaManagement.ts

import axiosInstance, { endoregApi } from '@/api/axiosInstance'
import axios from 'axios'
import { ref, readonly } from 'vue'
import { endpoints } from '@/types/api/endpoints'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const api = axiosInstance
const logger = createRuntimeLogger('media-management')

export interface MediaStatusOverview {
  videos: {
    total: number
    not_started: number
    processing: number
    done: number
    failed: number
    validated: number
    unfinished: number
  }
  pdfs: {
    total: number
    not_started: number
    processing: number
    done: number
    failed: number
    validated: number
    unfinished: number
  }
  cleanup_opportunities: {
    stale_processing: number
    failed_videos: number
    unfinished_total: number
  }
  total_files: number
  timestamp: string
}

export interface MediaCleanupResult {
  cleanup_type: string
  force: boolean
  removed_items: Array<{
    id: number
    type: 'video' | 'pdf'
    filename: string
    status: string
    uploaded_at?: string
    created_at?: string
    stale_duration_hours?: number
  }>
  summary: {
    videos_removed?: number
    pdfs_removed?: number
    stale_videos_removed?: number
    total_removed: number
    dry_run: boolean
  }
}

export interface PollingCoordinatorInfo {
  coordinator_status: string
  config: {
    processing_timeout: number
    check_cooldown: number
  }
  note: string
}

export interface AnonymizationStatusResponse {
  file_id: number
  file_type: string
  anonymizationStatus: string
  processing_locked?: boolean
  cooldown_active?: boolean
}

export interface ProcessingResponse {
  detail?: string
  message?: string
  file_id?: number
  file_type?: string
  processing_locked?: boolean
  status?: string
  task_id?: string
  history_id?: number | null
  video_id?: number
  uuid?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Media Management API Service
 * Provides comprehensive media cleanup and management capabilities
 */
export const MediaManagementAPI = {
  /**
   * Get comprehensive status overview of all media
   */
  async getStatusOverview(): Promise<MediaStatusOverview> {
    const response = await api.get<MediaStatusOverview>(endoregApi(endpoints.mediaManagement.status))
    return response.data
  },

  /**
   * Perform media cleanup operations
   * @param type - Type of cleanup: 'unfinished', 'failed', 'stale', 'all'
   * @param force - Whether to actually delete (true) or dry-run (false)
   */
  async performCleanup(
    type: 'unfinished' | 'failed' | 'stale' | 'all' = 'unfinished',
    force: boolean = false
  ): Promise<MediaCleanupResult> {
    const response = await api.delete<MediaCleanupResult>(endoregApi(endpoints.mediaManagement.cleanup), {
      params: { type, force }
    })
    return response.data
  },

  /**
   * Force remove a specific media item
   * @param fileId - ID of the file to remove
   */
  async forceRemoveMedia(fileId: number): Promise<ProcessingResponse> {
    const response = await api.delete<ProcessingResponse>(
      endoregApi(endpoints.mediaManagement.forceRemove(fileId))
    )
    return response.data
  },

  /**
   * Reset processing status for a stuck/failed media item
   * @param fileId - ID of the file to reset
   */
  async resetProcessingStatus(fileId: number): Promise<ProcessingResponse> {
    const response = await api.post<ProcessingResponse>(
      endoregApi(endpoints.mediaManagement.resetStatus(fileId))
    )
    return response.data
  },

  /**
   * Get polling coordinator information
   */
  async getPollingCoordinatorInfo(): Promise<PollingCoordinatorInfo> {
    const response = await api.get<PollingCoordinatorInfo>(
      endoregApi(endpoints.anonymization.pollingInfo)
    )
    return response.data
  },

  /**
   * Clear all processing locks (emergency function)
   * @param fileType - Optional file type filter ('video' or 'pdf')
   */
  async clearProcessingLocks(fileType?: 'video' | 'pdf'): Promise<{
    detail: string
    cleared_count: number
    file_type_filter?: string
  }> {
    const response = await api.delete<{
      detail: string
      cleared_count: number
      file_type_filter?: string
    }>(endoregApi(endpoints.anonymization.clearLocks), {
      params: fileType ? { type: fileType } : undefined
    })
    return response.data
  },

  /**
   * Enhanced anonymization status check with polling protection
   * @param fileId - ID of the file to check
   * @param fileType - Type of file ('video' or 'pdf')
   */
  async getAnonymizationStatusSafe(
    fileId: number,
    _fileType?: 'video' | 'pdf'
  ): Promise<AnonymizationStatusResponse> {
    const response = await api.get<AnonymizationStatusResponse>(
      endoregApi(endpoints.anonymization.status(fileId))
    )
    return response.data
  },

  /**
   * Start anonymization with processing lock protection
   * @param fileId - ID of the file to process
   */
  async startAnonymizationSafe(fileId: number): Promise<ProcessingResponse> {
    const response = await api.post<ProcessingResponse>(
      endoregApi(endpoints.anonymization.start(fileId))
    )
    return response.data
  },

  /**
   * Validate anonymization with coordination
   * @param fileId - ID of the file to validate
   */
  async validateAnonymizationSafe(
    fileId: number,
    documentType?: string
  ): Promise<ProcessingResponse> {
    const response = await api.post<ProcessingResponse>(endoregApi(endpoints.anonymization.validate(fileId)), {
      ...(documentType ? { document_type: documentType } : {})
    })
    return response.data
  },

  /** Annotation-safe video state repair; never invokes destructive re-import. */
  async reimportVideo(fileId: number): Promise<ProcessingResponse> {
    const response = await api.post<ProcessingResponse>(
      endoregApi(endpoints.runtime.videoStateRepairOne(fileId)),
      { dryRun: false }
    )
    return response.data
  },

  /**
   * Re-import a PDF file to regenerate metadata
   * Uses the modern media framework endpoint aligned with video reimport
   * @param fileId - ID of the PDF file to re-import
   */
  async reimportPdf(fileId: number): Promise<ProcessingResponse> {
    const response = await api.post<ProcessingResponse>(endoregApi(endpoints.media.pdfReimport(fileId)))
    return response.data
  },

  /**
   * Delete/remove a media file completely
   * @param fileId - ID of the file to delete
   */
  async deleteMediaFile(fileId: number): Promise<ProcessingResponse> {
    const response = await api.delete<ProcessingResponse>(
      endoregApi(endpoints.mediaManagement.forceRemove(fileId))
    )
    return response.data
  }
}

/**
 * Composable for media management operations
 */
export function useMediaManagement() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Safe wrapper for API calls with error handling
   */
  const safeApiCall = async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    isLoading.value = true
    error.value = null

    try {
      const result = await apiCall()
      return result
    } catch (err: unknown) {
      logger.error('request-failed', err)

      if (axios.isAxiosError<{ detail?: string }>(err) && err.response?.status === 429) {
        error.value = 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
      } else if (axios.isAxiosError(err) && err.response?.status === 409) {
        error.value = 'Datei wird bereits verarbeitet.'
      } else if (
        axios.isAxiosError<unknown>(err) &&
        isRecord(err.response?.data) &&
        typeof err.response.data.detail === 'string'
      ) {
        error.value = err.response.data.detail
      } else {
        error.value = 'Ein unerwarteter Fehler ist aufgetreten.'
      }

      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    clearError: () => {
      error.value = null
    },

    // Status operations
    getStatusOverview: () => safeApiCall(() => MediaManagementAPI.getStatusOverview()),

    // Cleanup operations
    performCleanup: (type: 'unfinished' | 'failed' | 'stale' | 'all', force: boolean = false) =>
      safeApiCall(() => MediaManagementAPI.performCleanup(type, force)),

    // Individual file operations
    forceRemoveMedia: (fileId: number) =>
      safeApiCall(() => MediaManagementAPI.forceRemoveMedia(fileId)),
    resetProcessingStatus: (fileId: number) =>
      safeApiCall(() => MediaManagementAPI.resetProcessingStatus(fileId)),
    deleteMediaFile: (fileId: number) =>
      safeApiCall(() => MediaManagementAPI.deleteMediaFile(fileId)),
    reimportVideo: (fileId: number) => safeApiCall(() => MediaManagementAPI.reimportVideo(fileId)),
    reimportPdf: (fileId: number) => safeApiCall(() => MediaManagementAPI.reimportPdf(fileId)),

    // Safe anonymization operations
    getStatusSafe: (fileId: number, fileType?: 'video' | 'pdf') =>
      safeApiCall(() => MediaManagementAPI.getAnonymizationStatusSafe(fileId, fileType)),
    startAnonymizationSafe: (fileId: number) =>
      safeApiCall(() => MediaManagementAPI.startAnonymizationSafe(fileId)),
    validateAnonymizationSafe: (fileId: number, documentType?: string) =>
      safeApiCall(() => MediaManagementAPI.validateAnonymizationSafe(fileId, documentType)),

    // Coordinator operations
    getPollingInfo: () => safeApiCall(() => MediaManagementAPI.getPollingCoordinatorInfo()),
    clearAllLocks: (fileType?: 'video' | 'pdf') =>
      safeApiCall(() => MediaManagementAPI.clearProcessingLocks(fileType))
  }
}
