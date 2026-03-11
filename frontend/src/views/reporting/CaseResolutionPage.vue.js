import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { usePatientStore } from '@/stores/patientStore';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { endpoints } from '@/types/api/endpoints';
import { DateConverter } from '@/utils/dateHelpers';
const route = useRoute();
const flow = useReportingFlowStore();
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const patientExaminationStore = usePatientExaminationStore();
const anonymizationStore = useAnonymizationStore();
const caseResolution = ref(null);
const casePatientExaminationOptions = ref([]);
const selectedCasePatientId = ref('');
const selectedExistingPatientExaminationId = ref('');
const selectedNewCaseExaminationId = ref('');
const isCreatingPatientFromMetadata = ref(false);
const isCreatingPatientExamination = ref(false);
const isLoadingCasePatientExaminations = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const targetFileId = computed(() => toPositiveInteger(route.query.fileId));
const targetScope = computed(() => {
    const value = route.query.mediaType;
    return value === 'pdf' || value === 'video' ? value : null;
});
const returnToPath = computed(() => {
    const raw = route.query.returnTo;
    return typeof raw === 'string' && raw.trim() ? raw : null;
});
const isCaseDataLoading = computed(() => patientStore.loading || examinationStore.loading);
const currentItem = computed(() => anonymizationStore.current);
const availablePatientOptions = computed(() => patientStore.patientsWithDisplayName);
const availableExaminationOptions = computed(() => examinationStore.examinationsDropdown);
const selectedCasePatientIdNumber = computed(() => toPositiveInteger(selectedCasePatientId.value));
const caseResolutionSuggestedPatientExaminationOptions = computed(() => {
    const matches = caseResolution.value?.patientExaminationMatches ?? [];
    return matches
        .map((match) => {
        const id = toPositiveInteger(match.id);
        if (id === null)
            return null;
        const examName = match.examinationName?.trim() || 'Untersuchung';
        const dateStart = normalizeDateInputToGerman(match.dateStart);
        return {
            id,
            label: dateStart ? `#${id} · ${examName} · ${dateStart}` : `#${id} · ${examName}`
        };
    })
        .filter((entry) => entry !== null);
});
const casePatientExaminationDropdownOptions = computed(() => {
    const byId = new Map();
    for (const option of casePatientExaminationOptions.value)
        byId.set(option.id, option);
    for (const option of caseResolutionSuggestedPatientExaminationOptions.value) {
        if (!byId.has(option.id))
            byId.set(option.id, option);
    }
    return [...byId.values()].sort((left, right) => right.id - left.id);
});
const patientHashDisplay = computed(() => caseResolution.value?.patientHashDisplay ?? currentItem.value?.patientHashDisplay ?? null);
const examinationHashDisplay = computed(() => caseResolution.value?.examinationHashDisplay ?? currentItem.value?.examinationHashDisplay ?? null);
const pseudoPatientId = computed(() => {
    const value = caseResolution.value?.pseudoPatient?.id ??
        currentItem.value?.pseudoPatientId ??
        currentItem.value?.patientId ??
        null;
    return typeof value === 'number' && value > 0 ? value : null;
});
const linkedPatientExaminationId = computed(() => {
    const value = caseResolution.value?.pseudoExamination?.linkedPatientExaminationId ??
        currentItem.value?.patientExaminationId ??
        caseResolution.value?.recommendedPatientExaminationId ??
        null;
    return typeof value === 'number' && value > 0 ? value : null;
});
const linkageStatus = computed(() => {
    if (caseResolution.value?.matchStatus === 'linked')
        return 'linked';
    if (caseResolution.value?.matchStatus === 'deferred')
        return 'deferred';
    if (caseResolution.value?.matchStatus === 'suggested')
        return 'suggested';
    if (linkedPatientExaminationId.value !== null)
        return 'linked';
    if (patientHashDisplay.value || examinationHashDisplay.value || pseudoPatientId.value !== null) {
        return 'suggested';
    }
    return 'not_linked';
});
const linkageStatusLabel = computed(() => {
    const labels = {
        not_linked: 'Nicht verknüpft',
        suggested: 'Vorgeschlagen',
        linked: 'Verknüpft',
        deferred: 'Zurückgestellt'
    };
    return labels[linkageStatus.value];
});
const linkageStatusDescription = computed(() => {
    if (linkageStatus.value === 'linked') {
        return 'Eine bestehende Fallverknüpfung ist bereits vorhanden oder wurde ausgewählt.';
    }
    if (linkageStatus.value === 'deferred') {
        return 'Die Fallzuordnung wurde bewusst vertagt und kann später abgeschlossen werden.';
    }
    if (caseResolution.value?.matchStatus === 'suggested' &&
        (caseResolution.value?.suggestedMatchCount ?? 0) > 1) {
        return 'Mehrere passende PatientExaminations wurden gefunden. Eine explizite Auswahl ist erforderlich.';
    }
    if (caseResolution.value?.matchStatus === 'suggested' &&
        (caseResolution.value?.suggestedMatchCount ?? 0) === 1) {
        return 'Eine passende PatientExamination wurde vorgeschlagen, ist aber noch nicht final bestätigt.';
    }
    if (linkageStatus.value === 'suggested') {
        return 'Hash- oder Pseudo-Patient-Hinweise sind vorhanden, die Zuordnung ist aber noch nicht final.';
    }
    return 'Derzeit liegt noch keine erkennbare Fallverknüpfung vor.';
});
const linkageStatusBadgeClass = computed(() => {
    const classes = {
        not_linked: 'bg-secondary',
        suggested: 'bg-warning text-dark',
        linked: 'bg-success',
        deferred: 'bg-info text-dark'
    };
    return classes[linkageStatus.value];
});
const pseudoPatientDisplay = computed(() => {
    if (pseudoPatientId.value !== null) {
        const matchCount = caseResolution.value?.pseudoPatient?.matchCount;
        return typeof matchCount === 'number' && matchCount > 0
            ? `#${pseudoPatientId.value} (${matchCount} Treffer)`
            : `#${pseudoPatientId.value}`;
    }
    return 'Nicht verknüpft';
});
const patientExaminationDisplay = computed(() => {
    if (linkedPatientExaminationId.value !== null)
        return `#${linkedPatientExaminationId.value}`;
    const suggestedId = caseResolution.value?.recommendedPatientExaminationId;
    return typeof suggestedId === 'number' && suggestedId > 0
        ? `Vorschlag: #${suggestedId}`
        : 'Noch keine Zuordnung';
});
const selectedCasePatientLabel = computed(() => {
    const patientId = selectedCasePatientIdNumber.value;
    if (patientId === null)
        return 'Kein Patient ausgewählt';
    const patient = patientStore.getPatientById(patientId);
    return patient
        ? `${patient.firstName || ''} ${patient.lastName || ''} (ID: ${patient.id})`.trim()
        : `Patient #${patientId}`;
});
const selectedCasePatientExaminationLabel = computed(() => {
    const selectedId = toPositiveInteger(selectedExistingPatientExaminationId.value);
    if (selectedId !== null) {
        const option = casePatientExaminationDropdownOptions.value.find((entry) => entry.id === selectedId);
        return option?.label ?? `#${selectedId}`;
    }
    if (flow.patientExaminationId)
        return `#${flow.patientExaminationId}`;
    return 'Keine Patientenuntersuchung vorgemerkt';
});
const patientDraftAvailable = computed(() => {
    const item = currentItem.value;
    if (!item)
        return false;
    return Boolean(item.patientFirstName?.trim() && item.patientLastName?.trim() && DateConverter.toISO(item.patientDob));
});
const caseSetupRoute = computed(() => ({
    path: '/reporting/case-setup',
    query: {
        ...(returnToPath.value ? { returnTo: returnToPath.value } : {}),
        preferredExamination: typeof route.query.preferredExamination === 'string'
            ? route.query.preferredExamination
            : 'colonoscopy'
    }
}));
const nextRoute = computed(() => flow.patientExaminationId
    ? `/reporting/${flow.patientExaminationId}/template-requirements`
    : '/reporting/case-setup');
