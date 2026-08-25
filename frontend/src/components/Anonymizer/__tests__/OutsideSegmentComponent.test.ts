import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'

import OutsideSegmentComponent from '../OutsideSegmentComponent.vue'

const hoisted = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
  videoStoreRef: {
    current: {} as {
      allSegments: ReturnType<typeof buildSegment>[]
      fetchAllSegments: ReturnType<typeof vi.fn>
    }
  },
  useAuthenticatedVideoStream: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.axiosGet,
    post: hoisted.axiosPost
  },
  r: (value: string) => value
}))

vi.mock('@/types/api/endpoints', () => ({
  endpoints: {
    media: {
      videoDetail: (videoId: number) => `media/videos/${String(videoId)}/details/`,
      videoStream: (videoId: number) => `media/videos/${String(videoId)}/stream/`,
      videoSegmentValidate: (videoId: number, segmentId: number) =>
        `media/videos/${String(videoId)}/segments/${String(segmentId)}/validate/`
    }
  }
}))

vi.mock('@/stores/videoStore', () => ({
  useVideoStore: () => hoisted.videoStoreRef.current
}))

vi.mock('@/components/VideoExamination/Timeline.vue', () => ({
  default: {
    name: 'Timeline',
    template: '<div data-test="timeline"></div>'
  }
}))

vi.mock('@/composables/useAuthenticatedVideoStream', () => ({
  useAuthenticatedVideoStream: hoisted.useAuthenticatedVideoStream
}))

function buildSegment(id: number, label = 'outside') {
  return {
    id,
    label,
    startTime: 1.5,
    endTime: 4.5,
    avgConfidence: 1,
    labelID: null
  }
}

describe('OutsideSegmentComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.useAuthenticatedVideoStream.mockReturnValue({
      playbackError: ref(null),
      playbackSourceUrl: ref(''),
      playbackMode: ref('idle'),
      isHlsPlayback: ref(false)
    })

    hoisted.videoStoreRef.current = reactive({
      allSegments: [buildSegment(11), buildSegment(12), buildSegment(99, 'polyp')],
      fetchAllSegments: vi.fn().mockResolvedValue(undefined)
    })

    hoisted.axiosGet.mockResolvedValue({
      data: {
        video_url: '/api/media/videos/7/stream/',
        duration: 12
      }
    })
  })

  it('uses authenticated processed HLS without a legacy video src', async () => {
    const wrapper = mount(OutsideSegmentComponent, {
      props: { videoId: 7 }
    })

    await flushPromises()

    expect(hoisted.useAuthenticatedVideoStream).toHaveBeenCalledWith(
      expect.objectContaining({ artifactKind: 'processed' })
    )
    expect(wrapper.find('video').attributes('src')).toBeUndefined()
  })

  it('validates a single outside segment via the backend endpoint', async () => {
    hoisted.axiosPost.mockResolvedValue({ data: {} })

    const wrapper = mount(OutsideSegmentComponent, {
      props: { videoId: 7 }
    })

    await flushPromises()

    const buttons = wrapper.findAll('button.btn.btn-sm.btn-outline-success')
    expect(buttons).toHaveLength(2)

    await buttons[0].trigger('click')
    await flushPromises()

    expect(hoisted.axiosPost).toHaveBeenCalledWith(
      'media/videos/7/segments/11/validate/',
      {
        isValidated: true,
        informationSourceName: 'manual_annotation',
        startTime: 1.5,
        endTime: 4.5
      }
    )
    expect(wrapper.emitted('segment-validated')).toEqual([[11]])
    expect(wrapper.text()).toContain('1 / 2 validiert')
  })

  it('shows an error and keeps the segment unvalidated when backend validation fails', async () => {
    hoisted.axiosPost.mockRejectedValue(new Error('boom'))

    const wrapper = mount(OutsideSegmentComponent, {
      props: { videoId: 7 }
    })

    await flushPromises()

    await wrapper.find('button.btn.btn-sm.btn-outline-success').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('segment-validated')).toBeUndefined()
    expect(wrapper.text()).toContain('Segmentvalidierung fehlgeschlagen. Bitte erneut versuchen.')
    expect(wrapper.text()).toContain('0 / 2 validiert')
  })

  it('emits validation-complete after all outside segments are validated', async () => {
    hoisted.axiosPost.mockResolvedValue({ data: {} })

    const wrapper = mount(OutsideSegmentComponent, {
      props: { videoId: 7 }
    })

    await flushPromises()

    await wrapper.find('button.btn.btn-sm.btn-success').trigger('click')
    await flushPromises()
    await nextTick()

    expect(hoisted.axiosPost).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('validation-complete')).toEqual([[]])
    expect(wrapper.text()).toContain('2 / 2 validiert')
  })
})
