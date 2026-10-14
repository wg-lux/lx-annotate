import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VideoProvenanceRepairPanel from '../VideoProvenanceRepairPanel.vue'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/api/axiosInstance', () => ({ default: { post }, r: (path: string) => path, silentRequestConfig: () => ({ suppressErrorToast: true }) }))
const result = (status: 'preview' | 'recovered') => ({ data: {
  videoId: 3, status, mappingStatus: 'unresolved', electricalMatchingEligible: false,
  originalTimestampsAvailable: false
} })

describe('explicit unresolved provenance recovery', () => {
  beforeEach(() => { post.mockReset() })

  it('requires preview, acknowledges missing originals, and never claims electrical matching', async () => {
    post.mockResolvedValueOnce(result('preview')).mockResolvedValueOnce(result('recovered'))
    const wrapper = mount(VideoProvenanceRepairPanel, { props: { videoId: 3 } })
    const buttons = wrapper.findAll('button')
    expect(buttons[1].attributes('disabled')).toBeDefined()
    await buttons[0].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Originalzeitstempel fehlen und wurden nicht geschätzt')
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    await buttons[1].trigger('click')
    await flushPromises()
    expect(post).toHaveBeenLastCalledWith('media/videos/3/provenance/recover/', {
      acknowledge_unresolved: true, dry_run: false,
      recording_started_at: null, recording_ended_at: null
    }, { suppressErrorToast: true })
    expect(wrapper.emitted('repaired')).toHaveLength(1)
    expect(wrapper.text()).toContain('Elektrische Datenzuordnung bleibt gesperrt')
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })

  it('does not apply a preview to another selection', async () => {
    let resolvePreview: (value: ReturnType<typeof result>) => void = () => {}
    post.mockReturnValue(new Promise((resolve) => { resolvePreview = resolve }))
    const wrapper = mount(VideoProvenanceRepairPanel, { props: { videoId: 3 } })
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.setProps({ videoId: 4 })
    resolvePreview(result('preview'))
    await flushPromises()
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('repaired')).toBeUndefined()
  })

  it('invalidates a preview when recording times change and fails visibly', async () => {
    post.mockResolvedValueOnce(result('preview')).mockRejectedValueOnce(new Error('failed'))
    const wrapper = mount(VideoProvenanceRepairPanel, { props: { videoId: 3 } })
    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()
    await wrapper.findAll('input')[0].setValue('2026-10-13T10:00')
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht repariert')
    expect(wrapper.emitted('repaired')).toBeUndefined()
  })
  it.each([
    ['active_media_operation', 'Aktiver Medienzugriff', 'weitere Wiedergaben'],
    ['active_processing', 'Videoverarbeitung läuft oder wartet', 'ihren Status'],
    ['recovery_precondition_failed', 'Integrity check failed', 'Integrity check failed']
  ])('shows %s without retrying or enabling apply', async (code, heading, guidance) => {
    post.mockRejectedValue({ isAxiosError: true, response: {
      status: 409, data: { code, error: 'Integrity check failed' }
    } })
    const beforeRequest = vi.fn(() => { expect(post).not.toHaveBeenCalled() })
    const wrapper = mount(VideoProvenanceRepairPanel, {
      props: { videoId: 3, onBeforeRequest: beforeRequest }
    })
    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()
    expect(beforeRequest).toHaveBeenCalledOnce()
    expect(wrapper.get('[role="alert"]').text()).toContain(heading)
    expect(wrapper.get('[role="alert"]').text()).toContain(guidance)
    if (code === 'recovery_precondition_failed') {
      expect(wrapper.get('[role="alert"]').text()).not.toContain('erneut')
    }
    expect(post).toHaveBeenCalledOnce()
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('repaired')).toBeUndefined()
    wrapper.unmount()
  })

})
