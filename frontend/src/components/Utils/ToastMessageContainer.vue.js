import { useToastStore } from '@/stores/toastStore';
function theme(s) {
    return {
        success: 'bg-success',
        warning: 'bg-warning text-dark',
        error: 'bg-danger',
        info: 'bg-info text-dark'
    }[s];
}
debugger; /* PartiallyEnd: #3632/both.vue */
export default await (async () => {
    const toastStore = useToastStore();
    debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toast-wrapper position-fixed top-0 end-0 p-3" },
        ...{ style: {} },
    });
    for (const [t] of __VLS_getVForSourceType((__VLS_ctx.toastStore.toasts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (t.id),
            ...{ class: (['toast align-items-center text-white show', __VLS_ctx.theme(t.status)]) },
            role: "alert",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toast-body" },
        });
        (t.text);
    }
    /** @type {__VLS_StyleScopedClasses['toast-wrapper']} */ ;
    /** @type {__VLS_StyleScopedClasses['position-fixed']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['end-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['toast']} */ ;
    /** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['show']} */ ;
    /** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['toast-body']} */ ;
    var __VLS_dollars;
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
    });
})(); /* PartiallyEnd: #4569/main.vue */
