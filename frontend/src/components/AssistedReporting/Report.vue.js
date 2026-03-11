import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { findingsApi } from '@/api/findingsApi';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useRequirementStore } from '@/stores/requirementStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import PatientAdder from '@/components/CaseGenerator/PatientAdder.vue';
import MedicalBlock from './MedicalBlock.vue';
import FindingsDetail from '../RequirementReport/FindingsDetail.vue';
import AddableFindingsDetail from '../RequirementReport/AddableFindingsDetail.vue';
import RequirementIssues from '../RequirementReport/RequirementIssues.vue';
import { endpoints } from '@/types/api/endpoints';
import { useDebug } from '@/composables/useDebug';
import { formatDateOnly, mergeClassificationSelections, normalizeInterventions } from './reportSubmissionUtils';
import { extractFindingId, getClassificationDisplayName, getFindingDisplayName } from '@/api/findings.contract';
// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const requirementStore = useRequirementStore();
const patientExaminationStore = usePatientExaminationStore();
const patientFindingStore = usePatientFindingStore();
const { loading: findingSelectorsLoading, ensureCatalogLoaded, ensurePatientFindingsLoaded, getFindingById, getFindingNameById, getAttachedFindingIds, isFindingAttached } = useFindingSelectors();
// --- API ---
const LOOKUP_BASE = '/api/lookup';
const REPORT_TEMPLATE_BASE = '/base_api/report-templates';
const { isDebug } = useDebug();
// --- Component State ---
const selectedPatientId = ref(null);
const selectedExaminationId = ref(null);
const currentPatientExaminationId = ref(null);
const lookupToken = ref(null);
const lookup = ref(null);
const error = ref(null);
const loading = ref(false);
const showCreatePatientModal = ref(false);
const successMessage = ref(null);
const isRestarting = ref(false); // Prevent infinite restart loops
const selectedKbModule = ref('report_template_examples');
const selectedTemplateName = ref('star_upper_gi_main');
const reportTemplate = ref(null);
const reportTemplateLoading = ref(false);
const reportTemplateOptions = ref([]);
const autoSelectionAppliedKey = ref(null);
const hasManualRequirementSelection = ref(false);
const templateDetailsLoading = ref(false);
const templateFindingDetails = ref([]);
const findingClassificationsCache = ref({});
const currentReportId = ref(null);
const currentReportVersion = ref(null);
const lastSaveStatus = ref(null);
const saveSubmissionLoading = ref(false);
const saveWarnings = ref([]);
const lastHistoryContext = ref(null);
const lastRequirementGuidance = ref(null);
const lastPersistedArtifacts = ref(null);
const localFindingClassificationSelections = ref({});
const addedFindingIds = ref(new Set());
const previousReportTextsLoading = ref(false);
const previousReportTexts = ref([]);
const currentStep = ref(1);
const goToStep = (step) => {
    currentStep.value = Math.min(Math.max(step, 1), 4);
};
// --- Computed from Store ---
const patients = computed(() => {
    const result = patientStore.patientsWithDisplayName;
    console.log('Patients with displayName:', result); // Zum Debuggen
    return result;
});
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => {
    const result = examinationStore.examinationsDropdown;
    console.log('Examinations dropdown:', result); // Debug: Check available examinations
    return result;
});
const isLoadingExaminations = computed(() => examinationStore.loading);
// --- Computed from Local State ---
const requirementSets = computed(() => {
    const sets = lookup.value?.requirementSets ?? [];
    console.log('Computing requirementSets:', sets); // Debug log
    return sets;
});
const selectedRequirementSetIds = computed({
    get: () => lookup.value?.selectedRequirementSetIds ?? [],
    set: (val) => { if (lookup.value)
        lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed(() => lookup.value?.availableFindings ?? []);
const findingsSectionLoading = computed(() => findingSelectorsLoading.value || loading.value);
const templateDetailSummary = computed(() => {
    const totalFindings = templateFindingDetails.value.length;
    const matchedFindings = templateFindingDetails.value.filter((d) => !!d.matchedFinding).length;
    return { totalFindings, matchedFindings };
});
const watchingLookup = ref(false);
watch(lookup, (newVal, oldVal) => {
    if (watchingLookup.value)
        return; // Prevent recursive calls
    watchingLookup.value = true;
    console.log('Lookup changed:', { newVal, oldVal });
    if (newVal && newVal.patientExaminationId !== currentPatientExaminationId.value) {
        currentPatientExaminationId.value = newVal.patientExaminationId;
        console.log('Updated currentPatientExaminationId to:', currentPatientExaminationId.value);
    }
    watchingLookup.value = false;
}, { deep: true });
const watchingRequirementSetIds = ref(false);
watch(selectedRequirementSetIds, (newVal, oldVal) => {
    if (watchingRequirementSetIds.value)
        return; // Prevent recursive calls
    watchingRequirementSetIds.value = true;
    console.log('Selected Requirement Set IDs changed:', { newVal, oldVal });
    if (newVal !== oldVal) {
        // Trigger evaluation when selected sets change
        requirementStore.setCurrentRequirementSetIds(newVal);
    }
    // Removed: requirementStore.deleteRequirementSetById(oldVal[0]); // This was incorrect and caused issues
    watchingRequirementSetIds.value = false;
});
const watchingPatientExaminationIds = ref(false);
watch(currentPatientExaminationId, (newVal, oldVal) => {
    if (watchingPatientExaminationIds.value)
        return; // Prevent recursive calls
    watchingPatientExaminationIds.value = true;
    console.log('Current Examination ID changed:', { newVal, oldVal });
    if (newVal !== oldVal) {
        // Trigger evaluation when examination changes
        patientExaminationStore.setCurrentPatientExaminationId(newVal);
    }
    watchingPatientExaminationIds.value = false;
});
const selectionsPretty = computed(() => JSON.stringify({
    token: lookupToken.value,
    selectedRequirementSetIds: selectedRequirementSetIds.value,
}, null, 2));
const normalizeKey = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
const fetchFindingClassificationsCached = async (findingId) => {
    const cached = findingClassificationsCache.value[findingId];
    if (cached)
        return cached;
    const normalized = await findingsApi.getFindingClassifications(findingId);
    findingClassificationsCache.value = {
        ...findingClassificationsCache.value,
        [findingId]: normalized
    };
    return normalized;
};
const resolvePatientExaminationId = () => {
    if (lookup.value?.patientExaminationId)
        return lookup.value.patientExaminationId;
    return currentPatientExaminationId.value;
};
const refreshAddedFindingIds = async () => {
    const patientExaminationId = resolvePatientExaminationId();
    if (!patientExaminationId) {
        addedFindingIds.value = new Set();
        return;
    }
    try {
        await ensurePatientFindingsLoaded(patientExaminationId);
        addedFindingIds.value = new Set(getAttachedFindingIds(patientExaminationId));
    }
    catch (e) {
        console.warn('Failed to refresh added findings state:', axiosError(e));
    }
};
const getTimelinePatientExaminationId = (item) => {
    if (Number.isFinite(item.patientExaminationId))
        return Number(item.patientExaminationId);
    const nestedId = Number(item.patientExamination?.id);
    return Number.isFinite(nestedId) ? nestedId : null;
};
const formatTimelineDate = (value) => {
    if (!value)
        return 'ohne Datum';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime()))
        return value;
    return dt.toLocaleString('de-DE');
};
const fetchPreviousReportTexts = async () => {
    if (!selectedPatientId.value) {
        previousReportTexts.value = [];
        return;
    }
    previousReportTextsLoading.value = true;
    try {
        const timelineRes = await axiosInstance.get(r(endpoints.media.patientTimeline(selectedPatientId.value)));
        const rows = (Array.isArray(timelineRes.data?.results) ? timelineRes.data.results : timelineRes.data);
        const currentExamId = currentPatientExaminationId.value;
        const entries = (Array.isArray(rows) ? rows : [])
            .map((item, index) => {
            const text = String(item?.anonymizedText || item?.text || '').trim();
            if (!text)
                return null;
            const mediaType = item?.mediaType ? String(item.mediaType).toLowerCase() : null;
            const looksLikeReport = !mediaType ||
                mediaType.includes('report') ||
                mediaType.includes('pdf') ||
                mediaType.includes('document');
            if (!looksLikeReport)
                return null;
            const patientExaminationId = getTimelinePatientExaminationId(item);
            const id = Number(item?.id);
            return {
                id: Number.isFinite(id) ? id : index + 1,
                mediaType,
                createdAt: item?.createdAt || null,
                documentType: typeof item?.documentType === 'string' && item.documentType.trim().length > 0
                    ? item.documentType
                    : null,
                patientExaminationId,
                text
            };
        })
            .filter((entry) => !!entry)
            .filter((entry) => entry.patientExaminationId == null || entry.patientExaminationId !== currentExamId)
            .sort((a, b) => {
            const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTs - aTs;
        })
            .slice(0, 8);
        previousReportTexts.value = entries;
    }
    catch (e) {
        previousReportTexts.value = [];
        console.warn('Failed to fetch previous report texts:', axiosError(e));
    }
    finally {
        previousReportTextsLoading.value = false;
    }
};
const refreshTemplateFindingDetails = async () => {
    if (!reportTemplate.value || !selectedExaminationId.value) {
        templateFindingDetails.value = [];
        return;
    }
    templateDetailsLoading.value = true;
    try {
        const examinationFindings = (await findingsApi.getExaminationFindings(selectedExaminationId.value));
        const byName = new Map();
        for (const finding of examinationFindings) {
            if (finding.name)
                byName.set(normalizeKey(finding.name), finding);
            if (finding.nameDe)
                byName.set(normalizeKey(finding.nameDe), finding);
        }
        let currentAddedFindingIds = new Set(addedFindingIds.value);
        if (currentPatientExaminationId.value && currentAddedFindingIds.size === 0) {
            await refreshAddedFindingIds();
            currentAddedFindingIds = new Set(addedFindingIds.value);
        }
        const details = [];
        for (const section of reportTemplate.value.reportSections || []) {
            for (const finding of section.findings || []) {
                const templateName = finding.finding || '';
                const matched = byName.get(normalizeKey(templateName)) || null;
                const templateClassifications = (finding.classifications || []).map((c) => c.classification);
                const requiredTemplateClassifications = (finding.classifications || [])
                    .filter((c) => !!c.required)
                    .map((c) => c.classification);
                let apiClassifications = [];
                if (matched) {
                    const classes = await fetchFindingClassificationsCached(matched.id);
                    apiClassifications = classes.map((c) => getClassificationDisplayName(c));
                }
                const apiClassificationKeySet = new Set(apiClassifications.map((name) => normalizeKey(name)));
                const missingRequiredClassifications = requiredTemplateClassifications.filter((requiredName) => !apiClassificationKeySet.has(normalizeKey(requiredName)));
                details.push({
                    sectionName: section.name,
                    templateFindingName: templateName,
                    templateClassifications,
                    requiredTemplateClassifications,
                    apiClassifications,
                    missingRequiredClassifications,
                    isAddedToPatientExamination: matched !== null &&
                        currentAddedFindingIds.has(matched.id),
                    matchedFinding: matched
                        ? {
                            id: matched.id,
                            displayName: getFindingDisplayName(matched),
                            description: matched.description
                        }
                        : null
                });
            }
        }
        templateFindingDetails.value = details;
    }
    catch (e) {
        templateFindingDetails.value = [];
        console.warn('Failed to enrich template detail data:', axiosError(e));
    }
    finally {
        templateDetailsLoading.value = false;
    }
};
const makeSelectionKey = (token, templateName) => `${token || 'no-token'}::${templateName}`;
const collectTemplateFindingNames = (template) => {
    const names = new Set();
    for (const section of template.reportSections || []) {
        for (const finding of section.findings || []) {
            if (finding?.finding) {
                names.add(normalizeKey(finding.finding));
            }
        }
    }
    return names;
};
const getMatchingRequirementSetIdsFromTemplate = (template) => {
    const findingNames = collectTemplateFindingNames(template);
    if (!findingNames.size) {
        return [];
    }
    const matching = (lookup.value?.requirementSets || []).filter((set) => {
        if (findingNames.has(normalizeKey(set.name)) || findingNames.has(normalizeKey(set.type || ''))) {
            return true;
        }
        const requirementsForSet = lookup.value?.requirementsBySet?.[String(set.id)] || [];
        return requirementsForSet.some((req) => findingNames.has(normalizeKey(req.name)));
    });
    return matching.map((s) => s.id);
};
const sameIdSet = (a, b) => {
    if (a.length !== b.length)
        return false;
    const aa = new Set(a);
    if (aa.size !== b.length)
        return false;
    for (const id of b) {
        if (!aa.has(id))
            return false;
    }
    return true;
};
const applyTemplateToRequirementSelection = async () => {
    if (!lookupToken.value || !reportTemplate.value || !lookup.value)
        return;
    if (hasManualRequirementSelection.value)
        return;
    const selectionKey = makeSelectionKey(lookupToken.value, reportTemplate.value.name);
    if (autoSelectionAppliedKey.value === selectionKey)
        return;
    const matchedSetIds = getMatchingRequirementSetIdsFromTemplate(reportTemplate.value);
    if (!matchedSetIds.length) {
        autoSelectionAppliedKey.value = selectionKey;
        return;
    }
    if (!sameIdSet(selectedRequirementSetIds.value, matchedSetIds)) {
        selectedRequirementSetIds.value = matchedSetIds;
        requirementStore.setCurrentRequirementSetIds(matchedSetIds);
        await patchLookup({ selectedRequirementSetIds: matchedSetIds });
        await triggerRecompute();
        await evaluateRequirementsOnChange();
    }
    autoSelectionAppliedKey.value = selectionKey;
};
// --- Finding Management Methods ---
const isFindingAddedToExamination = (findingId) => {
    if (addedFindingIds.value.has(findingId))
        return true;
    return isFindingAttached(lookup.value?.patientExaminationId ?? null, findingId);
};
const onFindingAddedToExamination = async (findingIdOrData, findingName) => {
    // Handle both old and new signatures
    let findingId;
    let name;
    let selectedClassifications = [];
    let response = null;
    if (typeof findingIdOrData === 'number') {
        // Old signature: (findingId: number, findingName: string)
        findingId = findingIdOrData;
        name = getFindingNameById(findingId, findingName);
    }
    else {
        // New signature: (data: { findingId, findingName?, selectedClassifications, response })
        findingId = findingIdOrData.findingId;
        name = getFindingNameById(findingId, findingIdOrData.findingName);
        selectedClassifications = findingIdOrData.selectedClassifications || [];
        response = findingIdOrData.response;
    }
    console.log('Finding added to examination:', {
        findingId,
        name,
        selectedClassifications: selectedClassifications.length,
        hasResponse: !!response
    });
    // Enhanced success message with classification info
    const classificationCount = selectedClassifications.length;
    const message = classificationCount > 0
        ? `Befund "${name}" wurde erfolgreich hinzugefügt mit ${classificationCount} Klassifikation${classificationCount !== 1 ? 'en' : ''}!`
        : `Befund "${name}" wurde erfolgreich hinzugefügt!`;
    successMessage.value = message;
    setTimeout(() => {
        successMessage.value = null;
    }, 5000); // Longer display for more detailed message
    await refreshAddedFindingIds();
    await refreshTemplateFindingDetails();
    await fetchPreviousReportTexts();
    // Trigger requirement evaluation after finding is added
    setTimeout(() => {
        evaluateRequirementsOnChange();
    }, 500); // Small delay to ensure finding is fully added
};
const onClassificationUpdated = (findingId, classificationId, choiceId) => {
    // Handle when a classification choice is updated
    console.log('Classification updated:', { findingId, classificationId, choiceId });
    const next = { ...localFindingClassificationSelections.value };
    const findingSelections = { ...(next[findingId] || {}) };
    if (choiceId == null) {
        delete findingSelections[classificationId];
    }
    else {
        findingSelections[classificationId] = choiceId;
    }
    if (Object.keys(findingSelections).length) {
        next[findingId] = findingSelections;
    }
    else {
        delete next[findingId];
    }
    localFindingClassificationSelections.value = next;
    // Get finding and classification names for better user feedback
    const findingName = getFindingNameById(findingId);
    // Show success message
    const message = choiceId
        ? `Klassifikation für "${findingName}" wurde erfolgreich ausgewählt!`
        : `Klassifikation für "${findingName}" wurde zurückgesetzt!`;
    successMessage.value = message;
    setTimeout(() => {
        successMessage.value = null;
    }, 3000);
    // Trigger requirement evaluation after classification update
    setTimeout(() => {
        evaluateRequirementsOnChange();
    }, 300); // Small delay to ensure update is processed
};
const loadFindingsData = async () => {
    // Load all findings data if not already loaded
    await ensureCatalogLoaded();
    await ensurePatientFindingsLoaded(resolvePatientExaminationId());
    await refreshAddedFindingIds();
};
// --- Requirement Evaluation Methods ---
// Evaluate requirements when findings are added/removed
const evaluateRequirementsOnChange = async () => {
    if (!lookup.value || !lookupToken.value) {
        console.log('Skipping evaluation: lookup or token not available');
        return;
    }
    if (!lookup.value.patientExaminationId) {
        console.log('Skipping evaluation: patientExaminationId not available in lookup', lookup.value);
        return;
    }
    try {
        console.log('Evaluating requirements based on current lookup data...');
        // Use the requirement store to evaluate from lookup data
        await requirementStore.evaluateFromLookupData(lookup.value);
        // Update UI with evaluation results
        console.log('Requirements evaluated successfully');
        // Show success message
        successMessage.value = 'Anforderungen wurden erfolgreich evaluiert!';
        setTimeout(() => {
            successMessage.value = null;
        }, 3000);
    }
    catch (err) {
        console.error('Error evaluating requirements:', err);
        error.value = 'Fehler bei der Evaluierung der Anforderungen: ' + (err instanceof Error ? err.message : String(err));
    }
};
// Evaluate specific requirement set
const evaluateRequirementSet = async (requirementSetId) => {
    if (!lookup.value || !lookupToken.value)
        return;
    try {
        console.log('Evaluating requirement set:', requirementSetId);
        // Use the requirement store to evaluate specific requirement set
        await requirementStore.evaluateRequirementSet(requirementSetId, lookup.value.patientExaminationId);
        console.log('Requirement set evaluated successfully');
    }
    catch (err) {
        console.error('Error evaluating requirement set:', err);
        error.value = 'Fehler bei der Evaluierung des Anforderungssets: ' + (err instanceof Error ? err.message : String(err));
    }
};
// Get evaluation status for a requirement set
const getRequirementSetEvaluationStatus = (requirementSetId) => {
    return requirementStore.getRequirementSetEvaluationStatus(requirementSetId);
};
// Get evaluation status for a specific requirement
const getRequirementEvaluationStatus = (requirementId) => {
    return requirementStore.getRequirementEvaluationStatus(requirementId);
};
// Computed properties for evaluation status
const evaluationSummary = computed(() => {
    if (!lookup.value)
        return null;
    const totalSets = requirementSets.value.length;
    const evaluatedSets = requirementSets.value.filter(rs => requirementStore.getRequirementSetEvaluationStatus(rs.id)).length;
    return {
        totalSets,
        evaluatedSets,
        completionPercentage: totalSets > 0 ? Math.round((evaluatedSets / totalSets) * 100) : 0
    };
});
// --- Methods ---
function axiosError(e) {
    if (e?.response?.data?.detail)
        return e.response.data.detail;
    if (e?.message)
        return e.message;
    return 'Unbekannter Fehler';
}
const buildPatientDataPayload = () => {
    const patient = selectedPatientId.value ? patientStore.getPatientById(selectedPatientId.value) : null;
    if (!patient)
        return {};
    return {
        patientBirthDate: formatDateOnly(patient.dob),
        patientGender: patient.gender || null,
        firstName: patient.firstName || null,
        lastName: patient.lastName || null,
        center: patient.center || null
    };
};
const fetchNormalizedFindingsPayload = async () => {
    if (!currentPatientExaminationId.value)
        return [];
    try {
        const rows = (await findingsApi.listPatientFindings(currentPatientExaminationId.value));
        const normalizedRows = (Array.isArray(rows) ? rows : [])
            .map((row) => {
            const findingId = extractFindingId(row?.finding);
            const isInactive = row?.isActive === false || row?.is_active === false;
            if (findingId == null || isInactive)
                return null;
            return {
                finding: findingId,
                classifications: mergeClassificationSelections(findingId, row.classifications, localFindingClassificationSelections.value),
                interventions: normalizeInterventions(row.interventions)
            };
        });
        return normalizedRows.filter((row) => row !== null);
    }
    catch (e) {
        console.warn('Failed to fetch patient-findings for report save, falling back to examination findings:', axiosError(e));
    }
    try {
        const res = await axiosInstance.get(r(endpoints.examination.patientExaminationFindings(currentPatientExaminationId.value)));
        const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data);
        return (Array.isArray(rows) ? rows : [])
            .map((row) => Number(row?.id))
            .filter((id) => Number.isFinite(id))
            .map((findingId) => ({
            finding: findingId,
            classifications: mergeClassificationSelections(findingId, undefined, localFindingClassificationSelections.value),
            interventions: []
        }));
    }
    catch (e) {
        console.warn('Fallback findings fetch also failed:', axiosError(e));
        return [];
    }
};
const buildEditorPayloadForSubmission = () => ({
    source: 'assisted_reporting',
    lookupToken: lookupToken.value,
    selectedRequirementSetIds: selectedRequirementSetIds.value,
    templateName: reportTemplate.value?.name || null,
    savedAt: new Date().toISOString()
});
const buildRenderedTextForSubmission = () => {
    // No structured report text editor is wired here yet; keep rendered text empty for now.
    return '';
};
async function saveReportSubmission(status) {
    if (!currentPatientExaminationId.value) {
        error.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    if (!reportTemplate.value?.name) {
        error.value = 'Kein Report-Template ausgewählt.';
        return;
    }
    error.value = null;
    saveSubmissionLoading.value = true;
    lastSaveStatus.value = status;
    try {
        const findings = await fetchNormalizedFindingsPayload();
        const payload = {
            ...(currentReportId.value ? { reportId: currentReportId.value } : {}),
            ...(currentReportVersion.value ? { expectedVersion: currentReportVersion.value } : {}),
            patientExaminationId: currentPatientExaminationId.value,
            templateName: reportTemplate.value.name,
            status,
            editorPayload: buildEditorPayloadForSubmission(),
            renderedText: buildRenderedTextForSubmission(),
            patientData: buildPatientDataPayload(),
            indications: [],
            findings,
            selectedRequirementSetIds: selectedRequirementSetIds.value
        };
        const res = await axiosInstance.post(r(endpoints.report.saveReportSubmission), payload);
        const data = res.data;
        currentReportId.value = data.report.id;
        currentReportVersion.value = data.report.version;
        lastSaveStatus.value = data.report.status || status;
        saveWarnings.value = Array.isArray(data.warnings) ? data.warnings : [];
        lastHistoryContext.value = (data.historyContext || null);
        lastRequirementGuidance.value = (data.requirementGuidance || null);
        lastPersistedArtifacts.value = data.persistedArtifacts || null;
        const verb = data.created ? 'erstellt' : 'aktualisiert';
        successMessage.value = `Bericht wurde als ${status === 'final' ? 'final' : 'Entwurf'} ${verb} (Version ${data.report.version}).`;
        setTimeout(() => {
            if (successMessage.value?.includes('Bericht wurde'))
                successMessage.value = null;
        }, 4000);
    }
    catch (e) {
        const versionConflictMessage = e?.response?.data?.expectedVersion;
        if (typeof versionConflictMessage === 'string' && versionConflictMessage.toLowerCase().includes('version conflict')) {
            error.value = `Versionskonflikt beim Speichern: ${versionConflictMessage}`;
        }
        else {
            error.value = `Fehler beim Speichern des Berichts: ${axiosError(e)}`;
        }
    }
    finally {
        saveSubmissionLoading.value = false;
    }
}
function applyLookup(partial) {
    if (!lookup.value) {
        lookup.value = partial;
    }
    else {
        lookup.value = { ...lookup.value, ...partial };
    }
}
async function fetchReportTemplateByName(moduleName, templateName) {
    reportTemplateLoading.value = true;
    try {
        const res = await axiosInstance.get(`${REPORT_TEMPLATE_BASE}/${moduleName}/${templateName}`);
        reportTemplate.value = res.data;
        if (reportTemplate.value &&
            !reportTemplateOptions.value.some((t) => t.name === reportTemplate.value.name)) {
            reportTemplateOptions.value = [reportTemplate.value, ...reportTemplateOptions.value];
        }
        await refreshTemplateFindingDetails();
    }
    catch (e) {
        reportTemplate.value = null;
        templateFindingDetails.value = [];
        console.warn('Failed to fetch report template by name:', axiosError(e));
    }
    finally {
        reportTemplateLoading.value = false;
    }
}
async function fetchReportTemplateByExamination(moduleName, examinationName) {
    if (!examinationName) {
        reportTemplate.value = null;
        reportTemplateOptions.value = [];
        return;
    }
    reportTemplateLoading.value = true;
    try {
        const res = await axiosInstance.get(`${REPORT_TEMPLATE_BASE}/by-examination/${moduleName}/${encodeURIComponent(examinationName)}`);
        const templates = Array.isArray(res.data)
            ? res.data
            : [];
        reportTemplateOptions.value = templates;
        const selected = templates.find((t) => t.name === selectedTemplateName.value);
        reportTemplate.value = selected || (templates.length ? templates[0] : null);
        if (reportTemplate.value) {
            selectedTemplateName.value = reportTemplate.value.name;
        }
        await refreshTemplateFindingDetails();
    }
    catch (e) {
        reportTemplate.value = null;
        reportTemplateOptions.value = [];
        templateFindingDetails.value = [];
        console.warn('Failed to fetch report template by examination:', axiosError(e));
    }
    finally {
        reportTemplateLoading.value = false;
    }
}
const onTemplateSelectionChange = async () => {
    if (!selectedTemplateName.value) {
        reportTemplate.value = null;
        return;
    }
    const local = reportTemplateOptions.value.find((t) => t.name === selectedTemplateName.value);
    if (local) {
        reportTemplate.value = local;
        return;
    }
    await fetchReportTemplateByName(selectedKbModule.value, selectedTemplateName.value);
};
async function createPatientExaminationAndInitLookup() {
    if (isRestarting.value) {
        console.log('Restart already in progress, skipping createPatientExaminationAndInitLookup...');
        return;
    }
    if (!selectedPatientId.value || !selectedExaminationId.value) {
        console.error('Missing required selections:', {
            selectedPatientId: selectedPatientId.value,
            selectedExaminationId: selectedExaminationId.value
        });
        error.value = "Bitte wählen Sie sowohl einen Patienten als auch eine Untersuchung aus.";
        return;
    }
    const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
    if (!selectedExam) {
        console.error('Selected examination not found in dropdown:', {
            selectedExaminationId: selectedExaminationId.value,
            availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
        });
        error.value = "Ausgewählte Untersuchung nicht gefunden.";
        return;
    }
    console.log('Creating PatientExamination with:', {
        patientId: selectedPatientId.value,
        examinationName: selectedExam.name,
        examinationId: selectedExam.id
    });
    error.value = null;
    loading.value = true;
    try {
        // Step 1: Create PatientExamination
        const formattedDate = new Date().toISOString().split('T')[0];
        // Get the selected patient to obtain the patient hash
        const selectedPatient = patientStore.getPatientById(selectedPatientId.value);
        if (!selectedPatient) {
            throw new Error('Selected patient not found');
        }
        // Get the selected examination name
        const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
        if (!selectedExam) {
            throw new Error('Selected examination not found');
        }
        // Format patient birth date for backend (ISO date format)
        const formattedBirthDate = selectedPatient.dob
            ? new Date(selectedPatient.dob).toISOString().split('T')[0]
            : null;
        const peRes = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
            patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
            examination: selectedExam.name,
            date_start: formattedDate, // Fixed field name
            // 🎯 NEW: Include patient birth date and gender for age calculation
            patient_birth_date: formattedBirthDate,
            patient_gender: selectedPatient.gender || null,
        });
        patientExaminationStore.addPatientExamination(peRes.data);
        console.log('PatientExamination created:', peRes.data);
        currentPatientExaminationId.value = peRes.data.id;
        // Step 2: Init lookup with the new PatientExamination ID
        const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
            patientExaminationId: currentPatientExaminationId.value
        });
        lookupToken.value = initRes.data.token;
        console.log('Lookup initialized with token:', lookupToken.value);
        // Start heartbeat for token renewal
        startHeartbeat();
        // Step 3: Load findings data
        await loadFindingsData();
        // Step 4: Fetch all lookup data (without recomputation)
        await fetchLookupAll();
        currentStep.value = Math.max(currentStep.value, 2);
        // Step 5: No automatic recompute - let user select requirement sets first
    }
    catch (e) {
        error.value = axiosError(e);
    }
    finally {
        loading.value = false;
    }
}
async function fetchLookupAll() {
    if (!lookupToken.value)
        return;
    error.value = null;
    loading.value = true;
    try {
        const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/all/?skip_recompute=true`);
        console.log('Lookup API response:', res.data); // Debug log
        applyLookup(res.data);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            // Try to automatically restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
            }
        }
        else {
            error.value = axiosError(e);
        }
    }
    finally {
        loading.value = false;
    }
}
async function fetchLookupParts(keys) {
    if (!lookupToken.value || !keys.length)
        return;
    error.value = null;
    loading.value = true;
    const qs = encodeURIComponent(keys.join(','));
    try {
        const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=${qs}`);
        applyLookup(res.data);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            // Try to automatically restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
            }
        }
        else {
            error.value = axiosError(e);
        }
    }
    finally {
        loading.value = false;
    }
}
async function patchLookup(updates) {
    if (!lookupToken.value)
        return;
    try {
        await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates });
        await fetchLookupParts(['availableFindings', 'requiredFindings']);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie erneut.';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
        }
        else {
            error.value = axiosError(e);
        }
    }
}
function toggleRequirementSet(id, on) {
    hasManualRequirementSelection.value = true;
    const s = new Set(selectedRequirementSetIds.value);
    if (on)
        s.add(id);
    else
        s.delete(id);
    selectedRequirementSetIds.value = Array.from(s);
    patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
    requirementStore.setCurrentRequirementSetIds(selectedRequirementSetIds.value);
    // Trigger recomputation when requirement sets change
    if (lookupToken.value) {
        triggerRecompute();
    }
}
async function triggerRecompute() {
    if (patientStore.currentPatient && patientStore.currentPatient.id !== selectedPatientId.value) {
        console.warn('Selected patient ID does not match patient store name. Reloading...');
        // Reload Token Value to update Requirment Sets etc. to seleccted patient
    }
    if (!lookupToken.value)
        return;
    try {
        console.log('Triggering recomputation for selected requirement sets:', selectedRequirementSetIds.value);
        const res = await axiosInstance.post(`${LOOKUP_BASE}/${lookupToken.value}/recompute/`);
        console.log('Recompute response:', res.data);
        // Update local lookup data with recomputed results
        if (res.data.updates) {
            applyLookup(res.data.updates);
        }
        // Fetch fresh data to get the complete updated state
        await fetchLookupAll();
        // Trigger requirement evaluation after recomputation
        if (selectedRequirementSetIds.value.length > 0) {
            await evaluateRequirementsOnChange();
        }
    }
    catch (e) {
        console.error('Error during recomputation:', e);
        error.value = 'Fehler bei der Neuberechnung: ' + axiosError(e);
    }
}
function closeCreatePatientModal() {
    showCreatePatientModal.value = false;
    // Store-Fehler löschen beim Schließen
    patientStore.clearError();
}
function onPatientCreated(patient) {
    // Patient wurde erfolgreich erstellt - automatisch auswählen
    selectedPatientId.value = patient.id || null;
    // Modal schließen
    showCreatePatientModal.value = false;
    // Store-Fehler löschen (falls vorhanden)
    patientStore.clearError();
    // Erfolgsmeldung anzeigen
    successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich erstellt und ausgewählt!`;
    // Nach 5 Sekunden ausblenden
    setTimeout(() => {
        successMessage.value = null;
    }, 5000);
}
async function validateToken() {
    if (!lookupToken.value)
        return false;
    try {
        // Try to fetch a small part to validate token
        await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`);
        return true;
    }
    catch (e) {
        if (e?.response?.status === 404) {
            // Token expired - trigger restart
            console.log('Token validation failed with 404, attempting restart...');
            lookupToken.value = null;
            lookup.value = null;
            error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
            // Try to restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
            }
            return false;
        }
        return false;
    }
}
async function renewLookupSession() {
    if (!lookupToken.value || !currentPatientExaminationId.value)
        return;
    try {
        // Renew the token by updating it with current data
        const currentData = lookup.value;
        if (currentData) {
            await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, {
                updates: currentData
            });
        }
    }
    catch (e) {
        console.warn('Failed to renew lookup sitzung:', e);
        // Don't show error to user, just log it
    }
}
function manualRenewSession() {
    if (!lookupToken.value)
        return;
    loading.value = true;
    error.value = null;
    axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`)
        .then(() => {
        return axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates: {} });
    })
        .then(() => {
        fetchLookupAll();
    })
        .catch((e) => {
        error.value = axiosError(e);
        if (e?.response?.status === 404) {
            // Token expired
            lookupToken.value = null;
            lookup.value = null;
            error.value = 'Lookup-Session ist abgelaufen. Bitte starten Sie erneut.';
            stopHeartbeat();
        }
    })
        .finally(() => {
        loading.value = false;
    });
}
function resetLookupSession() {
    lookupToken.value = null;
    lookup.value = null;
    currentPatientExaminationId.value = null;
    addedFindingIds.value = new Set();
    currentReportId.value = null;
    currentReportVersion.value = null;
    lastSaveStatus.value = null;
    saveWarnings.value = [];
    lastHistoryContext.value = null;
    lastRequirementGuidance.value = null;
    lastPersistedArtifacts.value = null;
    error.value = null;
    successMessage.value = null;
    stopHeartbeat();
    // Clear localStorage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
}
async function resetSessionForNewPatient() {
    console.log('Resetting session for new patient...');
    // Clear current session state
    lookupToken.value = null;
    lookup.value = null;
    currentPatientExaminationId.value = null;
    addedFindingIds.value = new Set();
    previousReportTexts.value = [];
    currentReportId.value = null;
    currentReportVersion.value = null;
    lastSaveStatus.value = null;
    saveWarnings.value = [];
    lastHistoryContext.value = null;
    lastRequirementGuidance.value = null;
    lastPersistedArtifacts.value = null;
    error.value = null;
    successMessage.value = null;
    stopHeartbeat();
    // Clear localStorage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
    // Clear requirement store state
    requirementStore.reset();
    console.log('Session reset complete for new patient');
}
async function restartLookupSession() {
    if (isRestarting.value) {
        console.log('Restart already in progress, skipping...');
        return false;
    }
    console.log('Attempting to restart lookup session...');
    isRestarting.value = true;
    try {
        // Reset current session state
        lookupToken.value = null;
        lookup.value = null;
        stopHeartbeat();
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        // Check if we have an existing patient examination
        if (currentPatientExaminationId.value && selectedPatientId.value && selectedExaminationId.value) {
            // Reuse existing patient examination - just reinitialize lookup
            console.log('Reusing existing patient examination:', currentPatientExaminationId.value);
            console.log('selectedPatientId:', selectedPatientId.value);
            console.log('selectedExaminationId:', selectedExaminationId.value);
            const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
                patientExaminationId: currentPatientExaminationId.value
            });
            lookupToken.value = initRes.data.token;
            // Start heartbeat for token renewal
            startHeartbeat();
            // Fetch all lookup data
            await fetchLookupAll();
            successMessage.value = 'Lookup-Session wurde erfolgreich neu gestartet!';
            setTimeout(() => {
                successMessage.value = null;
            }, 3000);
            return true;
        }
        else {
            // No existing patient examination, create new one
            console.log('No existing patient examination, creating new one');
            console.log('currentPatientExaminationId:', currentPatientExaminationId.value);
            console.log('selectedPatientId:', selectedPatientId.value);
            console.log('selectedExaminationId:', selectedExaminationId.value);
            if (!selectedPatientId.value || !selectedExaminationId.value) {
                error.value = 'Kann Session nicht automatisch neu starten: Patient oder Untersuchung fehlt.';
                return false;
            }
            await createPatientExaminationAndInitLookup();
            return true;
        }
    }
    catch (e) {
        console.error('Failed to restart lookup session:', e);
        error.value = 'Fehler beim Neustart der Lookup-Session: ' + axiosError(e);
        return false;
    }
    finally {
        isRestarting.value = false;
    }
}
// --- Heartbeat for token renewal ---
let heartbeatInterval = null;
function startHeartbeat() {
    if (heartbeatInterval)
        return;
    // Renew session every 15 minutes (quarter of TTL to be safe)
    heartbeatInterval = window.setInterval(async () => {
        if (lookupToken.value && !isRestarting.value) {
            // Validate token (this will trigger restart if needed)
            await validateToken();
        }
    }, 15 * 60 * 1000); // 15 minutes
}
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}
// --- Session management ---
const sessionWarningShown = ref(false);
function showSessionExpiryWarning() {
    if (!sessionWarningShown.value && lookupToken.value) {
        error.value = 'Hinweis: Ihre Lookup-Session läuft bald ab. Speichern Sie Ihre Arbeit.';
        sessionWarningShown.value = true;
        // Clear warning after 10 seconds
        setTimeout(() => {
            if (error.value === 'Hinweis: Ihre Lookup-Session läuft bald ab. Speichern Sie Ihre Arbeit.') {
                error.value = null;
            }
            sessionWarningShown.value = false;
        }, 10000);
    }
}
// --- Token persistence ---
const TOKEN_STORAGE_KEY = 'lookupToken';
const PATIENT_EXAM_STORAGE_KEY = 'currentPatientExaminationId';
// Load token from localStorage on component creation
const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
const savedPatientExamId = localStorage.getItem(PATIENT_EXAM_STORAGE_KEY);
if (savedToken) {
    lookupToken.value = savedToken;
}
if (savedPatientExamId) {
    currentPatientExaminationId.value = parseInt(savedPatientExamId);
}
// Save token to localStorage whenever it changes
watch(lookupToken, (newToken) => {
    if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    }
    else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
});
watch(currentPatientExaminationId, (newId) => {
    if (newId) {
        localStorage.setItem(PATIENT_EXAM_STORAGE_KEY, newId.toString());
    }
    else {
        localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
        currentReportId.value = null;
        currentReportVersion.value = null;
        lastSaveStatus.value = null;
        saveWarnings.value = [];
        lastHistoryContext.value = null;
        lastRequirementGuidance.value = null;
        lastPersistedArtifacts.value = null;
    }
});
watch(currentPatientExaminationId, async (newId) => {
    if (newId) {
        await refreshAddedFindingIds();
        await refreshTemplateFindingDetails();
        await fetchPreviousReportTexts();
    }
    else {
        addedFindingIds.value = new Set();
    }
}, { immediate: true });
// --- Watchers ---
watch(selectedExaminationId, (newId) => {
    console.log('Examination selection changed:', {
        newId,
        selectedPatientId: selectedPatientId.value,
        availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
    });
    autoSelectionAppliedKey.value = null;
    hasManualRequirementSelection.value = false;
    examinationStore.setSelectedExamination(newId);
    if (newId) {
        examinationStore.loadFindingsForExamination(newId);
        const selectedExam = examinationsDropdown.value.find(exam => exam.id === newId);
        if (selectedExam?.name) {
            fetchReportTemplateByExamination(selectedKbModule.value, selectedExam.name);
        }
    }
    else {
        reportTemplate.value = null;
    }
});
watch(selectedPatientId, async (newPatientId, oldPatientId) => {
    console.log('Patient selection changed:', {
        oldPatientId,
        newPatientId,
        currentExaminationsCount: examinationsDropdown.value.length
    });
    // Reset examination selection when patient changes
    selectedExaminationId.value = null;
    // If patient actually changed (not just initialized), reset the session
    if (oldPatientId && newPatientId !== oldPatientId) {
        console.log('Patient changed, resetting session for new overview...');
        await resetSessionForNewPatient();
        autoSelectionAppliedKey.value = null;
        hasManualRequirementSelection.value = false;
    }
    if (newPatientId) {
        await fetchPreviousReportTexts();
    }
    else {
        previousReportTexts.value = [];
    }
});
// Watch for changes in selected requirement sets to trigger evaluation
watch(selectedRequirementSetIds, async (newIds, oldIds) => {
    if (newIds.length !== oldIds.length && lookup.value) {
        console.log('Requirement set selection changed, triggering evaluation...');
        await evaluateRequirementsOnChange();
    }
}, { deep: true });
// Watch for lookup data changes to trigger evaluation
watch(lookup, async (newLookup, oldLookup) => {
    if (newLookup && newLookup !== oldLookup && selectedRequirementSetIds.value.length > 0) {
        console.log('Lookup data changed, triggering evaluation...');
        // Debounce evaluation to avoid excessive API calls
        setTimeout(() => {
            evaluateRequirementsOnChange();
        }, 1000);
    }
}, { deep: true });
// Watch for lookup data changes to load requirement sets
watch(lookup, (newLookup) => {
    if (newLookup && newLookup.requirementsBySet) {
        console.log('Loading requirement sets from lookup data...');
        requirementStore.loadRequirementSetsFromLookup(newLookup);
        void applyTemplateToRequirementSelection();
    }
}, { immediate: true });
watch(reportTemplate, () => {
    void applyTemplateToRequirementSelection();
    void refreshTemplateFindingDetails();
});
watch(selectedTemplateName, async () => {
    await onTemplateSelectionChange();
});
watch(lookupToken, () => {
    autoSelectionAppliedKey.value = null;
    hasManualRequirementSelection.value = false;
});
// --- Lifecycle ---
onMounted(async () => {
    console.log('Component mounted, starting data loading...');
    // Patienten und Untersuchungen laden
    await Promise.all([
        patientStore.fetchPatients(),
        examinationStore.fetchExaminations()
    ]);
    console.log('Data loading completed:', {
        patientsCount: patients.value.length,
        examinationsCount: examinationsDropdown.value.length
    });
    // Nachschlagedaten für Patientenerstellung laden
    await patientStore.initializeLookupData();
    // Validate existing token if present (e.g., after page reload)
    if (lookupToken.value) {
        console.log('Validating existing token:', lookupToken.value);
        const isValid = await validateToken();
        if (!isValid) {
            lookupToken.value = null;
            lookup.value = null;
            currentPatientExaminationId.value = null; // Clear this too
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
        }
        else {
            // Token is valid, fetch current data and start heartbeat
            await fetchLookupAll();
            startHeartbeat();
        }
    }
    // Load findings data on component mount
    await loadFindingsData();
    await fetchReportTemplateByName(selectedKbModule.value, selectedTemplateName.value);
    await refreshAddedFindingIds();
    if (selectedPatientId.value) {
        await fetchPreviousReportTexts();
    }
});
onUnmounted(() => {
    stopHeartbeat();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "assisted-reporting container-fluid py-4" },
});
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success alert-dismissible" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.successMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.successMessage))
                    return;
                __VLS_ctx.successMessage = null;
            } },
        type: "button",
        ...{ class: "btn-close" },
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger alert-dismissible" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.error);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.error))
                    return;
                __VLS_ctx.error = null;
            } },
        type: "button",
        ...{ class: "btn-close" },
    });
}
/** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
    ...{ 'onNext': {} },
    title: "1. Patient &amp; Untersuchung",
    subtitle: "Basisdaten für den Bericht",
    icon: "person",
    store: (__VLS_ctx.patientStore),
    isComplete: (!!__VLS_ctx.lookupToken),
    isActive: (__VLS_ctx.currentStep === 1),
    loading: (__VLS_ctx.loading),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onNext': {} },
    title: "1. Patient &amp; Untersuchung",
    subtitle: "Basisdaten für den Bericht",
    icon: "person",
    store: (__VLS_ctx.patientStore),
    isComplete: (!!__VLS_ctx.lookupToken),
    isActive: (__VLS_ctx.currentStep === 1),
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onNext: (...[$event]) => {
        __VLS_ctx.goToStep(2);
    }
};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "patient-select",
    ...{ class: "form-label mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "patient-select",
    value: (__VLS_ctx.selectedPatientId),
    ...{ class: "form-select" },
    disabled: (__VLS_ctx.isLoadingPatients || __VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
    disabled: true,
});
(__VLS_ctx.isLoadingPatients ? 'Lade Patienten...' : 'Bitte wählen Sie einen Patienten');
for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.patients))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (patient.id),
        value: (patient.id),
    });
    (patient.displayName);
}
if (__VLS_ctx.selectedPatientId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "examination-select",
    ...{ class: "form-label mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "examination-select",
    value: (__VLS_ctx.selectedExaminationId),
    ...{ class: "form-select" },
    disabled: (__VLS_ctx.isLoadingExaminations || !__VLS_ctx.selectedPatientId || __VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
    disabled: true,
});
(__VLS_ctx.isLoadingExaminations ? 'Lade Untersuchungen...' : 'Bitte wählen Sie eine Untersuchung');
for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinationsDropdown))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (exam.id),
        value: (exam.id),
    });
    (exam.displayName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-wrap gap-2 mt-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createPatientExaminationAndInitLookup) },
    ...{ class: "btn btn-primary" },
    disabled: (!__VLS_ctx.selectedPatientId || !__VLS_ctx.selectedExaminationId || __VLS_ctx.loading || !!__VLS_ctx.lookupToken),
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-2" },
        role: "status",
        'aria-hidden': "true",
    });
}
if (!__VLS_ctx.lookupToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showCreatePatientModal = true;
        } },
    ...{ class: "btn btn-outline-secondary" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-user-plus me-1" },
});
if (__VLS_ctx.selectedPatientId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-3 mt-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-user" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedPatientId))
                    return;
                __VLS_ctx.patientStore.clearCurrentPatient();
            } },
        type: "button",
        ...{ class: "btn btn-sm btn-outline-secondary" },
        title: "Patientenauswahl zurücksetzen",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-times me-1" },
    });
}
var __VLS_2;
/** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
    ...{ 'onNext': {} },
    title: "2. Befundvorlage auswählen",
    subtitle: "Anforderungen überprüfen",
    icon: "widgets",
    iconBgClass: "bg-gradient-warning",
    store: (__VLS_ctx.requirementStore),
    isComplete: (__VLS_ctx.requirementSets.length > 0),
    isActive: (__VLS_ctx.currentStep === 2),
}));
const __VLS_8 = __VLS_7({
    ...{ 'onNext': {} },
    title: "2. Befundvorlage auswählen",
    subtitle: "Anforderungen überprüfen",
    icon: "widgets",
    iconBgClass: "bg-gradient-warning",
    store: (__VLS_ctx.requirementStore),
    isComplete: (__VLS_ctx.requirementSets.length > 0),
    isActive: (__VLS_ctx.currentStep === 2),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_10;
let __VLS_11;
let __VLS_12;
const __VLS_13 = {
    onNext: (...[$event]) => {
        __VLS_ctx.goToStep(3);
    }
};
__VLS_9.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex justify-content-between align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
(__VLS_ctx.selectedKbModule);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.fetchReportTemplateByName(__VLS_ctx.selectedKbModule, __VLS_ctx.selectedTemplateName);
        } },
    ...{ class: "btn btn-sm btn-outline-secondary" },
    disabled: (__VLS_ctx.reportTemplateLoading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-2 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control form-control-sm" },
});
(__VLS_ctx.selectedKbModule);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedTemplateName),
    ...{ class: "form-select form-select-sm" },
    disabled: (__VLS_ctx.reportTemplateLoading || !__VLS_ctx.reportTemplateOptions.length),
});
if (!__VLS_ctx.reportTemplateOptions.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (__VLS_ctx.selectedTemplateName),
    });
}
for (const [tpl] of __VLS_getVForSourceType((__VLS_ctx.reportTemplateOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (tpl.name),
        value: (tpl.name),
    });
    (tpl.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted" },
});
(__VLS_ctx.reportTemplateOptions.length);
if (__VLS_ctx.reportTemplateLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted small" },
    });
}
else if (__VLS_ctx.reportTemplate) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.reportTemplate.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.reportTemplate.examination);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "mb-2" },
    });
    for (const [section] of __VLS_getVForSourceType((__VLS_ctx.reportTemplate.reportSections))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (section.name),
        });
        (section.position);
        (section.name);
        (section.findings.length);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.reportTemplate.validators.examinationValidators.length);
    (__VLS_ctx.reportTemplate.validators.findingsValidators.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 border-top pt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-between align-items-center mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.templateDetailSummary.matchedFindings);
    (__VLS_ctx.templateDetailSummary.totalFindings);
    if (__VLS_ctx.templateDetailsLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted small" },
        });
    }
    else if (!__VLS_ctx.templateFindingDetails.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted small" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small" },
        });
        for (const [detail] of __VLS_getVForSourceType((__VLS_ctx.templateFindingDetails))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (`${detail.sectionName}::${detail.templateFindingName}`),
                ...{ class: "border rounded p-2 mb-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-center flex-wrap gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (detail.templateFindingName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-muted ms-2" },
            });
            (detail.sectionName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
                ...{ class: (detail.matchedFinding ? 'bg-success' : 'bg-danger') },
            });
            (detail.matchedFinding ? 'Gefunden' : 'Nicht gefunden');
            if (detail.matchedFinding) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-muted mt-1" },
                });
                (detail.matchedFinding.id);
                (detail.matchedFinding.displayName);
                if (detail.matchedFinding.description) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (detail.matchedFinding.description);
                }
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-muted" },
            });
            (detail.requiredTemplateClassifications.length);
            (detail.templateClassifications.length);
            if (detail.matchedFinding) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-muted ms-3" },
                });
                (detail.apiClassifications.length);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ms-3 badge" },
                ...{ class: (detail.isAddedToPatientExamination ? 'bg-success' : 'bg-secondary') },
            });
            (detail.isAddedToPatientExamination ? 'Im Bericht erfasst' : 'Noch nicht erfasst');
            if (detail.missingRequiredClassifications.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-danger mt-1" },
                });
                (detail.missingRequiredClassifications.join(', '));
            }
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted small" },
    });
}
if (!__VLS_ctx.lookupToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted small" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header d-flex justify-content-between align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.lookupToken);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex gap-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchLookupAll) },
        ...{ class: "btn btn-sm btn-outline-secondary" },
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.triggerRecompute) },
        ...{ class: "btn btn-sm btn-outline-info" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.lookupToken),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.manualRenewSession) },
        ...{ class: "btn btn-sm btn-outline-info" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.lookupToken),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetLookupSession) },
        ...{ class: "btn btn-sm btn-outline-danger" },
        disabled: (__VLS_ctx.loading),
    });
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spinner-border" },
            role: "status",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mt-2 mb-0" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body pre-scrollable" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "list-group list-group-flush" },
        });
        for (const [rs] of __VLS_getVForSourceType((__VLS_ctx.requirementSets))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (rs.id),
                ...{ class: "list-group-item d-flex justify-content-between align-items-start" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-grow-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-center" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "fw-semibold" },
            });
            (rs.name);
            if (__VLS_ctx.requirementStore.getRequirementSetEvaluationStatus(rs.id)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge" },
                    ...{ class: (__VLS_ctx.requirementStore.getRequirementSetEvaluationStatus(rs.id)?.met ? 'bg-success' : 'bg-warning') },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: "fas" },
                    ...{ class: (__VLS_ctx.requirementStore.getRequirementSetEvaluationStatus(rs.id)?.met ? 'fa-check' : 'fa-exclamation-triangle') },
                });
                (__VLS_ctx.requirementStore.getRequirementSetEvaluationStatus(rs.id)?.met ? 'Erfüllt' : 'Nicht erfüllt');
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted d-block" },
            });
            (rs.type);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-check form-switch ms-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!!(!__VLS_ctx.lookupToken))
                            return;
                        if (!!(__VLS_ctx.loading))
                            return;
                        __VLS_ctx.toggleRequirementSet(rs.id, $event.target.checked);
                    } },
                ...{ class: "form-check-input" },
                type: "checkbox",
                checked: (__VLS_ctx.selectedRequirementSetIdSet.has(rs.id)),
            });
        }
        if (!__VLS_ctx.requirementSets.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                ...{ class: "list-group-item text-muted" },
            });
        }
        if (__VLS_ctx.evaluationSummary && __VLS_ctx.evaluationSummary.totalSets > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-3 p-3 bg-light rounded" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-center mb-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "fw-semibold" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            (__VLS_ctx.evaluationSummary.completionPercentage);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "progress mb-2" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "progress-bar" },
                ...{ class: (__VLS_ctx.evaluationSummary.completionPercentage === 100 ? 'bg-success' : 'bg-info') },
                ...{ style: ({ width: __VLS_ctx.evaluationSummary.completionPercentage + '%' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            (__VLS_ctx.evaluationSummary.evaluatedSets);
            (__VLS_ctx.evaluationSummary.totalSets);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.evaluateRequirementsOnChange) },
                ...{ class: "btn btn-sm btn-primary" },
                disabled: (__VLS_ctx.loading),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-sync me-1" },
            });
        }
    }
    if (__VLS_ctx.lookup && __VLS_ctx.isDebug) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 border rounded p-3 bg-white" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lookup.patientExaminationId || 'n/a');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lookupToken || 'n/a');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.availableFindings.length);
    }
}
var __VLS_9;
if (__VLS_ctx.lookupToken) {
    /** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
        ...{ 'onNext': {} },
        title: "3. Befunde",
        subtitle: "Klinische Beobachtungen erfassen",
        icon: "biotech",
        iconBgClass: "bg-gradient-primary",
        isComplete: (__VLS_ctx.availableFindings.length > 0),
        isActive: (__VLS_ctx.currentStep === 3),
        extraParams: ({ token: __VLS_ctx.lookupToken }),
    }));
    const __VLS_15 = __VLS_14({
        ...{ 'onNext': {} },
        title: "3. Befunde",
        subtitle: "Klinische Beobachtungen erfassen",
        icon: "biotech",
        iconBgClass: "bg-gradient-primary",
        isComplete: (__VLS_ctx.availableFindings.length > 0),
        isActive: (__VLS_ctx.currentStep === 3),
        extraParams: ({ token: __VLS_ctx.lookupToken }),
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    let __VLS_17;
    let __VLS_18;
    let __VLS_19;
    const __VLS_20 = {
        onNext: (...[$event]) => {
            if (!(__VLS_ctx.lookupToken))
                return;
            __VLS_ctx.goToStep(4);
        }
    };
    __VLS_16.slots.default;
    if (__VLS_ctx.currentPatientExaminationId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        /** @type {[typeof AddableFindingsDetail, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(AddableFindingsDetail, new AddableFindingsDetail({
            ...{ 'onFindingAdded': {} },
            ...{ 'onFindingError': {} },
            examinationId: (__VLS_ctx.selectedExaminationId || undefined),
            patientExaminationId: (__VLS_ctx.currentPatientExaminationId || undefined),
        }));
        const __VLS_22 = __VLS_21({
            ...{ 'onFindingAdded': {} },
            ...{ 'onFindingError': {} },
            examinationId: (__VLS_ctx.selectedExaminationId || undefined),
            patientExaminationId: (__VLS_ctx.currentPatientExaminationId || undefined),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        let __VLS_24;
        let __VLS_25;
        let __VLS_26;
        const __VLS_27 = {
            onFindingAdded: (__VLS_ctx.onFindingAddedToExamination)
        };
        const __VLS_28 = {
            onFindingError: ((errorMsg) => __VLS_ctx.error = errorMsg)
        };
        var __VLS_23;
    }
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-2" },
    });
    if (__VLS_ctx.availableFindings.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.availableFindings.length);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadFindingsData) },
        ...{ class: "btn btn-sm btn-outline-info" },
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-sync-alt me-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body pre-scrollable" },
        ...{ style: {} },
    });
    if (__VLS_ctx.findingsSectionLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center py-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spinner-border" },
            role: "status",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mt-2 mb-0" },
        });
    }
    else if (__VLS_ctx.availableFindings.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "findings-container" },
        });
        for (const [findingId] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
            /** @type {[typeof FindingsDetail, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(FindingsDetail, new FindingsDetail({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                key: (findingId),
                findingId: (findingId),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
                patientExaminationId: (__VLS_ctx.lookup?.patientExaminationId || undefined),
            }));
            const __VLS_30 = __VLS_29({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                key: (findingId),
                findingId: (findingId),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
                patientExaminationId: (__VLS_ctx.lookup?.patientExaminationId || undefined),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            let __VLS_32;
            let __VLS_33;
            let __VLS_34;
            const __VLS_35 = {
                onAddedToExamination: (__VLS_ctx.onFindingAddedToExamination)
            };
            const __VLS_36 = {
                onClassificationUpdated: (__VLS_ctx.onClassificationUpdated)
            };
            var __VLS_31;
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center py-4 text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-info-circle fa-2x mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    var __VLS_16;
}
if (__VLS_ctx.lookupToken) {
    /** @type {[typeof MedicalBlock, typeof MedicalBlock, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(MedicalBlock, new MedicalBlock({
        title: "4. Klassifikation",
        subtitle: "Abschlussbewertung des Berichts",
        icon: "fact_check",
        iconBgClass: "bg-gradient-success",
        isComplete: (__VLS_ctx.evaluationSummary?.completionPercentage === 100),
        isActive: (__VLS_ctx.currentStep === 4),
        showAction: (false),
    }));
    const __VLS_38 = __VLS_37({
        title: "4. Klassifikation",
        subtitle: "Abschlussbewertung des Berichts",
        icon: "fact_check",
        iconBgClass: "bg-gradient-success",
        isComplete: (__VLS_ctx.evaluationSummary?.completionPercentage === 100),
        isActive: (__VLS_ctx.currentStep === 4),
        showAction: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap align-items-center gap-2 justify-content-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted" },
    });
    if (__VLS_ctx.currentReportId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.currentReportId);
    }
    if (__VLS_ctx.currentReportId && __VLS_ctx.currentReportVersion != null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.currentReportVersion);
    }
    if (__VLS_ctx.lastSaveStatus) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.lastSaveStatus);
    }
    if (!__VLS_ctx.currentReportId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.lookupToken))
                    return;
                __VLS_ctx.saveReportSubmission('draft');
            } },
        ...{ class: "btn btn-sm btn-outline-primary" },
        disabled: (__VLS_ctx.saveSubmissionLoading || !__VLS_ctx.currentPatientExaminationId || !__VLS_ctx.reportTemplate),
    });
    if (__VLS_ctx.saveSubmissionLoading && __VLS_ctx.lastSaveStatus === 'draft') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-1" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.lookupToken))
                    return;
                __VLS_ctx.saveReportSubmission('final');
            } },
        ...{ class: "btn btn-sm btn-success" },
        disabled: (__VLS_ctx.saveSubmissionLoading || !__VLS_ctx.currentPatientExaminationId || !__VLS_ctx.reportTemplate),
    });
    if (__VLS_ctx.saveSubmissionLoading && __VLS_ctx.lastSaveStatus === 'final') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-1" },
        });
    }
    if (__VLS_ctx.saveWarnings.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3" },
        });
        for (const [warning, idx] of __VLS_getVForSourceType((__VLS_ctx.saveWarnings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (`save-warning-${idx}`),
                ...{ class: "alert alert-warning py-2 mb-2" },
            });
            (warning);
        }
    }
    if (__VLS_ctx.lastPersistedArtifacts?.pdfDownloadUrl || __VLS_ctx.lastPersistedArtifacts?.pdfViewUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-2 d-flex flex-wrap gap-2" },
        });
        if (__VLS_ctx.lastPersistedArtifacts?.pdfViewUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ class: "btn btn-sm btn-outline-secondary" },
                href: (__VLS_ctx.lastPersistedArtifacts.pdfViewUrl),
                target: "_blank",
                rel: "noopener noreferrer",
            });
        }
        if (__VLS_ctx.lastPersistedArtifacts?.pdfDownloadUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ class: "btn btn-sm btn-outline-secondary" },
                href: (__VLS_ctx.lastPersistedArtifacts.pdfDownloadUrl),
                target: "_blank",
                rel: "noopener noreferrer",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card mb-3" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchPreviousReportTexts) },
        ...{ class: "btn btn-sm btn-outline-secondary" },
        disabled: (__VLS_ctx.previousReportTextsLoading || !__VLS_ctx.selectedPatientId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    if (__VLS_ctx.previousReportTextsLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted small" },
        });
    }
    else if (!__VLS_ctx.previousReportTexts.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted small" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-column gap-3" },
        });
        for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.previousReportTexts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (entry.id),
                ...{ class: "border rounded p-3 bg-light" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            (__VLS_ctx.formatTimelineDate(entry.createdAt));
            if (entry.documentType) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge text-bg-secondary" },
                });
                (entry.documentType);
            }
            if (entry.patientExaminationId) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: "text-muted d-block mb-2" },
                });
                (entry.patientExaminationId);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "previous-report-text" },
            });
            (entry.text);
        }
    }
    /** @type {[typeof RequirementIssues, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(RequirementIssues, new RequirementIssues({
        patientExaminationId: (__VLS_ctx.lookup?.patientExaminationId || null),
        requirementSetIds: (__VLS_ctx.selectedRequirementSetIds),
        showOnlyUnmet: (true),
    }));
    const __VLS_41 = __VLS_40({
        patientExaminationId: (__VLS_ctx.lookup?.patientExaminationId || null),
        requirementSetIds: (__VLS_ctx.selectedRequirementSetIds),
        showOnlyUnmet: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    var __VLS_39;
}
if (__VLS_ctx.showCreatePatientModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeCreatePatientModal) },
        ...{ class: "modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: () => { } },
        ...{ class: "modal-dialog" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "modal-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeCreatePatientModal) },
        type: "button",
        ...{ class: "btn-close" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    /** @type {[typeof PatientAdder, ]} */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(PatientAdder, new PatientAdder({
        ...{ 'onPatientCreated': {} },
        ...{ 'onCancel': {} },
    }));
    const __VLS_44 = __VLS_43({
        ...{ 'onPatientCreated': {} },
        ...{ 'onCancel': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    let __VLS_46;
    let __VLS_47;
    let __VLS_48;
    const __VLS_49 = {
        onPatientCreated: (__VLS_ctx.onPatientCreated)
    };
    const __VLS_50 = {
        onCancel: (__VLS_ctx.closeCreatePatientModal)
    };
    var __VLS_45;
}
/** @type {__VLS_StyleScopedClasses['assisted-reporting']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-user-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-user']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-times']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-top']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['pre-scrollable']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-flush']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['progress']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['pre-scrollable']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['findings-container']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-2x']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['previous-report-text']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            PatientAdder: PatientAdder,
            MedicalBlock: MedicalBlock,
            FindingsDetail: FindingsDetail,
            AddableFindingsDetail: AddableFindingsDetail,
            RequirementIssues: RequirementIssues,
            patientStore: patientStore,
            requirementStore: requirementStore,
            isDebug: isDebug,
            selectedPatientId: selectedPatientId,
            selectedExaminationId: selectedExaminationId,
            currentPatientExaminationId: currentPatientExaminationId,
            lookupToken: lookupToken,
            lookup: lookup,
            error: error,
            loading: loading,
            showCreatePatientModal: showCreatePatientModal,
            successMessage: successMessage,
            selectedKbModule: selectedKbModule,
            selectedTemplateName: selectedTemplateName,
            reportTemplate: reportTemplate,
            reportTemplateLoading: reportTemplateLoading,
            reportTemplateOptions: reportTemplateOptions,
            templateDetailsLoading: templateDetailsLoading,
            templateFindingDetails: templateFindingDetails,
            currentReportId: currentReportId,
            currentReportVersion: currentReportVersion,
            lastSaveStatus: lastSaveStatus,
            saveSubmissionLoading: saveSubmissionLoading,
            saveWarnings: saveWarnings,
            lastPersistedArtifacts: lastPersistedArtifacts,
            previousReportTextsLoading: previousReportTextsLoading,
            previousReportTexts: previousReportTexts,
            currentStep: currentStep,
            goToStep: goToStep,
            patients: patients,
            isLoadingPatients: isLoadingPatients,
            examinationsDropdown: examinationsDropdown,
            isLoadingExaminations: isLoadingExaminations,
            requirementSets: requirementSets,
            selectedRequirementSetIds: selectedRequirementSetIds,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            availableFindings: availableFindings,
            findingsSectionLoading: findingsSectionLoading,
            templateDetailSummary: templateDetailSummary,
            formatTimelineDate: formatTimelineDate,
            fetchPreviousReportTexts: fetchPreviousReportTexts,
            isFindingAddedToExamination: isFindingAddedToExamination,
            onFindingAddedToExamination: onFindingAddedToExamination,
            onClassificationUpdated: onClassificationUpdated,
            loadFindingsData: loadFindingsData,
            evaluateRequirementsOnChange: evaluateRequirementsOnChange,
            evaluationSummary: evaluationSummary,
            saveReportSubmission: saveReportSubmission,
            fetchReportTemplateByName: fetchReportTemplateByName,
            createPatientExaminationAndInitLookup: createPatientExaminationAndInitLookup,
            fetchLookupAll: fetchLookupAll,
            toggleRequirementSet: toggleRequirementSet,
            triggerRecompute: triggerRecompute,
            closeCreatePatientModal: closeCreatePatientModal,
            onPatientCreated: onPatientCreated,
            manualRenewSession: manualRenewSession,
            resetLookupSession: resetLookupSession,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
