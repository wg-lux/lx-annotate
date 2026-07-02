import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import { findingsApi } from '@/api/findingsApi';
import { fetchPatientExaminationDraft } from '@/api/reportDraftApi';
import { buildReportTemplateRuntimePayload, fetchReportTemplateByName, fetchReportTemplatesByExamination } from '@/api/reportTemplatesApi';
import { getFindingDisplayName, mergeFindingClassifications } from '@/api/findings.contract';
import { endpoints } from '@/types/api/endpoints';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { useTerminologyStore } from '@/stores/terminologyStore';
import { fetchPatientTimelineLatest, pickPreferredReportStream, pickPreferredStream } from '@/api/reportingTimelineApi';
const route = useRoute();
const router = useRouter();
const flow = useReportingFlowStore();
const terminology = useTerminologyStore();
const selectedVideoStreamUrl = ref(null);
const selectedFrameStreamUrl = ref(null);
const isContextPanelOpen = ref(true);
const terminologyLoadPromise = ref(null);
const terminologyZipInput = ref(null);
const terminologyImportMessage = ref('');
const patientExaminationOptions = ref([]);
const patientExaminationOptionsLoading = ref(false);
const patientExaminationOptionsError = ref(null);
const draftBootstrapInFlight = ref(null);
const draftBootstrapError = ref(null);
const patientExaminationDetail = ref(null);
const templateReference = ref(null);
const templateReferenceLoading = ref(false);
const templateReferenceError = ref(null);
const templateReferenceKey = ref(null);
const selectedReferenceFindingKey = ref(null);
const findingCatalog = ref([]);
const findingCatalogLoading = ref(false);
const routePatientExaminationId = computed(() => {
    const parsed = Number(route.params.patient_examination_id);
    if (!Number.isFinite(parsed))
        return null;
    return parsed > 0 ? parsed : null;
});
const selectedPatientExaminationId = computed(() => routePatientExaminationId.value ?? flow.patientExaminationId ?? '');
const pe = computed(() => flow.patientExaminationId || ':patient_examination_id');
const navItems = computed(() => [
    {
        label: 'Berichtsvorlagen',
        to: '/reporting/template-builder',
        requiresPatientExamination: false
    },
    { label: 'Arbeitsliste', to: '/reporting', requiresPatientExamination: false },
    { label: 'Falldaten', to: '/reporting/case-setup', requiresPatientExamination: false },
    { label: 'Befunde', to: `/reporting/${pe.value}/findings`, requiresPatientExamination: true },
    {
        label: 'Bericht schreiben',
        to: `/reporting/${pe.value}/report-editor`,
        requiresPatientExamination: true
    },
    {
        label: 'Bilder auswählen',
        to: `/reporting/${pe.value}/frame-selector`,
        requiresPatientExamination: true
    },
    {
        label: 'Report export',
        to: `/reporting/${pe.value}/report-export`,
        requiresPatientExamination: true
    },
    { label: 'Abschluss', to: `/reporting/${pe.value}/finalized`, requiresPatientExamination: true }
]);
const preferredReportStream = computed(() => pickPreferredReportStream(flow.mediaPreload?.latestReport?.streamOptions || []));
const preferredReportDownload = computed(() => preferredReportStream.value
    ? `${preferredReportStream.value}${preferredReportStream.value.includes('?') ? '&' : '?'}download=1`
    : null);
const preferredVideoStream = computed(() => pickPreferredStream(flow.mediaPreload?.latestVideo?.streamOptions || []));
const activeKbModule = computed(() => terminology.activeBundle
    ? terminology.activeModuleName
    : flow.selectedKbModule || 'report_template_examples');
