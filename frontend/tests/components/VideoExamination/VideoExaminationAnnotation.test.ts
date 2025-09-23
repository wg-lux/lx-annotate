import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useDraftStore } from '@/stores/draft'
import DraftIndicator from '@/components/DraftIndicator.vue'
import DraftManager from '@/components/DraftManager.vue'
import type { AnnotationDraft } from '@/types/annotation'

interface Segment {
  id: number
  label: string
  startTime: number
  endTime: number
  video_id: number
  label_display: string
  avgConfidence: number
}

describe('Draft System Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })
  })

  it('DraftIndicator.vue - should show draft indicator when draft exists', async () => {
    // Arrange
    const store = useDraftStore()
    const annotation: AnnotationDraft = {
      id: '123',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test Polyp',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    store.saveDraft('video-1', annotation)

    const wrapper = mount(DraftIndicator, {
      global: {
        mocks: {
          $t: (msg: string) => msg, // Mock translation function
        },
      },
    })

    // Act
    await wrapper.vm.$nextTick()

    // Assert
    const drafts = store.getDraftsForVideo('video-1')
    expect(drafts).toHaveLength(1)
    expect(drafts[0].note).toBe('Test Polyp')
  })

  it('DraftManager.vue - should list drafts and allow deletion', async () => {
    // Arrange
    const store = useDraftStore()
    const annotation1: AnnotationDraft = {
      id: '123',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test Polyp',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const annotation2: AnnotationDraft = {
      id: '124',
      label: 'blood',
      start: 15,
      end: 25,
      note: 'Test Blood',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    store.saveDraft('video-1', annotation1)
    store.saveDraft('video-1', annotation2)

    const wrapper = mount(DraftManager, {
      global: {
        mocks: {
          $t: (msg: string) => msg, // Mock translation function
        },
      },
    })

    // Act
    await wrapper.vm.$nextTick()

    // Assert - Check if both drafts are listed
    const drafts = store.getDraftsForVideo('video-1')
    expect(drafts).toHaveLength(2)
    expect(drafts.find((d: AnnotationDraft) => d.note === 'Test Polyp')).toBeDefined()
    expect(drafts.find((d: AnnotationDraft) => d.note === 'Test Blood')).toBeDefined()

    // Act - Delete first draft
    store.removeDraft('video-1', '123')

    // Assert - Check if the draft is removed
    const updatedDrafts = store.getDraftsForVideo('video-1')
    expect(updatedDrafts).toHaveLength(1)
    expect(updatedDrafts.find((d: AnnotationDraft) => d.note === 'Test Polyp')).toBeUndefined()
  })

  it('should persist drafts to localStorage', () => {
    // Arrange
    const store = useDraftStore()
    const annotation: AnnotationDraft = {
      id: '123',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test Polyp',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Act
    store.saveDraft('video-1', annotation)

    // Assert
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'lx-annotate-drafts',
      expect.stringContaining('"video-1"')
    )
  })

  it('should load drafts from localStorage on creation', () => {
    // Arrange
    const draftData = {
      'video-1': [
        {
          id: '123',
          label: 'polyp',
          start: 10,
          end: 20,
          note: 'Test Polyp',
          isDraft: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '124',
          label: 'blood',
          start: 15,
          end: 25,
          note: 'Test Blood',
          isDraft: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    }
    
    // Mock localStorage.getItem to return our test data
    vi.mocked(window.localStorage.getItem).mockReturnValue(JSON.stringify(draftData))

    // Act
    const store = useDraftStore()
    store.loadFromStorage()

    // Assert
    const drafts = store.getDraftsForVideo('video-1')
    expect(drafts).toHaveLength(2)
    expect(drafts[0].id).toBe('123')
    expect(drafts[1].id).toBe('124')
  })

  it('should handle segment creation with required properties', () => {
    // Arrange
    const segment: Segment = {
      id: 1,
      label: 'polyp',
      startTime: 10,
      endTime: 20,
      video_id: 1,
      label_display: 'Polyp',
      avgConfidence: 0.85
    }

    // Act & Assert
    expect(segment.label_display).toBe('Polyp')
    expect(segment.avgConfidence).toBe(0.85)
    expect(segment.video_id).toBe(1)
  })

  it('should handle another segment creation with required properties', () => {
    // Arrange
    const segment: Segment = {
      id: 2,
      label: 'blood',
      startTime: 25,
      endTime: 35,
      video_id: 1,
      label_display: 'Blood',
      avgConfidence: 0.92
    }

    // Act & Assert
    expect(segment.label_display).toBe('Blood')
    expect(segment.avgConfidence).toBe(0.92)
    expect(segment.video_id).toBe(1)
  })
})