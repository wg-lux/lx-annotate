import { ref, computed, onMounted, watch } from 'vue';
import { debounce } from 'lodash-es';
import { useFindingStore } from '@/stores/findingStore';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
import axiosInstance from '@/api/axiosInstance';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingClassificationStore } from '@/stores/findingClassificationStore';
import { deepMutable } from '@/utils/deepMutable';
import { filterNecessaryFindings } from '@/utils/findingFilters';
const isPatientClassification = (x) => !!x?.classification?.id && !!x?.classification_choice?.id;
const isClassificationDefinition = (x) => !!x?.id && typeof x?.name === 'string' && (!x.choices || Array.isArray(x.choices));
// Direct store data access - no complex filtering needed
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
const resolvedPatientExaminationId = computed(() => {
    const resolved = props.patientExaminationId ?? patientExaminationStore.getCurrentPatientExaminationId();
    console.log('🔍 [DEBUG] resolvedPatientExaminationId:', resolved);
    return resolved;
});
/**
 * Available findings for the current examination
 *
 * Returns the list of findings that can be added to the current examination.
 * This is filtered based on the examination context.
 */
const availableFindings = computed(() => {
    console.log('🔍 [DEBUG] availableFindings computed - availableExaminationFindings.value:', availableExaminationFindings.value);
    console.log('🔍 [DEBUG] availableFindings computed - count:', availableExaminationFindings.value.length);
    if (availableExaminationFindings.value.length > 0) {
        console.log('🔍 [DEBUG] availableFindings computed - erste 3 Findings:', availableExaminationFindings.value.slice(0, 3));
    }
    return availableExaminationFindings.value;
});
/**
 * Necessary findings (computed from availableFindings)
 *
 * Returns findings that have at least one required classification.
 * Uses the filterNecessaryFindings utility for consistent logic.
 */
const necessaryFindings = computed(() => filterNecessaryFindings(availableFindings.value));
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
 * Fetches patient findings from the store and converts them to enhanced
 * format with proper finding details and classifications.
 */
