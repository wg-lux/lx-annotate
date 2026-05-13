import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { savePatientExaminationDraft } from '@/api/reportDraftApi';
const STORAGE_KEY = 'reportingFlowState.v2';
const LEGACY_STORAGE_KEY = 'reportingFlowState.v1';
const STORAGE_TTL_MS = 30 * 60 * 1000;
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 1500;
let runtimeDraftEntityCounter = 0;
function nextRuntimeDraftEntityId(prefix) {
    runtimeDraftEntityCounter += 1;
    return `${prefix}_${runtimeDraftEntityCounter}`;
}
function normalizeRuntimeDescriptors(descriptors) {
    if (!Array.isArray(descriptors))
        return [];
    return descriptors.map((descriptor) => ({
        ...descriptor,
        localId: descriptor.localId || nextRuntimeDraftEntityId('descriptor')
    }));
}
function normalizeRuntimeClassificationChoices(classificationChoices) {
    if (!Array.isArray(classificationChoices))
        return [];
    return classificationChoices.map((classificationChoice) => ({
        ...classificationChoice,
        localId: classificationChoice.localId || nextRuntimeDraftEntityId('classification'),
        descriptors: normalizeRuntimeDescriptors(classificationChoice.descriptors)
    }));
}
function normalizeRuntimePatientFindings(patientFindings) {
    if (!Array.isArray(patientFindings))
        return [];
    return patientFindings.map((patientFinding) => ({
        ...patientFinding,
        localId: patientFinding.localId || nextRuntimeDraftEntityId('finding'),
        classificationChoices: normalizeRuntimeClassificationChoices(patientFinding.classificationChoices)
    }));
}
function normalizeRuntimePayloadIds(payload) {
    return {
        ...payload,
        patientFindings: normalizeRuntimePatientFindings(payload.patientFindings)
    };
}
function clearPersistedState() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    catch { }
}
function normalizePersistedState(parsed) {
    const runtimeDraftsByPatientExaminationId = parsed.runtimeDraftsByPatientExaminationId &&
        typeof parsed.runtimeDraftsByPatientExaminationId === 'object'
        ? Object.fromEntries(Object.entries(parsed.runtimeDraftsByPatientExaminationId).filter(([, value]) => {
            if (!value || typeof value !== 'object')
                return false;
            const draft = value;
            return (typeof draft.draftId === 'string' &&
                typeof draft.patientExaminationId === 'number' &&
                !!draft.payload &&
                typeof draft.payload === 'object');
        }))
        : {};
    return {
        lookupToken: typeof parsed.lookupToken === 'string' ? parsed.lookupToken : null,
        patientExaminationId: typeof parsed.patientExaminationId === 'number' ? parsed.patientExaminationId : null,
        selectedPatientId: typeof parsed.selectedPatientId === 'number' ? parsed.selectedPatientId : null,
        selectedExaminationId: typeof parsed.selectedExaminationId === 'number' ? parsed.selectedExaminationId : null,
        activeReportId: typeof parsed.activeReportId === 'number' ? parsed.activeReportId : null,
        indications: Array.isArray(parsed.indications)
            ? parsed.indications.map((row) => ({
                examinationIndicationId: typeof row?.examinationIndicationId === 'number' ? row.examinationIndicationId : null,
                indicationChoiceId: typeof row?.indicationChoiceId === 'number' ? row.indicationChoiceId : null
            }))
            : [],
        selectedKbModule: typeof parsed.selectedKbModule === 'string' && parsed.selectedKbModule.trim()
            ? parsed.selectedKbModule
            : 'report_template_examples',
        selectedTemplateName: typeof parsed.selectedTemplateName === 'string' && parsed.selectedTemplateName.trim()
            ? parsed.selectedTemplateName
            : null,
        templateSectionDrafts: parsed.templateSectionDrafts && typeof parsed.templateSectionDrafts === 'object'
            ? Object.fromEntries(Object.entries(parsed.templateSectionDrafts).map(([key, value]) => {
                const draft = value;
                return [
                    key,
                    {
                        note: typeof draft?.note === 'string' ? draft.note : '',
                        includePatientData: !!draft?.includePatientData,
                        includeExaminationData: !!draft?.includeExaminationData
                    }
                ];
            }))
            : {},
        runtimeDraftsByPatientExaminationId: runtimeDraftsByPatientExaminationId
    };
}
function loadPersistedState(ownerSub) {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            clearPersistedState();
            return null;
        }
        if (typeof parsed.expiresAt !== 'number' ||
            parsed.expiresAt <= Date.now() ||
            parsed.ownerSub !== ownerSub ||
            !parsed.state ||
            typeof parsed.state !== 'object') {
            clearPersistedState();
            return null;
        }
        return normalizePersistedState(parsed.state);
    }
    catch {
        clearPersistedState();
        return null;
    }
}
export const useReportingFlowStore = defineStore('reportingFlow', () => {
    const authSubject = ref(null);
    const sessionStatus = ref('idle');
    const lookupToken = ref(null);
    const patientExaminationId = ref(null);
    const selectedPatientId = ref(null);
    const selectedExaminationId = ref(null);
    const activeReportId = ref(null);
    const selectedKbModule = ref('report_template_examples');
    const selectedTemplateName = ref(null);
    const templateSectionDrafts = ref({});
    const indications = ref([{ examinationIndicationId: null, indicationChoiceId: null }]);
    const lookupSnapshot = ref(null);
    const lastTemplateValidation = ref(null);
    const findingsRevision = ref(0);
    const lastFindingsEvent = ref(null);
    const mediaPreload = ref(null);
    const mediaPreloadStatus = ref('idle');
    const mediaPreloadError = ref(null);
    const runtimeDraftsByPatientExaminationId = ref({});
    const draftPersistenceStatus = ref('idle');
    const draftPersistenceError = ref(null);
    const lastPersistedDraftAt = ref(null);
    const draftAutosaveTimer = ref(null);
    const draftAutosaveSignature = ref(null);
    const draftPersistencePromise = ref(null);
    const savingFinalReport = ref(false);
    const hasActiveCase = computed(() => !!patientExaminationId.value && !!selectedExaminationId.value && !!selectedPatientId.value);
    const currentRuntimeDraft = computed(() => {
        if (!patientExaminationId.value)
            return null;
        return runtimeDraftsByPatientExaminationId.value[String(patientExaminationId.value)] || null;
    });
    const hasDraftContent = computed(() => {
        const hasNonDefaultIndications = indications.value.length > 1 ||
            indications.value.some((row) => row.examinationIndicationId !== null || row.indicationChoiceId !== null);
        return !!(patientExaminationId.value &&
            (activeReportId.value ||
                currentRuntimeDraft.value ||
                selectedTemplateName.value ||
                Object.keys(templateSectionDrafts.value).length ||
                hasNonDefaultIndications ||
                findingsRevision.value > 0));
    });
    const canUseLookupPages = computed(() => !!patientExaminationId.value && !!lookupToken.value && sessionStatus.value !== 'expired');
    function setLookupSession(params) {
        lookupToken.value = params.lookupToken;
        patientExaminationId.value = params.patientExaminationId;
        sessionStatus.value = params.status ?? (params.lookupToken ? 'active' : 'idle');
    }
    function setPatientExaminationContext(params) {
        patientExaminationId.value = params.patientExaminationId;
        if (params.selectedPatientId !== undefined) {
            selectedPatientId.value = params.selectedPatientId;
        }
        if (params.selectedExaminationId !== undefined) {
            selectedExaminationId.value = params.selectedExaminationId;
        }
        lookupToken.value = null;
        sessionStatus.value = 'idle';
        activeReportId.value = null;
        indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }];
        lookupSnapshot.value = null;
        lastTemplateValidation.value = null;
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        if (!(params.preserveTemplateSelection ?? false)) {
            selectedTemplateName.value = null;
            templateSectionDrafts.value = {};
        }
        else {
            templateSectionDrafts.value = {};
        }
    }
    function setRuntimeDraft(draft) {
        runtimeDraftsByPatientExaminationId.value = {
            ...runtimeDraftsByPatientExaminationId.value,
            [String(draft.patientExaminationId)]: {
                ...draft,
                payload: normalizeRuntimePayloadIds(draft.payload)
            }
        };
    }
    function markDraftPersistenceHydrated(updatedAt) {
        draftPersistenceStatus.value = updatedAt ? 'saved' : 'idle';
        draftPersistenceError.value = null;
        lastPersistedDraftAt.value = updatedAt;
        draftAutosaveSignature.value = currentDraftPersistenceSignature.value;
    }
    function updateCurrentRuntimeDraft(updater) {
        const currentDraft = currentRuntimeDraft.value;
        if (!currentDraft)
            return null;
        const nextDraft = updater(currentDraft);
        if (!nextDraft)
            return null;
        setRuntimeDraft({
            ...nextDraft,
            updatedAt: new Date().toISOString()
        });
        return runtimeDraftsByPatientExaminationId.value[String(nextDraft.patientExaminationId)] || null;
    }
    function addFinding(params) {
        if (!params.findingName.trim())
            return null;
        const findingLocalId = nextRuntimeDraftEntityId('finding');
        const updated = updateCurrentRuntimeDraft((draft) => ({
            ...draft,
            payload: {
                ...draft.payload,
                patientFindings: [
                    ...draft.payload.patientFindings,
                    {
                        localId: findingLocalId,
                        finding: params.findingName.trim(),
                        classificationChoices: []
                    }
                ]
            }
        }));
        return updated ? findingLocalId : null;
    }
    function removeFinding(findingLocalId) {
        if (!findingLocalId)
            return;
        updateCurrentRuntimeDraft((draft) => ({
            ...draft,
            payload: {
                ...draft.payload,
                patientFindings: draft.payload.patientFindings.filter((finding) => finding.localId !== findingLocalId)
            }
        }));
    }
    function updateClassificationValue(params) {
        if (!params.findingLocalId || !params.classificationName.trim())
            return;
        updateCurrentRuntimeDraft((draft) => ({
            ...draft,
            payload: {
                ...draft.payload,
                patientFindings: draft.payload.patientFindings.map((finding) => {
                    if (finding.localId !== params.findingLocalId)
                        return finding;
                    const classificationKey = params.classificationName.trim();
                    const remainingChoices = finding.classificationChoices.filter((choice) => choice.classification !== classificationKey);
                    if (!params.classificationChoice) {
                        return {
                            ...finding,
                            classificationChoices: remainingChoices
                        };
                    }
                    const existingChoice = finding.classificationChoices.find((choice) => choice.classification === classificationKey);
                    const nextChoice = {
                        localId: existingChoice?.localId || nextRuntimeDraftEntityId('classification'),
                        classification: classificationKey,
                        classificationChoice: params.classificationChoice,
                        descriptors: normalizeRuntimeDescriptors(params.descriptors)
                    };
                    return {
                        ...finding,
                        classificationChoices: [...remainingChoices, nextChoice]
                    };
                })
            }
        }));
    }
    function clearRuntimeDraft(targetPatientExaminationId) {
        if (targetPatientExaminationId == null) {
            runtimeDraftsByPatientExaminationId.value = {};
            return;
        }
        const next = { ...runtimeDraftsByPatientExaminationId.value };
        delete next[String(targetPatientExaminationId)];
        runtimeDraftsByPatientExaminationId.value = next;
    }
    const currentDraftPersistencePayload = computed(() => {
        const draft = currentRuntimeDraft.value;
        if (!draft || !draft.patientExaminationId)
            return null;
        return {
            patientExaminationId: draft.patientExaminationId,
            moduleName: draft.moduleName,
            templateName: draft.templateName,
            payload: draft.payload
        };
    });
    const currentDraftPersistenceSignature = computed(() => {
        if (!currentDraftPersistencePayload.value)
            return null;
        return JSON.stringify(currentDraftPersistencePayload.value);
    });
    const hasUnpersistedDraftChanges = computed(() => {
        if (!currentRuntimeDraft.value)
            return false;
        if (draftPersistenceStatus.value === 'saving')
            return true;
        const currentSignature = currentDraftPersistenceSignature.value;
        if (!currentSignature)
            return false;
        return currentSignature !== draftAutosaveSignature.value;
    });
    async function persistCurrentRuntimeDraft() {
        const draft = currentRuntimeDraft.value;
        if (!draft?.patientExaminationId)
            return;
        if (draftPersistencePromise.value) {
            return draftPersistencePromise.value;
        }
        const signatureToPersist = currentDraftPersistenceSignature.value;
        draftPersistenceStatus.value = 'saving';
        draftPersistenceError.value = null;
        const request = (async () => {
            try {
                const response = await savePatientExaminationDraft({
                    patientExaminationId: draft.patientExaminationId,
                    moduleName: draft.moduleName,
                    templateName: draft.templateName,
                    payload: draft.payload
                });
                draftPersistenceStatus.value = 'saved';
                lastPersistedDraftAt.value = response.updatedAt ?? response.updated_at ?? null;
                draftAutosaveSignature.value = signatureToPersist;
            }
            catch (error) {
                draftPersistenceStatus.value = 'error';
                draftPersistenceError.value =
                    error?.response?.data?.detail ||
                        error?.message ||
                        'Der Reporting-Entwurf konnte nicht gespeichert werden.';
                throw error;
            }
            finally {
                draftPersistencePromise.value = null;
            }
        })();
        draftPersistencePromise.value = request;
        return request;
    }
    function scheduleDraftAutosave() {
        if (draftAutosaveTimer.value) {
            clearTimeout(draftAutosaveTimer.value);
        }
        draftAutosaveTimer.value = setTimeout(() => {
            draftAutosaveTimer.value = null;
            void persistCurrentRuntimeDraft();
        }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
    }
    async function flushDraftAutosave() {
        if (draftAutosaveTimer.value) {
            clearTimeout(draftAutosaveTimer.value);
            draftAutosaveTimer.value = null;
        }
        if (!currentRuntimeDraft.value)
            return;
        if (!hasUnpersistedDraftChanges.value && !draftPersistencePromise.value)
            return;
        await persistCurrentRuntimeDraft();
    }
    function setSavingFinalReport(value) {
        savingFinalReport.value = value;
    }
    function setCaseSelection(params) {
        if (params.selectedPatientId !== undefined)
            selectedPatientId.value = params.selectedPatientId;
        if (params.selectedExaminationId !== undefined)
            selectedExaminationId.value = params.selectedExaminationId;
    }
    function setActiveReportId(id) {
        activeReportId.value = id;
    }
    function setSessionStatus(status) {
        sessionStatus.value = status;
    }
    function setTemplateSelection(params) {
        if (params.moduleName !== undefined) {
            selectedKbModule.value = params.moduleName || 'report_template_examples';
        }
        if (params.templateName !== undefined) {
            selectedTemplateName.value = params.templateName || null;
        }
    }
    function setTemplateSectionDraft(sectionName, patch) {
        if (!sectionName)
            return;
        const current = templateSectionDrafts.value[sectionName] || {
            note: '',
            includePatientData: false,
            includeExaminationData: false
        };
        templateSectionDrafts.value = {
            ...templateSectionDrafts.value,
            [sectionName]: {
                note: patch.note ?? current.note,
                includePatientData: patch.includePatientData ?? current.includePatientData,
                includeExaminationData: patch.includeExaminationData ?? current.includeExaminationData
            }
        };
    }
    function clearTemplateSectionDrafts() {
        templateSectionDrafts.value = {};
    }
    function applyPersistedState(persisted) {
        lookupToken.value = persisted?.lookupToken ?? null;
        patientExaminationId.value = persisted?.patientExaminationId ?? null;
        selectedPatientId.value = persisted?.selectedPatientId ?? null;
        selectedExaminationId.value = persisted?.selectedExaminationId ?? null;
        activeReportId.value = persisted?.activeReportId ?? null;
        indications.value =
            persisted?.indications?.length
                ? persisted.indications
                : [{ examinationIndicationId: null, indicationChoiceId: null }];
        selectedKbModule.value = persisted?.selectedKbModule ?? 'report_template_examples';
        selectedTemplateName.value = persisted?.selectedTemplateName ?? null;
        templateSectionDrafts.value = persisted?.templateSectionDrafts ?? {};
        runtimeDraftsByPatientExaminationId.value =
            persisted?.runtimeDraftsByPatientExaminationId ?? {};
    }
    function bindAuthSubject(subject) {
        const normalized = typeof subject === 'string' && subject.trim() ? subject.trim() : null;
        if (authSubject.value === normalized)
            return;
        authSubject.value = normalized;
        clearAll();
        if (!normalized) {
            clearPersistedState();
            return;
        }
        applyPersistedState(loadPersistedState(normalized));
    }
    function resetForPatientSwitch() {
        if (draftAutosaveTimer.value) {
            clearTimeout(draftAutosaveTimer.value);
            draftAutosaveTimer.value = null;
        }
        lookupToken.value = null;
        patientExaminationId.value = null;
        selectedExaminationId.value = null;
        activeReportId.value = null;
        sessionStatus.value = 'idle';
        indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }];
        lookupSnapshot.value = null;
        lastTemplateValidation.value = null;
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        selectedTemplateName.value = null;
        templateSectionDrafts.value = {};
        runtimeDraftsByPatientExaminationId.value = {};
        mediaPreload.value = null;
        mediaPreloadStatus.value = 'idle';
        mediaPreloadError.value = null;
        draftPersistenceStatus.value = 'idle';
        draftPersistenceError.value = null;
        lastPersistedDraftAt.value = null;
        draftAutosaveSignature.value = null;
        draftPersistencePromise.value = null;
        savingFinalReport.value = false;
    }
    function clearAll() {
        if (draftAutosaveTimer.value) {
            clearTimeout(draftAutosaveTimer.value);
            draftAutosaveTimer.value = null;
        }
        lookupToken.value = null;
        patientExaminationId.value = null;
        selectedPatientId.value = null;
        selectedExaminationId.value = null;
        activeReportId.value = null;
        sessionStatus.value = 'idle';
        indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }];
        lookupSnapshot.value = null;
        lastTemplateValidation.value = null;
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        selectedKbModule.value = 'report_template_examples';
        selectedTemplateName.value = null;
        templateSectionDrafts.value = {};
        runtimeDraftsByPatientExaminationId.value = {};
        mediaPreload.value = null;
        mediaPreloadStatus.value = 'idle';
        mediaPreloadError.value = null;
        draftPersistenceStatus.value = 'idle';
        draftPersistenceError.value = null;
        lastPersistedDraftAt.value = null;
        draftAutosaveSignature.value = null;
        draftPersistencePromise.value = null;
        savingFinalReport.value = false;
    }
    function setMediaPreloadLoading() {
        mediaPreloadStatus.value = 'loading';
        mediaPreloadError.value = null;
    }
    function setMediaPreload(payload) {
        mediaPreload.value = payload;
        mediaPreloadStatus.value = payload ? 'ready' : 'idle';
        mediaPreloadError.value = null;
    }
    function setMediaPreloadError(message) {
        mediaPreloadStatus.value = 'error';
        mediaPreloadError.value = message;
    }
    function clearMediaPreload() {
        mediaPreload.value = null;
        mediaPreloadStatus.value = 'idle';
        mediaPreloadError.value = null;
    }
    function setIndications(rows) {
        indications.value = rows.length ? rows : [{ examinationIndicationId: null, indicationChoiceId: null }];
    }
    function setLookupSnapshot(snapshot) {
        lookupSnapshot.value = snapshot;
    }
    function patchLookupSnapshot(partial) {
        lookupSnapshot.value = {
            ...(lookupSnapshot.value || {}),
            ...partial
        };
    }
    function setLastTemplateValidation(validation) {
        lastTemplateValidation.value = validation;
    }
    function noteFindingAdded(findingId) {
        findingsRevision.value += 1;
        lastFindingsEvent.value = {
            type: 'finding_added',
            at: new Date().toISOString(),
            findingId
        };
    }
    function noteClassificationUpdated(findingId, classificationId, choiceId) {
        findingsRevision.value += 1;
        lastFindingsEvent.value = {
            type: 'classification_updated',
            at: new Date().toISOString(),
            findingId,
            classificationId,
            choiceId
        };
    }
    function addIndicationRow() {
        indications.value = [
            ...indications.value,
            { examinationIndicationId: null, indicationChoiceId: null }
        ];
    }
    function updateIndicationRow(index, patch) {
        if (index < 0 || index >= indications.value.length)
            return;
        const next = indications.value.slice();
        next[index] = {
            ...next[index],
            ...patch
        };
        indications.value = next;
    }
    function removeIndicationRow(index) {
        if (indications.value.length <= 1) {
            indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }];
            return;
        }
        indications.value = indications.value.filter((_, i) => i !== index);
    }
    const persistable = computed(() => ({
        lookupToken: lookupToken.value,
        patientExaminationId: patientExaminationId.value,
        selectedPatientId: selectedPatientId.value,
        selectedExaminationId: selectedExaminationId.value,
        activeReportId: activeReportId.value,
        indications: indications.value,
        selectedKbModule: selectedKbModule.value,
        selectedTemplateName: selectedTemplateName.value,
        templateSectionDrafts: templateSectionDrafts.value,
        runtimeDraftsByPatientExaminationId: runtimeDraftsByPatientExaminationId.value
    }));
    watch(persistable, (state) => {
        if (!authSubject.value) {
            clearPersistedState();
            return;
        }
        const envelope = {
            ownerSub: authSubject.value,
            expiresAt: Date.now() + STORAGE_TTL_MS,
            state
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    }, { deep: true });
    watch(currentDraftPersistenceSignature, (signature) => {
        if (!signature)
            return;
        if (signature === draftAutosaveSignature.value)
            return;
        scheduleDraftAutosave();
    });
    return {
        authSubject,
        sessionStatus,
        lookupToken,
        patientExaminationId,
        selectedPatientId,
        selectedExaminationId,
        activeReportId,
        selectedKbModule,
        selectedTemplateName,
        templateSectionDrafts,
        runtimeDraftsByPatientExaminationId,
        currentRuntimeDraft,
        indications,
        lookupSnapshot,
        lastTemplateValidation,
        findingsRevision,
        lastFindingsEvent,
        mediaPreload,
        mediaPreloadStatus,
        mediaPreloadError,
        draftPersistenceStatus,
        draftPersistenceError,
        lastPersistedDraftAt,
        hasUnpersistedDraftChanges,
        savingFinalReport,
        hasActiveCase,
        hasDraftContent,
        canUseLookupPages,
        setLookupSession,
        setPatientExaminationContext,
        setRuntimeDraft,
        markDraftPersistenceHydrated,
        persistCurrentRuntimeDraft,
        flushDraftAutosave,
        setSavingFinalReport,
        clearRuntimeDraft,
        addFinding,
        removeFinding,
        updateClassificationValue,
        setCaseSelection,
        setActiveReportId,
        setSessionStatus,
        setTemplateSelection,
        setTemplateSectionDraft,
        clearTemplateSectionDrafts,
        bindAuthSubject,
        setIndications,
        setLookupSnapshot,
        patchLookupSnapshot,
        setLastTemplateValidation,
        noteFindingAdded,
        noteClassificationUpdated,
        setMediaPreloadLoading,
        setMediaPreload,
        setMediaPreloadError,
        clearMediaPreload,
        addIndicationRow,
        updateIndicationRow,
        removeIndicationRow,
        resetForPatientSwitch,
        clearAll
    };
});
