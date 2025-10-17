import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DraftIndicator from '../DraftIndicator.vue'
import { useDraftStore } from '../../stores/draft'
import type { AnnotationDraft } from '@/types/annotation'

describe('DraftIndicator', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Clear localStorage before each test
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {})
  })

  it('should render correctly when no drafts exist', () => {
    const wrapper = mount(DraftIndicator)

    expect(wrapper.find('.draft-indicator').exists()).toBe(true)
    expect(wrapper.find('.draft-count').text()).toBe('0')
    expect(wrapper.find('.draft-indicator').classes()).not.toContain('has-drafts')
  })

  it('should show draft count when drafts exist', async () => {
    const store = useDraftStore()

    // Add some drafts using new AnnotationDraft interface
    for (let i = 1; i <= 3; i++) {
      store.saveDraft('video-1', {
        id: `annotation-${i}`,
        label: 'polyp',
        start: i * 10,
        end: i * 10 + 5,
        note: `Test annotation ${i}`
      })
    }

    const wrapper = mount(DraftIndicator)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.draft-count').text()).toBe('3')
    expect(wrapper.find('.draft-indicator').classes()).toContain('has-drafts')
  })

  it('should show total draft count across all videos', async () => {
    const store = useDraftStore()

    // Add drafts for multiple videos
    store.saveDraft('video-1', {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation 1'
    })

    store.saveDraft('video-2', {
      id: 'annotation-2',
      label: 'blood',
      start: 30,
      end: 40,
      note: 'Test annotation 2'
    })

    const wrapper = mount(DraftIndicator)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.draft-count').text()).toBe('2')
  })

  it('should update when drafts are added or removed', async () => {
    const store = useDraftStore()
    const wrapper = mount(DraftIndicator)

    // Initially no drafts
    expect(wrapper.find('.draft-count').text()).toBe('0')

    // Add a draft
    store.saveDraft('video-1', {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.draft-count').text()).toBe('1')

    // Remove the draft
    store.removeDraft('video-1', 'annotation-1')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.draft-count').text()).toBe('0')
  })

  it('should show unsaved changes indicator', async () => {
    const store = useDraftStore()
    const wrapper = mount(DraftIndicator)

    // Initially no unsaved changes
    expect(wrapper.find('.unsaved-indicator').exists()).toBe(false)

    // Add a draft
    store.saveDraft('video-1', {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.unsaved-indicator').exists()).toBe(true)
  })

  it('should emit clear-all event when clear button is clicked', async () => {
    const store = useDraftStore()

    // Add a draft first
    store.saveDraft('video-1', {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    const wrapper = mount(DraftIndicator)
    await wrapper.vm.$nextTick()

    const clearButton = wrapper.find('.clear-drafts-btn')
    expect(clearButton.exists()).toBe(true)

    await clearButton.trigger('click')
    expect(wrapper.emitted('clear-all')).toBeTruthy()
  })

  it('should show tooltip with draft information', async () => {
    const store = useDraftStore()

    store.saveDraft('video-1', {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    const wrapper = mount(DraftIndicator)
    await wrapper.vm.$nextTick()

    const indicator = wrapper.find('.draft-indicator')
    expect(indicator.attributes('title')).toContain('1 ungespeicherte Annotation')
  })

  it('should show correct tooltip for multiple drafts', async () => {
    const store = useDraftStore()

    // Add multiple drafts
    for (let i = 1; i <= 5; i++) {
      store.saveDraft('video-1', {
        id: `annotation-${i}`,
        label: 'polyp',
        start: i * 10,
        end: i * 10 + 5,
        note: `Test annotation ${i}`
      })
    }

    const wrapper = mount(DraftIndicator)
    await wrapper.vm.$nextTick()

    const indicator = wrapper.find('.draft-indicator')
    expect(indicator.attributes('title')).toContain('5 ungespeicherte Annotationen')
  })
})
