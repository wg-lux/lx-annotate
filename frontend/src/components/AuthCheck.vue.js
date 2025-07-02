import { defineComponent } from 'vue';
import { useAuthStore } from '@/stores/auth';
export default defineComponent({
    name: 'AuthCheck',
    setup: function () {
        var authStore = useAuthStore();
        return { authStore: authStore };
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.authStore.isAuthenticated) {
        var __VLS_0 = {};
    }
    else {
        var __VLS_1 = {};
    }
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {};
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
var __VLS_self;
