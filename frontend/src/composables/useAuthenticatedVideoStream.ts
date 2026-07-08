import axios from 'axios'
import Hls from 'hls.js'
import { computed, onBeforeUnmount, readonly, ref, watch, type ComputedRef, type Ref } from 'vue'

import axiosInstance, { silentRequestConfig } from '@/api/axiosInstance'
import { buildVideoPlaybackUrls } from '@/utils/mediaUrls'

type ReadableRef<T> = Ref<T> | ComputedRef<T>

export type AuthenticatedVideoPlaybackMode =
  | 'idle'
  | 'hls'
  | 'native_hls'
  | 'progressive'
  | 'error'

export type AuthenticatedVideoStreamErrorReason =
  | 'hls_playlist_unauthorized'
  | 'hls_playlist_forbidden'
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

async function hlsPlaylistExists(url: string): Promise<boolean> {
  try {
    await axiosInstance.get<string>(
      url,
      silentRequestConfig({
        headers: {
          Accept: HLS_PLAYLIST_ACCEPT
        },
        responseType: 'text',
        withCredentials: true
      })
    )
    return true
  } catch (error) {
    if (axiosStatus(error) === 404) {
      return false
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
  let loadSerial = 0

  function destroyHls(): void {
    if (hlsInstance) {
      hlsInstance.destroy()
      hlsInstance = null
    }
  }

  function clearVideoElement(video: HTMLVideoElement | null): void {
    destroyHls()
    if (video) {
      video.removeAttribute('src')
    }
    playbackSourceUrl.value = ''
  }

  function setError(error: AuthenticatedVideoStreamError): void {
    playbackMode.value = 'error'
    playbackError.value = error
    options.onFatalError?.(error)
  }

  function useProgressiveStream(video: HTMLVideoElement, url: string): void {
    destroyHls()
    video.crossOrigin = 'use-credentials'
    video.src = url
    playbackSourceUrl.value = url
    playbackMode.value = 'progressive'
    playbackError.value = null
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
    video.crossOrigin = 'use-credentials'

    const hls = new Hls({
      xhrSetup: (xhr: XMLHttpRequest) => {
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
      destroyHls()
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
    const canUseHlsJs = Hls.isSupported()
    const canUseNative = canPlayNativeHls(video)

    if (!canUseHlsJs && !canUseNative) {
      useProgressiveStream(video, urls.fallbackStreamUrl)
      return
    }

    let hasPlaylist: boolean
    try {
      hasPlaylist = await hlsPlaylistExists(urls.hlsPlaylistUrl)
    } catch (error) {
      if (serial !== loadSerial) {
        return
      }
      setError(normalizeStreamError(error))
      return
    }

    if (serial !== loadSerial) {
      return
    }

    if (!hasPlaylist) {
      useProgressiveStream(video, urls.fallbackStreamUrl)
      return
    }

    if (canUseHlsJs) {
      useHlsJs(video, urls.hlsPlaylistUrl)
      return
    }

    useNativeHls(video, urls.hlsPlaylistUrl)
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
