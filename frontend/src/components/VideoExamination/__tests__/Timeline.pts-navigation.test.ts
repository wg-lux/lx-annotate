import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Timeline from '@/components/VideoExamination/Timeline.vue'
import { useVideoStore } from '@/stores/videoStore'

const VIDEO_DURATION_SECONDS = 100
const VIDEO_MIDPOINT_SECONDS = 50
const TIMELINE_SEGMENT_COUNT = 6
const NAVIGATION_VIDEO_ID = 17
const CURRENT_FRAME_PTS = 0.11
const ADJACENT_FRAME_PTS = 0.16

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  r: (path: string) => path,
  a: (path: string) => path
}))

describe('Timeline PTS navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resizes the usable viewport while retaining rows and the default automatic height', async () => {
    const wrapper = mount(Timeline, {
      props: {
        video: { duration: VIDEO_DURATION_SECONDS },
        segments: Array.from({ length: TIMELINE_SEGMENT_COUNT }, (_, index) => ({
          id: index + 1,
          label: `label-${String(index)}`,
          startTime: 10,
          endTime: 20,
          avgConfidence: 1,
          labelID: index + 1,
          isDraft: false
        }))
      }
    })
    const track = wrapper.get<HTMLElement>('.timeline')
    expect(track.element.style.height).toBe('216px')
    expect(wrapper.findAll('.segment-row')).toHaveLength(TIMELINE_SEGMENT_COUNT)
    await wrapper.setProps({ height: 500 })
    expect(track.element.style.height).toBe('500px')
    expect(wrapper.get<HTMLElement>('.time-markers').element.style.height).toBe('500px')
    await wrapper.setProps({ height: 180 })
    expect(track.element.style.height).toBe('180px')
    expect(wrapper.get<HTMLElement>('.time-markers').element.style.height).toBe('384px')
    expect(wrapper.findAll('.segment-row')).toHaveLength(TIMELINE_SEGMENT_COUNT)
    await wrapper.setProps({ height: 0 })
    expect(track.element.style.height).toBe('104px')
    await wrapper.setProps({ height: undefined })
    expect(track.element.style.height).toBe('216px')
    wrapper.unmount()
  })

  it('zooms the track and seeks using its expanded, scrolled bounds', async () => {
    const wrapper = mount(Timeline, { props: { video: { duration: VIDEO_DURATION_SECONDS } } })
    const zoomIn = wrapper.get('button[aria-label="Timeline vergrößern"]')
    const zoomOut = wrapper.get('button[aria-label="Timeline verkleinern"]')
    expect(zoomOut.attributes('disabled')).toBeDefined()
    await zoomIn.trigger('click')
    const track = wrapper.get<HTMLElement>('.timeline')
    expect(track.element.style.width).toBe('calc(150% - 40px)')
    vi.spyOn(track.element, 'getBoundingClientRect').mockReturnValue({
      left: -100,
      right: 1400,
      top: 0,
      bottom: 200,
      width: 1500,
      height: 200,
      x: -100,
      y: 0,
      toJSON: () => ({})
    })
    await track.trigger('mousedown', { clientX: 650, button: 0 })
    expect(wrapper.emitted('seek')?.[0]).toEqual([VIDEO_MIDPOINT_SECONDS])
    document.dispatchEvent(new MouseEvent('mouseup'))
    for (let index = 0; index < 7; index++) await zoomIn.trigger('click')
    expect(zoomIn.attributes('disabled')).toBeDefined()
    for (let index = 0; index < 8; index++) await zoomOut.trigger('click')
    expect(track.element.style.width).toBe('calc(100% - 40px)')
    expect(zoomOut.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('centers playback when zooming and seeking, clamping at the video edges', async () => {
    const wrapper = mount(Timeline, {
      props: { video: { duration: VIDEO_DURATION_SECONDS }, currentTime: VIDEO_MIDPOINT_SECONDS }
    })
    const viewport = wrapper.get<HTMLElement>('.timeline-wrapper').element
    const track = wrapper.get<HTMLElement>('.timeline').element
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 1000 },
      scrollWidth: { configurable: true, value: 1500 }
    })
    Object.defineProperties(track, {
      clientWidth: { configurable: true, value: 1460 },
      offsetLeft: { configurable: true, value: 20 }
    })
    await wrapper.get('button[aria-label="Timeline vergrößern"]').trigger('click')
    expect(viewport.scrollLeft).toBe(250)
    await wrapper.setProps({ currentTime: 60 })
    expect(viewport.scrollLeft).toBe(396)
    await wrapper.setProps({ currentTime: VIDEO_DURATION_SECONDS })
    expect(viewport.scrollLeft).toBe(500)
    await wrapper.setProps({ currentTime: 0 })
    expect(viewport.scrollLeft).toBe(0)
    await wrapper.setProps({ currentTime: VIDEO_MIDPOINT_SECONDS })
    await wrapper.get('button[aria-label="Timeline verkleinern"]').trigger('click')
    expect(viewport.scrollLeft).toBe(0)
    wrapper.unmount()
  })

  it('seeks to the backend-provided adjacent PTS', async () => {
    const store = useVideoStore()
    store.setVideo({
      id: NAVIGATION_VIDEO_ID,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: 2
    })
    vi.spyOn(store, 'resolveAdjacentFrameTimestamp').mockResolvedValue(ADJACENT_FRAME_PTS)
    const wrapper = mount(Timeline, {
      props: { video: { duration: 2 }, currentTime: CURRENT_FRAME_PTS }
    })

    await wrapper.get('button[title="Ein Frame vor"]').trigger('click')
    await flushPromises()

    expect(store.resolveAdjacentFrameTimestamp).toHaveBeenCalledWith(
      NAVIGATION_VIDEO_ID,
      CURRENT_FRAME_PTS,
      1
    )
    expect(wrapper.emitted('seek')).toEqual([[ADJACENT_FRAME_PTS]])
  })
})
