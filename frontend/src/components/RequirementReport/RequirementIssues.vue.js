import { computed } from 'vue';
const props = defineProps();
const totalUnmet = computed(() => {
    if (!props.unmetBySet)
        return 0;
    return Object.values(props.unmetBySet).reduce((acc, g) => acc + g.items.length, 0);
});
const payload = computed(() => props.payload);
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card mt-3 border-danger-subtle") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-exclamation-triangle text-danger me-2") },
    });
    if (__VLS_ctx.totalUnmet > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-danger") },
        });
        (__VLS_ctx.totalUnmet);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.payload?.errors?.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-warning") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: ("mb-0") },
        });
        for (const [e, i] of __VLS_getVForSourceType((__VLS_ctx.payload.errors))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: ((i)),
            });
            (e);
        }
    }
    if (__VLS_ctx.totalUnmet === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle me-1 text-success") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex flex-column gap-3") },
        });
        for (const [group, key] of __VLS_getVForSourceType((__VLS_ctx.unmetBySet))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((key)),
                ...{ class: ("border rounded p-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex justify-content-between align-items-center mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-layer-group me-2 text-secondary") },
            });
            (group.setName);
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-danger") },
            });
            (group.items.length);
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("list-unstyled mb-0") },
            });
            for (const [item, idx] of __VLS_getVForSourceType((group.items))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: ((idx)),
                    ...{ class: ("mb-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex align-items-start gap-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-times-circle text-danger mt-1") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("fw-semibold") },
                });
                (item.requirement_name);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("small text-muted") },
                });
                (item.details || 'Nicht erfüllt');
                if (item.error) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("small text-danger mt-1") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-bug me-1") },
                    });
                    (item.error);
                }
            }
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-muted small") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-1") },
        });
        (__VLS_ctx.payload?.meta?.requirementsEvaluated ?? 0);
        (__VLS_ctx.totalUnmet);
        (__VLS_ctx.payload?.meta?.status || 'unknown');
    }
    ['card', 'mt-3', 'border-danger-subtle', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-exclamation-triangle', 'text-danger', 'me-2', 'badge', 'bg-danger', 'card-body', 'alert', 'alert-warning', 'mb-0', 'text-muted', 'fas', 'fa-check-circle', 'me-1', 'text-success', 'd-flex', 'flex-column', 'gap-3', 'border', 'rounded', 'p-3', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'fas', 'fa-layer-group', 'me-2', 'text-secondary', 'badge', 'bg-danger', 'list-unstyled', 'mb-0', 'mb-2', 'd-flex', 'align-items-start', 'gap-2', 'fas', 'fa-times-circle', 'text-danger', 'mt-1', 'fw-semibold', 'small', 'text-muted', 'small', 'text-danger', 'mt-1', 'fas', 'fa-bug', 'me-1', 'text-muted', 'small', 'fas', 'fa-info-circle', 'me-1',];
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
            totalUnmet: totalUnmet,
            payload: payload,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
