import { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue>

export function buildApiUrl(path: string, query?: QueryParams): string {
  const url = new URL(r(path), window.location.origin)

  if (!query) {
    return url.toString()
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue
    }
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

export function buildVideoStreamUrl(
  fileId: number,
  type: 'raw' | 'processed',
  query?: QueryParams
): string {
  return buildApiUrl(endpoints.media.videoStream(fileId), { type, ...query })
}

export function buildPdfStreamUrl(
  fileId: number,
  type: 'raw' | 'processed',
  query?: QueryParams
): string {
  return buildApiUrl(endpoints.media.pdfStream(fileId), { type, ...query })
}
