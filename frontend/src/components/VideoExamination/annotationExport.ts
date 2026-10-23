export type AnnotationExportFormat = 'csv' | 'json'

export interface AnnotationExportRequest {
  outputPath: string
  outputDir: string
  outputFormat: AnnotationExportFormat
  exportProfile: 'pts_dataset_v1'
  videoId: number
  segmentIds: number[]
  useExportFlags: boolean
  exportVideos: boolean
  exportFrames: boolean
  useFramePkPaths: boolean
  transcodeFrames: boolean
  transcodeQuality: number
  transcodeExt: string
}

export interface AnnotationExportResponse {
  success: boolean
  outputPath: string
  rowCount: number
  exportedVideoCount: number
  exportedFrameCount: number
  videoOutputDir?: string | null
  frameOutputDir?: string | null
}

export interface AnnotationBackfillResponse {
  annotationsCreated: number
}

export const parseAnnotationBackfillResponse = (value: unknown): AnnotationBackfillResponse => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('annotationsCreated' in value) ||
    typeof value.annotationsCreated !== 'number' ||
    !Number.isInteger(value.annotationsCreated) ||
    value.annotationsCreated < 0
  ) {
    throw new TypeError(
      'Annotation backfill response must contain a non-negative integer annotationsCreated.'
    )
  }
  return { annotationsCreated: value.annotationsCreated }
}

interface BuildAnnotationExportRequestOptions {
  outputDir: string
  outputFormat: AnnotationExportFormat
  videoId: number
  segmentIds: number[]
  useExportFlags: boolean
  exportVideos: boolean
  exportFrames: boolean
  useFramePkPaths: boolean
  transcodeFrames: boolean
  transcodeQuality: number
  transcodeExt: string
}

export const buildAnnotationExportRequest = (
  options: BuildAnnotationExportRequestOptions
): AnnotationExportRequest => ({
  outputPath: `annotations.${options.outputFormat}`,
  outputDir: options.outputDir,
  outputFormat: options.outputFormat,
  exportProfile: 'pts_dataset_v1',
  videoId: options.videoId,
  segmentIds: [...options.segmentIds],
  useExportFlags: options.useExportFlags,
  exportVideos: options.exportVideos,
  exportFrames: options.exportFrames,
  useFramePkPaths: options.useFramePkPaths,
  transcodeFrames: options.transcodeFrames,
  transcodeQuality: options.transcodeQuality,
  transcodeExt: options.transcodeExt.trim().replace(/^\./, '')
})
