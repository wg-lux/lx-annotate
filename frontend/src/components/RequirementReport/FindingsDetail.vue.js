import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore } from '../../stores/findingStore';
import { useExaminationStore } from '@/stores/examinationStore';
import axiosInstance from '@/api/axiosInstance';
const findingStore = useFindingStore();
const examinationStore = useExaminationStore();
const props = withDefaults(defineProps(), {
    isAddedToExamination: false,
    patientExaminationId: undefined
});
const emit = defineEmits();
const loading = ref(false);
const classifications = ref([]);
const selectedChoices = ref({});
// Computed
const finding = computed(() => {
    return findingStore.getFindingById(props.findingId);
});
const hasAllRequiredClassifications = computed(() => {
    if (!classifications.value.length)
        return true;
    return classifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});
const classificationStatus = computed(() => {
    const requiredCount = classifications.value.filter(c => c.required).length;
    const selectedCount = classifications.value.filter(c => c.required && selectedChoices.value[c.id]).length;
    return {
        required: requiredCount,
        selected: selectedCount,
        complete: selectedCount === requiredCount
    };
});
// Debug-Informationen
const debugInfo = computed(() => ({
    findingId: props.findingId,
    findingName: finding.value?.name,
    totalClassifications: classifications.value.length,
    requiredClassifications: classifications.value.filter(c => c.required).length,
    selectedClassifications: Object.keys(selectedChoices.value).filter(id => selectedChoices.value[Number(id)]).length,
    selectedChoices: selectedChoices.value,
    hasAllRequired: hasAllRequiredClassifications.value,
    findingStoreFindingsCount: findingStore.findings.length,
    findingFromStore: findingStore.getFindingById(props.findingId),
    classificationsLoaded: classifications.value.length > 0
}));
// Methods
const loadClassifications = async () => {
    console.log('🔍 [FindingsDetail] loadClassifications called with findingId:', props.findingId);
    if (!props.findingId) {
        console.warn('⚠️ [FindingsDetail] No findingId provided');
        return;
    }
    try {
        loading.value = true;
        console.log('⏳ [FindingsDetail] Loading classifications for findingId:', props.findingId);
        classifications.value = await findingStore.fetchFindingClassifications(props.findingId);
        console.log('✅ [FindingsDetail] Classifications loaded:', classifications.value.length, 'items');
        console.log('📋 [FindingsDetail] Classifications data:', classifications.value);
    }
    catch (error) {
        console.error('❌ [FindingsDetail] Error loading classifications:', error);
    }
    finally {
        loading.value = false;
    }
};
const updateChoice = (classificationId, event) => {
    const target = event.target;
    const choiceId = target.value ? parseInt(target.value) : null;
    selectedChoices.value[classificationId] = choiceId;
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
const getChoiceKey = (choice, index) => {
    if (typeof choice === 'object' && choice.id) {
        return choice.id.toString();
    }
    return `choice-${index}`;
};
const getChoiceValue = (choice) => {
    if (typeof choice === 'object' && choice.id) {
        return choice.id.toString();
    }
    return choice.toString();
};
const getChoiceLabel = (choice) => {
    if (typeof choice === 'object' && choice.name) {
        return choice.name;
    }
    return choice.toString();
};
const getSelectedChoiceLabel = (classificationId) => {
    const choiceId = selectedChoices.value[classificationId];
    if (!choiceId)
        return '';
    const classification = classifications.value.find(c => c.id === classificationId);
    if (!classification?.choices)
        return '';
    const choice = classification.choices.find(c => (typeof c === 'object' ? c.id : c) == choiceId);
    if (choice === null || choice === undefined) {
        return '';
    }
    return typeof choice === 'object' && choice.name ? choice.name : choice.toString();
};
const getSelectedChoiceObject = (classificationId) => {
    const choiceId = selectedChoices.value[classificationId];
    if (!choiceId)
        return null;
    const classification = classifications.value.find(c => c.id === classificationId);
    if (!classification?.choices)
        return null;
    return classification.choices.find(c => (typeof c === 'object' ? c.id : c) == choiceId);
};
const getSelectClass = (classificationId, required = false) => {
    const baseClass = 'form-select form-select-sm';
    const hasSelection = selectedChoices.value[classificationId];
    if (hasSelection) {
        return `${baseClass} border-success`;
    }
    else if (required) {
        return `${baseClass} border-warning`;
    }
    return baseClass;
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
    loadClassifications();
});
// Watch for finding changes
watch(() => props.findingId, (newVal, oldVal) => {
    console.log('👀 [FindingsDetail] findingId changed:', { oldVal, newVal });
    loadClassifications();
}, { immediate: true });
// Watch for finding data availability
watch(() => findingStore.findings, (newVal, oldVal) => {
    console.log('📊 [FindingsDetail] findingStore.findings changed:', {
        oldCount: oldVal?.length || 0,
        newCount: newVal?.length || 0,
        findingId: props.findingId,
        findingExists: !!findingStore.getFindingById(props.findingId)
    });
    // Reload classifications when findings data is available
    if (findingStore.findings.length > 0) {
        console.log('🔄 [FindingsDetail] Reloading classifications due to findings data change');
        loadClassifications();
    }
}, { immediate: true });
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    isAddedToExamination: false,
    patientExaminationId: undefined
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['finding-card', 'classification-item', 'form-select-sm', 'form-select-sm', 'finding-card', 'badge', 'classification-item', 'classification-item', 'form-select-sm', 'border-success', 'form-select-sm', 'border-warning', 'classification-item', 'updated', 'selected-classifications-summary', 'selected-classifications-summary', 'badge',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("finding-card card mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border spinner-border-sm") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
    }
    else if (!__VLS_ctx.finding) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.findingId);
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.finding.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.finding.nameDe || 'N/A');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.finding.description || 'Keine Beschreibung verfügbar');
        if (__VLS_ctx.classifications.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex justify-content-between align-items-center mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
                ...{ class: ((__VLS_ctx.classificationStatus.complete ? 'text-success' : 'text-warning')) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas") },
                ...{ class: ((__VLS_ctx.classificationStatus.complete ? 'fa-check-circle' : 'fa-exclamation-triangle')) },
            });
            (__VLS_ctx.classificationStatus.selected);
            (__VLS_ctx.classificationStatus.required);
            for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.classifications))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((classification.id)),
                    ...{ class: ("classification-item mb-3 p-3 border rounded") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex justify-content-between align-items-start mb-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("flex-grow-1") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (classification.name);
                if (classification.required) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("badge bg-warning ms-2") },
                    });
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex align-items-center gap-2") },
                });
                if (__VLS_ctx.selectedChoices[classification.id]) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-success") },
                        title: ("Ausgewählt"),
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-check") },
                    });
                }
                else if (classification.required) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-warning") },
                        title: ("Nicht ausgewählt"),
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-exclamation-triangle") },
                    });
                }
                if (classification.description) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: ("text-muted small mb-2") },
                    });
                    (classification.description);
                }
                if (classification.choices && classification.choices.length) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("mb-2") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                        ...{ class: ("form-label small mb-1") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                        ...{ onChange: (...[$event]) => {
                                if (!(!((__VLS_ctx.loading))))
                                    return;
                                if (!(!((!__VLS_ctx.finding))))
                                    return;
                                if (!((__VLS_ctx.classifications.length)))
                                    return;
                                if (!((classification.choices && classification.choices.length)))
                                    return;
                                __VLS_ctx.updateChoice(classification.id, $event);
                            } },
                        ...{ class: ("form-select form-select-sm") },
                        value: ((__VLS_ctx.selectedChoices[classification.id] || '')),
                        ...{ class: ((__VLS_ctx.getSelectClass(classification.id, classification.required))) },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                        value: (""),
                    });
                    for (const [choice, index] of __VLS_getVForSourceType((classification.choices))) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                            key: ((__VLS_ctx.getChoiceKey(choice, index))),
                            value: ((__VLS_ctx.getChoiceValue(choice))),
                        });
                        (__VLS_ctx.getChoiceLabel(choice));
                    }
                }
                if (__VLS_ctx.selectedChoices[classification.id]) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("selected-choice-alert alert alert-success py-1 px-2 mb-0") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-check-circle") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    (__VLS_ctx.getSelectedChoiceLabel(classification.id));
                }
            }
        }
        if (__VLS_ctx.finding.findingTypes && __VLS_ctx.finding.findingTypes.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex flex-wrap gap-1 mt-1") },
            });
            for (const [type] of __VLS_getVForSourceType((__VLS_ctx.finding.findingTypes))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: ((type)),
                    ...{ class: ("badge bg-secondary") },
                });
                (type);
            }
        }
        if (__VLS_ctx.finding.findingInterventions && __VLS_ctx.finding.findingInterventions.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex flex-wrap gap-1 mt-1") },
            });
            for (const [intervention] of __VLS_getVForSourceType((__VLS_ctx.finding.findingInterventions))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: ((intervention)),
                    ...{ class: ("badge bg-info") },
                });
                (intervention);
            }
        }
    }
    if (Object.keys(__VLS_ctx.selectedChoices).length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selected-classifications-summary mt-3 p-3 bg-light rounded") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-list-check") },
        });
        (Object.keys(__VLS_ctx.selectedChoices).filter(id => __VLS_ctx.selectedChoices[Number(id)]).length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.classifications))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((classification.id)),
                ...{ class: ("col-md-6 mb-2") },
            });
            if (__VLS_ctx.selectedChoices[classification.id]) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex justify-content-between align-items-center") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
                (classification.name);
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-success") },
                });
                (__VLS_ctx.getSelectedChoiceLabel(classification.id));
            }
        }
    }
    if (__VLS_ctx.debugInfo.findingId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-3 p-2 bg-light border rounded") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.findingId);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.findingName || 'Not loaded');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.totalClassifications);
        (__VLS_ctx.debugInfo.requiredClassifications);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.selectedClassifications);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.findingStoreFindingsCount);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (!!__VLS_ctx.debugInfo.findingFromStore);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.classificationsLoaded);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (__VLS_ctx.debugInfo.hasAllRequired);
    }
    ['finding-card', 'card', 'mb-3', 'card-body', 'text-center', 'spinner-border', 'spinner-border-sm', 'visually-hidden', 'text-center', 'text-muted', 'row', 'mb-3', 'col-md-6', 'col-md-6', 'text-muted', 'mb-3', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'mb-0', 'text-muted', 'fas', 'classification-item', 'mb-3', 'p-3', 'border', 'rounded', 'd-flex', 'justify-content-between', 'align-items-start', 'mb-2', 'flex-grow-1', 'badge', 'bg-warning', 'ms-2', 'd-flex', 'align-items-center', 'gap-2', 'badge', 'bg-success', 'fas', 'fa-check', 'badge', 'bg-warning', 'fas', 'fa-exclamation-triangle', 'text-muted', 'small', 'mb-2', 'mb-2', 'form-label', 'small', 'mb-1', 'form-select', 'form-select-sm', 'selected-choice-alert', 'alert', 'alert-success', 'py-1', 'px-2', 'mb-0', 'fas', 'fa-check-circle', 'mb-2', 'd-flex', 'flex-wrap', 'gap-1', 'mt-1', 'badge', 'bg-secondary', 'mb-2', 'd-flex', 'flex-wrap', 'gap-1', 'mt-1', 'badge', 'bg-info', 'selected-classifications-summary', 'mt-3', 'p-3', 'bg-light', 'rounded', 'mb-2', 'fas', 'fa-list-check', 'row', 'col-md-6', 'mb-2', 'd-flex', 'justify-content-between', 'align-items-center', 'text-muted', 'badge', 'bg-success', 'mt-3', 'p-2', 'bg-light', 'border', 'rounded', 'mb-2', 'text-muted',];
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
            loading: loading,
            classifications: classifications,
            selectedChoices: selectedChoices,
            finding: finding,
            classificationStatus: classificationStatus,
            debugInfo: debugInfo,
            updateChoice: updateChoice,
            getChoiceKey: getChoiceKey,
            getChoiceValue: getChoiceValue,
            getChoiceLabel: getChoiceLabel,
            getSelectedChoiceLabel: getSelectedChoiceLabel,
            getSelectClass: getSelectClass,
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
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
