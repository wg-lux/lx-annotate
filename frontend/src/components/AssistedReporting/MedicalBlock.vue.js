import { ref, computed } from 'vue';
const props = defineProps({
    title: String,
    subtitle: String,
    icon: String,
    iconBgClass: { type: String, default: 'bg-gradient-info' },
    store: Object, // The specific Pinia store (patientStore, findingStore, etc.)
    isComplete: Boolean,
    isActive: Boolean,
    extraParams: Object,
    actionLabel: { type: String, default: 'Weiter' },
    showAction: { type: Boolean, default: true },
    loading: Boolean
});
const isExpanded = ref(props.isActive);
const expandStyle = computed(() => ({
    transform: isExpanded.value ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.3s ease'
}));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card mb-4 shadow-sm" },
    ...{ class: ({ 'border-primary': __VLS_ctx.isActive }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isExpanded = !__VLS_ctx.isExpanded;
        } },
    ...{ class: "card-header p-3 cursor-pointer d-flex align-items-center justify-content-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: (['icon icon-shape shadow-sm border-radius-md me-3', __VLS_ctx.iconBgClass]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "material-icons opacity-10" },
});
(__VLS_ctx.icon);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0 text-dark" },
});
(__VLS_ctx.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs mb-0 text-secondary" },
});
(__VLS_ctx.subtitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex align-items-center" },
});
if (__VLS_ctx.isComplete) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge badge-sm bg-gradient-success me-3" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "material-icons transition-all" },
    ...{ style: (__VLS_ctx.expandStyle) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "collapse show" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isExpanded) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({
    ...{ class: "dark horizontal my-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body medical-block-scroll" },
});
var __VLS_0 = {
    store: (__VLS_ctx.store),
    params: (__VLS_ctx.extraParams),
};
if (__VLS_ctx.showAction) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-end mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showAction))
                    return;
                __VLS_ctx.$emit('next');
            } },
        ...{ class: "btn btn-sm bg-gradient-dark mb-0" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.isComplete),
    });
    (__VLS_ctx.actionLabel);
}
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shape']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-radius-md']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-10']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-success']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['material-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['collapse']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['horizontal']} */ ;
/** @type {__VLS_StyleScopedClasses['my-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['medical-block-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
// @ts-ignore
var __VLS_1 = __VLS_0;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            isExpanded: isExpanded,
            expandStyle: expandStyle,
        };
    },
    props: {
        title: String,
        subtitle: String,
        icon: String,
        iconBgClass: { type: String, default: 'bg-gradient-info' },
        store: Object, // The specific Pinia store (patientStore, findingStore, etc.)
        isComplete: Boolean,
        isActive: Boolean,
        extraParams: Object,
        actionLabel: { type: String, default: 'Weiter' },
        showAction: { type: Boolean, default: true },
        loading: Boolean
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    props: {
        title: String,
        subtitle: String,
        icon: String,
        iconBgClass: { type: String, default: 'bg-gradient-info' },
        store: Object, // The specific Pinia store (patientStore, findingStore, etc.)
        isComplete: Boolean,
        isActive: Boolean,
        extraParams: Object,
        actionLabel: { type: String, default: 'Weiter' },
        showAction: { type: Boolean, default: true },
        loading: Boolean
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
