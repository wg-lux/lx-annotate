import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { endpoints } from '@/types/api/endpoints';
const flow = useReportingFlowStore();
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const patientExaminationStore = usePatientExaminationStore();
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const patients = computed(() => patientStore.patientsWithDisplayName);
const examinations = computed(() => examinationStore.examinationsDropdown);
const patientsLoading = computed(() => patientStore.loading);
const examinationsLoading = computed(() => examinationStore.loading);
const nextRoute = computed(() => flow.patientExaminationId
    ? `/reporting/${flow.patientExaminationId}/template-requirements`
    : '/reporting/case-setup');
const sessionBadgeLabel = computed(() => {
    switch (flow.sessionStatus) {
        case 'active':
            return 'Lookup aktiv';
        case 'expired':
            return 'Lookup abgelaufen';
        case 'restarting':
            return 'Lookup wird neu gestartet';
        default:
            return 'Keine Session';
    }
});
const sessionBadgeClass = computed(() => {
    switch (flow.sessionStatus) {
        case 'active':
            return 'bg-success';
        case 'expired':
            return 'bg-danger';
        case 'restarting':
            return 'bg-warning text-dark';
        default:
            return 'bg-secondary';
    }
});
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function onPatientChange(raw) {
    clearMessages();
    const id = parseOptionalInt(raw);
    const previousPatientId = flow.selectedPatientId;
    if (previousPatientId && id !== previousPatientId) {
        flow.resetForPatientSwitch();
    }
    flow.setCaseSelection({ selectedPatientId: id });
}
function onExaminationChange(raw) {
    clearMessages();
    flow.setCaseSelection({ selectedExaminationId: parseOptionalInt(raw) });
}
async function reloadLists() {
    clearMessages();
    await Promise.all([patientStore.fetchPatients(), examinationStore.fetchExaminations()]);
}
function clearFlow() {
    clearMessages();
    flow.clearAll();
}
function formatDateOnly(value) {
    if (!value)
        return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return null;
    return d.toISOString().split('T')[0] || null;
}
async function createPatientExaminationAndInitLookup() {
    if (!flow.selectedPatientId || !flow.selectedExaminationId) {
        errorMessage.value = 'Bitte wählen Sie zuerst Patient und Untersuchung aus.';
        return;
    }
    const selectedPatient = patientStore.getPatientById(flow.selectedPatientId);
    const selectedExam = examinations.value.find((exam) => exam.id === flow.selectedExaminationId);
    if (!selectedPatient || !selectedExam) {
        errorMessage.value = 'Patient oder Untersuchung konnte nicht gefunden werden.';
        return;
    }
    loading.value = true;
    clearMessages();
    try {
        const formattedDate = new Date().toISOString().split('T')[0];
        const peRes = await axiosInstance.post(r(endpoints.router.patientExaminations), {
            patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
            examination: selectedExam.name,
            dateStart: formattedDate,
            patientBirthDate: formatDateOnly(selectedPatient.dob),
            patientGender: selectedPatient.gender || null
        });
        const pe = peRes.data;
        patientExaminationStore.addPatientExamination(pe);
        patientExaminationStore.setCurrentPatientExaminationId(pe.id);
        const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
            patientExaminationId: pe.id
        });
        flow.setLookupSession({
            patientExaminationId: pe.id,
            lookupToken: initRes.data.token,
            status: 'active'
        });
        successMessage.value = 'Lookup-Session wurde erfolgreich gestartet.';
    }
    catch (e) {
        flow.setSessionStatus('idle');
        errorMessage.value =
            e?.response?.data?.detail ||
                e?.response?.data?.error ||
                e?.message ||
                'Fehler beim Erstellen der Patientenuntersuchung oder Starten der Lookup-Session.';
    }
    finally {
        loading.value = false;
    }
}
async function reinitLookup() {
    if (!flow.patientExaminationId) {
        errorMessage.value = 'Keine Patientenuntersuchung vorhanden.';
        return;
    }
    loading.value = true;
    clearMessages();
    flow.setSessionStatus('restarting');
    try {
        const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
            patientExaminationId: flow.patientExaminationId
        });
        flow.setLookupSession({
            patientExaminationId: flow.patientExaminationId,
            lookupToken: initRes.data.token,
            status: 'active'
        });
        successMessage.value = 'Lookup-Session wurde neu initialisiert.';
    }
    catch (e) {
        flow.setSessionStatus('expired');
        errorMessage.value =
            e?.response?.data?.detail || e?.message || 'Fehler beim Neuinitialisieren der Lookup-Session.';
    }
    finally {
        loading.value = false;
    }
}
function parseOptionalInt(value) {
    const n = Number(value);
    return Number.isFinite(n) && value !== '' ? n : null;
}
onMounted(async () => {
    await reloadLists();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge" },
    ...{ class: (__VLS_ctx.sessionBadgeClass) },
});
(__VLS_ctx.sessionBadgeLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success py-2" },
    });
    (__VLS_ctx.successMessage);
}
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger py-2" },
    });
    (__VLS_ctx.errorMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.onPatientChange($event.target.value);
        } },
    ...{ class: "form-select" },
    value: (__VLS_ctx.flow.selectedPatientId ?? ''),
    disabled: (__VLS_ctx.patientsLoading || __VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
    disabled: true,
});
(__VLS_ctx.patientsLoading ? 'Patienten werden geladen...' : 'Bitte Patient wählen');
for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.patients))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (patient.id),
        value: (patient.id),
    });
    (patient.displayName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.onExaminationChange($event.target.value);
        } },
    ...{ class: "form-select" },
    value: (__VLS_ctx.flow.selectedExaminationId ?? ''),
    disabled: (__VLS_ctx.examinationsLoading || __VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
    disabled: true,
});
(__VLS_ctx.examinationsLoading ? 'Untersuchungen werden geladen...' : 'Bitte Untersuchung wählen');
for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (exam.id),
        value: (exam.id),
    });
    (exam.displayName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    type: "number",
    value: (__VLS_ctx.flow.patientExaminationId ?? ''),
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
    value: (__VLS_ctx.flow.lookupToken ?? ''),
    readonly: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-3 d-flex flex-wrap gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createPatientExaminationAndInitLookup) },
    ...{ class: "btn btn-primary btn-sm" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.flow.selectedPatientId || !__VLS_ctx.flow.selectedExaminationId),
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-1" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.reinitLookup) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.flow.patientExaminationId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.reloadLists) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.clearFlow) },
    ...{ class: "btn btn-outline-danger btn-sm" },
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-2" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "btn btn-dark btn-sm" },
    ...{ class: ({ disabled: !__VLS_ctx.flow.patientExaminationId }) },
    to: (__VLS_ctx.nextRoute),
}));
const __VLS_2 = __VLS_1({
    ...{ class: "btn btn-dark btn-sm" },
    ...{ class: ({ disabled: !__VLS_ctx.flow.patientExaminationId }) },
    to: (__VLS_ctx.nextRoute),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            flow: flow,
            loading: loading,
            errorMessage: errorMessage,
            successMessage: successMessage,
            patients: patients,
            examinations: examinations,
            patientsLoading: patientsLoading,
            examinationsLoading: examinationsLoading,
            nextRoute: nextRoute,
            sessionBadgeLabel: sessionBadgeLabel,
            sessionBadgeClass: sessionBadgeClass,
            onPatientChange: onPatientChange,
            onExaminationChange: onExaminationChange,
            reloadLists: reloadLists,
            clearFlow: clearFlow,
            createPatientExaminationAndInitLookup: createPatientExaminationAndInitLookup,
            reinitLookup: reinitLookup,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
