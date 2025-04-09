import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
// Optionally import the exported AuthState if you need it
// import type { AuthState } from '../stores/auth';
export default defineComponent({
    name: 'NavbarComponent',
    setup() {
        // Here, the explicit type annotation helps avoid leaking private types.
        const authStore = useAuthStore(); // Type inferred as ReturnType<typeof useAuthStore>
        const router = useRouter();
        return { authStore, router };
    },
    computed: {
        isAuthenticated() {
            return this.authStore.isAuthenticated;
        },
        username() {
            return this.authStore.user?.username || 'Unknown';
        },
        currentRouteName() {
            const name = this.$route.name;
            return !name ? 'Dashboard' : name.charAt(0).toUpperCase() + name.slice(1);
        }
    },
    methods: {
        handleLogin() {
            this.authStore.login();
        },
        handleLogout() {
            this.authStore.logout();
        }
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['breadcrumb-item', 'breadcrumb-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        ...{ class: ("navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl position-sticky top-1") },
        id: ("navbarBlur"),
        'navbar-scroll': ("true"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-1 px-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4") },
        id: ("navbar"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("ms-md-auto pe-md-3 d-flex align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        'aria-label': ("breadcrumb"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.ol, __VLS_intrinsicElements.ol)({
        ...{ class: ("breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("breadcrumb-item text-sm") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: ("opacity-5 text-dark") },
        href: ("javascript:;"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("breadcrumb-item text-sm text-dark active") },
        'aria-current': ("page"),
    });
    (__VLS_ctx.currentRouteName);
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("navbar-nav justify-content-end") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item d-flex align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: ("btn btn-outline-primary btn-sm mb-0 me-3") },
        href: ("javascript:;"),
        id: ("annotationsButton"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge bg-gradient-primary") },
    });
    if (__VLS_ctx.isAuthenticated) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: ("nav-item d-flex align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ onClick: (__VLS_ctx.handleLogout) },
            ...{ class: ("nav-link text-body font-weight-bold px-0") },
            href: ("javascript:;"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fa fa-user me-sm-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("d-sm-inline d-none") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: ("nav-item d-flex align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ onClick: (__VLS_ctx.handleLogin) },
            ...{ class: ("nav-link text-body font-weight-bold px-0") },
            href: ("javascript:;"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fa fa-user me-sm-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("d-sm-inline d-none") },
        });
    }
    if (__VLS_ctx.isAuthenticated) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: ("nav-item d-flex align-items-center ms-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("nav-link text-body font-weight-bold px-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fa fa-circle text-success me-sm-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("d-sm-inline d-none") },
        });
        (__VLS_ctx.username);
    }
    ['navbar', 'navbar-main', 'navbar-expand-lg', 'px-0', 'mx-4', 'shadow-none', 'border-radius-xl', 'position-sticky', 'top-1', 'container-fluid', 'py-1', 'px-3', 'collapse', 'navbar-collapse', 'mt-sm-0', 'mt-2', 'me-md-0', 'me-sm-4', 'ms-md-auto', 'pe-md-3', 'd-flex', 'align-items-center', 'breadcrumb', 'bg-transparent', 'mb-0', 'pb-0', 'pt-1', 'px-0', 'me-sm-6', 'me-5', 'breadcrumb-item', 'text-sm', 'opacity-5', 'text-dark', 'breadcrumb-item', 'text-sm', 'text-dark', 'active', 'navbar-nav', 'justify-content-end', 'nav-item', 'd-flex', 'align-items-center', 'btn', 'btn-outline-primary', 'btn-sm', 'mb-0', 'me-3', 'badge', 'bg-gradient-primary', 'nav-item', 'd-flex', 'align-items-center', 'nav-link', 'text-body', 'font-weight-bold', 'px-0', 'fa', 'fa-user', 'me-sm-1', 'd-sm-inline', 'd-none', 'nav-item', 'd-flex', 'align-items-center', 'nav-link', 'text-body', 'font-weight-bold', 'px-0', 'fa', 'fa-user', 'me-sm-1', 'd-sm-inline', 'd-none', 'nav-item', 'd-flex', 'align-items-center', 'ms-3', 'nav-link', 'text-body', 'font-weight-bold', 'px-0', 'fa', 'fa-circle', 'text-success', 'me-sm-1', 'd-sm-inline', 'd-none',];
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
