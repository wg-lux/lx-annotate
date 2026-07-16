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
  input_size?: number | null
}

export interface VideoAnonymizationArtifact {
  available: boolean
  stream_url?: string | null
}

export interface VideoAnonymizationRunSummary {
  id?: number | string | null
  strategy?: VideoAnonymizationStrategy | null
  status?: string | null
  completed_at?: string | null
  created_at?: string | null
  frames_processed?: number | null
  redactions_applied?: number | null
  output_file?: string | null
  message?: string | null
  details?: string | null
}

export interface VideoAnonymizationStatus {
  strategies: Array<VideoAnonymizationStrategy | VideoAnonymizationStrategyOption>
  default_strategy: VideoAnonymizationStrategy
  selected_strategy: VideoAnonymizationStrategy | null
  model?: VideoAnonymizationModel | null
  ocr_engines: string[]
  review_required: boolean
  processed_artifact: VideoAnonymizationArtifact
  latest_run?: VideoAnonymizationRunSummary | null
  output_file?: string | null
}

export interface VideoAnonymizationRequest {
  strategy: VideoAnonymizationStrategy
  processing_method: 'streaming' | 'direct'
  region: {
    mode: 'device' | 'custom'
    device_name?: string
    roi?: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  human_review_required: true
}
