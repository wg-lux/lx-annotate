import { computed } from 'vue';
import { useDraftStore } from '@/stores/draft';
const emit = defineEmits();
const draftStore = useDraftStore();
// Calculate total drafts across all videos
const totalDrafts = computed(() => {
    return Object.values(draftStore.draftAnnotations).reduce((total, annotations) => {
        return total + annotations.length;
    }, 0);
});
const hasUnsavedChanges = computed(() => draftStore.hasUnsavedChanges);
const tooltipText = computed(() => {
    if (totalDrafts.value === 0) {
        return 'Keine ungespeicherten Annotationen';
    }
    else if (totalDrafts.value === 1) {
        return '1 ungespeicherte Annotation';
    }
    else {
        return `${totalDrafts.value} ungespeicherte Annotationen`;
    }
});
function clearAll() {
    emit('clear-all');
    draftStore.clearAllDrafts();
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['draft-indicator', 'has-drafts', 'draft-count', 'clear-drafts-btn', 'draft-indicator', 'has-drafts', 'draft-icon', 'draft-indicator', 'has-drafts', 'draft-count',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("draft-indicator") },
        ...{ class: (({ 'has-drafts': __VLS_ctx.totalDrafts > 0 })) },
        title: ((__VLS_ctx.tooltipText)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("draft-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("draft-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("draft-count") },
    });
    (__VLS_ctx.totalDrafts);
    if (__VLS_ctx.hasUnsavedChanges) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("unsaved-indicator") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("unsaved-dot") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("unsaved-text") },
        });
    }
    if (__VLS_ctx.totalDrafts > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearAll) },
            ...{ class: ("clear-drafts-btn") },
            title: ("Alle Entwürfe löschen"),
        });
    }
    ['draft-indicator', 'has-drafts', 'draft-content', 'draft-icon', 'draft-count', 'unsaved-indicator', 'unsaved-dot', 'unsaved-text', 'clear-drafts-btn',];
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
            totalDrafts: totalDrafts,
            hasUnsavedChanges: hasUnsavedChanges,
            tooltipText: tooltipText,
            clearAll: clearAll,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
