// Type guards
export function isAnnotationDraft(obj) {
    return obj && typeof obj === 'object' &&
        obj.isDraft === true &&
        typeof obj.label === 'string' &&
        typeof obj.start === 'number' &&
        typeof obj.end === 'number';
}
// Helper functions for migration
export function annotationDraftToLegacy(draft) {
    return {
        id: draft.id,
        category: draft.label,
        startTime: draft.start,
        endTime: draft.end,
        text: draft.note
    };
}
export function legacyToAnnotationDraft(legacy, videoId) {
    return {
        id: legacy.id,
        label: legacy.category || 'unknown',
        start: legacy.startTime || 0,
        end: legacy.endTime || 0,
        note: legacy.text
    };
}
