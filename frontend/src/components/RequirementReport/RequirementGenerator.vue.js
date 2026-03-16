import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors';
import { endpoints } from '@/types/api/endpoints';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useRequirementStore } from '@/stores/requirementStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import CaseSetupPanel from './CaseSetupPanel.vue';
import FindingsDetail from './FindingsDetail.vue';
import AddableFindingsDetail from './AddableFindingsDetail.vue';
import RequirementIssues from './RequirementIssues.vue';
import RequirementSelectionPanel from './RequirementSelectionPanel.vue';
import KnowledgeBaseValidationPanel from './KnowledgeBaseValidationPanel.vue';
import { useDebug } from '@/composables/useDebug';
// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const requirementStore = useRequirementStore();
const patientExaminationStore = usePatientExaminationStore();
const { loading: findingSelectorsLoading, ensureCatalogLoaded, ensurePatientFindingsLoaded, getFindingById, getFindingNameById, isFindingAttached } = useFindingSelectors();
// --- API ---
const LOOKUP_BASE = '/api/lookup';
const { isDebug } = useDebug();
function debugLog(...args) {
    if (isDebug) {
        console.log(...args);
    }
}
function extractIsoDate(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    return trimmed.split('T')[0];
}
// --- Component State ---
const selectedPatientId = ref(null);
const selectedExaminationId = ref(null);
const currentPatientExaminationId = ref(null);
const lookupToken = ref(null);
const lookup = ref(null);
const error = ref(null);
const loading = ref(false);
const successMessage = ref(null);
const isRestarting = ref(false); // Prevent infinite restart loops
// --- Computed from Store ---
const patients = computed(() => {
    const result = patientStore.patientsWithDisplayName
        .filter((entry) => typeof entry.id === 'number')
        .map((entry) => ({
        id: entry.id,
        displayName: entry.displayName
    }));
    debugLog('Patients with displayName:', result);
    return result;
});
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => {
    const result = examinationStore.examinationsDropdown;
    debugLog('Examinations dropdown:', result);
    return result;
});
const isLoadingExaminations = computed(() => examinationStore.loading);
const selectedPatientDisplayName = computed(() => {
    const patient = patients.value.find((entry) => entry.id === selectedPatientId.value);
    return patient?.displayName || 'Nicht ausgewählt';
});
const selectedExaminationDisplayName = computed(() => {
    const exam = examinationsDropdown.value.find((entry) => entry.id === selectedExaminationId.value);
    return exam?.displayName || 'Nicht ausgewählt';
});
// --- Computed from Local State ---
const requirementSets = computed(() => {
    const sets = lookup.value?.requirementSets ?? [];
    debugLog('Computing requirementSets:', sets);
    return sets;
});
const selectedRequirementSetIds = computed({
    get: () => lookup.value?.selectedRequirementSetIds ?? [],
    set: (val) => { if (lookup.value)
        lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed(() => lookup.value?.availableFindings ?? []);
const findingsSectionLoading = computed(() => findingSelectorsLoading.value || loading.value);
const candidateRequirementSetIds = computed(() => lookup.value?.candidateRequirementSetIds ?? []);
const candidateRequirementSetConfidence = computed(() => typeof lookup.value?.candidateRequirementSetConfidence === 'number'
    ? lookup.value.candidateRequirementSetConfidence
    : null);
const unmetRequirementCount = computed(() => {
    const status = lookup.value?.requirementStatus ?? {};
    return Object.values(status).filter((entry) => entry === false).length;
});
const suggestedActionEntries = computed(() => {
    if (!lookup.value?.suggestedActions)
        return [];
    return Object.entries(lookup.value.suggestedActions).map(([requirementId, actions]) => {
        const firstAction = Array.isArray(actions) ? actions[0] : null;
        const requirementLabel = Object.values(lookup.value?.requirementsBySet ?? {})
            .flat()
            .find((item) => String(item.id) === requirementId)?.name || `Requirement ${requirementId}`;
        return {
            requirementId,
            requirementLabel,
            summary: firstAction?.note ||
                firstAction?.reason ||
                firstAction?.finding_name ||
                'Weitere Eingaben erforderlich'
        };
    });
});
const suggestedActionCount = computed(() => suggestedActionEntries.value.length);
const nextStepMessage = computed(() => {
    if (!selectedPatientId.value || !selectedExaminationId.value) {
        return 'Patient und Untersuchung auswählen, dann den Fall anlegen.';
    }
    if (!lookup.value) {
        return 'Anforderungsbericht erstellen, damit die Wissensbasis die Falldaten prüfen kann.';
    }
    if (!selectedRequirementSetIds.value.length) {
        return candidateRequirementSetIds.value.length
            ? 'Empfohlene Requirement-Sets aus der Knowledge Base übernehmen oder gezielt auswählen.'
            : 'Requirement-Sets auswählen, um die KB-Validierung zu starten.';
    }
    if (unmetRequirementCount.value > 0) {
        return 'Offene KB-Anforderungen abarbeiten oder die Validierung erneut ausführen.';
    }
    return 'Alle aktuell ausgewählten Anforderungen sind erfüllt. Befunde können weiter ergänzt oder der Report abgeschlossen werden.';
});
const watchingLookup = ref(false);
watch(lookup, (newVal, oldVal) => {
    if (watchingLookup.value)
        return; // Prevent recursive calls
    watchingLookup.value = true;
    debugLog('Lookup changed:', { newVal, oldVal });
    if (newVal && newVal.patientExaminationId !== currentPatientExaminationId.value) {
        currentPatientExaminationId.value = newVal.patientExaminationId;
        debugLog('Updated currentPatientExaminationId to:', currentPatientExaminationId.value);
    }
    watchingLookup.value = false;
}, { deep: true });
const watchingRequirementSetIds = ref(false);
watch(selectedRequirementSetIds, (newVal, oldVal) => {
    if (watchingRequirementSetIds.value)
        return; // Prevent recursive calls
    watchingRequirementSetIds.value = true;
    debugLog('Selected Requirement Set IDs changed:', { newVal, oldVal });
    if (newVal !== oldVal) {
        // Trigger evaluation when selected sets change
        requirementStore.setCurrentRequirementSetIds(newVal);
    }
    // Removed: requirementStore.deleteRequirementSetById(oldVal[0]); // This was incorrect and caused issues
    watchingRequirementSetIds.value = false;
});
const watchingPatientExaminationIds = ref(false);
watch(currentPatientExaminationId, (newVal, oldVal) => {
    if (watchingPatientExaminationIds.value)
        return; // Prevent recursive calls
    watchingPatientExaminationIds.value = true;
    debugLog('Current Examination ID changed:', { newVal, oldVal });
    if (newVal !== oldVal) {
        // Trigger evaluation when examination changes
        patientExaminationStore.setCurrentPatientExaminationId(newVal);
    }
    watchingPatientExaminationIds.value = false;
});
// --- Finding Management Methods ---
const isFindingAddedToExamination = (findingId) => {
    return isFindingAttached(lookup.value?.patientExaminationId ?? null, findingId);
};
const onFindingAddedToExamination = (findingIdOrData, findingName) => {
    // Handle both old and new signatures
    let findingId;
    let name;
    let selectedClassifications = [];
    let response = null;
    if (typeof findingIdOrData === 'number') {
        // Old signature: (findingId: number, findingName: string)
        findingId = findingIdOrData;
        name = getFindingNameById(findingId, findingName);
    }
    else {
        // New signature: (data: { findingId, findingName?, selectedClassifications, response })
        findingId = findingIdOrData.findingId;
        name = getFindingNameById(findingId, findingIdOrData.findingName);
        selectedClassifications = findingIdOrData.selectedClassifications || [];
        response = findingIdOrData.response;
    }
    debugLog('Finding added to examination:', {
        findingId,
        name,
        selectedClassifications: selectedClassifications.length,
        hasResponse: !!response
    });
    // Enhanced success message with classification info
    const classificationCount = selectedClassifications.length;
    const message = classificationCount > 0
        ? `Befund "${name}" wurde erfolgreich hinzugefügt mit ${classificationCount} Klassifikation${classificationCount !== 1 ? 'en' : ''}!`
        : `Befund "${name}" wurde erfolgreich hinzugefügt!`;
    successMessage.value = message;
    setTimeout(() => {
        successMessage.value = null;
    }, 5000); // Longer display for more detailed message
    // Trigger requirement evaluation after finding is added
    setTimeout(() => {
        evaluateRequirementsOnChange();
    }, 500); // Small delay to ensure finding is fully added
};
const onClassificationUpdated = (findingId, classificationId, choiceId) => {
    // Handle when a classification choice is updated
    debugLog('Classification updated:', { findingId, classificationId, choiceId });
    // Get finding and classification names for better user feedback
    const findingName = getFindingNameById(findingId);
    // Show success message
    const message = choiceId
        ? `Klassifikation für "${findingName}" wurde erfolgreich ausgewählt!`
        : `Klassifikation für "${findingName}" wurde zurückgesetzt!`;
    successMessage.value = message;
    setTimeout(() => {
        successMessage.value = null;
    }, 3000);
    // Trigger requirement evaluation after classification update
    setTimeout(() => {
        evaluateRequirementsOnChange();
    }, 300); // Small delay to ensure update is processed
};
const loadFindingsData = async () => {
    // Load all findings data if not already loaded
    await ensureCatalogLoaded();
    await ensurePatientFindingsLoaded(lookup.value?.patientExaminationId ?? currentPatientExaminationId.value);
};
// --- Requirement Evaluation Methods ---
// Evaluate requirements when findings are added/removed
const evaluateRequirementsOnChange = async () => {
    if (!lookup.value || !lookupToken.value) {
        debugLog('Skipping evaluation: case data or token not available');
        return;
    }
    if (!lookup.value.patientExaminationId) {
        debugLog('Skipping evaluation: patientExaminationId not available in case data', lookup.value);
        return;
    }
    try {
        debugLog('Evaluating requirements based on current case data...');
        // Use the requirement store to evaluate from lookup data
        await requirementStore.evaluateFromLookupData(lookup.value);
        // Update UI with evaluation results
        debugLog('Requirements evaluated successfully');
        // Show success message
        successMessage.value = 'Anforderungen wurden erfolgreich evaluiert!';
        setTimeout(() => {
            successMessage.value = null;
        }, 3000);
    }
    catch (err) {
        console.error('Error evaluating requirements:', err);
        error.value = 'Fehler bei der Evaluierung der Anforderungen: ' + (err instanceof Error ? err.message : String(err));
    }
};
// Evaluate specific requirement set
const evaluateRequirementSet = async (requirementSetId) => {
    if (!lookup.value || !lookupToken.value)
        return;
    try {
        debugLog('Evaluating requirement set:', requirementSetId);
        // Use the requirement store to evaluate specific requirement set
        await requirementStore.evaluateRequirementSet(requirementSetId, lookup.value.patientExaminationId);
        debugLog('Requirement set evaluated successfully');
    }
    catch (err) {
        console.error('Error evaluating requirement set:', err);
        error.value = 'Fehler bei der Evaluierung des Anforderungssets: ' + (err instanceof Error ? err.message : String(err));
    }
};
// Get evaluation status for a requirement set
const getRequirementSetEvaluationStatus = (requirementSetId) => {
    return requirementStore.getRequirementSetEvaluationStatus(requirementSetId);
};
// Computed properties for evaluation status
const evaluationSummary = computed(() => {
    if (!lookup.value)
        return null;
    const totalSets = requirementSets.value.length;
    const evaluatedSets = requirementSets.value.filter(rs => requirementStore.getRequirementSetEvaluationStatus(rs.id)).length;
    return {
        totalSets,
        evaluatedSets,
        completionPercentage: totalSets > 0 ? Math.round((evaluatedSets / totalSets) * 100) : 0
    };
});
const requirementSetEvaluationMap = computed(() => Object.fromEntries(requirementSets.value.map((rs) => [rs.id, getRequirementSetEvaluationStatus(rs.id)])));
// --- Methods ---
function axiosError(e) {
    if (e?.response?.data?.detail)
        return e.response.data.detail;
    if (e?.message)
        return e.message;
    return 'Unbekannter Fehler';
}
function applyLookup(partial) {
    if (!lookup.value) {
        lookup.value = partial;
    }
    else {
        lookup.value = { ...lookup.value, ...partial };
    }
}
async function createPatientExaminationAndInitLookup() {
    if (isRestarting.value) {
        debugLog('Restart already in progress, skipping createPatientExaminationAndInitLookup...');
        return;
    }
    if (!selectedPatientId.value || !selectedExaminationId.value) {
        console.error('Missing required selections:', {
            selectedPatientId: selectedPatientId.value,
            selectedExaminationId: selectedExaminationId.value
        });
        error.value = "Bitte wählen Sie sowohl einen Patienten als auch eine Untersuchung aus.";
        return;
    }
    const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
    if (!selectedExam) {
        console.error('Selected examination not found in dropdown:', {
            selectedExaminationId: selectedExaminationId.value,
            availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
        });
        error.value = "Ausgewählte Untersuchung nicht gefunden.";
        return;
    }
    debugLog('Creating PatientExamination with:', {
        patientId: selectedPatientId.value,
        examinationName: selectedExam.name,
        examinationId: selectedExam.id
    });
    error.value = null;
    loading.value = true;
    try {
        // Step 1: Create PatientExamination
        const formattedDate = new Date().toISOString().split('T')[0];
        // Get the selected patient to obtain the patient hash
        const selectedPatient = patientStore.getPatientById(selectedPatientId.value);
        if (!selectedPatient) {
            throw new Error('Selected patient not found');
        }
        // Get the selected examination name
        const selectedExam = examinationsDropdown.value.find(exam => exam.id === selectedExaminationId.value);
        if (!selectedExam) {
            throw new Error('Selected examination not found');
        }
        // Format patient birth date for backend (ISO date format)
        const formattedBirthDate = extractIsoDate(selectedPatient.dob);
        const peRes = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
            patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
            examination: selectedExam.name,
            date_start: formattedDate, // Fixed field name
            // 🎯 NEW: Include patient birth date and gender for age calculation
            patient_birth_date: formattedBirthDate,
            patient_gender: selectedPatient.gender || null,
        });
        patientExaminationStore.addPatientExamination(peRes.data);
        debugLog('PatientExamination created:', peRes.data);
        currentPatientExaminationId.value = peRes.data.id;
        // Step 2: Init lookup with the new PatientExamination ID
        const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
            patientExaminationId: currentPatientExaminationId.value
        });
        lookupToken.value = initRes.data.token;
        debugLog('Lookup initialized with token:', lookupToken.value);
        // Start heartbeat for token renewal
        startHeartbeat();
        // Step 3: Load findings data
        await loadFindingsData();
        // Step 4: Fetch all lookup data (without recomputation)
        await fetchLookupAll();
        // Step 5: No automatic recompute - let user select requirement sets first
    }
    catch (e) {
        error.value = axiosError(e);
    }
    finally {
        loading.value = false;
    }
}
async function fetchLookupAll() {
    if (!lookupToken.value)
        return;
    error.value = null;
    loading.value = true;
    try {
        const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/all/?skip_recompute=true`);
        debugLog('Lookup API response:', res.data);
        applyLookup(res.data);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Der technische Fallkontext ist abgelaufen. Ein neuer Stand wird vorbereitet...';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            // Try to automatically restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
            }
        }
        else {
            error.value = axiosError(e);
        }
    }
    finally {
        loading.value = false;
    }
}
async function fetchLookupParts(keys) {
    if (!lookupToken.value || !keys.length)
        return;
    error.value = null;
    loading.value = true;
    const qs = encodeURIComponent(keys.join(','));
    try {
        const res = await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=${qs}`);
        applyLookup(res.data);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Der technische Fallkontext ist abgelaufen. Ein neuer Stand wird vorbereitet...';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            // Try to automatically restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
            }
        }
        else {
            error.value = axiosError(e);
        }
    }
    finally {
        loading.value = false;
    }
}
async function patchLookup(updates) {
    if (!lookupToken.value)
        return;
    try {
        await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates });
        await fetchLookupParts(['availableFindings', 'requiredFindings']);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
        }
        else {
            error.value = axiosError(e);
        }
    }
}
function toggleRequirementSet(id, on) {
    const s = new Set(selectedRequirementSetIds.value);
    if (on)
        s.add(id);
    else
        s.delete(id);
    selectedRequirementSetIds.value = Array.from(s);
    patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
    requirementStore.setCurrentRequirementSetIds(selectedRequirementSetIds.value);
    // Trigger recomputation when requirement sets change
    if (lookupToken.value) {
        triggerRecompute();
    }
}
function updateRequirementSelection(ids) {
    selectedRequirementSetIds.value = Array.from(new Set(ids));
    patchLookup({ selectedRequirementSetIds: selectedRequirementSetIds.value });
    requirementStore.setCurrentRequirementSetIds(selectedRequirementSetIds.value);
    if (lookupToken.value) {
        triggerRecompute();
    }
}
function applyRecommendedRequirementSets() {
    if (!candidateRequirementSetIds.value.length)
        return;
    updateRequirementSelection(candidateRequirementSetIds.value);
}
function selectAllRequirementSets() {
    updateRequirementSelection(requirementSets.value.map((set) => set.id));
}
function clearRequirementSetSelection() {
    updateRequirementSelection([]);
}
async function triggerRecompute() {
    if (patientStore.currentPatient && patientStore.currentPatient.id !== selectedPatientId.value) {
        console.warn('Selected patient ID does not match patient store name. Reloading...');
        // Reload Token Value to update Requirment Sets etc. to seleccted patient
    }
    if (!lookupToken.value)
        return;
    try {
        debugLog('Triggering recomputation for selected requirement sets:', selectedRequirementSetIds.value);
        const res = await axiosInstance.post(`${LOOKUP_BASE}/${lookupToken.value}/recompute/`);
        debugLog('Recompute response:', res.data);
        // Update local lookup data with recomputed results
        if (res.data.updates) {
            applyLookup(res.data.updates);
        }
        // Fetch fresh data to get the complete updated state
        await fetchLookupAll();
        // Trigger requirement evaluation after recomputation
        if (selectedRequirementSetIds.value.length > 0) {
            await evaluateRequirementsOnChange();
        }
    }
    catch (e) {
        console.error('Error during recomputation:', e);
        error.value = 'Fehler bei der Neuberechnung: ' + axiosError(e);
    }
}
async function validateToken() {
    if (!lookupToken.value)
        return false;
    try {
        // Try to fetch a small part to validate token
        await axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`);
        return true;
    }
    catch (e) {
        if (e?.response?.status === 404) {
            // Token expired - trigger restart
            debugLog('Token validation failed with 404, attempting restart...');
            lookupToken.value = null;
            lookup.value = null;
            error.value = 'Der technische Fallkontext ist abgelaufen. Ein neuer Stand wird vorbereitet...';
            // Try to restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.';
            }
            return false;
        }
        return false;
    }
}
function resetLookupSession() {
    lookupToken.value = null;
    lookup.value = null;
    currentPatientExaminationId.value = null;
    error.value = null;
    successMessage.value = null;
    stopHeartbeat();
    // Clear localStorage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
}
async function resetSessionForNewPatient() {
    debugLog('Resetting session for new patient...');
    // Clear current session state
    lookupToken.value = null;
    lookup.value = null;
    currentPatientExaminationId.value = null;
    error.value = null;
    successMessage.value = null;
    stopHeartbeat();
    // Clear localStorage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
    // Clear requirement store state
    requirementStore.reset();
    debugLog('Session reset complete for new patient');
}
async function restartLookupSession() {
    if (isRestarting.value) {
        debugLog('Restart already in progress, skipping...');
        return false;
    }
    debugLog('Attempting to restart lookup session...');
    isRestarting.value = true;
    try {
        // Reset current session state
        lookupToken.value = null;
        lookup.value = null;
        stopHeartbeat();
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        // Check if we have an existing patient examination
        if (currentPatientExaminationId.value && selectedPatientId.value && selectedExaminationId.value) {
            // Reuse existing patient examination - just reinitialize lookup
            debugLog('Reusing existing patient examination:', currentPatientExaminationId.value);
            debugLog('selectedPatientId:', selectedPatientId.value);
            debugLog('selectedExaminationId:', selectedExaminationId.value);
            const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
                patientExaminationId: currentPatientExaminationId.value
            });
            lookupToken.value = initRes.data.token;
            // Start heartbeat for token renewal
            startHeartbeat();
            // Fetch all lookup data
            await fetchLookupAll();
            successMessage.value = 'Der Fallkontext wurde erfolgreich neu aufgebaut.';
            setTimeout(() => {
                successMessage.value = null;
            }, 3000);
            return true;
        }
        else {
            // No existing patient examination, create new one
            debugLog('No existing patient examination, creating new one');
            debugLog('currentPatientExaminationId:', currentPatientExaminationId.value);
            debugLog('selectedPatientId:', selectedPatientId.value);
            debugLog('selectedExaminationId:', selectedExaminationId.value);
            if (!selectedPatientId.value || !selectedExaminationId.value) {
                error.value = 'Der Fallkontext konnte nicht automatisch neu aufgebaut werden: Patient oder Untersuchung fehlt.';
                return false;
            }
            await createPatientExaminationAndInitLookup();
            return true;
        }
    }
    catch (e) {
        console.error('Failed to restart lookup session:', e);
        error.value = 'Fehler beim Neuaufbau des Fallkontexts: ' + axiosError(e);
        return false;
    }
    finally {
        isRestarting.value = false;
    }
}
// --- Heartbeat for token renewal ---
let heartbeatInterval = null;
function startHeartbeat() {
    if (heartbeatInterval)
        return;
    // Renew session every 15 minutes (quarter of TTL to be safe)
    heartbeatInterval = window.setInterval(async () => {
        if (lookupToken.value && !isRestarting.value) {
            // Validate token (this will trigger restart if needed)
            await validateToken();
        }
    }, 15 * 60 * 1000); // 15 minutes
}
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}
// --- Token persistence ---
const TOKEN_STORAGE_KEY = 'lookupToken';
const PATIENT_EXAM_STORAGE_KEY = 'currentPatientExaminationId';
// Load token from localStorage on component creation
const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
const savedPatientExamId = localStorage.getItem(PATIENT_EXAM_STORAGE_KEY);
if (savedToken) {
    lookupToken.value = savedToken;
}
if (savedPatientExamId) {
    currentPatientExaminationId.value = parseInt(savedPatientExamId);
}
// Save token to localStorage whenever it changes
watch(lookupToken, (newToken) => {
    if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    }
    else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
});
watch(currentPatientExaminationId, (newId) => {
    if (newId) {
        localStorage.setItem(PATIENT_EXAM_STORAGE_KEY, newId.toString());
    }
    else {
        localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
    }
});
// --- Watchers ---
watch(selectedExaminationId, (newId) => {
    debugLog('Examination selection changed:', {
        newId,
        selectedPatientId: selectedPatientId.value,
        availableExams: examinationsDropdown.value.map(e => ({ id: e.id, name: e.name }))
    });
    examinationStore.setSelectedExamination(newId);
    if (newId) {
        examinationStore.loadFindingsForExamination(newId);
    }
});
watch(selectedPatientId, async (newPatientId, oldPatientId) => {
    debugLog('Patient selection changed:', {
        oldPatientId,
        newPatientId,
        currentExaminationsCount: examinationsDropdown.value.length
    });
    // Reset examination selection when patient changes
    selectedExaminationId.value = null;
    // If patient actually changed (not just initialized), reset the session
    if (oldPatientId && newPatientId !== oldPatientId) {
        debugLog('Patient changed, resetting session for new overview...');
        await resetSessionForNewPatient();
    }
});
// Watch for changes in selected requirement sets to trigger evaluation
watch(selectedRequirementSetIds, async (newIds, oldIds) => {
    if (newIds.length !== oldIds.length && lookup.value) {
        debugLog('Requirement set selection changed, triggering evaluation...');
        await evaluateRequirementsOnChange();
    }
}, { deep: true });
// Watch for lookup data changes to trigger evaluation
watch(lookup, async (newLookup, oldLookup) => {
    if (newLookup && newLookup !== oldLookup && selectedRequirementSetIds.value.length > 0) {
        debugLog('Lookup data changed, triggering evaluation...');
        // Debounce evaluation to avoid excessive API calls
        setTimeout(() => {
            evaluateRequirementsOnChange();
        }, 1000);
    }
}, { deep: true });
// Watch for lookup data changes to load requirement sets
watch(lookup, (newLookup) => {
    if (newLookup && newLookup.requirementsBySet) {
        debugLog('Loading requirement sets from lookup data...');
        requirementStore.loadRequirementSetsFromLookup(newLookup);
    }
}, { immediate: true });
// --- Lifecycle ---
onMounted(async () => {
    debugLog('Component mounted, starting data loading...');
    try {
        // Patienten und Untersuchungen laden
        await Promise.all([
            patientStore.fetchPatients(),
            examinationStore.fetchExaminations()
        ]);
        debugLog('Data loading completed:', {
            patientsCount: patients.value.length,
            examinationsCount: examinationsDropdown.value.length
        });
        // Nachschlagedaten für Patientenerstellung laden
        await patientStore.initializeLookupData();
        // Validate existing token if present (e.g., after page reload)
        if (lookupToken.value) {
            debugLog('Validating existing token:', lookupToken.value);
            const isValid = await validateToken();
            if (!isValid) {
                lookupToken.value = null;
                lookup.value = null;
                currentPatientExaminationId.value = null; // Clear this too
                stopHeartbeat();
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            }
            else {
                // Token is valid, fetch current data and start heartbeat
                await fetchLookupAll();
                startHeartbeat();
            }
        }
        // Load findings data on component mount
        await loadFindingsData();
    }
    catch (e) {
        console.error('Error during initial reporting setup:', e);
        error.value = 'Fehler beim Laden der Falldaten: ' + axiosError(e);
    }
});
onUnmounted(() => {
    stopHeartbeat();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "requirement-generator container-fluid py-4" },
});
/** @type {[typeof CaseSetupPanel, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(CaseSetupPanel, new CaseSetupPanel({
    ...{ 'onUpdate:selectedPatientId': {} },
    ...{ 'onUpdate:selectedExaminationId': {} },
    ...{ 'onCreateCase': {} },
    selectedPatientId: (__VLS_ctx.selectedPatientId),
    selectedExaminationId: (__VLS_ctx.selectedExaminationId),
    selectedPatientDisplayName: (__VLS_ctx.selectedPatientDisplayName),
    selectedExaminationDisplayName: (__VLS_ctx.selectedExaminationDisplayName),
    patients: (__VLS_ctx.patients),
    examinationsDropdown: (__VLS_ctx.examinationsDropdown),
    isLoadingPatients: (__VLS_ctx.isLoadingPatients),
    isLoadingExaminations: (__VLS_ctx.isLoadingExaminations),
    loading: (__VLS_ctx.loading),
    hasActiveSession: (!!__VLS_ctx.lookupToken),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onUpdate:selectedPatientId': {} },
    ...{ 'onUpdate:selectedExaminationId': {} },
    ...{ 'onCreateCase': {} },
    selectedPatientId: (__VLS_ctx.selectedPatientId),
    selectedExaminationId: (__VLS_ctx.selectedExaminationId),
    selectedPatientDisplayName: (__VLS_ctx.selectedPatientDisplayName),
    selectedExaminationDisplayName: (__VLS_ctx.selectedExaminationDisplayName),
    patients: (__VLS_ctx.patients),
    examinationsDropdown: (__VLS_ctx.examinationsDropdown),
    isLoadingPatients: (__VLS_ctx.isLoadingPatients),
    isLoadingExaminations: (__VLS_ctx.isLoadingExaminations),
    loading: (__VLS_ctx.loading),
    hasActiveSession: (!!__VLS_ctx.lookupToken),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    'onUpdate:selectedPatientId': (...[$event]) => {
        __VLS_ctx.selectedPatientId = $event;
    }
};
const __VLS_7 = {
    'onUpdate:selectedExaminationId': (...[$event]) => {
        __VLS_ctx.selectedExaminationId = $event;
    }
};
const __VLS_8 = {
    onCreateCase: (__VLS_ctx.createPatientExaminationAndInitLookup)
};
var __VLS_2;
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger alert-dismissible" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.error);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.error))
                    return;
                __VLS_ctx.error = null;
            } },
        type: "button",
        ...{ class: "btn-close" },
    });
}
if (__VLS_ctx.lookup) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
    });
    if (__VLS_ctx.lookup && __VLS_ctx.isDebug) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "h6 mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lookup.patientExaminationId || 'Nicht verfügbar');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lookupToken);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.requirementSets.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row mt-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedRequirementSetIds.join(', ') || 'Keine');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.availableFindings.length);
    }
    /** @type {[typeof RequirementSelectionPanel, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(RequirementSelectionPanel, new RequirementSelectionPanel({
        ...{ 'onRefresh': {} },
        ...{ 'onRecompute': {} },
        ...{ 'onResetSession': {} },
        ...{ 'onApplyRecommended': {} },
        ...{ 'onSelectAll': {} },
        ...{ 'onClearSelection': {} },
        ...{ 'onEvaluateAll': {} },
        ...{ 'onEvaluateSet': {} },
        ...{ 'onToggleSet': {} },
        loading: (__VLS_ctx.loading),
        caseActive: (!!__VLS_ctx.lookupToken),
        selectedPatientDisplayName: (__VLS_ctx.selectedPatientDisplayName),
        selectedExaminationDisplayName: (__VLS_ctx.selectedExaminationDisplayName),
        selectedRequirementSetIds: (__VLS_ctx.selectedRequirementSetIds),
        selectedRequirementSetIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        requirementSets: (__VLS_ctx.requirementSets),
        unmetRequirementCount: (__VLS_ctx.unmetRequirementCount),
        suggestedActionCount: (__VLS_ctx.suggestedActionCount),
        nextStepMessage: (__VLS_ctx.nextStepMessage),
        candidateRequirementSetIds: (__VLS_ctx.candidateRequirementSetIds),
        candidateRequirementSetConfidence: (__VLS_ctx.candidateRequirementSetConfidence),
        suggestedActionEntries: (__VLS_ctx.suggestedActionEntries),
        evaluationSummary: (__VLS_ctx.evaluationSummary),
        requirementSetStatus: (__VLS_ctx.requirementSetEvaluationMap),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onRefresh': {} },
        ...{ 'onRecompute': {} },
        ...{ 'onResetSession': {} },
        ...{ 'onApplyRecommended': {} },
        ...{ 'onSelectAll': {} },
        ...{ 'onClearSelection': {} },
        ...{ 'onEvaluateAll': {} },
        ...{ 'onEvaluateSet': {} },
        ...{ 'onToggleSet': {} },
        loading: (__VLS_ctx.loading),
        caseActive: (!!__VLS_ctx.lookupToken),
        selectedPatientDisplayName: (__VLS_ctx.selectedPatientDisplayName),
        selectedExaminationDisplayName: (__VLS_ctx.selectedExaminationDisplayName),
        selectedRequirementSetIds: (__VLS_ctx.selectedRequirementSetIds),
        selectedRequirementSetIdSet: (__VLS_ctx.selectedRequirementSetIdSet),
        requirementSets: (__VLS_ctx.requirementSets),
        unmetRequirementCount: (__VLS_ctx.unmetRequirementCount),
        suggestedActionCount: (__VLS_ctx.suggestedActionCount),
        nextStepMessage: (__VLS_ctx.nextStepMessage),
        candidateRequirementSetIds: (__VLS_ctx.candidateRequirementSetIds),
        candidateRequirementSetConfidence: (__VLS_ctx.candidateRequirementSetConfidence),
        suggestedActionEntries: (__VLS_ctx.suggestedActionEntries),
        evaluationSummary: (__VLS_ctx.evaluationSummary),
        requirementSetStatus: (__VLS_ctx.requirementSetEvaluationMap),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onRefresh: (__VLS_ctx.fetchLookupAll)
    };
    const __VLS_16 = {
        onRecompute: (__VLS_ctx.triggerRecompute)
    };
    const __VLS_17 = {
        onResetSession: (__VLS_ctx.resetLookupSession)
    };
    const __VLS_18 = {
        onApplyRecommended: (__VLS_ctx.applyRecommendedRequirementSets)
    };
    const __VLS_19 = {
        onSelectAll: (__VLS_ctx.selectAllRequirementSets)
    };
    const __VLS_20 = {
        onClearSelection: (__VLS_ctx.clearRequirementSetSelection)
    };
    const __VLS_21 = {
        onEvaluateAll: (__VLS_ctx.evaluateRequirementsOnChange)
    };
    const __VLS_22 = {
        onEvaluateSet: (__VLS_ctx.evaluateRequirementSet)
    };
    const __VLS_23 = {
        onToggleSet: (__VLS_ctx.toggleRequirementSet)
    };
    var __VLS_11;
    /** @type {[typeof KnowledgeBaseValidationPanel, typeof KnowledgeBaseValidationPanel, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(KnowledgeBaseValidationPanel, new KnowledgeBaseValidationPanel({
        ...{ 'onRefreshFindings': {} },
        loading: (__VLS_ctx.loading),
        findingsSectionLoading: (__VLS_ctx.findingsSectionLoading),
        availableFindings: (__VLS_ctx.availableFindings),
        isDebug: (__VLS_ctx.isDebug),
    }));
    const __VLS_25 = __VLS_24({
        ...{ 'onRefreshFindings': {} },
        loading: (__VLS_ctx.loading),
        findingsSectionLoading: (__VLS_ctx.findingsSectionLoading),
        availableFindings: (__VLS_ctx.availableFindings),
        isDebug: (__VLS_ctx.isDebug),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    let __VLS_27;
    let __VLS_28;
    let __VLS_29;
    const __VLS_30 = {
        onRefreshFindings: (__VLS_ctx.loadFindingsData)
    };
    __VLS_26.slots.default;
    {
        const { adder: __VLS_thisSlot } = __VLS_26.slots;
        /** @type {[typeof AddableFindingsDetail, ]} */ ;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent(AddableFindingsDetail, new AddableFindingsDetail({
            ...{ 'onFindingAdded': {} },
            ...{ 'onFindingError': {} },
            examinationId: (__VLS_ctx.selectedExaminationId || undefined),
            patientExaminationId: (__VLS_ctx.currentPatientExaminationId || undefined),
        }));
        const __VLS_32 = __VLS_31({
            ...{ 'onFindingAdded': {} },
            ...{ 'onFindingError': {} },
            examinationId: (__VLS_ctx.selectedExaminationId || undefined),
            patientExaminationId: (__VLS_ctx.currentPatientExaminationId || undefined),
        }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        let __VLS_34;
        let __VLS_35;
        let __VLS_36;
        const __VLS_37 = {
            onFindingAdded: (__VLS_ctx.onFindingAddedToExamination)
        };
        const __VLS_38 = {
            onFindingError: ((errorMsg) => __VLS_ctx.error = errorMsg)
        };
        var __VLS_33;
    }
    {
        const { findings: __VLS_thisSlot } = __VLS_26.slots;
        for (const [findingId] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
            /** @type {[typeof FindingsDetail, ]} */ ;
            // @ts-ignore
            const __VLS_39 = __VLS_asFunctionalComponent(FindingsDetail, new FindingsDetail({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                key: (findingId),
                findingId: (findingId),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
                patientExaminationId: (__VLS_ctx.lookup?.patientExaminationId || undefined),
            }));
            const __VLS_40 = __VLS_39({
                ...{ 'onAddedToExamination': {} },
                ...{ 'onClassificationUpdated': {} },
                key: (findingId),
                findingId: (findingId),
                isAddedToExamination: (__VLS_ctx.isFindingAddedToExamination(findingId)),
                patientExaminationId: (__VLS_ctx.lookup?.patientExaminationId || undefined),
            }, ...__VLS_functionalComponentArgsRest(__VLS_39));
            let __VLS_42;
            let __VLS_43;
            let __VLS_44;
            const __VLS_45 = {
                onAddedToExamination: (__VLS_ctx.onFindingAddedToExamination)
            };
            const __VLS_46 = {
                onClassificationUpdated: (__VLS_ctx.onClassificationUpdated)
            };
            var __VLS_41;
        }
    }
    {
        const { issues: __VLS_thisSlot } = __VLS_26.slots;
        if (__VLS_ctx.lookup) {
            /** @type {[typeof RequirementIssues, ]} */ ;
            // @ts-ignore
            const __VLS_47 = __VLS_asFunctionalComponent(RequirementIssues, new RequirementIssues({
                patientExaminationId: (__VLS_ctx.lookup.patientExaminationId || null),
                requirementSetIds: (__VLS_ctx.selectedRequirementSetIds),
                showOnlyUnmet: (true),
            }));
            const __VLS_48 = __VLS_47({
                patientExaminationId: (__VLS_ctx.lookup.patientExaminationId || null),
                requirementSetIds: (__VLS_ctx.selectedRequirementSetIds),
                showOnlyUnmet: (true),
            }, ...__VLS_functionalComponentArgsRest(__VLS_47));
        }
    }
    {
        const { debug: __VLS_thisSlot } = __VLS_26.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "h6 mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        (!!__VLS_ctx.lookup);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        (__VLS_ctx.requirementSets.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
        (JSON.stringify(__VLS_ctx.lookup, null, 2));
    }
    var __VLS_26;
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success alert-dismissible" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.successMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.successMessage))
                    return;
                __VLS_ctx.successMessage = null;
            } },
        type: "button",
        ...{ class: "btn-close" },
    });
}
/** @type {__VLS_StyleScopedClasses['requirement-generator']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['h6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['h6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CaseSetupPanel: CaseSetupPanel,
            FindingsDetail: FindingsDetail,
            AddableFindingsDetail: AddableFindingsDetail,
            RequirementIssues: RequirementIssues,
            RequirementSelectionPanel: RequirementSelectionPanel,
            KnowledgeBaseValidationPanel: KnowledgeBaseValidationPanel,
            isDebug: isDebug,
            selectedPatientId: selectedPatientId,
            selectedExaminationId: selectedExaminationId,
            currentPatientExaminationId: currentPatientExaminationId,
            lookupToken: lookupToken,
            lookup: lookup,
            error: error,
            loading: loading,
            successMessage: successMessage,
            patients: patients,
            isLoadingPatients: isLoadingPatients,
            examinationsDropdown: examinationsDropdown,
            isLoadingExaminations: isLoadingExaminations,
            selectedPatientDisplayName: selectedPatientDisplayName,
            selectedExaminationDisplayName: selectedExaminationDisplayName,
            requirementSets: requirementSets,
            selectedRequirementSetIds: selectedRequirementSetIds,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            availableFindings: availableFindings,
            findingsSectionLoading: findingsSectionLoading,
            candidateRequirementSetIds: candidateRequirementSetIds,
            candidateRequirementSetConfidence: candidateRequirementSetConfidence,
            unmetRequirementCount: unmetRequirementCount,
            suggestedActionEntries: suggestedActionEntries,
            suggestedActionCount: suggestedActionCount,
            nextStepMessage: nextStepMessage,
            isFindingAddedToExamination: isFindingAddedToExamination,
            onFindingAddedToExamination: onFindingAddedToExamination,
            onClassificationUpdated: onClassificationUpdated,
            loadFindingsData: loadFindingsData,
            evaluateRequirementsOnChange: evaluateRequirementsOnChange,
            evaluateRequirementSet: evaluateRequirementSet,
            evaluationSummary: evaluationSummary,
            requirementSetEvaluationMap: requirementSetEvaluationMap,
            createPatientExaminationAndInitLookup: createPatientExaminationAndInitLookup,
            fetchLookupAll: fetchLookupAll,
            toggleRequirementSet: toggleRequirementSet,
            applyRecommendedRequirementSets: applyRecommendedRequirementSets,
            selectAllRequirementSets: selectAllRequirementSets,
            clearRequirementSetSelection: clearRequirementSetSelection,
            triggerRecompute: triggerRecompute,
            resetLookupSession: resetLookupSession,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
