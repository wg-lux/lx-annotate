import { ref, computed, onMounted, watch } from 'vue';
import { useFindingStore } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';
const patientExaminationStore = usePatientExaminationStore();
const findingClassificationStore = useFindingClassificationStore();
const patientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();
patientExaminationStore.setCurrentPatientExaminationId(patientExaminationId);
const props = withDefaults(defineProps(), {
    patientExaminationId: undefined,
    examinationId: undefined
});
watch(() => patientExaminationStore.getCurrentPatientExaminationId, (newId) => {
    if (newId && !props.patientExaminationId) {
        console.warn('[AddableFindingsDetail] Syncing patientExaminationId from store as prop was not provided. New ID:', newId);
        // We will trigger the logic that depends on patientExaminationId changing.
        loadFindingsAndClassificationsNew();
    }
}, { immediate: true });
const emit = defineEmits();
const findingStore = useFindingStore();
const patientFindingStore = usePatientFindingStore();
const examinationStore = useExaminationStore();
// Component State
const loading = ref(false);
const activeTab = ref('available');
const showFindingSelector = ref(false);
const selectedFindingId = ref(null);
const findingClassifications = ref([]);
const selectedChoices = ref({});
const availableExaminationFindings = ref([]);
const addedFindings = ref([]);
// Computed Properties
const availableFindings = computed(() => {
    return availableExaminationFindings.value;
});
const fetchedAddedFindings = computed(async () => {
    const currentPatientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();
    if (!currentPatientExaminationId)
        return [];
    const findings = await findingStore.fetchFindingsByPatientExamination(currentPatientExaminationId);
    return findings || [];
});
watch(fetchedAddedFindings, async (newFindingsPromise) => {
    addedFindings.value = await newFindingsPromise;
});
const selectedFinding = computed(() => {
    if (!selectedFindingId.value)
        return undefined;
    return availableFindings.value.find(f => f.id === selectedFindingId.value) ||
        findingClassificationStore.getFindingById(selectedFindingId.value);
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
        findingClassifications.value = findingClassificationStore.getClassificationsForFinding(findingId);
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
        addedFindings.value.push(newPatientFinding.finding);
        const findingName = selectedFinding.value.nameDe || selectedFinding.value.name;
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
        emit('finding-error', 'Fehler beim Laden der Untersuchungsdaten');
    }
    finally {
        loading.value = false;
    }
};
// Neue Methode: Lade Befunde basierend auf der PatientExamination
const loadAvailableFindingsForPatientExamination = async () => {
    try {
        loading.value = true;
        // Priorisiere props.examinationId, falls verfügbar
        let examId = props.examinationId;
        if (!examId && props.patientExaminationId) {
            // Hole Examination ID aus PatientExamination
            const patientExamination = patientExaminationStore.getPatientExaminationById(props.patientExaminationId);
            examId = patientExamination?.examination?.id;
        }
        if (!examId) {
            console.warn('Keine Examination ID verfügbar für Findings-Laden');
            return;
        }
        // Verwende den korrigierten Store-Aufruf
        const findings = await examinationStore.loadFindingsForExamination(examId);
        availableExaminationFindings.value = findings;
        console.log('📋 [AddableFindingsDetail] Loaded findings for examinationId:', examId, 'findings count:', findings.length);
    }
    catch (error) {
        console.error('Error loading available findings:', error);
        emit('finding-error', 'Fehler beim Laden der verfügbaren Befunde');
    }
    finally {
        loading.value = false;
    }
};
const loadFindingsAndClassificationsNew = async () => {
    await loadAvailableFindingsForPatientExamination();
    if (props.examinationId) {
        await loadFindingsAndClassifications(props.examinationId);
    }
};
// Watchers
watch(() => props.patientExaminationId, async () => {
    if (props.patientExaminationId) {
        await loadFindingsAndClassificationsNew();
    }
}, { immediate: true });
watch(() => props.examinationId, async () => {
    if (props.examinationId) {
        await loadAvailableFindingsForPatientExamination();
    }
}, { immediate: true });
// Load initial data
onMounted(async () => {
    await loadFindingsAndClassificationsNew();
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("nav nav-tabs card-header-tabs") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'available';
            } },
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.activeTab === 'available' })) },
        href: ("#"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-list me-1") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge rounded-pill bg-primary ms-1") },
    });
    (__VLS_ctx.availableFindings.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'added';
            } },
        ...{ class: ("nav-link") },
        ...{ class: (({ active: __VLS_ctx.activeTab === 'added' })) },
        href: ("#"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check-circle me-1") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge rounded-pill bg-success ms-1") },
    });
    (__VLS_ctx.addedFindings.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'available') }, null, null);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-end mb-3") },
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
    if (__VLS_ctx.showFindingSelector) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3 finding-selector") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label fw-bold") },
        });
        if (__VLS_ctx.availableFindings.length === 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-3 text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-info-circle fa-2x mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row g-3") },
            });
            for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((finding.id)),
                    ...{ class: ("col-12 col-sm-6 col-md-4") },
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
                    ...{ class: (({ 'border-primary shadow-sm': __VLS_ctx.selectedFindingId === finding.id })) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body p-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                    ...{ class: ("card-title small fw-bold") },
                });
                (finding.nameDe || finding.name);
                if (finding.description) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: ("card-text small text-muted mb-0") },
                    });
                    (finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description);
                }
            }
        }
    }
    if (__VLS_ctx.selectedFindingId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selected-finding-config mt-4 p-4 border rounded bg-light") },
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedFinding?.nameDe || __VLS_ctx.selectedFinding?.name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearSelection) },
            ...{ class: ("btn btn-sm btn-outline-secondary") },
            title: ("Auswahl zurücksetzen"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-times") },
        });
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
                        ...{ class: ("badge bg-warning text-dark") },
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
                    ...{ class: (({ 'border-success': __VLS_ctx.selectedChoices[classification.id], 'border-warning': !__VLS_ctx.selectedChoices[classification.id] && classification.required })) },
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
                ...{ class: ("classification-progress") },
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
            ...{ class: ("text-end mt-3") },
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
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus me-2") },
        });
    }
    else if (!__VLS_ctx.showFindingSelector) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5 text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus-circle fa-3x mb-3 opacity-50") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'added') }, null, null);
    if (__VLS_ctx.addedFindings.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5 text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-folder-open fa-3x mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row g-3") },
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.addedFindings))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((finding.id)),
                ...{ class: ("col-12 col-sm-6 col-md-4 col-lg-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card h-100 border-success") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-body p-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-start gap-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check-circle text-success mt-1") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("flex-grow-1") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("card-title small fw-bold text-success") },
            });
            (finding.nameDe || finding.name);
            if (finding.description) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: ("card-text small text-muted mb-2") },
                });
                (finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-info text-dark small") },
            });
            (finding.id);
        }
    }
    ['addable-finding-card', 'card', 'mb-3', 'border-primary', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'bg-light', 'd-flex', 'align-items-center', 'gap-2', 'fas', 'fa-plus-circle', 'text-primary', 'card-title', 'mb-0', 'nav', 'nav-tabs', 'card-header-tabs', 'nav-item', 'nav-link', 'active', 'fas', 'fa-list', 'me-1', 'badge', 'rounded-pill', 'bg-primary', 'ms-1', 'nav-item', 'nav-link', 'active', 'fas', 'fa-check-circle', 'me-1', 'badge', 'rounded-pill', 'bg-success', 'ms-1', 'card-body', 'd-flex', 'justify-content-end', 'mb-3', 'btn', 'btn-sm', 'btn-primary', 'fas', 'mb-3', 'finding-selector', 'form-label', 'fw-bold', 'text-center', 'py-3', 'text-muted', 'fas', 'fa-info-circle', 'fa-2x', 'mb-2', 'row', 'g-3', 'col-12', 'col-sm-6', 'col-md-4', 'finding-option', 'card', 'h-100', 'cursor-pointer', 'border-primary', 'shadow-sm', 'card-body', 'p-3', 'card-title', 'small', 'fw-bold', 'card-text', 'small', 'text-muted', 'mb-0', 'selected-finding-config', 'mt-4', 'p-4', 'border', 'rounded', 'bg-light', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-3', 'mb-0', 'fas', 'fa-cog', 'text-primary', 'me-2', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-times', 'mb-3', 'classification-config-list', 'classification-config-item', 'mb-3', 'p-3', 'border', 'rounded', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'd-flex', 'align-items-center', 'gap-2', 'badge', 'bg-warning', 'text-dark', 'fas', 'fa-exclamation-triangle', 'badge', 'bg-success', 'fas', 'fa-check', 'text-muted', 'small', 'mb-2', 'form-select', 'form-select-sm', 'border-success', 'border-warning', 'classification-progress', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-1', 'text-muted', 'fw-semibold', 'progress', 'progress-bar', 'text-end', 'mt-3', 'btn', 'btn-success', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-plus', 'me-2', 'text-center', 'py-5', 'text-muted', 'fas', 'fa-plus-circle', 'fa-3x', 'mb-3', 'opacity-50', 'text-center', 'py-5', 'text-muted', 'fas', 'fa-folder-open', 'fa-3x', 'mb-3', 'row', 'g-3', 'col-12', 'col-sm-6', 'col-md-4', 'col-lg-3', 'card', 'h-100', 'border-success', 'card-body', 'p-3', 'd-flex', 'align-items-start', 'gap-2', 'fas', 'fa-check-circle', 'text-success', 'mt-1', 'flex-grow-1', 'card-title', 'small', 'fw-bold', 'text-success', 'card-text', 'small', 'text-muted', 'mb-2', 'badge', 'bg-info', 'text-dark', 'small',];
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
            activeTab: activeTab,
            showFindingSelector: showFindingSelector,
            selectedFindingId: selectedFindingId,
            findingClassifications: findingClassifications,
            selectedChoices: selectedChoices,
            addedFindings: addedFindings,
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