async function loadAddedFindingsForCurrentExam() {
    const id = patientExaminationStore.getCurrentPatientExaminationId();
    if (!id) {
        addedFindings.value = [];
        return;
    }
    await patientFindingStore.fetchPatientFindings(id);
    console.log('🔍 [AddableFindingsDetail] Raw store data:', patientFindingStore.patientFindings);
    // 🔧 COMPLETE REWRITE: Handle the actual store structure
    const enhancedFindings = [];
    for (const pf of patientFindingStore.patientFindings) {
        console.log('� [AddableFindingsDetail] Processing PatientFinding:', {
            id: pf.id,
            findingRef: pf.finding,
            classificationsCount: pf.classifications?.length || 0
        });
        // 1️⃣ Get the complete Finding object
        let completeFinding;
        const findingId = typeof pf.finding === 'number' ? pf.finding : pf.finding?.id;
        if (typeof pf.finding === 'object' && pf.finding?.name) {
            // Finding object is complete
            completeFinding = pf.finding;
            console.log('✅ [AddableFindingsDetail] Using complete finding from store');
        }
        else if (findingId) {
            // Finding is just an ID, need to fetch complete object
            completeFinding = findingClassificationStore.getFindingById(findingId);
            console.log('🔄 [AddableFindingsDetail] Fetched finding by ID:', findingId, completeFinding?.name);
        }
        if (!completeFinding) {
            console.warn('⚠️ [AddableFindingsDetail] Could not resolve finding for:', findingId);
            continue;
        }
        // 2️⃣ Use PatientFinding classifications directly from store
        const patientClassifications = pf.classifications || [];
        console.log('🔍 [DEBUG] Using PatientFinding classifications:', {
            findingId: completeFinding.id,
            findingName: completeFinding.name,
            classificationsCount: patientClassifications.length,
            firstClassification: patientClassifications[0]
        });
        // 3️⃣ Use PatientFinding classifications directly - they already have the correct structure
        const displayClassifications = patientClassifications.map((pc) => ({
            id: pc.id,
            finding: completeFinding.id,
            classification: {
                id: pc.classification.id,
                name: pc.classification.name,
                description: pc.classification.description
            },
            choice: {
                id: pc.classification_choice.id,
                name: pc.classification_choice.name
            },
            is_active: pc.is_active,
            subcategories: pc.subcategories || {},
            numerical_descriptors: pc.numerical_descriptors || {}
        }));
        const enhanced = {
            ...deepMutable(completeFinding),
            patientFindingId: pf.id,
            patientClassifications: displayClassifications
        };
        enhancedFindings.push(enhanced);
        console.log('✅ [AddableFindingsDetail] Created enhanced finding:', {
            id: enhanced.id,
            name: enhanced.name || enhanced.nameDe,
            patientFindingId: enhanced.patientFindingId,
            patientClassificationsCount: enhanced.patientClassifications?.length || 0
        });
    }
    addedFindings.value = enhancedFindings;
    console.log('✅ [AddableFindingsDetail] Final enhanced findings:', enhancedFindings.length);
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
        // 🎯 IMMEDIATE UI FEEDBACK: Create patient classifications for immediate display
        const defs = findingClassifications.value; // definitions for selected finding
        const immediatePatientClassifications = defs
            .filter(d => d?.id && selectedChoices.value[d.id])
            .map(d => {
            try {
                return {
                    id: -1, // temporary ID
                    finding: selectedFindingId.value,
                    classification: {
                        id: d?.id ?? -1,
                        name: d?.name ?? 'Unnamed Classification',
                        description: d?.description ?? undefined
                    },
                    choice: {
                        id: selectedChoices.value[d.id] ?? -1,
                        name: d?.choices?.find(c => c?.id === selectedChoices.value[d.id])?.name ?? String(selectedChoices.value[d.id] ?? 'Unknown')
                    },
                    is_active: true,
                    subcategories: {},
                    numerical_descriptors: {}
                };
            }
            catch (error) {
                console.error('🚨 [AddableFindingsDetail] Error creating immediate classification:', { error, definition: d });
                return null;
            }
        })
            .filter((item) => item !== null);
        // Füge direkt zur lokalen Liste hinzu (sofortige UI-Update)
        const newFindingId = newPatientFinding.finding.id;
        const createdFinding = findingClassificationStore.getFindingById(newFindingId);
        if (createdFinding) {
            console.log('📋 Found created finding in store, using store version');
            // 🔒 Use the complete finding's classifications from store
            const serverPatientClassifications = createdFinding.classifications || [];
            const displayServerClassifications = [];
            serverPatientClassifications.forEach((classification) => {
                if (classification.choices && Array.isArray(classification.choices)) {
                    classification.choices.forEach((choice) => {
                        displayServerClassifications.push({
                            id: choice.id,
                            finding: createdFinding.id,
                            classification: {
                                id: classification.id,
                                name: classification.name || 'Unnamed Classification',
                                description: classification.description
                            },
                            choice: {
                                id: choice.id,
                                name: choice.name || 'Unknown Choice'
                            },
                            is_active: true,
                            subcategories: choice.subcategories || {},
                            numerical_descriptors: choice.numerical_descriptors || {}
                        });
                    });
                }
            });
            const enhancedCreatedFinding = {
                ...deepMutable(createdFinding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: displayServerClassifications.length > 0
                    ? displayServerClassifications
                    : immediatePatientClassifications
            };
            addedFindings.value.push(enhancedCreatedFinding);
        }
        else {
            console.log('📋 Created finding not found in store, using response data');
            const enhancedResponseFinding = {
                ...deepMutable(newPatientFinding.finding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: immediatePatientClassifications
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
        const findings = response?.data || [];
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
        console.log('🔍 [DEBUG] Props:', { examinationId: props.examinationId, patientExaminationId: props.patientExaminationId });
        // Priorisiere props.examinationId, falls verfügbar
        let examId = props.examinationId;
        if (!examId && props.patientExaminationId) {
            // Hole Examination ID aus PatientExamination
            const patientExamination = patientExaminationStore.getPatientExaminationById(props.patientExaminationId);
            console.log('🔍 [DEBUG] PatientExamination gefunden:', patientExamination);
            console.log('🔍 [DEBUG] Examination in PatientExamination:', patientExamination?.examination);
            examId = patientExamination?.examination?.id;
            console.log('🔍 [DEBUG] Extrahierte examId:', examId);
        }
        if (!examId) {
            console.warn('⚠️ Keine Examination ID verfügbar für Findings-Laden');
            return;
        }
        console.log('🔄 [DEBUG] Lade Findings für Examination ID:', examId);
        // Verwende den korrigierten Store-Aufruf
        const findings = await examinationStore.loadFindingsForExamination(examId);
        const safeFindings = Array.isArray(findings) ? findings : [];
        availableExaminationFindings.value = safeFindings.map((f) => deepMutable(f));
        console.log('📋 [DEBUG] Geladene Findings für examinationId:', examId, 'findings count:', findings.length);
        console.log('📋 [DEBUG] Findings Details:', findings);
    }
    catch (error) {
        console.error('❌ Error loading available findings:', error);
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    patientExaminationId: undefined,
    examinationId: undefined
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "addable-finding-card card mb-3 border-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex justify-content-between align-items-center bg-light" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex align-items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-plus-circle text-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "card-title mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
    ...{ class: "nav nav-tabs card-header-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
    ...{ class: "nav-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'available';
        } },
    ...{ class: "nav-link" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'available' }) },
    href: "#",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-list me-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge rounded-pill bg-primary ms-1" },
});
(__VLS_ctx.availableFindings.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
    ...{ class: "nav-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    ...{ onClick: (__VLS_ctx.switchToAddedTab) },
    ...{ class: "nav-link" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'added' }) },
    href: "#",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-check-circle me-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "badge rounded-pill bg-success ms-1" },
});
(__VLS_ctx.addedFindings.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'available') }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex justify-content-end mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showFindingSelector = !__VLS_ctx.showFindingSelector;
        } },
    ...{ class: "btn btn-sm btn-primary" },
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas" },
    ...{ class: (__VLS_ctx.showFindingSelector ? 'fa-minus' : 'fa-plus') },
});
(__VLS_ctx.showFindingSelector ? 'Auswahl ausblenden' : 'Befund auswählen');
if (__VLS_ctx.showFindingSelector) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3 finding-selector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label fw-bold" },
    });
    if (__VLS_ctx.availableFindings.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center py-3 text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-info-circle fa-2x mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row g-3" },
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (finding.id),
                ...{ class: "col-12 col-sm-6 col-md-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showFindingSelector))
                            return;
                        if (!!(__VLS_ctx.availableFindings.length === 0))
                            return;
                        __VLS_ctx.selectFinding(finding.id);
                    } },
                ...{ class: "finding-option card h-100 cursor-pointer" },
                ...{ class: ({ 'border-primary shadow-sm': __VLS_ctx.selectedFindingId === finding.id }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body p-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: "card-title small fw-bold" },
            });
            (finding.nameDe || finding.name);
            if (finding.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "card-text small text-muted mb-0" },
                });
                (finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description);
            }
        }
    }
}
if (__VLS_ctx.selectedFindingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selected-finding-config mt-4 p-4 border rounded bg-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-between align-items-center mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-cog text-primary me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedFinding?.nameDe || __VLS_ctx.selectedFinding?.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSelection) },
        ...{ class: "btn btn-sm btn-outline-secondary" },
        title: "Auswahl zurücksetzen",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-times" },
    });
    if (__VLS_ctx.findingClassifications.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "classification-config-list" },
        });
        for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.findingClassifications))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (classification.id),
                ...{ class: "classification-config-item mb-3 p-3 border rounded" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-between align-items-center mb-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (classification.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex align-items-center gap-2" },
            });
            if (classification.required) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-warning text-dark" },
                    title: "Erforderlich",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: "fas fa-exclamation-triangle" },
                });
            }
            if (__VLS_ctx.selectedChoices[classification.id]) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-success" },
                    title: "Ausgewählt",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: "fas fa-check" },
                });
            }
            if (classification.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-muted small mb-2" },
                });
                (classification.description);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.selectedFindingId))
                            return;
                        if (!(__VLS_ctx.findingClassifications.length > 0))
                            return;
                        __VLS_ctx.updateChoice(classification.id, $event);
                    } },
                ...{ class: "form-select form-select-sm" },
                value: (__VLS_ctx.selectedChoices[classification.id] || ''),
                ...{ class: ({ 'border-success': __VLS_ctx.selectedChoices[classification.id], 'border-warning': !__VLS_ctx.selectedChoices[classification.id] && classification.required }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "",
            });
            if (!classification.choices || classification.choices.length === 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: "",
                    disabled: true,
                });
            }
            else {
                for (const [choice] of __VLS_getVForSourceType((classification.choices))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                        key: (choice.id),
                        value: (choice.id),
                    });
                    (choice.name);
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "classification-progress" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex justify-content-between align-items-center mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "fw-semibold" },
            ...{ class: (__VLS_ctx.classificationProgress.complete ? 'text-success' : 'text-warning') },
        });
        (__VLS_ctx.classificationProgress.selected);
        (__VLS_ctx.classificationProgress.required);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "progress" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "progress-bar" },
            ...{ class: (__VLS_ctx.classificationProgress.complete ? 'bg-success' : 'bg-warning') },
            ...{ style: ({ width: __VLS_ctx.classificationProgress.percentage + '%' }) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-end mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addFindingToExamination) },
        ...{ class: "btn btn-success" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.canAddFinding),
        title: (__VLS_ctx.canAddFinding ? 'Befund zur Untersuchung hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen'),
    });
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-2" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-plus me-2" },
    });
}
else if (!__VLS_ctx.showFindingSelector) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5 text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-plus-circle fa-3x mb-3 opacity-50" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'added') }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({
    ...{ class: "alert alert-info mb-0 cursor-pointer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "alert alert-info mb-0 mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.addedFindings.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.resolvedPatientExaminationId);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.patientFindingStore.patientFindings.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.patientFindingStore.loading);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.patientFindingStore.error || 'None');
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
    ...{ class: "small" },
});
(JSON.stringify(__VLS_ctx.patientFindingStore.patientFindings.slice(0, 1), null, 2));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "small text-muted mt-2" },
});
(__VLS_ctx.patientFindingStore.patientFindings.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(JSON.stringify(__VLS_ctx.addedFindings, null, 2));
if (__VLS_ctx.addedFindings.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5 text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-folder-open fa-3x mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
    });
    for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.addedFindings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (finding.id),
            ...{ class: "col-12 col-sm-6 col-md-4 col-lg-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card h-100 border-success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body p-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-start gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-check-circle text-success mt-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-grow-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "card-title small fw-bold text-success" },
        });
        (finding.nameDe || finding.name || 'Unnamed Finding');
        if (finding.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "card-text small text-muted mb-2" },
            });
            (finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-info text-dark small" },
        });
        (finding.id || 'No ID');
        if (finding.patientClassifications) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted d-block mb-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-tags me-1" },
            });
            (finding.patientClassifications.length);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "classification-list" },
            });
            for (const [classification, idx] of __VLS_getVForSourceType((finding.patientClassifications))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (`pc-${finding.id}-${idx}-${idx}`),
                    ...{ class: "classification-item mb-1" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-light text-dark small border" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (classification.classification?.name ?? 'Unknown');
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-primary" },
                });
                (classification.choice?.name ?? 'Unknown Choice');
                if (classification.is_active === false) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: "fas fa-exclamation-triangle text-warning ms-1" },
                        title: "Inactive",
                    });
                }
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-info-circle me-1" },
            });
        }
    }
}
/** @type {__VLS_StyleScopedClasses['addable-finding-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-list']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-2x']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['finding-option']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['card-text']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-finding-config']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-cog']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-times']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-config-list']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-config-item']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-success']} */ ;
/** @type {__VLS_StyleScopedClasses['border-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['progress']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-plus-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-folder-open']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['border-success']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['card-text']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-list']} */ ;
/** @type {__VLS_StyleScopedClasses['classification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
var __VLS_dollars;
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
});
; /* PartiallyEnd: #4569/main.vue */
