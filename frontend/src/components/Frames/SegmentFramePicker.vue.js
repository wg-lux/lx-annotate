import { computed, ref, watch } from 'vue';
const props = defineProps();
const emit = defineEmits();
const currentIndex = ref(0);
/**
 * Convert the Segment.frames Record<string, TimeSegmentFrame>
 * into a sorted array, ordered by frameId.
 */
const frames = computed(() => {
    if (!props.segment?.frames)
        return [];
    return Object.values(props.segment.frames).sort((a, b) => a.frameId - b.frameId);
});
const currentFrame = computed(() => {
    if (!frames.value.length)
        return null;
    return frames.value[currentIndex.value] ?? null;
});
// Reset index whenever segment changes
watch(() => props.segment?.id, () => {
    currentIndex.value = 0;
});
function prev() {
    if (!frames.value.length)
        return;
    currentIndex.value =
        (currentIndex.value - 1 + frames.value.length) % frames.value.length;
}
function next() {
    if (!frames.value.length)
        return;
    currentIndex.value = (currentIndex.value + 1) % frames.value.length;
}
function selectCurrent() {
    if (currentFrame.value) {
        emit('select', currentFrame.value);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.frames.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "segment-frame-picker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "frame-preview mb-2 text-center" },
    });
    if (__VLS_ctx.currentFrame) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.currentFrame.frameUrl),
            alt: (`Frame ${__VLS_ctx.currentIndex + 1}`),
            ...{ class: "img-fluid rounded border" },
            ...{ style: {} },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-between align-items-center mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.prev) },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.frames.length <= 1),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.currentIndex + 1);
    (__VLS_ctx.frames.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.next) },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.frames.length <= 1),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-end" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.selectCurrent) },
        ...{ class: "btn btn-primary btn-sm" },
        disabled: (!__VLS_ctx.currentFrame),
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
/** @type {__VLS_StyleScopedClasses['segment-frame-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            currentIndex: currentIndex,
            frames: frames,
            currentFrame: currentFrame,
            prev: prev,
            next: next,
            selectCurrent: selectCurrent,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
