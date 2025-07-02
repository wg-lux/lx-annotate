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
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['breadcrumb-item', 'breadcrumb-item', 'nav-link', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)(__assign({ class: ("navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl position-sticky top-1") }, { id: ("navbarBlur"), 'navbar-scroll': ("true") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-1 px-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4") }, { id: ("navbar") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("ms-md-auto pe-md-3 d-flex align-items-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        'aria-label': ("breadcrumb"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.ol, __VLS_intrinsicElements.ol)(__assign({ class: ("breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("breadcrumb-item text-sm") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)(__assign({ class: ("opacity-5 text-dark") }, { href: ("javascript:;") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("breadcrumb-item text-sm text-dark active") }, { 'aria-current': ("page") }));
    (__VLS_ctx.currentRouteName);
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("navbar-nav justify-content-end") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item d-flex align-items-center") },
    });
    const __VLS_0 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: ("/annotationen"),
        ...{ class: ("btn btn-outline-primary btn-sm mb-0 me-3") },
        ...{ class: (({ 'btn-warning': __VLS_ctx.totalPendingAnnotations > 0 })) },
    }));
    const __VLS_2 = __VLS_1({
        to: ("/annotationen"),
        ...{ class: ("btn btn-outline-primary btn-sm mb-0 me-3") },
        ...{ class: (({ 'btn-warning': __VLS_ctx.totalPendingAnnotations > 0 })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-tasks me-1") },
    });
    if (__VLS_ctx.totalPendingAnnotations > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-danger ms-1") },
            title: ((`${__VLS_ctx.totalPendingAnnotations} ausstehende Annotationen`)),
        });
        (__VLS_ctx.totalPendingAnnotations);
    }
    else if (__VLS_ctx.annotationStatsStore.isLoading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm ms-1") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
    }
    __VLS_5.slots.default;
    var __VLS_5;
    if (__VLS_ctx.isAuthenticated) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item d-flex align-items-center") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)(__assign(__assign({ onClick: (__VLS_ctx.handleLogout) }, { class: ("nav-link text-body font-weight-bold px-0") }), { href: ("javascript:;") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("fa fa-user me-sm-1") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("d-sm-inline d-none") }));
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item d-flex align-items-center") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)(__assign(__assign({ onClick: (__VLS_ctx.handleLogin) }, { class: ("nav-link text-body font-weight-bold px-0") }), { href: ("javascript:;") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("fa fa-user me-sm-1") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("d-sm-inline d-none") }));
    }
    if (__VLS_ctx.isAuthenticated) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item d-flex align-items-center ms-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link text-body font-weight-bold px-0") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("fa fa-circle text-success me-sm-1") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("d-sm-inline d-none") }));
        (__VLS_ctx.username);
    }
    ['navbar', 'navbar-main', 'navbar-expand-lg', 'px-0', 'mx-4', 'shadow-none', 'border-radius-xl', 'position-sticky', 'top-1', 'container-fluid', 'py-1', 'px-3', 'collapse', 'navbar-collapse', 'mt-sm-0', 'mt-2', 'me-md-0', 'me-sm-4', 'ms-md-auto', 'pe-md-3', 'd-flex', 'align-items-center', 'breadcrumb', 'bg-transparent', 'mb-0', 'pb-0', 'pt-1', 'px-0', 'me-sm-6', 'me-5', 'breadcrumb-item', 'text-sm', 'opacity-5', 'text-dark', 'breadcrumb-item', 'text-sm', 'text-dark', 'active', 'navbar-nav', 'justify-content-end', 'nav-item', 'd-flex', 'align-items-center', 'btn', 'btn-outline-primary', 'btn-sm', 'mb-0', 'me-3', 'btn-warning', 'fas', 'fa-tasks', 'me-1', 'badge', 'bg-danger', 'ms-1', 'spinner-border', 'spinner-border-sm', 'ms-1', 'visually-hidden', 'nav-item', 'd-flex', 'align-items-center', 'nav-link', 'text-body', 'font-weight-bold', 'px-0', 'fa', 'fa-user', 'me-sm-1', 'd-sm-inline', 'd-none', 'nav-item', 'd-flex', 'align-items-center', 'nav-link', 'text-body', 'font-weight-bold', 'px-0', 'fa', 'fa-user', 'me-sm-1', 'd-sm-inline', 'd-none', 'nav-item', 'd-flex', 'align-items-center', 'ms-3', 'nav-link', 'text-body', 'font-weight-bold', 'px-0', 'fa', 'fa-circle', 'text-success', 'me-sm-1', 'd-sm-inline', 'd-none',];
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
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
