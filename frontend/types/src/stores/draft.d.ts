import type { Ref } from 'vue';
import type { AnnotationDraft, DraftSegment, DraftBucket } from '@/types/annotation';
/**
 * Draft Store – handles both the *in‑progress* segment the user is currently
 * drawing and the list of annotation drafts that are waiting to be committed.
 */
export declare const useDraftStore: import("pinia").StoreDefinition<"draft", import("pinia")._UnwrapAll<Pick<{
    draft: Ref<{
        label: string;
        start: number;
        end: number | null;
    } | null, DraftSegment | {
        label: string;
        start: number;
        end: number | null;
    } | null>;
    startDraft: (label: string, start: number) => void;
    updateDraftEnd: (end: number) => void;
    cancelDraft: () => void;
    isDraftActive: import("vue").ComputedRef<boolean>;
    isDraftComplete: import("vue").ComputedRef<boolean>;
    draftAnnotations: Ref<DraftBucket, DraftBucket>;
    lastSaved: Ref<Date | null, Date | null>;
    hasUnsavedChanges: import("vue").ComputedRef<boolean>;
    saveDraft: (videoId: string | number, annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'>) => void;
    getDraftsForVideo: (videoId: string | number) => AnnotationDraft[];
    removeDraft: (videoId: string | number, annotationId: string | number) => void;
    clearDraftsForVideo: (videoId: string | number) => void;
    clearAllDrafts: () => void;
    loadFromStorage: () => void;
    saveToStorage: () => void;
}, "draft" | "draftAnnotations" | "lastSaved">>, Pick<{
    draft: Ref<{
        label: string;
        start: number;
        end: number | null;
    } | null, DraftSegment | {
        label: string;
        start: number;
        end: number | null;
    } | null>;
    startDraft: (label: string, start: number) => void;
    updateDraftEnd: (end: number) => void;
    cancelDraft: () => void;
    isDraftActive: import("vue").ComputedRef<boolean>;
    isDraftComplete: import("vue").ComputedRef<boolean>;
    draftAnnotations: Ref<DraftBucket, DraftBucket>;
    lastSaved: Ref<Date | null, Date | null>;
    hasUnsavedChanges: import("vue").ComputedRef<boolean>;
    saveDraft: (videoId: string | number, annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'>) => void;
    getDraftsForVideo: (videoId: string | number) => AnnotationDraft[];
    removeDraft: (videoId: string | number, annotationId: string | number) => void;
    clearDraftsForVideo: (videoId: string | number) => void;
    clearAllDrafts: () => void;
    loadFromStorage: () => void;
    saveToStorage: () => void;
}, "isDraftActive" | "isDraftComplete" | "hasUnsavedChanges">, Pick<{
    draft: Ref<{
        label: string;
        start: number;
        end: number | null;
    } | null, DraftSegment | {
        label: string;
        start: number;
        end: number | null;
    } | null>;
    startDraft: (label: string, start: number) => void;
    updateDraftEnd: (end: number) => void;
    cancelDraft: () => void;
    isDraftActive: import("vue").ComputedRef<boolean>;
    isDraftComplete: import("vue").ComputedRef<boolean>;
    draftAnnotations: Ref<DraftBucket, DraftBucket>;
    lastSaved: Ref<Date | null, Date | null>;
    hasUnsavedChanges: import("vue").ComputedRef<boolean>;
    saveDraft: (videoId: string | number, annotation: Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'>) => void;
    getDraftsForVideo: (videoId: string | number) => AnnotationDraft[];
    removeDraft: (videoId: string | number, annotationId: string | number) => void;
    clearDraftsForVideo: (videoId: string | number) => void;
    clearAllDrafts: () => void;
    loadFromStorage: () => void;
    saveToStorage: () => void;
}, "startDraft" | "updateDraftEnd" | "cancelDraft" | "saveDraft" | "getDraftsForVideo" | "removeDraft" | "clearDraftsForVideo" | "clearAllDrafts" | "loadFromStorage" | "saveToStorage">>;
