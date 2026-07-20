export type VideoAnonymizationStrategy = 'detector_assisted' | 'processor_region'

export interface VideoAnonymizationStrategyOption {
  id: VideoAnonymizationStrategy
  label?: string
  recommended?: boolean
}

export interface VideoAnonymizationModel {
  name?: string | null
  version?: string | null
  sha256?: string | null
  required?: boolean
  confidence?: number | null
  inputSize?: number | null
}

export interface VideoAnonymizationArtifact {
  available: boolean
  streamUrl?: string | null
}

export interface VideoAnonymizationRunSummary {
  id?: number | string | null
  operation?: string | null
  strategy?: VideoAnonymizationStrategy | null
  status?: string | null
  completedAt?: string | null
  createdAt?: string | null
  framesProcessed?: number | null
  redactionsApplied?: number | null
  outputFile?: string | null
  message?: string | null
  details?: string | null
}

export interface VideoAnonymizationJob {
  videoId: number
  status: string
  queue: string
  taskId: string
  historyId: number
}

export interface VideoAnonymizationStatus {
  strategies: Array<VideoAnonymizationStrategy | VideoAnonymizationStrategyOption>
  defaultStrategy: VideoAnonymizationStrategy
  selectedStrategy: VideoAnonymizationStrategy | null
  model?: VideoAnonymizationModel | null
  ocrEngines: string[]
  reviewRequired: boolean
  processedArtifact: VideoAnonymizationArtifact
  latestRun?: VideoAnonymizationRunSummary | null
  outputFile?: string | null
  job?: VideoAnonymizationJob | null
  message?: string | null
}

export interface VideoAnonymizationRequest {
  strategy: VideoAnonymizationStrategy
  processingMethod: 'streaming' | 'direct'
  region: {
    mode: 'device' | 'custom'
    deviceName?: string
    roi?: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  humanReviewRequired: true
}
