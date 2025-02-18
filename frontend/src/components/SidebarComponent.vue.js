export default (await import('vue')).defineComponent({
    name: 'SidebarComponent'
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['nav-link', 'nav-link',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        type: ("text/css"),
        href: ("https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link, __VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        href: ("https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidenav-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-times p-3 cursor-pointer text-white opacity-5 position-absolute end-0 top-0 d-none d-xl-none") },
        'aria-hidden': ("true"),
        id: ("iconSidenav"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: ("navbar-brand m-0") },
        href: ("/"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidenav-header-inner text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
        src: ("@/assets/public/img/Universitaetsklinikum_Wuerzburg.jpg"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("ms-1 font-weight-bold text-white text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("collapse navbar-collapse w-auto max-height-vh-100") },
        id: ("sidenav-collapse-main"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("navbar-nav") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_0 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: ("/"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/' })) },
    }));
    const __VLS_2 = __VLS_1({
        to: ("/"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_6 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        to: ("/annotationen"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/annotationen' })) },
    }));
    const __VLS_8 = __VLS_7({
        to: ("/annotationen"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/annotationen' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_12 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        to: ("/video-annotation"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/video-annotation' })) },
    }));
    const __VLS_14 = __VLS_13({
        to: ("/video-annotation"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/video-annotation' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_18 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        to: ("/frame-annotation"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/frame-annotation' })) },
    }));
    const __VLS_20 = __VLS_19({
        to: ("/frame-annotation"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/frame-annotation' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_23.slots.default;
    var __VLS_23;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_24 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        to: ("/fallgenerator"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/fallgenerator' })) },
    }));
    const __VLS_26 = __VLS_25({
        to: ("/fallgenerator"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/fallgenerator' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_29.slots.default;
    var __VLS_29;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_30 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        to: ("/profil"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/profil' })) },
    }));
    const __VLS_32 = __VLS_31({
        to: ("/profil"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/profil' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_35.slots.default;
    var __VLS_35;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_36 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        to: ("/ueber-uns"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/ueber-uns' })) },
    }));
    const __VLS_38 = __VLS_37({
        to: ("/ueber-uns"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/ueber-uns' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_41.slots.default;
    var __VLS_41;
    ['sidenav-header', 'fas', 'fa-times', 'p-3', 'cursor-pointer', 'text-white', 'opacity-5', 'position-absolute', 'end-0', 'top-0', 'd-none', 'd-xl-none', 'navbar-brand', 'm-0', 'sidenav-header-inner', 'text-center', 'ms-1', 'font-weight-bold', 'text-white', 'text-center', 'collapse', 'navbar-collapse', 'w-auto', 'max-height-vh-100', 'navbar-nav', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1',];
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
