import { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue>
type MediaFileType = 'raw' | 'processed'
export type StreamableVideoFileType = 'raw' | 'processed'

export interface VideoPlaybackUrls {
  hlsPlaylistUrl: string
  fallbackStreamUrl: string
}

export function buildApiUrl(path: string, query?: QueryParams): string {
  const apiUrl = new URL(r(path), window.location.origin)

  if (!query) {
    return apiUrl.toString()
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue
    }
    apiUrl.searchParams.set(key, String(value))
  }

  return apiUrl.toString()
}

export function buildVideoStreamUrl(
  fileId: number,
  type?: MediaFileType,
  query?: QueryParams
): string {
  return buildApiUrl(endpoints.media.videoStream(fileId), {
    ...(type ? { type } : {}),
    ...query
  })
}

export function buildVideoHlsPlaylistUrl(
  fileId: number,
  type: StreamableVideoFileType = 'processed',
  query?: QueryParams
): string {
  return buildApiUrl(endpoints.media.videoHlsPlaylist(fileId), {
    type,
    ...query
  })
}

export function buildVideoPlaybackUrls(
  fileId: number,
  type: StreamableVideoFileType = 'processed'
): VideoPlaybackUrls {
  return {
    hlsPlaylistUrl: buildVideoHlsPlaylistUrl(fileId, type),
    fallbackStreamUrl: buildVideoStreamUrl(fileId, type)
  }
}

export function buildPdfStreamUrl(
  fileId: number,
  type?: MediaFileType,
  query?: QueryParams
): string {
  return buildApiUrl(endpoints.media.pdfStream(fileId), {
    ...(type ? { type } : {}),
    ...query
  })
}
