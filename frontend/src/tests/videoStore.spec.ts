import { describe, it, expect } from 'vitest'
import { backendSegmentToSegment, type BackendSegment } from '@/stores/videoStore'

const backend: BackendSegment = {
  id: 1,
  videoFile: 42,
  videoName: 'video.mp4',
  videoId: 42,
  label: 3,
  labelName: 'polyp',
  labelId: 3,
  startFrameNumber: 100,
  endFrameNumber: 200,
  startTime: 2,
  endTime: 4,
  labelDisplay: 'Polyp',
  framePredictions: [],
  manualFrameAnnotations: [],
  timeSegments: {
    segmentId: 1,
    segmentStart: 100,
    segmentEnd: 200,
    startTime: 2,
    endTime: 4,
    frames: [
      {
        frameFilename: 'frame_0100.jpg',
        frameFilePath: 'frames/frame_0100.jpg',
        frameUrl: 'https://example/media/frames/frame_0100.jpg',
        allClassifications: [],
        predictions: [],
        frameId: 100,
        manualAnnotations: []
      }
    ]
  }
}

describe('backendSegmentToSegment', () => {
  it('maps correctly', () => {
    const seg = backendSegmentToSegment(backend)
    expect(seg.id).toBe(1)
    expect(seg.label).toBe('polyp')
    expect(seg.startTime).toBe(2)
    expect(seg.frames?.['100'].frameFilename).toBe('frame_0100.jpg')
  })
})
