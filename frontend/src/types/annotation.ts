/**
 * A single unfinished segment that is currently being drawn on the timeline
 * (created with `startDraft` and completed with `updateDraftEnd`).
 */
export interface DraftSegment {
  label: string
  /** start time in **seconds** */
  start: number
  /** end time in **seconds** – `null` while the user is still dragging */
  end: number | null
}

/**
 * A persisted annotation that lives only in the client until the user clicks
 * "Save". It is keyed by **video‑id** so multiple videos can have independent
 * draft queues.
 */
export interface AnnotationDraft {
  /** back‑end id (when it already exists) or a temporary uuid */
  id: string | number
  label: string // ☑ replaces `category`
  /** start time in seconds */
  start: number // ☑ replaces `startTime`
  /** end time in seconds */
  end: number // ☑ replaces `endTime`
  /** optional free‑text entered by the reviewer */
  note?: string
  /** flag that tells the UI this has not been sent to the server yet */
  isDraft: true
  /** ISO timestamps – kept as string when re‑hydrated from LS */
  createdAt: string
  updatedAt: string
}

/** Internal shape stored in <localStorage>. */
export type DraftBucket = Record<string, AnnotationDraft[]> // key = videoId

// Legacy interface for backwards compatibility during migration
export interface Annotation {
  id: string | number
  category?: string // deprecated: use label instead
  startTime?: number // deprecated: use start instead
  endTime?: number // deprecated: use end instead
  text?: string // deprecated: use note instead
  videoId?: string // not needed in AnnotationDraft
}

// Base Types
export interface Label {
  id: string | number
  name: string
  label_type?: string
  description?: string
  color?: string
  order_priority?: number
}

// Type guards
export function isAnnotationDraft(obj: any): obj is AnnotationDraft {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.isDraft === true &&
    typeof obj.label === 'string' &&
    typeof obj.start === 'number' &&
    typeof obj.end === 'number'
  )
}

// Helper functions for migration
export function annotationDraftToLegacy(draft: AnnotationDraft): Annotation {
  return {
    id: draft.id,
    category: draft.label,
    startTime: draft.start,
    endTime: draft.end,
    text: draft.note
  }
}

export function legacyToAnnotationDraft(
  legacy: Annotation,
  videoId?: string
): Omit<AnnotationDraft, 'isDraft' | 'createdAt' | 'updatedAt'> {
  return {
    id: legacy.id,
    label: legacy.category || 'unknown',
    start: legacy.startTime || 0,
    end: legacy.endTime || 0,
    note: legacy.text
  }
}
