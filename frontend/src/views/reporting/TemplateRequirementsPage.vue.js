import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue';
import LookupActionsBar from '@/components/Reporting/LookupActionsBar.vue';
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
const route = useRoute();
const flow = useReportingFlowStore();
const examinationStore = useExaminationStore();
const lookup = ref(null);
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const { moduleName: selectedKbModule, selectedTemplateName, templateOptions, selectedTemplate, sectionBlocks, loading: templateLoading, errorMessage: templateErrorMessage, fetchTemplatesByExamination, selectTemplateByName, setModuleName } = useReportTemplates({
    initialModuleName: flow.selectedKbModule,
    initialTemplateName: flow.selectedTemplateName
});
const selectedExamination = computed(() => examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) || null);
const selectedExaminationName = computed(() => selectedExamination.value?.name || null);
const selectedExaminationDisplayName = computed(() => selectedExamination.value?.displayName || selectedExaminationName.value || null);
const templateStatusMessage = ref(null);
function normalizeIdArray(value) {
    if (!Array.isArray(value))
        return [];
    const ids = value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry))
        .map((entry) => Math.trunc(entry));
    return Array.from(new Set(ids));
}
function normalizeRequirementSets(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => {
        if (!entry || typeof entry !== 'object')
            return null;
        const id = Number(entry.id);
        if (!Number.isFinite(id))
            return null;
        return {
            id,
            name: String(entry.name || ''),
            type: String(entry.type || '')
        };
    })
        .filter((entry) => !!entry);
}
function normalizeRequirementsBySet(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
        const requirements = Array.isArray(entry)
            ? entry
                .map((item) => {
                if (!item || typeof item !== 'object')
                    return null;
                const id = Number(item.id);
                if (!Number.isFinite(id))
                    return null;
                return {
                    id,
                    name: String(item.name || '')
                };
            })
                .filter((item) => !!item)
            : [];
        return [String(key), requirements];
    }));
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
function normalizeLookupPartial(partial) {
    const normalized = { ...partial };
    if ('requirementSets' in partial) {
        normalized.requirementSets = normalizeRequirementSets(partial.requirementSets);
    }
    if ('requirementsBySet' in partial) {
        normalized.requirementsBySet = normalizeRequirementsBySet(partial.requirementsBySet);
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
    if ('selectedRequirementSetIds' in partial) {
        normalized.selectedRequirementSetIds = normalizeIdArray(partial.selectedRequirementSetIds);
    }
    return normalized;
}
const requirementSets = computed(() => normalizeRequirementSets(lookup.value?.requirementSets));
const selectedRequirementSetIds = computed(() => normalizeIdArray(flow.selectedRequirementSetIds));
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const selectedRequirementSetIdsDisplay = computed(() => selectedRequirementSetIds.value.length ? selectedRequirementSetIds.value.join(', ') : 'keine');
const lookupRequirementSetStatus = computed(() => normalizeBooleanRecord(lookup.value?.requirementSetStatus));
const hasSuggestedActions = computed(() => Object.keys(normalizeSuggestedActions(lookup.value?.suggestedActions)).length > 0);
const prettySuggestedActions = computed(() => JSON.stringify(normalizeSuggestedActions(lookup.value?.suggestedActions), null, 2));
const selectedTemplateValidatorCounts = computed(() => {
    const validators = selectedTemplate.value?.validators;
    return {
        examination: Array.isArray(validators?.examinationValidators)
            ? validators.examinationValidators.length
            : 0,
        findings: Array.isArray(validators?.findingsValidators)
            ? validators.findingsValidators.length
            : 0
    };
});
const routePatientExaminationId = computed(() => {
    const raw = Number(route.params.patient_examination_id);
    return Number.isFinite(raw) ? raw : null;
});
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function applyLookup(partial) {
    const normalizedPartial = normalizeLookupPartial(partial);
    if (!lookup.value) {
        lookup.value = normalizedPartial;
    }
    else {
        lookup.value = { ...lookup.value, ...normalizedPartial };
    }
    if (Array.isArray(normalizedPartial.selectedRequirementSetIds)) {
        flow.setSelectedRequirementSetIds(normalizedPartial.selectedRequirementSetIds);
    }
}
function extractPatientId(payload) {
    const patientId = Number(payload?.patientData?.id ?? payload?.patient_data?.id);
    return Number.isFinite(patientId) ? patientId : null;
}
function extractExaminationName(payload) {
    if (typeof payload?.examination === 'string' && payload.examination.trim()) {
        return payload.examination.trim();
    }
    if (payload?.examination &&
        typeof payload.examination === 'object' &&
        typeof payload.examination.name === 'string' &&
        payload.examination.name.trim()) {
        return payload.examination.name.trim();
    }
    if (typeof payload?.examinationName === 'string' && payload.examinationName.trim()) {
        return payload.examinationName.trim();
    }
    if (typeof payload?.examination_name === 'string' && payload.examination_name.trim()) {
        return payload.examination_name.trim();
    }
    return null;
}
function resolveExaminationIdByName(name) {
    const normalized = name.trim().toLowerCase();
    const match = examinationStore.examinationsDropdown.find((item) => String(item.name || '').trim().toLowerCase() === normalized);
    return match?.id ?? null;
}
function applyRoutePatientExaminationContext(routeId) {
    if (flow.patientExaminationId !== routeId) {
        flow.setLookupSession({
            patientExaminationId: routeId,
            lookupToken: null,
            status: 'idle'
        });
        flow.setSelectedRequirementSetIds([]);
        flow.setActiveReportId(null);
    }
}
async function hydrateCaseSelectionFromPatientExamination(routeId) {
    const res = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(routeId)));
    const payload = res.data;
    const patientId = extractPatientId(payload);
    if (patientId != null) {
        flow.setCaseSelection({ selectedPatientId: patientId });
    }
    const examinationName = extractExaminationName(payload);
    if (examinationName) {
        const examinationId = resolveExaminationIdByName(examinationName);
        if (examinationId != null) {
            flow.setCaseSelection({ selectedExaminationId: examinationId });
        }
    }
}
async function ensureLookupSession(routeId) {
    if (flow.lookupToken) {
        flow.setLookupSession({
            patientExaminationId: routeId,
            lookupToken: flow.lookupToken,
            status: 'active'
        });
        return;
    }
    const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
        patientExaminationId: routeId
    });
    const token = String(initRes.data?.token || '');
    if (!token) {
        throw new Error('Lookup-Init lieferte kein Token.');
    }
    flow.setLookupSession({
        patientExaminationId: routeId,
        lookupToken: token,
        status: 'active'
    });
}
async function initializeFromRouteContext() {
    const routeId = routePatientExaminationId.value;
    if (!routeId)
        return;
    applyRoutePatientExaminationContext(routeId);
    await hydrateCaseSelectionFromPatientExamination(routeId);
    await ensureLookupSession(routeId);
    const lookupResult = await lookupActions.fetchLookupAll();
    if (!lookupResult.ok && lookupResult.expired) {
        flow.setLookupSession({
            patientExaminationId: routeId,
            lookupToken: null,
            status: 'expired'
        });
        await ensureLookupSession(routeId);
        await lookupActions.fetchLookupAll();
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
watch([selectedKbModule, selectedTemplateName], ([moduleName, templateName]) => {
    flow.setTemplateSelection({
        moduleName,
        templateName
    });
});
async function refreshTemplatesForExamination() {
    templateStatusMessage.value = null;
    const examName = selectedExaminationName.value;
    if (!examName)
        return;
    const templates = await fetchTemplatesByExamination(examName);
    if (templates.length) {
        templateStatusMessage.value = `${templates.length} Template(s) für "${examName}" geladen.`;
    }
    else {
        templateStatusMessage.value = `Keine Templates für "${examName}" gefunden.`;
    }
}
function onModuleChange(next) {
    setModuleName(next.trim() || 'report_template_examples');
    void refreshTemplatesForExamination();
}
function onTemplateSelectionChange(name) {
    void selectTemplateByName(name || null);
}
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
    const next = new Set(selectedRequirementSetIds.value);
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
    if (!examinationStore.exams.length) {
        await examinationStore.fetchExaminations();
    }
    await initializeFromRouteContext();
    if (selectedExaminationName.value) {
        await refreshTemplatesForExamination();
    }
    if (flow.patientExaminationId &&
        Number(route.params.patient_examination_id) !== flow.patientExaminationId) {
        errorMessage.value =
            'Warnung: Route-Parameter und gespeicherte Patientenuntersuchung stimmen nicht überein.';
    }
    if (flow.lookupToken && !lookup.value) {
        await fetchLookupAll();
    }
});
watch(routePatientExaminationId, async (newId, oldId) => {
    if (!newId || newId === oldId)
        return;
    await initializeFromRouteContext();
    if (selectedExaminationName.value) {
        await refreshTemplatesForExamination();
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column gap-3" },
});
/** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
    title: "Template-Auswahl",
    subtitle: "Report-Templates nach Untersuchung laden und für den Editor vorbereiten",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.templateLoading),
}));
const __VLS_1 = __VLS_0({
    title: "Template-Auswahl",
    subtitle: "Report-Templates nach Untersuchung laden und für den Editor vorbereiten",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.templateLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_2.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_2.slots;
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
        ...{ onChange: (...[$event]) => {
                __VLS_ctx.onModuleChange($event.target.value);
            } },
        ...{ class: "form-control" },
        value: (__VLS_ctx.selectedKbModule),
        disabled: (__VLS_ctx.templateLoading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        value: (__VLS_ctx.selectedExaminationDisplayName || ''),
        readonly: true,
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                __VLS_ctx.onTemplateSelectionChange($event.target.value);
            } },
        ...{ class: "form-select" },
        value: (__VLS_ctx.selectedTemplateName || ''),
        disabled: (__VLS_ctx.templateLoading || !__VLS_ctx.templateOptions.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
        disabled: true,
    });
    (__VLS_ctx.templateLoading ? 'Templates laden...' : 'Template wählen');
    for (const [template] of __VLS_getVForSourceType((__VLS_ctx.templateOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (template.name),
            value: (template.name),
        });
        (template.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshTemplatesForExamination) },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.templateLoading || !__VLS_ctx.selectedExaminationName),
    });
    if (__VLS_ctx.templateErrorMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-danger py-2 mb-2" },
        });
        (__VLS_ctx.templateErrorMessage);
    }
    if (__VLS_ctx.templateStatusMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-success py-2 mb-0" },
        });
        (__VLS_ctx.templateStatusMessage);
    }
    if (__VLS_ctx.selectedTemplate) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted mb-2" },
        });
        (__VLS_ctx.sectionBlocks.length);
        (__VLS_ctx.selectedTemplateValidatorCounts.examination);
        (__VLS_ctx.selectedTemplateValidatorCounts.findings);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "list-group list-group-flush" },
        });
        for (const [section] of __VLS_getVForSourceType((__VLS_ctx.sectionBlocks))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (section.name),
                ...{ class: "list-group-item px-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "fw-semibold" },
            });
            (section.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
            (section.findings.length);
            (section.requiredFindingsCount);
            (section.requiredClassificationsCount);
        }
    }
}
var __VLS_2;
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
const __VLS_3 = __VLS_asFunctionalComponent(LookupActionsBar, new LookupActionsBar({
    ...{ 'onRefresh': {} },
    ...{ 'onLoadParts': {} },
    ...{ 'onRecompute': {} },
    loading: (__VLS_ctx.loading),
    hasLookupToken: (!!__VLS_ctx.flow.lookupToken),
    showParts: (true),
}));
const __VLS_4 = __VLS_3({
    ...{ 'onRefresh': {} },
    ...{ 'onLoadParts': {} },
    ...{ 'onRecompute': {} },
    loading: (__VLS_ctx.loading),
    hasLookupToken: (!!__VLS_ctx.flow.lookupToken),
    showParts: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_3));
let __VLS_6;
let __VLS_7;
let __VLS_8;
const __VLS_9 = {
    onRefresh: (__VLS_ctx.fetchLookupAll)
};
const __VLS_10 = {
    onLoadParts: (...[$event]) => {
        __VLS_ctx.fetchLookupParts(['requirementSets', 'selectedRequirementSetIds', 'requirementSetStatus', 'suggestedActions']);
    }
};
const __VLS_11 = {
    onRecompute: (__VLS_ctx.triggerRecompute)
};
var __VLS_5;
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
    const __VLS_12 = __VLS_asFunctionalComponent(RequirementSetSelectionList, new RequirementSetSelectionList({
        ...{ 'onToggle': {} },
        items: (__VLS_ctx.requirementSets),
        selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        loading: (__VLS_ctx.loading),
        requirementSetStatus: (__VLS_ctx.lookupRequirementSetStatus),
    }));
    const __VLS_13 = __VLS_12({
        ...{ 'onToggle': {} },
        items: (__VLS_ctx.requirementSets),
        selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        loading: (__VLS_ctx.loading),
        requirementSetStatus: (__VLS_ctx.lookupRequirementSetStatus),
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    let __VLS_15;
    let __VLS_16;
    let __VLS_17;
    const __VLS_18 = {
        onToggle: (__VLS_ctx.toggleRequirementSet)
    };
    var __VLS_14;
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
    (__VLS_ctx.selectedRequirementSetIdsDisplay);
    if (__VLS_ctx.hasSuggestedActions) {
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
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-flush']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
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
            MedicalBlock: MedicalBlock,
            LookupActionsBar: LookupActionsBar,
            RequirementSetSelectionList: RequirementSetSelectionList,
            route: route,
            flow: flow,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            selectedKbModule: selectedKbModule,
            selectedTemplateName: selectedTemplateName,
            templateOptions: templateOptions,
            selectedTemplate: selectedTemplate,
            sectionBlocks: sectionBlocks,
            templateLoading: templateLoading,
            templateErrorMessage: templateErrorMessage,
            selectedExaminationName: selectedExaminationName,
            selectedExaminationDisplayName: selectedExaminationDisplayName,
            templateStatusMessage: templateStatusMessage,
            requirementSets: requirementSets,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            selectedRequirementSetIdsDisplay: selectedRequirementSetIdsDisplay,
            lookupRequirementSetStatus: lookupRequirementSetStatus,
            hasSuggestedActions: hasSuggestedActions,
            prettySuggestedActions: prettySuggestedActions,
            selectedTemplateValidatorCounts: selectedTemplateValidatorCounts,
            refreshTemplatesForExamination: refreshTemplatesForExamination,
            onModuleChange: onModuleChange,
            onTemplateSelectionChange: onTemplateSelectionChange,
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
