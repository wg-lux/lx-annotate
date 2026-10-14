import { onScopeDispose, ref } from 'vue'
import axiosInstance from '@/api/axiosInstance'
import { decodedFrameUrl, type ReportFrameSelection } from '@/utils/frameStreams'

function frameTimestamp(headers: Record<string, unknown>): number {
  const value = headers['x-frame-timestamp']
  return typeof value === 'string' && value.trim() ? Number(value) : NaN
}

function isVerifiedFrameResponse(
  response: { status: number; data: Blob; headers: Record<string, unknown> },
  frameNumber: number,
  timestamp: number
): boolean {
  const frameHeader = response.headers['x-frame-number']
  return [
    response.status === 200,
    response.data instanceof Blob,
    response.data.size > 0,
    String(response.headers['content-type']).startsWith('image/'),
    Number.isFinite(timestamp),
    timestamp >= 0,
    typeof frameHeader === 'string',
    Boolean(typeof frameHeader === 'string' && frameHeader.trim()),
    Number(frameHeader) === frameNumber
  ].every(Boolean)
}

export function useAuthenticatedFramePreview() {
  const imageUrl = ref<string | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  let generation = 0
  let controller: AbortController | null = null

  function clear() {
    generation += 1
    controller?.abort()
    controller = null
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value)
    }
    imageUrl.value = null
    error.value = null
    loading.value = false
  }

  async function load(videoId: number, frameNumber: number): Promise<ReportFrameSelection | null> {
    clear()
    const current = generation
    controller = new AbortController()
    loading.value = true
    try {
      const response = await axiosInstance.get<Blob>(decodedFrameUrl(videoId, frameNumber), {
        responseType: 'blob',
        signal: controller.signal
      })
      if (current !== generation) {
        return null
      }
      const timestamp = frameTimestamp(response.headers)
      if (!isVerifiedFrameResponse(response, frameNumber, timestamp)) {
        throw new TypeError('Frame stream did not return a verified frame and timestamp')
      }
      imageUrl.value = URL.createObjectURL(response.data)
      return { videoId, frameNumber, timestamp }
    } catch {
      if (current === generation) {
        error.value = 'Frame-Vorschau konnte nicht geladen werden. Bitte erneut auswählen.'
      }
      return null
    } finally {
      if (current === generation) {
        loading.value = false
      }
    }
  }

  onScopeDispose(clear)
  return { imageUrl, loading, error, load, clear }
}
