import { useRouter } from 'vue-router';
import { computed } from 'vue';
export default (await import('vue')).defineComponent({
    name: 'DashboardView',
    setup() {
        const router = useRouter();
        const availableRoutes = computed(() => {
            return router.options.routes.filter(route => {
                // Filter out login route and routes without names
                return route.name && route.name !== 'Login';
            });
        });
        return {
            availableRoutes
        };
    }
}); /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: ("main-content border-radius-lg") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: ("app"),
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    for (const [route, index] of __VLS_getVForSourceType((__VLS_ctx.availableRoutes))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((index)),
            ...{ class: ("col-md-4 col-sm-6 mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body d-flex flex-column justify-content-between") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        (route.name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("card-text") },
        });
        (route.description || "Keine Beschreibung verfügbar");
        const __VLS_0 = {}.RouterLink;
        /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            to: ((route.path)),
            ...{ class: ("btn btn-primary mt-auto") },
        }));
        const __VLS_2 = __VLS_1({
            to: ((route.path)),
            ...{ class: ("btn btn-primary mt-auto") },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        (route.name);
        __VLS_5.slots.default;
        var __VLS_5;
    }
    ['container-fluid', 'py-4', 'main-content', 'border-radius-lg', 'container-fluid', 'py-4', 'row', 'col-md-4', 'col-sm-6', 'mb-4', 'card', 'h-100', 'card-body', 'd-flex', 'flex-column', 'justify-content-between', 'card-title', 'card-text', 'btn', 'btn-primary', 'mt-auto',];
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
