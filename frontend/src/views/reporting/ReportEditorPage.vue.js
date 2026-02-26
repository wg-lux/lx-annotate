import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue';
import LookupStatusPanel from '@/components/Reporting/LookupStatusPanel.vue';
import ReportArtifactsPanel from '@/components/Reporting/ReportArtifactsPanel.vue';
import { endpoints } from '@/types/api/endpoints';
import { mergeClassificationSelections, normalizeInterventions } from '@/components/AssistedReporting/reportSubmissionUtils';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { usePatientStore } from '@/stores/patientStore';
const flow = useReportingFlowStore();
const patientStore = usePatientStore();
const route = useRoute();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const saveWarnings = ref([]);
const lastSaveStatus = ref(null);
const pendingSaveStatus = ref(null);
const currentReportVersion = ref(null);
const persistedArtifacts = ref(null);
const templateName = ref('star_upper_gi_main');
const historyContext = ref(null);
const requirementGuidance = ref(null);
const canSave = computed(() => !!flow.patientExaminationId && !!templateName.value.trim());
const normalizedIndications = computed(() => flow.indications
    .filter((row) => row.examinationIndicationId != null)
    .map((row) => ({
    examinationIndicationId: row.examinationIndicationId,
    indicationChoiceId: row.indicationChoiceId ?? undefined
})));
const normalizedIndicationsPreview = computed(() => JSON.stringify(normalizedIndications.value, null, 2));
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function formatDateOnly(value) {
    if (!value)
        return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return null;
    return d.toISOString().split('T')[0] || null;
}
function buildPatientDataPayload() {
    const patient = flow.selectedPatientId ? patientStore.getPatientById(flow.selectedPatientId) : null;
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
async function ensurePatientsLoaded() {
    if (!patientStore.patients.length) {
        await patientStore.fetchPatients();
    }
}
async function fetchNormalizedFindingsPayload() {
    if (!flow.patientExaminationId)
        return [];
    try {
        const res = await axiosInstance.get(`/api/patient-findings/?patient_examination=${flow.patientExaminationId}`);
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
        const res = await axiosInstance.get(`/api/patient-examinations/${flow.patientExaminationId}/findings/`);
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
        savedAt: new Date().toISOString()
    };
}
function buildRenderedText() {
    return '';
}
async function loadLatestReportMeta() {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Keine Patientenuntersuchung ausgewählt.';
        return;
    }
    loading.value = true;
    clearMessages();
    try {
        const res = await axiosInstance.get(`/api/patient-examination-reports/?patient_examination_id=${flow.patientExaminationId}`);
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
        if (latest.templateName && !templateName.value) {
            templateName.value = latest.templateName;
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
    if (!templateName.value.trim()) {
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
            templateName: templateName.value.trim(),
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
    await ensurePatientsLoaded();
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
    ...{ class: "col-md-6" },
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
    ...{ class: "col-md-6" },
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
    ...{ class: "row g-3 mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
});
(__VLS_ctx.templateName);
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
/** @type {[typeof IndicationsEditor, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(IndicationsEditor, new IndicationsEditor({
    ...{ 'onUpdateRow': {} },
    ...{ 'onAddRow': {} },
    ...{ 'onRemoveRow': {} },
    ...{ class: "mb-4" },
    rows: (__VLS_ctx.flow.indications),
    disabled: (__VLS_ctx.loading),
    description: "Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend.",
}));
const __VLS_8 = __VLS_7({
    ...{ 'onUpdateRow': {} },
    ...{ 'onAddRow': {} },
    ...{ 'onRemoveRow': {} },
    ...{ class: "mb-4" },
    rows: (__VLS_ctx.flow.indications),
    disabled: (__VLS_ctx.loading),
    description: "Dieser Status wird direkt auf &lt;code&gt;save-submission.indications&lt;/code&gt; gemappt. Leere Liste &lt;code&gt;[]&lt;/code&gt; löscht bestehende Indikationen auf dem Backend.",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_10;
let __VLS_11;
let __VLS_12;
const __VLS_13 = {
    onUpdateRow: ((idx, patch) => __VLS_ctx.flow.updateIndicationRow(idx, patch))
};
const __VLS_14 = {
    onAddRow: (...[$event]) => {
        __VLS_ctx.flow.addIndicationRow();
    }
};
const __VLS_15 = {
    onRemoveRow: ((idx) => __VLS_ctx.flow.removeIndicationRow(idx))
};
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-wrap gap-2 mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadLatestReportMeta) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading),
});
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
const __VLS_16 = __VLS_asFunctionalComponent(ReportArtifactsPanel, new ReportArtifactsPanel({
    artifacts: (__VLS_ctx.persistedArtifacts),
}));
const __VLS_17 = __VLS_16({
    artifacts: (__VLS_ctx.persistedArtifacts),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: "small mb-0 bg-light p-2 rounded" },
});
(__VLS_ctx.normalizedIndicationsPreview);
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
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
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
            templateName: templateName,
            canSave: canSave,
            normalizedIndicationsPreview: normalizedIndicationsPreview,
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
