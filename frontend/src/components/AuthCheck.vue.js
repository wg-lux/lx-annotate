import { defineComponent } from 'vue';
import { useAuthStore } from '@/stores/auth';
export default defineComponent({
    name: 'AuthCheck',
    setup() {
        const authStore = useAuthStore();
        return { authStore };
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.authStore.isAuthenticated) {
        var __VLS_0 = {};
    }
    else {
        var __VLS_1 = {};
    }
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
let __VLS_self;
