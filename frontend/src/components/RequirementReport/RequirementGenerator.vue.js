import { ref, computed, onMounted, watch } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import PatientAdder from '@/components/CaseGenerator/PatientAdder.vue';
// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
// --- API ---
const LOOKUP_BASE = '/lookup';
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
// --- Computed from Store ---
const patients = computed(() => {
    const result = patientStore.patientsWithDisplayName;
    console.log('Patients with display_name:', result); // Zum Debuggen
    return result;
});
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => examinationStore.examinationsDropdown);
const isLoadingExaminations = computed(() => examinationStore.loading);
// --- Computed from Local State ---
const requirementSets = computed(() => lookup.value?.requirement_sets ?? []);
const selectedRequirementSetIds = computed({
    get: () => lookup.value?.selectedRequirementSetIds ?? [],
    set: (val) => { if (lookup.value)
        lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed(() => lookup.value?.availableFindings ?? []);
const selectionsPretty = computed(() => JSON.stringify({
    token: lookupToken.value,
    selectedRequirementSetIds: selectedRequirementSetIds.value,
}, null, 2));
// --- Methods ---
function axiosError(e) {
    if (e?.response?.data?.detail)
        return e.response.data.detail;
    if (e?.message)
        return e.message;
    return 'Unbekannter Fehler';
}
function applyLookup(partial) {
    if (!lookup.value) {
        lookup.value = partial;
    }
    else {
        lookup.value = { ...lookup.value, ...partial };
    }
}
async function createPatientExaminationAndInitLookup() {
    if (!selectedPatientId.value || !selectedExaminationId.value)
        return;
    const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
    if (!selectedExam) {
        error.value = "Ausgewählte Untersuchung nicht gefunden.";
        return;
    }
    error.value = null;
    loading.value = true;
    try {
        // Step 1: Create PatientExamination
        const formattedDate = new Date().toISOString().split('T')[0];
        const peRes = await axiosInstance.post('/api/patient-examinations/create/', {
            patient: selectedPatientId.value, // Patient ID is likely correct as per serializer
            examination: selectedExam.name, // The serializer expects the name
            date_start: formattedDate, // Format date to YYYY-MM-DD
        });
        currentPatientExaminationId.value = peRes.data.id;
        // Step 2: Init lookup with the new PatientExamination ID
        const initRes = await axiosInstance.post(`api${LOOKUP_BASE}/init/`, {
            patient_examination_id: currentPatientExaminationId.value
        });
        lookupToken.value = initRes.data.token;
        // Step 3: Fetch all lookup data
        await fetchLookupAll();
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
        const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/all/`);
        applyLookup(res.data);
    }
    catch (e) {
        error.value = axiosError(e);
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
        error.value = axiosError(e);
    }
    finally {
        loading.value = false;
    }
}
async function patchLookup(updates) {
    if (!lookupToken.value)
        return;
    await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates });
    await fetchLookupParts(['availableFindings', 'requiredFindings']);
}
function toggleRequirementSet(id, on) {
    const s = new Set(selectedRequirementSetIds.value);
    if (on)
        s.add(id);
    else
        s.delete(id);
    selectedRequirementSetIds.value = Array.from(s);
    patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
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
    successMessage.value = `Patient "${patient.first_name} ${patient.last_name}" wurde erfolgreich erstellt und ausgewählt!`;
    // Nach 5 Sekunden ausblenden
    setTimeout(() => {
        successMessage.value = null;
    }, 5000);
}
// --- Watchers ---
watch(selectedExaminationId, (newId) => {
    examinationStore.setSelectedExamination(newId);
    if (newId) {
        examinationStore.loadFindingsForExamination(newId);
    }
});
// --- Lifecycle ---
onMounted(async () => {
    // Patienten und Untersuchungen laden
    await Promise.all([
        patientStore.fetchPatients(),
        examinationStore.fetchExaminations()
    ]);
    // Nachschlagedaten für Patientenerstellung laden
    await patientStore.initializeLookupData();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['btn-close', 'btn-close', 'btn-close',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("requirement-generator container-fluid py-4") },
    });
    if (__VLS_ctx.patientStore.error || __VLS_ctx.error || __VLS_ctx.examinationStore.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        if (__VLS_ctx.patientStore.error) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.patientStore.error);
        }
        if (__VLS_ctx.examinationStore.error) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.examinationStore.error);
        }
        if (__VLS_ctx.error) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.error);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("h5 mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row align-items-end") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center mb-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patient-select"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showCreatePatientModal = true;
            } },
        type: ("button"),
        ...{ class: ("btn btn-sm btn-outline-primary") },
        disabled: ((__VLS_ctx.isLoadingPatients || __VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("patient-select"),
        value: ((__VLS_ctx.selectedPatientId)),
        ...{ class: ("form-control") },
        disabled: ((__VLS_ctx.isLoadingPatients || __VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
        disabled: (true),
    });
    (__VLS_ctx.isLoadingPatients ? 'Lade Patienten...' : 'Bitte wählen Sie einen Patienten');
    for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.patients))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((patient.id)),
            value: ((patient.id)),
        });
        (patient.displayName);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examination-select"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("examination-select"),
        value: ((__VLS_ctx.selectedExaminationId)),
        ...{ class: ("form-control") },
        disabled: ((__VLS_ctx.isLoadingExaminations || !__VLS_ctx.selectedPatientId || __VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
        disabled: (true),
    });
    (__VLS_ctx.isLoadingExaminations ? 'Lade Untersuchungen...' : 'Bitte wählen Sie eine Untersuchung');
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinationsDropdown))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((exam.id)),
            value: ((exam.id)),
        });
        (exam.display_name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mt-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createPatientExaminationAndInitLookup) },
        ...{ class: ("btn btn-primary") },
        disabled: ((!__VLS_ctx.selectedPatientId || !__VLS_ctx.selectedExaminationId || __VLS_ctx.loading || !!__VLS_ctx.lookupToken)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm") },
            role: ("status"),
            'aria-hidden': ("true"),
        });
    }
    if (!__VLS_ctx.lookupToken) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    if (__VLS_ctx.lookup) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row g-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 col-xl-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: ("h5 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.lookupToken);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fetchLookupAll) },
            ...{ class: ("btn btn-sm btn-outline-secondary") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: ("list-group list-group-flush") },
        });
        for (const [rs] of __VLS_getVForSourceType((__VLS_ctx.requirementSets))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: ((rs.id)),
                ...{ class: ("list-group-item d-flex justify-content-between align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("fw-semibold") },
            });
            (rs.name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted d-block") },
            });
            (rs.type);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("form-check form-switch") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!((__VLS_ctx.lookup)))
                            return;
                        __VLS_ctx.toggleRequirementSet(rs.id, $event.target.checked);
                    } },
                ...{ class: ("form-check-input") },
                type: ("checkbox"),
                checked: ((__VLS_ctx.selectedRequirementSetIdSet.has(rs.id))),
            });
        }
        if (!__VLS_ctx.requirementSets.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                ...{ class: ("list-group-item text-muted") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 col-xl-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: ("h5 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.availableFindings.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("list-group list-group-flush") },
            });
            for (const [findingId] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: ((findingId)),
                    ...{ class: ("list-group-item") },
                });
                (findingId);
            }
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
        }
    }
    if (__VLS_ctx.lookup) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row g-3 mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: ("h5 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: ("bg-light p-2 rounded") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.selectionsPretty);
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.successMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.successMessage)))
                        return;
                    __VLS_ctx.successMessage = null;
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.showCreatePatientModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.closeCreatePatientModal) },
            ...{ class: ("modal-overlay") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
            ...{ class: ("modal-dialog") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("modal-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeCreatePatientModal) },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-body") },
        });
        // @ts-ignore
        /** @type { [typeof PatientAdder, ] } */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(PatientAdder, new PatientAdder({
            ...{ 'onPatientCreated': {} },
            ...{ 'onCancel': {} },
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onPatientCreated': {} },
            ...{ 'onCancel': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onPatientCreated: (__VLS_ctx.onPatientCreated)
        };
        const __VLS_7 = {
            onCancel: (__VLS_ctx.closeCreatePatientModal)
        };
        let __VLS_2;
        let __VLS_3;
        var __VLS_4;
    }
    ['requirement-generator', 'container-fluid', 'py-4', 'alert', 'alert-danger', 'card', 'mb-3', 'card-header', 'h5', 'mb-0', 'card-body', 'row', 'align-items-end', 'col-md-6', 'form-group', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-plus', 'form-control', 'col-md-6', 'form-group', 'form-control', 'row', 'mt-3', 'col-12', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'row', 'g-3', 'col-12', 'col-xl-6', 'card', 'h-100', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'h5', 'mb-0', 'text-muted', 'btn', 'btn-sm', 'btn-outline-secondary', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'fw-semibold', 'text-muted', 'd-block', 'form-check', 'form-switch', 'form-check-input', 'list-group-item', 'text-muted', 'col-12', 'col-xl-6', 'card', 'h-100', 'card-header', 'h5', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'text-muted', 'row', 'g-3', 'mt-3', 'col-12', 'card', 'card-header', 'h5', 'mb-0', 'card-body', 'bg-light', 'p-2', 'rounded', 'alert', 'alert-success', 'alert-dismissible', 'btn-close', 'modal-overlay', 'modal-dialog', 'modal-content', 'modal-header', 'modal-title', 'btn-close', 'modal-body',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {};
    var $refs;
    var $el;
    return {
        attrs: {},
        slots: __VLS_slots,
        refs: $refs,
        rootEl: $el,
    };
}
;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            PatientAdder: PatientAdder,
            patientStore: patientStore,
            examinationStore: examinationStore,
            selectedPatientId: selectedPatientId,
            selectedExaminationId: selectedExaminationId,
            lookupToken: lookupToken,
            lookup: lookup,
            error: error,
            loading: loading,
            showCreatePatientModal: showCreatePatientModal,
            successMessage: successMessage,
            patients: patients,
            isLoadingPatients: isLoadingPatients,
            examinationsDropdown: examinationsDropdown,
            isLoadingExaminations: isLoadingExaminations,
            requirementSets: requirementSets,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            availableFindings: availableFindings,
            selectionsPretty: selectionsPretty,
            createPatientExaminationAndInitLookup: createPatientExaminationAndInitLookup,
            fetchLookupAll: fetchLookupAll,
            toggleRequirementSet: toggleRequirementSet,
            closeCreatePatientModal: closeCreatePatientModal,
            onPatientCreated: onPatientCreated,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
