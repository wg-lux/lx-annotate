import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore } from '../../stores/findingStore';
import { useExaminationStore } from '@/stores/examinationStore';
import axiosInstance from '@/api/axiosInstance';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';
const findingStore = useFindingStore();
const examinationStore = useExaminationStore();
const findingClassificationStore = useFindingClassificationStore();
const examinationId = computed(() => examinationStore.selectedExaminationId || undefined);
const props = withDefaults(defineProps(), {
    isAddedToExamination: false,
    patientExaminationId: undefined
});
const emit = defineEmits();
const loading = ref(false);
const classifications = ref([]);
// Computed
const finding = computed(() => {
    // First try findingClassificationStore (where AddableFindingsDetail stores data)
    const findingFromClassificationStore = findingClassificationStore.getFindingById(props.findingId);
    if (findingFromClassificationStore) {
        return findingFromClassificationStore;
    }
    // Fallback to findingStore
    return findingStore.getFindingById(props.findingId);
});
const requiredClassifications = computed(() => {
    return classifications.value.filter(classification => classification.required);
});
// Debug-Informationen
const debugInfo = computed(() => {
    const findingFromClassificationStore = findingClassificationStore.getFindingById(props.findingId);
    const findingFromFindingStore = findingStore.getFindingById(props.findingId);
    const dataSource = findingFromClassificationStore ? 'findingClassificationStore' : (findingFromFindingStore ? 'findingStore' : 'none');
    return {
        findingId: props.findingId,
        findingName: finding.value?.nameDe || finding.value?.name,
        totalClassifications: classifications.value.length,
        requiredClassifications: requiredClassifications.value.length,
        classificationsLoaded: classifications.value.length > 0,
        dataSource: dataSource
    };
});
const findingsInfo = computed(() => {
    const findingFromClassificationStore = findingClassificationStore.getFindingById(props.findingId);
    const findingFromFindingStore = findingStore.getFindingById(props.findingId);
    const dataSource = findingFromClassificationStore ? 'findingClassificationStore' : (findingFromFindingStore ? 'findingStore' : 'none');
    return {
        findingId: props.findingId,
        findingName: finding.value?.nameDe || finding.value?.name,
        findingDescription: finding.value?.description || 'Keine Beschreibung verfügbar',
        totalClassifications: classifications.value.length,
        requiredClassifications: requiredClassifications.value.length,
        classificationsLoaded: classifications.value.length > 0,
        dataSource: dataSource
    };
});
const loadFindingsAndClassifications = async (examinationId) => {
    try {
        loading.value = true;
        // Load findings for the examination
        if (findingClassificationStore.getAllFindings.length === 0) {
            // Findings will be loaded from API below
        }
        // Load findings from the API
        const response = await axiosInstance.get(`/api/examinations/${examinationId}/findings`);
        const findings = response.data;
        findingClassificationStore.setClassificationChoicesFromLookup(findings);
        console.log('Loaded findings for examination:', findings.length);
    }
    catch (error) {
        console.error('Error loading examination data:', error);
        emit('error-occurred', {
            findingId: props.findingId,
            error: 'Fehler beim Laden der Untersuchungsdaten',
            selectedClassifications: 0
        });
    }
    finally {
        loading.value = false;
    }
};
const loadClassifications = async () => {
    if (!props.findingId) {
        console.log('📋 [FindingsDetail] No findingId provided, skipping classifications load');
        return;
    }
    try {
        loading.value = true;
        // Get classifications from the store
        const findingClassifications = findingClassificationStore.getClassificationsForFinding(props.findingId);
        if (findingClassifications.length > 0) {
            classifications.value = findingClassifications;
            console.log('📋 [FindingsDetail] Loaded classifications from store:', findingClassifications.length);
        }
        else {
            // Try to get from finding data if available
            const finding = findingClassificationStore.getFindingById(props.findingId);
            if (finding?.FindingClassifications) {
                classifications.value = finding.FindingClassifications;
                console.log('📋 [FindingsDetail] Loaded classifications from finding data:', finding.FindingClassifications.length);
            }
            else {
                console.warn('📋 [FindingsDetail] No classifications found for finding:', props.findingId);
                classifications.value = [];
            }
        }
    }
    catch (error) {
        console.error('Error loading classifications:', error);
        classifications.value = [];
    }
    finally {
        loading.value = false;
    }
};
// Safe wrapper for loading with examination ID check
const safeLoadFindingsAndClassifications = async () => {
    // Just load classifications from the store - data should already be available from AddableFindingsDetail
    await loadClassifications();
};
const updateChoice = (classificationId, event) => {
    const target = event.target;
    const choiceId = target.value ? parseInt(target.value) : null;
    // Animation für Update-Feedback
    const classificationElement = target.closest('.classification-item');
    if (classificationElement) {
        classificationElement.classList.add('updated');
        setTimeout(() => {
            classificationElement.classList.remove('updated');
        }, 500);
    }
    // Emit event mit zusätzlichen Informationen
    emit('classification-updated', props.findingId, classificationId, choiceId);
};
// Lifecycle
onMounted(() => {
    console.log('🚀 [FindingsDetail] Component mounted with props:', {
        findingId: props.findingId,
        patientExaminationId: props.patientExaminationId,
        isAddedToExamination: props.isAddedToExamination,
        findingStoreFindingsCount: findingStore.findings.length,
        findingFromStore: findingStore.getFindingById(props.findingId)
    });
    safeLoadFindingsAndClassifications();
});
watch(() => props.findingId, (newVal, oldVal) => {
    console.log('👀 [FindingsDetail] findingId changed:', { oldVal, newVal });
    safeLoadFindingsAndClassifications();
}, { immediate: true });
// Watch for finding data availability in findingClassificationStore
watch(() => findingClassificationStore.getFindingById(props.findingId), (newFinding, oldFinding) => {
    if (newFinding) {
        console.log('🔄 [FindingsDetail] Finding data now available in findingClassificationStore, loading classifications', { findingId: newFinding.id });
        loadClassifications();
    }
}, { immediate: true });
// Watch for finding data availability
watch(() => findingStore.findings, (newVal, oldVal) => {
    console.log('📊 [FindingsDetail] findingStore.findings changed:', {
        oldCount: oldVal?.length || 0,
        newCount: newVal?.length || 0,
        findingId: props.findingId
    });
    // Reload classifications when findings data is available
    if (newVal && newVal.length > 0) {
        console.log('🔄 [FindingsDetail] Reloading classifications due to findings data change');
        safeLoadFindingsAndClassifications();
    }
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    isAddedToExamination: false,
    patientExaminationId: undefined
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['finding-card']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-card']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-success']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['updated']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-classifications-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-classifications-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "finding-card card mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border spinner-border-sm" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
}
else if (!__VLS_ctx.loading && __VLS_ctx.finding) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.finding.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.findingsInfo.findingName || 'N/A');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.findingsInfo.findingDescription || 'Keine Beschreibung verfügbar');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.findingsInfo.dataSource);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.findingsInfo.totalClassifications);
    (__VLS_ctx.findingsInfo.requiredClassifications);
    if (__VLS_ctx.findingsInfo.classificationsLoaded) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.findingsInfo.requiredClassifications);
    if (__VLS_ctx.requiredClassifications.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "classification-list" },
        });
        for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.requiredClassifications))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (classification.id),
                ...{ class: "classification-item mb-2 p-2 border rounded bg-light" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-center" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (classification.name);
            if (classification.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-muted small" },
                });
                (classification.description);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "badge bg-warning" },
            });
        }
    }
    if (__VLS_ctx.finding.findingTypes && __VLS_ctx.finding.findingTypes.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-wrap gap-1 mt-1" },
        });
        for (const [type] of __VLS_getVForSourceType((__VLS_ctx.finding.findingTypes))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (type),
                ...{ class: "badge bg-secondary" },
            });
            (type);
        }
    }
    if (__VLS_ctx.finding.findingInterventions && __VLS_ctx.finding.findingInterventions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-wrap gap-1 mt-1" },
        });
        for (const [intervention] of __VLS_getVForSourceType((__VLS_ctx.finding.findingInterventions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (intervention),
                ...{ class: "badge bg-info" },
            });
            (intervention);
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.findingId);
    if (__VLS_ctx.examinationId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.safeLoadFindingsAndClassifications) },
            ...{ class: "btn btn-primary mt-2" },
        });
    }
}
if (__VLS_ctx.requiredClassifications.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selected-classifications-summary mt-3 p-3 bg-light rounded" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-list-check" },
    });
    (__VLS_ctx.requiredClassifications.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.requiredClassifications))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (classification.id),
            ...{ class: "col-md-6 mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex justify-content-between align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (classification.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-warning" },
        });
    }
}
if (__VLS_ctx.debugInfo.findingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 p-2 bg-light border rounded" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.debugInfo.findingId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.debugInfo.findingName || 'Not loaded');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.debugInfo.totalClassifications);
    (__VLS_ctx.debugInfo.requiredClassifications);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.debugInfo.classificationsLoaded);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (__VLS_ctx.debugInfo.dataSource);
}
/** @type {__VLS_StyleScopedClasses['finding-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-list']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-classifications-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-list-check']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            examinationId: examinationId,
            loading: loading,
            finding: finding,
            requiredClassifications: requiredClassifications,
            debugInfo: debugInfo,
            findingsInfo: findingsInfo,
            safeLoadFindingsAndClassifications: safeLoadFindingsAndClassifications,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
