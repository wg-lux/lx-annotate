import axios from 'axios'
import Hls from 'hls.js'
import { computed, onBeforeUnmount, readonly, ref, watch, type ComputedRef, type Ref } from 'vue'

import axiosInstance, { silentRequestConfig } from '@/api/axiosInstance'
import { buildVideoPlaybackUrls } from '@/utils/mediaUrls'

type ReadableRef<T> = Ref<T> | ComputedRef<T>

export type AuthenticatedVideoPlaybackMode = 'idle' | 'hls' | 'native_hls' | 'error'

export type AuthenticatedVideoStreamErrorReason =
  | 'hls_playlist_unauthorized'
  | 'hls_playlist_forbidden'
  | 'hls_playlist_unavailable'
  | 'hls_playlist_invalid_response'
  | 'hls_playlist_request_failed'
  | 'hls_playback_failed'

export class AuthenticatedVideoStreamError extends Error {
  readonly reason: AuthenticatedVideoStreamErrorReason
  readonly status?: number
  readonly url?: string
  readonly cause?: unknown

  constructor(
    reason: AuthenticatedVideoStreamErrorReason,
    message: string,
    options: {
      status?: number
      url?: string
      cause?: unknown
    } = {}
  ) {
    super(message)
    this.name = 'AuthenticatedVideoStreamError'
    this.reason = reason
    this.status = options.status
    this.url = options.url
    this.cause = options.cause
  }
}

export interface UseAuthenticatedVideoStreamOptions {
  videoElement: Ref<HTMLVideoElement | null>
  videoId: ReadableRef<number | null | undefined>
  enabled?: ReadableRef<boolean>
  onFatalError?: (error: AuthenticatedVideoStreamError) => void
}

const HLS_PLAYLIST_ACCEPT = 'application/vnd.apple.mpegurl, application/x-mpegURL, */*'
const HLS_PLAYLIST_CONTENT_TYPES = new Set([
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl'
])

function readRef<T>(value: ReadableRef<T>): T {
  return value.value
}

function axiosStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined
  }
  return error.response?.status
}

function buildPlaylistError(error: unknown, url: string): AuthenticatedVideoStreamError {
  const status = axiosStatus(error)
  if (status === 401) {
    return new AuthenticatedVideoStreamError(
      'hls_playlist_unauthorized',
      'HLS playback is not authenticated.',
      { status, url, cause: error }
    )
  }
  if (status === 403) {
    return new AuthenticatedVideoStreamError(
      'hls_playlist_forbidden',
      'HLS playback is not permitted for this video.',
      { status, url, cause: error }
    )
  }
  if (status === 404) {
    return new AuthenticatedVideoStreamError(
      'hls_playlist_unavailable',
      'Encrypted HLS playback is not available for this video yet.',
      { status, url, cause: error }
    )
  }
  return new AuthenticatedVideoStreamError(
    'hls_playlist_request_failed',
    status === undefined
      ? 'HLS playlist could not be requested.'
      : `HLS playlist request failed with status ${status}.`,
    { status, url, cause: error }
  )
}

function normalizeStreamError(error: unknown): AuthenticatedVideoStreamError {
  if (error instanceof AuthenticatedVideoStreamError) {
    return error
  }
  return new AuthenticatedVideoStreamError(
    'hls_playlist_request_failed',
    'HLS playback failed before the player could be configured.',
    { cause: error }
  )
}

function validateSameOriginMediaUrl(url: string): string {
  const parsedUrl = new URL(url, window.location.origin)
  if (
    parsedUrl.origin !== window.location.origin ||
    !['http:', 'https:'].includes(parsedUrl.protocol)
  ) {
    throw new AuthenticatedVideoStreamError(
      'hls_playlist_request_failed',
      'The encrypted media URL violates the same-origin policy.'
    )
  }
  return parsedUrl.toString()
}

async function validateHlsPlaylist(url: string, signal: AbortSignal): Promise<void> {
  try {
    const response = await axiosInstance.get<string>(
      url,
      silentRequestConfig({
        headers: {
          Accept: HLS_PLAYLIST_ACCEPT
        },
        responseType: 'text',
        signal,
        withCredentials: true
      })
    )
    const contentType = String(response.headers['content-type'] || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase()
    if (
      !HLS_PLAYLIST_CONTENT_TYPES.has(contentType) ||
      !response.data.trimStart().startsWith('#EXTM3U')
    ) {
      throw new AuthenticatedVideoStreamError(
        'hls_playlist_invalid_response',
        'The encrypted HLS playlist response is invalid.',
        { url }
      )
    }
  } catch (error) {
    if (error instanceof AuthenticatedVideoStreamError) {
      throw error
    }
    throw buildPlaylistError(error, url)
  }
}

function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== ''
}