const draftSummaryLabel = computed(() => {
    const draft = flow.currentRuntimeDraft;
    if (!draft)
        return 'leer';
    return draft.hydratedFrom === 'session_storage' || draft.hydratedFrom === 'draft_api'
        ? 'wiederhergestellt'
        : 'initialisiert';
});
const selectedPatientExaminationLabel = computed(() => {
    const selected = patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
        patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
        null;
    if (selected)
        return selected.label;
    return flow.patientExaminationId ? `#${flow.patientExaminationId}` : 'Noch nicht gewählt';
});
const selectedTemplateLabel = computed(() => flow.selectedTemplateName || 'Noch keine Vorlage gewählt');
const selectedTerminologyLabel = computed(() => {
    const field = terminology.medicalFieldLabel;
    const bundle = terminology.activeBundle ? terminology.activeBundleLabel : 'Standard-Terminologie';
    return `${field} · ${bundle}`;
});
const currentStepLabel = computed(() => {
    const current = navItems.value.find((item) => isActive(item.to));
    return current?.label || 'Arbeitsbereich';
});
const mediaPreloadLabel = computed(() => {
    if (flow.mediaPreloadStatus === 'idle')
        return 'nicht geladen';
    if (flow.mediaPreloadStatus === 'loading')
        return 'wird geladen';
    if (flow.mediaPreloadStatus === 'error')
        return 'Fehler';
    return 'bereit';
});
const selectedPatientExaminationOption = computed(() => {
    return (patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
        patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
        null);
});
const currentPayload = computed(() => flow.currentRuntimeDraft?.payload || null);
const caseIdLabel = computed(() => flow.patientExaminationId ? `#${flow.patientExaminationId}` : 'Noch nicht gewählt');
const patientHeaderLabel = computed(() => {
    const timelinePatient = flow.mediaPreload?.patient || null;
    const timelineName = [timelinePatient?.firstName, timelinePatient?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
    if (timelineName)
        return timelineName;
    if (timelinePatient?.patientHash)
        return timelinePatient.patientHash;
    const detailPatient = readRecord(patientExaminationDetail.value?.patient);
    const detailName = [
        readString(detailPatient, 'firstName', 'first_name', 'givenName', 'given_name'),
        readString(detailPatient, 'lastName', 'last_name', 'familyName', 'family_name')
    ]
        .filter(Boolean)
        .join(' ')
        .trim();
    if (detailName)
        return detailName;
    const detailHash = readString(detailPatient, 'patientHash', 'patient_hash', 'hash', 'pseudonym');
    if (detailHash)
        return detailHash;
    if (currentPayload.value?.patient)
        return currentPayload.value.patient;
    return flow.selectedPatientId ? `Patient #${flow.selectedPatientId}` : 'Nicht gewählt';
});
const patientBirthDateLabel = computed(() => {
    const detailPatient = readRecord(patientExaminationDetail.value?.patient);
    const value = flow.mediaPreload?.patient?.dob ||
        readString(detailPatient, 'dob', 'dateOfBirth', 'date_of_birth', 'birthDate', 'birth_date', 'patientDob', 'patient_dob') ||
        readString(patientExaminationDetail.value, 'patientBirthDate', 'patient_birth_date', 'patientDob', 'patient_dob');
    return formatDateLabel(value) || 'Nicht verfügbar';
});
const examinationTypeLabel = computed(() => {
    return (selectedPatientExaminationOption.value?.examinationName ||
        readString(readRecord(patientExaminationDetail.value?.examination), 'displayName', 'display_name', 'name') ||
        readString(patientExaminationDetail.value, 'examinationName', 'examination_name') ||
        currentPayload.value?.examination ||
        'Nicht gewählt');
});
const caseStatusLabel = computed(() => {
    return (readString(patientExaminationDetail.value, 'status', 'workflowStatus', 'workflow_status', 'state') ||
        (flow.lastTemplateValidation
            ? flow.lastTemplateValidation.ok
                ? 'Befund valide'
                : 'Befund offen'
            : flow.currentRuntimeDraft
                ? 'Entwurf'
                : 'Nicht vorbereitet'));
});
const validationStatusLabel = computed(() => {
    if (!flow.lastTemplateValidation)
        return 'ungeprüft';
    return flow.lastTemplateValidation.ok ? 'valide' : 'offen';
});
const validationStatusPillClass = computed(() => {
    if (!flow.lastTemplateValidation)
        return 'is-idle';
    return flow.lastTemplateValidation.ok ? 'is-ready' : 'is-error';
});
const templateSectionsForReference = computed(() => (templateReference.value?.reportSections || [])
    .slice()
    .sort((left, right) => (left.position || 0) - (right.position || 0)));
const catalogFindingsByName = computed(() => {
    const entries = findingCatalog.value.map((finding) => [normalizeKey(finding.name), finding]);
    return new Map(entries);
});
const validationIssueMessagesByFinding = computed(() => {
    const grouped = new Map();
    const addMessages = (findingName, messages) => {
        const key = normalizeKey(findingName);
        const current = grouped.get(key) || [];
        grouped.set(key, Array.from(new Set([...current, ...messages.filter(Boolean)])));
    };
    for (const validator of flow.lastTemplateValidation?.findingsValidators || []) {
        const messages = validator.issues.map((issue) => issue.message);
        if (!validator.ok && !messages.length)
            messages.push(`Regel "${validator.name}" ist offen.`);
        addMessages(validator.finding, messages);
    }
    for (const validator of flow.lastTemplateValidation?.classificationValidators || []) {
        const messages = validator.issues.map((issue) => issue.message);
        if (!validator.ok && !messages.length)
            messages.push(`Klassifikation "${validator.classification}" prüfen.`);
        addMessages(validator.finding, messages);
    }
    for (const validator of flow.lastTemplateValidation?.interventionValidators || []) {
        const messages = validator.issues.map((issue) => issue.message);
        if (!validator.ok && !messages.length)
            messages.push(`Intervention "${validator.intervention}" prüfen.`);
        addMessages(validator.finding, messages);
    }
    for (const validator of flow.lastTemplateValidation?.unitValidators || []) {
        const messages = validator.issues.map((issue) => issue.message);
        if (!validator.ok && !messages.length)
            messages.push(`Einheit "${validator.unit}" prüfen.`);
        addMessages(validator.finding, messages);
    }
    return grouped;
});
const findingStatusRows = computed(() => {
    const rows = [];
    for (const section of templateSectionsForReference.value) {
        const sectionKey = normalizeKey(section.name);
        const sectionTitle = formatKnowledgeName(section.name);
        for (const templateFinding of section.findings || []) {
            rows.push(buildFindingStatusRow({
                findingName: templateFinding.finding,
                sectionKey,
                sectionTitle,
                required: !!templateFinding.required,
                templateFinding
            }));
        }
    }
    if (rows.length)
        return rows;
    return (currentPayload.value?.patientFindings || []).map((finding) => buildFindingStatusRow({
        findingName: finding.finding,
        sectionKey: 'runtime_draft',
        sectionTitle: 'Lokaler Entwurf',
        required: false,
        templateFinding: null
    }));
});
const findingStatusSections = computed(() => {
    const sections = new Map();
    for (const row of findingStatusRows.value) {
        if (!sections.has(row.sectionKey)) {
            sections.set(row.sectionKey, {
                key: row.sectionKey,
                title: row.sectionTitle,
                rows: []
            });
        }
        sections.get(row.sectionKey)?.rows.push(row);
    }
    return Array.from(sections.values());
});
const findingProgressSummary = computed(() => {
    const rows = findingStatusRows.value;
    if (!rows.length)
        return 'Keine Befunde';
    const complete = rows.filter((row) => row.status === 'complete').length;
    const open = rows.filter((row) => row.status === 'warning' || row.status === 'missing').length;
    return open ? `${complete}/${rows.length} vollständig · ${open} offen` : `${complete}/${rows.length} vollständig`;
});
const routeReferenceFindingKey = computed(() => {
    const hash = typeof route.hash === 'string' ? route.hash : '';
    const match = hash.match(/^#finding-(.+)$/);
    return match ? normalizeKey(match[1]) : null;
});
const activeReferenceFindingKey = computed(() => {
    const availableKeys = new Set(findingStatusRows.value.map((row) => row.normalizedKey));
    if (selectedReferenceFindingKey.value && availableKeys.has(selectedReferenceFindingKey.value)) {
        return selectedReferenceFindingKey.value;
    }
    if (routeReferenceFindingKey.value && availableKeys.has(routeReferenceFindingKey.value)) {
        return routeReferenceFindingKey.value;
    }
    return (findingStatusRows.value.find((row) => row.status === 'warning' || row.status === 'missing')
        ?.normalizedKey ||
        findingStatusRows.value[0]?.normalizedKey ||
        null);
});
const activeReferenceFinding = computed(() => findingStatusRows.value.find((row) => row.normalizedKey === activeReferenceFindingKey.value) || null);
const activeFindingInstances = computed(() => {
    const active = activeReferenceFinding.value;
    if (!active)
        return [];
    return instancesForFinding(active.findingName);
});
const activeFindingCatalogDefinition = computed(() => {
    const active = activeReferenceFinding.value;
    if (!active)
        return null;
    return catalogFindingsByName.value.get(normalizeKey(active.findingName)) || null;
});
const activeFindingDescription = computed(() => {
    const description = activeFindingCatalogDefinition.value?.description?.trim();
    return description || 'Keine Beschreibung in der geladenen KB-Definition.';
});
const activeReferenceClassifications = computed(() => {
    const active = activeReferenceFinding.value;
    if (!active)
        return [];
    const templateClassifications = active.templateFinding?.classifications || [];
    const catalogClassifications = mergeFindingClassifications(activeFindingCatalogDefinition.value);
    const catalogByName = new Map(catalogClassifications.map((classification) => [normalizeKey(classification.name), classification]));
    const templateKeys = templateClassifications.map((classification) => normalizeKey(classification.classification));
    const source = templateClassifications.length > 0
        ? templateClassifications.map((classification) => ({
            key: normalizeKey(classification.classification),
            name: classification.classification,
            required: !!classification.required
        }))
        : catalogClassifications.map((classification) => ({
            key: normalizeKey(classification.name),
            name: classification.name,
            required: !!classification.required
        }));
    return source
        .filter((classification, index, all) => {
        if (templateKeys.length && !templateKeys.includes(classification.key))
            return false;
        return all.findIndex((entry) => entry.key === classification.key) === index;
    })
        .map((classification) => {
        const catalog = catalogByName.get(classification.key);
        const choices = (catalog?.choices || [])
            .map((choice) => choice.displayName || choice.name)
            .filter(Boolean);
        return {
            key: classification.key,
            label: catalog?.displayName || formatKnowledgeName(classification.name),
            required: classification.required,
            choicesLabel: choices.length ? `Werte: ${choices.join(', ')}` : '',
            description: catalog?.description || ''
        };
    });
});
const activeAdviceRows = computed(() => {
    const active = activeReferenceFinding.value;
    if (!active)
        return [];
    return [
        ...interventionAdviceRows(active.findingName),
        ...unitAdviceRows(active.findingName)
    ];
});
const activeSuggestedActions = computed(() => {
    const active = activeReferenceFinding.value;
    if (!active)
        return [];
    const suggestions = [
        ...collectValidatorSuggestions(interventionValidatorsForFinding(active.findingName)),
        ...collectValidatorSuggestions(unitValidatorsForFinding(active.findingName)),
        ...collectIssueSuggestions(flow.lastTemplateValidation?.issues || [])
    ];
    return Array.from(new Set(suggestions));
});
const kbReferenceSubtitle = computed(() => {
    const moduleName = flow.selectedKbModule || activeKbModule.value;
    const templateName = templateReference.value?.name || flow.selectedTemplateName;
    if (!templateName)
        return `${moduleName} · kein Template`;
    return `${moduleName} · ${templateName}`;
});
const nextStepHint = computed(() => {
    if (!flow.patientExaminationId) {
        return 'Wählen Sie zuerst eine Patientenuntersuchung, um Befunde und Bericht zu bearbeiten.';
    }
    if (!flow.currentRuntimeDraft) {
        return 'Der Entwurf wird vorbereitet. Danach können Sie direkt mit den Befunden starten.';
    }
    if (route.path.includes('/report-editor')) {
        return 'Bericht prüfen, Text ergänzen und anschließend zum Abschluss wechseln.';
    }
    if (route.path.includes('/frame-selector')) {
        return 'Passende Bilder auswählen und danach den Bericht abschließen.';
    }
    return 'Beginnen Sie mit den Befunden und arbeiten Sie sich dann zum Bericht vor.';
});
function openUrl(url) {
    if (!url)
        return;
    window.open(url, '_blank', 'noopener,noreferrer');
}
function selectVideoStream(url) {
    selectedVideoStreamUrl.value = url;
}
function selectFrameStream(url) {
    selectedFrameStreamUrl.value = url;
}
function openTerminologyZipPicker() {
    terminologyImportMessage.value = '';
    terminologyZipInput.value?.click();
}
async function importTerminologyZip(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    terminologyImportMessage.value = '';
    try {
        await terminology.importBundle(file);
        terminologyImportMessage.value = 'Terminologiepaket importiert und geladen.';
    }
    catch (error) {
        terminologyImportMessage.value =
            terminology.error ||
                error?.response?.data?.detail ||
                error?.message ||
                'Terminologiepaket konnte nicht importiert werden.';
    }
    finally {
        input.value = '';
    }
}
function readRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function readString(record, ...keys) {
    if (!record)
        return null;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
        if (typeof value === 'number' && Number.isFinite(value))
            return String(value);
    }
    return null;
}
function normalizeKey(value) {
    return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}
function formatKnowledgeName(value) {
    const normalized = value.replace(/[_-]/g, ' ').trim();
    if (!normalized)
        return 'Unbenannt';
    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}
function formatDateLabel(value) {
    if (!value)
        return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleDateString('de-DE');
}
function findingAnchorId(findingName) {
    return `finding-${normalizeKey(findingName)}`;
}
function getFindingLabel(findingName) {
    const finding = catalogFindingsByName.value.get(normalizeKey(findingName));
    return finding ? getFindingDisplayName(finding) : formatKnowledgeName(findingName);
}
function instancesForFinding(findingName) {
    const key = normalizeKey(findingName);
    return (currentPayload.value?.patientFindings || []).filter((finding) => normalizeKey(finding.finding) === key);
}
function requiredClassificationsMissing(templateFinding, instances) {
    const required = (templateFinding?.classifications || []).filter((classification) => classification.required);
    return required
        .filter((classification) => {
        const key = normalizeKey(classification.classification);
        return !instances.some((instance) => instance.classificationChoices.some((choice) => normalizeKey(choice.classification) === key &&
            typeof choice.classificationChoice === 'string' &&
            choice.classificationChoice.trim()));
    })
        .map((classification) => formatKnowledgeName(classification.classification));
}
function buildFindingStatusRow(params) {
    const normalizedKey = normalizeKey(params.findingName);
    const instances = instancesForFinding(params.findingName);
    const validationMessages = validationIssueMessagesByFinding.value.get(normalizedKey) || [];
    const missingClassifications = requiredClassificationsMissing(params.templateFinding, instances);
    const messages = Array.from(new Set([
        ...validationMessages,
        ...(params.required && !instances.length ? ['Dieser Befund ist im Template erforderlich.'] : []),
        ...(missingClassifications.length
            ? [`Erforderliche Klassifikationen fehlen: ${missingClassifications.join(', ')}.`]
            : [])
    ]));
    let status = 'empty';
    if (params.required && !instances.length)
        status = 'missing';
    else if (validationMessages.length || missingClassifications.length)
        status = 'warning';
    else if (instances.length)
        status = 'complete';
    return {
        key: `${params.sectionKey}:${normalizedKey}`,
        normalizedKey,
        findingName: params.findingName,
        label: getFindingLabel(params.findingName),
        sectionKey: params.sectionKey,
        sectionTitle: params.sectionTitle,
        anchorId: findingAnchorId(params.findingName),
        required: params.required,
        instanceCount: instances.length,
        status,
        statusLabel: findingStatusLabel(status, params.required),
        iconClass: findingStatusIconClass(status),
        messages,
        templateFinding: params.templateFinding
    };
}
function findingStatusLabel(status, required) {
    if (status === 'complete')
        return 'vollständig';
    if (status === 'warning')
        return 'prüfen';
    if (status === 'missing')
        return 'fehlt';
    return required ? 'offen' : 'optional';
}
function findingStatusIconClass(status) {
    if (status === 'complete')
        return 'ni ni-check-bold';
    if (status === 'warning')
        return 'ni ni-alert-circle-exc';
    if (status === 'missing')
        return 'ni ni-fat-remove';
    return 'ni ni-fat-add';
}
function findingStatusTarget(row) {
    const patientExaminationId = flow.patientExaminationId || routePatientExaminationId.value;
    if (!patientExaminationId)
        return { path: route.path, hash: `#${row.anchorId}` };
    return {
        path: `/reporting/${patientExaminationId}/findings`,
        hash: `#${row.anchorId}`
    };
}
function validatorsForFinding(validators, findingName) {
    const key = normalizeKey(findingName);
    return (validators || []).filter((validator) => normalizeKey(validator.finding) === key);
}
function interventionValidatorsForFinding(findingName) {
    return validatorsForFinding(flow.lastTemplateValidation?.interventionValidators, findingName);
}
function unitValidatorsForFinding(findingName) {
    return validatorsForFinding(flow.lastTemplateValidation?.unitValidators, findingName);
}
function interventionAdviceRows(findingName) {
    return interventionValidatorsForFinding(findingName).map((validator) => ({
        key: `intervention:${validator.name}`,
        kind: 'Intervention',
        title: formatKnowledgeName(validator.intervention),
        detail: validator.ok ? 'Regel erfüllt' : `Erforderlich nach Regel "${validator.name}"`,
        ok: validator.ok,
        messages: validator.issues.map((issue) => issue.message)
    }));
}
function unitAdviceRows(findingName) {
    return unitValidatorsForFinding(findingName).map((validator) => ({
        key: `unit:${validator.name}`,
        kind: 'Einheit',
        title: validator.unit,
        detail: validator.ok
            ? `${formatKnowledgeName(validator.classification)} verwendet die erwartete Einheit.`
            : `${formatKnowledgeName(validator.classification)} erwartet "${validator.unit}".`,
        ok: validator.ok,
        messages: validator.issues.map((issue) => issue.message)
    }));
}
function collectIssueSuggestions(issues) {
    return issues.flatMap((issue) => [
        ...extractStringList(issue.details?.suggestedActions),
        ...extractStringList(issue.details?.suggested_actions),
        ...extractStringList(issue.details?.recommendations)
    ]);
}
function collectValidatorSuggestions(validators) {
    return validators.flatMap((validator) => [
        ...extractStringList(validator.hint?.suggestedActions),
        ...extractStringList(validator.hint?.suggested_actions),
        ...extractStringList(validator.hint?.suggestions),
        ...extractStringList(validator.hint?.recommendations),
        ...collectIssueSuggestions(validator.issues)
    ]);
}
function extractStringList(value) {
    if (typeof value === 'string' && value.trim())
        return [value.trim()];
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => {
        if (typeof entry === 'string')
            return entry.trim();
        if (!entry || typeof entry !== 'object')
            return '';
        const record = entry;
        return ((typeof record.label === 'string' && record.label.trim()) ||
            (typeof record.message === 'string' && record.message.trim()) ||
            (typeof record.action === 'string' && record.action.trim()) ||
            '');
    })
        .filter((entry) => Boolean(entry));
}
function formatRuntimeFindingInstance(instance) {
    if (!instance.classificationChoices.length)
        return 'Keine Klassifikation gesetzt';
    return instance.classificationChoices
        .map((choice) => {
        const descriptors = choice.descriptors
            .map((descriptor) => `${formatKnowledgeName(descriptor.classificationChoiceDescriptor)}: ${descriptor.descriptorValue}`)
            .join(', ');
        const base = `${formatKnowledgeName(choice.classification)} = ${formatKnowledgeName(choice.classificationChoice)}`;
        return descriptors ? `${base} (${descriptors})` : base;
    })
        .join(' · ');
}
function ensureTerminologyBundlesLoaded() {
    if (terminology.activeBundle || terminology.bundles.length || terminology.error) {
        return Promise.resolve();
    }
    if (terminologyLoadPromise.value)
        return terminologyLoadPromise.value;
    const task = terminology
        .loadBundles()
        .catch((error) => {
        console.error('Failed to load terminology bundles:', error);
    })
        .finally(() => {
        terminologyLoadPromise.value = null;
    });
    terminologyLoadPromise.value = task;
    return task;
}
async function loadTemplateReferenceForSelection() {
    const moduleName = flow.selectedKbModule || activeKbModule.value;
    const templateName = flow.selectedTemplateName;
    if (!moduleName || !templateName) {
        templateReference.value = null;
        templateReferenceKey.value = null;
        templateReferenceError.value = null;
        return;
    }
    const nextKey = `${moduleName}:${templateName}`;
    if (templateReferenceKey.value === nextKey && templateReference.value)
        return;
    templateReferenceLoading.value = true;
    templateReferenceError.value = null;
    templateReferenceKey.value = nextKey;
    try {
        const payload = await fetchReportTemplateByName(moduleName, templateName);
        if (templateReferenceKey.value !== nextKey)
            return;
        templateReference.value = payload;
    }
    catch (error) {
        if (templateReferenceKey.value !== nextKey)
            return;
        templateReference.value = null;
        templateReferenceError.value =
            error?.response?.data?.detail ||
                error?.message ||
                'KB-Referenz konnte nicht geladen werden.';
    }
    finally {
        if (templateReferenceKey.value === nextKey) {
            templateReferenceLoading.value = false;
        }
    }
}
async function loadFindingCatalogForExamination(examinationId) {
    if (!examinationId) {
        findingCatalog.value = [];
        return;
    }
    findingCatalogLoading.value = true;
    try {
        const rows = await findingsApi.getExaminationFindings(examinationId);
        findingCatalog.value = Array.isArray(rows) ? rows : [];
    }
    catch {
        findingCatalog.value = [];
    }
    finally {
        findingCatalogLoading.value = false;
    }
}
function toPositiveInteger(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function resolvePatientKey(raw, patientExaminationId) {
    const patient = raw.patient && typeof raw.patient === 'object' ? raw.patient : null;
    const patientHash = (typeof patient?.patient_hash === 'string' && patient.patient_hash.trim()) ||
        (typeof patient?.patientHash === 'string' && patient.patientHash.trim()) ||
        (typeof raw.patient_hash === 'string' && raw.patient_hash.trim()) ||
        (typeof raw.patientHash === 'string' && raw.patientHash.trim());
    if (patientHash)
        return patientHash;
    const patientId = toPositiveInteger(patient?.id ?? raw.patient_id ?? raw.patientId);
    return patientId ? `patient_${patientId}` : `patient_examination_${patientExaminationId}`;
}
function extractExaminers(raw) {
    const candidates = [
        raw.examiners,
        raw.examiner_names,
        raw.examinerNames,
        raw.examination?.examiners,
        raw.examination?.examiner_names,
        raw.examination?.examinerNames
    ];
    const values = candidates.flatMap((candidate) => {
        if (!Array.isArray(candidate))
            return [];
        return candidate
            .map((entry) => {
            if (typeof entry === 'string') {
                const normalized = entry.trim();
                return normalized || null;
            }
            if (!entry || typeof entry !== 'object')
                return null;
            const row = entry;
            const examinerKey = (typeof row.examiner_hash === 'string' && row.examiner_hash.trim()) ||
                (typeof row.examinerHash === 'string' && row.examinerHash.trim()) ||
                (typeof row.username === 'string' && row.username.trim()) ||
                (typeof row.email === 'string' && row.email.trim()) ||
                (typeof row.display_name === 'string' && row.display_name.trim()) ||
                (typeof row.displayName === 'string' && row.displayName.trim()) ||
                (typeof row.full_name === 'string' && row.full_name.trim()) ||
                (typeof row.fullName === 'string' && row.fullName.trim()) ||
                (typeof row.name === 'string' && row.name.trim());
            if (examinerKey)
                return examinerKey;
            const firstName = (typeof row.first_name === 'string' && row.first_name.trim()) ||
                (typeof row.firstName === 'string' && row.firstName.trim()) ||
                '';
            const lastName = (typeof row.last_name === 'string' && row.last_name.trim()) ||
                (typeof row.lastName === 'string' && row.lastName.trim()) ||
                '';
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName)
                return fullName;
            const examinerId = toPositiveInteger(row.id);
            return examinerId ? `examiner_${examinerId}` : null;
        })
            .filter((value) => Boolean(value));
    });
    return Array.from(new Set(values));
}
function extractExaminationName(raw) {
    return ((typeof raw.examination?.name === 'string' && raw.examination.name.trim()) ||
        (typeof raw.examination_name === 'string' && raw.examination_name.trim()) ||
        (typeof raw.examination === 'string' && raw.examination.trim()) ||
        '');
}
function isGastroenterologyExaminationName(value) {
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return false;
    return [
        'gastro',
        'kolon',
        'colon',
        'colo',
        'rekt',
        'rect',
        'endoskop',
        'endoscop',
        'gastroskop',
        'gastroscop',
        'koloskop',
        'colonoscop',
        'colonoscopy',
        'magen',
        'darm',
        'duoden',
        'sigmo',
        'procto',
        'ösoph',
        'oesoph',
        'esoph',
        'egd',
        'ercp',
        'eus',
        'upper gi',
        'lower gi'
    ].some((keyword) => normalized.includes(keyword));
}
function isPatientExaminationAllowedForMedicalField(option) {
    if (terminology.selectedMedicalField !== 'gastroenterology')
        return true;
    return isGastroenterologyExaminationName(option.examinationName);
}
function extractPatientId(raw) {
    return toPositiveInteger(raw.patient?.id ?? raw.patient_id ?? raw.patientId);
}
function extractExaminationId(raw) {
    return toPositiveInteger(raw.examination?.id ?? raw.examination_id ?? raw.examinationId);
}
function extractDraftDate(raw) {
    const value = (typeof raw.date_start === 'string' && raw.date_start) ||
        (typeof raw.dateStart === 'string' && raw.dateStart) ||
        (typeof raw.date === 'string' && raw.date) ||
        null;
    if (!value)
        return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
function extractIndicationRows(raw) {
    const nestedExamination = raw.examination && typeof raw.examination === 'object'
        ? raw.examination
        : null;
    const candidates = [
        raw.indications,
        raw.examination_indications,
        raw.examinationIndications,
        nestedExamination?.indications,
        nestedExamination?.examination_indications,
        nestedExamination?.examinationIndications
    ];
    const rows = candidates.flatMap((candidate) => {
        if (!Array.isArray(candidate))
            return [];
        return candidate
            .map((entry) => {
            if (!entry || typeof entry !== 'object')
                return null;
            const row = entry;
            const examinationIndicationId = toPositiveInteger(row.examinationIndicationId ??
                row.examination_indication_id ??
                row.indicationId ??
                row.indication_id ??
                row.id);
            const indicationChoiceId = toPositiveInteger(row.indicationChoiceId ??
                row.indication_choice_id ??
                row.choiceId ??
                row.choice_id ??
                row.choice?.id);
            if (examinationIndicationId == null)
                return null;
            return {
                examinationIndicationId,
                indicationChoiceId
            };
        })
            .filter((row) => row !== null);
    });
    if (!rows.length) {
        return [{ examinationIndicationId: null, indicationChoiceId: null }];
    }
    const seen = new Set();
    return rows.filter((row) => {
        const key = `${row.examinationIndicationId}:${row.indicationChoiceId ?? 'null'}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function isRuntimePayload(value) {
    if (!value || typeof value !== 'object')
        return false;
    const payload = value;
    return (typeof payload.patient === 'string' &&
        Array.isArray(payload.examiners) &&
        typeof payload.examination === 'string' &&
        Array.isArray(payload.patientFindings));
}
function stringField(record, ...keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return null;
}
function normalizePatientExaminationOption(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const row = raw;
    const id = toPositiveInteger(row.id);
    if (id === null)
        return null;
    const examinationName = (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
        (typeof row.examination?.name === 'string' && row.examination.name.trim()) ||
        (typeof row.examination === 'string' && row.examination.trim()) ||
        'Untersuchung';
    const dateStartRaw = typeof row.date_start === 'string'
        ? row.date_start
        : typeof row.dateStart === 'string'
            ? row.dateStart
            : '';
    const dateLabel = dateStartRaw ? new Date(dateStartRaw).toLocaleDateString('de-DE') : '';
    return {
        id,
        label: dateLabel ? `#${id} · ${examinationName} · ${dateLabel}` : `#${id} · ${examinationName}`,
        examinationName,
        patientId: toPositiveInteger(row.patient?.id ?? row.patient_id ?? row.patientId),
        examinationId: toPositiveInteger(row.examination?.id ?? row.examination_id ?? row.examinationId)
    };
}
function upsertPatientExaminationOption(option) {
    if (!isPatientExaminationAllowedForMedicalField(option))
        return;
    const next = patientExaminationOptions.value.slice();
    const index = next.findIndex((entry) => entry.id === option.id);
    if (index >= 0)
        next[index] = option;
    else
        next.push(option);
    patientExaminationOptions.value = next.sort((left, right) => right.id - left.id);
}
async function fetchPatientExaminationOptions(patientId) {
    patientExaminationOptionsLoading.value = true;
    patientExaminationOptionsError.value = null;
    try {
        const response = await axiosInstance.get(r(endpoints.examination.patientExaminationList), {
            params: { patient_id: patientId }
        });
        const rows = Array.isArray(response.data?.results)
            ? response.data.results
            : Array.isArray(response.data)
                ? response.data
                : [];
        patientExaminationOptions.value = rows
            .map(normalizePatientExaminationOption)
            .filter((option) => option !== null)
            .filter(isPatientExaminationAllowedForMedicalField)
            .sort((left, right) => right.id - left.id);
    }
    catch (error) {
        patientExaminationOptions.value = [];
        patientExaminationOptionsError.value =
            error?.response?.data?.detail ||
                error?.message ||
                'Patientenuntersuchungen konnten nicht geladen werden.';
    }
    finally {
        patientExaminationOptionsLoading.value = false;
    }
}
async function ensureCurrentPatientExaminationOption(patientExaminationId) {
    const exists = patientExaminationOptions.value.some((entry) => entry.id === patientExaminationId);
    if (exists)
        return;
    try {
        const response = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
        if (response.data && typeof response.data === 'object') {
            patientExaminationDetail.value = response.data;
        }
        const option = normalizePatientExaminationOption(response.data);
        if (option)
            upsertPatientExaminationOption(option);
    }
    catch {
        // Keep the selector usable even if detail hydration fails.
    }
}
function getNavigationTargetForPatientExamination(patientExaminationId) {
    const match = route.path.match(/^\/reporting\/[^/]+\/(.+)$/);
    return match
        ? `/reporting/${patientExaminationId}/${match[1]}`
        : `/reporting/${patientExaminationId}/findings`;
}
async function onPatientExaminationSelect(rawValue) {
    const patientExaminationId = toPositiveInteger(rawValue);
    if (patientExaminationId === null)
        return;
    const selectedOption = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) ?? null;
    flow.setPatientExaminationContext({
        patientExaminationId,
        selectedPatientId: selectedOption?.patientId ?? flow.selectedPatientId,
        selectedExaminationId: selectedOption?.examinationId ?? flow.selectedExaminationId
    });
    patientExaminationDetail.value = null;
    selectedReferenceFindingKey.value = null;
    await router.push(getNavigationTargetForPatientExamination(patientExaminationId));
}
async function bootstrapRuntimeDraft(patientExaminationId, option) {
    const detailResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
    const detail = detailResponse.data && typeof detailResponse.data === 'object'
        ? detailResponse.data
        : {};
    patientExaminationDetail.value = detail;
    const detailPatientId = extractPatientId(detail);
    const detailExaminationId = extractExaminationId(detail);
    flow.setCaseSelection({
        selectedPatientId: option?.patientId ?? detailPatientId ?? flow.selectedPatientId,
        selectedExaminationId: option?.examinationId ?? detailExaminationId ?? flow.selectedExaminationId
    });
    const examinationName = extractExaminationName(detail);
    const templates = examinationName
        ? await fetchReportTemplatesByExamination(activeKbModule.value, examinationName)
        : [];
    const selectedTemplate = (flow.selectedTemplateName &&
        templates.find((template) => template.name === flow.selectedTemplateName)) ||
        templates[0] ||
        null;
    const selectedExaminationId = option?.examinationId ?? detailExaminationId;
    const catalogRows = selectedExaminationId
        ? await findingsApi.getExaminationFindings(selectedExaminationId)
        : [];
    findingCatalog.value = Array.isArray(catalogRows) ? catalogRows : [];
    const findingsById = new Map(findingCatalog.value.map((finding) => [finding.id, finding]));
    const payload = await buildReportTemplateRuntimePayload({
        moduleName: activeKbModule.value,
        patientExaminationId,
        patient: resolvePatientKey(detail, patientExaminationId),
        examiners: extractExaminers(detail),
        examination: selectedTemplate?.examination || examinationName,
        getFindingById: (findingId) => findingsById.get(findingId)
    });
    flow.setTemplateSelection({
        moduleName: activeKbModule.value,
        templateName: selectedTemplate?.name || null
    });
    flow.setIndications(extractIndicationRows(detail));
    flow.setRuntimeDraft({
        draftId: `draft_${patientExaminationId}`,
        patientExaminationId,
        moduleName: activeKbModule.value,
        templateName: selectedTemplate?.name || null,
        payload: {
            ...payload,
            ...(extractDraftDate(detail) ? { date: extractDraftDate(detail) } : {})
        },
        hydratedFrom: 'backend_context',
        updatedAt: new Date().toISOString()
    });
}
async function hydrateRuntimeDraftFromDraftApi(patientExaminationId) {
    const response = await fetchPatientExaminationDraft(patientExaminationId);
    const draft = response?.draft && typeof response.draft === 'object' ? response.draft : {};
    const draftModuleName = stringField(draft, 'moduleName', 'module_name') || activeKbModule.value;
    const draftTemplateName = stringField(draft, 'templateName', 'template_name');
    const updatedAt = response?.updatedAt ?? response?.updated_at ?? null;
    if (!isRuntimePayload(draft.payload)) {
        flow.markDraftPersistenceHydrated(updatedAt);
        return false;
    }
    flow.setTemplateSelection({
        moduleName: draftModuleName,
        templateName: draftTemplateName
    });
    flow.setRuntimeDraft({
        draftId: `draft_${patientExaminationId}`,
        patientExaminationId,
        moduleName: draftModuleName,
        templateName: draftTemplateName,
        payload: draft.payload,
        hydratedFrom: 'draft_api',
        updatedAt: updatedAt || new Date().toISOString()
    });
    flow.markDraftPersistenceHydrated(updatedAt);
    return true;
}
async function ensureRuntimeDraft(patientExaminationId) {
    const existingDraft = flow.runtimeDraftsByPatientExaminationId[String(patientExaminationId)] || null;
    if (existingDraft) {
        try {
            const detailResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
            const detail = detailResponse.data && typeof detailResponse.data === 'object'
                ? detailResponse.data
                : {};
            patientExaminationDetail.value = detail;
            flow.setCaseSelection({
                selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
                selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
            });
            flow.setIndications(extractIndicationRows(detail));
            await loadFindingCatalogForExamination(extractExaminationId(detail) ?? flow.selectedExaminationId);
        }
        catch {
            // Keep the local draft usable even if detail hydration fails.
        }
        flow.setTemplateSelection({
            moduleName: existingDraft.moduleName,
            templateName: existingDraft.templateName
        });
        return;
    }
    const restoredFromDraftApi = await hydrateRuntimeDraftFromDraftApi(patientExaminationId);
    if (restoredFromDraftApi) {
        try {
            const detailResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
            const detail = detailResponse.data && typeof detailResponse.data === 'object'
                ? detailResponse.data
                : {};
            patientExaminationDetail.value = detail;
            flow.setCaseSelection({
                selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
                selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
            });
            flow.setIndications(extractIndicationRows(detail));
            await loadFindingCatalogForExamination(extractExaminationId(detail) ?? flow.selectedExaminationId);
        }
        catch {
            // Keep persisted draft usable even if detail hydration fails.
        }
        return;
    }
    const option = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null;
    await bootstrapRuntimeDraft(patientExaminationId, option);
    flow.markDraftPersistenceHydrated(null);
}
async function hydrateDraftForRoutePatientExamination(patientExaminationId) {
    if (draftBootstrapInFlight.value) {
        await draftBootstrapInFlight.value;
        return;
    }
    const option = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null;
    if (flow.patientExaminationId !== patientExaminationId ||
        (option?.patientId ?? flow.selectedPatientId) !== flow.selectedPatientId ||
        (option?.examinationId ?? flow.selectedExaminationId) !== flow.selectedExaminationId) {
        flow.setPatientExaminationContext({
            patientExaminationId,
            selectedPatientId: option?.patientId ?? flow.selectedPatientId,
            selectedExaminationId: option?.examinationId ?? flow.selectedExaminationId,
            preserveTemplateSelection: true
        });
    }
    const task = (async () => {
        draftBootstrapError.value = null;
        try {
            await ensureTerminologyBundlesLoaded();
            await ensureRuntimeDraft(patientExaminationId);
        }
        catch (error) {
            draftBootstrapError.value =
                error?.response?.data?.detail ||
                    error?.message ||
                    'Der lokale Reporting-Entwurf konnte nicht initialisiert werden.';
        }
        finally {
            draftBootstrapInFlight.value = null;
        }
    })();
    draftBootstrapInFlight.value = task;
    await task;
}
async function refreshMediaPreload() {
    if (!flow.selectedPatientId) {
        flow.clearMediaPreload();
        return;
    }
    const patientExaminationId = routePatientExaminationId.value || flow.patientExaminationId;
    flow.setMediaPreloadLoading();
    try {
        const payload = await fetchPatientTimelineLatest({
            patientId: flow.selectedPatientId,
            patientExaminationId
        });
        flow.setMediaPreload(payload);
        selectedVideoStreamUrl.value = pickPreferredStream(payload.latestVideo?.streamOptions || []);
        selectedFrameStreamUrl.value = payload.latestFrames[0]?.streamUrl || null;
    }
    catch (error) {
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail || error?.message;
        const message = status === 404
            ? 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
            : status === 400
                ? 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.'
                : status === 403
                    ? 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.'
                    : `Fehler beim Laden der Medien: ${detail || 'unbekannt'}`;
        flow.setMediaPreloadError(message);
    }
}
function isActive(path) {
    return route.path === path;
}
function isStepDisabled(item) {
    return Boolean(item.requiresPatientExamination && !flow.patientExaminationId);
}
function stepStatusLabel(item) {
    if (isActive(item.to))
        return 'Aktuell';
    if (isStepDisabled(item))
        return 'Fall wählen';
    if (item.requiresPatientExamination)
        return 'Bereit';
    return 'Verfügbar';
}
watch([() => flow.selectedPatientId, routePatientExaminationId], async ([patientId, patientExaminationId]) => {
    if (patientId) {
        await fetchPatientExaminationOptions(patientId);
    }
    else {
        patientExaminationOptions.value = [];
        patientExaminationOptionsError.value = null;
        patientExaminationDetail.value = null;
        findingCatalog.value = [];
    }
    if (patientExaminationId) {
        await ensureCurrentPatientExaminationOption(patientExaminationId);
        await hydrateDraftForRoutePatientExamination(patientExaminationId);
    }
}, { immediate: true });
watch(() => terminology.selectedMedicalField, async () => {
    if (flow.selectedPatientId) {
        await fetchPatientExaminationOptions(flow.selectedPatientId);
    }
});
watch([() => flow.selectedKbModule, () => flow.selectedTemplateName, activeKbModule], async () => {
    selectedReferenceFindingKey.value = null;
    await loadTemplateReferenceForSelection();
}, { immediate: true });
watch(() => flow.selectedExaminationId, async (examinationId) => {
    await loadFindingCatalogForExamination(examinationId);
}, { immediate: true });
watch([() => flow.selectedPatientId, () => flow.patientExaminationId, routePatientExaminationId], async ([patientId]) => {
    if (!patientId) {
        flow.clearMediaPreload();
        return;
    }
    await refreshMediaPreload();
}, { immediate: true });
onMounted(() => {
    ensureTerminologyBundlesLoaded();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-left-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-right-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['is-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-index']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-section']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['is-complete']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['is-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['is-missing']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-count']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-focus-block']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-focus-block']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-focus-block']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-classification-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-advice-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-group']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-classification-precedence']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-instance-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-suggestion-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-advice-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-advice-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-advice-row']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-right-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-right-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['context-quick-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-shell container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "reporting-command-bar mb-3" },
    'aria-label': "Reporting-Kontext",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-command-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold tracking-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-case-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label form-label-sm mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column flex-lg-row gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.onPatientExaminationSelect($event.target.value);
        } },
    ...{ class: "form-select" },
    'data-testid': "patient-examination-select",
    value: (__VLS_ctx.selectedPatientExaminationId),
    disabled: (__VLS_ctx.patientExaminationOptionsLoading || !__VLS_ctx.patientExaminationOptions.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
(__VLS_ctx.patientExaminationOptionsLoading
    ? 'Patientenuntersuchungen werden geladen...'
    : __VLS_ctx.patientExaminationOptions.length
        ? 'Bitte Patientenuntersuchung wählen'
        : 'Keine Patientenuntersuchungen verfügbar');
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.patientExaminationOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (option.id),
        value: (option.id),
    });
    (option.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.importTerminologyZip) },
    ref: "terminologyZipInput",
    ...{ class: "visually-hidden" },
    type: "file",
    accept: ".zip,application/zip",
});
/** @type {typeof __VLS_ctx.terminologyZipInput} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openTerminologyZipPicker) },
    ...{ class: "btn btn-outline-secondary" },
    type: "button",
    disabled: (__VLS_ctx.terminology.importing),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-single-copy-04 me-1" },
    'aria-hidden': "true",
});
(__VLS_ctx.terminology.importing ? 'Terminologie wird importiert…' : 'Terminologie importieren');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshMediaPreload) },
    ...{ class: "btn btn-outline-secondary" },
    disabled: (__VLS_ctx.flow.mediaPreloadStatus === 'loading' || !__VLS_ctx.flow.selectedPatientId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-refresh-02 me-1" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isContextPanelOpen = !__VLS_ctx.isContextPanelOpen;
        } },
    ...{ class: "btn btn-outline-secondary" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-settings-gear-65 me-1" },
    'aria-hidden': "true",
});
(__VLS_ctx.isContextPanelOpen ? 'Kontext ausblenden' : 'Kontext einblenden');
if (__VLS_ctx.patientExaminationOptionsError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-danger mt-1" },
    });
    (__VLS_ctx.patientExaminationOptionsError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item is-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.currentStepLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.patientHeaderLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.patientBirthDateLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.caseIdLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.caseStatusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.examinationTypeLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedTemplateLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedTerminologyLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.draftSummaryLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.mediaPreloadLabel);
if (__VLS_ctx.terminologyImportMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted mt-2" },
    });
    (__VLS_ctx.terminologyImportMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-workspace-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "reporting-left-rail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm finding-status-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex align-items-center justify-content-between gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
(__VLS_ctx.findingProgressSummary);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-status-pill" },
    ...{ class: (__VLS_ctx.validationStatusPillClass) },
});
(__VLS_ctx.validationStatusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-0" },
});
if (__VLS_ctx.findingStatusSections.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "finding-status-list" },
    });
    for (const [section] of __VLS_getVForSourceType((__VLS_ctx.findingStatusSections))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            key: (section.key),
            ...{ class: "finding-status-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "finding-status-section-title" },
        });
        (section.title);
        for (const [row] of __VLS_getVForSourceType((section.rows))) {
            const __VLS_0 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
            // @ts-ignore
            const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
                ...{ 'onClick': {} },
                key: (row.key),
                to: (__VLS_ctx.findingStatusTarget(row)),
                ...{ class: "finding-status-row" },
                ...{ class: ([
                        `is-${row.status}`,
                        { 'is-selected': row.normalizedKey === __VLS_ctx.activeReferenceFindingKey }
                    ]) },
            }));
            const __VLS_2 = __VLS_1({
                ...{ 'onClick': {} },
                key: (row.key),
                to: (__VLS_ctx.findingStatusTarget(row)),
                ...{ class: "finding-status-row" },
                ...{ class: ([
                        `is-${row.status}`,
                        { 'is-selected': row.normalizedKey === __VLS_ctx.activeReferenceFindingKey }
                    ]) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_1));
            let __VLS_4;
            let __VLS_5;
            let __VLS_6;
            const __VLS_7 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.findingStatusSections.length))
                        return;
                    __VLS_ctx.selectedReferenceFindingKey = row.normalizedKey;
                }
            };
            __VLS_3.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "finding-status-icon" },
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: (row.iconClass) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "finding-status-copy" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "finding-status-label" },
            });
            (row.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "finding-status-meta" },
            });
            (row.statusLabel);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "finding-status-count" },
            });
            (row.instanceCount);
            var __VLS_3;
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "p-3 small text-muted" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm workflow-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex align-items-center justify-content-between gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "small text-muted" },
});
(__VLS_ctx.currentStepLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-3" },
});
if (__VLS_ctx.draftBootstrapError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning py-2 mb-3" },
    });
    (__VLS_ctx.draftBootstrapError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav flex-column gap-1" },
});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
    (item.to);
    if (!__VLS_ctx.isStepDisabled(item)) {
        const __VLS_8 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            to: (item.to),
            ...{ class: "workflow-step-btn btn btn-sm text-start" },
            'aria-current': (__VLS_ctx.isActive(item.to) ? 'page' : undefined),
            ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
        }));
        const __VLS_10 = __VLS_9({
            to: (item.to),
            ...{ class: "workflow-step-btn btn btn-sm text-start" },
            'aria-current': (__VLS_ctx.isActive(item.to) ? 'page' : undefined),
            ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-index" },
        });
        (index + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-meta" },
        });
        (__VLS_ctx.stepStatusLabel(item));
        var __VLS_11;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "workflow-step-btn btn btn-sm text-start is-disabled" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-index" },
        });
        (index + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-meta" },
        });
        (__VLS_ctx.stepStatusLabel(item));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "reporting-main-region" },
});
if (__VLS_ctx.isContextPanelOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card shadow-sm mb-3 context-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header d-flex justify-content-between align-items-center gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "context-status-pill" },
        ...{ class: (`is-${__VLS_ctx.flow.mediaPreloadStatus}`) },
    });
    (__VLS_ctx.mediaPreloadLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-quick-grid mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.draftSummaryLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.selectedPatientExaminationLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.selectedTemplateLabel);
    if (__VLS_ctx.draftBootstrapError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning py-2 mt-2 mb-0" },
        });
        (__VLS_ctx.draftBootstrapError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.mediaPreloadLabel);
    if (__VLS_ctx.flow.mediaPreloadError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning py-2 mt-2 mb-0" },
        });
        (__VLS_ctx.flow.mediaPreloadError);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.flow.mediaPreload ? 'Bericht, Video und Frames geladen' : 'Noch leer');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.nextStepHint);
    if (__VLS_ctx.flow.mediaPreload) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row g-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "media-context-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-1" },
        });
        if (__VLS_ctx.flow.mediaPreload.latestReport) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (__VLS_ctx.flow.mediaPreload.latestReport.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (__VLS_ctx.flow.mediaPreload.latestReport.documentType || 'n/a');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-flex flex-wrap gap-2" },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestReport.streamOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isContextPanelOpen))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                                return;
                            __VLS_ctx.openUrl(option.url);
                        } },
                    key: (`report-${option.type}`),
                    ...{ class: "btn btn-outline-secondary btn-sm" },
                });
                (option.type);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-grid gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isContextPanelOpen))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                            return;
                        __VLS_ctx.openUrl(__VLS_ctx.preferredReportStream);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
                disabled: (!__VLS_ctx.preferredReportStream),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isContextPanelOpen))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                            return;
                        __VLS_ctx.openUrl(__VLS_ctx.preferredReportDownload);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
                disabled: (!__VLS_ctx.preferredReportDownload),
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "media-context-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-1" },
        });
        if (__VLS_ctx.flow.mediaPreload.latestVideo) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (__VLS_ctx.flow.mediaPreload.latestVideo.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-flex flex-wrap gap-2" },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestVideo.streamOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isContextPanelOpen))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload.latestVideo))
                                return;
                            __VLS_ctx.selectVideoStream(option.url);
                        } },
                    key: (`video-${option.type}`),
                    ...{ class: "btn btn-outline-secondary btn-sm" },
                });
                (option.type);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-grid gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isContextPanelOpen))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestVideo))
                            return;
                        __VLS_ctx.selectVideoStream(__VLS_ctx.preferredVideoStream);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
                disabled: (!__VLS_ctx.preferredVideoStream),
            });
            if (__VLS_ctx.selectedVideoStreamUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
                    ...{ class: "w-100 mt-2 rounded border" },
                    controls: true,
                    src: (__VLS_ctx.selectedVideoStreamUrl),
                });
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "media-context-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-1" },
        });
        if (__VLS_ctx.flow.mediaPreload.latestFrames.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small d-grid gap-2" },
            });
            for (const [frame] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestFrames))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isContextPanelOpen))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload.latestFrames.length))
                                return;
                            __VLS_ctx.selectFrameStream(frame.streamUrl);
                        } },
                    key: (`${frame.videoId}-${frame.frameNumber}`),
                    ...{ class: "btn btn-outline-secondary btn-sm text-start" },
                });
                (frame.frameNumber);
                (frame.category || 'fallback');
            }
            if (__VLS_ctx.selectedFrameStreamUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    ...{ class: "img-fluid rounded border mt-1" },
                    src: (__VLS_ctx.selectedFrameStreamUrl),
                    alt: "Selected frame stream preview",
                });
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
}
const __VLS_12 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "reporting-right-rail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm kb-reference-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex justify-content-between align-items-start gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
(__VLS_ctx.kbReferenceSubtitle);
if (__VLS_ctx.templateReferenceLoading || __VLS_ctx.findingCatalogLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "context-status-pill is-loading" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.templateReferenceError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning py-2 small" },
    });
    (__VLS_ctx.templateReferenceError);
}
if (__VLS_ctx.activeReferenceFinding) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kb-focus-block mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.activeReferenceFinding.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.activeFindingDescription);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kb-reference-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    if (__VLS_ctx.activeReferenceClassifications.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kb-classification-list" },
        });
        for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.activeReferenceClassifications))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (classification.key),
                ...{ class: "kb-classification-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (classification.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "kb-classification-precedence" },
                ...{ class: ({ 'is-required': classification.required }) },
            });
            (classification.required ? 'erforderlich' : 'optional');
            if (classification.choicesLabel) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                (classification.choicesLabel);
            }
            if (classification.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                (classification.description);
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kb-reference-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    if (__VLS_ctx.activeFindingInstances.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "runtime-instance-list" },
        });
        for (const [instance] of __VLS_getVForSourceType((__VLS_ctx.activeFindingInstances))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (instance.localId || instance.finding),
                ...{ class: "runtime-instance-row" },
            });
            (__VLS_ctx.formatRuntimeFindingInstance(instance));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kb-reference-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    if (__VLS_ctx.activeAdviceRows.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kb-advice-list" },
        });
        for (const [row] of __VLS_getVForSourceType((__VLS_ctx.activeAdviceRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (row.key),
                ...{ class: "kb-advice-row" },
                ...{ class: ({ 'is-ok': row.ok, 'is-warning': !row.ok }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (row.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (row.kind);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (row.detail);
            for (const [message] of __VLS_getVForSourceType((row.messages))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    key: (message),
                });
                (message);
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
    if (__VLS_ctx.activeSuggestedActions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kb-reference-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kb-suggestion-list" },
        });
        for (const [suggestion] of __VLS_getVForSourceType((__VLS_ctx.activeSuggestedActions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (suggestion),
                ...{ class: "kb-suggestion-row" },
            });
            (suggestion);
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
}
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-main']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-lg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-copy-04']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-refresh-02']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-settings-gear-65']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['is-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-left-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-0']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-list']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-section']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['is-selected']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-label']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-status-count']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-index']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['is-disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-index']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-main-region']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['context-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['context-quick-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-right-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-focus-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-group']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-classification-list']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-classification-row']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-classification-precedence']} */ ;
/** @type {__VLS_StyleScopedClasses['is-required']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-group']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-instance-list']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-instance-row']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-group']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-advice-list']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-advice-row']} */ ;
/** @type {__VLS_StyleScopedClasses['is-ok']} */ ;
/** @type {__VLS_StyleScopedClasses['is-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-reference-group']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-suggestion-list']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-suggestion-row']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            flow: flow,
            terminology: terminology,
            selectedVideoStreamUrl: selectedVideoStreamUrl,
            selectedFrameStreamUrl: selectedFrameStreamUrl,
            isContextPanelOpen: isContextPanelOpen,
            terminologyZipInput: terminologyZipInput,
            terminologyImportMessage: terminologyImportMessage,
            patientExaminationOptions: patientExaminationOptions,
            patientExaminationOptionsLoading: patientExaminationOptionsLoading,
            patientExaminationOptionsError: patientExaminationOptionsError,
            draftBootstrapError: draftBootstrapError,
            templateReferenceLoading: templateReferenceLoading,
            templateReferenceError: templateReferenceError,
            selectedReferenceFindingKey: selectedReferenceFindingKey,
            findingCatalogLoading: findingCatalogLoading,
            selectedPatientExaminationId: selectedPatientExaminationId,
            navItems: navItems,
            preferredReportStream: preferredReportStream,
            preferredReportDownload: preferredReportDownload,
            preferredVideoStream: preferredVideoStream,
            draftSummaryLabel: draftSummaryLabel,
            selectedPatientExaminationLabel: selectedPatientExaminationLabel,
            selectedTemplateLabel: selectedTemplateLabel,
            selectedTerminologyLabel: selectedTerminologyLabel,
            currentStepLabel: currentStepLabel,
            mediaPreloadLabel: mediaPreloadLabel,
            caseIdLabel: caseIdLabel,
            patientHeaderLabel: patientHeaderLabel,
            patientBirthDateLabel: patientBirthDateLabel,
            examinationTypeLabel: examinationTypeLabel,
            caseStatusLabel: caseStatusLabel,
            validationStatusLabel: validationStatusLabel,
            validationStatusPillClass: validationStatusPillClass,
            findingStatusSections: findingStatusSections,
            findingProgressSummary: findingProgressSummary,
            activeReferenceFindingKey: activeReferenceFindingKey,
            activeReferenceFinding: activeReferenceFinding,
            activeFindingInstances: activeFindingInstances,
            activeFindingDescription: activeFindingDescription,
            activeReferenceClassifications: activeReferenceClassifications,
            activeAdviceRows: activeAdviceRows,
            activeSuggestedActions: activeSuggestedActions,
            kbReferenceSubtitle: kbReferenceSubtitle,
            nextStepHint: nextStepHint,
            openUrl: openUrl,
            selectVideoStream: selectVideoStream,
            selectFrameStream: selectFrameStream,
            openTerminologyZipPicker: openTerminologyZipPicker,
            importTerminologyZip: importTerminologyZip,
            findingStatusTarget: findingStatusTarget,
            formatRuntimeFindingInstance: formatRuntimeFindingInstance,
            onPatientExaminationSelect: onPatientExaminationSelect,
            refreshMediaPreload: refreshMediaPreload,
            isActive: isActive,
            isStepDisabled: isStepDisabled,
            stepStatusLabel: stepStatusLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
