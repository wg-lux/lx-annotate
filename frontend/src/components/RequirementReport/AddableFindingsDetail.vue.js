import { ref, computed, onMounted, watch } from 'vue';
import { debounce } from 'lodash-es';
import { useFindingStore } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';
import { deepMutable } from '@/utils/deepMutable';
// Store instances
const patientExaminationStore = usePatientExaminationStore();
const findingClassificationStore = useFindingClassificationStore();
const findingStore = useFindingStore();
const patientFindingStore = usePatientFindingStore();
const examinationStore = useExaminationStore();
// Get current patient examination ID from store
const patientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();
patientExaminationStore.setCurrentPatientExaminationId(patientExaminationId);
const props = withDefaults(defineProps(), {
    patientExaminationId: undefined,
    examinationId: undefined
});
/**
 * Watcher for patient examination ID changes
 *
 * Monitors changes to the current patient examination ID and triggers
 * data reloading when the ID changes, ensuring UI stays synchronized
 * with the current examination context.
 */
watch(() => patientExaminationStore.getCurrentPatientExaminationId(), (newId) => {
    if (newId && !props.patientExaminationId) {
        console.warn('[AddableFindingsDetail] Syncing patientExaminationId...');
        loadFindingsAndClassificationsNew();
    }
}, { immediate: true });
const emit = defineEmits();
/**
 * Component Reactive State
 *
 * Manages the local state for the component including UI state,
 * selected findings, and classification configurations.
 */
// UI State
const loading = ref(false);
const activeTab = ref('available');
const showFindingSelector = ref(false);
// Finding Selection State
const selectedFindingId = ref(null);
const findingClassifications = ref([]);
const selectedChoices = ref({});
const availableExaminationFindings = ref([]);
const addedFindings = ref([]);
/**
 * Computed Properties
 *
 * Reactive computed values that automatically update based on component state
 * and store changes, providing derived data for the template and methods.
 */
/**
 * Resolved patient examination ID
 *
 * Returns the patient examination ID from props if provided,
 * otherwise falls back to the store value.
 */
const resolvedPatientExaminationId = computed(() => props.patientExaminationId ?? patientExaminationStore.getCurrentPatientExaminationId());
/**
 * Available findings for the current examination
 *
 * Returns the list of findings that can be added to the current examination.
 * This is filtered based on the examination context.
 */
const availableFindings = computed(() => {
    return availableExaminationFindings.value;
});
/**
 * Fetched added findings (computed async)
 *
 * Asynchronously computes the findings that have already been added
 * to the current patient examination.
 */
const fetchedAddedFindings = computed(async () => {
    const currentPatientExaminationId = patientExaminationStore.getCurrentPatientExaminationId();
    if (!currentPatientExaminationId)
        return [];
    const findings = await findingStore.fetchFindingsByPatientExamination(currentPatientExaminationId);
    return findings || [];
});
/**
 * Currently selected finding
 *
 * Returns the Finding object for the currently selected finding ID,
 * searching through available findings and classification store.
 */
const selectedFinding = computed(() => {
    if (!selectedFindingId.value)
        return undefined;
    return availableFindings.value.find(f => f.id === selectedFindingId.value) ||
        findingClassificationStore.getFindingById(selectedFindingId.value);
});
/**
 * Validation: All required classifications selected
 *
 * Checks if all required classifications for the selected finding
 * have been properly configured by the user.
 */
const hasAllRequiredClassifications = computed(() => {
    if (!findingClassifications.value.length)
        return true;
    return findingClassifications.value
        .filter(classification => classification.required)
        .every(classification => selectedChoices.value[classification.id]);
});
/**
 * Can add finding validation
 *
 * Determines if the current state allows adding a finding to the patient.
 * Checks for selected finding, required classifications, and valid context.
 */
const canAddFinding = computed(() => Boolean(selectedFindingId.value &&
    hasAllRequiredClassifications.value &&
    resolvedPatientExaminationId.value &&
    !loading.value));
/**
 * Classification completion progress
 *
 * Calculates the progress of required classification selection,
 * providing data for progress indicators in the UI.
 */
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
/**
 * Component Methods
 *
 * Functions that handle user interactions, data loading, and business logic
 * for managing findings and their classifications.
 */
