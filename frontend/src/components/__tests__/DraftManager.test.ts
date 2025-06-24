import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DraftManager from '../DraftManager.vue'
import { useDraftStore } from '../../stores/draft'
import type { AnnotationDraft } from '@/types/annotation'

describe('DraftManager', () => {
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
    const wrapper = mount(DraftManager, {
      props: {
        videoId: 'video-1'
      }
    })
    
    expect(wrapper.find('.draft-manager').exists()).toBe(true)
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Keine Entwürfe vorhanden')
  })

  it('should display drafts for current video', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    // Add drafts for current video using new AnnotationDraft interface
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation 1'
    })

    store.saveDraft(videoId, {
      id: 'annotation-2',
      label: 'blood',
      start: 30,
      end: 40,
      note: 'Test annotation 2'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.empty-state').exists()).toBe(false)
    expect(wrapper.findAll('.draft-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Test annotation 1')
    expect(wrapper.text()).toContain('Test annotation 2')
  })

  it('should not show drafts from other videos', async () => {
    const store = useDraftStore()
    
    // Add draft for different video
    store.saveDraft('video-2', {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Other video annotation'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId: 'video-1' }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Other video annotation')
  })

  it('should emit save-draft when save button is clicked', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    const saveButton = wrapper.find('.save-draft-btn')
    expect(saveButton.exists()).toBe(true)
    
    await saveButton.trigger('click')
    
    const emitted = wrapper.emitted('save-draft')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual(expect.objectContaining({
      id: 'annotation-1',
      note: 'Test annotation',
      label: 'polyp'
    }))
  })

  it('should emit delete-draft when delete button is clicked', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    const deleteButton = wrapper.find('.delete-draft-btn')
    expect(deleteButton.exists()).toBe(true)
    
    await deleteButton.trigger('click')
    
    const emitted = wrapper.emitted('delete-draft')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe('annotation-1')
  })

  it('should show draft details correctly', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 65,
      end: 125,
      note: 'Test annotation with details'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    const draftItem = wrapper.find('.draft-item')
    expect(draftItem.text()).toContain('Test annotation with details')
    expect(draftItem.text()).toContain('01:05 - 02:05') // Formatted time
    expect(draftItem.text()).toContain('polyp')
  })

  it('should handle save all drafts action', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    // Add multiple drafts
    for (let i = 1; i <= 3; i++) {
      store.saveDraft(videoId, {
        id: `annotation-${i}`,
        label: 'polyp',
        start: i * 10,
        end: i * 10 + 5,
        note: `Test annotation ${i}`
      })
    }

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    const saveAllButton = wrapper.find('.save-all-btn')
    expect(saveAllButton.exists()).toBe(true)
    
    await saveAllButton.trigger('click')
    
    const emitted = wrapper.emitted('save-all-drafts')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toHaveLength(3)
  })

  it('should handle clear all drafts action', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    const clearAllButton = wrapper.find('.clear-all-btn')
    expect(clearAllButton.exists()).toBe(true)
    
    await clearAllButton.trigger('click')
    
    const emitted = wrapper.emitted('clear-all-drafts')
    expect(emitted).toBeTruthy()
  })

  it('should show draft count in header', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    // Add multiple drafts
    for (let i = 1; i <= 5; i++) {
      store.saveDraft(videoId, {
        id: `annotation-${i}`,
        label: 'polyp',
        start: i * 10,
        end: i * 10 + 5,
        note: `Test annotation ${i}`
      })
    }

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.draft-count-badge').text()).toBe('5')
  })

  it('should filter drafts by search term', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Important annotation'
    })

    store.saveDraft(videoId, {
      id: 'annotation-2',
      label: 'blood',
      start: 30,
      end: 40,
      note: 'Regular annotation'
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    // Should show both initially
    expect(wrapper.findAll('.draft-item')).toHaveLength(2)
    
    // Filter by search term
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('Important')
    
    await wrapper.vm.$nextTick()
    
    // Should show only matching draft
    expect(wrapper.findAll('.draft-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Important annotation')
    expect(wrapper.text()).not.toContain('Regular annotation')
  })

  it('should display label fallback when note is empty', async () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    store.saveDraft(videoId, {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20
      // note is undefined
    })

    const wrapper = mount(DraftManager, {
      props: { videoId }
    })
    
    await wrapper.vm.$nextTick()
    
    const draftItem = wrapper.find('.draft-item')
    // Should display label when note is not available
    expect(draftItem.text()).toContain('polyp')
  })
})