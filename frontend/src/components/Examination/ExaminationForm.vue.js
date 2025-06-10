import { ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import ClassificationCard from './ClassificationCard.vue';
import axios from 'axios';
const props = withDefaults(defineProps(), {
    videoTimestamp: null,
    videoId: null,
    patientId: null
});
const emit = defineEmits();
// Store
const examinationStore = useExaminationStore();
// New reactive state for patient examination creation
const availablePatients = ref([]);
const availableExaminationsDropdown = ref([]);
const selectedPatientHash = ref(null);
const selectedExaminationName = ref(null);
const examinationDateStart = ref(new Date().toISOString().split('T')[0]);
const currentPatientExaminationId = ref(null);
const successMessage = ref('');
// Reactive state
const locationClassifications = ref([]);
const morphologyClassifications = ref([]);
// Current finding data structure - store selected choice IDs for each classification
const selectedLocationChoices = ref([]);
const selectedMorphologyChoices = ref([]);
// Form state
const notes = ref('');
const findingDataLoaded = ref(false);
const loading = ref(false);
// Local state
const activeTab = ref('location');
// Computed values from store
const availableExaminations = computed(() => examinationStore.examinations);
const availableFindings = computed(() => examinationStore.availableFindings);
const error = computed(() => examinationStore.error);
// Local computed values
const selectedExaminationId = computed({
    get: () => examinationStore.selectedExaminationId,
    set: (value) => {
        if (value) {
            examinationStore.setSelectedExamination(value);
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
const todayDate = computed(() => new Date().toISOString().split('T')[0]);
const canCreateExamination = computed(() => {
    return (selectedPatientHash.value || props.patientId) &&
        selectedExaminationName.value &&
        examinationDateStart.value &&
        !loading.value;
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
        // Save through store - pass patientId if available
        const result = await examinationStore.savePatientFinding(props.videoId || undefined, props.videoTimestamp || undefined, props.patientId || undefined // Neu: patientId übergeben
        );
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
async function createPatientExamination() {
    if (!canCreateExamination.value)
        return;
    loading.value = true;
    successMessage.value = '';
    try {
        const patientHash = props.patientId ? null : selectedPatientHash.value;
        const requestData = {
            patient: patientHash,
            examination: selectedExaminationName.value,
            date_start: examinationDateStart.value,
        };
        const response = await axios.post('/api/patient-examinations/', requestData);
        currentPatientExaminationId.value = response.data.id;
        successMessage.value = 'Patientenuntersuchung erfolgreich erstellt.';
        // Load available findings for the selected examination
        if (selectedExaminationName.value) {
            const examination = availableExaminationsDropdown.value.find(e => e.name === selectedExaminationName.value);
            if (examination) {
                selectedExaminationId.value = examination.id;
                await examinationStore.loadFindingsForExamination(examination.id);
            }
        }
        emit('patient-examination-created', response.data);
        // Clear success message after 5 seconds
        setTimeout(() => {
            successMessage.value = '';
        }, 5000);
    }
    catch (err) {
        console.error('Error creating patient examination:', err);
        let errorMessage = 'Fehler beim Erstellen der Patientenuntersuchung.';
        if (err.response?.data?.error) {
            errorMessage = err.response.data.error;
        }
        else if (err.response?.data) {
            // Handle field-specific errors
            const errors = [];
            for (const [field, messages] of Object.entries(err.response.data)) {
                if (Array.isArray(messages)) {
                    errors.push(`${field}: ${messages.join(', ')}`);
                }
                else {
                    errors.push(`${field}: ${messages}`);
                }
            }
            if (errors.length > 0) {
                errorMessage = errors.join('; ');
            }
        }
        examinationStore.setError(errorMessage);
    }
    finally {
        loading.value = false;
    }
}
function resetForm() {
    // Reset patient examination creation
    selectedPatientHash.value = null;
    selectedExaminationName.value = null;
    examinationDateStart.value = new Date().toISOString().split('T')[0];
    currentPatientExaminationId.value = null;
    successMessage.value = '';
    // Reset finding form
    resetFindingForm();
    // Reset store
    examinationStore.resetForm();
}
function resetFindingForm() {
    selectedLocationChoices.value = [];
    selectedMorphologyChoices.value = [];
    notes.value = '';
    activeTab.value = 'location';
    findingDataLoaded.value = false;
    selectedFindingId.value = null;
}
async function onPatientChange() {
    // Reset examination-related state when patient changes
    selectedExaminationName.value = null;
    currentPatientExaminationId.value = null;
    successMessage.value = '';
    resetFindingForm();
}
// New methods for patient examination management
async function loadPatientsDropdown() {
    try {
        // Use the correct patient store endpoint instead of the faulty patients_dropdown
        const response = await axios.get('/api/patients/');
        // Transform the patient data to match the expected interface
        availablePatients.value = response.data.map((patient) => ({
            id: patient.id,
            patient_hash: patient.patient_hash || `patient_${patient.id}`,
            first_name: patient.first_name || '',
            last_name: patient.last_name || '',
            display_name: `${patient.first_name || 'Unbekannt'} ${patient.last_name || 'Unbekannt'}${patient.patient_hash ? ` (${patient.patient_hash.substring(0, 8)}...)` : ''}`,
            dob: patient.dob || ''
        }));
        console.log('Patients loaded successfully:', availablePatients.value.length);
    }
    catch (err) {
        console.error('Error loading patients dropdown:', err);
        // Set empty array as fallback
        availablePatients.value = [];
    }
}
async function loadExaminationsDropdown() {
    try {
        const response = await axios.get('/api/patient-examinations/examinations_dropdown/');
        availableExaminationsDropdown.value = response.data;
    }
    catch (err) {
        console.error('Error loading examinations dropdown:', err);
    }
}
// Load data on mount
onMounted(async () => {
    await Promise.all([
        examinationStore.loadExaminations(),
        loadPatientsDropdown(),
        loadExaminationsDropdown()
    ]);
    // If patientId is provided, set it in the store
    if (props.patientId) {
        examinationStore.setPatientId(props.patientId);
    }
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    videoTimestamp: null,
    videoId: null,
    patientId: null
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['patient-badge', 'patient-selection-header', 'exam-header', 'form-group', 'form-group', 'form-control', 'tab-button', 'tab-button', 'alert', 'btn', 'btn-primary', 'btn-secondary', 'btn-outline-secondary', 'form-row', 'exam-body', 'categories-panel', 'category-tabs', 'tab-button',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("examination-view") },
    });
    if (!__VLS_ctx.patientId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-selection-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("patient-select"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onPatientChange) },
            id: ("patient-select"),
            value: ((__VLS_ctx.selectedPatientHash)),
            ...{ class: ("form-control") },
            ...{ class: (({ 'border-danger': !__VLS_ctx.selectedPatientHash })) },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.availablePatients))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((patient.patient_hash)),
                value: ((patient.patient_hash)),
            });
            (patient.display_name);
        }
    }
    if (__VLS_ctx.patientId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-info-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-badge") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.patientId);
    }
    if (__VLS_ctx.selectedPatientHash || __VLS_ctx.patientId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-examination-form") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
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
            value: ((__VLS_ctx.selectedExaminationName)),
            ...{ class: ("form-control") },
            disabled: ((!__VLS_ctx.selectedPatientHash || __VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [examination] of __VLS_getVForSourceType((__VLS_ctx.availableExaminationsDropdown))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((examination.name)),
                value: ((examination.name)),
            });
            (examination.display_name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("date-start"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            id: ("date-start"),
            type: ("date"),
            ...{ class: ("form-control") },
            max: ((__VLS_ctx.todayDate)),
        });
        (__VLS_ctx.examinationDateStart);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-actions") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.createPatientExamination) },
            disabled: ((!__VLS_ctx.canCreateExamination || __VLS_ctx.loading)),
            ...{ class: ("btn btn-primary") },
        });
        if (!__VLS_ctx.loading) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-plus") },
            });
        }
        if (__VLS_ctx.loading) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin") },
            });
        }
        (__VLS_ctx.loading ? 'Erstelle...' : 'Untersuchung erstellen');
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetForm) },
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-undo") },
        });
    }
    if (__VLS_ctx.currentPatientExaminationId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.hr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
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
                        if (!((__VLS_ctx.currentPatientExaminationId)))
                            return;
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
                        if (!((__VLS_ctx.currentPatientExaminationId)))
                            return;
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
                            if (!((__VLS_ctx.currentPatientExaminationId)))
                                return;
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
                            if (!((__VLS_ctx.currentPatientExaminationId)))
                                return;
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
                    disabled: ((!__VLS_ctx.canSave || __VLS_ctx.loading)),
                    ...{ class: ("btn btn-primary") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-save") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.resetFindingForm) },
                    ...{ class: ("btn btn-secondary") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-undo") },
                });
            }
        }
    }
    if (__VLS_ctx.selectedPatientHash || __VLS_ctx.selectedExaminationId || __VLS_ctx.selectedFindingId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("selection-summary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
        if (__VLS_ctx.selectedPatientHash) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.availablePatients.find(p => p.patient_hash === __VLS_ctx.selectedPatientHash)?.display_name);
        }
        if (__VLS_ctx.selectedExaminationId) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.selectedExaminationName);
        }
        if (__VLS_ctx.selectedFindingId) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.availableFindings.find(f => f.id === __VLS_ctx.selectedFindingId)?.name);
        }
    }
    if (!__VLS_ctx.selectedPatientHash && !__VLS_ctx.patientId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("help-text") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (!__VLS_ctx.currentPatientExaminationId) {
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
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success") },
        });
        (__VLS_ctx.successMessage);
    }
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        (__VLS_ctx.error);
    }
    ['examination-view', 'patient-selection-header', 'form-group', 'form-control', 'border-danger', 'patient-info-header', 'patient-badge', 'fas', 'fa-user', 'patient-examination-form', 'form-row', 'form-group', 'form-control', 'form-group', 'form-control', 'form-actions', 'btn', 'btn-primary', 'fas', 'fa-plus', 'fas', 'fa-spinner', 'fa-spin', 'btn', 'btn-secondary', 'fas', 'fa-undo', 'exam-header', 'form-row', 'form-group', 'form-control', 'exam-body', 'categories-panel', 'category-tabs', 'active', 'tab-button', 'required-indicator', 'active', 'tab-button', 'required-indicator', 'editor-panel', 'category-editor', 'card-container', 'border-warning', 'category-editor', 'card-container', 'border-warning', 'form-actions', 'alert', 'alert-warning', 'mb-0', 'form-group', 'form-control', 'button-group', 'btn', 'btn-primary', 'fas', 'fa-save', 'btn', 'btn-secondary', 'fas', 'fa-undo', 'selection-summary', 'help-text', 'help-text', 'help-text', 'alert', 'alert-success', 'alert', 'alert-danger',];
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
            availablePatients: availablePatients,
            availableExaminationsDropdown: availableExaminationsDropdown,
            selectedPatientHash: selectedPatientHash,
            selectedExaminationName: selectedExaminationName,
            examinationDateStart: examinationDateStart,
            currentPatientExaminationId: currentPatientExaminationId,
            successMessage: successMessage,
            locationClassifications: locationClassifications,
            morphologyClassifications: morphologyClassifications,
            notes: notes,
            findingDataLoaded: findingDataLoaded,
            loading: loading,
            activeTab: activeTab,
            availableFindings: availableFindings,
            error: error,
            selectedExaminationId: selectedExaminationId,
            selectedFindingId: selectedFindingId,
            todayDate: todayDate,
            canCreateExamination: canCreateExamination,
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
            createPatientExamination: createPatientExamination,
            resetForm: resetForm,
            resetFindingForm: resetFindingForm,
            onPatientChange: onPatientChange,
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
