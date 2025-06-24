import VideoExaminationAnnotation from '@/components/VideoExamination/VideoExaminationAnnotation.vue';
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid h-100 w-100 py-1 px-4") },
    });
    // @ts-ignore
    /** @type { [typeof VideoExaminationAnnotation, ] } */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(VideoExaminationAnnotation, new VideoExaminationAnnotation({}));
    const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
    ['container-fluid', 'h-100', 'w-100', 'py-1', 'px-4',];
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VideoExaminationAnnotation: VideoExaminationAnnotation,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
