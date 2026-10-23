import { enableAutoUnmount, flushPromises as flushVuePromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthenticatedVideoStream } from '@/composables/useAuthenticatedVideoStream'
import { buildVideoPlaybackUrls } from '@/utils/mediaUrls'

const VIDEO_ID = 42

enableAutoUnmount(afterEach)

async function flushPromises() {
  await flushVuePromises()
  await vi.dynamicImportSettled()
  await flushVuePromises()
}

const hlsMock = vi.hoisted(() => {
  type ErrorHandler = (
    event: string,
    data: { fatal?: boolean; type?: string; details?: string }
  ) => void

  class MockHls {
    static Events = { ERROR: 'hlsError' }
    static ErrorTypes = { MEDIA_ERROR: 'mediaError' }
    static isSupported = vi.fn()

    config: {
      backBufferLength?: number
      capLevelToPlayerSize?: boolean
      maxBufferLength?: number
      maxMaxBufferLength?: number
      startFragPrefetch?: boolean
      pLoader?: new (config: { loader: new (config: unknown) => DelegateLoader }) => TestLoader
      xhrSetup?: (xhr: XMLHttpRequest, url: string) => void
    }
    handlers = new Map<string, ErrorHandler>()
    loadSource = vi.fn()
    attachMedia = vi.fn()
    destroy = vi.fn()
    recoverMediaError = vi.fn()
    on = vi.fn((event: string, handler: ErrorHandler) => {
      this.handlers.set(event, handler)
      return this
    })

    constructor(config: MockHls['config'] = {}) {
      this.config = config
      hlsMock.instances.push(this)
    }
  }

  class MockLoadStats {
    aborted = false
    loaded = 0
    retry = 0
    total = 0
    chunkCount = 0
    bwEstimate = 0
    loading = { start: 0, first: 0, end: 0 }
    parsing = { start: 0, end: 0 }
    buffering = { start: 0, first: 0, end: 0 }
  }

  return {
    MockHls,
    MockLoadStats,
    instances: [] as MockHls[]
  }
})

interface TestLoaderCallbacks {
  onSuccess: (
    response: { url: string; data?: unknown },
    stats: { loaded: number },
    context: unknown,
    networkDetails: unknown
  ) => void
  onError: () => void
  onTimeout: () => void
}

interface DelegateLoader {
  load: (context: unknown, config: unknown, callbacks: TestLoaderCallbacks) => void
  abort: () => void
  destroy: () => void
  context: unknown
  stats: unknown
}

interface TestLoader {
  load: (context: { url: string }, config: unknown, callbacks: TestLoaderCallbacks) => void
  abort: () => void
  destroy: () => void
}

const axiosMock = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('hls.js', () => ({
  default: hlsMock.MockHls,
  LoadStats: hlsMock.MockLoadStats
}))

vi.mock('@/api/axiosInstance', () => ({
  default: axiosMock,
  silentRequestConfig: (config: Record<string, unknown>) => ({
    ...config,
    suppressErrorToast: true
  }),
  r: (path: string) => `/endoreg-api/${path.replace(/^\/+/, '')}`
}))

interface HostVm {
  video: HTMLVideoElement | null
  videoId: number | null
  artifactKind: 'raw' | 'processed'
  playbackMode: string
  playbackSourceUrl: string
}

type HostVmShape = Record<keyof HostVm, unknown>

function hasHostVmKeys(value: object): value is HostVmShape {
  const keys: Array<keyof HostVm> = [
    'video',
    'videoId',
    'artifactKind',
    'playbackMode',
    'playbackSourceUrl'
  ]
  return keys.every((key) => key in value)
}

function isHostVm(value: unknown): value is HostVm {
  if (typeof value !== 'object' || value === null || !hasHostVmKeys(value)) return false
  const validFields = [
    value.video === null || value.video instanceof HTMLVideoElement,
    value.videoId === null || typeof value.videoId === 'number',
    value.artifactKind === 'raw' || value.artifactKind === 'processed',
    typeof value.playbackMode === 'string',
    typeof value.playbackSourceUrl === 'string'
  ]
  return validFields.every(Boolean)
}

