import { computed } from 'vue';
const props = withDefaults(defineProps(), {
    indicationOptions: () => [],
    title: 'Indikationen',
    description: '',
    disabled: false,
    optionsLoading: false,
    optionsError: null
});
const emit = defineEmits();
function parseOptionalInt(value) {
    const n = Number(value);
    return Number.isFinite(n) && value !== '' ? n : null;
}
function dedupeChoiceOptions(options) {
    const byId = new Map();
    for (const option of options) {
        const id = Number(option?.id);
        if (!Number.isFinite(id))
            continue;
        byId.set(id, {
            id,
            label: String(option?.label || `Auswahl #${id}`)
        });
    }
    return Array.from(byId.values());
}
const baseIndicationOptions = computed(() => {
    const byId = new Map();
    for (const entry of props.indicationOptions || []) {
        const id = Number(entry?.id);
        if (!Number.isFinite(id))
            continue;
        const current = byId.get(id);
        const mergedChoices = dedupeChoiceOptions([
            ...(current?.choices || []),
            ...(entry?.choices || []).map((choice) => ({
                id: Number(choice?.id),
                label: String(choice?.label || '')
            }))
        ]);
        byId.set(id, {
            id,
            label: String(entry?.label || `Indikation #${id}`),
            choices: mergedChoices
        });
    }
    return Array.from(byId.values());
});
const hasBaseIndicationOptions = computed(() => baseIndicationOptions.value.length > 0);
function getChoiceOptionsForIndication(indicationId) {
    if (indicationId == null)
        return [];
    return baseIndicationOptions.value.find((option) => option.id === indicationId)?.choices || [];
}
function resolveIndicationOptionsForRow(row) {
    const options = baseIndicationOptions.value.slice();
    const existingId = row.examinationIndicationId;
    if (existingId == null || options.some((option) => option.id === existingId)) {
        return options;
    }
    return [{ id: existingId, label: `Unbekannte Indikation (#${existingId})`, choices: [] }, ...options];
}
function resolveChoiceOptionsForRow(row) {
    const options = getChoiceOptionsForIndication(row.examinationIndicationId);
    const existingId = row.indicationChoiceId;
    if (existingId == null || options.some((option) => option.id === existingId)) {
        return options;
    }
    return [{ id: existingId, label: `Unbekannte Auswahl (#${existingId})` }, ...options];
}
function onIndicationChanged(index, rawValue) {
    const nextIndicationId = parseOptionalInt(rawValue);
    const nextChoiceOptions = getChoiceOptionsForIndication(nextIndicationId);
    const currentChoiceId = props.rows[index]?.indicationChoiceId ?? null;
    const shouldClearChoice = currentChoiceId != null &&
        !nextChoiceOptions.some((choice) => choice.id === currentChoiceId);
    emitUpdateRow(index, {
        examinationIndicationId: nextIndicationId,
        ...(shouldClearChoice ? { indicationChoiceId: null } : {})
    });
}
function emitUpdateRow(index, patch) {
    emit('update-row', index, patch);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    indicationOptions: () => [],
    title: 'Indikationen',
    description: '',
    disabled: false,
    optionsLoading: false,
    optionsError: null
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-2" },
});
(__VLS_ctx.title);
if (__VLS_ctx.description) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted small" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.description) }, null, null);
}
if (__VLS_ctx.optionsError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning py-2 d-flex justify-content-between align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.optionsError);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.optionsError))
                    return;
                __VLS_ctx.$emit('refresh-options');
            } },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.disabled || __VLS_ctx.optionsLoading),
    });
}
else if (__VLS_ctx.optionsLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted mb-2" },
    });
}
else if (!__VLS_ctx.hasBaseIndicationOptions) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info py-2 d-flex justify-content-between align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.optionsError))
                    return;
                if (!!(__VLS_ctx.optionsLoading))
                    return;
                if (!(!__VLS_ctx.hasBaseIndicationOptions))
                    return;
                __VLS_ctx.$emit('refresh-options');
            } },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.disabled),
    });
}
for (const [row, idx] of __VLS_getVForSourceType((__VLS_ctx.rows))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (idx),
        ...{ class: "row g-2 align-items-end mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                __VLS_ctx.onIndicationChanged(idx, $event.target.value);
            } },
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.disabled),
        value: (row.examinationIndicationId ?? ''),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.resolveIndicationOptionsForRow(row)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (option.id),
            value: (option.id),
        });
        (option.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                __VLS_ctx.emitUpdateRow(idx, { indicationChoiceId: __VLS_ctx.parseOptionalInt($event.target.value) });
            } },
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.disabled || !row.examinationIndicationId || !__VLS_ctx.resolveChoiceOptionsForRow(row).length),
        value: (row.indicationChoiceId ?? ''),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    (row.examinationIndicationId ? 'Keine Auswahl' : 'Zuerst Indikation wählen');
    for (const [choice] of __VLS_getVForSourceType((__VLS_ctx.resolveChoiceOptionsForRow(row)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (choice.id),
            value: (choice.id),
        });
        (choice.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('remove-row', idx);
            } },
        ...{ class: "btn btn-outline-danger w-100" },
        disabled: (__VLS_ctx.disabled),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-wrap gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('add-row');
        } },
    ...{ class: "btn btn-outline-primary btn-sm" },
    disabled: (__VLS_ctx.disabled),
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-5']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-5']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            parseOptionalInt: parseOptionalInt,
            hasBaseIndicationOptions: hasBaseIndicationOptions,
            resolveIndicationOptionsForRow: resolveIndicationOptionsForRow,
            resolveChoiceOptionsForRow: resolveChoiceOptionsForRow,
            onIndicationChanged: onIndicationChanged,
            emitUpdateRow: emitUpdateRow,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
