import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
const STORAGE_KEY = 'reportingFlowState.v1';
function loadPersistedState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
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
    catch {
        return null;
    }
}
export const useReportingFlowStore = defineStore('reportingFlow', () => {
    const persisted = loadPersistedState();
    const sessionStatus = ref('idle');
    const lookupToken = ref(persisted?.lookupToken ?? null);
    const patientExaminationId = ref(persisted?.patientExaminationId ?? null);
    const selectedPatientId = ref(persisted?.selectedPatientId ?? null);
    const selectedExaminationId = ref(persisted?.selectedExaminationId ?? null);
    const selectedRequirementSetIds = ref(persisted?.selectedRequirementSetIds ?? []);
    const activeReportId = ref(persisted?.activeReportId ?? null);
    const selectedKbModule = ref(persisted?.selectedKbModule ?? 'report_template_examples');
    const selectedTemplateName = ref(persisted?.selectedTemplateName ?? null);
    const templateSectionDrafts = ref(persisted?.templateSectionDrafts ?? {});
    const indications = ref(persisted?.indications ?? [{ examinationIndicationId: null, indicationChoiceId: null }]);
    const lookupSnapshot = ref(null);
    const lastRequirementGuidance = ref(null);
    const findingsRevision = ref(0);
    const lastFindingsEvent = ref(null);
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
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        selectedTemplateName.value = null;
        templateSectionDrafts.value = {};
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
        findingsRevision.value = 0;
        lastFindingsEvent.value = null;
        selectedKbModule.value = 'report_template_examples';
        selectedTemplateName.value = null;
        templateSectionDrafts.value = {};
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, { deep: true });
    return {
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
        findingsRevision,
        lastFindingsEvent,
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
        setIndications,
        setLookupSnapshot,
        patchLookupSnapshot,
        setLastRequirementGuidance,
        noteFindingAdded,
        noteClassificationUpdated,
        addIndicationRow,
        updateIndicationRow,
        removeIndicationRow,
        resetForPatientSwitch,
        clearAll
    };
});
