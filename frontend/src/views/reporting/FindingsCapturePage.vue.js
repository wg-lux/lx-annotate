import { computed, onMounted, ref } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import AddableFindingsDetail from '@/components/RequirementReport/AddableFindingsDetail.vue';
import FindingsDetail from '@/components/RequirementReport/FindingsDetail.vue';
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { useFindingStore } from '@/stores/findingStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { endpoints } from '@/types/api/endpoints';
const flow = useReportingFlowStore();
const findingStore = useFindingStore();
const patientExaminationStore = usePatientExaminationStore();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const lookupState = ref(null);
const lookupInitInFlight = ref(null);
function normalizeIdArray(value) {
    if (!Array.isArray(value))
        return [];
    const ids = value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry))
        .map((entry) => Math.trunc(entry));
    return Array.from(new Set(ids));
}
function normalizeBooleanRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [String(key), !!entry]));
}
function normalizeSuggestedActions(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [String(key), Array.isArray(entry) ? entry : []]));
}
function normalizeRequirementsBySet(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
        const requirements = Array.isArray(entry)
            ? entry
                .map((requirement) => {
                if (!requirement || typeof requirement !== 'object')
                    return null;
                const id = Number(requirement.id);
                const name = String(requirement.name || '');
                if (!Number.isFinite(id) || !name)
                    return null;
                return { id, name };
            })
                .filter((requirement) => !!requirement)
            : [];
        return [String(key), requirements];
    }));
}
function normalizeLookupPartial(partial) {
    const normalized = { ...partial };
    if ('availableFindings' in partial) {
        normalized.availableFindings = normalizeIdArray(partial.availableFindings);
    }
    if ('requiredFindings' in partial) {
        normalized.requiredFindings = normalizeIdArray(partial.requiredFindings);
    }
    if ('selectedRequirementSetIds' in partial) {
        normalized.selectedRequirementSetIds = normalizeIdArray(partial.selectedRequirementSetIds);
    }
    if ('requirementStatus' in partial) {
        normalized.requirementStatus = normalizeBooleanRecord(partial.requirementStatus);
    }
    if ('requirementSetStatus' in partial) {
        normalized.requirementSetStatus = normalizeBooleanRecord(partial.requirementSetStatus);
    }
    if ('suggestedActions' in partial) {
        normalized.suggestedActions = normalizeSuggestedActions(partial.suggestedActions);
    }
    if ('requirementsBySet' in partial) {
        normalized.requirementsBySet = normalizeRequirementsBySet(partial.requirementsBySet);
    }
    return normalized;
}
const availableFindings = computed(() => normalizeIdArray(lookupState.value?.availableFindings));
const canInitializeLookup = computed(() => !!flow.patientExaminationId);
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function formatApiError(e, fallback) {
    return e?.response?.data?.detail || e?.response?.data?.error || e?.message || fallback;
}
function applyLookup(partial) {
    const normalizedPartial = normalizeLookupPartial(partial);
    lookupState.value = { ...(lookupState.value || {}), ...normalizedPartial };
    flow.patchLookupSnapshot({
        requirementStatus: normalizedPartial.requirementStatus,
        requirementSetStatus: normalizedPartial.requirementSetStatus,
        suggestedActions: normalizedPartial.suggestedActions,
        requirementsBySet: normalizedPartial.requirementsBySet,
        selectedRequirementSetIds: normalizedPartial.selectedRequirementSetIds
    });
    if (Array.isArray(normalizedPartial.selectedRequirementSetIds)) {
        flow.setSelectedRequirementSetIds(normalizedPartial.selectedRequirementSetIds);
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
async function loadFindingsCatalog() {
    if (findingStore.findings.length === 0) {
        await findingStore.fetchFindings();
    }
}
async function fetchLookupAll() {
    const ensured = await ensureLookupSessionForCurrentPatientExamination();
    if (!ensured)
        return;
    await lookupActions.fetchLookupAll({
        fallbackErrorMessage: 'Fehler beim Laden des Lookup-Zustands.'
    });
}
async function triggerRecompute() {
    const ensured = await ensureLookupSessionForCurrentPatientExamination();
    if (!ensured)
        return;
    const result = await lookupActions.recomputeLookup({
        applyUpdates: true,
        refreshAfter: true,
        fallbackErrorMessage: 'Fehler bei der Lookup-Neuberechnung.'
    });
    if (result.ok) {
        successMessage.value = 'Lookup wurde nach Befundänderungen neu berechnet.';
    }
}
async function ensureLookupSessionForCurrentPatientExamination() {
    if (flow.lookupToken)
        return true;
    const patientExaminationId = flow.patientExaminationId;
    if (!patientExaminationId) {
        errorMessage.value = 'Keine Patientenuntersuchung vorhanden. Bitte zuerst im Fall-Setup initialisieren.';
        return false;
    }
    if (lookupInitInFlight.value) {
        return await lookupInitInFlight.value;
    }
    const initPromise = (async () => {
        loading.value = true;
        errorMessage.value = null;
        flow.setSessionStatus('restarting');
        try {
            const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
                patientExaminationId
            });
            const token = String(initRes.data?.token || '');
            if (!token) {
                throw new Error('Lookup-Init lieferte kein Token.');
            }
            flow.setLookupSession({
                patientExaminationId,
                lookupToken: token,
                status: 'active'
            });
            return true;
        }
        catch (e) {
            flow.setSessionStatus('expired');
            errorMessage.value = formatApiError(e, 'Lookup-Session konnte nicht initialisiert werden.');
            return false;
        }
        finally {
            loading.value = false;
            lookupInitInFlight.value = null;
        }
    })();
    lookupInitInFlight.value = initPromise;
    return await initPromise;
}
async function ensureLookupSession() {
    await ensureLookupSessionForCurrentPatientExamination();
}
function isFindingAddedToExamination(findingId) {
    if (!flow.patientExaminationId)
        return false;
    const ids = findingStore.getFindingIdsByPatientExaminationId(flow.patientExaminationId);
    return ids.includes(findingId);
}
function onFindingAddedToExamination(findingIdOrData, findingName) {
    const findingId = typeof findingIdOrData === 'number' ? findingIdOrData : findingIdOrData.findingId;
    const name = (typeof findingIdOrData === 'number' ? findingName : findingIdOrData.findingName) ||
        findingStore.getFindingById(findingId)?.name ||
        `Befund ${findingId}`;
    flow.noteFindingAdded(findingId);
    successMessage.value = `Befund "${name}" wurde hinzugefügt.`;
    // Refresh lookup advisory state after changes
    void triggerRecompute();
}
function onClassificationUpdated(findingId, classificationId, choiceId) {
    flow.noteClassificationUpdated(findingId, classificationId, choiceId);
    successMessage.value = `Klassifikation für Befund ${findingId} aktualisiert.`;
    void triggerRecompute();
}
function onFindingError(message) {
    errorMessage.value = message;
}
function onFindingDetailError(data) {
    errorMessage.value = data.error;
}
function formatFindingsEvent(event) {
    const e = event;
    if (e.type === 'finding_added')
        return `Befund ${e.findingId} hinzugefügt (${e.at})`;
    return `Klassifikation geändert: Befund ${e.findingId}, Klassifikation ${e.classificationId}, Wahl ${e.choiceId ?? 'leer'} (${e.at})`;
}
onMounted(async () => {
    if (flow.patientExaminationId) {
        patientExaminationStore.setCurrentPatientExaminationId(flow.patientExaminationId);
    }
    await loadFindingsCatalog();
    if (flow.patientExaminationId) {
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
    disabled: (__VLS_ctx.loading || !__VLS_ctx.canInitializeLookup),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.triggerRecompute) },
    ...{ class: "btn btn-primary btn-sm" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.canInitializeLookup),
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
    selectedExaminationId: (__VLS_ctx.flow.selectedExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
    findingsRevision: (__VLS_ctx.flow.findingsRevision),
}));
const __VLS_1 = __VLS_0({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    selectedExaminationId: (__VLS_ctx.flow.selectedExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
    findingsRevision: (__VLS_ctx.flow.findingsRevision),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
if (!__VLS_ctx.flow.patientExaminationId || !__VLS_ctx.flow.selectedExaminationId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning" },
    });
}
else {
    if (!__VLS_ctx.flow.lookupToken) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info d-flex justify-content-between align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.ensureLookupSession) },
            ...{ class: "btn btn-sm btn-outline-primary" },
            disabled: (__VLS_ctx.loading || !__VLS_ctx.canInitializeLookup),
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    /** @type {[typeof AddableFindingsDetail, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(AddableFindingsDetail, new AddableFindingsDetail({
        ...{ 'onFindingAdded': {} },
        ...{ 'onFindingError': {} },
        examinationId: (__VLS_ctx.flow.selectedExaminationId || undefined),
        patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
    }));
    const __VLS_4 = __VLS_3({
        ...{ 'onFindingAdded': {} },
        ...{ 'onFindingError': {} },
        examinationId: (__VLS_ctx.flow.selectedExaminationId || undefined),
        patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
    let __VLS_6;
    let __VLS_7;
    let __VLS_8;
    const __VLS_9 = {
        onFindingAdded: (__VLS_ctx.onFindingAddedToExamination)
    };
    const __VLS_10 = {
        onFindingError: (__VLS_ctx.onFindingError)
    };
    var __VLS_5;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header d-flex justify-content-between align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.availableFindings.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
        ...{ style: {} },
    });
    if (__VLS_ctx.findingStore.loading || __VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted small" },
        });
    }
    else if (__VLS_ctx.availableFindings.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-column gap-3" },
        });
        for (const [findingId] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
            /** @type {[typeof FindingsDetail, ]} */ ;
            // @ts-ignore
            const __VLS_11 = __VLS_asFunctionalComponent(FindingsDetail, new FindingsDetail({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                ...{ 'onErrorOccurred': {} },
                key: (findingId),
                findingId: (findingId),
                patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
            }));
            const __VLS_12 = __VLS_11({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                ...{ 'onErrorOccurred': {} },
                key: (findingId),
                findingId: (findingId),
                patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_11));
            let __VLS_14;
            let __VLS_15;
            let __VLS_16;
            const __VLS_17 = {
                onAddedToExamination: (__VLS_ctx.onFindingAddedToExamination)
            };
            const __VLS_18 = {
                onClassificationUpdated: (__VLS_ctx.onClassificationUpdated)
            };
            const __VLS_19 = {
                onErrorOccurred: (__VLS_ctx.onFindingDetailError)
            };
            var __VLS_13;
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 p-3 bg-light rounded small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.flow.lastFindingsEvent ? __VLS_ctx.formatFindingsEvent(__VLS_ctx.flow.lastFindingsEvent) : 'keins');
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
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AddableFindingsDetail: AddableFindingsDetail,
            FindingsDetail: FindingsDetail,
            LookupStatusPanel: LookupStatusPanel,
            flow: flow,
            findingStore: findingStore,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            availableFindings: availableFindings,
            canInitializeLookup: canInitializeLookup,
            fetchLookupAll: fetchLookupAll,
            triggerRecompute: triggerRecompute,
            ensureLookupSession: ensureLookupSession,
            isFindingAddedToExamination: isFindingAddedToExamination,
            onFindingAddedToExamination: onFindingAddedToExamination,
            onClassificationUpdated: onClassificationUpdated,
            onFindingError: onFindingError,
            onFindingDetailError: onFindingDetailError,
            formatFindingsEvent: formatFindingsEvent,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
