var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import NavbarComponent from './components/NavbarComponent.vue';
import SidebarComponent from './components/SidebarComponent.vue';
import LoginComponent from './components/LoginComponent.vue';
import '@/assets/custom-overrides.css';
import axios from 'axios';
axios.defaults.baseURL = '/';
export default (await import('vue')).defineComponent({
    name: "App",
    data: function () {
        return {
            staticUrl: window.STATIC_URL || "/static/",
            isMenuOpen: false,
        };
    },
    methods: {
        toggleMenu: function () {
            this.isMenuOpen = !this.isMenuOpen;
        }
    },
    components: {
        NavbarComponent: NavbarComponent,
        SidebarComponent: SidebarComponent,
        LoginComponent: LoginComponent,
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_componentsOption = {
        NavbarComponent: NavbarComponent,
        SidebarComponent: SidebarComponent,
        LoginComponent: LoginComponent,
    };
    var __VLS_components;
    var __VLS_directives;
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
    var __VLS_0 = {}.AuthCheck;
    /** @type { [typeof __VLS_components.AuthCheck, typeof __VLS_components.AuthCheck, ] } */ ;
    // @ts-ignore
    var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_1), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.template, __VLS_intrinsicElements.template)({});
    {
        var __VLS_thisSlot = __VLS_5.slots["unauthenticated-content"];
        if (!__VLS_ctx.isMenuOpen) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)(__assign({ class: ("sidenav navbar navbar-vertical navbar-expand-xs ms-3") }, { id: ("sidenav-main") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("g-sidenav-hidden") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("sidenav m-1") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.toggleMenu) }, { class: ("material-icons btn btn-outline-primary border-0 my-3 btn-sm mb-0 me-3") }));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("g-sidenav-show") }));
        if (__VLS_ctx.isMenuOpen) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)(__assign({ class: ("sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark") }, { id: ("sidenav-main") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.toggleMenu) }, { class: ("material-icons btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark") }));
            var __VLS_6 = {}.SidebarComponent;
            /** @type { [typeof __VLS_components.SidebarComponent, ] } */ ;
            // @ts-ignore
            var __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
            var __VLS_8 = __VLS_7.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_7), false));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)(__assign({ class: ("main-content position-relative max-height-vh-95 h-100 border-radius-lg") }));
        var __VLS_12 = {}.NavbarComponent;
        /** @type { [typeof __VLS_components.NavbarComponent, ] } */ ;
        // @ts-ignore
        var __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
        var __VLS_14 = __VLS_13.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_13), false));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid h-100 w-100 py-1 px-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12") }));
        var __VLS_18 = {}.RouterView;
        /** @type { [typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ] } */ ;
        // @ts-ignore
        var __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        var __VLS_20 = __VLS_19.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_19), false));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.template, __VLS_intrinsicElements.template)({});
    {
        var __VLS_thisSlot = __VLS_5.slots["authenticated-content"];
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("g-sidenav-hidden") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.meta, __VLS_intrinsicElements.meta)({
            name: ("viewport"),
            content: ("width=device-width, initial-scale=1"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid h-100 w-100 py-1 px-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)(__assign({ class: ("main-content center position-relative max-width max-height-vh-95 h-100 border-radius-lg") }));
        var __VLS_24 = {}.LoginComponent;
        /** @type { [typeof __VLS_components.LoginComponent, ] } */ ;
        // @ts-ignore
        var __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
        var __VLS_26 = __VLS_25.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_25), false));
    }
    var __VLS_5;
    ['sidenav', 'navbar', 'navbar-vertical', 'navbar-expand-xs', 'ms-3', 'g-sidenav-hidden', 'sidenav', 'm-1', 'material-icons', 'btn', 'btn-outline-primary', 'border-0', 'my-3', 'btn-sm', 'mb-0', 'me-3', 'g-sidenav-show', 'sidenav', 'navbar', 'navbar-vertical', 'navbar-expand-xs', 'border-0', 'border-radius-xl', 'my-3', 'fixed-start', 'ms-3', 'bg-gradient-dark', 'material-icons', 'btn', 'btn-outline-info', 'btn-sm', 'mb-0', 'me-3', 'bg-gradient-dark', 'main-content', 'position-relative', 'max-height-vh-95', 'h-100', 'border-radius-lg', 'container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'row', 'col-12', 'g-sidenav-hidden', 'container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'main-content', 'center', 'position-relative', 'max-width', 'max-height-vh-95', 'h-100', 'border-radius-lg',];
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
