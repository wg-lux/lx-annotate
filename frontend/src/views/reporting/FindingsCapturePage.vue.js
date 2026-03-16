import { computed, onMounted, ref, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { getFindingDisplayName } from '@/api/findings.contract';
import { validatePatientFindingsAgainstTemplate } from '@/api/reportTemplatesApi';
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue';
import RequirementSetSelectionList from '@/components/Reporting/RequirementSetSelectionList.vue';
import AddableFindingsDetail from '@/components/RequirementReport/AddableFindingsDetail.vue';
import FindingsDetail from '@/components/RequirementReport/FindingsDetail.vue';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue';
import ReportTemplateValidationPanel from '@/components/Reporting/ReportTemplateValidationPanel.vue';
import ReportingMediaPreviewCards from '@/components/Reporting/ReportingMediaPreviewCards.vue';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { endpoints } from '@/types/api/endpoints';
const flow = useReportingFlowStore();
const examinationStore = useExaminationStore();
const patientExaminationStore = usePatientExaminationStore();
const { loading: findingSelectorsLoading, ensureCatalogLoaded, ensurePatientFindingsLoaded, getFindingById, isFindingAttached } = useFindingSelectors();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const lookupState = ref(null);
const lookupInitInFlight = ref(null);
const templateValidationLoading = ref(false);
const templateValidationError = ref(null);
const templateStatusMessage = ref(null);
const { moduleName: selectedKbModule, selectedTemplateName, templateOptions, selectedTemplate, sectionBlocks, loading: templateLoading, errorMessage: templateErrorMessage, fetchTemplatesByExamination, selectTemplateByName, setModuleName } = useReportTemplates({
    initialModuleName: flow.selectedKbModule,
    initialTemplateName: flow.selectedTemplateName
});
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
    if ('requirementSets' in partial) {
        normalized.requirementSets = normalizeRequirementSets(partial.requirementSets);
    }
    return normalized;
}
const availableFindings = computed(() => normalizeIdArray(lookupState.value?.availableFindings));
const requirementSets = computed(() => normalizeRequirementSets(lookupState.value?.requirementSets));
const selectedRequirementSetIds = computed(() => normalizeIdArray(flow.selectedRequirementSetIds));
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const lookupRequirementSetStatus = computed(() => normalizeBooleanRecord(lookupState.value?.requirementSetStatus));
const hasSuggestedActions = computed(() => Object.keys(normalizeSuggestedActions(lookupState.value?.suggestedActions)).length > 0);
const prettySuggestedActions = computed(() => JSON.stringify(normalizeSuggestedActions(lookupState.value?.suggestedActions), null, 2));
const canInitializeLookup = computed(() => !!flow.patientExaminationId);
const selectedExamination = computed(() => examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) || null);
const selectedExaminationName = computed(() => selectedExamination.value?.name || null);
const selectedExaminationDisplayName = computed(() => selectedExamination.value?.displayName || selectedExaminationName.value || null);
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
        selectedRequirementSetIds: normalizedPartial.selectedRequirementSetIds,
        requirementSets: normalizedPartial.requirementSets
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
        const patchResult = await lookupActions.patchLookupParts({ selectedRequirementSetIds: ids }, { fallbackErrorMessage: 'Fehler beim Speichern der Dokumentationsregeln.' });
        if (!patchResult.ok)
            return;
        flow.setSelectedRequirementSetIds(ids);
        if (lookupState.value) {
            lookupState.value = { ...lookupState.value, selectedRequirementSetIds: ids };
        }
        successMessage.value = 'Dokumentationsregeln gespeichert.';
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Speichern der Dokumentationsregeln.';
    }
}
async function loadFindingsCatalog() {
    await ensureCatalogLoaded();
}
async function refreshRuntimeValidation() {
    const patientExaminationId = flow.patientExaminationId;
    const templateName = flow.selectedTemplateName;
    if (!patientExaminationId || !templateName) {
        templateValidationError.value = null;
        flow.setLastTemplateValidation(null);
        return;
    }
    templateValidationLoading.value = true;
    templateValidationError.value = null;
    try {
        await loadFindingsCatalog();
        const result = await validatePatientFindingsAgainstTemplate({
            moduleName: flow.selectedKbModule,
            templateName,
            patientExaminationId,
            getFindingById
        });
        flow.setLastTemplateValidation(result);
    }
    catch (e) {
        flow.setLastTemplateValidation(null);
        templateValidationError.value = formatApiError(e, 'Template-Validierung konnte nicht ausgeführt werden.');
    }
    finally {
        templateValidationLoading.value = false;
    }
}
async function fetchLookupAll() {
    const ensured = await ensureLookupSessionForCurrentPatientExamination();
    if (!ensured)
        return;
    await lookupActions.fetchLookupAll({
        fallbackErrorMessage: 'Fehler beim Laden des Fallstands.'
    });
}
async function triggerRecompute() {
    const ensured = await ensureLookupSessionForCurrentPatientExamination();
    if (!ensured)
        return;
    const result = await lookupActions.recomputeLookup({
        applyUpdates: true,
        refreshAfter: true,
        fallbackErrorMessage: 'Fehler bei der Wissensbasis-Prüfung.'
    });
    if (result.ok) {
        successMessage.value = 'Die Wissensbasis wurde nach den Befundänderungen neu geprüft.';
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
                throw new Error('Initialisierung lieferte keinen Fallstand.');
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
            errorMessage.value = formatApiError(e, 'Der Fallkontext konnte nicht initialisiert werden.');
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
    return isFindingAttached(flow.patientExaminationId, findingId);
}
function onFindingAddedToExamination(findingIdOrData, findingName) {
    const findingId = typeof findingIdOrData === 'number' ? findingIdOrData : findingIdOrData.findingId;
    const name = (typeof findingIdOrData === 'number' ? findingName : findingIdOrData.findingName) ??
        getFindingDisplayName(getFindingById(findingId) ?? { id: findingId, name: `Befund ${findingId}` });
    flow.noteFindingAdded(findingId);
    successMessage.value = `Befund "${name}" wurde hinzugefügt.`;
    // Refresh lookup advisory state after changes
    void ensurePatientFindingsLoaded(flow.patientExaminationId).then(() => refreshRuntimeValidation());
    void triggerRecompute();
}
function onClassificationUpdated(findingId, classificationId, choiceId) {
    flow.noteClassificationUpdated(findingId, classificationId, choiceId);
    successMessage.value = `Klassifikation für Befund ${findingId} aktualisiert.`;
    void ensurePatientFindingsLoaded(flow.patientExaminationId).then(() => refreshRuntimeValidation());
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
    if (!examinationStore.exams.length) {
        await examinationStore.fetchExaminations();
    }
    if (flow.patientExaminationId) {
        patientExaminationStore.setCurrentPatientExaminationId(flow.patientExaminationId);
        await ensurePatientFindingsLoaded(flow.patientExaminationId);
    }
    await loadFindingsCatalog();
    if (selectedExaminationName.value) {
        await refreshTemplatesForExamination();
    }
    if (flow.patientExaminationId) {
        await fetchLookupAll();
    }
    await refreshRuntimeValidation();
});
watch(() => [flow.patientExaminationId, flow.selectedKbModule, flow.selectedTemplateName], async () => {
    await refreshRuntimeValidation();
});
watch(selectedExaminationName, async (newName, oldName) => {
    if (!newName || newName === oldName)
        return;
    await refreshTemplatesForExamination();
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
    title: "Template & Dokumentationsregeln",
    subtitle: "Template wählen, Regelsätze aktivieren und die Wissensbasis für diesen Fall vorbereiten",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
}));
const __VLS_1 = __VLS_0({
    title: "Template & Dokumentationsregeln",
    subtitle: "Template wählen, Regelsätze aktivieren und die Wissensbasis für diesen Fall vorbereiten",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
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
        disabled: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
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
        disabled: (__VLS_ctx.loading || __VLS_ctx.templateLoading || !__VLS_ctx.templateOptions.length),
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
        disabled: (__VLS_ctx.loading || __VLS_ctx.templateLoading || !__VLS_ctx.selectedExaminationName),
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
    if (__VLS_ctx.templateErrorMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-danger py-2 mb-2" },
        });
        (__VLS_ctx.templateErrorMessage);
    }
    if (__VLS_ctx.templateStatusMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-success py-2 mb-2" },
        });
        (__VLS_ctx.templateStatusMessage);
    }
    if (__VLS_ctx.selectedTemplate) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted mb-3" },
        });
        (__VLS_ctx.sectionBlocks.length);
        (__VLS_ctx.selectedTemplateValidatorCounts.examination);
        (__VLS_ctx.selectedTemplateValidatorCounts.findings);
    }
    if (__VLS_ctx.flow.lookupToken) {
        /** @type {[typeof RequirementSetSelectionList, ]} */ ;
        // @ts-ignore
        const __VLS_3 = __VLS_asFunctionalComponent(RequirementSetSelectionList, new RequirementSetSelectionList({
            ...{ 'onToggle': {} },
            items: (__VLS_ctx.requirementSets),
            selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
            loading: (__VLS_ctx.loading),
            requirementSetStatus: (__VLS_ctx.lookupRequirementSetStatus),
        }));
        const __VLS_4 = __VLS_3({
            ...{ 'onToggle': {} },
            items: (__VLS_ctx.requirementSets),
            selectedIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
            loading: (__VLS_ctx.loading),
            requirementSetStatus: (__VLS_ctx.lookupRequirementSetStatus),
        }, ...__VLS_functionalComponentArgsRest(__VLS_3));
        let __VLS_6;
        let __VLS_7;
        let __VLS_8;
        const __VLS_9 = {
            onToggle: (__VLS_ctx.toggleRequirementSet)
        };
        var __VLS_5;
    }
    if (!__VLS_ctx.flow.lookupToken) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mb-0" },
        });
    }
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
const __VLS_10 = __VLS_asFunctionalComponent(LookupStatusPanel, new LookupStatusPanel({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    selectedExaminationId: (__VLS_ctx.flow.selectedExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
    findingsRevision: (__VLS_ctx.flow.findingsRevision),
}));
const __VLS_11 = __VLS_10({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    selectedExaminationId: (__VLS_ctx.flow.selectedExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
    findingsRevision: (__VLS_ctx.flow.findingsRevision),
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
/** @type {[typeof ReportingMediaPreviewCards, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(ReportingMediaPreviewCards, new ReportingMediaPreviewCards({
    ...{ class: "mb-3" },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "mb-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
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
    const __VLS_16 = __VLS_asFunctionalComponent(AddableFindingsDetail, new AddableFindingsDetail({
        ...{ 'onFindingAdded': {} },
        ...{ 'onFindingError': {} },
        examinationId: (__VLS_ctx.flow.selectedExaminationId || undefined),
        patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
    }));
    const __VLS_17 = __VLS_16({
        ...{ 'onFindingAdded': {} },
        ...{ 'onFindingError': {} },
        examinationId: (__VLS_ctx.flow.selectedExaminationId || undefined),
        patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    let __VLS_19;
    let __VLS_20;
    let __VLS_21;
    const __VLS_22 = {
        onFindingAdded: (__VLS_ctx.onFindingAddedToExamination)
    };
    const __VLS_23 = {
        onFindingError: (__VLS_ctx.onFindingError)
    };
    var __VLS_18;
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
    if (__VLS_ctx.findingSelectorsLoading || __VLS_ctx.loading) {
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
            const __VLS_24 = __VLS_asFunctionalComponent(FindingsDetail, new FindingsDetail({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                ...{ 'onErrorOccurred': {} },
                key: (findingId),
                findingId: (findingId),
                patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
            }));
            const __VLS_25 = __VLS_24({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                ...{ 'onErrorOccurred': {} },
                key: (findingId),
                findingId: (findingId),
                patientExaminationId: (__VLS_ctx.flow.patientExaminationId || undefined),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_24));
            let __VLS_27;
            let __VLS_28;
            let __VLS_29;
            const __VLS_30 = {
                onAddedToExamination: (__VLS_ctx.onFindingAddedToExamination)
            };
            const __VLS_31 = {
                onClassificationUpdated: (__VLS_ctx.onClassificationUpdated)
            };
            const __VLS_32 = {
                onErrorOccurred: (__VLS_ctx.onFindingDetailError)
            };
            var __VLS_26;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    /** @type {[typeof ReportTemplateValidationPanel, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(ReportTemplateValidationPanel, new ReportTemplateValidationPanel({
        loading: (__VLS_ctx.templateValidationLoading),
        errorMessage: (__VLS_ctx.templateValidationError),
        result: (__VLS_ctx.flow.lastTemplateValidation),
    }));
    const __VLS_34 = __VLS_33({
        loading: (__VLS_ctx.templateValidationLoading),
        errorMessage: (__VLS_ctx.templateValidationError),
        result: (__VLS_ctx.flow.lastTemplateValidation),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
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
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
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
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MedicalBlock: MedicalBlock,
            RequirementSetSelectionList: RequirementSetSelectionList,
            AddableFindingsDetail: AddableFindingsDetail,
            FindingsDetail: FindingsDetail,
            LookupStatusPanel: LookupStatusPanel,
            ReportTemplateValidationPanel: ReportTemplateValidationPanel,
            ReportingMediaPreviewCards: ReportingMediaPreviewCards,
            flow: flow,
            findingSelectorsLoading: findingSelectorsLoading,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            templateValidationLoading: templateValidationLoading,
            templateValidationError: templateValidationError,
            templateStatusMessage: templateStatusMessage,
            selectedKbModule: selectedKbModule,
            selectedTemplateName: selectedTemplateName,
            templateOptions: templateOptions,
            selectedTemplate: selectedTemplate,
            sectionBlocks: sectionBlocks,
            templateLoading: templateLoading,
            templateErrorMessage: templateErrorMessage,
            availableFindings: availableFindings,
            requirementSets: requirementSets,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            lookupRequirementSetStatus: lookupRequirementSetStatus,
            hasSuggestedActions: hasSuggestedActions,
            prettySuggestedActions: prettySuggestedActions,
            canInitializeLookup: canInitializeLookup,
            selectedExaminationName: selectedExaminationName,
            selectedExaminationDisplayName: selectedExaminationDisplayName,
            selectedTemplateValidatorCounts: selectedTemplateValidatorCounts,
            refreshTemplatesForExamination: refreshTemplatesForExamination,
            onModuleChange: onModuleChange,
            onTemplateSelectionChange: onTemplateSelectionChange,
            toggleRequirementSet: toggleRequirementSet,
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