function toPositiveInteger(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
}
function normalizeDateInputToGerman(value) {
    const isoDate = DateConverter.toISO(value);
    return isoDate ? DateConverter.toGerman(isoDate) : '';
}
function normalizePatientExaminationOption(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const row = raw;
    const id = toPositiveInteger(row.id);
    if (id === null)
        return null;
    const examinationName = (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
        (typeof row.examination === 'string' && row.examination.trim()) ||
        'Untersuchung';
    const dateStartRaw = typeof row.date_start === 'string' ? row.date_start : '';
    const dateStart = normalizeDateInputToGerman(dateStartRaw);
    return {
        id,
        label: dateStart ? `#${id} · ${examinationName} · ${dateStart}` : `#${id} · ${examinationName}`
    };
}
function addOrReplacePatientExaminationOption(target, option) {
    const existingIndex = target.findIndex((entry) => entry.id === option.id);
    if (existingIndex >= 0) {
        target[existingIndex] = option;
        return;
    }
    target.push(option);
}
async function initializeCurrentItemFromRouteContext() {
    const fileId = targetFileId.value;
    const scope = targetScope.value;
    if (fileId === null || scope === null)
        return;
    if (!anonymizationStore.overview.length) {
        await anonymizationStore.fetchOverview();
    }
    await anonymizationStore.setCurrentForValidation(fileId, scope);
}
async function fetchCaseResolution() {
    const fileId = targetFileId.value;
    const scope = targetScope.value;
    caseResolution.value = null;
    if (fileId === null || scope === null)
        return;
    const endpoint = scope === 'pdf'
        ? endpoints.media.pdfCaseResolution(fileId)
        : endpoints.media.videoCaseResolution(fileId);
    try {
        const { data } = await axiosInstance.get(r(endpoint));
        caseResolution.value = data;
    }
    catch (error) {
        console.warn('Case resolution lookup failed.', error);
    }
}
async function fetchCasePatientExaminations(patientId) {
    if (patientId <= 0) {
        casePatientExaminationOptions.value = [];
        return;
    }
    isLoadingCasePatientExaminations.value = true;
    clearMessages();
    try {
        const response = await axiosInstance.get(r(endpoints.examination.patientExaminationList), {
            params: { patient_id: patientId }
        });
        const rows = Array.isArray(response.data?.results)
            ? response.data.results
            : Array.isArray(response.data)
                ? response.data
                : [];
        casePatientExaminationOptions.value = rows
            .map((row) => normalizePatientExaminationOption(row))
            .filter((entry) => entry !== null)
            .sort((a, b) => b.id - a.id);
    }
    catch (error) {
        casePatientExaminationOptions.value = [];
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Patientenuntersuchungen konnten nicht geladen werden.';
    }
    finally {
        isLoadingCasePatientExaminations.value = false;
    }
}
function syncFlowPatientSelection(patientId, examinationId) {
    flow.setCaseSelection({
        selectedPatientId: patientId,
        ...(examinationId !== undefined ? { selectedExaminationId: examinationId } : {})
    });
}
function applySelectedPatientExamination(patientExaminationId) {
    const normalizedId = toPositiveInteger(patientExaminationId);
    if (normalizedId === null)
        return;
    const option = casePatientExaminationDropdownOptions.value.find((entry) => entry.id === normalizedId) ?? {
        id: normalizedId,
        label: `#${normalizedId}`
    };
    addOrReplacePatientExaminationOption(casePatientExaminationOptions.value, option);
    selectedExistingPatientExaminationId.value = String(normalizedId);
    flow.setLookupSession({
        patientExaminationId: normalizedId,
        lookupToken: null,
        status: 'idle'
    });
    patientExaminationStore.setCurrentPatientExaminationId(normalizedId);
}
async function useSelectedExistingPatientExamination() {
    clearMessages();
    const patientExaminationId = toPositiveInteger(selectedExistingPatientExaminationId.value);
    const patientId = selectedCasePatientIdNumber.value;
    if (patientExaminationId === null) {
        errorMessage.value = 'Bitte wählen Sie zuerst eine bestehende Patientenuntersuchung.';
        return;
    }
    syncFlowPatientSelection(patientId);
    applySelectedPatientExamination(patientExaminationId);
    successMessage.value = 'Die ausgewählte Patientenuntersuchung wurde in den Reporting-Flow übernommen.';
}
function normalizeGenderForPatientCreate(value) {
    if (!value)
        return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'männlich' || normalized === 'male' || normalized === 'm')
        return 'male';
    if (normalized === 'weiblich' || normalized === 'female' || normalized === 'w' || normalized === 'f')
        return 'female';
    if (normalized === 'divers' || normalized === 'unknown')
        return 'unknown';
    return normalized || null;
}
async function createPatientFromMetadata() {
    clearMessages();
    const item = currentItem.value;
    const patientDob = item?.patientDob ? DateConverter.toISO(item.patientDob) : null;
    if (!item?.patientFirstName || !item?.patientLastName || !patientDob) {
        errorMessage.value =
            'Für einen neuen Patienten werden mindestens Vorname, Nachname und ein gültiges Geburtsdatum benötigt.';
        return;
    }
    isCreatingPatientFromMetadata.value = true;
    try {
        const createdPatient = await patientStore.createPatient({
            firstName: item.patientFirstName.trim(),
            lastName: item.patientLastName.trim(),
            dob: patientDob,
            gender: normalizeGenderForPatientCreate(item.patientGenderName),
            center: item.centerName?.trim() || null,
            email: '',
            phone: '',
            patientHash: '',
            comments: '',
            isRealPerson: true
        });
        const patientId = toPositiveInteger(createdPatient.id);
        if (patientId !== null) {
            selectedCasePatientId.value = String(patientId);
            syncFlowPatientSelection(patientId);
            await fetchCasePatientExaminations(patientId);
        }
        successMessage.value =
            'Ein neuer Patient wurde aus den vorhandenen Metadaten angelegt. Sie können jetzt direkt eine Untersuchung auswählen oder anlegen.';
    }
    catch (error) {
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Der Patient konnte nicht angelegt werden.';
    }
    finally {
        isCreatingPatientFromMetadata.value = false;
    }
}
function formatDateOnly(value) {
    const isoDate = DateConverter.toISO(value);
    return isoDate || null;
}
async function createPatientExaminationFromSelection() {
    clearMessages();
    const patientId = selectedCasePatientIdNumber.value;
    const examinationId = toPositiveInteger(selectedNewCaseExaminationId.value);
    if (patientId === null) {
        errorMessage.value = 'Bitte wählen Sie zuerst einen Patienten aus.';
        return;
    }
    if (examinationId === null) {
        errorMessage.value = 'Bitte wählen Sie zuerst eine Untersuchung aus.';
        return;
    }
    const selectedPatient = patientStore.getPatientById(patientId);
    const selectedExam = availableExaminationOptions.value.find((exam) => exam.id === examinationId);
    if (!selectedPatient || !selectedExam) {
        errorMessage.value =
            'Patient oder Untersuchung konnten nicht aufgelöst werden. Bitte laden Sie die Seite neu.';
        return;
    }
    isCreatingPatientExamination.value = true;
    try {
        const response = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
            patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
            examination: selectedExam.name,
            dateStart: formatDateOnly(currentItem.value?.examinationDate) || formatDateOnly(new Date().toISOString()) || '',
            patientBirthDate: formatDateOnly(selectedPatient.dob),
            patientGender: selectedPatient.gender || null
        });
        const createdPatientExaminationId = toPositiveInteger(response.data?.id);
        if (createdPatientExaminationId === null) {
            throw new Error('Die neue Patientenuntersuchung konnte nicht identifiziert werden.');
        }
        syncFlowPatientSelection(patientId, examinationId);
        addOrReplacePatientExaminationOption(casePatientExaminationOptions.value, {
            id: createdPatientExaminationId,
            label: `#${createdPatientExaminationId} · ${selectedExam.displayName || selectedExam.name}`
        });
        patientExaminationStore.addPatientExamination(response.data);
        applySelectedPatientExamination(createdPatientExaminationId);
        await fetchCasePatientExaminations(patientId);
        selectedNewCaseExaminationId.value = '';
        successMessage.value =
            'Die neue Patientenuntersuchung wurde angelegt und in den Reporting-Flow übernommen.';
    }
    catch (error) {
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Die Patientenuntersuchung konnte nicht angelegt werden.';
    }
    finally {
        isCreatingPatientExamination.value = false;
    }
}
function applyPreferredExaminationSelection() {
    const preferredRaw = route.query.preferredExamination;
    if (typeof preferredRaw !== 'string' || !preferredRaw.trim() || flow.selectedExaminationId)
        return;
    const normalizedPreferred = preferredRaw.trim().toLowerCase();
    const match = availableExaminationOptions.value.find((exam) => exam.name.trim().toLowerCase() === normalizedPreferred);
    if (match) {
        selectedNewCaseExaminationId.value = String(match.id);
        syncFlowPatientSelection(flow.selectedPatientId, match.id);
    }
}
watch(selectedCasePatientId, async (nextPatientId) => {
    selectedExistingPatientExaminationId.value = '';
    const patientId = toPositiveInteger(nextPatientId);
    syncFlowPatientSelection(patientId);
    if (patientId === null) {
        casePatientExaminationOptions.value = [];
        return;
    }
    await fetchCasePatientExaminations(patientId);
});
onMounted(async () => {
    await Promise.all([patientStore.fetchPatients(), examinationStore.fetchExaminations()]);
    applyPreferredExaminationSelection();
    await initializeCurrentItemFromRouteContext();
    await fetchCaseResolution();
    if (flow.selectedPatientId) {
        selectedCasePatientId.value = String(flow.selectedPatientId);
    }
    else if (pseudoPatientId.value !== null) {
        selectedCasePatientId.value = String(pseudoPatientId.value);
    }
    if (flow.patientExaminationId) {
        selectedExistingPatientExaminationId.value = String(flow.patientExaminationId);
    }
    else if (linkedPatientExaminationId.value !== null) {
        selectedExistingPatientExaminationId.value = String(linkedPatientExaminationId.value);
    }
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
    ...{ class: (__VLS_ctx.linkageStatusBadgeClass) },
});
(__VLS_ctx.linkageStatusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.returnToPath) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info py-2" },
    });
}
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
    ...{ class: "row g-3 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "border rounded p-3 h-100 bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.pseudoPatientDisplay);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "border rounded p-3 h-100 bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.patientExaminationDisplay);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "border rounded p-3 h-100 bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.linkageStatusDescription);
