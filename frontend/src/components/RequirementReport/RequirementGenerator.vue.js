import { ref, computed, onMounted, watch } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
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
// --- Computed from Store ---
const patients = computed(() => patientStore.patientsWithDisplayName);
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
// --- Watchers ---
watch(selectedExaminationId, (newId) => {
    examinationStore.setSelectedExamination(newId);
    if (newId) {
        examinationStore.loadFindingsForExamination(newId);
    }
});
// --- Lifecycle ---
onMounted(() => {
    patientStore.fetchPatients();
    examinationStore.fetchExaminations();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patient-select"),
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
        (patient.display_name);
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
    ['requirement-generator', 'container-fluid', 'py-4', 'alert', 'alert-danger', 'card', 'mb-3', 'card-header', 'h5', 'mb-0', 'card-body', 'row', 'align-items-end', 'col-md-6', 'form-group', 'form-control', 'col-md-6', 'form-group', 'form-control', 'row', 'mt-3', 'col-12', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'row', 'g-3', 'col-12', 'col-xl-6', 'card', 'h-100', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'h5', 'mb-0', 'text-muted', 'btn', 'btn-sm', 'btn-outline-secondary', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'fw-semibold', 'text-muted', 'd-block', 'form-check', 'form-switch', 'form-check-input', 'list-group-item', 'text-muted', 'col-12', 'col-xl-6', 'card', 'h-100', 'card-header', 'h5', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'text-muted', 'row', 'g-3', 'mt-3', 'col-12', 'card', 'card-header', 'h5', 'mb-0', 'card-body', 'bg-light', 'p-2', 'rounded',];
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
            patientStore: patientStore,
            examinationStore: examinationStore,
            selectedPatientId: selectedPatientId,
            selectedExaminationId: selectedExaminationId,
            lookupToken: lookupToken,
            lookup: lookup,
            error: error,
            loading: loading,
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
