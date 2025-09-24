import NavbarComponent from './components/NavbarComponent.vue';
import SidebarComponent from './components/SidebarComponent.vue';
import DashboardComponent from './components/DashboardComponent.vue';
import LoginComponent from './components/LoginComponent.vue';
import ToastMessageContainer from './components/Utils/ToastMessageContainer.vue';
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
        ToastMessageContainer,
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = {
    NavbarComponent,
    SidebarComponent,
    DashboardComponent,
    LoginComponent,
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.meta, __VLS_intrinsicElements.meta)({
    name: "viewport",
    content: "width=device-width, initial-scale=1",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.meta)({
    'http-equiv': "X-UA-Compatible",
    content: "IE=edge",
});
const __VLS_0 = {}.AuthCheck;
/** @type {[typeof __VLS_components.AuthCheck, typeof __VLS_components.AuthCheck, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
{
    const { 'unauthenticated-content': __VLS_thisSlot } = __VLS_3.slots;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "g-sidenav-show" },
    });
    if (__VLS_ctx.isMenuOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark" },
            id: "sidenav-main",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.toggleMenu) },
            ...{ class: "material-icons btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark" },
        });
        const __VLS_4 = {}.SidebarComponent;
        /** @type {[typeof __VLS_components.SidebarComponent, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
        const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "main-content position-relative max-height-vh-95 h-100 border-radius-lg" },
    });
    const __VLS_8 = {}.NavbarComponent;
    /** @type {[typeof __VLS_components.NavbarComponent, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "container-fluid h-100 w-100 py-1 px-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    const __VLS_12 = {}.RouterView;
    /** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const __VLS_16 = {}.ToastMessageContainer;
    /** @type {[typeof __VLS_components.ToastMessageContainer, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
    const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
{
    const { 'authenticated-content': __VLS_thisSlot } = __VLS_3.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "g-sidenav-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.meta, __VLS_intrinsicElements.meta)({
        name: "viewport",
        content: "width=device-width, initial-scale=1",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "container-fluid h-100 w-100 py-1 px-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "main-content center position-relative max-width max-height-vh-95 h-100 border-radius-lg" },
    });
    const __VLS_20 = {}.LoginComponent;
    /** @type {[typeof __VLS_components.LoginComponent, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
}
var __VLS_3;
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
/** @type {__VLS_StyleScopedClasses['g-sidenav-show']} */ ;
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
/** @type {__VLS_StyleScopedClasses['g-sidenav-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
/** @type {__VLS_StyleScopedClasses['center']} */ ;
/** @type {__VLS_StyleScopedClasses['position-relative']} */ ;
/** @type {__VLS_StyleScopedClasses['max-width']} */ ;
/** @type {__VLS_StyleScopedClasses['max-height-vh-95']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['border-radius-lg']} */ ;
var __VLS_dollars;
let __VLS_self;
