import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { useAuthKcStore } from '@/stores/auth_kc';
const store = useAuthKcStore();
const { isAuthenticated } = storeToRefs(store);
const ready = ref(false);
onMounted(async () => {
    try {
        // If middleware redirected you to OIDC already, this won’t run until after login
        await store.loadBootstrap();
    }
    finally {
        ready.value = true;
    }
});
const isAuth = isAuthenticated;
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.ready && __VLS_ctx.isAuth) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    var __VLS_0 = {};
}
else if (__VLS_ctx.ready && !__VLS_ctx.isAuth) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    var __VLS_2 = {};
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    var __VLS_4 = {};
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
// @ts-ignore
var __VLS_1 = __VLS_0, __VLS_3 = __VLS_2, __VLS_5 = __VLS_4;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ready: ready,
            isAuth: isAuth,
        };
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
