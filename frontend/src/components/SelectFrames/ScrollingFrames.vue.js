import { useImageStore } from '@/stores/imageStore';
export default (await import('vue')).defineComponent({
    name: 'ScrollingFrames',
    setup() {
        const imageStore = useImageStore();
        const frames = imageStore.data;
        const annotateFrame = (frame) => {
            alert(`Frame ${frame.id} annotiert!`);
            // Hier können weitere Annotationen hinzugefügt werden
        };
        return {
            frames,
            annotateFrame,
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12 bg-light mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("overflow-auto") },
        ...{ style: ({}) },
    });
    const __VLS_0 = {}.DynamicScroller;
    /** @type { [typeof __VLS_components.DynamicScroller, typeof __VLS_components.DynamicScroller, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        items: ((__VLS_ctx.frames)),
        minItemSize: ((150)),
        keyField: ("id"),
    }));
    const __VLS_2 = __VLS_1({
        items: ((__VLS_ctx.frames)),
        minItemSize: ((150)),
        keyField: ("id"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    {
        const { default: __VLS_thisSlot } = __VLS_5.slots;
        const [{ item }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_6 = {}.DynamicScrollerItem;
        /** @type { [typeof __VLS_components.DynamicScrollerItem, typeof __VLS_components.DynamicScrollerItem, ] } */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
            item: ((item)),
        }));
        const __VLS_8 = __VLS_7({
            item: ((item)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("frame-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: ((item.imageUrl)),
            alt: ("Frame"),
            ...{ class: ("img-fluid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.annotateFrame(item);
                } },
            ...{ class: ("btn btn-primary btn-sm mt-2") },
        });
        __VLS_11.slots.default;
        var __VLS_11;
        __VLS_5.slots['' /* empty slot name completion */];
    }
    var __VLS_5;
    ['container-fluid', 'py-4', 'row', 'col-12', 'bg-light', 'mb-4', 'overflow-auto', 'frame-item', 'img-fluid', 'btn', 'btn-primary', 'btn-sm', 'mt-2',];
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
