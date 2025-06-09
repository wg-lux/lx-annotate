import { ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import ClassificationCard from './ClassificationCard.vue';
const props = withDefaults(defineProps(), {
    videoTimestamp: null,
    videoId: null
});
const emit = defineEmits();
// Store
const examinationStore = useExaminationStore();
// Reactive state
const locationClassifications = ref([]);
const morphologyClassifications = ref([]);
// Current finding data structure - store selected choice IDs for each classification
const selectedLocationChoices = ref([]);
const selectedMorphologyChoices = ref([]);
// Form state
const notes = ref('');
const findingDataLoaded = ref(false);
// Local state
const activeTab = ref('location');
// Computed values from store
const availableExaminations = computed(() => examinationStore.examinations);
const availableFindings = computed(() => examinationStore.availableFindings);
const loading = computed(() => examinationStore.loading);
const error = computed(() => examinationStore.error);
// Local computed values
const selectedExaminationId = computed({
    get: () => examinationStore.selectedExaminationId,
    set: (value) => {
        if (value) {
            examinationStore.setSelectedExamination(value);
            onExaminationChange();
        }
    }
});
const selectedFindingId = computed({
    get: () => examinationStore.selectedFindingId,
    set: (value) => {
        if (value) {
            examinationStore.setSelectedFinding(value);
            onFindingChange();
        }
    }
});
const hasRequiredLocationClassifications = computed(() => {
    return locationClassifications.value.some(c => c.required === true);
});
const hasRequiredMorphologyClassifications = computed(() => {
    return morphologyClassifications.value.some(c => c.required === true);
});
const validationErrors = computed(() => {
    const errors = [];
    if (!selectedExaminationId.value) {
        errors.push('Untersuchung erforderlich');
    }
    if (!selectedFindingId.value) {
        errors.push('Befund erforderlich');
    }
    // Check required location classifications
    for (const classification of locationClassifications.value) {
        if (classification.required) {
            const hasChoice = classification.choices?.some((choice) => selectedLocationChoices.value.includes(choice.id));
            if (!hasChoice) {
                errors.push(`Bitte wählen Sie eine Option für ${classification.name_de || classification.name}`);
            }
        }
    }
    // Check required morphology classifications
    for (const classification of morphologyClassifications.value) {
        if (classification.required) {
            const hasChoice = classification.choices?.some((choice) => selectedMorphologyChoices.value.includes(choice.id));
            if (!hasChoice) {
                errors.push(`Bitte wählen Sie eine Option für ${classification.name_de || classification.name}`);
            }
        }
    }
    return errors;
});
const canSave = computed(() => validationErrors.value.length === 0 &&
    selectedExaminationId.value !== null &&
    selectedFindingId.value !== null);
// Methods
async function onExaminationChange() {
    if (selectedExaminationId.value) {
        // Reset finding-related state
        selectedFindingId.value = null;
        selectedLocationChoices.value = [];
        selectedMorphologyChoices.value = [];
        findingDataLoaded.value = false;
        activeTab.value = 'location';
    }
}
async function onFindingChange() {
    if (selectedFindingId.value) {
        try {
            // Load classifications for the selected finding
            const result = await examinationStore.loadFindingClassifications(selectedFindingId.value);
            // Update local state with classification data including required flags
            locationClassifications.value = result.locationClassifications.map(c => ({
                ...c,
                required: c.required || false
            }));
            morphologyClassifications.value = result.morphologyClassifications.map(c => ({
                ...c,
                required: c.required || false
            }));
            findingDataLoaded.value = true;
            // Reset selections when finding changes
            selectedLocationChoices.value = [];
            selectedMorphologyChoices.value = [];
            activeTab.value = 'location';
        }
        catch (err) {
            console.error('Error loading finding classifications:', err);
            findingDataLoaded.value = false;
        }
    }
}
function isRequiredLocationClassification(classificationId) {
    const classification = locationClassifications.value.find(c => c.id === classificationId);
    return classification?.required || false;
}
function isRequiredMorphologyClassification(classificationId) {
    const classification = morphologyClassifications.value.find(c => c.id === classificationId);
    return classification?.required || false;
}
function getSelectedLocationChoicesForClassification(classificationId) {
    const classification = locationClassifications.value.find(c => c.id === classificationId);
    if (!classification)
        return [];
    return selectedLocationChoices.value.filter(choiceId => classification.choices && classification.choices.some((choice) => choice.id === choiceId));
}
function getSelectedMorphologyChoicesForClassification(classificationId) {
    const classification = morphologyClassifications.value.find(c => c.id === classificationId);
    if (!classification)
        return [];
    return selectedMorphologyChoices.value.filter(choiceId => classification.choices && classification.choices.some((choice) => choice.id === choiceId));
}
function updateLocationChoicesForClassification(classificationId, choiceIds) {
    const classification = locationClassifications.value.find(c => c.id === classificationId);
    if (!classification)
        return;
    // Remove all choices from this classification
    const otherChoices = selectedLocationChoices.value.filter(choiceId => !classification.choices || !classification.choices.some((choice) => choice.id === choiceId));
    // Add new choices
    selectedLocationChoices.value = [...otherChoices, ...choiceIds];
    // Update store
    examinationStore.updateLocationChoices(selectedLocationChoices.value);
}
function updateMorphologyChoicesForClassification(classificationId, choiceIds) {
    const classification = morphologyClassifications.value.find(c => c.id === classificationId);
    if (!classification)
        return;
    // Remove all choices from this classification
    const otherChoices = selectedMorphologyChoices.value.filter(choiceId => !classification.choices || !classification.choices.some((choice) => choice.id === choiceId));
    // Add new choices
    selectedMorphologyChoices.value = [...otherChoices, ...choiceIds];
    // Update store
    examinationStore.updateMorphologyChoices(selectedMorphologyChoices.value);
}
function hasSelectedLocationChoiceForClassification(classificationId) {
    return getSelectedLocationChoicesForClassification(classificationId).length > 0;
}
function hasSelectedMorphologyChoiceForClassification(classificationId) {
    return getSelectedMorphologyChoicesForClassification(classificationId).length > 0;
}
async function saveFinding() {
    if (!canSave.value)
        return;
    try {
        // Update store with current notes
        examinationStore.updateNotes(notes.value);
        // Save through store
        const result = await examinationStore.savePatientFinding(props.videoId || undefined, props.videoTimestamp || undefined);
        if (result) {
            emit('examination-saved', result);
            // Reset form
            resetForm();
            console.log('Patient finding saved successfully:', result);
        }
    }
    catch (err) {
        console.error('Error saving patient finding:', err);
    }
}
function resetForm() {
    examinationStore.resetForm();
    selectedLocationChoices.value = [];
    selectedMorphologyChoices.value = [];
    notes.value = '';
    activeTab.value = 'location';
    findingDataLoaded.value = false;
}
// Load data on mount
onMounted(() => {
    examinationStore.loadExaminations();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    videoTimestamp: null,
    videoId: null
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['exam-header', 'form-group', 'form-control', 'tab-button', 'tab-button', 'alert', 'btn', 'btn-primary', 'btn-secondary', 'form-row', 'exam-body', 'categories-panel', 'category-tabs', 'tab-button',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("examination-view") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("exam-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examination-select"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onExaminationChange) },
        id: ("examination-select"),
        value: ((__VLS_ctx.selectedExaminationId)),
        ...{ class: ("form-control") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
    });
    for (const [examination] of __VLS_getVForSourceType((__VLS_ctx.availableExaminations))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((examination.id)),
            value: ((examination.id)),
        });
        (examination.name_de || examination.name);
    }
    if (__VLS_ctx.selectedExaminationId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("finding-select"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onFindingChange) },
            id: ("finding-select"),
            value: ((__VLS_ctx.selectedFindingId)),
            ...{ class: ("form-control") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((finding.id)),
                value: ((finding.id)),
            });
            (finding.name_de || finding.name);
        }
    }
    if (__VLS_ctx.selectedFindingId && __VLS_ctx.findingDataLoaded) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("exam-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("categories-panel") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("category-tabs") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.selectedFindingId && __VLS_ctx.findingDataLoaded)))
                        return;
                    __VLS_ctx.activeTab = 'location';
                } },
            ...{ class: ((['tab-button', { active: __VLS_ctx.activeTab === 'location' }])) },
        });
        if (__VLS_ctx.hasRequiredLocationClassifications) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("required-indicator") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.selectedFindingId && __VLS_ctx.findingDataLoaded)))
                        return;
                    __VLS_ctx.activeTab = 'morphology';
                } },
            ...{ class: ((['tab-button', { active: __VLS_ctx.activeTab === 'morphology' }])) },
        });
        if (__VLS_ctx.hasRequiredMorphologyClassifications) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("required-indicator") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("editor-panel") },
        });
        if (__VLS_ctx.activeTab === 'location') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("category-editor") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-container") },
            });
            for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.locationClassifications))) {
                // @ts-ignore
                /** @type { [typeof ClassificationCard, ] } */ ;
                // @ts-ignore
                const __VLS_0 = __VLS_asFunctionalComponent(ClassificationCard, new ClassificationCard({
                    ...{ 'onUpdate:modelValue': {} },
                    key: ((`location-${classification.id}`)),
                    label: ((classification.name_de || classification.name)),
                    options: ((classification.choices.map((choice) => ({ id: choice.id, name: choice.name_de || choice.name })))),
                    modelValue: ((__VLS_ctx.getSelectedLocationChoicesForClassification(classification.id))),
                    compact: ((true)),
                    singleSelect: ((false)),
                    ...{ class: (({ 'border-warning': __VLS_ctx.isRequiredLocationClassification(classification.id) && !__VLS_ctx.hasSelectedLocationChoiceForClassification(classification.id) })) },
                }));
                const __VLS_1 = __VLS_0({
                    ...{ 'onUpdate:modelValue': {} },
                    key: ((`location-${classification.id}`)),
                    label: ((classification.name_de || classification.name)),
                    options: ((classification.choices.map((choice) => ({ id: choice.id, name: choice.name_de || choice.name })))),
                    modelValue: ((__VLS_ctx.getSelectedLocationChoicesForClassification(classification.id))),
                    compact: ((true)),
                    singleSelect: ((false)),
                    ...{ class: (({ 'border-warning': __VLS_ctx.isRequiredLocationClassification(classification.id) && !__VLS_ctx.hasSelectedLocationChoiceForClassification(classification.id) })) },
                }, ...__VLS_functionalComponentArgsRest(__VLS_0));
                let __VLS_5;
                const __VLS_6 = {
                    'onUpdate:modelValue': (...[$event]) => {
                        if (!((__VLS_ctx.selectedFindingId && __VLS_ctx.findingDataLoaded)))
                            return;
                        if (!((__VLS_ctx.activeTab === 'location')))
                            return;
                        __VLS_ctx.updateLocationChoicesForClassification(classification.id, $event);
                    }
                };
                let __VLS_2;
                let __VLS_3;
                var __VLS_4;
            }
        }
        if (__VLS_ctx.activeTab === 'morphology') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("category-editor") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-container") },
            });
            for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.morphologyClassifications))) {
                // @ts-ignore
                /** @type { [typeof ClassificationCard, ] } */ ;
                // @ts-ignore
                const __VLS_7 = __VLS_asFunctionalComponent(ClassificationCard, new ClassificationCard({
                    ...{ 'onUpdate:modelValue': {} },
                    key: ((`morphology-${classification.id}`)),
                    label: ((classification.name_de || classification.name)),
                    options: ((classification.choices.map((choice) => ({ id: choice.id, name: choice.name_de || choice.name })))),
                    modelValue: ((__VLS_ctx.getSelectedMorphologyChoicesForClassification(classification.id))),
                    compact: ((true)),
                    singleSelect: ((false)),
                    ...{ class: (({ 'border-warning': __VLS_ctx.isRequiredMorphologyClassification(classification.id) && !__VLS_ctx.hasSelectedMorphologyChoiceForClassification(classification.id) })) },
                }));
                const __VLS_8 = __VLS_7({
                    ...{ 'onUpdate:modelValue': {} },
                    key: ((`morphology-${classification.id}`)),
                    label: ((classification.name_de || classification.name)),
                    options: ((classification.choices.map((choice) => ({ id: choice.id, name: choice.name_de || choice.name })))),
                    modelValue: ((__VLS_ctx.getSelectedMorphologyChoicesForClassification(classification.id))),
                    compact: ((true)),
                    singleSelect: ((false)),
                    ...{ class: (({ 'border-warning': __VLS_ctx.isRequiredMorphologyClassification(classification.id) && !__VLS_ctx.hasSelectedMorphologyChoiceForClassification(classification.id) })) },
                }, ...__VLS_functionalComponentArgsRest(__VLS_7));
                let __VLS_12;
                const __VLS_13 = {
                    'onUpdate:modelValue': (...[$event]) => {
                        if (!((__VLS_ctx.selectedFindingId && __VLS_ctx.findingDataLoaded)))
                            return;
                        if (!((__VLS_ctx.activeTab === 'morphology')))
                            return;
                        __VLS_ctx.updateMorphologyChoicesForClassification(classification.id, $event);
                    }
                };
                let __VLS_9;
                let __VLS_10;
                var __VLS_11;
            }
        }
        if (__VLS_ctx.selectedFindingId) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("form-actions") },
            });
            if (__VLS_ctx.validationErrors.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("alert alert-warning") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                    ...{ class: ("mb-0") },
                });
                for (const [error] of __VLS_getVForSourceType((__VLS_ctx.validationErrors))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                        key: ((error)),
                    });
                    (error);
                }
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("form-group") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                for: ("notes"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.textarea)({
                id: ("notes"),
                value: ((__VLS_ctx.notes)),
                ...{ class: ("form-control") },
                rows: ("3"),
                placeholder: ("Zusätzliche Bemerkungen..."),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("button-group") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.saveFinding) },
                disabled: ((!__VLS_ctx.canSave)),
                ...{ class: ("btn btn-primary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.resetForm) },
                ...{ class: ("btn btn-secondary") },
            });
        }
    }
    if (!__VLS_ctx.selectedExaminationId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("help-text") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (!__VLS_ctx.selectedFindingId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("help-text") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        (__VLS_ctx.error);
    }
    ['examination-view', 'exam-header', 'form-row', 'form-group', 'form-control', 'form-group', 'form-control', 'exam-body', 'categories-panel', 'category-tabs', 'active', 'tab-button', 'required-indicator', 'active', 'tab-button', 'required-indicator', 'editor-panel', 'category-editor', 'card-container', 'border-warning', 'category-editor', 'card-container', 'border-warning', 'form-actions', 'alert', 'alert-warning', 'mb-0', 'form-group', 'form-control', 'button-group', 'btn', 'btn-primary', 'btn', 'btn-secondary', 'help-text', 'help-text', 'alert', 'alert-danger',];
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
            ClassificationCard: ClassificationCard,
            locationClassifications: locationClassifications,
            morphologyClassifications: morphologyClassifications,
            notes: notes,
            findingDataLoaded: findingDataLoaded,
            activeTab: activeTab,
            availableExaminations: availableExaminations,
            availableFindings: availableFindings,
            error: error,
            selectedExaminationId: selectedExaminationId,
            selectedFindingId: selectedFindingId,
            hasRequiredLocationClassifications: hasRequiredLocationClassifications,
            hasRequiredMorphologyClassifications: hasRequiredMorphologyClassifications,
            validationErrors: validationErrors,
            canSave: canSave,
            onExaminationChange: onExaminationChange,
            onFindingChange: onFindingChange,
            isRequiredLocationClassification: isRequiredLocationClassification,
            isRequiredMorphologyClassification: isRequiredMorphologyClassification,
            getSelectedLocationChoicesForClassification: getSelectedLocationChoicesForClassification,
            getSelectedMorphologyChoicesForClassification: getSelectedMorphologyChoicesForClassification,
            updateLocationChoicesForClassification: updateLocationChoicesForClassification,
            updateMorphologyChoicesForClassification: updateMorphologyChoicesForClassification,
            hasSelectedLocationChoiceForClassification: hasSelectedLocationChoiceForClassification,
            hasSelectedMorphologyChoiceForClassification: hasSelectedMorphologyChoiceForClassification,
            saveFinding: saveFinding,
            resetForm: resetForm,
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