export function useAuthenticatedVideoStream(options: UseAuthenticatedVideoStreamOptions) {
  const playbackMode = ref<AuthenticatedVideoPlaybackMode>('idle')
  const playbackSourceUrl = ref<string>('')
  const playbackError = ref<AuthenticatedVideoStreamError | null>(null)
  const isHlsPlayback = computed(
    () => playbackMode.value === 'hls' || playbackMode.value === 'native_hls'
  )

  let hlsInstance: Hls | null = null
  let playlistAbortController: AbortController | null = null
  let mediaRecoveryAttempted = false
  let loadSerial = 0

  function destroyHls(): void {
    if (hlsInstance) {
      hlsInstance.destroy()
      hlsInstance = null
    }
  }

  function clearVideoElement(video: HTMLVideoElement | null): void {
    playlistAbortController?.abort()
    playlistAbortController = null
    destroyHls()
    if (video) {
      const hadSource = Boolean(video.getAttribute('src') || video.currentSrc)
      if (!video.paused) {
        video.pause()
      }
      video.removeAttribute('src')
      if (hadSource) {
        // Force the user agent to release buffered, decrypted media data.
        video.load()
      }
    }
    playbackSourceUrl.value = ''
  }

  function setError(error: AuthenticatedVideoStreamError): void {
    playbackMode.value = 'error'
    playbackError.value = error
    options.onFatalError?.(error)
  }

  function useNativeHls(video: HTMLVideoElement, url: string): void {
    destroyHls()
    video.crossOrigin = 'use-credentials'
    video.src = url
    playbackSourceUrl.value = url
    playbackMode.value = 'native_hls'
    playbackError.value = null
  }

  function useHlsJs(video: HTMLVideoElement, url: string): void {
    destroyHls()
    mediaRecoveryAttempted = false
    video.crossOrigin = 'use-credentials'

    const hls = new Hls({
      backBufferLength: 30,
      capLevelToPlayerSize: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 120,
      startFragPrefetch: false,
      xhrSetup: (xhr: XMLHttpRequest, requestUrl: string) => {
        try {
          validateSameOriginMediaUrl(requestUrl)
        } catch {
          xhr.abort()
          return
        }
        xhr.withCredentials = true
      }
    })
    hlsInstance = hls
    hls.loadSource(url)
    hls.attachMedia(video)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) {
        return
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecoveryAttempted) {
        mediaRecoveryAttempted = true
        hls.recoverMediaError()
        return
      }
      clearVideoElement(video)
      setError(
        new AuthenticatedVideoStreamError(
          'hls_playback_failed',
          `HLS playback failed: ${data.type}/${data.details}.`,
          { url, cause: data }
        )
      )
    })

    playbackSourceUrl.value = url
    playbackMode.value = 'hls'
    playbackError.value = null
  }

  async function configurePlayback(): Promise<void> {
    const serial = ++loadSerial
    const video = options.videoElement.value
    const videoId = readRef(options.videoId)
    const enabled = options.enabled ? readRef(options.enabled) : true

    clearVideoElement(video)
    playbackMode.value = 'idle'
    playbackError.value = null

    if (!video || !videoId || !enabled) {
      return
    }

    const urls = buildVideoPlaybackUrls(videoId)
    let hlsPlaylistUrl: string
    try {
      hlsPlaylistUrl = validateSameOriginMediaUrl(urls.hlsPlaylistUrl)
    } catch (error) {
      setError(normalizeStreamError(error))
      return
    }
    const canUseHlsJs = Hls.isSupported()
    const canUseNative = canPlayNativeHls(video)

    if (!canUseHlsJs && !canUseNative) {
      setError(
        new AuthenticatedVideoStreamError(
          'hls_playback_failed',
          'This browser cannot securely play encrypted HLS video.'
        )
      )
      return
    }

    const abortController = new AbortController()
    playlistAbortController = abortController
    try {
      await validateHlsPlaylist(hlsPlaylistUrl, abortController.signal)
    } catch (error) {
      if (serial !== loadSerial) {
        return
      }
      setError(normalizeStreamError(error))
      return
    } finally {
      if (playlistAbortController === abortController) {
        playlistAbortController = null
      }
    }

    if (serial !== loadSerial) {
      return
    }

    if (canUseHlsJs) {
      useHlsJs(video, hlsPlaylistUrl)
      return
    }

    useNativeHls(video, hlsPlaylistUrl)
  }

  watch(
    [
      () => options.videoElement.value,
      () => readRef(options.videoId),
      () => (options.enabled ? readRef(options.enabled) : true)
    ],
    () => {
      void configurePlayback()
    },
    { flush: 'post', immediate: true }
  )

  onBeforeUnmount(() => {
    loadSerial += 1
    clearVideoElement(options.videoElement.value)
    playbackMode.value = 'idle'
  })

  return {
    playbackMode: readonly(playbackMode),
    playbackSourceUrl: readonly(playbackSourceUrl),
    playbackError: readonly(playbackError),
    isHlsPlayback
  }
}
