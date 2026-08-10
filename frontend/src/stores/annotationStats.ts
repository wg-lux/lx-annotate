import { defineStore } from 'pinia'
import axios from 'axios'
import { endpoints } from '@/types/api/endpoints'
import { r } from '@/api/axiosInstance'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('annotation-stats')

// Unified annotation types
export type AnnotationType = 'segment' | 'examination' | 'sensitive_meta'
export type AnnotationStatus = 'pending' | 'in_progress' | 'completed'

export interface UnifiedAnnotationStats {
  // Segment annotations (video segmentation)
  segmentPending: number
  segmentInProgress: number
  segmentCompleted: number

  // Examination annotations (medical examinations)
  examinationPending: number
  examinationInProgress: number
  examinationCompleted: number

  // Sensitive meta annotations (patient data validation)
  sensitiveMetaPending: number
  sensitiveMetaInProgress: number
  sensitiveMetaCompleted: number

  // Totals
  totalPending: number
  totalInProgress: number
  totalCompleted: number
  totalAnnotations: number
}

export interface AnnotationStatsBreakdown {
  type: AnnotationType
  pending: number
  inProgress: number
  completed: number
  total: number
}

type SensitiveMetadataVerification = {
  dob_verified?: boolean
  names_verified?: boolean
}

type AnnotationSourceStats = {
  pending: number
  inProgress: number
  completed: number
}

type ExaminationStatus = 'pending' | 'in_progress' | 'completed' | 'draft'

interface AnnotationStatsState {
  stats: UnifiedAnnotationStats
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function requireResponseRows(value: unknown, contractName: string): unknown[] {
  if (Array.isArray(value)) return value
  if (isRecord(value) && Array.isArray(value.results)) return value.results
  throw new TypeError(`${contractName} response does not match the expected contract`)
}

function formatSnippet(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value)
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol' ||
    typeof value === 'function'
  ) {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return '[object value]'
  }
}

function requireSensitiveMetadataRows(value: unknown): SensitiveMetadataVerification[] {
  const rows = requireResponseRows(value, 'Sensitive metadata list')
  if (
    !rows.every(
      (row: unknown) => isRecord(row) &&
        (row.dob_verified === undefined || typeof row.dob_verified === 'boolean') &&
        (row.names_verified === undefined || typeof row.names_verified === 'boolean')
    )
  ) {
    throw new TypeError('Sensitive metadata list contains an invalid row')
  }
  return rows.filter((row: unknown): row is SensitiveMetadataVerification => isRecord(row))
}

function requireNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative integer`)
  }
  return value
}

function parseVideoSegmentStats(value: unknown): AnnotationSourceStats {
  if (!isRecord(value)) {
    throw new TypeError('Video segment statistics response does not match the expected contract')
  }
  return {
    pending: requireNonNegativeInteger(value.total_segments, 'total_segments'),
    inProgress: 0,
    completed: 0
  }
}

function isExaminationStatus(value: unknown): value is ExaminationStatus {
  return value === 'pending' || value === 'in_progress' || value === 'completed' || value === 'draft'
}

function parseExaminationStats(value: unknown): AnnotationSourceStats {
  const rows = requireResponseRows(value, 'Patient examination list')
  const counts: Record<ExaminationStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    draft: 0
  }
  for (const row of rows) {
    if (!isRecord(row)) {
      throw new TypeError(
        `Patient examination list contains an invalid status row: row is not an object (snippet: ${formatSnippet(row)})`
      )
    }
    const status = row.status
    if (status == null || status === '') {
      counts.draft += 1
      continue
    }
    if (!isExaminationStatus(status)) {
      throw new TypeError(
        `Patient examination list contains an invalid status row: expected status in ["pending","in_progress","completed","draft"], got ${formatSnippet(status)}`
      )
    }
    counts[status] += 1
  }
  return {
    pending: counts.pending + counts.draft,
    inProgress: counts.in_progress,
    completed: counts.completed
  }
}

function parseSensitiveMetadataStats(value: unknown): AnnotationSourceStats {
  const rows = requireSensitiveMetadataRows(value)
  const completed = rows.filter(
    (metadata) => metadata.dob_verified === true && metadata.names_verified === true
  ).length
  return {
    pending: rows.length - completed,
    inProgress: 0,
    completed
  }
}

function emptyStats(): UnifiedAnnotationStats {
  return {
    segmentPending: 0,
    segmentInProgress: 0,
    segmentCompleted: 0,
    examinationPending: 0,
    examinationInProgress: 0,
    examinationCompleted: 0,
    sensitiveMetaPending: 0,
    sensitiveMetaInProgress: 0,
    sensitiveMetaCompleted: 0,
    totalPending: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    totalAnnotations: 0
  }
}

function buildUnifiedStats(
  segment: AnnotationSourceStats,
  examination: AnnotationSourceStats,
  sensitiveMeta: AnnotationSourceStats
): UnifiedAnnotationStats {
  const totalPending = segment.pending + examination.pending + sensitiveMeta.pending
  const totalInProgress = segment.inProgress + examination.inProgress + sensitiveMeta.inProgress
  const totalCompleted = segment.completed + examination.completed + sensitiveMeta.completed
  return {
    segmentPending: segment.pending,
    segmentInProgress: segment.inProgress,
    segmentCompleted: segment.completed,
    examinationPending: examination.pending,
    examinationInProgress: examination.inProgress,
    examinationCompleted: examination.completed,
    sensitiveMetaPending: sensitiveMeta.pending,
    sensitiveMetaInProgress: sensitiveMeta.inProgress,
    sensitiveMetaCompleted: sensitiveMeta.completed,
    totalPending,
    totalInProgress,
    totalCompleted,
    totalAnnotations: totalPending + totalInProgress + totalCompleted
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback
  const response = isRecord(error.response) ? error.response : null
  const responseData = response && isRecord(response.data) ? response.data : null
  const responseError = responseData?.error
  if (typeof responseError === 'string' && responseError) return responseError
  const responseCode = responseData?.code
  if (typeof responseCode === 'string' && responseCode) {
    const detail = typeof responseData.detail === 'string' ? responseData.detail : null
    return detail ? `${responseCode}: ${detail}` : responseCode
  }
  return typeof error.message === 'string' && error.message ? error.message : fallback
}

const annotationStatusKeys: Record<
  AnnotationType,
  Record<AnnotationStatus, keyof UnifiedAnnotationStats>
> = {
  segment: {
    pending: 'segmentPending',
    in_progress: 'segmentInProgress',
    completed: 'segmentCompleted'
  },
  examination: {
    pending: 'examinationPending',
    in_progress: 'examinationInProgress',
    completed: 'examinationCompleted'
  },
  sensitive_meta: {
    pending: 'sensitiveMetaPending',
    in_progress: 'sensitiveMetaInProgress',
    completed: 'sensitiveMetaCompleted'
  }
}

export const useAnnotationStatsStore = defineStore('annotationStats', {
  state: (): AnnotationStatsState => ({
    stats: emptyStats(),
    loading: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    // Legacy getter for compatibility
    pendingCount: (state) => state.stats.totalPending,

    // New unified getters
    isLoading: (state) => state.loading,
    hasError: (state) => state.error !== null,

    needsRefresh: (state) => {
      if (!state.lastUpdated) return true
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return state.lastUpdated < fiveMinutesAgo
    },

    // Get breakdown by type
    annotationBreakdown: (state): AnnotationStatsBreakdown[] => [
      {
        type: 'segment',
        pending: state.stats.segmentPending,
        inProgress: state.stats.segmentInProgress,
        completed: state.stats.segmentCompleted,
        total:
          state.stats.segmentPending + state.stats.segmentInProgress + state.stats.segmentCompleted
      },
      {
        type: 'examination',
        pending: state.stats.examinationPending,
        inProgress: state.stats.examinationInProgress,
        completed: state.stats.examinationCompleted,
        total:
          state.stats.examinationPending +
          state.stats.examinationInProgress +
          state.stats.examinationCompleted
      },
      {
        type: 'sensitive_meta',
        pending: state.stats.sensitiveMetaPending,
        inProgress: state.stats.sensitiveMetaInProgress,
        completed: state.stats.sensitiveMetaCompleted,
        total:
          state.stats.sensitiveMetaPending +
          state.stats.sensitiveMetaInProgress +
          state.stats.sensitiveMetaCompleted
      }
    ],

    // Get stats by status
    pendingByType: (state) => ({
      segment: state.stats.segmentPending,
      examination: state.stats.examinationPending,
      sensitive_meta: state.stats.sensitiveMetaPending
    }),

    inProgressByType: (state) => ({
      segment: state.stats.segmentInProgress,
      examination: state.stats.examinationInProgress,
      sensitive_meta: state.stats.sensitiveMetaInProgress
    }),

    completedByType: (state) => ({
      segment: state.stats.segmentCompleted,
      examination: state.stats.examinationCompleted,
      sensitive_meta: state.stats.sensitiveMetaCompleted
    }),

    // Progress percentages
    completionPercentage: (state) => {
      const total = state.stats.totalAnnotations
      return total > 0 ? Math.round((state.stats.totalCompleted / total) * 100) : 0
    },

    inProgressPercentage: (state) => {
      const total = state.stats.totalAnnotations
      return total > 0 ? Math.round((state.stats.totalInProgress / total) * 100) : 0
    },

    pendingPercentage: (state) => {
      const total = state.stats.totalAnnotations
      return total > 0 ? Math.round((state.stats.totalPending / total) * 100) : 0
    }
  },

  actions: {
    async fetchAnnotationStats() {
      if (this.loading) return // Prevent multiple simultaneous requests

      try {
        this.loading = true
        this.error = null

        // Publish one coherent snapshot only after all sources have succeeded.
        const [segment, examination, sensitiveMeta] = await Promise.all([
          this.fetchVideoSegmentStats(),
          this.fetchExaminationStats(),
          this.fetchSensitiveMetaStats()
        ])
        this.stats = buildUnifiedStats(segment, examination, sensitiveMeta)
        this.lastUpdated = new Date()
      } catch (error: unknown) {
        logger.error('refresh-failed', error)
        this.error = errorMessage(error, 'Failed to fetch annotation statistics')
      } finally {
        this.loading = false
      }
    },

    async fetchVideoSegmentStats(): Promise<AnnotationSourceStats> {
      const response = await axios.get<unknown>(r(endpoints.media.segmentsStats))
      return parseVideoSegmentStats(response.data)
    },

    async fetchExaminationStats(): Promise<AnnotationSourceStats> {
      const response = await axios.get<unknown>(r(endpoints.examination.patientExaminationList))
      return parseExaminationStats(response.data)
    },

    async fetchSensitiveMetaStats(): Promise<AnnotationSourceStats> {
      const response = await axios.get<unknown>(r(endpoints.media.sensitiveMetadataList))
      return parseSensitiveMetadataStats(response.data)
    },

    calculateTotals() {
      this.stats.totalPending =
        this.stats.segmentPending + this.stats.examinationPending + this.stats.sensitiveMetaPending

      this.stats.totalInProgress =
        this.stats.segmentInProgress +
        this.stats.examinationInProgress +
        this.stats.sensitiveMetaInProgress

      this.stats.totalCompleted =
        this.stats.segmentCompleted +
        this.stats.examinationCompleted +
        this.stats.sensitiveMetaCompleted

      this.stats.totalAnnotations =
        this.stats.totalPending + this.stats.totalInProgress + this.stats.totalCompleted
    },

    resetStats() {
      this.stats = emptyStats()
    },

    async refreshIfNeeded() {
      if (this.needsRefresh) {
        await this.fetchAnnotationStats()
      }
    },

    // Method to manually refresh stats (e.g., after completing an annotation)
    async forceRefresh() {
      await this.fetchAnnotationStats()
    },

    // Update stats when annotations are modified
    updateAnnotationStatus(
      type: AnnotationType,
      fromStatus: AnnotationStatus | null,
      toStatus: AnnotationStatus,
      count: number = 1
    ) {
      // Decrement from old status
      if (fromStatus) {
        this.decrementCount(type, fromStatus, count)
      }

      // Increment to new status
      this.incrementCount(type, toStatus, count)

      // Recalculate totals
      this.calculateTotals()
    },

    incrementCount(type: AnnotationType, status: AnnotationStatus, count: number = 1) {
      const key = annotationStatusKeys[type][status]
      this.stats[key] += count
    },

    decrementCount(type: AnnotationType, status: AnnotationStatus, count: number = 1) {
      const key = annotationStatusKeys[type][status]
      this.stats[key] = Math.max(0, this.stats[key] - count)
    },

    // Legacy methods for backward compatibility
    incrementPending(type: 'video' | 'pdf' = 'video') {
      if (type === 'video') {
        this.updateAnnotationStatus('sensitive_meta', null, 'pending')
      } else {
        this.updateAnnotationStatus('sensitive_meta', null, 'pending')
      }
    },

    decrementPending(type: 'video' | 'pdf' = 'video') {
      if (type === 'video') {
        this.updateAnnotationStatus('sensitive_meta', 'pending', 'completed')
      } else {
        this.updateAnnotationStatus('sensitive_meta', 'pending', 'completed')
      }
    },

    clearError() {
      this.error = null
    }
  }
})
