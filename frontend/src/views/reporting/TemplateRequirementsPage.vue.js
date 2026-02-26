import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import axiosInstance from '@/api/axiosInstance';
import LookupActionsBar from '@/components/Reporting/LookupActionsBar.vue';
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
const route = useRoute();
const flow = useReportingFlowStore();
const lookup = ref(null);
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const requirementSets = computed(() => lookup.value?.requirementSets ?? []);
const selectedRequirementSetIdSet = computed(() => new Set(flow.selectedRequirementSetIds));
const prettySuggestedActions = computed(() => JSON.stringify(lookup.value?.suggestedActions || {}, null, 2));
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function applyLookup(partial) {
    if (!lookup.value) {
        lookup.value = partial;
    }
    else {
        lookup.value = { ...lookup.value, ...partial };
    }
    if (Array.isArray(partial.selectedRequirementSetIds)) {
        flow.setSelectedRequirementSetIds(partial.selectedRequirementSetIds);
    }
}
const lookupActions = useLookupActions({
    flow,
    loading,
    errorMessage,
    successMessage,
    applyLookup,
    clearMessages
});
async function fetchLookupAll() {
    await lookupActions.fetchLookupAll();
}
async function fetchLookupParts(keys) {
    const result = await lookupActions.fetchLookupParts(keys);
    if (result.ok) {
        successMessage.value = 'Teilstatus aus Lookup geladen.';
    }
}
async function toggleRequirementSet(id, checked) {
    if (loading.value)
        return;
    clearMessages();
    const next = new Set(flow.selectedRequirementSetIds);
    if (checked)
        next.add(id);
    else
        next.delete(id);
    const ids = Array.from(next);
    try {
        const patchResult = await lookupActions.patchLookupParts({ selectedRequirementSetIds: ids }, { fallbackErrorMessage: 'Fehler beim Speichern der Anforderungssets.' });
        if (!patchResult.ok)
            return;
        flow.setSelectedRequirementSetIds(ids);
        if (lookup.value)
            lookup.value = { ...lookup.value, selectedRequirementSetIds: ids };
        await fetchLookupParts(['selectedRequirementSetIds', 'requirementSetStatus']);
        successMessage.value = 'Anforderungssets gespeichert.';
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Speichern der Anforderungssets.';
    }
}
async function triggerRecompute() {
    const result = await lookupActions.recomputeLookup({
        applyUpdates: true,
        refreshAfter: true,
        fallbackErrorMessage: 'Fehler bei der Neuberechnung.'
    });
    if (result.ok) {
        successMessage.value = 'Lookup wurde erfolgreich neu berechnet.';
    }
}
onMounted(async () => {
    if (flow.patientExaminationId &&
        Number(route.params.patient_examination_id) !== flow.patientExaminationId) {
        errorMessage.value =
            'Warnung: Route-Parameter und gespeicherte Patientenuntersuchung stimmen nicht überein.';
    }
    if (flow.lookupToken) {
        await fetchLookupAll();
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex justify-content-between align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
/** @type {[typeof LookupActionsBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(LookupActionsBar, new LookupActionsBar({
    ...{ 'onRefresh': {} },
    ...{ 'onLoadParts': {} },
    ...{ 'onRecompute': {} },
    loading: (__VLS_ctx.loading),
    hasLookupToken: (!!__VLS_ctx.flow.lookupToken),
    showParts: (true),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onRefresh': {} },
    ...{ 'onLoadParts': {} },
    ...{ 'onRecompute': {} },
    loading: (__VLS_ctx.loading),
    hasLookupToken: (!!__VLS_ctx.flow.lookupToken),
    showParts: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onRefresh: (__VLS_ctx.fetchLookupAll)
};
const __VLS_7 = {
    onLoadParts: (...[$event]) => {
        __VLS_ctx.fetchLookupParts(['requirementSets', 'selectedRequirementSetIds', 'requirementSetStatus', 'suggestedActions']);
    }
};
const __VLS_8 = {
    onRecompute: (__VLS_ctx.triggerRecompute)
};
var __VLS_2;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger py-2" },
    });
    (__VLS_ctx.errorMessage);
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success py-2" },
    });
    (__VLS_ctx.successMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    value: (__VLS_ctx.flow.patientExaminationId ?? ''),
    readonly: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    value: (__VLS_ctx.flow.lookupToken ?? ''),
    readonly: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted mb-3" },
});
(__VLS_ctx.route.params.patient_examination_id);
if (!__VLS_ctx.flow.lookupToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning mb-0" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    /** @type {[typeof RequirementSetSelectionList, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(RequirementSetSelectionList, new RequirementSetSelectionList({
        ...{ 'onToggle': {} },
        items: (__VLS_ctx.requirementSets),
        selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        loading: (__VLS_ctx.loading),
        requirementSetStatus: (__VLS_ctx.lookup?.requirementSetStatus || {}),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onToggle': {} },
        items: (__VLS_ctx.requirementSets),
        selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        loading: (__VLS_ctx.loading),
        requirementSetStatus: (__VLS_ctx.lookup?.requirementSetStatus || {}),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onToggle: (__VLS_ctx.toggleRequirementSet)
    };
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 p-3 bg-light rounded" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-between align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "fw-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
    (__VLS_ctx.flow.selectedRequirementSetIds.join(', ') || 'keine');
    if (__VLS_ctx.lookup?.suggestedActions && Object.keys(__VLS_ctx.lookup.suggestedActions).length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: "small bg-light rounded p-2 mb-0" },
        });
        (__VLS_ctx.prettySuggestedActions);
    }
}
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LookupActionsBar: LookupActionsBar,
            RequirementSetSelectionList: RequirementSetSelectionList,
            route: route,
            flow: flow,
            lookup: lookup,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            requirementSets: requirementSets,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            prettySuggestedActions: prettySuggestedActions,
            fetchLookupAll: fetchLookupAll,
            fetchLookupParts: fetchLookupParts,
            toggleRequirementSet: toggleRequirementSet,
            triggerRecompute: triggerRecompute,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
