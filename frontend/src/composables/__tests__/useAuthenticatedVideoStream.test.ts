import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthenticatedVideoStream } from '@/composables/useAuthenticatedVideoStream'
import { buildVideoPlaybackUrls } from '@/utils/mediaUrls'
import axiosInstance from '@/api/axiosInstance'

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

  return {
    MockHls,
    instances: [] as MockHls[]
  }
})

const axiosMock = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('hls.js', () => ({
  default: hlsMock.MockHls
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

function mountHost(onFatalError = vi.fn(), artifactKind: 'raw' | 'processed' = 'processed') {
  const Host = defineComponent({
    template: '<video ref="video"></video>',
    setup() {
      const video = ref<HTMLVideoElement | null>(null)
      const videoId = ref<number | null>(42)
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
    }
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
  beforeEach(() => {
    hlsMock.instances.length = 0
    hlsMock.MockHls.isSupported.mockReturnValue(true)
    axiosMock.get.mockResolvedValue({
      data: '#EXTM3U',
      headers: { 'content-type': 'application/vnd.apple.mpegurl' }
    })
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  it('uses hls.js with credentialed playlist, key, and segment requests', async () => {
    const wrapper = mountHost()
    await flushPromises()

    const urls = buildVideoPlaybackUrls(42)
    const instance = hlsMock.instances[0]
    const vm = wrapper.vm as unknown as HostVm

    expect(axiosInstance.get).toHaveBeenCalledWith(
      urls.hlsPlaylistUrl,
      expect.objectContaining({
        responseType: 'text',
        suppressErrorToast: true,
        withCredentials: true
      })
    )
    expect(instance.loadSource).toHaveBeenCalledWith(urls.hlsPlaylistUrl)
    expect(instance.attachMedia).toHaveBeenCalledWith(vm.video)
    expect(vm.playbackMode).toBe('hls')
    expect(vm.playbackSourceUrl).toBe(urls.hlsPlaylistUrl)

    const xhr = new XMLHttpRequest()
    instance.config.xhrSetup?.(xhr, urls.hlsPlaylistUrl)
    expect(xhr.withCredentials).toBe(true)
    expect(instance.config).toMatchObject({
      backBufferLength: 30,
      capLevelToPlayerSize: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 120,
      startFragPrefetch: false
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

    const urls = buildVideoPlaybackUrls(42, 'raw')
    const instance = hlsMock.instances[0]
    const vm = wrapper.vm as unknown as HostVm

    expect(axiosInstance.get).toHaveBeenCalledWith(
      urls.hlsPlaylistUrl,
      expect.objectContaining({ withCredentials: true })
    )
    expect(instance.loadSource).toHaveBeenCalledWith(urls.hlsPlaylistUrl)
    expect(vm.playbackSourceUrl).toBe(urls.hlsPlaylistUrl)
  })

  it('reloads HLS when the selected artifact kind changes', async () => {
    const wrapper = mountHost()
    await flushPromises()

    const firstInstance = hlsMock.instances[0]
    ;(wrapper.vm as unknown as HostVm).artifactKind = 'raw'
    await flushPromises()

    const rawUrls = buildVideoPlaybackUrls(42, 'raw')
    const secondInstance = hlsMock.instances[1]
    expect(firstInstance.destroy).toHaveBeenCalled()
    expect(axiosInstance.get).toHaveBeenLastCalledWith(
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

    const urls = buildVideoPlaybackUrls(42)
    const vm = wrapper.vm as unknown as HostVm

    expect(hlsMock.instances).toHaveLength(0)
    expect(vm.video?.crossOrigin).toBe('use-credentials')
    expect(vm.video?.src).toBe(urls.hlsPlaylistUrl)
    expect(vm.playbackMode).toBe('native_hls')
  })

  it('fails closed when the encrypted HLS playlist is missing', async () => {
    const onFatalError = vi.fn()
    axiosMock.get.mockRejectedValue(axiosError(404))

    const wrapper = mountHost(onFatalError)
    await flushPromises()

    const vm = wrapper.vm as unknown as HostVm

    expect(hlsMock.instances).toHaveLength(0)
    expect(vm.video?.getAttribute('src')).toBeNull()
    expect(vm.playbackMode).toBe('error')
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

    const vm = wrapper.vm as unknown as HostVm
    expect(hlsMock.instances).toHaveLength(0)
    expect(vm.playbackMode).toBe('error')
    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'hls_playlist_invalid_response' })
    )
  })

  it('does not fall back when the HLS playlist is forbidden', async () => {
    const onFatalError = vi.fn()
    axiosMock.get.mockRejectedValue(axiosError(403))

    const wrapper = mountHost(onFatalError)
    await flushPromises()

    const urls = buildVideoPlaybackUrls(42)
    const vm = wrapper.vm as unknown as HostVm

    expect(vm.playbackMode).toBe('error')
    expect(vm.video?.src).not.toBe(urls.fallbackStreamUrl)
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

    const urls = buildVideoPlaybackUrls(42)
    const instance = hlsMock.instances[0]
    const handler = instance.handlers.get(hlsMock.MockHls.Events.ERROR)
    expect(handler).toBeDefined()

    handler?.('hlsError', {
      fatal: true,
      type: 'networkError',
      details: 'fragLoadError'
    })
    await flushPromises()

    const vm = wrapper.vm as unknown as HostVm
    expect(instance.destroy).toHaveBeenCalled()
    expect(vm.playbackMode).toBe('error')
    expect(vm.video?.src).not.toBe(urls.fallbackStreamUrl)
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
    ;(wrapper.vm as unknown as HostVm).videoId = 43
    await Promise.resolve()
    await Promise.resolve()

    expect(firstConfig.signal?.aborted).toBe(true)
    wrapper.unmount()
  })
})
