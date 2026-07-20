import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Timeline from '@/components/VideoExamination/Timeline.vue'
import { useVideoStore } from '@/stores/videoStore'

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

  it('seeks to the backend-provided adjacent PTS', async () => {
    const store = useVideoStore()
    store.setVideo({
      id: 17,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: 2
    })
    vi.spyOn(store, 'resolveAdjacentFrameTimestamp').mockResolvedValue(0.16)
    const wrapper = mount(Timeline, {
      props: { video: { duration: 2 }, currentTime: 0.11 }
    })

    await wrapper.get('button[title="Ein Frame vor"]').trigger('click')
    await flushPromises()

    expect(store.resolveAdjacentFrameTimestamp).toHaveBeenCalledWith(17, 0.11, 1)
    expect(wrapper.emitted('seek')).toEqual([[0.16]])
  })
})
