import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDraftStore } from '../../src/stores/draft'
import type { AnnotationDraft } from '../../src/types/annotation'

describe('Draft Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => null),
        removeItem: vi.fn(() => null),
        clear: vi.fn(() => null),
      },
      writable: true
    })
  })

  it('should initialize with empty state', () => {
    const store = useDraftStore()
    expect(store.draftAnnotations).toEqual({})
    expect(store.lastSaved).toBeNull()
    expect(store.hasUnsavedChanges).toBe(false)
  })

  it('should save draft annotation', () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    const annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    }

    store.saveDraft(videoId, annotation)

    expect(store.draftAnnotations[videoId]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 
          id: annotation.id, 
          note: annotation.note,
          start: annotation.start,
          end: annotation.end,
          label: annotation.label,
          isDraft: true
        })
      ])
    )
    expect(store.hasUnsavedChanges).toBe(true)
    expect(store.lastSaved).toBeInstanceOf(Date)
  })

  it('should get drafts for video', () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    const annotation1: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation 1'
    }
    const annotation2: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
      id: 'annotation-2',
      label: 'blood',
      start: 30,
      end: 40,
      note: 'Test annotation 2'
    }

    store.saveDraft(videoId, annotation1)
    store.saveDraft(videoId, annotation2)

    const drafts = store.getDraftsForVideo(videoId)
    expect(drafts).toHaveLength(2)
    
    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: annotation1.id, note: annotation1.note, label: annotation1.label }),
        expect.objectContaining({ id: annotation2.id, note: annotation2.note, label: annotation2.label })
      ])
    )
  })

  it('should remove draft annotation', () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    const annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    }

    store.saveDraft(videoId, annotation)
    expect(store.getDraftsForVideo(videoId)).toHaveLength(1)

    store.removeDraft(videoId, annotation.id)
    expect(store.getDraftsForVideo(videoId)).toHaveLength(0)
  })

  it('should clear all drafts for video', () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    
    // Add multiple drafts
    for (let i = 1; i <= 3; i++) {
      const annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
        id: `annotation-${i}`,
        label: 'polyp',
        start: i * 10,
        end: i * 10 + 5,
        note: `Test annotation ${i}`
      }
      store.saveDraft(videoId, annotation)
    }

    expect(store.getDraftsForVideo(videoId)).toHaveLength(3)
    
    store.clearDraftsForVideo(videoId)
    expect(store.getDraftsForVideo(videoId)).toHaveLength(0)
  })

  it('should clear all drafts', () => {
    const store = useDraftStore()
    
    // Add drafts for multiple videos
    for (let videoIndex = 1; videoIndex <= 2; videoIndex++) {
      const videoId = `video-${videoIndex}`
      for (let i = 1; i <= 2; i++) {
        const annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
          id: `annotation-${videoIndex}-${i}`,
          label: 'polyp',
          start: i * 10,
          end: i * 10 + 5,
          note: `Test annotation ${i}`
        }
        store.saveDraft(videoId, annotation)
      }
    }

    expect(Object.keys(store.draftAnnotations)).toHaveLength(2)
    
    store.clearAllDrafts()
    expect(store.draftAnnotations).toEqual({})
    expect(store.hasUnsavedChanges).toBe(false)
  })

  it('should persist drafts to localStorage', () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    const annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation'
    }

    // Mock localStorage
    const mockSetItem = vi.spyOn(Storage.prototype, 'setItem')
    
    store.saveDraft(videoId, annotation)
    
    expect(mockSetItem).toHaveBeenCalledWith(
      'lx-annotate-drafts',
      expect.stringContaining(annotation.id as string)
    )
  })

  it('should load drafts from localStorage', () => {
    const videoId = 'video-1'
    const annotation: AnnotationDraft = {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Test annotation',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const mockData = {
      [videoId]: [annotation]
    }

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockData))
    
    const store = useDraftStore()
    store.loadFromStorage()
    
    expect(store.getDraftsForVideo(videoId)).toHaveLength(1)
    expect(store.getDraftsForVideo(videoId)[0].id).toBe(annotation.id)
  })

  it('should update existing draft annotation', () => {
    const store = useDraftStore()
    const videoId = 'video-1'
    const annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> = {
      id: 'annotation-1',
      label: 'polyp',
      start: 10,
      end: 20,
      note: 'Original text'
    }

    store.saveDraft(videoId, annotation)
    expect(store.getDraftsForVideo(videoId)[0].note).toBe('Original text')

    // Update the annotation
    const updatedAnnotation = {
      ...annotation,
      note: 'Updated text'
    }

    store.saveDraft(videoId, updatedAnnotation)
    
    const drafts = store.getDraftsForVideo(videoId)
    expect(drafts).toHaveLength(1) // Should not duplicate
    expect(drafts[0].note).toBe('Updated text')
  })

  it('should handle empty localStorage gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    
    const store = useDraftStore()
    store.loadFromStorage()
    
    expect(store.draftAnnotations).toEqual({})
  })

  it('should handle corrupted localStorage data', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid json')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const store = useDraftStore()
    store.loadFromStorage()
    
    expect(store.draftAnnotations).toEqual({})
  })

  // Tests for draft segment functionality
  describe('Draft Segment Management', () => {
    it('should start a draft segment', () => {
      const store = useDraftStore()
      
      store.startDraft('polyp', 10)
      
      expect(store.draft).toEqual({
        label: 'polyp',
        start: 10,
        end: null
      })
      expect(store.isDraftActive).toBe(true)
      expect(store.isDraftComplete).toBe(false)
    })

    it('should update draft end time', () => {
      const store = useDraftStore()
      
      store.startDraft('polyp', 10)
      store.updateDraftEnd(20)
      
      expect(store.draft).toEqual({
        label: 'polyp',
        start: 10,
        end: 20
      })
      expect(store.isDraftActive).toBe(true)
      expect(store.isDraftComplete).toBe(true)
    })

    it('should cancel draft', () => {
      const store = useDraftStore()
      
      store.startDraft('polyp', 10)
      store.cancelDraft()
      
      expect(store.draft).toBeNull()
      expect(store.isDraftActive).toBe(false)
      expect(store.isDraftComplete).toBe(false)
    })
  })
})