import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildAnnotationExportRequest } from '../annotationExport'

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/VideoExamination/ExportAnnotations.vue'),
  'utf8'
)

describe('ExportAnnotations PTS contract', () => {
  it('does not send an FPS resampling request for identity-preserving frame exports', () => {
    expect(componentSource).not.toContain('transcodeFps')
    expect(componentSource).not.toContain('id="transcode-fps"')
  })

  it('builds the strict PTS dataset request without duplicate segment keys', () => {
    const payload = buildAnnotationExportRequest({
      outputDir: 'data/export/video_7_annotated',
      outputFormat: 'json',
      videoId: 7,
      segmentIds: [11, 12],
      useExportFlags: false,
      exportVideos: false,
      exportFrames: true,
      useFramePkPaths: true,
      transcodeFrames: true,
      transcodeQuality: 23,
      transcodeExt: '.jpg'
    })

    expect(payload).toMatchObject({
      outputPath: 'annotations.json',
      exportProfile: 'pts_dataset_v1',
      videoId: 7,
      segmentIds: [11, 12],
      exportVideos: false,
      exportFrames: true,
      transcodeQuality: 23,
      transcodeExt: 'jpg'
    })
    expect(payload).not.toHaveProperty('segment_ids')
  })
})
