import NavbarComponent from './components/NavbarComponent.vue';
import SidebarComponent from './components/SidebarComponent.vue';
import DashboardComponent from './components/DashboardComponent.vue';
import LoginComponent from './components/LoginComponent.vue';
import '@/assets/custom-overrides.css';
import axios from 'axios';
axios.defaults.baseURL = '/';
export default (await import('vue')).defineComponent({
    name: "App",
    data() {
        return {
            staticUrl: window.STATIC_URL || "/static/",
            isMenuOpen: false,
        };
    },
    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        }
    },
    components: {
        NavbarComponent,
        SidebarComponent,
        DashboardComponent,
        LoginComponent,
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    const __VLS_componentsOption = {
        NavbarComponent,
        SidebarComponent,
        DashboardComponent,
        LoginComponent,
    };
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("preconnect"),
        href: ("https://fonts.googleapis.com"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("preconnect"),
        href: ("https://fonts.gstatic.com"),
        crossorigin: (true),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        href: ("https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap"),
        rel: ("stylesheet"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        href: ("https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        type: ("text/css"),
        href: ("https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        href: ("@assets/css/custom-overrides.css"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.meta, __VLS_intrinsicElements.meta)({
        name: ("viewport"),
        content: ("width=device-width, initial-scale=1"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.meta)({
        'http-equiv': ("X-UA-Compatible"),
        content: ("IE=edge"),
    });
    const __VLS_0 = {}.AuthCheck;
    /** @type { [typeof __VLS_components.AuthCheck, typeof __VLS_components.AuthCheck, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_elementAsFunction(__VLS_intrinsicElements.template, __VLS_intrinsicElements.template)({});
    {
        const { 'unauthenticated-content': __VLS_thisSlot } = __VLS_5.slots;
        if (!__VLS_ctx.isMenuOpen) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
                ...{ class: ("sidenav navbar navbar-vertical navbar-expand-xs ms-3") },
                id: ("sidenav-main"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("g-sidenav-hidden") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("sidenav m-1") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.toggleMenu) },
                ...{ class: ("material-icons btn btn-outline-primary border-0 my-3 btn-sm mb-0 me-3") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("g-sidenav-show") },
        });
        if (__VLS_ctx.isMenuOpen) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
                ...{ class: ("sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark") },
                id: ("sidenav-main"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.toggleMenu) },
                ...{ class: ("material-icons btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark") },
            });
            const __VLS_6 = {}.SidebarComponent;
            /** @type { [typeof __VLS_components.SidebarComponent, ] } */ ;
            // @ts-ignore
            const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
            const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
            ...{ class: ("main-content position-relative max-height-vh-95 h-100 border-radius-lg") },
        });
        const __VLS_12 = {}.NavbarComponent;
        /** @type { [typeof __VLS_components.NavbarComponent, ] } */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("container-fluid h-100 w-100 py-1 px-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        const __VLS_18 = {}.RouterView;
        /** @type { [typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.template, __VLS_intrinsicElements.template)({});
    {
        const { 'authenticated-content': __VLS_thisSlot } = __VLS_5.slots;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("g-sidenav-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.meta, __VLS_intrinsicElements.meta)({
            name: ("viewport"),
            content: ("width=device-width, initial-scale=1"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("container-fluid h-100 w-100 py-1 px-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
            ...{ class: ("main-content center position-relative max-width max-height-vh-95 h-100 border-radius-lg") },
        });
        const __VLS_24 = {}.LoginComponent;
        /** @type { [typeof __VLS_components.LoginComponent, ] } */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
        const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
    }
    var __VLS_5;
    ['sidenav', 'navbar', 'navbar-vertical', 'navbar-expand-xs', 'ms-3', 'g-sidenav-hidden', 'sidenav', 'm-1', 'material-icons', 'btn', 'btn-outline-primary', 'border-0', 'my-3', 'btn-sm', 'mb-0', 'me-3', 'g-sidenav-show', 'sidenav', 'navbar', 'navbar-vertical', 'navbar-expand-xs', 'border-0', 'border-radius-xl', 'my-3', 'fixed-start', 'ms-3', 'bg-gradient-dark', 'material-icons', 'btn', 'btn-outline-info', 'btn-sm', 'mb-0', 'me-3', 'bg-gradient-dark', 'main-content', 'position-relative', 'max-height-vh-95', 'h-100', 'border-radius-lg', 'container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'row', 'col-12', 'g-sidenav-hidden', 'container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'main-content', 'center', 'position-relative', 'max-width', 'max-height-vh-95', 'h-100', 'border-radius-lg',];
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
