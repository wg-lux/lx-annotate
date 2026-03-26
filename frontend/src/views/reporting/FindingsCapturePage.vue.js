import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getClassificationDisplayName, getFindingDisplayName, mergeFindingClassifications } from '@/api/findings.contract';
import { validatePatientFindingsAgainstTemplate } from '@/api/reportTemplatesApi';
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue';
import ReportTemplateValidationPanel from '@/components/Reporting/ReportTemplateValidationPanel.vue';
import ReportingMediaPreviewCards from '@/components/Reporting/ReportingMediaPreviewCards.vue';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
const flow = useReportingFlowStore();
const examinationStore = useExaminationStore();
const { catalogFindings, loading: findingSelectorsLoading, ensureCatalogLoaded, getFindingById } = useFindingSelectors();
const errorMessage = ref(null);
const successMessage = ref(null);
const templateValidationLoading = ref(false);
const templateValidationError = ref(null);
const templateStatusMessage = ref(null);
const touchedFields = ref({});
const showValidationFeedback = ref(false);
const dirtySinceMount = ref(false);
let validationTimer = null;
const { moduleName: selectedKbModule, selectedTemplateName, templateOptions, selectedTemplate, sectionBlocks, loading: templateLoading, errorMessage: templateErrorMessage, fetchTemplatesByExamination, selectTemplateByName, setModuleName } = useReportTemplates({
    initialModuleName: flow.selectedKbModule,
    initialTemplateName: flow.selectedTemplateName
});
const currentRuntimeDraft = computed(() => flow.currentRuntimeDraft);
const currentPayload = computed(() => currentRuntimeDraft.value?.payload || null);
const canValidateDraft = computed(() => !!selectedTemplateName.value && !!currentPayload.value);
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
const catalogFindingsByNormalizedName = computed(() => {
    const entries = catalogFindings.value.map((finding) => [normalizeKey(finding.name), finding]);
    return new Map(entries);
});
const backendMissingClassificationsByFinding = computed(() => {
    const entries = (flow.lastTemplateValidation?.findingsValidators || []).flatMap((validator) => {
        if (!validator.missingRequiredClassifications.length)
            return [];
        return [[normalizeKey(validator.finding), validator.missingRequiredClassifications]];
    });
    return Object.fromEntries(entries);
});
const backendMessagesByFinding = computed(() => {
    const entries = (flow.lastTemplateValidation?.findingsValidators || []).map((validator) => [
        normalizeKey(validator.finding),
        validator.issues.map((issue) => issue.message)
    ]);
    return Object.fromEntries(entries);
});
function normalizeKey(value) {
    return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function formatApiError(e, fallback) {
    return e?.response?.data?.detail || e?.response?.data?.error || e?.message || fallback;
}
function formatFindingsEvent(event) {
    const time = new Date(event.at).toLocaleTimeString('de-DE');
    if (event.type === 'finding_added') {
        return `${time}: Befund ${event.findingId} hinzugefügt`;
    }
    return `${time}: Klassifikation ${event.classificationId} für Befund ${event.findingId} aktualisiert`;
}
function fieldKey(findingLocalId, classificationName) {
    return `${findingLocalId}:${normalizeKey(classificationName)}`;
}
function markFieldTouched(findingLocalId, classificationName) {
    touchedFields.value = {
        ...touchedFields.value,
        [fieldKey(findingLocalId, classificationName)]: true
    };
}
function resetTouchedState() {
    touchedFields.value = {};
    showValidationFeedback.value = false;
    dirtySinceMount.value = false;
}
function getFindingDefinitionByName(findingName) {
    return catalogFindingsByNormalizedName.value.get(normalizeKey(findingName)) || null;
}
function getFindingLabel(findingName) {
    return getFindingDisplayName(getFindingDefinitionByName(findingName) ?? { id: 0, name: findingName });
}
function allDefinitionClassificationsForFinding(findingName) {
    const finding = getFindingDefinitionByName(findingName);
    return mergeFindingClassifications(finding);
}
function visibleClassificationsForFinding(findingName) {
    const definitions = allDefinitionClassificationsForFinding(findingName);
    const extraRequired = backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || [];
    const byKey = new Map();
    for (const classification of definitions) {
        byKey.set(normalizeKey(classification.name), classification);
    }
    for (const missing of extraRequired) {
        const existing = byKey.get(normalizeKey(missing));
        if (existing)
            continue;
        byKey.set(normalizeKey(missing), {
            id: 0,
            name: missing,
            displayName: missing,
            required: true,
            classificationTypes: [],
            choices: []
        });
    }
    return Array.from(byKey.values());
}
function instancesForFinding(findingName) {
    const key = normalizeKey(findingName);
    return (currentPayload.value?.patientFindings || []).filter((finding) => normalizeKey(finding.finding) === key);
}
function canAddFinding(templateFinding) {
    if (!currentPayload.value)
        return false;
    if (templateFinding.multipleAllowed)
        return true;
    return instancesForFinding(templateFinding.finding).length === 0;
}
function isClassificationRequired(findingName, classificationName) {
    const fromTemplate = sectionBlocks.value
        .flatMap((section) => section.findings)
        .find((finding) => normalizeKey(finding.finding) === normalizeKey(findingName))
        ?.classifications.find((classification) => normalizeKey(classification.classification) === normalizeKey(classificationName))?.required || false;
    const fromValidation = (backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []).some((classification) => normalizeKey(classification) === normalizeKey(classificationName));
    return fromTemplate || fromValidation;
}
function classificationChoiceState(instance, classificationName) {
    return (instance.classificationChoices.find((choice) => normalizeKey(choice.classification) === normalizeKey(classificationName)) || null);
}
function classificationChoiceName(instance, classificationName) {
    return classificationChoiceState(instance, classificationName)?.classificationChoice || '';
}
function selectedChoiceDefinition(findingName, classificationName, instance) {
    const classification = visibleClassificationsForFinding(findingName).find((entry) => normalizeKey(entry.name) === normalizeKey(classificationName));
    const choiceName = classificationChoiceName(instance, classificationName);
    if (!classification || !choiceName)
        return null;
    return (classification.choices.find((choice) => normalizeKey(choice.name) === normalizeKey(choiceName)) || null);
}
function descriptorKeysForField(findingName, classificationName, instance) {
    const selectedChoice = selectedChoiceDefinition(findingName, classificationName, instance);
    const descriptorKeys = Object.keys(selectedChoice?.numericalDescriptors || {});
    if (descriptorKeys.length)
        return descriptorKeys;
    const existingChoice = classificationChoiceState(instance, classificationName);
    if (existingChoice?.descriptors.length) {
        return existingChoice.descriptors.map((descriptor) => descriptor.classificationChoiceDescriptor);
    }
    const normalizedClassification = normalizeKey(classificationName);
    if (normalizedClassification.includes('mm') ||
        normalizedClassification.includes('size') ||
        normalizedClassification.includes('length') ||
        normalizedClassification.includes('distance')) {
        return [`${normalizedClassification}_descriptor`];
    }
    return [];
}
function descriptorValue(instance, classificationName, descriptorKey) {
    const descriptor = classificationChoiceState(instance, classificationName)?.descriptors.find((entry) => entry.classificationChoiceDescriptor === descriptorKey) || null;
    return descriptor?.descriptorValue == null ? '' : String(descriptor.descriptorValue);
}
function descriptorLabel(descriptorKey) {
    return descriptorKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
function descriptorInputType(descriptorKey) {
    return /(mm|cm|length|size|distance|count|number)/i.test(descriptorKey) ? 'number' : 'text';
}
function buildDescriptors(instance, classificationName, nextChoiceName, patch) {
    const existingDescriptors = classificationChoiceState(instance, classificationName)?.descriptors || [];
    const descriptorKeys = descriptorKeysForField(instance.finding, classificationName, instance);
    const byKey = new Map(existingDescriptors.map((descriptor) => [descriptor.classificationChoiceDescriptor, descriptor]));
    if (patch?.descriptorKey) {
        if (patch.descriptorValue == null || patch.descriptorValue === '') {
            byKey.delete(patch.descriptorKey);
        }
        else {
            const existing = byKey.get(patch.descriptorKey);
            byKey.set(patch.descriptorKey, {
                localId: existing?.localId,
                classificationChoiceDescriptor: patch.descriptorKey,
                descriptorValue: descriptorInputType(patch.descriptorKey) === 'number'
                    ? Number(patch.descriptorValue)
                    : patch.descriptorValue
            });
        }
    }
    return (descriptorKeys.length ? descriptorKeys : Array.from(byKey.keys()))
        .map((descriptorKey) => byKey.get(descriptorKey) || null)
        .filter((descriptor) => descriptor !== null);
}
function hasFieldError(instance, findingName, classificationName) {
    const choiceValue = classificationChoiceName(instance, classificationName);
    const isMissingRequired = isClassificationRequired(findingName, classificationName) &&
        !choiceValue.trim() &&
        (showValidationFeedback.value ||
            touchedFields.value[fieldKey(instance.localId || '', classificationName)]);
    const hasBackendMissing = (backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []).some((classification) => normalizeKey(classification) === normalizeKey(classificationName)) &&
        (showValidationFeedback.value ||
            touchedFields.value[fieldKey(instance.localId || '', classificationName)]);
    return isMissingRequired || hasBackendMissing;
}
function fieldMessages(instance, findingName, classificationName) {
    if (!hasFieldError(instance, findingName, classificationName))
        return [];
    const messages = [];
    if (isClassificationRequired(findingName, classificationName) &&
        !classificationChoiceName(instance, classificationName)) {
        messages.push('Dieses Feld ist fuer den aktuellen Entwurfszustand erforderlich.');
    }
    if ((backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []).some((classification) => normalizeKey(classification) === normalizeKey(classificationName))) {
        messages.push('Die Validierung verlangt diese Klassifikation fuer den aktuellen Befund.');
    }
    return Array.from(new Set(messages));
}
function findingLevelMessages(findingName) {
    const messages = backendMessagesByFinding.value[normalizeKey(findingName)] || [];
    return Array.from(new Set(messages.filter(Boolean)));
}
async function refreshTemplatesForExamination() {
    templateStatusMessage.value = null;
    const examName = selectedExaminationName.value;
    if (!examName)
        return;
    const templates = await fetchTemplatesByExamination(examName);
    if (templates.length) {
        templateStatusMessage.value = `${templates.length} Template(s) fuer "${examName}" geladen.`;
    }
    else {
        templateStatusMessage.value = `Keine Templates fuer "${examName}" gefunden.`;
    }
}
function onModuleChange(next) {
    setModuleName(next.trim() || 'report_template_examples');
    void refreshTemplatesForExamination();
}
function onTemplateSelectionChange(name) {
    void selectTemplateByName(name || null);
    showValidationFeedback.value = false;
}
function onAddFinding(findingName) {
    clearMessages();
    const localId = flow.addFinding({ findingName });
    if (!localId) {
        errorMessage.value = 'Der Befund konnte dem lokalen Entwurf nicht hinzugefuegt werden.';
        return;
    }
    dirtySinceMount.value = true;
    flow.noteFindingAdded(getFindingDefinitionByName(findingName)?.id || 0);
    successMessage.value = `Befund "${getFindingLabel(findingName)}" wurde dem lokalen Entwurf hinzugefuegt.`;
}
function onRemoveFinding(findingLocalId) {
    clearMessages();
    if (!findingLocalId)
        return;
    flow.removeFinding(findingLocalId);
    dirtySinceMount.value = true;
    successMessage.value = 'Befundinstanz aus dem lokalen Entwurf entfernt.';
}
function onClassificationChoiceChange(findingLocalId, classificationName, nextChoice) {
    clearMessages();
    markFieldTouched(findingLocalId, classificationName);
    dirtySinceMount.value = true;
    const instance = (currentPayload.value?.patientFindings || []).find((finding) => finding.localId === findingLocalId);
    if (!instance)
        return;
    flow.updateClassificationValue({
        findingLocalId,
        classificationName,
        classificationChoice: nextChoice || null,
        descriptors: nextChoice
            ? buildDescriptors(instance, classificationName, nextChoice)
            : []
    });
    flow.noteClassificationUpdated(getFindingDefinitionByName(instance.finding)?.id || 0, 0, null);
}
function onDescriptorInput(findingLocalId, classificationName, descriptorKey, nextValue) {
    markFieldTouched(findingLocalId, classificationName);
    dirtySinceMount.value = true;
    const instance = (currentPayload.value?.patientFindings || []).find((finding) => finding.localId === findingLocalId);
    if (!instance)
        return;
    const currentChoice = classificationChoiceName(instance, classificationName);
    if (!currentChoice)
        return;
    flow.updateClassificationValue({
        findingLocalId,
        classificationName,
        classificationChoice: currentChoice,
        descriptors: buildDescriptors(instance, classificationName, currentChoice, {
            descriptorKey,
            descriptorValue: nextValue
        })
    });
}
async function runRuntimeValidation(forceFeedback = false) {
    const draft = currentRuntimeDraft.value;
    const templateName = selectedTemplateName.value;
    const patientExaminationId = flow.patientExaminationId;
    if (!draft || !templateName || !patientExaminationId) {
        templateValidationError.value = null;
        flow.setLastTemplateValidation(null);
        return;
    }
    if (forceFeedback) {
        showValidationFeedback.value = true;
    }
    templateValidationLoading.value = true;
    templateValidationError.value = null;
    try {
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
        templateValidationError.value = formatApiError(e, 'Template-Validierung konnte nicht ausgefuehrt werden.');
    }
    finally {
        templateValidationLoading.value = false;
    }
}
function scheduleRuntimeValidation() {
    if (validationTimer) {
        clearTimeout(validationTimer);
    }
    validationTimer = setTimeout(() => {
        void runRuntimeValidation(false);
    }, 350);
}
function handleBeforeUnload(event) {
    if (!dirtySinceMount.value)
        return;
    event.preventDefault();
    event.returnValue = '';
}
watch([selectedKbModule, selectedTemplateName], ([moduleName, templateName]) => {
    flow.setTemplateSelection({
        moduleName,
        templateName
    });
});
watch(() => flow.patientExaminationId, () => {
    resetTouchedState();
    templateValidationError.value = null;
    flow.setLastTemplateValidation(null);
});
watch(() => currentPayload.value?.patientFindings, () => {
    if (!selectedTemplateName.value || !currentPayload.value)
        return;
    scheduleRuntimeValidation();
}, { deep: true });
watch(() => selectedTemplateName.value, () => {
    if (!selectedTemplateName.value) {
        flow.setLastTemplateValidation(null);
        templateValidationError.value = null;
        return;
    }
    scheduleRuntimeValidation();
});
onMounted(async () => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    await ensureCatalogLoaded();
    if (selectedExaminationName.value) {
        await refreshTemplatesForExamination();
    }
    if (canValidateDraft.value) {
        scheduleRuntimeValidation();
    }
});
onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (validationTimer) {
        clearTimeout(validationTimer);
        validationTimer = null;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column gap-3" },
});
/** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
    title: "Template & Dokumentationsregeln",
    subtitle: "Template wählen, Abschnitte prüfen und den lokalen Befund-Entwurf gegen die Wissensbasis validieren",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName && !!__VLS_ctx.currentRuntimeDraft),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.templateLoading || __VLS_ctx.findingSelectorsLoading || __VLS_ctx.templateValidationLoading),
}));
const __VLS_1 = __VLS_0({
    title: "Template & Dokumentationsregeln",
    subtitle: "Template wählen, Abschnitte prüfen und den lokalen Befund-Entwurf gegen die Wissensbasis validieren",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName && !!__VLS_ctx.currentRuntimeDraft),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.templateLoading || __VLS_ctx.findingSelectorsLoading || __VLS_ctx.templateValidationLoading),
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.runRuntimeValidation(true);
            } },
        ...{ class: "btn btn-primary btn-sm" },
        disabled: (__VLS_ctx.templateValidationLoading || !__VLS_ctx.canValidateDraft),
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
            ...{ class: "small text-muted mb-2" },
        });
        (__VLS_ctx.sectionBlocks.length);
        (__VLS_ctx.selectedTemplateValidatorCounts.examination);
        (__VLS_ctx.selectedTemplateValidatorCounts.findings);
    }
    if (__VLS_ctx.currentRuntimeDraft) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
        (__VLS_ctx.currentRuntimeDraft.hydratedFrom === 'session_storage' || __VLS_ctx.currentRuntimeDraft.hydratedFrom === 'draft_api' ? 'wiederhergestellt' : 'initialisiert');
        (__VLS_ctx.currentPayload?.patientFindings.length || 0);
        (new Date(__VLS_ctx.currentRuntimeDraft.updatedAt).toLocaleTimeString('de-DE'));
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
    ...{ class: "small text-muted" },
});
(__VLS_ctx.currentPayload?.patientFindings.length || 0);
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
/** @type {[typeof ReportingMediaPreviewCards, ]} */ ;
// @ts-ignore
const __VLS_3 = __VLS_asFunctionalComponent(ReportingMediaPreviewCards, new ReportingMediaPreviewCards({
    ...{ class: "mb-3" },
}));
const __VLS_4 = __VLS_3({
    ...{ class: "mb-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_3));
if (!__VLS_ctx.flow.patientExaminationId || !__VLS_ctx.flow.selectedExaminationId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning" },
    });
}
else if (!__VLS_ctx.currentRuntimeDraft || !__VLS_ctx.currentPayload) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning" },
    });
}
else if (!__VLS_ctx.selectedTemplate) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
    });
}
else {
    for (const [section] of __VLS_getVForSourceType((__VLS_ctx.sectionBlocks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (section.name),
            ...{ class: "card border mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header bg-light" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex justify-content-between align-items-center gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-0" },
        });
        (section.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (section.subtitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (section.findings.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body d-flex flex-column gap-3" },
        });
        for (const [templateFinding] of __VLS_getVForSourceType((section.findings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (`${section.name}:${templateFinding.finding}`),
                ...{ class: "border rounded p-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-start gap-3 mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "fw-semibold" },
            });
            (__VLS_ctx.getFindingLabel(templateFinding.finding));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
            (templateFinding.multipleAllowed ? 'Mehrfach erlaubt' : 'Einmalig');
            (templateFinding.required ? 'erforderlich' : 'optional');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.flow.patientExaminationId || !__VLS_ctx.flow.selectedExaminationId))
                            return;
                        if (!!(!__VLS_ctx.currentRuntimeDraft || !__VLS_ctx.currentPayload))
                            return;
                        if (!!(!__VLS_ctx.selectedTemplate))
                            return;
                        __VLS_ctx.onAddFinding(templateFinding.finding);
                    } },
                ...{ class: "btn btn-outline-primary btn-sm" },
                disabled: (!__VLS_ctx.canAddFinding(templateFinding)),
            });
            (__VLS_ctx.instancesForFinding(templateFinding.finding).length ? 'Weitere Instanz hinzufügen' : 'Befund hinzufügen');
            if (__VLS_ctx.findingLevelMessages(templateFinding.finding).length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "alert alert-warning py-2 small" },
                });
                for (const [message] of __VLS_getVForSourceType((__VLS_ctx.findingLevelMessages(templateFinding.finding)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (message),
                    });
                    (message);
                }
            }
            if (__VLS_ctx.instancesForFinding(templateFinding.finding).length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "d-flex flex-column gap-3" },
                });
                for (const [instance] of __VLS_getVForSourceType((__VLS_ctx.instancesForFinding(templateFinding.finding)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (instance.localId || instance.finding),
                        ...{ class: "runtime-finding-instance border rounded p-3" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "d-flex justify-content-between align-items-center mb-3" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "small text-muted" },
                    });
                    (instance.localId || instance.finding);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.flow.patientExaminationId || !__VLS_ctx.flow.selectedExaminationId))
                                    return;
                                if (!!(!__VLS_ctx.currentRuntimeDraft || !__VLS_ctx.currentPayload))
                                    return;
                                if (!!(!__VLS_ctx.selectedTemplate))
                                    return;
                                if (!(__VLS_ctx.instancesForFinding(templateFinding.finding).length))
                                    return;
                                __VLS_ctx.onRemoveFinding(instance.localId || '');
                            } },
                        ...{ class: "btn btn-outline-danger btn-sm" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "row g-3" },
                    });
                    for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.visibleClassificationsForFinding(templateFinding.finding)))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            key: (`${instance.localId}:${classification.name}`),
                            ...{ class: "col-md-6" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                            ...{ class: "form-label" },
                        });
                        (classification.displayName || classification.name);
                        if (__VLS_ctx.isClassificationRequired(templateFinding.finding, classification.name)) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ class: "text-danger" },
                            });
                        }
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                            ...{ onChange: (...[$event]) => {
                                    if (!!(!__VLS_ctx.flow.patientExaminationId || !__VLS_ctx.flow.selectedExaminationId))
                                        return;
                                    if (!!(!__VLS_ctx.currentRuntimeDraft || !__VLS_ctx.currentPayload))
                                        return;
                                    if (!!(!__VLS_ctx.selectedTemplate))
                                        return;
                                    if (!(__VLS_ctx.instancesForFinding(templateFinding.finding).length))
                                        return;
                                    __VLS_ctx.onClassificationChoiceChange(instance.localId || '', classification.name, $event.target.value);
                                } },
                            ...{ class: "form-select" },
                            ...{ class: ({ 'is-invalid': __VLS_ctx.hasFieldError(instance, templateFinding.finding, classification.name) }) },
                            value: (__VLS_ctx.classificationChoiceName(instance, classification.name)),
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                            value: "",
                        });
                        for (const [choice] of __VLS_getVForSourceType((classification.choices))) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                                key: (choice.id),
                                value: (choice.name),
                            });
                            (choice.displayName || choice.name);
                        }
                        for (const [descriptorKey] of __VLS_getVForSourceType((__VLS_ctx.descriptorKeysForField(templateFinding.finding, classification.name, instance)))) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                key: (`${instance.localId}:${classification.name}:${descriptorKey}`),
                                ...{ class: "mt-2" },
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                                ...{ class: "form-label form-label-sm" },
                            });
                            (__VLS_ctx.descriptorLabel(descriptorKey));
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                                ...{ onInput: (...[$event]) => {
                                        if (!!(!__VLS_ctx.flow.patientExaminationId || !__VLS_ctx.flow.selectedExaminationId))
                                            return;
                                        if (!!(!__VLS_ctx.currentRuntimeDraft || !__VLS_ctx.currentPayload))
                                            return;
                                        if (!!(!__VLS_ctx.selectedTemplate))
                                            return;
                                        if (!(__VLS_ctx.instancesForFinding(templateFinding.finding).length))
                                            return;
                                        __VLS_ctx.onDescriptorInput(instance.localId || '', classification.name, descriptorKey, $event.target.value);
                                    } },
                                ...{ class: "form-control form-control-sm" },
                                type: (__VLS_ctx.descriptorInputType(descriptorKey)),
                                value: (__VLS_ctx.descriptorValue(instance, classification.name, descriptorKey)),
                            });
                        }
                        if (__VLS_ctx.fieldMessages(instance, templateFinding.finding, classification.name).length) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "invalid-feedback d-block" },
                            });
                            for (const [message] of __VLS_getVForSourceType((__VLS_ctx.fieldMessages(instance, templateFinding.finding, classification.name)))) {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                    key: (message),
                                });
                                (message);
                            }
                        }
                    }
                }
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "small text-muted" },
                });
            }
        }
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
    const __VLS_6 = __VLS_asFunctionalComponent(ReportTemplateValidationPanel, new ReportTemplateValidationPanel({
        loading: (__VLS_ctx.templateValidationLoading),
        errorMessage: (__VLS_ctx.templateValidationError),
        result: (__VLS_ctx.flow.lastTemplateValidation),
    }));
    const __VLS_7 = __VLS_6({
        loading: (__VLS_ctx.templateValidationLoading),
        errorMessage: (__VLS_ctx.templateValidationError),
        result: (__VLS_ctx.flow.lastTemplateValidation),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
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
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
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
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-finding-instance']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['is-invalid']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['invalid-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
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
            ReportTemplateValidationPanel: ReportTemplateValidationPanel,
            ReportingMediaPreviewCards: ReportingMediaPreviewCards,
            flow: flow,
            findingSelectorsLoading: findingSelectorsLoading,
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
            currentRuntimeDraft: currentRuntimeDraft,
            currentPayload: currentPayload,
            canValidateDraft: canValidateDraft,
            selectedExaminationName: selectedExaminationName,
            selectedExaminationDisplayName: selectedExaminationDisplayName,
            selectedTemplateValidatorCounts: selectedTemplateValidatorCounts,
            formatFindingsEvent: formatFindingsEvent,
            getFindingLabel: getFindingLabel,
            visibleClassificationsForFinding: visibleClassificationsForFinding,
            instancesForFinding: instancesForFinding,
            canAddFinding: canAddFinding,
            isClassificationRequired: isClassificationRequired,
            classificationChoiceName: classificationChoiceName,
            descriptorKeysForField: descriptorKeysForField,
            descriptorValue: descriptorValue,
            descriptorLabel: descriptorLabel,
            descriptorInputType: descriptorInputType,
            hasFieldError: hasFieldError,
            fieldMessages: fieldMessages,
            findingLevelMessages: findingLevelMessages,
            refreshTemplatesForExamination: refreshTemplatesForExamination,
            onModuleChange: onModuleChange,
            onTemplateSelectionChange: onTemplateSelectionChange,
            onAddFinding: onAddFinding,
            onRemoveFinding: onRemoveFinding,
            onClassificationChoiceChange: onClassificationChoiceChange,
            onDescriptorInput: onDescriptorInput,
            runRuntimeValidation: runRuntimeValidation,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
