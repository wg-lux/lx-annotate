import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/VideoExamination/ExportAnnotations.vue'),
  'utf8'
)

describe('ExportAnnotations PTS contract', () => {
  it('does not send an FPS resampling request for identity-preserving frame exports', () => {
    expect(componentSource).not.toContain('payload.transcode_fps')
    expect(componentSource).not.toContain('id="transcode-fps"')
    expect(componentSource).not.toContain('transcodeFps')
  })

  it('keeps frame transcoding quality and format controls', () => {
    expect(componentSource).toContain('payload.transcode_frames = true')
    expect(componentSource).toContain('payload.transcode_quality')
    expect(componentSource).toContain('payload.transcode_ext')
    expect(componentSource).toContain("const transcodeExt = ref('jpg')")
  })
})
