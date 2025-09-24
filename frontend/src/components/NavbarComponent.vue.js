import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAnnotationStatsStore } from '@/stores/annotationStats';
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const annotationStatsStore = useAnnotationStatsStore();
// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);
const username = computed(() => authStore.user?.username || 'Unknown');
const currentRouteName = computed(() => {
    const name = route.name;
    return !name ? 'Dashboard' : name.charAt(0).toUpperCase() + name.slice(1);
});
const totalPendingAnnotations = computed(() => {
    return annotationStatsStore.stats.totalPending;
});
// Methods
const handleLogin = () => {
    authStore.login();
};
const handleLogout = () => {
    authStore.logout();
};
// Load annotation stats on mount and refresh periodically
onMounted(async () => {
    await annotationStatsStore.fetchAnnotationStats();
    // Auto-refresh every 5 minutes
    setInterval(async () => {
        if (annotationStatsStore.needsRefresh) {
            await annotationStatsStore.refreshIfNeeded();
        }
    }, 5 * 60 * 1000);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['breadcrumb-item']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl position-sticky top-1" },
    id: "navbarBlur",
    'navbar-scroll': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-1 px-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4" },
    id: "navbar",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ms-md-auto pe-md-3 d-flex align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    'aria-label': "breadcrumb",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.ol, __VLS_intrinsicElements.ol)({
    ...{ class: "breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
    ...{ class: "breadcrumb-item text-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    ...{ class: "opacity-5 text-dark" },
    href: "javascript:;",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
    ...{ class: "breadcrumb-item text-sm text-dark active" },
    'aria-current': "page",
});
(__VLS_ctx.currentRouteName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
    ...{ class: "navbar-nav justify-content-end" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
    ...{ class: "nav-item d-flex align-items-center" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/annotationen",
    ...{ class: "btn btn-outline-primary btn-sm mb-0 me-3" },
    ...{ class: ({ 'btn-warning': __VLS_ctx.totalPendingAnnotations > 0 }) },
}));
const __VLS_2 = __VLS_1({
    to: "/annotationen",
    ...{ class: "btn btn-outline-primary btn-sm mb-0 me-3" },
    ...{ class: ({ 'btn-warning': __VLS_ctx.totalPendingAnnotations > 0 }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-tasks me-1" },
});
if (__VLS_ctx.totalPendingAnnotations > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-danger ms-1" },
        title: (`${__VLS_ctx.totalPendingAnnotations} ausstehende Annotationen`),
    });
    (__VLS_ctx.totalPendingAnnotations);
}
else if (__VLS_ctx.annotationStatsStore.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm ms-1" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
}
var __VLS_3;
if (__VLS_ctx.isAuthenticated) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: "nav-item d-flex align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ onClick: (__VLS_ctx.handleLogout) },
        ...{ class: "nav-link text-body font-weight-bold px-0" },
        href: "javascript:;",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fa fa-user me-sm-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "d-sm-inline d-none" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: "nav-item d-flex align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ onClick: (__VLS_ctx.handleLogin) },
        ...{ class: "nav-link text-body font-weight-bold px-0" },
        href: "javascript:;",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fa fa-user me-sm-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "d-sm-inline d-none" },
    });
}
if (__VLS_ctx.isAuthenticated) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: "nav-item d-flex align-items-center ms-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "nav-link text-body font-weight-bold px-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fa fa-circle text-success me-sm-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "d-sm-inline d-none" },
    });
    (__VLS_ctx.username);
}
/** @type {__VLS_StyleScopedClasses['navbar']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-main']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-expand-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-none']} */ ;
/** @type {__VLS_StyleScopedClasses['border-radius-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['position-sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['top-1']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['collapse']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-collapse']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-sm-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['me-md-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-sm-4']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-md-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['pe-md-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['me-5']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-tasks']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-body']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fa']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-user']} */ ;
/** @type {__VLS_StyleScopedClasses['me-sm-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-sm-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-body']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fa']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-user']} */ ;
/** @type {__VLS_StyleScopedClasses['me-sm-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-sm-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-body']} */ ;
/** @type {__VLS_StyleScopedClasses['font-weight-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fa']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['me-sm-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-sm-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            annotationStatsStore: annotationStatsStore,
            isAuthenticated: isAuthenticated,
            username: username,
            currentRouteName: currentRouteName,
            totalPendingAnnotations: totalPendingAnnotations,
            handleLogin: handleLogin,
            handleLogout: handleLogout,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
