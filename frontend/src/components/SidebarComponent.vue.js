export default (await import('vue')).defineComponent({
    name: 'SidebarComponent',
    data() {
        return {
            staticUrl: window.STATIC_URL || '/static/',
            isSidebarOpen: false
        };
    },
    methods: {
        toggleSidebar() {
            this.isSidebarOpen = !this.isSidebarOpen;
        }
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['nav-link', 'nav-link',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        type: ("text/css"),
        href: ("https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.link)({
        rel: ("stylesheet"),
        href: ("https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidenav") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidenav-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: ("navbar-brand m-0") },
        href: ("/"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidenav-header-inner text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.img)({
        src: ((__VLS_ctx.staticUrl + 'img/ag_lux_logo_light_grey.svg')),
        alt: ("Logo"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("ms-1 font-weight-bold text-white text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("w-auto max-height-vh-100") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    const __VLS_6 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        to: ("/uebersicht"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/uebersicht' })) },
    }));
    const __VLS_8 = __VLS_7({
        to: ("/uebersicht"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/uebersicht' })) },
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
        to: ("/patienten"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/patienten' })) },
    }));
    const __VLS_14 = __VLS_13({
        to: ("/patienten"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/patienten' })) },
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
        to: ("/anonymisierung/uebersicht"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/anonymisierung' })) },
    }));
    const __VLS_20 = __VLS_19({
        to: ("/anonymisierung/uebersicht"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/anonymisierung' })) },
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
        to: ("/video-untersuchung"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/video-untersuchung' })) },
    }));
    const __VLS_26 = __VLS_25({
        to: ("/video-untersuchung"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/video-untersuchung' })) },
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
        to: ("/untersuchung"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/untersuchung' })) },
    }));
    const __VLS_32 = __VLS_31({
        to: ("/untersuchung"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/untersuchung' })) },
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
        to: ("/report-generator"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/report-generator' })) },
    }));
    const __VLS_38 = __VLS_37({
        to: ("/report-generator"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/report-generator' })) },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    const __VLS_42 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
        to: ("anonymisierung/validierung"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/validierung' })) },
    }));
    const __VLS_44 = __VLS_43({
        to: ("anonymisierung/validierung"),
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.$route.path === '/validierung' })) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons opacity-10") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("nav-link-text ms-1") },
    });
    __VLS_47.slots.default;
    var __VLS_47;
    ['sidenav', 'sidenav-header', 'navbar-brand', 'm-0', 'sidenav-header-inner', 'text-center', 'ms-1', 'font-weight-bold', 'text-white', 'text-center', 'w-auto', 'max-height-vh-100', 'navbar-nav', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1',];
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
