import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore } from '../../stores/findingStore';
import axiosInstance from '@/api/axiosInstance';
const findingStore = useFindingStore();
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
// Methods
const loadClassifications = async () => {
    if (!props.findingId)
        return;
    try {
        loading.value = true;
        classifications.value = await findingStore.fetchFindingClassifications(props.findingId);
    }
    catch (error) {
        console.error('Error loading classifications:', error);
    }
    finally {
        loading.value = false;
    }
};
const updateChoice = (classificationId, event) => {
    const target = event.target;
    const choiceId = target.value ? parseInt(target.value) : null;
    selectedChoices.value[classificationId] = choiceId;
    // Emit event to parent component about classification update
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
const addToExamination = async () => {
    if (!props.patientExaminationId || !props.findingId) {
        console.error('Missing patientExaminationId or findingId');
        return;
    }
    try {
        loading.value = true;
        // Add finding to examination
        await axiosInstance.post('/api/patient-finding/create/', {
            patientExamination: props.patientExaminationId,
            finding: props.findingId,
            // Add selected choices if any
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        });
        // Emit event to parent to update the added status
        emit('added-to-examination', props.findingId);
        console.log('Finding added to examination successfully');
    }
    catch (error) {
        console.error('Error adding finding to examination:', error);
    }
    finally {
        loading.value = false;
    }
};
// Lifecycle
onMounted(() => {
    loadClassifications();
});
// Watch for finding changes
watch(() => props.findingId, () => {
    loadClassifications();
}, { immediate: true });
// Watch for finding data availability
watch(() => findingStore.findings, () => {
    // Reload classifications when findings data is available
    if (findingStore.findings.length > 0) {
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
    ['finding-card', 'classification-item', 'form-select-sm', 'form-select-sm', 'finding-card', 'badge',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("finding-card card mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title mb-0") },
    });
    (__VLS_ctx.finding?.name || 'Undefinierter Befund');
    if (__VLS_ctx.isAddedToExamination) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-success") },
            title: ("Bereits zur Untersuchung hinzugefügt"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex gap-2") },
    });
    if (!__VLS_ctx.isAddedToExamination) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.addToExamination) },
            ...{ class: ("btn btn-sm") },
            ...{ class: ((__VLS_ctx.hasAllRequiredClassifications ? 'btn-outline-primary' : 'btn-outline-warning')) },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.hasAllRequiredClassifications)),
            title: ((__VLS_ctx.hasAllRequiredClassifications ? 'Befund hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen')),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas") },
            ...{ class: ((__VLS_ctx.hasAllRequiredClassifications ? 'fa-plus' : 'fa-exclamation-triangle')) },
        });
        (__VLS_ctx.hasAllRequiredClassifications ? 'Hinzufügen' : 'Klassifikation erforderlich');
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: ("btn btn-sm btn-success") },
            disabled: (true),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check") },
        });
    }
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
                    ...{ class: ("classification-item mb-3 p-2 border rounded") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex justify-content-between align-items-center mb-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (classification.name);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex align-items-center gap-1") },
                });
                if (classification.required) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-warning") },
                    });
                }
                if (__VLS_ctx.selectedChoices[classification.id]) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-success") },
                        title: ("Ausgewählt"),
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-check") },
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
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("d-flex justify-content-between align-items-center mb-1") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                        ...{ class: ("form-label small mb-0") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("d-flex align-items-center gap-1") },
                    });
                    if (__VLS_ctx.selectedChoices[classification.id]) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: ("badge bg-success") },
                            title: ("Klassifikation ausgewählt"),
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                            ...{ class: ("fas fa-check") },
                        });
                    }
                    else if (classification.required) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: ("badge bg-warning") },
                            title: ("Erforderliche Klassifikation nicht ausgewählt"),
                        });
                        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                            ...{ class: ("fas fa-exclamation-triangle") },
                        });
                    }
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
                        ...{ class: (({
                                'border-success': __VLS_ctx.selectedChoices[classification.id],
                                'border-warning': !__VLS_ctx.selectedChoices[classification.id] && classification.required
                            })) },
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
    ['finding-card', 'card', 'mb-3', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'd-flex', 'align-items-center', 'gap-2', 'card-title', 'mb-0', 'badge', 'bg-success', 'fas', 'fa-check-circle', 'd-flex', 'gap-2', 'btn', 'btn-sm', 'fas', 'btn', 'btn-sm', 'btn-success', 'fas', 'fa-check', 'card-body', 'text-center', 'spinner-border', 'spinner-border-sm', 'visually-hidden', 'text-center', 'text-muted', 'row', 'mb-3', 'col-md-6', 'col-md-6', 'text-muted', 'mb-3', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'mb-0', 'text-muted', 'fas', 'classification-item', 'mb-3', 'p-2', 'border', 'rounded', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'd-flex', 'align-items-center', 'gap-1', 'badge', 'bg-warning', 'badge', 'bg-success', 'fas', 'fa-check', 'text-muted', 'small', 'mb-2', 'mb-2', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-1', 'form-label', 'small', 'mb-0', 'd-flex', 'align-items-center', 'gap-1', 'badge', 'bg-success', 'fas', 'fa-check', 'badge', 'bg-warning', 'fas', 'fa-exclamation-triangle', 'form-select', 'form-select-sm', 'border-success', 'border-warning', 'mb-2', 'd-flex', 'flex-wrap', 'gap-1', 'mt-1', 'badge', 'bg-secondary', 'mb-2', 'd-flex', 'flex-wrap', 'gap-1', 'mt-1', 'badge', 'bg-info',];
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
            hasAllRequiredClassifications: hasAllRequiredClassifications,
            classificationStatus: classificationStatus,
            updateChoice: updateChoice,
            getChoiceKey: getChoiceKey,
            getChoiceValue: getChoiceValue,
            getChoiceLabel: getChoiceLabel,
            addToExamination: addToExamination,
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
