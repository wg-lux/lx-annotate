import axiosInstance, { r } from '@/api/axiosInstance'

export interface ApplicationSettingsRecord {
  id: number
  centerId: number | null
  centerKey?: string | null
  centerName: string | null
  processorId: number | null
  processorName: string | null
  annotatorName: string | null
  reportTemplateName: string | null
  aiDatasetName: string | null
  aiDatasetType: string | null
  updatedAt: string | null
  backupStatus: {
    ready: boolean
    missingPaths: string[]
    requiredPathCount: number
    availablePathCount: number
    sourceRoots: Array<{
      label: string
      path: string
      exists: boolean
      fileCount: number
    }>
  }
}

export interface ApplicationSettingsUpdatePayload {
  centerId?: number | null
  processorId?: number | null
  annotatorName?: string | null
  reportTemplateName?: string | null
  aiDatasetName?: string | null
  aiDatasetType?: string | null
}

export interface NamedDropdownOption {
  id: number
  name: string
  centerKey?: string | null
}

export interface ValueLabelOption {
  value: string
  label: string
}

export interface ApplicationSettingsDropdowns {
  centers: NamedDropdownOption[]
  processors: NamedDropdownOption[]
  annotators: ValueLabelOption[]
  reportTemplates: ValueLabelOption[]
  aiDatasets: Array<
    ValueLabelOption & {
      id: number
      datasetType: string
      aiModelType: string
      isActive: boolean
      nameCount: number
    }
  >
}

export interface ApplicationBackupPayload {
  targetPath: string
}

export interface ApplicationBackupResult {
  targetRoot: string
  copiedRoots: Array<{
    label: string
    sourcePath: string
    destinationPath: string
    fileCount: number
  }>
}

export interface ApplicationVideoDimensionBackfillPayload {
  dryRun?: boolean
  limit?: number | null
}

export interface ApplicationVideoDimensionBackfillRun {
  runId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  dryRun: boolean
  limit: number | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  result: {
    count: number
    summary: Record<string, number>
    items: Array<{
      videoId: number | null
      status: string
      sourceDimensions: number[]
      processedDimensions: number[]
      repaired: boolean
      detail: string
    }>
  } | null
  error: string | null
  stdout: string
}

export interface ApplicationAiDatasetExportPayload {
  aiDatasetName?: string
  aiDatasetType?: string
}

export interface ApplicationAiDatasetExportResult {
  success: boolean
  datasetId: number
  datasetName: string
  datasetType: string
  outputPath: string
  summary: {
    imageAnnotationCount?: number
    videoAnnotationCount?: number
    frameCount?: number
    videoCount?: number
    labelCount?: number
  }
}

const SETTINGS_DETAIL_PATH = 'settings/application/'
const SETTINGS_CENTERS_PATH = 'settings/application/dropdowns/centers/'
const SETTINGS_PROCESSORS_PATH = 'settings/application/dropdowns/processors/'
const SETTINGS_ANNOTATORS_PATH = 'settings/application/dropdowns/annotators/'
const SETTINGS_REPORT_TEMPLATES_PATH = 'settings/application/dropdowns/report_templates/'
const SETTINGS_AI_DATASETS_PATH = 'settings/application/dropdowns/ai_datasets/'
const SETTINGS_AI_DATASET_EXPORT_PATH = 'settings/application/ai_dataset_export/'
const SETTINGS_BACKUP_PATH = 'settings/application/backup/'
const SETTINGS_VIDEO_DIMENSION_BACKFILL_RUNS_PATH = 'settings/application/video_dimension_backfill/runs/'

export async function fetchApplicationSettings(): Promise<ApplicationSettingsRecord> {
  const { data } = await axiosInstance.get<ApplicationSettingsRecord>(r(SETTINGS_DETAIL_PATH))
  return data
}

export async function updateApplicationSettings(
  payload: ApplicationSettingsUpdatePayload
): Promise<ApplicationSettingsRecord> {
  const { data } = await axiosInstance.patch<ApplicationSettingsRecord>(r(SETTINGS_DETAIL_PATH), payload)
  return data
}

export async function fetchApplicationSettingsDropdowns(): Promise<ApplicationSettingsDropdowns> {
  const [
    centersResponse,
    processorsResponse,
    annotatorsResponse,
    reportTemplatesResponse,
    aiDatasetsResponse
  ] = await Promise.all([
    axiosInstance.get<NamedDropdownOption[]>(r(SETTINGS_CENTERS_PATH)),
    axiosInstance.get<NamedDropdownOption[]>(r(SETTINGS_PROCESSORS_PATH)),
    axiosInstance.get<ValueLabelOption[]>(r(SETTINGS_ANNOTATORS_PATH)),
    axiosInstance.get<ValueLabelOption[]>(r(SETTINGS_REPORT_TEMPLATES_PATH)),
    axiosInstance.get<
      Array<{
        id: number
        value: string
        label: string
        datasetType: string
        aiModelType: string
        isActive: boolean
        nameCount: number
      }>
    >(r(SETTINGS_AI_DATASETS_PATH))
  ])

  return {
    centers: centersResponse.data,
    processors: processorsResponse.data,
    annotators: annotatorsResponse.data,
    reportTemplates: reportTemplatesResponse.data,
    aiDatasets: aiDatasetsResponse.data
  }
}

export async function triggerApplicationBackup(
  payload: ApplicationBackupPayload
): Promise<ApplicationBackupResult> {
  const { data } = await axiosInstance.post<ApplicationBackupResult>(r(SETTINGS_BACKUP_PATH), payload)
  return data
}

export async function triggerApplicationAiDatasetExport(
  payload: ApplicationAiDatasetExportPayload
): Promise<ApplicationAiDatasetExportResult> {
  const { data } = await axiosInstance.post<ApplicationAiDatasetExportResult>(
    r(SETTINGS_AI_DATASET_EXPORT_PATH),
    payload
  )
  return data
}

export async function triggerApplicationVideoDimensionBackfill(
  payload: ApplicationVideoDimensionBackfillPayload
): Promise<ApplicationVideoDimensionBackfillRun> {
  const { data } = await axiosInstance.post<ApplicationVideoDimensionBackfillRun>(
    r(SETTINGS_VIDEO_DIMENSION_BACKFILL_RUNS_PATH),
    payload
  )
  return data
}

export async function fetchApplicationVideoDimensionBackfillRun(
  runId: string
): Promise<ApplicationVideoDimensionBackfillRun> {
  const { data } = await axiosInstance.get<ApplicationVideoDimensionBackfillRun>(
    r(`${SETTINGS_VIDEO_DIMENSION_BACKFILL_RUNS_PATH}${runId}/`)
  )
  return data
}
