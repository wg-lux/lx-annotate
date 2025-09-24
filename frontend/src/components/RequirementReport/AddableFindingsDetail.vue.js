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
        if (!correspondingFinding)
            return null;
        // 🔒 SAFETY: Only treat pf.classifications as patient-side if the shape fits
        const pcs = Array.isArray(pf.classifications)
            && pf.classifications.length > 0
            && 'classification_choice' in pf.classifications[0]
            ? pf.classifications
            : [];
        // 🛡️ DEFENSE: Debug invalid classifications before filtering
        const invalidClassifications = pcs.filter((cls) => !cls.classification || !cls.classification_choice);
        if (invalidClassifications.length > 0) {
            console.warn('🚨 [AddableFindingsDetail] Found invalid classifications:', {
                findingId: correspondingFinding.id,
                findingName: correspondingFinding.name,
                invalidCount: invalidClassifications.length,
                invalidClassifications: invalidClassifications.map((cls) => ({
                    id: cls.id,
                    hasClassification: !!cls.classification,
                    hasClassificationChoice: !!cls.classification_choice,
                    classification: cls.classification,
                    classificationChoice: cls.classification_choice
                }))
            });
        }
        const enhanced = {
            ...correspondingFinding,
            patientFindingId: pf.id,
            patientClassifications: pcs
                .filter((cls) => {
                const isValid = cls.classification && cls.classification_choice;
                if (!isValid) {
                    console.warn('🚫 [AddableFindingsDetail] Filtering out invalid classification:', {
                        id: cls.id,
                        hasClassification: !!cls.classification,
                        hasClassificationChoice: !!cls.classification_choice
                    });
                }
                return isValid;
            })
                .map((cls) => ({
                id: cls.id,
                classification: {
                    id: cls.classification.id,
                    name: cls.classification.name,
                    description: cls.classification.description ?? null
                },
                choice: {
                    id: cls.classification_choice.id,
                    name: cls.classification_choice.name,
                    description: undefined // FindingClassificationChoice doesn't have description
                },
                is_active: cls.is_active
            }))
        };
        console.log('🔧 [AddableFindingsDetail] Enhanced finding with classifications:', {
            findingId: enhanced.id,
            name: enhanced.name,
            patientClassificationsCount: enhanced.patientClassifications?.length || 0,
            rawClassificationsType: Array.isArray(pf.classifications) && pf.classifications.length > 0 ?
                ('classification_choice' in pf.classifications[0] ? 'patient-side' : 'definition-side') : 'none',
            patientFindingId: pf.id
        });
        return enhanced;
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
        // 🎯 IMMEDIATE UI FEEDBACK: Create patient classifications for immediate display
        const defs = findingClassifications.value; // definitions for selected finding
        const immediatePatientClassifications = defs
            .filter(d => selectedChoices.value[d.id])
            .map(d => ({
            id: -1, // temporary ID
            classification: {
                id: d.id,
                name: d.name ?? 'Unnamed Classification',
                description: d.description
            },
            choice: {
                id: selectedChoices.value[d.id],
                name: d.choices?.find(c => c.id === selectedChoices.value[d.id])?.name ?? String(selectedChoices.value[d.id]),
                description: undefined
            },
            is_active: true,
        }));
        // Füge direkt zur lokalen Liste hinzu (sofortige UI-Update)
        const newFindingId = newPatientFinding.finding.id;
        const createdFinding = findingClassificationStore.getFindingById(newFindingId);
        if (createdFinding) {
            console.log('📋 Found created finding in store, using store version');
            // 🔒 SAFETY: Check if server returned proper patient classifications
            const serverPatientClassifications = Array.isArray(newPatientFinding.classifications)
                && newPatientFinding.classifications.length > 0
                && 'classification_choice' in newPatientFinding.classifications[0]
                ? newPatientFinding.classifications
                    .filter((cls) => cls.classification && cls.classification_choice) // Filter out invalid
                    .map((cls) => ({
                    id: cls.id,
                    classification: {
                        id: cls.classification.id,
                        name: cls.classification.name,
                        description: cls.classification.description ?? null
                    },
                    choice: {
                        id: cls.classification_choice.id,
                        name: cls.classification_choice.name,
                        description: undefined
                    },
                    is_active: cls.is_active
                }))
                : [];
            const enhancedCreatedFinding = {
                ...deepMutable(createdFinding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: serverPatientClassifications.length > 0
                    ? serverPatientClassifications
                    : immediatePatientClassifications
            };
            addedFindings.value.push(enhancedCreatedFinding);
        }
        else {
            console.log('📋 Created finding not found in store, using response data');
            const enhancedResponseFinding = {
                ...deepMutable(newPatientFinding.finding),
                patientFindingId: newPatientFinding.id,
                patientClassifications: immediatePatientClassifications // Use immediate for fallback
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(JSON.stringify(__VLS_ctx.patientFindingStore.patientFindings, null, 2));
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
            for (const [classification] of __VLS_getVForSourceType((finding.patientClassifications?.filter(c => c.classification && c.choice) || []))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (classification.id),
                    ...{ class: "classification-item mb-1" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-light text-dark small border" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (classification.classification.name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-primary" },
                });
                (classification.choice.name);
                if (!classification.is_active) {
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
