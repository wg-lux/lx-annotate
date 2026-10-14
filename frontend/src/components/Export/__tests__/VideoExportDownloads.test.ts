import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: { get: mocks.get },
  r: (path: string) => `/endoreg-api/${path}`
}))
vi.mock('@/utils/saveDownload', () => ({ saveDownload: mocks.save }))
import VideoExportDownloads from '../VideoExportDownloads.vue'

describe('direct video export downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses native streaming download for the selected anonymized video', async () => {
    const wrapper = mount(VideoExportDownloads, { props: { video: 7, marked: false } })
    expect(wrapper.get('[data-test="download-video"]').attributes('href')).toBe(
      '/endoreg-api/media/videos/7/download/'
    )
    await wrapper.setProps({ video: 9 })
    expect(wrapper.get('[data-test="download-video"]').attributes('href')).toBe(
      '/endoreg-api/media/videos/9/download/'
    )
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('downloads annotation CSV with the selected export scope', async () => {
    const blob = new Blob(['frame_number,presentation_timestamp\r\n7,144224\r\n'])
    mocks.get.mockResolvedValue({ data: blob })
    const wrapper = mount(VideoExportDownloads, { props: { video: 7, marked: true } })
    await wrapper.get('[data-test="download-annotations"]').trigger('click')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/endoreg-api/media/videos/7/annotations.csv', {
      params: { use_export_flags: true },
      responseType: 'blob',
      headers: { Accept: 'application/json' }
    })
    expect(mocks.save).toHaveBeenCalledWith(blob, 'video_7_annotationen.csv')
  })

  it('selects pre-import timestamps independently of annotation coordinates', async () => {
    const blob = new Blob(['original timestamps'])
    mocks.get.mockResolvedValue({ data: blob })
    const wrapper = mount(VideoExportDownloads, { props: { video: 7, marked: true } })
    await wrapper.get('#download-timeline').setValue('original')
    await wrapper.get('[data-test="download-timestamps"]').trigger('click')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/endoreg-api/media/videos/7/timestamps.csv', {
      params: { timeline: 'original' },
      responseType: 'blob',
      headers: { Accept: 'application/json' }
    })
    expect(mocks.save).toHaveBeenCalledWith(blob, 'video_7_original_pts.csv')
  })

  it('reports failure without offering a successful download', async () => {
    mocks.get.mockRejectedValue(new Error('not available'))
    const wrapper = mount(VideoExportDownloads, { props: { video: 7, marked: false } })
    await wrapper.get('[data-test="download-annotations"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('fehlgeschlagen')
    expect(mocks.save).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="download-annotations"]').attributes('disabled')).toBeUndefined()
  })
})
