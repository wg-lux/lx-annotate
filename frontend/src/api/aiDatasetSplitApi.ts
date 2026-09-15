import axiosInstance, { r } from '@/api/axiosInstance'

export interface SplitConfig {
  name: string
  k: number
  testPercent: number
  seed: number
}

export interface SplitBucket {
  patientCount: number
  videoCount: number
  frameCount: number
  imageAnnotationCount: number
  segmentCount: number
}

export interface DatasetSplitPlan {
  id: number
  datasetId: number
  createdAt: string
  config: SplitConfig
  total: SplitBucket
  test: SplitBucket
  folds: { index: number; training: SplitBucket; validation: SplitBucket }[]
}

const splitPath = (datasetId: string) =>
  r(`settings/application/ai_datasets/${datasetId}/split_plans/`)

export async function fetchDatasetSplitPlans(datasetId: string): Promise<DatasetSplitPlan[]> {
  const { data } = await axiosInstance.get<DatasetSplitPlan[]>(splitPath(datasetId))
  if (!Array.isArray(data)) {
    throw new TypeError('Dataset split response must be an array')
  }
  return data
}

export async function createDatasetSplitPlan(
  datasetId: string,
  config: SplitConfig
): Promise<DatasetSplitPlan> {
  const { data } = await axiosInstance.post<DatasetSplitPlan>(splitPath(datasetId), {
    name: config.name,
    k: config.k,
    test_percent: config.testPercent,
    seed: config.seed
  })
  return data
}