if (__VLS_ctx.patientHashDisplay || __VLS_ctx.examinationHashDisplay) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "border rounded p-3 h-100 bg-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-uppercase text-muted fw-semibold mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
    (__VLS_ctx.patientHashDisplay || 'n/a');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
    (__VLS_ctx.examinationHashDisplay || 'n/a');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3 align-items-end" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ class: "form-select" },
    value: (__VLS_ctx.selectedCasePatientId),
    disabled: (__VLS_ctx.isCaseDataLoading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
(__VLS_ctx.isCaseDataLoading ? 'Patienten werden geladen...' : 'Bitte Patient wählen');
for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.availablePatientOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (patient.id),
        value: (String(patient.id)),
    });
    (patient.displayName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ class: "form-select" },
    value: (__VLS_ctx.selectedExistingPatientExaminationId),
    disabled: (__VLS_ctx.isLoadingCasePatientExaminations),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
(__VLS_ctx.isLoadingCasePatientExaminations
    ? 'Patientenuntersuchungen werden geladen...'
    : 'Bitte Patientenuntersuchung wählen');
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.casePatientExaminationDropdownOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (option.id),
        value: (String(option.id)),
    });
    (option.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "form-text text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.useSelectedExistingPatientExamination) },
    ...{ class: "btn btn-outline-primary w-100" },
    disabled: (!__VLS_ctx.selectedExistingPatientExaminationId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ class: "form-select" },
    value: (__VLS_ctx.selectedNewCaseExaminationId),
    disabled: (__VLS_ctx.isCaseDataLoading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
(__VLS_ctx.isCaseDataLoading ? 'Untersuchungen werden geladen...' : 'Bitte Untersuchung wählen');
for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.availableExaminationOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (exam.id),
        value: (String(exam.id)),
    });
    (exam.displayName);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "form-text text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createPatientFromMetadata) },
    ...{ class: "btn btn-outline-secondary w-100" },
    disabled: (__VLS_ctx.isCreatingPatientFromMetadata || !__VLS_ctx.patientDraftAvailable),
});
if (__VLS_ctx.isCreatingPatientFromMetadata) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-2" },
        role: "status",
        'aria-hidden': "true",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createPatientExaminationFromSelection) },
    ...{ class: "btn btn-primary w-100" },
    disabled: (__VLS_ctx.isCreatingPatientExamination || !__VLS_ctx.selectedCasePatientId || !__VLS_ctx.selectedNewCaseExaminationId),
});
if (__VLS_ctx.isCreatingPatientExamination) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner-border spinner-border-sm me-2" },
        role: "status",
        'aria-hidden': "true",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3 mt-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "border rounded p-3 h-100 bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.selectedCasePatientLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "border rounded p-3 h-100 bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.selectedCasePatientExaminationLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-3 d-flex flex-wrap gap-2" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    to: (__VLS_ctx.caseSetupRoute),
}));
const __VLS_2 = __VLS_1({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    to: (__VLS_ctx.caseSetupRoute),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
var __VLS_3;
if (__VLS_ctx.returnToPath) {
    const __VLS_4 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ class: "btn btn-outline-secondary btn-sm" },
        to: (__VLS_ctx.returnToPath),
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: "btn btn-outline-secondary btn-sm" },
        to: (__VLS_ctx.returnToPath),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    var __VLS_7;
}
if (__VLS_ctx.flow.patientExaminationId) {
    const __VLS_8 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ class: "btn btn-dark btn-sm" },
        to: (__VLS_ctx.nextRoute),
    }));
    const __VLS_10 = __VLS_9({
        ...{ class: "btn btn-dark btn-sm" },
        to: (__VLS_ctx.nextRoute),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    var __VLS_11;
}
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
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            flow: flow,
            selectedCasePatientId: selectedCasePatientId,
            selectedExistingPatientExaminationId: selectedExistingPatientExaminationId,
            selectedNewCaseExaminationId: selectedNewCaseExaminationId,
            isCreatingPatientFromMetadata: isCreatingPatientFromMetadata,
            isCreatingPatientExamination: isCreatingPatientExamination,
            isLoadingCasePatientExaminations: isLoadingCasePatientExaminations,
            errorMessage: errorMessage,
            successMessage: successMessage,
            returnToPath: returnToPath,
            isCaseDataLoading: isCaseDataLoading,
            availablePatientOptions: availablePatientOptions,
            availableExaminationOptions: availableExaminationOptions,
            casePatientExaminationDropdownOptions: casePatientExaminationDropdownOptions,
            patientHashDisplay: patientHashDisplay,
            examinationHashDisplay: examinationHashDisplay,
            linkageStatusLabel: linkageStatusLabel,
            linkageStatusDescription: linkageStatusDescription,
            linkageStatusBadgeClass: linkageStatusBadgeClass,
            pseudoPatientDisplay: pseudoPatientDisplay,
            patientExaminationDisplay: patientExaminationDisplay,
            selectedCasePatientLabel: selectedCasePatientLabel,
            selectedCasePatientExaminationLabel: selectedCasePatientExaminationLabel,
            patientDraftAvailable: patientDraftAvailable,
            caseSetupRoute: caseSetupRoute,
            nextRoute: nextRoute,
            useSelectedExistingPatientExamination: useSelectedExistingPatientExamination,
            createPatientFromMetadata: createPatientFromMetadata,
            createPatientExaminationFromSelection: createPatientExaminationFromSelection,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
