import axiosInstance, { r } from '@/api/axiosInstance'

export interface ModelTrainingDatasetOption {
  id: number
  value: string
  label: string
  datasetType: string
  aiModelType: string
  isActive: boolean
  nameCount: number
}

export interface ModelTrainingOption {
  value: string
  label: string
  description: string
}

export interface ModelTrainingOptionsResponse {
  aiDatasets: ModelTrainingDatasetOption[]
  backbones: ModelTrainingOption[]
  featureModes: ModelTrainingOption[]
  defaults: {
    epochs: number
    batchSize: number
    labelsetVersion: number
    backboneName: string
    featureMode: string
    treatUnlabeledAsNegative: boolean
    backboneCheckpoint: string | null
  }
}

export interface ModelTrainingRunPayload {
  datasetId: number
  backboneName: string
  featureMode: string
  epochs: number
  batchSize: number
  labelsetVersion: number
  treatUnlabeledAsNegative: boolean
  backboneCheckpoint?: string | null
}

export interface ModelTrainingRunRecord {
  runId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  datasetId: number
  datasetName: string | null
  backboneName: string
  featureMode: string
  freezeBackbone: boolean
  epochs: number
  batchSize: number
  labelsetVersion: number
  treatUnlabeledAsNegative: boolean
  backboneCheckpoint: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  result: {
    modelPath?: string
    metaPath?: string
    history?: {
      trainLoss?: number[]
      valLoss?: number[]
      testLoss?: number | null
    }
  } | null
  error: string | null
  stdout: string
}

const MODEL_TRAINING_OPTIONS_PATH = 'settings/application/model_training/options/'
const MODEL_TRAINING_RUNS_PATH = 'settings/application/model_training/runs/'

export async function fetchModelTrainingOptions(): Promise<ModelTrainingOptionsResponse> {
  const { data } = await axiosInstance.get<ModelTrainingOptionsResponse>(
    r(MODEL_TRAINING_OPTIONS_PATH)
  )
  return data
}

export async function createModelTrainingRun(
  payload: ModelTrainingRunPayload
): Promise<ModelTrainingRunRecord> {
  const { data } = await axiosInstance.post<ModelTrainingRunRecord>(
    r(MODEL_TRAINING_RUNS_PATH),
    payload
  )
  return data
}

export async function fetchModelTrainingRun(runId: string): Promise<ModelTrainingRunRecord> {
  const { data } = await axiosInstance.get<ModelTrainingRunRecord>(
    r(`${MODEL_TRAINING_RUNS_PATH}${runId}/`)
  )
  return data
}
