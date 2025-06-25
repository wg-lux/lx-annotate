import { useToastStore } from '@/stores/toastStore';
import { Teleport, Transition, TransitionGroup } from 'vue';
const toastStore = useToastStore();
/* ToastMessageContainer.vue
  Displays toast messages at the bottom right of the screen.
 * Uses Vue's Teleport and TransitionGroup for smooth animations.
 * Usage:
 * import { useToastStore } from '@/stores/useToastStore'
 * const toast = useToastStore()
 * function save() {
 * try {
 *   await api.saveForm()
 *   toast.success({ text: 'Saved!' })              // default 3 s
 * } catch (e) {
 *   toast.error({ text: 'Server error', timeout: 6000 }) // 6 s
 * }
 *}
 */
/* CSS-class & icon maps keep the template tidy */
const cls = {
    success: 'bg-green-50 border-green-500 text-green-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    error: 'bg-red-50   border-red-500   text-red-900',
    info: 'bg-slate-50 border-slate-400 text-slate-800'
};
const icon = {
    success: '✓',
    warning: '!',
    error: '✕',
    info: 'ℹ︎'
}; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    const __VLS_0 = {}.Teleport;
    /** @type { [typeof __VLS_components.Teleport, typeof __VLS_components.Teleport, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: ("body"),
    }));
    const __VLS_2 = __VLS_1({
        to: ("body"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const __VLS_6 = {}.Transition;
    /** @type { [typeof __VLS_components.Transition, typeof __VLS_components.Transition, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        name: ("fade"),
    }));
    const __VLS_8 = __VLS_7({
        name: ("fade"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    if (__VLS_ctx.toastStore.toasts.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: ("fixed bottom-4 right-4 flex flex-col gap-2 z-[1000]") },
        });
        const __VLS_12 = {}.TransitionGroup;
        /** @type { [typeof __VLS_components.TransitionGroup, typeof __VLS_components.TransitionGroup, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            name: ("slide"),
            tag: ("template"),
        }));
        const __VLS_14 = __VLS_13({
            name: ("slide"),
            tag: ("template"),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        for (const [t] of __VLS_getVForSourceType((__VLS_ctx.toastStore.toasts))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: ((t.id)),
                ...{ class: (([
                        'flex items-start gap-2 rounded border px-4 py-2 shadow-lg w-72',
                        __VLS_ctx.cls[t.status]
                    ])) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-lg") },
            });
            (__VLS_ctx.icon[t.status]);
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("flex-1 break-words") },
            });
            (t.text);
        }
        __VLS_17.slots.default;
        var __VLS_17;
    }
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_5.slots.default;
    var __VLS_5;
    ['fixed', 'bottom-4', 'right-4', 'flex', 'flex-col', 'gap-2', 'z-[1000]', 'flex', 'items-start', 'gap-2', 'rounded', 'border', 'px-4', 'py-2', 'shadow-lg', 'w-72', 'text-lg', 'flex-1', 'break-words',];
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
            cls: cls,
            icon: icon,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
