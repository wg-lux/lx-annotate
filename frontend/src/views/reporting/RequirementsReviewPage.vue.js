import { computed, onMounted, ref } from 'vue';
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue';
import ReportTemplateValidationPanel from '@/components/Reporting/ReportTemplateValidationPanel.vue';
import RequirementAdvisoryPanel from '@/components/Reporting/RequirementAdvisoryPanel.vue';
import ReportingMediaPreviewCards from '@/components/Reporting/ReportingMediaPreviewCards.vue';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
const flow = useReportingFlowStore();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const reviewState = computed(() => {
    const fromLookup = flow.lookupSnapshot || {};
    const fromGuidance = (flow.lastRequirementGuidance && typeof flow.lastRequirementGuidance === 'object'
        ? flow.lastRequirementGuidance
        : {}) || {};
    return {
        ...fromLookup,
        requirementStatus: fromGuidance.requirementStatus ?? fromLookup.requirementStatus,
        requirementSetStatus: fromGuidance.requirementSetStatus ?? fromLookup.requirementSetStatus,
        suggestedActions: fromGuidance.suggestedActions ?? fromLookup.suggestedActions,
        candidateRequirementSetIds: fromGuidance.candidateRequirementSetIds ?? fromLookup.candidateRequirementSetIds,
        candidateRequirementSetConfidence: fromGuidance.candidateRequirementSetConfidence ?? fromLookup.candidateRequirementSetConfidence
    };
});
const failedRequirementSets = computed(() => Object.entries(reviewState.value.requirementSetStatus || {})
    .filter(([, ok]) => ok === false)
    .map(([id]) => id));
const failedRequirements = computed(() => Object.entries(reviewState.value.requirementStatus || {})
    .filter(([, ok]) => ok === false)
    .map(([id]) => id));
const suggestedActions = computed(() => reviewState.value.suggestedActions || {});
const candidateConfidence = computed(() => (typeof reviewState.value.candidateRequirementSetConfidence === 'number'
    ? reviewState.value.candidateRequirementSetConfidence
    : null));
const lookupRaw = computed(() => JSON.stringify(flow.lookupSnapshot || {}, null, 2));
const requirementGuidanceRaw = computed(() => flow.lastRequirementGuidance ? JSON.stringify(flow.lastRequirementGuidance, null, 2) : '');
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function patchFromLookup(data) {
    flow.patchLookupSnapshot({
        requirementStatus: data?.requirementStatus,
        requirementSetStatus: data?.requirementSetStatus,
        suggestedActions: data?.suggestedActions,
        requirementsBySet: data?.requirementsBySet,
        selectedRequirementSetIds: data?.selectedRequirementSetIds,
        candidateRequirementSetIds: data?.candidateRequirementSetIds,
        candidateRequirementSetConfidence: data?.candidateRequirementSetConfidence
    });
    if (Array.isArray(data?.selectedRequirementSetIds)) {
        flow.setSelectedRequirementSetIds(data.selectedRequirementSetIds);
    }
}
const lookupActions = useLookupActions({
    flow,
    loading,
    errorMessage,
    successMessage,
    applyLookup: patchFromLookup,
    clearMessages
});
async function fetchLookupAll() {
    const result = await lookupActions.fetchLookupAll({
        fallbackErrorMessage: 'Fehler beim Laden der Lookup-Hinweise.'
    });
    if (result.ok) {
        successMessage.value = 'Lookup-Hinweise geladen.';
    }
}
async function triggerRecompute() {
    const result = await lookupActions.recomputeLookup({
        applyUpdates: true,
        refreshAfter: true,
        fallbackErrorMessage: 'Fehler bei der Neuberechnung.'
    });
    if (result.ok) {
        successMessage.value = 'Lookup-Hinweise wurden neu berechnet.';
    }
}
onMounted(async () => {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.';
        return;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.fetchLookupAll) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.flow.lookupToken),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.triggerRecompute) },
    ...{ class: "btn btn-primary btn-sm" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.flow.lookupToken),
});
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
/** @type {[typeof LookupStatusPanel, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(LookupStatusPanel, new LookupStatusPanel({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    sessionStatus: (__VLS_ctx.flow.sessionStatus),
    findingsRevision: (__VLS_ctx.flow.findingsRevision),
}));
const __VLS_1 = __VLS_0({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    sessionStatus: (__VLS_ctx.flow.sessionStatus),
    findingsRevision: (__VLS_ctx.flow.findingsRevision),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
/** @type {[typeof ReportingMediaPreviewCards, ]} */ ;
// @ts-ignore
const __VLS_3 = __VLS_asFunctionalComponent(ReportingMediaPreviewCards, new ReportingMediaPreviewCards({
    ...{ class: "mb-3" },
}));
const __VLS_4 = __VLS_3({
    ...{ class: "mb-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_3));
/** @type {[typeof RequirementAdvisoryPanel, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(RequirementAdvisoryPanel, new RequirementAdvisoryPanel({
    failedRequirementSets: (__VLS_ctx.failedRequirementSets),
    failedRequirements: (__VLS_ctx.failedRequirements),
    suggestedActions: (__VLS_ctx.suggestedActions),
    candidateConfidence: (__VLS_ctx.candidateConfidence),
    lookupRaw: (__VLS_ctx.lookupRaw),
    requirementGuidanceRaw: (__VLS_ctx.requirementGuidanceRaw),
}));
const __VLS_7 = __VLS_6({
    failedRequirementSets: (__VLS_ctx.failedRequirementSets),
    failedRequirements: (__VLS_ctx.failedRequirements),
    suggestedActions: (__VLS_ctx.suggestedActions),
    candidateConfidence: (__VLS_ctx.candidateConfidence),
    lookupRaw: (__VLS_ctx.lookupRaw),
    requirementGuidanceRaw: (__VLS_ctx.requirementGuidanceRaw),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-3" },
});
/** @type {[typeof ReportTemplateValidationPanel, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(ReportTemplateValidationPanel, new ReportTemplateValidationPanel({
    result: (__VLS_ctx.flow.lastTemplateValidation),
    loading: (false),
    errorMessage: (null),
}));
const __VLS_10 = __VLS_9({
    result: (__VLS_ctx.flow.lastTemplateValidation),
    loading: (false),
    errorMessage: (null),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
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
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LookupStatusPanel: LookupStatusPanel,
            ReportTemplateValidationPanel: ReportTemplateValidationPanel,
            RequirementAdvisoryPanel: RequirementAdvisoryPanel,
            ReportingMediaPreviewCards: ReportingMediaPreviewCards,
            flow: flow,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            failedRequirementSets: failedRequirementSets,
            failedRequirements: failedRequirements,
            suggestedActions: suggestedActions,
            candidateConfidence: candidateConfidence,
            lookupRaw: lookupRaw,
            requirementGuidanceRaw: requirementGuidanceRaw,
            fetchLookupAll: fetchLookupAll,
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
