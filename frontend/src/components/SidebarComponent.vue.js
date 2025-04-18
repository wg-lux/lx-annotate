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
export default (await import('vue')).defineComponent({
    name: 'SidebarComponent',
    data: function () {
        return {
            staticUrl: window.STATIC_URL || '/static/',
            isSidebarOpen: false
        };
    },
    methods: {
        toggleSidebar: function () {
            this.isSidebarOpen = !this.isSidebarOpen;
        }
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("sidenav") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("sidenav-header") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)(__assign({ class: ("navbar-brand m-0") }, { href: ("/") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("sidenav-header-inner text-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.img)({
        src: ((__VLS_ctx.staticUrl + 'img/ag_lux_logo_light_grey.svg')),
        alt: ("Logo"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("ms-1 font-weight-bold text-white text-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("w-auto max-height-vh-100") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)(__assign({ class: ("navbar-nav") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_0 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0(__assign(__assign({ to: ("/") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/' })) })));
    var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([__assign(__assign({ to: ("/") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/' })) })], __VLS_functionalComponentArgsRest(__VLS_1), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_5.slots.default;
    var __VLS_5;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_6 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6(__assign(__assign({ to: ("/annotationen") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/annotationen' })) })));
    var __VLS_8 = __VLS_7.apply(void 0, __spreadArray([__assign(__assign({ to: ("/annotationen") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/annotationen' })) })], __VLS_functionalComponentArgsRest(__VLS_7), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_11.slots.default;
    var __VLS_11;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_12 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12(__assign(__assign({ to: ("/video-annotation") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/video-annotation' })) })));
    var __VLS_14 = __VLS_13.apply(void 0, __spreadArray([__assign(__assign({ to: ("/video-annotation") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/video-annotation' })) })], __VLS_functionalComponentArgsRest(__VLS_13), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_18 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18(__assign(__assign({ to: ("/frame-annotation") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/frame-annotation' })) })));
    var __VLS_20 = __VLS_19.apply(void 0, __spreadArray([__assign(__assign({ to: ("/frame-annotation") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/frame-annotation' })) })], __VLS_functionalComponentArgsRest(__VLS_19), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_23.slots.default;
    var __VLS_23;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_24 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24(__assign(__assign({ to: ("/fallgenerator") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/fallgenerator' })) })));
    var __VLS_26 = __VLS_25.apply(void 0, __spreadArray([__assign(__assign({ to: ("/fallgenerator") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/fallgenerator' })) })], __VLS_functionalComponentArgsRest(__VLS_25), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_29.slots.default;
    var __VLS_29;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_30 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30(__assign(__assign({ to: ("/befund") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/befund' })) })));
    var __VLS_32 = __VLS_31.apply(void 0, __spreadArray([__assign(__assign({ to: ("/befund") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/befund' })) })], __VLS_functionalComponentArgsRest(__VLS_31), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_35.slots.default;
    var __VLS_35;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_36 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36(__assign(__assign({ to: ("/validierung") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/validierung' })) })));
    var __VLS_38 = __VLS_37.apply(void 0, __spreadArray([__assign(__assign({ to: ("/validierung") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/validierung' })) })], __VLS_functionalComponentArgsRest(__VLS_37), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_41.slots.default;
    var __VLS_41;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_42 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42(__assign(__assign({ to: ("/profil") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/profil' })) })));
    var __VLS_44 = __VLS_43.apply(void 0, __spreadArray([__assign(__assign({ to: ("/profil") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/profil' })) })], __VLS_functionalComponentArgsRest(__VLS_43), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_47.slots.default;
    var __VLS_47;
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)(__assign({ class: ("nav-item") }));
    var __VLS_48 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    var __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48(__assign(__assign({ to: ("/ueber-uns") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/ueber-uns' })) })));
    var __VLS_50 = __VLS_49.apply(void 0, __spreadArray([__assign(__assign({ to: ("/ueber-uns") }, { class: ("nav-link") }), { class: (({ active: __VLS_ctx.$route.path === '/ueber-uns' })) })], __VLS_functionalComponentArgsRest(__VLS_49), false));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("material-icons opacity-10") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("nav-link-text ms-1") }));
    __VLS_53.slots.default;
    var __VLS_53;
    ['sidenav', 'sidenav-header', 'navbar-brand', 'm-0', 'sidenav-header-inner', 'text-center', 'ms-1', 'font-weight-bold', 'text-white', 'text-center', 'w-auto', 'max-height-vh-100', 'navbar-nav', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1', 'nav-item', 'nav-link', 'active', 'icon', 'icon-shape', 'icon-sm', 'shadow', 'border-radius-md', 'text-center', 'me-2', 'd-flex', 'align-items-center', 'justify-content-center', 'material-icons', 'opacity-10', 'nav-link-text', 'ms-1',];
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