function requireHostVm(wrapper: ReturnType<typeof mountHost>): HostVm {
  const hostState: unknown = wrapper.vm
  if (!isHostVm(hostState)) {
    throw new Error('Authenticated video host fixture has an invalid shape.')
  }
  return hostState
}

function mountHost(onFatalError = vi.fn(), artifactKind: 'raw' | 'processed' = 'processed') {
  const Host = defineComponent({
    setup() {
      const video = ref<HTMLVideoElement | null>(null)
      const videoId = ref<number | null>(VIDEO_ID)
      const selectedArtifactKind = ref<'raw' | 'processed'>(artifactKind)
      const stream = useAuthenticatedVideoStream({
        videoElement: video,
        videoId,
        artifactKind: selectedArtifactKind,
        onFatalError
      })

      return {
        video,
        videoId,
        artifactKind: selectedArtifactKind,
        ...stream
      }
    },
    template: '<video ref="video"></video>'
  })

  return mount(Host)
}

function axiosError(status: number): unknown {
  return {
    isAxiosError: true,
    response: { status }
  }
}

describe('useAuthenticatedVideoStream', () => {
  afterEach(() => vi.useRealTimers())

  beforeEach(() => {
    vi.doMock('hls.js', () => ({ default: hlsMock.MockHls, LoadStats: hlsMock.MockLoadStats }))
    hlsMock.instances.length = 0
    hlsMock.MockHls.isSupported.mockReturnValue(true)
    axiosMock.get.mockResolvedValue({
      data: '#EXTM3U',
      headers: { 'content-type': 'application/vnd.apple.mpegurl' }
    })
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  it('does not import the player before a playlist has been validated', async () => {
    const loadPlayer = vi.fn(() => ({ default: hlsMock.MockHls }))
    vi.doMock('hls.js', loadPlayer)
    axiosMock.get.mockRejectedValue(axiosError(403))
    const wrapper = mountHost()
    await flushPromises()
    expect(loadPlayer).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it.each(['unmount', 'switch'] as const)(
    'ignores a stale player import after %s',
    async (action) => {
      let finish: ((module: { default: typeof hlsMock.MockHls; LoadStats: typeof hlsMock.MockLoadStats }) => void) | undefined
      const loadPlayer = vi.fn(
        () =>
          new Promise<{ default: typeof hlsMock.MockHls; LoadStats: typeof hlsMock.MockLoadStats }>((resolve) => {
            finish = resolve
          })
      )
      vi.doMock('hls.js', loadPlayer)
      const fatalError = vi.fn()
      const wrapper = mountHost(fatalError)
      await vi.waitFor(() => {
        expect(loadPlayer).toHaveBeenCalledTimes(1)
      })
      if (action === 'unmount') {
        wrapper.unmount()
      } else {
        requireHostVm(wrapper).videoId = null
        await flushVuePromises()
      }
      finish?.({ default: hlsMock.MockHls, LoadStats: hlsMock.MockLoadStats })
      await vi.dynamicImportSettled()
      await flushPromises()
      expect(hlsMock.instances).toHaveLength(0)
      if (action === 'switch') {
        requireHostVm(wrapper).videoId = 43
        await flushPromises()
        expect(hlsMock.instances).toHaveLength(1)
        expect(hlsMock.instances[0].loadSource).toHaveBeenCalledWith(
          buildVideoPlaybackUrls(43).hlsPlaylistUrl
        )
        wrapper.unmount()
      }
      expect(fatalError).not.toHaveBeenCalled()
    }
  )

  it('reports player import failures without attaching media', async () => {
    const failure = new Error('Player chunk unavailable')
    vi.doMock('hls.js', () => {
      throw failure
    })
    const fatalError = vi.fn()
    const wrapper = mountHost(fatalError)
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(requireHostVm(wrapper).playbackMode).toBe('error')
    expect(hlsMock.instances).toHaveLength(0)
    expect(fatalError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'hls_playback_failed' })
    )
    wrapper.unmount()
  })

  it('waits for HTTP 202 Retry-After before configuring playback', async () => {
    vi.useFakeTimers()
    axiosMock.get.mockResolvedValueOnce({
      status: 202,
      data: '{"status":"preparing"}',
      headers: { 'content-type': 'application/json', 'retry-after': '3' }
    })
    const wrapper = mountHost()
    await flushPromises()
    expect(requireHostVm(wrapper).playbackMode).toBe('preparing')
    expect(hlsMock.instances).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2999)
    expect(hlsMock.instances).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(requireHostVm(wrapper).playbackMode).toBe('hls')
    wrapper.unmount()
  })

  it('cancels preparation waiting when the target changes or unmounts', async () => {
    vi.useFakeTimers()
    axiosMock.get.mockResolvedValue({ status: 202, data: '{}', headers: { 'retry-after': '3' } })
    const fatalError = vi.fn()
    const wrapper = mountHost(fatalError)
    await flushPromises()
    requireHostVm(wrapper).videoId = 43
    await flushPromises()
    const requests = axiosMock.get.mock.calls.length
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(axiosMock.get).toHaveBeenCalledTimes(requests)
    expect(hlsMock.instances).toHaveLength(0)
    expect(fatalError).not.toHaveBeenCalled()
  })

  it('bounds repeated preparation responses and reports a timeout', async () => {
    vi.useFakeTimers()
    axiosMock.get.mockResolvedValue({ status: 202, data: '{}', headers: { 'retry-after': '10' } })
    const fatalError = vi.fn()
    const wrapper = mountHost(fatalError)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(requireHostVm(wrapper).playbackMode).toBe('error')
    expect(fatalError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'hls_preparation_timeout' })
    )
    expect(hlsMock.instances).toHaveLength(0)
    wrapper.unmount()
  })

  it('uses hls.js with credentialed playlist, key, and segment requests', async () => {
    const wrapper = mountHost()
    await flushPromises()

    const urls = buildVideoPlaybackUrls(VIDEO_ID)
    const instance = hlsMock.instances[0]
    const hostState = requireHostVm(wrapper)

    expect(axiosMock.get).toHaveBeenCalledWith(
      urls.hlsPlaylistUrl,
      expect.objectContaining({
        responseType: 'text',
        suppressErrorToast: true,
        withCredentials: true
      })
    )
    expect(instance.loadSource).toHaveBeenCalledWith(urls.hlsPlaylistUrl)
    expect(instance.attachMedia).toHaveBeenCalledWith(hostState.video)
    expect(hostState.playbackMode).toBe('hls')
    expect(hostState.playbackSourceUrl).toBe(urls.hlsPlaylistUrl)

    const xhr = new XMLHttpRequest()
    instance.config.xhrSetup?.(xhr, urls.hlsPlaylistUrl)
    expect(xhr.withCredentials).toBe(true)
    expect(instance.config).toMatchObject({
      backBufferLength: 30,
      capLevelToPlayerSize: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 120,
      startFragPrefetch: true
    })

    const crossOriginXhr = new XMLHttpRequest()
    const abort = vi.spyOn(crossOriginXhr, 'abort')
    instance.config.xhrSetup?.(crossOriginXhr, 'https://untrusted.invalid/segment.ts')
    expect(abort).toHaveBeenCalledOnce()
    expect(crossOriginXhr.withCredentials).toBe(false)
  })

  it('loads the authenticated raw HLS playlist when explicitly requested', async () => {
    const wrapper = mountHost(vi.fn(), 'raw')
    await flushPromises()

    const urls = buildVideoPlaybackUrls(VIDEO_ID, 'raw')
    const instance = hlsMock.instances[0]
    const hostState = requireHostVm(wrapper)

    expect(axiosMock.get).toHaveBeenCalledWith(
      urls.hlsPlaylistUrl,
      expect.objectContaining({ withCredentials: true })
    )
    expect(instance.loadSource).toHaveBeenCalledWith(urls.hlsPlaylistUrl)
    expect(hostState.playbackSourceUrl).toBe(urls.hlsPlaylistUrl)
  })

  it('reloads HLS when the selected artifact kind changes', async () => {
    const wrapper = mountHost()
    await flushPromises()

    const firstInstance = hlsMock.instances[0]
    requireHostVm(wrapper).artifactKind = 'raw'
    await flushPromises()

    const rawUrls = buildVideoPlaybackUrls(VIDEO_ID, 'raw')
    const secondInstance = hlsMock.instances[1]
    expect(firstInstance.destroy).toHaveBeenCalled()
    expect(axiosMock.get).toHaveBeenLastCalledWith(
      rawUrls.hlsPlaylistUrl,
      expect.objectContaining({ withCredentials: true })
    )
    expect(secondInstance.loadSource).toHaveBeenCalledWith(rawUrls.hlsPlaylistUrl)
  })

  it('uses native HLS with credentialed video requests when the browser supports it', async () => {
    hlsMock.MockHls.isSupported.mockReturnValue(false)
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockImplementation((contentType: string) =>
      contentType === 'application/vnd.apple.mpegurl' ? 'probably' : ''
    )

    const wrapper = mountHost()
    await flushPromises()

    const urls = buildVideoPlaybackUrls(VIDEO_ID)
    const hostState = requireHostVm(wrapper)

    expect(hlsMock.instances).toHaveLength(0)
    expect(hostState.video?.crossOrigin).toBe('use-credentials')
    expect(hostState.video?.src).toBe(urls.hlsPlaylistUrl)
    expect(hostState.playbackMode).toBe('native_hls')
  })

  it('fails closed when the encrypted HLS playlist is missing', async () => {
    const onFatalError = vi.fn()
    axiosMock.get.mockRejectedValue(axiosError(404))

    const wrapper = mountHost(onFatalError)
    await flushPromises()

    const hostState = requireHostVm(wrapper)

    expect(hlsMock.instances).toHaveLength(0)
    expect(hostState.video?.getAttribute('src')).toBeNull()
    expect(hostState.playbackMode).toBe('error')
    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'hls_playlist_unavailable',
        status: 404
      })
    )
  })

  it('rejects a successful response that is not an HLS playlist', async () => {
    const onFatalError = vi.fn()
    axiosMock.get.mockResolvedValue({
      data: '<!doctype html><title>Sign in</title>',
      headers: { 'content-type': 'text/html' }
    })

    const wrapper = mountHost(onFatalError)
    await flushPromises()

    const hostState = requireHostVm(wrapper)
    expect(hlsMock.instances).toHaveLength(0)
    expect(hostState.playbackMode).toBe('error')
    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'hls_playlist_invalid_response' })
    )
  })

  it('does not fall back when the HLS playlist is forbidden', async () => {
    const onFatalError = vi.fn()
    axiosMock.get.mockRejectedValue(axiosError(403))

    const wrapper = mountHost(onFatalError)
    await flushPromises()

    const urls = buildVideoPlaybackUrls(VIDEO_ID)
    const hostState = requireHostVm(wrapper)

    expect(hostState.playbackMode).toBe('error')
    expect(hostState.video?.src).not.toBe(urls.fallbackStreamUrl)
    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'hls_playlist_forbidden',
        status: 403
      })
    )
  })

  it('does not fall back after a fatal HLS segment or key load error', async () => {
    const onFatalError = vi.fn()
    const wrapper = mountHost(onFatalError)
    await flushPromises()

    const urls = buildVideoPlaybackUrls(VIDEO_ID)
    const instance = hlsMock.instances[0]
    const handler = instance.handlers.get(hlsMock.MockHls.Events.ERROR)
    expect(handler).toBeDefined()

    handler?.('hlsError', {
      fatal: true,
      type: 'networkError',
      details: 'fragLoadError'
    })
    await flushPromises()

    const hostState = requireHostVm(wrapper)
    expect(instance.destroy).toHaveBeenCalled()
    expect(hostState.playbackMode).toBe('error')
    expect(hostState.video?.src).not.toBe(urls.fallbackStreamUrl)
    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'hls_playback_failed'
      })
    )
  })

  it('attempts one bounded recovery for a fatal media error', async () => {
    const onFatalError = vi.fn()
    mountHost(onFatalError)
    await flushPromises()

    const instance = hlsMock.instances[0]
    const handler = instance.handlers.get(hlsMock.MockHls.Events.ERROR)
    handler?.('hlsError', {
      fatal: true,
      type: hlsMock.MockHls.ErrorTypes.MEDIA_ERROR,
      details: 'bufferAppendError'
    })
    handler?.('hlsError', {
      fatal: true,
      type: hlsMock.MockHls.ErrorTypes.MEDIA_ERROR,
      details: 'bufferAppendError'
    })
    await flushPromises()

    expect(instance.recoverMediaError).toHaveBeenCalledTimes(1)
    expect(onFatalError).toHaveBeenCalledTimes(1)
  })

  it('destroys the hls.js instance on unmount', async () => {
    const wrapper = mountHost()
    await flushPromises()

    const instance = hlsMock.instances[0]
    wrapper.unmount()

    expect(instance.destroy).toHaveBeenCalled()
  })

  it('cancels a stale playlist validation request when the selected video changes', async () => {
    axiosMock.get.mockImplementation(() => new Promise(() => undefined))
    const wrapper = mountHost()
    await Promise.resolve()

    const firstConfig = axiosMock.get.mock.calls[0]?.[1] as { signal?: AbortSignal }
    expect(firstConfig.signal?.aborted).toBe(false)
    requireHostVm(wrapper).videoId = 43
    await Promise.resolve()
    await Promise.resolve()

    expect(firstConfig.signal?.aborted).toBe(true)
    wrapper.unmount()
  })

  it('serves the validated playlist to hls.js once instead of requesting it again', async () => {
    const playlistText = '#EXTM3U\n#EXT-X-ENDLIST\n'
    axiosMock.get.mockResolvedValue({
      data: playlistText,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' }
    })
    mountHost()
    await flushPromises()

    const url = buildVideoPlaybackUrls(VIDEO_ID).hlsPlaylistUrl
    const PlaylistLoader = hlsMock.instances[0].config.pLoader
    if (!PlaylistLoader) throw new Error('Expected a playlist loader in the hls.js config.')
    const delegate: DelegateLoader = {
      load: vi.fn(),
      abort: vi.fn(),
      destroy: vi.fn(),
      context: null,
      stats: {}
    }
    const config = { loader: vi.fn(() => delegate) }

    const callbacks = { onSuccess: vi.fn(), onError: vi.fn(), onTimeout: vi.fn() }
    new PlaylistLoader(config).load({ url }, {}, callbacks)
    await Promise.resolve()
    expect(callbacks.onSuccess).toHaveBeenCalledWith(
      { url, data: playlistText },
      expect.objectContaining({ loaded: playlistText.length }),
      { url },
      null
    )
    expect(delegate.load).not.toHaveBeenCalled()
    expect(axiosMock.get).toHaveBeenCalledTimes(1)

    const retryCallbacks = { onSuccess: vi.fn(), onError: vi.fn(), onTimeout: vi.fn() }
    new PlaylistLoader(config).load({ url }, {}, retryCallbacks)
    await Promise.resolve()
    expect(retryCallbacks.onSuccess).not.toHaveBeenCalled()
    expect(delegate.load).toHaveBeenCalledWith({ url }, {}, retryCallbacks)
  })

  it('does not deliver the validated playlist after the loader is aborted', async () => {
    mountHost()
    await flushPromises()

    const url = buildVideoPlaybackUrls(VIDEO_ID).hlsPlaylistUrl
    const PlaylistLoader = hlsMock.instances[0].config.pLoader
    if (!PlaylistLoader) throw new Error('Expected a playlist loader in the hls.js config.')
    const delegate: DelegateLoader = {
      load: vi.fn(),
      abort: vi.fn(),
      destroy: vi.fn(),
      context: null,
      stats: {}
    }
    const loader = new PlaylistLoader({ loader: vi.fn(() => delegate) })
    const callbacks = { onSuccess: vi.fn(), onError: vi.fn(), onTimeout: vi.fn() }
    loader.load({ url }, {}, callbacks)
    loader.abort()
    await Promise.resolve()

    expect(callbacks.onSuccess).not.toHaveBeenCalled()
    expect(delegate.abort).toHaveBeenCalledOnce()
  })
})
