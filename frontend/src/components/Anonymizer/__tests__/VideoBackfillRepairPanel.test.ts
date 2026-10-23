import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VideoBackfillRepairPanel from '../VideoBackfillRepairPanel.vue'

const resetVideoForBackfill = vi.hoisted(() => vi.fn())
vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => ({ resetVideoForBackfill })
}))

const response = (status = 'repaired', missing: string[] = []) => ({
  items: [{ videoId: 3, status, missing, changes: ['anonymization_validated'] }]
})

describe('VideoBackfillRepairPanel', () => {
  beforeEach(() => resetVideoForBackfill.mockReset())

  it('requires a successful preview before applying to the same video', async () => {
    resetVideoForBackfill.mockResolvedValue(response())
    const wrapper = mount(VideoBackfillRepairPanel, { props: { videoId: 3 } })
    const buttons = wrapper.findAll('button')
    expect(buttons[2].attributes('disabled')).toBeDefined()
    await buttons[1].trigger('click')
    await flushPromises()
    expect(resetVideoForBackfill).toHaveBeenLastCalledWith(3, true)
    expect(buttons[2].attributes('disabled')).toBeUndefined()
    await buttons[2].trigger('click')
    await flushPromises()
    expect(resetVideoForBackfill).toHaveBeenLastCalledWith(3, false)
    expect(wrapper.text()).toContain('Starten')
    expect(wrapper.text()).toContain('noch keine neuen Nachweise')
    expect(buttons[2].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('keeps blocked resets disabled and explains the missing source', async () => {
    resetVideoForBackfill.mockResolvedValue(response('blocked', ['source_media']))
    const wrapper = mount(VideoBackfillRepairPanel, { props: { videoId: 3 } })
    await wrapper.findAll('button')[1].trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Originalquelle')
    expect(wrapper.findAll('button')[2].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('retains the existing repair action without starting a reset', async () => {
    const wrapper = mount(VideoBackfillRepairPanel, { props: { videoId: 3 } })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('repair')).toHaveLength(1)
    expect(resetVideoForBackfill).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
