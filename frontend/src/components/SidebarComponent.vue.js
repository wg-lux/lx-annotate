export default (await import('vue')).defineComponent({
    name: 'SidebarComponent',
    data() {
        return {
            staticUrl: window.STATIC_URL || '/static/',
            navLinks: [
                { path: '/', icon: 'dashboard', label: 'Dashboard' },
                { path: '/annotationen', icon: 'note_add', label: 'Annotationen Übersicht' },
                { path: '/video-annotation', icon: 'note_add', label: 'Video Annotation' },
                { path: '/frame-annotation', icon: 'note_add', label: 'Frame Annotation' },
                { path: '/fallgenerator', icon: 'check_circle', label: 'Fallgenerator' },
                { path: '/befund', icon: 'check_circle', label: 'Befunde' },
                { path: '/profil', icon: 'person', label: 'Profil' },
                { path: '/ueber-uns', icon: 'people', label: 'Über Uns' }
            ]
        };
    },
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
        ...{ class: ("sidebar sidebar-offcanvas nav") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("sidenav-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: ("navbar-brand") },
        href: ("/"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("text-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.img)({
        src: ((__VLS_ctx.staticUrl + 'img/ag_lux_logo_light_grey.svg')),
        alt: ("Logo"),
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
    for (const [link] of __VLS_getVForSourceType((__VLS_ctx.navLinks))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: ("nav-item") },
            key: ((link.path)),
        });
        const __VLS_0 = {}.RouterLink;
        /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            to: ((link.path)),
            ...{ class: ("nav-link") },
            ...{ class: (({ active: __VLS_ctx.$route.path === link.path })) },
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            to: ((link.path)),
            ...{ class: ("nav-link") },
            ...{ class: (({ active: __VLS_ctx.$route.path === link.path })) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_6;
        const __VLS_7 = {
            onClick: (__VLS_ctx.closeSidebar)
        };
        let __VLS_3;
        let __VLS_4;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons opacity-10") },
        });
        (link.icon);
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("nav-link-text ms-1") },
        });
        (link.label);
        __VLS_5.slots.default;
        var __VLS_5;
    }
    ['sidebar', 'sidebar-offcanvas', 'nav', 'sidenav-header', 'navbar-brand', 'text-center', 'ms-1', 'font-weight-bold', 'text-white', 'text-center', 'collapse', 'navbar-collapse', 'w-auto', 'max-height-vh-100', 'navbar-nav', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1',];
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
