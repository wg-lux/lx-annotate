import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
vi.mock('@/stores/videoStore', () => ({
  useVideoStore: () => ({
    getColorForLabel: vi.fn((label: string) => (label === 'outside' ? '#ff0000' : '#00aa00')),
    getTranslationForLabel: vi.fn((label: string) => label)
  })
}))

vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => ({
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  })
}))

import Timeline from '@/components/VideoExamination/Timeline.vue'

describe('Timeline.vue', () => {
  const baseProps = {
    video: { duration: 120 },
    currentTime: 0,
    isPlaying: false,
    activeSegmentId: null,
    selectionMode: false,
    showWaveform: false,
    fps: 50,
    labels: [{ id: 1, name: 'outside', color: '#ff0000' }],
    segments: [
      {
        id: 1,
        label: 'outside',
        startTime: 10,
        endTime: 20,
        avgConfidence: 0.95,
        labelID: 1,
        isDraft: false
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('edits segment times via right-click editor and emits segment-resize', async () => {
    const wrapper = mount(Timeline, {
      props: baseProps,
      attachTo: document.body
    })

    await nextTick()
    await nextTick()

    const segment = wrapper.find('.segment')
    expect(segment.exists()).toBe(true)

    await segment.trigger('contextmenu', { clientX: 200, clientY: 140 })
    await nextTick()

    expect(wrapper.find('.time-editor').exists()).toBe(true)

    const startInput = wrapper.find('#segment-start-input')
    const endInput = wrapper.find('#segment-end-input')
    await startInput.setValue('0:12.5')
    await endInput.setValue('0:22.75')
    await wrapper.find('.time-editor-btn.primary').trigger('click')
    await nextTick()

    const emitted = wrapper.emitted('segment-resize')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([1, 12.5, 22.75, 'manual', true])
    expect(wrapper.find('.time-editor').exists()).toBe(false)

    wrapper.unmount()
  })

  it('shows validation error and does not emit when time input is invalid', async () => {
    const wrapper = mount(Timeline, {
      props: baseProps
    })

    await nextTick()
    const segment = wrapper.find('.segment')
    await segment.trigger('contextmenu', { clientX: 200, clientY: 140 })
    await nextTick()

    await wrapper.find('#segment-start-input').setValue('invalid')
    await wrapper.find('#segment-end-input').setValue('0:22')
    await wrapper.find('.time-editor-btn.primary').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Ungültiges Zeitformat')
    expect(wrapper.emitted('segment-resize')).toBeFalsy()

    wrapper.unmount()
  })

  it('opens legacy context menu on shift + right-click', async () => {
    const wrapper = mount(Timeline, {
      props: baseProps
    })

    await nextTick()
    await wrapper.find('.segment').trigger('contextmenu', {
      shiftKey: true,
      clientX: 200,
      clientY: 140
    })
    await nextTick()

    expect(wrapper.find('.context-menu').exists()).toBe(true)
    expect(wrapper.find('.time-editor').exists()).toBe(false)

    wrapper.unmount()
  })
})
