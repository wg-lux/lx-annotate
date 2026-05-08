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

export interface PhiRegionDetectorTrainingDefaults {
  baseModel: string
  datasetYaml: string
  outputDir: string
  runName: string
  epochs: number
  batchSize: number
  inputSize: number
  device: string
  workers: number
  patience: number
  exportOnnx: boolean
  confidenceThreshold: number
  nmsThreshold: number
  classIds: string
}

export interface ModelTrainingOptionsResponse {
  trainingTargets: ModelTrainingOption[]
  aiDatasets: ModelTrainingDatasetOption[]
  backbones: ModelTrainingOption[]
  featureModes: ModelTrainingOption[]
  phiRegionDetector: {
    baseModels: ModelTrainingOption[]
    defaults: PhiRegionDetectorTrainingDefaults
  }
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
  trainingTarget?: 'image_multilabel' | 'phi_region_detector'
  datasetId?: number
  datasetYaml?: string
  outputDir?: string
  baseModel?: string
  runName?: string | null
  backboneName?: string
  featureMode?: string
  epochs: number
  batchSize: number
  inputSize?: number
  device?: string
  workers?: number
  patience?: number
  exportOnnx?: boolean
  confidenceThreshold?: number
  nmsThreshold?: number
  classIds?: string
  labelsetVersion?: number
  treatUnlabeledAsNegative?: boolean
  backboneCheckpoint?: string | null
}

export interface ModelTrainingRunRecord {
  runId: string
  trainingTarget?: 'image_multilabel' | 'phi_region_detector'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'lost'
  datasetId: number | null
  datasetName: string | null
  datasetType?: string
  aiModelType?: string
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
  artifactPaths?: Record<string, string>
  error: string | null
  stdout: string
  stderr?: string
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

export async function fetchModelTrainingRuns(): Promise<ModelTrainingRunRecord[]> {
  const { data } = await axiosInstance.get<ModelTrainingRunRecord[]>(r(MODEL_TRAINING_RUNS_PATH))
  return data
}

export async function fetchModelTrainingRun(runId: string): Promise<ModelTrainingRunRecord> {
  const { data } = await axiosInstance.get<ModelTrainingRunRecord>(
    r(`${MODEL_TRAINING_RUNS_PATH}${runId}/`)
  )
  return data
}
