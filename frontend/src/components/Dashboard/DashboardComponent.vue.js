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
import { useRouter } from 'vue-router';
import { computed } from 'vue';
export default (await import('vue')).defineComponent({
    name: 'DashboardView',
    setup: function () {
        var router = useRouter();
        var availableRoutes = computed(function () {
            return router.options.routes.filter(function (route) {
                // Filter out login route and routes without names
                return route.name && route.name !== 'Login';
            });
        });
        return {
            availableRoutes: availableRoutes
        };
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)(__assign({ class: ("main-content border-radius-lg") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ id: ("app") }, { class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
    for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.availableRoutes)); _i < _a.length; _i++) {
        var _b = _a[_i], route = _b[0], index = _b[1];
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ key: ((index)) }, { class: ("col-md-4 col-sm-6 mb-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card h-100") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body d-flex flex-column justify-content-between") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)(__assign({ class: ("card-title") }));
        (route.name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)(__assign({ class: ("card-text") }));
        (route.description || "Keine Beschreibung verfügbar");
        var __VLS_0 = {}.RouterLink;
        /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
        // @ts-ignore
        var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0(__assign({ to: ((route.path)) }, { class: ("btn btn-primary mt-auto") })));
        var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([__assign({ to: ((route.path)) }, { class: ("btn btn-primary mt-auto") })], __VLS_functionalComponentArgsRest(__VLS_1), false));
        (route.name);
        __VLS_5.slots.default;
        var __VLS_5;
    }
    ['container-fluid', 'py-4', 'main-content', 'border-radius-lg', 'container-fluid', 'py-4', 'row', 'col-md-4', 'col-sm-6', 'mb-4', 'card', 'h-100', 'card-body', 'd-flex', 'flex-column', 'justify-content-between', 'card-title', 'card-text', 'btn', 'btn-primary', 'mt-auto',];
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
