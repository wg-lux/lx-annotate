import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue';
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue';
import ReportArtifactsPanel from '@/components/Reporting/ReportArtifactsPanel.vue';
import { useDebug } from '@/composables/useDebug';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
import { formatDateOnly } from '@/components/AssistedReporting/reportSubmissionUtils';
import { usePatientStore } from '@/stores/patientStore';
const flow = useReportingFlowStore();
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const route = useRoute();
const { isDebug } = useDebug();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const saveWarnings = ref([]);
const lastSaveStatus = ref(null);
const pendingSaveStatus = ref(null);
const currentReportVersion = ref(null);
const persistedArtifacts = ref(null);
const historyContext = ref(null);
const indicationOptions = ref([]);
const indicationOptionsLoading = ref(false);
const indicationOptionsError = ref(null);
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
const currentRuntimeDraft = computed(() => flow.currentRuntimeDraft);
const currentPayload = computed(() => currentRuntimeDraft.value?.payload || null);
const renderedReportPreview = computed(() => buildRenderedText());
const reportWordCount = computed(() => {
    const words = renderedReportPreview.value
        .replace(/[#*-]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    return words.length;
});
const reportPatientLabel = computed(() => {
    const patient = selectedPatient.value;
    if (!patient)
        return 'Nicht gewählt';
    const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim();
    const details = [patient.gender, formatDateOnly(patient.dob)].filter(Boolean);
    return [name || `Patient #${patient.id}`, ...details].join(' · ');
});
const normalizedIndications = computed(() => flow.indications
    .filter((row) => row.examinationIndicationId != null)
    .map((row) => ({
    examinationIndicationId: row.examinationIndicationId,
    indicationChoiceId: row.indicationChoiceId ?? undefined
})));
const normalizedIndicationsPreview = computed(() => JSON.stringify(normalizedIndications.value, null, 2));
const indicationOptionsForEditor = computed(() => {
    const optionsById = new Map();
    const upsert = (option) => {
        const existing = optionsById.get(option.id);
        if (!existing) {
            optionsById.set(option.id, {
                id: option.id,
                label: option.label || `Indikation #${option.id}`,
                choices: option.choices.slice()
            });
            return;
        }
        existing.label = existing.label || option.label || `Indikation #${option.id}`;
        const choiceById = new Map();
        for (const choice of existing.choices) {
            choiceById.set(choice.id, choice);
        }
        for (const choice of option.choices) {
            choiceById.set(choice.id, {
                id: choice.id,
                label: choice.label || `Auswahl #${choice.id}`
            });
        }
        existing.choices = Array.from(choiceById.values());
    };
    for (const option of indicationOptions.value) {
        upsert({
            id: option.id,
            label: option.label,
            choices: option.choices.slice()
        });
    }
    for (const row of flow.indications) {
        const indicationId = row.examinationIndicationId;
        if (indicationId == null)
            continue;
        if (!optionsById.has(indicationId)) {
            upsert({
                id: indicationId,
                label: `Unbekannte Indikation (#${indicationId})`,
                choices: []
            });
        }
        const choiceId = row.indicationChoiceId;
        if (choiceId == null)
            continue;
        const option = optionsById.get(indicationId);
        if (!option)
            continue;
        if (!option.choices.some((choice) => choice.id === choiceId)) {
            option.choices = [{ id: choiceId, label: `Unbekannte Auswahl (#${choiceId})` }, ...option.choices];
        }
    }
    return Array.from(optionsById.values())
        .map((option) => ({
        ...option,
        choices: option.choices
            .slice()
            .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }))
    }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }));
});
const sectionDraftPreview = computed(() => JSON.stringify(flow.templateSectionDrafts || {}, null, 2));
const runtimeFindingsPreview = computed(() => JSON.stringify(currentPayload.value?.patientFindings || [], null, 2));
const sectionCompletionSummary = computed(() => {
    const sections = sectionBlocks.value.map((section) => {
        const sectionFindings = getSectionDraftFindings(section.name);
        const missingFindings = section.findings
            .filter((definition) => definition.required)
            .filter((definition) => !sectionFindings.some((entry) => entry.finding === definition.finding))
            .map((definition) => definition.finding);
        const missingClassificationSet = new Set();
        for (const definition of section.findings) {
            const matchingFindings = sectionFindings.filter((entry) => entry.finding === definition.finding);
            if (!matchingFindings.length)
                continue;
            for (const classification of definition.classifications.filter((entry) => entry.required)) {
                const presentInAnyFinding = matchingFindings.some((entry) => entry.classificationChoices.some((choice) => choice.classification === classification.classification));
                if (!presentInAnyFinding) {
                    missingClassificationSet.add(`${definition.finding}: ${classification.classification}`);
                }
            }
        }
        const missingClassifications = Array.from(missingClassificationSet.values());
        return {
            name: section.name,
            title: section.title,
            missingFindings,
            missingClassifications,
            isComplete: !missingFindings.length && !missingClassifications.length
        };
    });
    return {
        totalSections: sections.length,
        completedSections: sections.filter((section) => section.isComplete).length,
        totalMissingFindings: sections.reduce((sum, section) => sum + section.missingFindings.length, 0),
        totalMissingClassifications: sections.reduce((sum, section) => sum + section.missingClassifications.length, 0),
        incompleteSections: sections.filter((section) => !section.isComplete)
    };
});
watch([selectedKbModule, selectedTemplateName], ([moduleName, templateName], [, previousTemplateName]) => {
    flow.setTemplateSelection({
        moduleName,
        templateName
    });
    if (templateName && previousTemplateName && templateName !== previousTemplateName) {
        flow.clearTemplateSectionDrafts();
    }
});
watch([() => flow.patientExaminationId, () => flow.selectedExaminationId], ([nextPatientExaminationId, nextExaminationId], [previousPatientExaminationId, previousExaminationId]) => {
    if (nextPatientExaminationId === previousPatientExaminationId &&
        nextExaminationId === previousExaminationId) {
        return;
    }
    void loadIndicationCatalog();
});
function normalizePositiveId(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return null;
    const id = Math.trunc(parsed);
    return id > 0 ? id : null;
}
function normalizeDisplayLabel(value) {
    if (typeof value !== 'string')
        return null;
    const normalized = value.trim();
    return normalized || null;
}
function normalizeChoiceOptions(value) {
    if (!Array.isArray(value))
        return [];
    const choiceById = new Map();
    for (const entry of value) {
        if (entry && typeof entry === 'object') {
            const row = entry;
            const id = normalizePositiveId(row.id ??
                row.choiceId ??
                row.choice_id ??
                row.indicationChoiceId ??
                row.indication_choice_id);
            if (id == null)
                continue;
            const label = normalizeDisplayLabel(row.label ?? row.name ?? row.displayName ?? row.name_de ?? row.nameDe) || `Auswahl #${id}`;
            choiceById.set(id, { id, label });
            continue;
        }
        const id = normalizePositiveId(entry);
        if (id == null)
            continue;
        choiceById.set(id, { id, label: `Auswahl #${id}` });
    }
    return Array.from(choiceById.values());
}
function normalizeChoiceOptionsFromClassifications(value) {
    if (!Array.isArray(value))
        return [];
    const aggregated = [];
    for (const entry of value) {
        if (!entry || typeof entry !== 'object')
            continue;
        const row = entry;
        aggregated.push(...normalizeChoiceOptions(row.choices));
    }
    const deduped = new Map();
    for (const choice of aggregated) {
        deduped.set(choice.id, choice);
    }
    return Array.from(deduped.values());
}
function normalizeIndicationOptions(value) {
    if (!Array.isArray(value))
        return [];
    const indicationById = new Map();
    for (const entry of value) {
        if (entry && typeof entry === 'object') {
            const row = entry;
            const id = normalizePositiveId(row.id ??
                row.indicationId ??
                row.indication_id ??
                row.examinationIndicationId ??
                row.examination_indication_id);
            if (id == null)
                continue;
            const label = normalizeDisplayLabel(row.label ?? row.name ?? row.displayName ?? row.name_de ?? row.nameDe) || `Indikation #${id}`;
            const choices = [
                ...normalizeChoiceOptions(row.choices),
                ...normalizeChoiceOptions(row.indicationChoices),
                ...normalizeChoiceOptions(row.indication_choices),
                ...normalizeChoiceOptionsFromClassifications(row.classifications)
            ];
            const choiceById = new Map();
            for (const choice of choices) {
                choiceById.set(choice.id, choice);
            }
            indicationById.set(id, {
                id,
                label,
                choices: Array.from(choiceById.values())
            });
            continue;
        }
        const id = normalizePositiveId(entry);
        if (id == null)
            continue;
        indicationById.set(id, {
            id,
            label: `Indikation #${id}`,
            choices: []
        });
    }
    return Array.from(indicationById.values());
}
function upsertIndicationOption(optionsById, option) {
    const existing = optionsById.get(option.id);
    if (!existing) {
        optionsById.set(option.id, {
            id: option.id,
            label: option.label || `Indikation #${option.id}`,
            choices: option.choices.slice()
        });
        return;
    }
    if (!existing.label || existing.label.startsWith('Unbekannte')) {
        existing.label = option.label || existing.label || `Indikation #${option.id}`;
    }
    const choiceById = new Map();
    for (const choice of existing.choices) {
        choiceById.set(choice.id, choice);
    }
    for (const choice of option.choices) {
        choiceById.set(choice.id, {
            id: choice.id,
            label: choice.label || `Auswahl #${choice.id}`
        });
    }
    existing.choices = Array.from(choiceById.values());
}
function extractOptionsFromPayload(payload, optionsById) {
    if (!payload || typeof payload !== 'object')
        return;
    const data = payload;
    const nestedExamination = data.examination && typeof data.examination === 'object'
        ? data.examination
        : null;
    const indicationCandidates = [
        data.indications,
        data.examinationIndications,
        data.examination_indications,
        data.examination_indication_options,
        nestedExamination?.indications,
        nestedExamination?.examinationIndications,
        nestedExamination?.examination_indications,
        nestedExamination?.examination_indication_options
    ];
    for (const candidate of indicationCandidates) {
        for (const option of normalizeIndicationOptions(candidate)) {
            upsertIndicationOption(optionsById, option);
        }
    }
    const topLevelChoiceCandidates = [
        data.indicationChoices,
        data.indication_choices,
        nestedExamination?.indicationChoices,
        nestedExamination?.indication_choices
    ];
    for (const candidate of topLevelChoiceCandidates) {
        if (Array.isArray(candidate)) {
            for (const row of candidate) {
                if (!row || typeof row !== 'object')
                    continue;
                const value = row;
                const indicationId = normalizePositiveId(value.examinationIndicationId ??
                    value.examination_indication_id ??
                    value.indicationId ??
                    value.indication_id);
                const choiceId = normalizePositiveId(value.id ??
                    value.choiceId ??
                    value.choice_id ??
                    value.indicationChoiceId ??
                    value.indication_choice_id);
                if (indicationId == null || choiceId == null)
                    continue;
                const label = normalizeDisplayLabel(value.label ?? value.name ?? value.displayName ?? value.name_de ?? value.nameDe) || `Auswahl #${choiceId}`;
                const option = optionsById.get(indicationId);
                if (!option)
                    continue;
                if (!option.choices.some((choice) => choice.id === choiceId)) {
                    option.choices.push({ id: choiceId, label });
                }
            }
            continue;
        }
        if (!candidate || typeof candidate !== 'object')
            continue;
        for (const [key, choices] of Object.entries(candidate)) {
            const indicationId = normalizePositiveId(key);
            if (indicationId == null)
                continue;
            const option = optionsById.get(indicationId);
            if (!option)
                continue;
            const normalizedChoices = normalizeChoiceOptions(choices);
            for (const choice of normalizedChoices) {
                if (!option.choices.some((existingChoice) => existingChoice.id === choice.id)) {
                    option.choices.push(choice);
                }
            }
        }
    }
}
async function loadIndicationCatalog() {
    const patientExaminationId = flow.patientExaminationId;
    const selectedExaminationId = flow.selectedExaminationId;
    if (!patientExaminationId && !selectedExaminationId) {
        indicationOptions.value = [];
        indicationOptionsError.value = null;
        indicationOptionsLoading.value = false;
        return;
    }
    indicationOptionsLoading.value = true;
    indicationOptionsError.value = null;
    const optionsById = new Map();
    const loadErrors = [];
    if (patientExaminationId) {
        try {
            const detailRes = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
            extractOptionsFromPayload(detailRes.data, optionsById);
        }
        catch {
            loadErrors.push('patient-examination');
        }
    }
    if (selectedExaminationId) {
        try {
            const examRes = await axiosInstance.get(r(`${endpoints.router.examinations}${selectedExaminationId}/`));
            extractOptionsFromPayload(examRes.data, optionsById);
        }
        catch {
            loadErrors.push('examination-detail');
        }
    }
    if (selectedExaminationId && !optionsById.size) {
        try {
            const listRes = await axiosInstance.get(r(endpoints.router.examinations));
            const rows = (Array.isArray(listRes.data?.results) ? listRes.data.results : listRes.data);
            const selectedRow = Array.isArray(rows)
                ? rows.find((entry) => !!entry &&
                    typeof entry === 'object' &&
                    normalizePositiveId(entry.id) === selectedExaminationId)
                : null;
            if (selectedRow) {
                extractOptionsFromPayload(selectedRow, optionsById);
            }
        }
        catch {
            loadErrors.push('examination-list');
        }
    }
    indicationOptions.value = Array.from(optionsById.values())
        .map((option) => ({
        ...option,
        choices: option.choices
            .slice()
            .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }))
    }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }));
    if (!indicationOptions.value.length && loadErrors.length) {
        indicationOptionsError.value =
            'Indikationsoptionen konnten aus der aktuellen Backend-Antwort nicht abgeleitet werden.';
    }
    indicationOptionsLoading.value = false;
}
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
function formatRuntimeFindingSummary(finding) {
    const classifications = finding.classificationChoices
        .map((choice) => {
        const descriptorText = choice.descriptors.length
            ? ` (${choice.descriptors
                .map((descriptor) => `${descriptor.classificationChoiceDescriptor}: ${String(descriptor.descriptorValue)}`)
                .join(', ')})`
            : '';
        return `${choice.classification}: ${choice.classificationChoice}${descriptorText}`;
    })
        .join(' · ');
    return classifications ? `${finding.finding} -> ${classifications}` : finding.finding;
}
function getSectionDraftFindings(sectionName) {
    const section = sectionBlocks.value.find((entry) => entry.name === sectionName);
    const payload = currentPayload.value;
    if (!section || !payload)
        return [];
    const allowedFindings = new Set(section.findings.map((finding) => finding.finding));
    return payload.patientFindings.filter((finding) => allowedFindings.has(finding.finding));
}
function getSectionPreview(sectionName) {
    const findings = getSectionDraftFindings(sectionName);
    return {
        findings,
        findingSummaries: findings.map(formatRuntimeFindingSummary)
    };
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
    const templates = (await fetchTemplatesByExamination(examName)) || [];
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
function buildDraftFindingsPayload() {
    const payload = currentPayload.value;
    if (!payload)
        return [];
    return payload.patientFindings.map((finding) => ({
        finding: finding.finding,
        classifications: finding.classificationChoices.map((choice) => ({
            classification: choice.classification,
            classificationChoice: choice.classificationChoice
        })),
        interventions: []
    }));
}
function buildEditorPayload() {
    return {
        source: 'reporting_route_report_editor',
        routePatientExaminationId: route.params.patient_examination_id ?? null,
        indications: normalizedIndications.value,
        template: {
            moduleName: selectedKbModule.value,
            templateName: selectedTemplateName.value,
            sections: sectionBlocks.value.map((section) => ({
                name: section.name,
                title: section.title,
                subtitle: section.subtitle,
                draft: getSectionDraft(section.name),
                findings: getSectionPreview(section.name).findings
            }))
        },
        runtimeDraftPayload: currentPayload.value,
        savedAt: new Date().toISOString()
    };
}
function buildRenderedText() {
    const fallbackAnonymizedText = flow.mediaPreload?.latestReport?.anonymizedText?.trim() || '';
    const lines = [];
    lines.push(`# ${selectedTemplateName.value || 'Unbenanntes Template'}`);
    let hasStructuredContent = false;
    for (const section of sectionBlocks.value) {
        const draft = getSectionDraft(section.name);
        const sectionPreview = getSectionPreview(section.name);
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
        if (sectionPreview.findingSummaries.length) {
            sectionLines.push(...sectionPreview.findingSummaries.map((summary) => `- ${summary}`));
        }
        if (sectionLines.length)
            hasStructuredContent = true;
        lines.push(`## ${section.title}`);
        if (sectionLines.length)
            lines.push(sectionLines.join('\n'));
    }
    if (!hasStructuredContent && fallbackAnonymizedText) {
        return fallbackAnonymizedText;
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
    flow.setSavingFinalReport(status === 'final');
    try {
        await ensurePatientsLoaded();
        const findings = buildDraftFindingsPayload();
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
            findings
        };
        const res = await axiosInstance.post(r(endpoints.report.saveReportSubmission), payload);
        const data = res.data;
        flow.setActiveReportId(data.report.id);
        currentReportVersion.value = data.report.version;
        lastSaveStatus.value = data.report.status || status;
        saveWarnings.value = Array.isArray(data.warnings) ? data.warnings : [];
        historyContext.value = (data.historyContext || null);
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
        flow.setSavingFinalReport(false);
        loading.value = false;
        pendingSaveStatus.value = null;
    }
}
onMounted(async () => {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Bitte zuerst das Fall-Setup abschließen.';
        return;
    }
    if (!flow.currentRuntimeDraft) {
        errorMessage.value = 'Kein Reporting-Entwurf geladen. Bitte zuerst die klinische Dokumentation öffnen.';
        return;
    }
    await Promise.all([ensurePatientsLoaded(), ensureExaminationsLoaded()]);
    await loadIndicationCatalog();
    await refreshTemplatesForExamination();
    await loadLatestReportMeta();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['report-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['report-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['report-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['report-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-sheet']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['report-editor-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['report-workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['report-workspace-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-footer']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm report-workspace-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header report-workspace-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-workspace-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-workspace-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-status-pill" },
    ...{ class: (__VLS_ctx.lastSaveStatus === 'final' ? 'is-final' : 'is-draft') },
});
(__VLS_ctx.lastSaveStatus === 'final' ? 'Final' : __VLS_ctx.flow.activeReportId ? 'Entwurf' : 'Neuer Bericht');
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    to: "/reporting/case-setup",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    to: "/reporting/case-setup",
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-editor-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-editor-main" },
});
/** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
    title: "Template-Kontext",
    subtitle: "Templates per Untersuchung laden und für den Bericht aktivieren",
    icon: "ni ni-single-copy-04",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
}));
const __VLS_5 = __VLS_4({
    title: "Template-Kontext",
    subtitle: "Templates per Untersuchung laden und für den Bericht aktivieren",
    icon: "ni ni-single-copy-04",
    iconBgClass: "bg-gradient-primary",
    isComplete: (!!__VLS_ctx.selectedTemplateName),
    isActive: (true),
    showAction: (false),
    loading: (__VLS_ctx.loading || __VLS_ctx.templateLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_6.slots;
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
var __VLS_6;
if (!__VLS_ctx.sectionBlocks.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
    });
}
else if (!__VLS_ctx.currentRuntimeDraft || !__VLS_ctx.currentPayload) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning" },
    });
}
for (const [section] of __VLS_getVForSourceType((__VLS_ctx.sectionBlocks))) {
    /** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
        key: (section.name),
        title: (section.title),
        subtitle: (section.subtitle),
        icon: "ni ni-single-copy-04",
        iconBgClass: "bg-gradient-info",
        isComplete: (__VLS_ctx.isSectionConfigured(section.name)),
        isActive: (section.position === 0),
        showAction: (false),
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_8 = __VLS_7({
        key: (section.name),
        title: (section.title),
        subtitle: (section.subtitle),
        icon: "ni ni-single-copy-04",
        iconBgClass: "bg-gradient-info",
        isComplete: (__VLS_ctx.isSectionConfigured(section.name)),
        isActive: (section.position === 0),
        showAction: (false),
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_9.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_9.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted mb-2" },
        });
        (section.findings.length);
        (section.requiredFindingsCount);
        (section.requiredClassificationsCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold small mb-1" },
        });
        if (__VLS_ctx.getSectionPreview(section.name).findingSummaries.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "border rounded bg-light p-2 small" },
            });
            for (const [summary] of __VLS_getVForSourceType((__VLS_ctx.getSectionPreview(section.name).findingSummaries))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (summary),
                    ...{ class: "mb-1" },
                });
                (summary);
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
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
    var __VLS_9;
}
/** @type {[typeof IndicationsEditor, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(IndicationsEditor, new IndicationsEditor({
    ...{ 'onUpdateRow': {} },
    ...{ 'onAddRow': {} },
    ...{ 'onRemoveRow': {} },
    ...{ 'onRefreshOptions': {} },
    ...{ class: "mb-4" },
    rows: (__VLS_ctx.flow.indications),
    indicationOptions: (__VLS_ctx.indicationOptionsForEditor),
    disabled: (__VLS_ctx.loading),
    optionsLoading: (__VLS_ctx.indicationOptionsLoading),
    optionsError: (__VLS_ctx.indicationOptionsError),
    description: "Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend.",
}));
const __VLS_11 = __VLS_10({
    ...{ 'onUpdateRow': {} },
    ...{ 'onAddRow': {} },
    ...{ 'onRemoveRow': {} },
    ...{ 'onRefreshOptions': {} },
    ...{ class: "mb-4" },
    rows: (__VLS_ctx.flow.indications),
    indicationOptions: (__VLS_ctx.indicationOptionsForEditor),
    disabled: (__VLS_ctx.loading),
    optionsLoading: (__VLS_ctx.indicationOptionsLoading),
    optionsError: (__VLS_ctx.indicationOptionsError),
    description: "Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend.",
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_13;
let __VLS_14;
let __VLS_15;
const __VLS_16 = {
    onUpdateRow: ((idx, patch) => __VLS_ctx.flow.updateIndicationRow(idx, patch))
};
const __VLS_17 = {
    onAddRow: (...[$event]) => {
        __VLS_ctx.flow.addIndicationRow();
    }
};
const __VLS_18 = {
    onRemoveRow: ((idx) => __VLS_ctx.flow.removeIndicationRow(idx))
};
const __VLS_19 = {
    onRefreshOptions: (__VLS_ctx.loadIndicationCatalog)
};
var __VLS_12;
if (__VLS_ctx.sectionCompletionSummary.totalSections) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info py-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fw-semibold mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small mb-2" },
    });
    (__VLS_ctx.sectionCompletionSummary.completedSections);
    (__VLS_ctx.sectionCompletionSummary.totalSections);
    (__VLS_ctx.sectionCompletionSummary.totalMissingFindings);
    (__VLS_ctx.sectionCompletionSummary.totalMissingClassifications);
    if (!__VLS_ctx.sectionCompletionSummary.incompleteSections.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-success" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "small mb-0 ps-3" },
        });
        for (const [section] of __VLS_getVForSourceType((__VLS_ctx.sectionCompletionSummary.incompleteSections))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (section.name),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (section.title);
            if (section.missingFindings.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (section.missingFindings.join(', '));
            }
            if (section.missingClassifications.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (section.missingClassifications.join(', '));
            }
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "report-preview-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-preview-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-preview-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
(__VLS_ctx.selectedTemplateName || 'Unbenanntes Template');
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "report-status-pill compact" },
    ...{ class: (__VLS_ctx.canSave ? 'is-draft' : 'is-muted') },
});
(__VLS_ctx.reportWordCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-preview-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.reportPatientLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedExaminationDisplayName || 'Nicht gewählt');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.flow.activeReportId ? `#${__VLS_ctx.flow.activeReportId}` : 'Neu');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-preview-sheet" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(__VLS_ctx.renderedReportPreview);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "report-preview-footer" },
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
const __VLS_20 = __VLS_asFunctionalComponent(ReportArtifactsPanel, new ReportArtifactsPanel({
    artifacts: (__VLS_ctx.persistedArtifacts),
}));
const __VLS_21 = __VLS_20({
    artifacts: (__VLS_ctx.persistedArtifacts),
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
if (__VLS_ctx.isDebug) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        ...{ class: "card shadow-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-between align-items-center gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "fw-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body d-flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    (__VLS_ctx.currentRuntimeDraft?.hydratedFrom === 'session_storage' || __VLS_ctx.currentRuntimeDraft?.hydratedFrom === 'draft_api' ? 'wiederhergestellt' : __VLS_ctx.currentRuntimeDraft ? 'initialisiert' : 'leer');
    (__VLS_ctx.flow.draftPersistenceStatus);
    if (__VLS_ctx.flow.lastPersistedDraftAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (new Date(__VLS_ctx.flow.lastPersistedDraftAt).toLocaleTimeString('de-DE'));
    }
    if (__VLS_ctx.flow.draftPersistenceError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning py-2 mb-0" },
        });
        (__VLS_ctx.flow.draftPersistenceError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "small mb-0 bg-light p-2 rounded" },
    });
    (__VLS_ctx.runtimeFindingsPreview);
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
}
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['report-workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['report-workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['report-workspace-title']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['report-workspace-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['report-status-pill']} */ ;
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
/** @type {__VLS_StyleScopedClasses['report-editor-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['report-editor-main']} */ ;
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
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
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
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ps-3']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['report-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-sheet']} */ ;
/** @type {__VLS_StyleScopedClasses['report-preview-footer']} */ ;
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
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
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
            ReportArtifactsPanel: ReportArtifactsPanel,
            flow: flow,
            isDebug: isDebug,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            saveWarnings: saveWarnings,
            lastSaveStatus: lastSaveStatus,
            pendingSaveStatus: pendingSaveStatus,
            currentReportVersion: currentReportVersion,
            persistedArtifacts: persistedArtifacts,
            indicationOptionsLoading: indicationOptionsLoading,
            indicationOptionsError: indicationOptionsError,
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
            currentRuntimeDraft: currentRuntimeDraft,
            currentPayload: currentPayload,
            renderedReportPreview: renderedReportPreview,
            reportWordCount: reportWordCount,
            reportPatientLabel: reportPatientLabel,
            normalizedIndicationsPreview: normalizedIndicationsPreview,
            indicationOptionsForEditor: indicationOptionsForEditor,
            sectionDraftPreview: sectionDraftPreview,
            runtimeFindingsPreview: runtimeFindingsPreview,
            sectionCompletionSummary: sectionCompletionSummary,
            loadIndicationCatalog: loadIndicationCatalog,
            getSectionDraft: getSectionDraft,
            onSectionDraftNote: onSectionDraftNote,
            onSectionDraftToggle: onSectionDraftToggle,
            isSectionConfigured: isSectionConfigured,
            getSectionPreview: getSectionPreview,
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
