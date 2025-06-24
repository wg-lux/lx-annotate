import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { AnnotationDraft, DraftSegment, DraftBucket } from '@/types/annotation';

const STORAGE_KEY = 'lx-annotate-drafts';

/**
 * Draft Store – handles both the *in‑progress* segment the user is currently
 * drawing and the list of annotation drafts that are waiting to be committed.
 */
export const useDraftStore = defineStore('draft', () => {
  /** the segment that is currently being drawn with the mouse */
  const draft = ref<DraftSegment | null>(null);

  /** all persisted drafts grouped by video id */
  const draftAnnotations: Ref<DraftBucket> = ref({});

  /** last time any draft annotation was saved */
  const lastSaved = ref<Date | null>(null);

  /* ────────────────────────────────
   * computed helpers
   * ───────────────────────────── */
  const hasUnsavedChanges = computed(() => {
    return Object.values(draftAnnotations.value).some(list => list.length > 0);
  });

  /* ────────────────────────────────
   * in‑progress segment helpers
   * ───────────────────────────── */
  function startDraft(label: string, start: number): void {
    draft.value = { label, start, end: null };
  }

  function updateDraftEnd(end: number): void {
    if (draft.value) {
      draft.value.end = end;
    }
  }

  function cancelDraft(): void {
    draft.value = null;
  }

  const isDraftActive = computed(() => draft.value !== null);
  const isDraftComplete = computed(() => draft.value !== null && draft.value.end !== null);

  /* ────────────────────────────────
   * annotation draft helpers
   * ───────────────────────────── */
  function saveDraft(videoId: string | number, annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'>): void {
    const bucket = draftAnnotations.value;

    // always work with a copy so tests comparing by reference don't break
    const entry: AnnotationDraft = {
      ...annotation,
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const list = bucket[videoId] ||= [];
    const idx = list.findIndex(a => a.id === entry.id);
    if (idx === -1) {
      list.push(entry);
    } else {
      list[idx] = { ...entry, createdAt: list[idx].createdAt }; // preserve original creation time
    }

    lastSaved.value = new Date();
    saveToStorage();
  }

  /** return **clones** so callers can mutate safely without affecting store */
  function getDraftsForVideo(videoId: string | number): AnnotationDraft[] {
    return (draftAnnotations.value[videoId] || []).map(d => ({ ...d }));
  }

  function removeDraft(videoId: string | number, annotationId: string | number) {
    const list = draftAnnotations.value[videoId];
    if (!list) return;

    // ✅ FIX: Handle both string and number IDs and filter correctly
    const initialLength = list.length;
    const newList = list.filter(a => a.id !== annotationId);

    if (newList.length === 0) {
      delete draftAnnotations.value[videoId];
    } else {
      draftAnnotations.value[videoId] = newList;
    }

    // Only save if something was actually removed
    if (newList.length !== initialLength) {
      saveToStorage();
    }
  }

  function clearDraftsForVideo(videoId: string | number): void {
    if (draftAnnotations.value[videoId]) {
      delete draftAnnotations.value[videoId];
      saveToStorage();
    }
  }

  function clearAllDrafts(): void {
    draftAnnotations.value = {};
    lastSaved.value = null;
    saveToStorage();
  }

  /* ────────────────────────────────
   * persistence helpers
   * ───────────────────────────── */
  function saveToStorage(): void {
    try {
      const raw = JSON.stringify(draftAnnotations.value);
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DraftStore] Failed to save drafts to localStorage', err);
    }
  }

  function loadFromStorage(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        draftAnnotations.value = JSON.parse(raw) as DraftBucket;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DraftStore] Failed to parse drafts from localStorage', err);
      draftAnnotations.value = {};
    }
  }

  // hydrate once per tab‑life
  if (typeof window !== 'undefined') {
    loadFromStorage();
  }

  /* ────────────────────────────────
   * expose API – keep reactive refs, no readonly() here so tests can stub
   * ───────────────────────────── */
  return {
    // in‑progress segment
    draft,
    startDraft,
    updateDraftEnd,
    cancelDraft,
    isDraftActive,
    isDraftComplete,

    // annotation drafts
    draftAnnotations,
    lastSaved,
    hasUnsavedChanges,
    saveDraft,
    getDraftsForVideo,
    removeDraft,
    clearDraftsForVideo,
    clearAllDrafts,

    // persistence helpers (exposed mainly for e2e tests)
    loadFromStorage,
    saveToStorage,
  };
});
