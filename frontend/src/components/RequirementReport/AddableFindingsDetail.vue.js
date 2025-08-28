import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
const props = withDefaults(defineProps(), {
    patientExaminationId: undefined,
    examinationId: undefined
});
const emit = defineEmits();
const findingStore = useFindingStore();
const patientFindingStore = usePatientFindingStore();
// Component State
const loading = ref(false);
const showFindingSelector = ref(false);
const selectedFindingId = ref(null);
const findingClassifications = ref([]);
const selectedChoices = ref({});
// Computed Properties
const availableFindings = computed(() => {
    if (!props.examinationId)
        return [];
    return findingStore.getFindingsByExamination(props.examinationId);
});
const selectedFinding = computed(() => {
    if (!selectedFindingId.value)
        return undefined;
    return findingStore.getFindingById(selectedFindingId.value);
});
const hasAllRequiredClassifications = computed(() => {
    if (!findingClassifications.value.length)
        return true;
    return findingClassifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});
const canAddFinding = computed(() => {
    return selectedFindingId.value &&
        hasAllRequiredClassifications.value &&
        props.patientExaminationId &&
        !loading.value;
});
const classificationProgress = computed(() => {
    const required = findingClassifications.value.filter(c => c.required).length;
    const selected = findingClassifications.value.filter(c => c.required && selectedChoices.value[c.id]).length;
    return {
        required,
        selected,
        complete: selected === required,
        percentage: required > 0 ? Math.round((selected / required) * 100) : 100
    };
});
// Methods
const selectFinding = async (findingId) => {
    selectedFindingId.value = findingId;
    showFindingSelector.value = false;
    // Load classifications for the selected finding
    await loadFindingClassifications(findingId);
};
const clearSelection = () => {
    selectedFindingId.value = null;
    findingClassifications.value = [];
    selectedChoices.value = {};
};
const loadFindingClassifications = async (findingId) => {
    try {
        loading.value = true;
        findingClassifications.value = await findingStore.fetchFindingClassifications(findingId);
    }
    catch (error) {
        console.error('Error loading classifications:', error);
        emit('finding-error', 'Fehler beim Laden der Klassifikationen');
    }
    finally {
        loading.value = false;
    }
};
const updateChoice = (classificationId, event) => {
    const target = event.target;
    const choiceId = target.value ? parseInt(target.value) : undefined;
    if (choiceId) {
        selectedChoices.value[classificationId] = choiceId;
    }
    else {
        delete selectedChoices.value[classificationId];
    }
};
const addFindingToExamination = async () => {
    if (!canAddFinding.value || !selectedFinding.value || !props.patientExaminationId || !selectedFindingId.value) {
        return;
    }
    try {
        loading.value = true;
        // Prepare the data for the patient finding store
        const findingData = {
            patientExamination: props.patientExaminationId,
            finding: selectedFindingId.value,
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        };
        // Use patientFindingStore to create the patient finding
        const newPatientFinding = await patientFindingStore.createPatientFinding(findingData);
        const findingName = selectedFinding.value.name;
        emit('finding-added', selectedFindingId.value, findingName);
        // Reset the component state
        clearSelection();
        showFindingSelector.value = false;
    }
    catch (error) {
        console.error('Error adding finding to examination:', error);
        const errorMessage = patientFindingStore.error ||
            error.response?.data?.error ||
            error.response?.data?.detail ||
            error.message ||
            'Fehler beim Hinzufügen des Befunds';
        emit('finding-error', errorMessage);
    }
    finally {
        loading.value = false;
    }
};
const loadFindingsAndClassifications = async (examinationId) => {
    try {
        loading.value = true;
        // Load findings for the examination
        if (findingStore.findings.length === 0) {
            await findingStore.fetchFindings();
        }
        // Load classifications for the examination
        const classifications = await findingStore.fetchExaminationClassifications(examinationId);
        // For now, we'll use all findings since examination-specific filtering 
        // would require additional logic to match findings with classifications
        console.log('Loaded classifications for examination:', classifications);
    }
    catch (error) {
        console.error('Error loading examination data:', error);
        emit('finding-error', 'Fehler beim Laden der Untersuchungsdaten');
    }
    finally {
        loading.value = false;
    }
};
// Load findings when examination changes
watch(() => props.examinationId, async (newExaminationId) => {
    if (newExaminationId) {
        await loadFindingsAndClassifications(newExaminationId);
    }
}, { immediate: true });
// Load initial data
onMounted(async () => {
    if (props.examinationId) {
        await loadFindingsAndClassifications(props.examinationId);
    }
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    patientExaminationId: undefined,
    examinationId: undefined
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("addable-finding-card card mb-3 border-primary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header d-flex justify-content-between align-items-center bg-light") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus-circle text-primary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: ("card-title mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showFindingSelector = !__VLS_ctx.showFindingSelector;
            } },
        ...{ class: ("btn btn-sm btn-primary") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas") },
        ...{ class: ((__VLS_ctx.showFindingSelector ? 'fa-minus' : 'fa-plus')) },
    });
    (__VLS_ctx.showFindingSelector ? 'Auswahl ausblenden' : 'Befund auswählen');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.showFindingSelector) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("finding-selector") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        if (__VLS_ctx.availableFindings.length === 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-info-circle fa-2x text-muted mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row g-2") },
            });
            for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((finding.id)),
                    ...{ class: ("col-md-6 col-lg-4") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.showFindingSelector)))
                                return;
                            if (!(!((__VLS_ctx.availableFindings.length === 0))))
                                return;
                            __VLS_ctx.selectFinding(finding.id);
                        } },
                    ...{ class: ("finding-option card h-100 cursor-pointer") },
                    ...{ class: (({ 'border-primary bg-light': __VLS_ctx.selectedFindingId === finding.id })) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body p-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex align-items-center gap-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-search text-primary") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("small fw-semibold") },
                });
                (finding.name);
                if (finding.description) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: ("small text-muted mt-1 mb-0") },
                    });
                    (finding.description.length > 60 ? finding.description.substring(0, 60) + '...' : finding.description);
                }
            }
        }
    }
    if (__VLS_ctx.selectedFindingId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selected-finding-config") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between align-items-center mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cog text-primary me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearSelection) },
            ...{ class: ("btn btn-sm btn-outline-secondary") },
            title: ("Auswahl zurücksetzen"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-times") },
        });
        if (__VLS_ctx.selectedFinding) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedFinding.name);
            if (__VLS_ctx.selectedFinding.description) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: ("mb-0 small") },
                });
                (__VLS_ctx.selectedFinding.description);
            }
        }
        if (__VLS_ctx.findingClassifications.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("classification-config-list") },
            });
            for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.findingClassifications))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((classification.id)),
                    ...{ class: ("classification-config-item mb-3 p-3 border rounded") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex justify-content-between align-items-center mb-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (classification.name);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("d-flex align-items-center gap-2") },
                });
                if (classification.required) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-warning") },
                        title: ("Erforderlich"),
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-exclamation-triangle") },
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
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mb-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: ("form-label small") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                    ...{ onChange: (...[$event]) => {
                            if (!((__VLS_ctx.selectedFindingId)))
                                return;
                            if (!((__VLS_ctx.findingClassifications.length > 0)))
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
                if (!classification.choices || classification.choices.length === 0) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                        value: (""),
                        disabled: (true),
                    });
                }
                else {
                    for (const [choice] of __VLS_getVForSourceType((classification.choices))) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                            key: ((choice.id)),
                            value: ((choice.id)),
                        });
                        (choice.name);
                    }
                }
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("classification-progress mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex justify-content-between align-items-center mb-1") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("fw-semibold") },
                ...{ class: ((__VLS_ctx.classificationProgress.complete ? 'text-success' : 'text-warning')) },
            });
            (__VLS_ctx.classificationProgress.selected);
            (__VLS_ctx.classificationProgress.required);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress-bar") },
                ...{ class: ((__VLS_ctx.classificationProgress.complete ? 'bg-success' : 'bg-warning')) },
                ...{ style: (({ width: __VLS_ctx.classificationProgress.percentage + '%' })) },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-end") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.addFindingToExamination) },
            ...{ class: ("btn btn-success") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.canAddFinding)),
            title: ((__VLS_ctx.canAddFinding ? 'Befund zur Untersuchung hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen')),
        });
        if (__VLS_ctx.loading) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-2") },
                role: ("status"),
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus me-2") },
        });
    }
    else if (!__VLS_ctx.showFindingSelector) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus-circle fa-3x text-primary mb-3 opacity-50") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
    }
    ['addable-finding-card', 'card', 'mb-3', 'border-primary', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'bg-light', 'd-flex', 'align-items-center', 'gap-2', 'fas', 'fa-plus-circle', 'text-primary', 'card-title', 'mb-0', 'd-flex', 'gap-2', 'btn', 'btn-sm', 'btn-primary', 'fas', 'card-body', 'mb-3', 'finding-selector', 'form-label', 'text-center', 'py-3', 'fas', 'fa-info-circle', 'fa-2x', 'text-muted', 'mb-2', 'text-muted', 'text-muted', 'row', 'g-2', 'col-md-6', 'col-lg-4', 'finding-option', 'card', 'h-100', 'cursor-pointer', 'border-primary', 'bg-light', 'card-body', 'p-2', 'd-flex', 'align-items-center', 'gap-2', 'fas', 'fa-search', 'text-primary', 'small', 'fw-semibold', 'small', 'text-muted', 'mt-1', 'mb-0', 'selected-finding-config', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-3', 'mb-0', 'fas', 'fa-cog', 'text-primary', 'me-2', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-times', 'mb-3', 'alert', 'alert-info', 'mb-0', 'small', 'mb-3', 'classification-config-list', 'classification-config-item', 'mb-3', 'p-3', 'border', 'rounded', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'd-flex', 'align-items-center', 'gap-2', 'badge', 'bg-warning', 'fas', 'fa-exclamation-triangle', 'badge', 'bg-success', 'fas', 'fa-check', 'text-muted', 'small', 'mb-2', 'mb-2', 'form-label', 'small', 'form-select', 'form-select-sm', 'border-success', 'border-warning', 'classification-progress', 'mb-3', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-1', 'text-muted', 'fw-semibold', 'progress', 'progress-bar', 'text-end', 'btn', 'btn-success', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-plus', 'me-2', 'text-center', 'py-4', 'fas', 'fa-plus-circle', 'fa-3x', 'text-primary', 'mb-3', 'opacity-50', 'text-muted',];
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
            showFindingSelector: showFindingSelector,
            selectedFindingId: selectedFindingId,
            findingClassifications: findingClassifications,
            selectedChoices: selectedChoices,
            availableFindings: availableFindings,
            selectedFinding: selectedFinding,
            canAddFinding: canAddFinding,
            classificationProgress: classificationProgress,
            selectFinding: selectFinding,
            clearSelection: clearSelection,
            updateChoice: updateChoice,
            addFindingToExamination: addFindingToExamination,
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
