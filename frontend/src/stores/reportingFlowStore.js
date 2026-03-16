import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
const STORAGE_KEY = 'reportingFlowState.v2';
const LEGACY_STORAGE_KEY = 'reportingFlowState.v1';
const STORAGE_TTL_MS = 30 * 60 * 1000;
function clearPersistedState() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    catch { }
}
function normalizePersistedState(parsed) {
    return {
        lookupToken: typeof parsed.lookupToken === 'string' ? parsed.lookupToken : null,
        patientExaminationId: typeof parsed.patientExaminationId === 'number' ? parsed.patientExaminationId : null,
        selectedPatientId: typeof parsed.selectedPatientId === 'number' ? parsed.selectedPatientId : null,
        selectedExaminationId: typeof parsed.selectedExaminationId === 'number' ? parsed.selectedExaminationId : null,
        selectedRequirementSetIds: Array.isArray(parsed.selectedRequirementSetIds)
            ? parsed.selectedRequirementSetIds.filter((v) => typeof v === 'number')
            : [],
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
            : {}
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
    const selectedRequirementSetIds = ref([]);
    const activeReportId = ref(null);
    const selectedKbModule = ref('report_template_examples');
    const selectedTemplateName = ref(null);
    const templateSectionDrafts = ref({});
    const indications = ref([{ examinationIndicationId: null, indicationChoiceId: null }]);
    const lookupSnapshot = ref(null);
    const lastRequirementGuidance = ref(null);
    const lastTemplateValidation = ref(null);
    const findingsRevision = ref(0);
    const lastFindingsEvent = ref(null);
    const mediaPreload = ref(null);
    const mediaPreloadStatus = ref('idle');
    const mediaPreloadError = ref(null);
    const hasActiveCase = computed(() => !!patientExaminationId.value && !!selectedExaminationId.value && !!selectedPatientId.value);
    const canUseLookupPages = computed(() => !!patientExaminationId.value && !!lookupToken.value && sessionStatus.value !== 'expired');
    function setLookupSession(params) {
        lookupToken.value = params.lookupToken;
        patientExaminationId.value = params.patientExaminationId;
        sessionStatus.value = params.status ?? (params.lookupToken ? 'active' : 'idle');
    }
    function setCaseSelection(params) {
        if (params.selectedPatientId !== undefined)
            selectedPatientId.value = params.selectedPatientId;
        if (params.selectedExaminationId !== undefined)
            selectedExaminationId.value = params.selectedExaminationId;
    }
    function setSelectedRequirementSetIds(ids) {
        selectedRequirementSetIds.value = Array.from(new Set(ids.filter((v) => Number.isFinite(v))));
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
        selectedRequirementSetIds.value = persisted?.selectedRequirementSetIds ?? [];
        activeReportId.value = persisted?.activeReportId ?? null;
        indications.value =
            persisted?.indications?.length
                ? persisted.indications
                : [{ examinationIndicationId: null, indicationChoiceId: null }];
        selectedKbModule.value = persisted?.selectedKbModule ?? 'report_template_examples';
        selectedTemplateName.value = persisted?.selectedTemplateName ?? null;
        templateSectionDrafts.value = persisted?.templateSectionDrafts ?? {};
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
        lookupToken.value = null;
        patientExaminationId.value = null;
        selectedExaminationId.value = null;
        selectedRequirementSetIds.value = [];
        activeReportId.value = null;
        sessionStatus.value = 'idle';
        indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }];
        lookupSnapshot.value = null;
        lastRequirementGuidance.value = null;
        lastTemplateValidation.value = null;
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        selectedTemplateName.value = null;
        templateSectionDrafts.value = {};
        mediaPreload.value = null;
        mediaPreloadStatus.value = 'idle';
        mediaPreloadError.value = null;
    }
    function clearAll() {
        lookupToken.value = null;
        patientExaminationId.value = null;
        selectedPatientId.value = null;
        selectedExaminationId.value = null;
        selectedRequirementSetIds.value = [];
        activeReportId.value = null;
        sessionStatus.value = 'idle';
        indications.value = [{ examinationIndicationId: null, indicationChoiceId: null }];
        lookupSnapshot.value = null;
        lastRequirementGuidance.value = null;
        lastTemplateValidation.value = null;
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        selectedKbModule.value = 'report_template_examples';
        selectedTemplateName.value = null;
        templateSectionDrafts.value = {};
        mediaPreload.value = null;
        mediaPreloadStatus.value = 'idle';
        mediaPreloadError.value = null;
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
    function setLastRequirementGuidance(guidance) {
        lastRequirementGuidance.value = guidance;
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
        selectedRequirementSetIds: selectedRequirementSetIds.value,
        activeReportId: activeReportId.value,
        indications: indications.value,
        selectedKbModule: selectedKbModule.value,
        selectedTemplateName: selectedTemplateName.value,
        templateSectionDrafts: templateSectionDrafts.value
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
    return {
        authSubject,
        sessionStatus,
        lookupToken,
        patientExaminationId,
        selectedPatientId,
        selectedExaminationId,
        selectedRequirementSetIds,
        activeReportId,
        selectedKbModule,
        selectedTemplateName,
        templateSectionDrafts,
        indications,
        lookupSnapshot,
        lastRequirementGuidance,
        lastTemplateValidation,
        findingsRevision,
        lastFindingsEvent,
        mediaPreload,
        mediaPreloadStatus,
        mediaPreloadError,
        hasActiveCase,
        canUseLookupPages,
        setLookupSession,
        setCaseSelection,
        setSelectedRequirementSetIds,
        setActiveReportId,
        setSessionStatus,
        setTemplateSelection,
        setTemplateSectionDraft,
        clearTemplateSectionDrafts,
        bindAuthSubject,
        setIndications,
        setLookupSnapshot,
        patchLookupSnapshot,
        setLastRequirementGuidance,
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
