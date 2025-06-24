import { ref, computed } from 'vue';
import { useDraftStore } from '@/stores/draft';
const props = defineProps();
const emit = defineEmits();
const draftStore = useDraftStore();
const searchTerm = ref('');
// Get drafts for current video
const drafts = computed(() => draftStore.getDraftsForVideo(props.videoId));
// Filter drafts based on search term
const filteredDrafts = computed(() => {
    if (!searchTerm.value)
        return drafts.value;
    const term = searchTerm.value.toLowerCase();
    return drafts.value.filter(draft => (draft.note && draft.note.toLowerCase().includes(term)) ||
        draft.label.toLowerCase().includes(term));
});
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function saveDraft(draft) {
    emit('save-draft', draft);
}
function deleteDraft(draftId) {
    emit('delete-draft', draftId);
    draftStore.removeDraft(props.videoId, draftId);
}
function saveAllDrafts() {
    emit('save-all-drafts', drafts.value);
}
function clearAllDrafts() {
    emit('clear-all-drafts');
    draftStore.clearDraftsForVideo(props.videoId);
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['draft-header', 'save-draft-btn', 'delete-draft-btn', 'save-all-btn', 'clear-all-btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("draft-manager") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("draft-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    if (__VLS_ctx.drafts.length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("draft-count-badge") },
        });
        (__VLS_ctx.drafts.length);
    }
    if (__VLS_ctx.drafts.length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("draft-controls") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.searchTerm)),
            type: ("text"),
            placeholder: ("Entwürfe durchsuchen..."),
            ...{ class: ("search-input") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-buttons") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveAllDrafts) },
            ...{ class: ("save-all-btn") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearAllDrafts) },
            ...{ class: ("clear-all-btn") },
        });
    }
    if (__VLS_ctx.filteredDrafts.length === 0 && __VLS_ctx.drafts.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("empty-state") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (__VLS_ctx.filteredDrafts.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("empty-search") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.searchTerm);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("draft-list") },
    });
    for (const [draft] of __VLS_getVForSourceType((__VLS_ctx.filteredDrafts))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((draft.id)),
            ...{ class: ("draft-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("draft-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("draft-text") },
        });
        (draft.note || draft.label);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("draft-meta") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("draft-time") },
        });
        (__VLS_ctx.formatTime(draft.start));
        (__VLS_ctx.formatTime(draft.end));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("draft-category") },
        });
        (draft.label);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("draft-actions") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.saveDraft(draft);
                } },
            ...{ class: ("save-draft-btn") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.deleteDraft(draft.id);
                } },
            ...{ class: ("delete-draft-btn") },
        });
    }
    ['draft-manager', 'draft-header', 'draft-count-badge', 'draft-controls', 'search-input', 'action-buttons', 'save-all-btn', 'clear-all-btn', 'empty-state', 'empty-search', 'draft-list', 'draft-item', 'draft-content', 'draft-text', 'draft-meta', 'draft-time', 'draft-category', 'draft-actions', 'save-draft-btn', 'delete-draft-btn',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {};
    var $refs;
    var $el;
    return {
        attrs: {},
        slots: __VLS_slots,
        refs: $refs,
        rootEl: $el,
    };
}
;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            searchTerm: searchTerm,
            drafts: drafts,
            filteredDrafts: filteredDrafts,
            formatTime: formatTime,
            saveDraft: saveDraft,
            deleteDraft: deleteDraft,
            saveAllDrafts: saveAllDrafts,
            clearAllDrafts: clearAllDrafts,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
