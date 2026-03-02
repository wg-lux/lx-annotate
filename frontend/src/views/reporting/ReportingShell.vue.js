import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
const route = useRoute();
const flow = useReportingFlowStore();
const pe = computed(() => flow.patientExaminationId || ':patient_examination_id');
const navItems = computed(() => [
    { label: 'Arbeitsliste', to: '/reporting' },
    { label: 'Fall-Setup', to: '/reporting/case-setup' },
    { label: 'Template & Anforderungen', to: `/reporting/${pe.value}/template-requirements` },
    { label: 'Befunde', to: `/reporting/${pe.value}/findings` },
    { label: 'Anforderungsprüfung', to: `/reporting/${pe.value}/requirements-review` },
    { label: 'Berichtseditor', to: `/reporting/${pe.value}/report-editor` },
    { label: 'Frame-Auswahl', to: `/reporting/${pe.value}/frame-selector` },
    { label: 'Finalisierung', to: `/reporting/${pe.value}/finalized` }
]);
function isActive(path) {
    return route.path === path;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-shell container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted px-2 mb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.flow.sessionStatus);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted px-2 mb-3" },
});
(__VLS_ctx.flow.patientExaminationId || 'n/a');
(__VLS_ctx.flow.lookupToken ? 'ja' : 'nein');
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav flex-column gap-1" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: (item.to),
        to: (item.to),
        ...{ class: "workflow-step-btn btn btn-sm text-start" },
        ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
    }));
    const __VLS_2 = __VLS_1({
        key: (item.to),
        to: (item.to),
        ...{ class: "workflow-step-btn btn btn-sm text-start" },
        ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    (item.label);
    var __VLS_3;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-9" },
});
const __VLS_4 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-9']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            flow: flow,
            navItems: navItems,
            isActive: isActive,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