/**
 * Loads added findings for the current examination
 *
 * Fetches patient findings from the store and converts them to mutable
 * format using deepMutable utility to handle readonly constraints.
 */
async function loadAddedFindingsForCurrentExam() {
    const id = patientExaminationStore.getCurrentPatientExaminationId();
    if (!id) {
        addedFindings.value = [];
        return;
    }
    await patientFindingStore.fetchPatientFindings(id);
    // 🐛 PROBLEM DEBUG: PatientFinding hat möglicherweise keine Finding-Daten
    console.log('🔍 [AddableFindingsDetail] Debug PatientFindings:', patientFindingStore.patientFindings);
    addedFindings.value = patientFindingStore.patientFindings.map(pf => {
        console.log('🔍 [AddableFindingsDetail] PatientFinding:', pf);
        console.log('🔍 [AddableFindingsDetail] Finding in PatientFinding:', pf.finding);
        let finding = pf.finding;
        // 🔧 FIX: Wenn nur Finding-ID vorhanden, lade vollständiges Finding
        if (typeof finding === 'number' || (finding && !finding.name && !finding.nameDe)) {
            const findingId = typeof finding === 'number' ? finding : finding.id;
            console.log('🔄 [AddableFindingsDetail] Loading complete finding for ID:', findingId);
            // Suche im FindingClassificationStore
            const completeFinding = findingClassificationStore.getFindingById(findingId);
            if (completeFinding) {
                finding = completeFinding;
                console.log('✅ [AddableFindingsDetail] Found complete finding:', finding);
            }
            else {
                console.warn('⚠️ [AddableFindingsDetail] Complete finding not found for ID:', findingId);
                return null;
            }
        }
        // Prüfe, ob pf.finding existiert und vollständig ist
        if (!finding || !finding.id) {
            console.error('❌ [AddableFindingsDetail] PatientFinding has no valid finding data:', pf);
            return null;
        }
        return deepMutable(finding);
    }).filter((finding) => finding !== null); // Type guard für null-Filterung
    // 🔧 ENHANCE: Klassifikationen zu den Findings hinzufügen
    const enhancedFindings = patientFindingStore.patientFindings.map(pf => {
        // Hole das korrespondierende Finding aus der gefilterten Liste
        const correspondingFinding = addedFindings.value.find(f => {
            const pfFindingId = typeof pf.finding === 'number' ? pf.finding : pf.finding?.id;
            return f.id === pfFindingId;
        });
        if (correspondingFinding) {
            const enhanced = {
                ...correspondingFinding,
                patientFindingId: pf.id,
                patientClassifications: pf.classifications?.map(cls => ({
                    id: cls.id,
                    classification: {
                        id: cls.classification.id,
                        name: cls.classification.name || 'Unnamed Classification',
                        description: cls.classification.description
                    },
                    choice: {
                        id: cls.classification_choice.id,
                        name: cls.classification_choice.name,
                        description: undefined // FindingClassificationChoice doesn't have description
                    },
                    is_active: cls.is_active
                })) || []
            };
            console.log('🔧 [AddableFindingsDetail] Enhanced finding with classifications:', {
                findingId: enhanced.id,
                name: enhanced.name,
                classificationsCount: enhanced.patientClassifications?.length || 0,
                rawClassifications: pf.classifications,
                patientFindingId: pf.id
            });
            return enhanced;
        }
        return correspondingFinding;
    }).filter((finding) => finding !== null);
    addedFindings.value = enhancedFindings;
    console.log('✅ [AddableFindingsDetail] Final addedFindings:', addedFindings.value);
}
/**
 * Debounced function to load added findings
 *
 * Prevents multiple rapid API calls when patient examination ID changes
 * by debouncing the loadAddedFindingsForCurrentExam function.
 */
