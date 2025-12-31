import NavbarComponent from './components/Menus/NavbarComponent.vue';
import SidebarComponent from './components/Menus/SidebarComponent.vue';
import DashboardComponent from './components/Dashboard/DashboardComponent.vue';
import ToastMessageContainer from './components/Utils/ToastMessageContainer.vue';
import axios from 'axios';
// Move this to your http_kc.ts or main.ts if possible, but it works here too
axios.defaults.baseURL = '/';
export default (await import('vue')).defineComponent({
    name: "App",
    components: {
        NavbarComponent,
        SidebarComponent,
        DashboardComponent,
        ToastMessageContainer,
    },
    data() {
        return {
            // Use window.STATIC_URL injected from base.html
            staticUrl: window.STATIC_URL,
            isMenuOpen: false,
        };
    },
    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        }
    }
});
const __VLS_ctx = {};
const __VLS_componentsOption = {
    NavbarComponent,
    SidebarComponent,
    DashboardComponent,
    ToastMessageContainer,
};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossorigin: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
    href: "https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap",
    rel: "stylesheet",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
    rel: "stylesheet",
    href: "https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link)({
    rel: "stylesheet",
    type: "text/css",
    href: "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
    rel: "stylesheet",
    href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
    integrity: "sha512-xh6IYswF2Yt+0e1yz3F6j2CvkJyDk6cfogmfVZBt3WgBp1x5Yp1p9ggbo2mcqzg4bV7+ydRZo7ljZHFQUNq9PQ==",
    crossorigin: "anonymous",
    referrerpolicy: "no-referrer",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
    rel: "stylesheet",
    href: "@assets/css/custom-overrides.css",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "g-sidenav-show" },
});
if (!__VLS_ctx.isMenuOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "sidenav navbar navbar-vertical navbar-expand-xs ms-3" },
        id: "sidenav-main",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "g-sidenav-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidenav m-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleMenu) },
        ...{ class: "material-icons btn btn-outline-primary border-0 my-3 btn-sm mb-0 me-3" },
    });
}
if (__VLS_ctx.isMenuOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark" },
        id: "sidenav-main",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleMenu) },
        ...{ class: "material-icons btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark" },
    });
    const __VLS_0 = {}.SidebarComponent;
    /** @type {[typeof __VLS_components.SidebarComponent, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "main-content position-relative max-height-vh-95 h-100 border-radius-lg" },
});
const __VLS_4 = {}.NavbarComponent;
/** @type {[typeof __VLS_components.NavbarComponent, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid h-100 w-100 py-1 px-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
const __VLS_8 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
const __VLS_12 = {}.ToastMessageContainer;
/** @type {[typeof __VLS_components.ToastMessageContainer, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
/** @type {__VLS_StyleScopedClasses['g-sidenav-show']} */ ;
/** @type {__VLS_StyleScopedClasses['sidenav']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-expand-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['g-sidenav-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sidenav']} */ ;
/** @type {__VLS_StyleScopedClasses['m-1']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['my-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sidenav']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['navbar-expand-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['border-radius-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['my-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-start']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
/** @type {__VLS_StyleScopedClasses['position-relative']} */ ;
/** @type {__VLS_StyleScopedClasses['max-height-vh-95']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['border-radius-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
var __VLS_dollars;
let __VLS_self;
