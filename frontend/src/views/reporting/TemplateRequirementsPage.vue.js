import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue';
import LookupActionsBar from '@/components/Reporting/LookupActionsBar.vue';
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
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
    if (!examinationStore.exams.length) {
        await examinationStore.fetchExaminations();
    }
    if (selectedExaminationName.value) {
        await refreshTemplatesForExamination();
    }
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
        (__VLS_ctx.selectedTemplate.validators.examinationValidators.length);
        (__VLS_ctx.selectedTemplate.validators.findingsValidators.length);
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
        requirementSetStatus: (__VLS_ctx.lookup?.requirementSetStatus || {}),
    }));
    const __VLS_13 = __VLS_12({
        ...{ 'onToggle': {} },
        items: (__VLS_ctx.requirementSets),
        selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        loading: (__VLS_ctx.loading),
        requirementSetStatus: (__VLS_ctx.lookup?.requirementSetStatus || {}),
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
            lookup: lookup,
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
            prettySuggestedActions: prettySuggestedActions,
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