const debouncedLoadFindings = debounce(async (newId) => {
    if (newId) {
        console.log('🔄 [AddableFindingsDetail] Loading findings for PE:', newId);
        await loadAddedFindingsForCurrentExam();
    }
}, 150); // 150ms debounce
/**
 * Watcher for patient examination ID changes
 *
 * Automatically reloads added findings when the patient examination changes,
 * ensuring the UI shows the correct findings for the current context.
 * Uses debouncing to prevent multiple rapid API calls.
 */
watch(() => patientExaminationStore.getCurrentPatientExaminationId(), debouncedLoadFindings, { immediate: true });
/**
 * Selects a finding and loads its classifications
 *
 * Handles user selection of a finding from the available list,
 * hides the selector, and loads the required classifications.
 *
 * @param {number} findingId - The ID of the finding to select
 */
const selectFinding = async (findingId) => {
    selectedFindingId.value = findingId;
    showFindingSelector.value = false;
    // Load classifications for the selected finding
    await loadFindingClassifications(findingId);
};
/**
 * Clears the current finding selection
 *
 * Resets all selection state including the selected finding,
 * its classifications, and user choices. Used when user
 * wants to start over or cancel current selection.
 */
const clearSelection = () => {
    selectedFindingId.value = null;
    findingClassifications.value = [];
    selectedChoices.value = {};
};
/**
 * Loads classifications for a specific finding
 *
 * Fetches the available classifications from the store for the given
 * finding ID. Handles loading state and error scenarios.
 *
 * @param {number} findingId - The ID of the finding to load classifications for
 */
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
/**
 * Updates classification choice selection
 *
 * Handles user selection of classification choices from dropdown menus.
 * Updates the selectedChoices reactive object and manages form validation.
 *
 * @param {number} classificationId - The ID of the classification being updated
 * @param {Event} event - The change event from the select element
 */
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
/**
 * Adds the configured finding to the patient examination
 *
 * Validates the current state, prepares the finding data with classifications,
 * and submits it to the patient finding store. Handles success/error states
 * and emits appropriate events for parent components.
 */
