import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue';
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue';
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue';
import ReportArtifactsPanel from '@/components/Reporting/ReportArtifactsPanel.vue';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
import { formatDateOnly, mergeClassificationSelections, normalizeInterventions } from '@/components/AssistedReporting/reportSubmissionUtils';
import { usePatientStore } from '@/stores/patientStore';
const flow = useReportingFlowStore();
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const route = useRoute();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const saveWarnings = ref([]);
const lastSaveStatus = ref(null);
const pendingSaveStatus = ref(null);
const currentReportVersion = ref(null);
const persistedArtifacts = ref(null);
const historyContext = ref(null);
const requirementGuidance = ref(null);
const { moduleName: selectedKbModule, selectedTemplateName, templateOptions, selectedTemplate, sectionBlocks, loading: templateLoading, errorMessage: templateErrorMessage, fetchTemplatesByExamination, selectTemplateByName, setModuleName } = useReportTemplates({
    initialModuleName: flow.selectedKbModule,
    initialTemplateName: flow.selectedTemplateName
});
const selectedExamination = computed(() => examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) || null);
const selectedExaminationName = computed(() => selectedExamination.value?.name || null);
const selectedExaminationDisplayName = computed(() => selectedExamination.value?.displayName || selectedExaminationName.value || null);
const selectedPatient = computed(() => flow.selectedPatientId ? patientStore.getPatientById(flow.selectedPatientId) : null);
const templateStatusMessage = ref(null);
const canSave = computed(() => !!flow.patientExaminationId && !!selectedTemplateName.value);
const normalizedIndications = computed(() => flow.indications
    .filter((row) => row.examinationIndicationId != null)
    .map((row) => ({
    examinationIndicationId: row.examinationIndicationId,
    indicationChoiceId: row.indicationChoiceId ?? undefined
})));
const normalizedIndicationsPreview = computed(() => JSON.stringify(normalizedIndications.value, null, 2));
const sectionDraftPreview = computed(() => JSON.stringify(flow.templateSectionDrafts || {}, null, 2));
watch([selectedKbModule, selectedTemplateName], ([moduleName, templateName], [, previousTemplateName]) => {
    flow.setTemplateSelection({
        moduleName,
        templateName
    });
    if (templateName && previousTemplateName && templateName !== previousTemplateName) {
        flow.clearTemplateSectionDrafts();
    }
});
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function getSectionDraft(sectionName) {
    return (flow.templateSectionDrafts[sectionName] || {
        note: '',
        includePatientData: false,
        includeExaminationData: false
    });
}
function onSectionDraftNote(sectionName, note) {
    flow.setTemplateSectionDraft(sectionName, { note });
}
function onSectionDraftToggle(sectionName, key, value) {
    flow.setTemplateSectionDraft(sectionName, { [key]: value });
}
function isSectionConfigured(sectionName) {
    const draft = getSectionDraft(sectionName);
    return !!draft.note.trim() || draft.includePatientData || draft.includeExaminationData;
}
function buildPatientDataPayload() {
    const patient = selectedPatient.value;
    if (!patient)
        return {};
    return {
        patientBirthDate: formatDateOnly(patient.dob),
        patientGender: patient.gender || null,
        firstName: patient.firstName || null,
        lastName: patient.lastName || null,
        center: patient.center || null
    };
}
function buildPatientContextText() {
    const patient = selectedPatient.value;
    if (!patient)
        return '';
    const parts = [
        patient.firstName || null,
        patient.lastName || null,
        patient.gender || null,
        formatDateOnly(patient.dob)
    ].filter(Boolean);
    return parts.length ? `Patient: ${parts.join(' · ')}` : '';
}
function buildExaminationContextText() {
    if (!selectedExaminationDisplayName.value)
        return '';
    return `Untersuchung: ${selectedExaminationDisplayName.value}`;
}
async function ensurePatientsLoaded() {
    if (!patientStore.patients.length) {
        await patientStore.fetchPatients();
    }
}
async function ensureExaminationsLoaded() {
    if (!examinationStore.exams.length) {
        await examinationStore.fetchExaminations();
    }
}
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
async function fetchNormalizedFindingsPayload() {
    if (!flow.patientExaminationId)
        return [];
    try {
        const res = await axiosInstance.get(r(`${endpoints.patient.patientFindings}?patient_examination=${flow.patientExaminationId}`));
        const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data);
        return (Array.isArray(rows) ? rows : [])
            .filter((row) => row && row.finding && row.isActive !== false)
            .map((row) => ({
            finding: row.finding,
            classifications: mergeClassificationSelections(row.finding, row.classifications, {}),
            interventions: normalizeInterventions(row.interventions)
        }));
    }
    catch (e) {
        console.warn('Konnte patient-findings nicht laden, verwende Fallback:', e?.message || e);
    }
    try {
        const res = await axiosInstance.get(r(endpoints.examination.patientExaminationFindings(flow.patientExaminationId)));
        const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data);
        return (Array.isArray(rows) ? rows : [])
            .map((row) => Number(row?.id))
            .filter((id) => Number.isFinite(id))
            .map((findingId) => ({
            finding: findingId,
            classifications: [],
            interventions: []
        }));
    }
    catch (e) {
        console.warn('Fallback für Befunde fehlgeschlagen:', e?.message || e);
        return [];
    }
}
function buildEditorPayload() {
    return {
        source: 'reporting_route_report_editor',
        routePatientExaminationId: route.params.patient_examination_id ?? null,
        lookupToken: flow.lookupToken,
        selectedRequirementSetIds: flow.selectedRequirementSetIds,
        indications: normalizedIndications.value,
        template: {
            moduleName: selectedKbModule.value,
            templateName: selectedTemplateName.value,
            sections: sectionBlocks.value.map((section) => ({
                name: section.name,
                title: section.title,
                subtitle: section.subtitle,
                draft: getSectionDraft(section.name)
            }))
        },
        savedAt: new Date().toISOString()
    };
}
function buildRenderedText() {
    const lines = [];
    lines.push(`# ${selectedTemplateName.value || 'Unbenanntes Template'}`);
    for (const section of sectionBlocks.value) {
        const draft = getSectionDraft(section.name);
        const sectionLines = [];
        if (draft.includePatientData) {
            const patientText = buildPatientContextText();
            if (patientText)
                sectionLines.push(patientText);
        }
        if (draft.includeExaminationData) {
            const examText = buildExaminationContextText();
            if (examText)
                sectionLines.push(examText);
        }
        if (draft.note.trim())
            sectionLines.push(draft.note.trim());
        lines.push(`## ${section.title}`);
        if (sectionLines.length)
            lines.push(sectionLines.join('\n'));
    }
    return lines.join('\n\n');
}
async function loadLatestReportMeta() {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    loading.value = true;
    clearMessages();
    try {
        const res = await axiosInstance.get(r(endpoints.report.patientExaminationReportsByPatientExamination(flow.patientExaminationId)));
        const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data);
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            flow.setActiveReportId(null);
            currentReportVersion.value = null;
            successMessage.value = 'Kein bestehender Bericht gefunden. Der nächste Save erstellt einen neuen Bericht.';
            return;
        }
        const latest = items[0];
        flow.setActiveReportId(latest.id);
        currentReportVersion.value = latest.version ?? null;
        if (latest.templateName) {
            await selectTemplateByName(latest.templateName);
        }
        successMessage.value = `Bericht #${latest.id} (Version ${latest.version}) geladen.`;
    }
    catch (e) {
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Laden bestehender Berichte.';
    }
    finally {
        loading.value = false;
    }
}
async function saveReportSubmission(status) {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    if (!selectedTemplateName.value) {
        errorMessage.value = 'Template-Name ist erforderlich.';
        return;
    }
    pendingSaveStatus.value = status;
    loading.value = true;
    clearMessages();
    try {
        await ensurePatientsLoaded();
        const findings = await fetchNormalizedFindingsPayload();
        const payload = {
            ...(flow.activeReportId ? { reportId: flow.activeReportId } : {}),
            ...(currentReportVersion.value ? { expectedVersion: currentReportVersion.value } : {}),
            patientExaminationId: flow.patientExaminationId,
            templateName: selectedTemplateName.value,
            status,
            editorPayload: buildEditorPayload(),
            renderedText: buildRenderedText(),
            patientData: buildPatientDataPayload(),
            indications: normalizedIndications.value,
            findings,
            selectedRequirementSetIds: flow.selectedRequirementSetIds
        };
        const res = await axiosInstance.post(r(endpoints.report.saveReportSubmission), payload);
        const data = res.data;
        flow.setActiveReportId(data.report.id);
        currentReportVersion.value = data.report.version;
        lastSaveStatus.value = data.report.status || status;
        saveWarnings.value = Array.isArray(data.warnings) ? data.warnings : [];
        historyContext.value = (data.historyContext || null);
        requirementGuidance.value = (data.requirementGuidance || null);
        flow.setLastRequirementGuidance(requirementGuidance.value);
        if (requirementGuidance.value && typeof requirementGuidance.value === 'object') {
            const rg = requirementGuidance.value;
            flow.patchLookupSnapshot({
                requirementStatus: rg.requirementStatus,
                requirementSetStatus: rg.requirementSetStatus,
                suggestedActions: rg.suggestedActions,
                candidateRequirementSetIds: rg.candidateRequirementSetIds,
                candidateRequirementSetConfidence: rg.candidateRequirementSetConfidence
            });
        }
        persistedArtifacts.value = data.persistedArtifacts || null;
        successMessage.value = data.created
            ? `Bericht wurde erstellt (ID ${data.report.id}, Version ${data.report.version}).`
            : `Bericht wurde aktualisiert (ID ${data.report.id}, Version ${data.report.version}).`;
    }
    catch (e) {
        const versionConflict = e?.response?.data?.expectedVersion;
        if (typeof versionConflict === 'string') {
            errorMessage.value = `Versionskonflikt: ${versionConflict}`;
        }
        else {
            errorMessage.value =
                e?.response?.data?.detail || e?.message || 'Fehler beim Speichern des Berichts.';
        }
    }
    finally {
        loading.value = false;
        pendingSaveStatus.value = null;
    }
}
onMounted(async () => {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.';
        return;
    }
    await Promise.all([ensurePatientsLoaded(), ensureExaminationsLoaded()]);
    await refreshTemplatesForExamination();
    await loadLatestReportMeta();
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
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    to: "/report-generator",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    to: "/report-generator",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
var __VLS_3;
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
const __VLS_4 = __VLS_asFunctionalComponent(LookupStatusPanel, new LookupStatusPanel({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
}));
const __VLS_5 = __VLS_4({
    ...{ class: "mb-3" },
    patientExaminationId: (__VLS_ctx.flow.patientExaminationId),
    lookupToken: (__VLS_ctx.flow.lookupToken),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
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
    value: (__VLS_ctx.flow.activeReportId ?? ''),
    readonly: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    value: (__VLS_ctx.currentReportVersion ?? ''),
    readonly: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    value: (__VLS_ctx.lastSaveStatus ?? ''),
    readonly: true,
});
/** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
    title: "Template-Kontext",
    subtitle: "Templates per Untersuchung laden und für den Bericht aktivieren",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
}));
const __VLS_8 = __VLS_7({
    title: "Template-Kontext",
    subtitle: "Templates per Untersuchung laden und für den Bericht aktivieren",
    icon: "description",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_9.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_9.slots;
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
        ...{ class: "d-flex flex-wrap gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshTemplatesForExamination) },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.loading || __VLS_ctx.templateLoading || !__VLS_ctx.selectedExaminationName),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadLatestReportMeta) },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (__VLS_ctx.loading),
    });
    if (__VLS_ctx.templateErrorMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-danger py-2 mt-3 mb-0" },
        });
        (__VLS_ctx.templateErrorMessage);
    }
    if (__VLS_ctx.templateStatusMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-success py-2 mt-3 mb-0" },
        });
        (__VLS_ctx.templateStatusMessage);
    }
}
var __VLS_9;
if (!__VLS_ctx.sectionBlocks.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
    });
}
for (const [section] of __VLS_getVForSourceType((__VLS_ctx.sectionBlocks))) {
    /** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
        key: (section.name),
        title: (section.title),
        subtitle: (section.subtitle),
        icon: "assignment",
        iconBgClass: "bg-gradient-info",
        isComplete: (__VLS_ctx.isSectionConfigured(section.name)),
        isActive: (section.position === 0),
        showAction: (false),
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_11 = __VLS_10({
        key: (section.name),
        title: (section.title),
        subtitle: (section.subtitle),
        icon: "assignment",
        iconBgClass: "bg-gradient-info",
        isComplete: (__VLS_ctx.isSectionConfigured(section.name)),
        isActive: (section.position === 0),
        showAction: (false),
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    __VLS_12.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_12.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted mb-2" },
        });
        (section.findings.length);
        (section.requiredFindingsCount);
        (section.requiredClassificationsCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-wrap gap-3 mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    __VLS_ctx.onSectionDraftToggle(section.name, 'includePatientData', $event.target.checked);
                } },
            ...{ class: "form-check-input" },
            type: "checkbox",
            checked: (__VLS_ctx.getSectionDraft(section.name).includePatientData),
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    __VLS_ctx.onSectionDraftToggle(section.name, 'includeExaminationData', $event.target.checked);
                } },
            ...{ class: "form-check-input" },
            type: "checkbox",
            checked: (__VLS_ctx.getSectionDraft(section.name).includeExaminationData),
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            ...{ onInput: (...[$event]) => {
                    __VLS_ctx.onSectionDraftNote(section.name, $event.target.value);
                } },
            ...{ class: "form-control" },
            rows: "4",
            disabled: (__VLS_ctx.loading),
            value: (__VLS_ctx.getSectionDraft(section.name).note),
        });
    }
    var __VLS_12;
}
/** @type {[typeof IndicationsEditor, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(IndicationsEditor, new IndicationsEditor({
    ...{ 'onUpdateRow': {} },
    ...{ 'onAddRow': {} },
    ...{ 'onRemoveRow': {} },
    ...{ class: "mb-4" },
    rows: (__VLS_ctx.flow.indications),
    disabled: (__VLS_ctx.loading),
    description: "Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend.",
}));
const __VLS_14 = __VLS_13({
    ...{ 'onUpdateRow': {} },
    ...{ 'onAddRow': {} },
    ...{ 'onRemoveRow': {} },
    ...{ class: "mb-4" },
    rows: (__VLS_ctx.flow.indications),
    disabled: (__VLS_ctx.loading),
    description: "Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend.",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onUpdateRow: ((idx, patch) => __VLS_ctx.flow.updateIndicationRow(idx, patch))
};
const __VLS_20 = {
    onAddRow: (...[$event]) => {
        __VLS_ctx.flow.addIndicationRow();
    }
};
const __VLS_21 = {
    onRemoveRow: ((idx) => __VLS_ctx.flow.removeIndicationRow(idx))
};
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-wrap gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.saveReportSubmission('draft');
        } },
    ...{ class: "btn btn-outline-primary" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.canSave),
});
if (__VLS_ctx.loading && __VLS_ctx.pendingSaveStatus === 'draft') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-1" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.saveReportSubmission('final');
        } },
    ...{ class: "btn btn-success" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.canSave),
});
if (__VLS_ctx.loading && __VLS_ctx.pendingSaveStatus === 'final') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-1" },
    });
}
if (__VLS_ctx.saveWarnings.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card shadow-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "mb-0" },
    });
    for (const [warning, idx] of __VLS_getVForSourceType((__VLS_ctx.saveWarnings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (idx),
        });
        (warning);
    }
}
/** @type {[typeof ReportArtifactsPanel, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(ReportArtifactsPanel, new ReportArtifactsPanel({
    artifacts: (__VLS_ctx.persistedArtifacts),
}));
const __VLS_23 = __VLS_22({
    artifacts: (__VLS_ctx.persistedArtifacts),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body d-flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: "small mb-0 bg-light p-2 rounded" },
});
(__VLS_ctx.normalizedIndicationsPreview);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-muted mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: "small mb-0 bg-light p-2 rounded" },
});
(__VLS_ctx.sectionDraftPreview);
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
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
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
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
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
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            MedicalBlock: MedicalBlock,
            IndicationsEditor: IndicationsEditor,
            LookupStatusPanel: LookupStatusPanel,
            ReportArtifactsPanel: ReportArtifactsPanel,
            flow: flow,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            saveWarnings: saveWarnings,
            lastSaveStatus: lastSaveStatus,
            pendingSaveStatus: pendingSaveStatus,
            currentReportVersion: currentReportVersion,
            persistedArtifacts: persistedArtifacts,
            selectedKbModule: selectedKbModule,
            selectedTemplateName: selectedTemplateName,
            templateOptions: templateOptions,
            sectionBlocks: sectionBlocks,
            templateLoading: templateLoading,
            templateErrorMessage: templateErrorMessage,
            selectedExaminationName: selectedExaminationName,
            selectedExaminationDisplayName: selectedExaminationDisplayName,
            templateStatusMessage: templateStatusMessage,
            canSave: canSave,
            normalizedIndicationsPreview: normalizedIndicationsPreview,
            sectionDraftPreview: sectionDraftPreview,
            getSectionDraft: getSectionDraft,
            onSectionDraftNote: onSectionDraftNote,
            onSectionDraftToggle: onSectionDraftToggle,
            isSectionConfigured: isSectionConfigured,
            refreshTemplatesForExamination: refreshTemplatesForExamination,
            onModuleChange: onModuleChange,
            onTemplateSelectionChange: onTemplateSelectionChange,
            loadLatestReportMeta: loadLatestReportMeta,
            saveReportSubmission: saveReportSubmission,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
