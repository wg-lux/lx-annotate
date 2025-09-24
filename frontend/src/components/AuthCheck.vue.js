import { defineComponent } from 'vue';
import { useAuthStore } from '@/stores/auth';
export default defineComponent({
    name: 'AuthCheck',
    setup() {
        const authStore = useAuthStore();
        return { authStore };
    }
});
debugger; /* PartiallyEnd: #3632/script.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (__VLS_ctx.authStore.isAuthenticated) {
    var __VLS_0 = {};
}
else {
    var __VLS_2 = {};
}
// @ts-ignore
var __VLS_1 = __VLS_0, __VLS_3 = __VLS_2;
var __VLS_dollars;
let __VLS_self;