const addFindingToExamination = async () => {
    if (!canAddFinding.value || !selectedFinding.value || !resolvedPatientExaminationId.value || !selectedFindingId.value) {
        return;
    }
    try {
        loading.value = true;
        // Prepare the data for the patient finding store
        const findingData = {
            patientExamination: resolvedPatientExaminationId.value,
            finding: selectedFindingId.value,
            classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
                classification: parseInt(classificationId),
                choice: choiceId
            }))
        };
        // Use patientFindingStore to create the patient finding - should be linked to the patient examination!
        patientFindingStore.setCurrentPatientExaminationId(resolvedPatientExaminationId.value);
        const newPatientFinding = await patientFindingStore.createPatientFinding(findingData);
        // WICHTIG: Store sollte automatisch aktualisiert werden, aber erzwinge lokale UI-Update
        console.log('✅ Finding created, updating UI directly');
        // Füge direkt zur lokalen Liste hinzu (sofortige UI-Update)
        const newFindingId = newPatientFinding.finding.id;
        const createdFinding = findingClassificationStore.getFindingById(newFindingId);
        if (createdFinding) {
            console.log('📋 Found created finding in store, using store version');
            const enhancedCreatedFinding = {
                ...deepMutable(createdFinding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: newPatientFinding.classifications?.map(cls => ({
                    id: cls.id,
                    classification: {
                        id: cls.classification.id,
                        name: cls.classification.name || 'Unnamed Classification',
                        description: cls.classification.description
                    },
                    choice: {
                        id: cls.classification_choice.id,
                        name: cls.classification_choice.name,
                        description: undefined
                    },
                    is_active: cls.is_active
                })) || []
            };
            addedFindings.value.push(enhancedCreatedFinding);
        }
        else {
            console.log('📋 Created finding not found in store, using response data');
            const enhancedResponseFinding = {
                ...deepMutable(newPatientFinding.finding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: newPatientFinding.classifications?.map(cls => ({
                    id: cls.id,
                    classification: {
                        id: cls.classification.id,
                        name: cls.classification.name || 'Unnamed Classification',
                        description: cls.classification.description
                    },
                    choice: {
                        id: cls.classification_choice.id,
                        name: cls.classification_choice.name,
                        description: undefined
                    },
                    is_active: cls.is_active
                })) || []
            };
            addedFindings.value.push(enhancedResponseFinding);
        }
        // ENTFERNT: await loadAddedFindingsForCurrentExam() - verhindert doppelte API calls
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
/**
 * Switches to the added findings tab and ensures data is loaded
 */
const switchToAddedTab = async () => {
    console.log('🔄 [AddableFindingsDetail] Switching to added findings tab');
    console.log('🔍 [AddableFindingsDetail] Current addedFindings count before load:', addedFindings.value.length);
    activeTab.value = 'added';
    // Force reload of added findings when switching to tab
    await loadAddedFindingsForCurrentExam();
    console.log('🔍 [AddableFindingsDetail] addedFindings count after load:', addedFindings.value.length);
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
        availableExaminationFindings.value = findings.map((f) => deepMutable(f));
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
/**
 * Debounced function to load findings and classifications
 *
 * Prevents multiple rapid API calls when component props change.
 */
const debouncedLoadFindingsAndClassifications = debounce(async () => {
    await loadFindingsAndClassificationsNew();
}, 100);
// Watchers with debouncing to prevent excessive API calls
watch(() => props.patientExaminationId, async () => {
    if (props.patientExaminationId) {
        console.log('🔄 [AddableFindingsDetail] patientExaminationId prop changed:', props.patientExaminationId);
        await debouncedLoadFindingsAndClassifications();
    }
}, { immediate: true });
watch(() => props.examinationId, async () => {
    if (props.examinationId) {
        console.log('🔄 [AddableFindingsDetail] examinationId prop changed:', props.examinationId);
        await loadAvailableFindingsForPatientExamination();
    }
}, { immediate: true });
// Load initial data
onMounted(async () => {
    console.log('🚀 [AddableFindingsDetail] Component mounted');
    console.log('🔍 [AddableFindingsDetail] Props:', {
        patientExaminationId: props.patientExaminationId,
        examinationId: props.examinationId
    });
    console.log('🔍 [AddableFindingsDetail] Store state at mount:', {
        currentPatientExaminationId: patientExaminationStore.getCurrentPatientExaminationId(),
        findingClassificationStoreFindings: findingClassificationStore.getAllFindings.length,
        patientFindingStoreCount: patientFindingStore.patientFindings.length
    });
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
        ...{ onClick: (__VLS_ctx.switchToAddedTab) },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({
        ...{ class: ("alert alert-info mb-0 cursor-pointer") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("alert alert-info mb-0 mt-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.addedFindings.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.resolvedPatientExaminationId);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.patientFindingStore.patientFindings.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.patientFindingStore.loading);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.patientFindingStore.error || 'None');
    __VLS_elementAsFunction(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        ...{ class: ("mt-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (JSON.stringify(__VLS_ctx.patientFindingStore.patientFindings, null, 2));
    __VLS_elementAsFunction(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        ...{ class: ("mt-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (JSON.stringify(__VLS_ctx.addedFindings, null, 2));
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
            (finding.nameDe || finding.name || 'Unnamed Finding');
            if (finding.description) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: ("card-text small text-muted mb-2") },
                });
                (finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-info text-dark small") },
            });
            (finding.id || 'No ID');
            if (finding.patientClassifications && finding.patientClassifications.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mt-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted d-block mb-1") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-tags me-1") },
                });
                (finding.patientClassifications.length);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("classification-list") },
                });
                for (const [classification] of __VLS_getVForSourceType((finding.patientClassifications))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: ((classification.id)),
                        ...{ class: ("classification-item mb-1") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-light text-dark small border") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    (classification.classification.name);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("text-primary") },
                    });
                    (classification.choice.name);
                    if (!classification.is_active) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                            ...{ class: ("fas fa-exclamation-triangle text-warning ms-1") },
                            title: ("Inactive"),
                        });
                    }
                }
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mt-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-info-circle me-1") },
                });
            }
        }
    }
    ['addable-finding-card', 'card', 'mb-3', 'border-primary', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'bg-light', 'd-flex', 'align-items-center', 'gap-2', 'fas', 'fa-plus-circle', 'text-primary', 'card-title', 'mb-0', 'nav', 'nav-tabs', 'card-header-tabs', 'nav-item', 'nav-link', 'active', 'fas', 'fa-list', 'me-1', 'badge', 'rounded-pill', 'bg-primary', 'ms-1', 'nav-item', 'nav-link', 'active', 'fas', 'fa-check-circle', 'me-1', 'badge', 'rounded-pill', 'bg-success', 'ms-1', 'card-body', 'd-flex', 'justify-content-end', 'mb-3', 'btn', 'btn-sm', 'btn-primary', 'fas', 'mb-3', 'finding-selector', 'form-label', 'fw-bold', 'text-center', 'py-3', 'text-muted', 'fas', 'fa-info-circle', 'fa-2x', 'mb-2', 'row', 'g-3', 'col-12', 'col-sm-6', 'col-md-4', 'finding-option', 'card', 'h-100', 'cursor-pointer', 'border-primary', 'shadow-sm', 'card-body', 'p-3', 'card-title', 'small', 'fw-bold', 'card-text', 'small', 'text-muted', 'mb-0', 'selected-finding-config', 'mt-4', 'p-4', 'border', 'rounded', 'bg-light', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-3', 'mb-0', 'fas', 'fa-cog', 'text-primary', 'me-2', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-times', 'mb-3', 'classification-config-list', 'classification-config-item', 'mb-3', 'p-3', 'border', 'rounded', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'd-flex', 'align-items-center', 'gap-2', 'badge', 'bg-warning', 'text-dark', 'fas', 'fa-exclamation-triangle', 'badge', 'bg-success', 'fas', 'fa-check', 'text-muted', 'small', 'mb-2', 'form-select', 'form-select-sm', 'border-success', 'border-warning', 'classification-progress', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-1', 'text-muted', 'fw-semibold', 'progress', 'progress-bar', 'text-end', 'mt-3', 'btn', 'btn-success', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-plus', 'me-2', 'text-center', 'py-5', 'text-muted', 'fas', 'fa-plus-circle', 'fa-3x', 'mb-3', 'opacity-50', 'mb-3', 'alert', 'alert-info', 'mb-0', 'cursor-pointer', 'alert', 'alert-info', 'mb-0', 'mt-2', 'mt-2', 'mt-2', 'text-center', 'py-5', 'text-muted', 'fas', 'fa-folder-open', 'fa-3x', 'mb-3', 'row', 'g-3', 'col-12', 'col-sm-6', 'col-md-4', 'col-lg-3', 'card', 'h-100', 'border-success', 'card-body', 'p-3', 'd-flex', 'align-items-start', 'gap-2', 'fas', 'fa-check-circle', 'text-success', 'mt-1', 'flex-grow-1', 'card-title', 'small', 'fw-bold', 'text-success', 'card-text', 'small', 'text-muted', 'mb-2', 'badge', 'bg-info', 'text-dark', 'small', 'mt-2', 'text-muted', 'd-block', 'mb-1', 'fas', 'fa-tags', 'me-1', 'classification-list', 'classification-item', 'mb-1', 'badge', 'bg-light', 'text-dark', 'small', 'border', 'text-primary', 'fas', 'fa-exclamation-triangle', 'text-warning', 'ms-1', 'mt-2', 'text-muted', 'fas', 'fa-info-circle', 'me-1',];
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
            patientFindingStore: patientFindingStore,
            loading: loading,
            activeTab: activeTab,
            showFindingSelector: showFindingSelector,
            selectedFindingId: selectedFindingId,
            findingClassifications: findingClassifications,
            selectedChoices: selectedChoices,
            addedFindings: addedFindings,
            resolvedPatientExaminationId: resolvedPatientExaminationId,
            availableFindings: availableFindings,
            selectedFinding: selectedFinding,
            canAddFinding: canAddFinding,
            classificationProgress: classificationProgress,
            selectFinding: selectFinding,
            clearSelection: clearSelection,
            updateChoice: updateChoice,
            addFindingToExamination: addFindingToExamination,
            switchToAddedTab: switchToAddedTab,
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
