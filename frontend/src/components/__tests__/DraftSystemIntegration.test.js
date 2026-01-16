import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useDraftStore } from '../../stores/draft';
import DraftIndicator from '../DraftIndicator.vue';
import DraftManager from '../DraftManager.vue';
describe('Draft System Integration', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn()
            },
            writable: true
        });
    });
    it('should synchronize between DraftIndicator and DraftManager', async () => {
        const store = useDraftStore();
        const videoId = 'video-1';
        // Mount both components
        const indicator = mount(DraftIndicator);
        const manager = mount(DraftManager, {
            props: { videoId }
        });
        // Initially empty
        expect(indicator.find('.draft-count').text()).toBe('0');
        expect(manager.find('.empty-state').exists()).toBe(true);
        // Add a draft through the store using new interface
        const annotation = {
            id: 'annotation-1',
            label: 'polyp',
            start: 10,
            end: 20,
            note: 'Test annotation'
        };
        store.saveDraft(videoId, annotation);
        await indicator.vm.$nextTick();
        await manager.vm.$nextTick();
        // Both should update
        expect(indicator.find('.draft-count').text()).toBe('1');
        expect(manager.find('.empty-state').exists()).toBe(false);
        expect(manager.findAll('.draft-item')).toHaveLength(1);
    });
    it('should handle draft operations across multiple videos', async () => {
        const store = useDraftStore();
        const indicator = mount(DraftIndicator);
        const manager1 = mount(DraftManager, { props: { videoId: 'video-1' } });
        const manager2 = mount(DraftManager, { props: { videoId: 'video-2' } });
        // Add drafts to different videos
        store.saveDraft('video-1', {
            id: 'annotation-1',
            label: 'polyp',
            start: 10,
            end: 20,
            note: 'Video 1 annotation'
        });
        store.saveDraft('video-2', {
            id: 'annotation-2',
            label: 'blood',
            start: 30,
            end: 40,
            note: 'Video 2 annotation'
        });
        await Promise.all([indicator.vm.$nextTick(), manager1.vm.$nextTick(), manager2.vm.$nextTick()]);
        // Indicator should show total count
        expect(indicator.find('.draft-count').text()).toBe('2');
        // Each manager should show only its video's drafts
        expect(manager1.findAll('.draft-item')).toHaveLength(1);
        expect(manager1.text()).toContain('Video 1 annotation');
        expect(manager1.text()).not.toContain('Video 2 annotation');
        expect(manager2.findAll('.draft-item')).toHaveLength(1);
        expect(manager2.text()).toContain('Video 2 annotation');
        expect(manager2.text()).not.toContain('Video 1 annotation');
    });
    it('should persist and restore drafts correctly', async () => {
        const store = useDraftStore();
        const videoId = 'video-1';
        const annotation = {
            id: 'annotation-1',
            label: 'polyp',
            start: 10,
            end: 20,
            note: 'Persistent annotation'
        };
        // Save draft
        store.saveDraft(videoId, annotation);
        // Verify localStorage was called
        expect(localStorage.setItem).toHaveBeenCalledWith('lx-annotate-drafts', expect.any(String));
        // Simulate page reload by creating new store
        setActivePinia(createPinia());
        const newStore = useDraftStore();
        // Mock localStorage return value - create full AnnotationDraft object
        const fullAnnotation = {
            ...annotation,
            isDraft: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const mockData = { [videoId]: [fullAnnotation] };
        vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockData));
        // Load from storage
        newStore.loadFromStorage();
        expect(newStore.getDraftsForVideo(videoId)).toHaveLength(1);
        expect(newStore.getDraftsForVideo(videoId)[0].note).toBe('Persistent annotation');
    });
    it('should handle bulk operations correctly', async () => {
        const store = useDraftStore();
        const videoId = 'video-1';
        const manager = mount(DraftManager, { props: { videoId } });
        // Add multiple drafts
        for (let i = 1; i <= 5; i++) {
            store.saveDraft(videoId, {
                id: `annotation-${i}`,
                label: 'polyp',
                start: i * 10,
                end: i * 10 + 5,
                note: `Test annotation ${i}`
            });
        }
        await manager.vm.$nextTick();
        expect(manager.findAll('.draft-item')).toHaveLength(5);
        // Test save all
        const saveAllButton = manager.find('.save-all-btn');
        await saveAllButton.trigger('click');
        const saveAllEmitted = manager.emitted('save-all-drafts');
        expect(saveAllEmitted).toBeTruthy();
        expect(saveAllEmitted[0][0]).toHaveLength(5);
        // Test clear all
        const clearAllButton = manager.find('.clear-all-btn');
        await clearAllButton.trigger('click');
        expect(manager.emitted('clear-all-drafts')).toBeTruthy();
    });
    it('should handle auto-save functionality', async () => {
        const store = useDraftStore();
        const videoId = 'video-1';
        // Mock timers
        vi.useFakeTimers();
        const annotation = {
            id: 'annotation-1',
            label: 'polyp',
            start: 10,
            end: 20,
            note: 'Auto-saved annotation'
        };
        store.saveDraft(videoId, annotation);
        // Verify initial save
        expect(store.lastSaved).toBeInstanceOf(Date);
        // Update the annotation
        const updatedAnnotation = {
            ...annotation,
            note: 'Updated auto-saved annotation'
        };
        store.saveDraft(videoId, updatedAnnotation);
        // Verify update
        expect(store.getDraftsForVideo(videoId)[0].note).toBe('Updated auto-saved annotation');
        vi.useRealTimers();
    });
    it('should handle error states gracefully', async () => {
        const store = useDraftStore();
        // Mock localStorage to throw error
        vi.mocked(localStorage.setItem).mockImplementation(() => {
            throw new Error('Storage quota exceeded');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        // This should not throw
        expect(() => {
            store.saveDraft('video-1', {
                id: 'annotation-1',
                label: 'polyp',
                start: 10,
                end: 20,
                note: 'Test annotation'
            });
        }).not.toThrow();
        // Should log error
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
    it('should maintain data consistency during concurrent operations', async () => {
        const store = useDraftStore();
        const videoId = 'video-1';
        const annotation1 = {
            id: 'annotation-1',
            label: 'polyp',
            start: 10,
            end: 20,
            note: 'First annotation'
        };
        const annotation2 = {
            id: 'annotation-2',
            label: 'blood',
            start: 30,
            end: 40,
            note: 'Second annotation'
        };
        // Simulate concurrent saves
        store.saveDraft(videoId, annotation1);
        store.saveDraft(videoId, annotation2);
        const drafts = store.getDraftsForVideo(videoId);
        expect(drafts).toHaveLength(2);
        expect(drafts.find((d) => d.id === 'annotation-1')).toBeDefined();
        expect(drafts.find((d) => d.id === 'annotation-2')).toBeDefined();
        // Remove one
        store.removeDraft(videoId, 'annotation-1');
        const remainingDrafts = store.getDraftsForVideo(videoId);
        expect(remainingDrafts).toHaveLength(1);
        expect(remainingDrafts[0].id).toBe('annotation-2');
    });
    it('should handle draft segment workflow', async () => {
        const store = useDraftStore();
        // Test draft segment creation
        expect(store.isDraftActive).toBe(false);
        expect(store.isDraftComplete).toBe(false);
        // Start draft
        store.startDraft('polyp', 10);
        expect(store.isDraftActive).toBe(true);
        expect(store.isDraftComplete).toBe(false);
        expect(store.draft).toEqual({
            label: 'polyp',
            start: 10,
            end: null
        });
        // Complete draft
        store.updateDraftEnd(20);
        expect(store.isDraftActive).toBe(true);
        expect(store.isDraftComplete).toBe(true);
        expect(store.draft).toEqual({
            label: 'polyp',
            start: 10,
            end: 20
        });
        // Cancel draft
        store.cancelDraft();
        expect(store.isDraftActive).toBe(false);
        expect(store.isDraftComplete).toBe(false);
        expect(store.draft).toBeNull();
    });
});
