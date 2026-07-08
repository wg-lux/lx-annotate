import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthenticatedVideoStream } from '@/composables/useAuthenticatedVideoStream'
import { buildVideoPlaybackUrls } from '@/utils/mediaUrls'
import axiosInstance from '@/api/axiosInstance'

const hlsMock = vi.hoisted(() => {
  type ErrorHandler = (event: string, data: { fatal?: boolean; type?: string; details?: string }) => void

  class MockHls {
    static Events = { ERROR: 'hlsError' }
    static isSupported = vi.fn()

    config: { xhrSetup?: (xhr: XMLHttpRequest) => void }
    handlers = new Map<string, ErrorHandler>()
    loadSource = vi.fn()
    attachMedia = vi.fn()
    destroy = vi.fn()
    on = vi.fn((event: string, handler: ErrorHandler) => {
      this.handlers.set(event, handler)
      return this
    })

    constructor(config: { xhrSetup?: (xhr: XMLHttpRequest) => void } = {}) {
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
  playbackMode: string
  playbackSourceUrl: string
}

function mountHost(onFatalError = vi.fn()) {
  const Host = defineComponent({
    template: '<video ref="video"></video>',
    setup() {
      const video = ref<HTMLVideoElement | null>(null)
      const videoId = ref<number | null>(42)
      const stream = useAuthenticatedVideoStream({
        videoElement: video,
        videoId,
        onFatalError
      })

      return {
        video,
        videoId,
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
    axiosMock.get.mockResolvedValue({ data: '#EXTM3U' })
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
    instance.config.xhrSetup?.(xhr)
    expect(xhr.withCredentials).toBe(true)
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

  it('falls back to the progressive stream only when the HLS playlist is missing', async () => {
    axiosMock.get.mockRejectedValue(axiosError(404))

    const wrapper = mountHost()
    await flushPromises()

    const urls = buildVideoPlaybackUrls(42)
    const vm = wrapper.vm as unknown as HostVm

    expect(hlsMock.instances).toHaveLength(0)
    expect(vm.video?.src).toBe(urls.fallbackStreamUrl)
    expect(vm.playbackMode).toBe('progressive')
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

  it('destroys the hls.js instance on unmount', async () => {
    const wrapper = mountHost()
    await flushPromises()

    const instance = hlsMock.instances[0]
    wrapper.unmount()

    expect(instance.destroy).toHaveBeenCalled()
  })
})
