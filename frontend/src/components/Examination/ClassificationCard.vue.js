import { defineComponent, computed, ref, watch } from 'vue';
export default defineComponent({
    name: 'ClassificationCard',
    props: {
        label: {
            type: String,
            required: true
        },
        options: {
            type: Array,
            default: () => []
        },
        modelValue: {
            type: Array,
            default: () => []
        },
        tempValue: {
            type: Number,
            default: undefined
        },
        compact: {
            type: Boolean,
            default: false
        },
        singleSelect: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:modelValue', 'update:tempValue'],
    setup(props, { emit }) {
        const localModelValue = computed({
            get: () => props.modelValue,
            set: (value) => emit('update:modelValue', value)
        });
        const localTempValue = computed({
            get: () => props.tempValue,
            set: (value) => emit('update:tempValue', value)
        });
        const singleSelectedValue = computed({
            get: () => props.modelValue.length ? props.modelValue[0] : null,
            set: (value) => {
                if (value === null) {
                    emit('update:modelValue', []);
                }
                else {
                    emit('update:modelValue', [value]);
                }
            }
        });
        const isSingleSelection = computed(() => props.singleSelect);
        const selectedLabels = computed(() => {
            return props.options.filter(option => props.modelValue.includes(option.id));
        });
        const availableOptions = computed(() => {
            return props.options.filter(option => !props.modelValue.includes(option.id));
        });
        const selectPrompt = computed(() => {
            return `${props.label} auswählen...`;
        });
        const addSelected = () => {
            if (localTempValue.value) {
                if (isSingleSelection.value) {
                    emit('update:modelValue', [localTempValue.value]);
                }
                else {
                    const updatedValues = [...localModelValue.value, localTempValue.value];
                    emit('update:modelValue', updatedValues);
                }
                emit('update:tempValue', undefined);
            }
        };
        const removeItem = (id) => {
            const updatedValues = localModelValue.value.filter(item => item !== id);
            emit('update:modelValue', updatedValues);
        };
        return {
            localModelValue,
            localTempValue,
            singleSelectedValue,
            isSingleSelection,
            selectedLabels,
            availableOptions,
            selectPrompt,
            addSelected,
            removeItem
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['remove-btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("classification-card") },
        ...{ class: (({ 'compact-mode': __VLS_ctx.compact })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title") },
    });
    (__VLS_ctx.label);
    if (__VLS_ctx.compact) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("compact-summary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selected-items") },
        });
        if (__VLS_ctx.selectedLabels.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("selected-tags") },
            });
            for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedLabels))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: ((item.id)),
                    ...{ class: ("selected-tag") },
                });
                (item.name);
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.compact)))
                                return;
                            if (!((__VLS_ctx.selectedLabels.length)))
                                return;
                            __VLS_ctx.removeItem(item.id);
                        } },
                    type: ("button"),
                    ...{ class: ("remove-btn") },
                });
            }
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("no-selection") },
            });
        }
        if (__VLS_ctx.options.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("selection-controls") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: ((__VLS_ctx.localTempValue)),
                ...{ class: ("form-select") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ((undefined)),
                disabled: (true),
            });
            (__VLS_ctx.selectPrompt);
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.availableOptions))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: ((option.id)),
                    value: ((option.id)),
                });
                (option.name);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.addSelected) },
                type: ("button"),
                ...{ class: ("btn btn-sm btn-primary add-btn") },
                disabled: ((!__VLS_ctx.localTempValue)),
            });
        }
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("full-selection") },
        });
        if (__VLS_ctx.isSingleSelection) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("radio-group") },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.options))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((option.id)),
                    ...{ class: ("form-check") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                    type: ("radio"),
                    id: ((`${__VLS_ctx.label}-${option.id}`)),
                    value: ((option.id)),
                    ...{ class: ("form-check-input") },
                });
                (__VLS_ctx.singleSelectedValue);
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    for: ((`${__VLS_ctx.label}-${option.id}`)),
                    ...{ class: ("form-check-label") },
                });
                (option.name);
            }
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("checkbox-group") },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.options))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((option.id)),
                    ...{ class: ("form-check") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                    type: ("checkbox"),
                    id: ((`${__VLS_ctx.label}-${option.id}`)),
                    value: ((option.id)),
                    ...{ class: ("form-check-input") },
                });
                (__VLS_ctx.localModelValue);
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    for: ((`${__VLS_ctx.label}-${option.id}`)),
                    ...{ class: ("form-check-label") },
                });
                (option.name);
            }
        }
    }
    ['classification-card', 'compact-mode', 'card-title', 'compact-summary', 'selected-items', 'selected-tags', 'selected-tag', 'remove-btn', 'no-selection', 'selection-controls', 'form-select', 'btn', 'btn-sm', 'btn-primary', 'add-btn', 'full-selection', 'radio-group', 'form-check', 'form-check-input', 'form-check-label', 'checkbox-group', 'form-check', 'form-check-input', 'form-check-label',];
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
