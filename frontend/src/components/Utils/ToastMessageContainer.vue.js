import { useToastStore } from '@/stores/toastStore';
function theme(s) {
    return {
        success: 'bg-success',
        warning: 'bg-warning text-dark',
        error: 'bg-danger',
        info: 'bg-info text-dark'
    }[s];
}
; /* PartiallyEnd: #3632/both.vue */
export default await (async () => {
    const toastStore = useToastStore(); /* PartiallyEnd: #3632/scriptSetup.vue */
    function __VLS_template() {
        const __VLS_ctx = {};
        let __VLS_components;
        let __VLS_directives;
        // CSS variable injection 
        // CSS variable injection end 
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("toast-wrapper position-fixed top-0 end-0 p-3") },
            ...{ style: ({}) },
        });
        for (const [t] of __VLS_getVForSourceType((__VLS_ctx.toastStore.toasts))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((t.id)),
                ...{ class: ((['toast align-items-center text-white show', __VLS_ctx.theme(t.status)])) },
                role: ("alert"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("toast-body") },
            });
            (t.text);
        }
        ['toast-wrapper', 'position-fixed', 'top-0', 'end-0', 'p-3', 'toast', 'align-items-center', 'text-white', 'show', 'd-flex', 'toast-body',];
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
                toastStore: toastStore,
                theme: theme,
            };
        },
    });
    return (await import('vue')).defineComponent({
        setup() {
            return {};
        },
        __typeEl: {},
    });
})(); /* PartiallyEnd: #3632/script.vue */
; /* PartiallyEnd: #4569/main.vue */
