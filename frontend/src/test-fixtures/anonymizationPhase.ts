import type {
  AiPredictionStatus,
  AnonymizationPhase,
  AnonymizationStatus
} from '@/stores/anonymizationStore'

// Test-only mirror of endoreg_db's Rust phase table, used to build realistic
// server payloads. Production code must read anonymizationPhase from the API.
export const SERVER_PHASE_BY_STATUS: Record<AnonymizationStatus, AnonymizationPhase> = {
  not_started: 'not_started',
  extracting_frames: 'in_progress',
  processing_anonymization: 'in_progress',
  started: 'in_progress',
  anonymized: 'in_progress',
  done_processing_anonymization: 'awaiting_validation',
  validated: 'validated',
  failed: 'failed'
}

interface ServerRowShape {
  anonymizationStatus: AnonymizationStatus
  mediaType?: string
  importOnly?: boolean
  aiPredictionStatus?: AiPredictionStatus | null
}

// Server shape: persisted videos carry a prediction state, everything else null.
export const withServerPhase = <T extends ServerRowShape>(
  row: T
): T & { anonymizationPhase: AnonymizationPhase; aiPredictionStatus: AiPredictionStatus | null } => ({
  ...row,
  anonymizationPhase: SERVER_PHASE_BY_STATUS[row.anonymizationStatus],
  aiPredictionStatus:
    row.aiPredictionStatus !== undefined
      ? row.aiPredictionStatus
      : row.mediaType === 'video' && row.importOnly !== true
        ? 'prediction_pending'
        : null
})
