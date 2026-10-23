import { buildApiUrl } from '@/utils/mediaUrls'

export type ReportFrameSelection = {
  videoId: number
  frameNumber: number
  timestamp: number
}

export function decodedFrameUrl(videoId: number, frameNumber: number): string {
  if (
    !Number.isSafeInteger(videoId) ||
    videoId < 1 ||
    !Number.isSafeInteger(frameNumber) ||
    frameNumber < 0
  ) {
    throw new TypeError('Invalid frame identity')
  }
  return buildApiUrl(
    `/media/videos/${String(videoId)}/frames/${String(frameNumber)}/decoded-stream/`,
    {
      file_type: 'processed'
    }
  )
}

export function requireDecodedFrameUrl(value: string): string {
  const parsedFrameUrl = new URL(value, window.location.origin)
  const apiOrigin = new URL(buildApiUrl('/')).origin
  if (
    ![window.location.origin, apiOrigin].includes(parsedFrameUrl.origin) ||
    parsedFrameUrl.username ||
    parsedFrameUrl.password ||
    !/\/media\/videos\/\d+\/frames\/\d+\/decoded-stream\/$/.test(parsedFrameUrl.pathname)
  ) {
    throw new TypeError('Frame previews require an authenticated decoded-frame stream')
  }
  return value
}
