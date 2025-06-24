/**
 * A single unfinished segment that is currently being drawn on the timeline
 * (created with `startDraft` and completed with `updateDraftEnd`).
 */
export interface DraftSegment {
    label: string;
    /** start time in **seconds** */
    start: number;
    /** end time in **seconds** – `null` while the user is still dragging */
    end: number | null;
}
/**
 * A persisted annotation that lives only in the client until the user clicks
 * "Save". It is keyed by **video‑id** so multiple videos can have independent
 * draft queues.
 */
export interface AnnotationDraft {
    /** back‑end id (when it already exists) or a temporary uuid */
    id: string | number;
    label: string;
    /** start time in seconds */
    start: number;
    /** end time in seconds */
    end: number;
    /** optional free‑text entered by the reviewer */
    note?: string;
    /** flag that tells the UI this has not been sent to the server yet */
    isDraft: true;
    /** ISO timestamps – kept as string when re‑hydrated from LS */
    createdAt: string;
    updatedAt: string;
}
/** Internal shape stored in <localStorage>. */
export type DraftBucket = Record<string, AnnotationDraft[]>;
export interface Annotation {
    id: string | number;
    category?: string;
    startTime?: number;
    endTime?: number;
    text?: string;
    videoId?: string;
}
export interface Label {
    id: string | number;
    name: string;
    label_type?: string;
    description?: string;
    color?: string;
    order_priority?: number;
}
export declare function isAnnotationDraft(obj: any): obj is AnnotationDraft;
export declare function annotationDraftToLegacy(draft: AnnotationDraft): Annotation;
export declare function legacyToAnnotationDraft(legacy: Annotation, videoId?: string): Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'>;
