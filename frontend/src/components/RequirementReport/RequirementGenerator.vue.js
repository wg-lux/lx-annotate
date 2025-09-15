import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { usePatientStore } from '@/stores/patientStore';
import { useExaminationStore } from '@/stores/examinationStore';
import { useFindingStore } from '@/stores/findingStore';
import { useRequirementStore } from '@/stores/requirementStore';
import { usePatientExaminationStore } from '@/stores/patientExaminationStore';
import PatientAdder from '@/components/CaseGenerator/PatientAdder.vue';
import FindingsDetail from './FindingsDetail.vue';
import AddableFindingsDetail from './AddableFindingsDetail.vue';
// --- Store ---
const patientStore = usePatientStore();
const examinationStore = useExaminationStore();
const findingStore = useFindingStore();
const requirementStore = useRequirementStore();
const patientExaminationStore = usePatientExaminationStore();
// --- API ---
const LOOKUP_BASE = '/api/lookup';
// --- Component State ---
const selectedPatientId = ref(null);
const selectedExaminationId = ref(null);
const currentPatientExaminationId = ref(null);
const lookupToken = ref(null);
const lookup = ref(null);
const error = ref(null);
const loading = ref(false);
const showCreatePatientModal = ref(false);
const successMessage = ref(null);
const isRestarting = ref(false); // Prevent infinite restart loops
// --- Computed from Store ---
const patients = computed(() => {
    const result = patientStore.patientsWithDisplayName;
    console.log('Patients with displayName:', result); // Zum Debuggen
    return result;
});
const isLoadingPatients = computed(() => patientStore.loading);
const examinationsDropdown = computed(() => {
    const result = examinationStore.examinationsDropdown;
    console.log('Examinations dropdown:', result); // Debug: Check available examinations
    return result;
});
const isLoadingExaminations = computed(() => examinationStore.loading);
// --- Computed from Local State ---
const requirementSets = computed(() => {
    const sets = lookup.value?.requirementSets ?? [];
    console.log('Computing requirementSets:', sets); // Debug log
    return sets;
});
const selectedRequirementSetIds = computed({
    get: () => lookup.value?.selectedRequirementSetIds ?? [],
    set: (val) => { if (lookup.value)
        lookup.value.selectedRequirementSetIds = val; }
});
const selectedRequirementSetIdSet = computed(() => new Set(selectedRequirementSetIds.value));
const availableFindings = computed(() => lookup.value?.availableFindings ?? []);
const watchingLookup = ref(false);
watch(lookup, (newVal, oldVal) => {
    if (watchingLookup.value)
        return; // Prevent recursive calls
    watchingLookup.value = true;
    console.log('Lookup changed:', { newVal, oldVal });
    if (newVal && newVal.patientExaminationId !== currentPatientExaminationId.value) {
        currentPatientExaminationId.value = newVal.patientExaminationId;
        console.log('Updated currentPatientExaminationId to:', currentPatientExaminationId.value);
    }
    watchingLookup.value = false;
}, { deep: true });
const watchingRequirementSetIds = ref(false);
watch(selectedRequirementSetIds, (newVal, oldVal) => {
    if (watchingRequirementSetIds.value)
        return; // Prevent recursive calls
    watchingRequirementSetIds.value = true;
    console.log('Selected Requirement Set IDs changed:', { newVal, oldVal });
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
    console.log('Current Examination ID changed:', { newVal, oldVal });
    if (newVal !== oldVal) {
        // Trigger evaluation when examination changes
        patientExaminationStore.setCurrentPatientExaminationId(newVal);
    }
    watchingPatientExaminationIds.value = false;
});
const selectionsPretty = computed(() => JSON.stringify({
    token: lookupToken.value,
    selectedRequirementSetIds: selectedRequirementSetIds.value,
}, null, 2));
// --- Finding Management Methods ---
const isFindingAddedToExamination = (findingId) => {
    if (!lookup.value)
        return false;
    const currentFindingIds = findingStore.getFindingIdsByPatientExaminationId(lookup.value.patientExaminationId);
    if (currentFindingIds.includes(findingId))
        return true;
    return false;
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
        name = findingName || findingStore.getFindingById(findingId)?.name || `Befund ${findingId}`;
    }
    else {
        // New signature: (data: { findingId, findingName?, selectedClassifications, response })
        findingId = findingIdOrData.findingId;
        name = findingIdOrData.findingName || findingStore.getFindingById(findingId)?.name || `Befund ${findingId}`;
        selectedClassifications = findingIdOrData.selectedClassifications || [];
        response = findingIdOrData.response;
    }
    console.log('Finding added to examination:', {
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
    console.log('Classification updated:', { findingId, classificationId, choiceId });
    // Get finding and classification names for better user feedback
    const finding = findingStore.getFindingById(findingId);
    const findingName = finding?.name || `Befund ${findingId}`;
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
    if (findingStore.findings.length === 0) {
        await findingStore.fetchFindings();
    }
};
// --- Requirement Evaluation Methods ---
// Evaluate requirements when findings are added/removed
const evaluateRequirementsOnChange = async () => {
    if (!lookup.value || !lookupToken.value) {
        console.log('Skipping evaluation: lookup or token not available');
        return;
    }
    if (!lookup.value.patientExaminationId) {
        console.log('Skipping evaluation: patientExaminationId not available in lookup', lookup.value);
        return;
    }
    try {
        console.log('Evaluating requirements based on current lookup data...');
        // Use the requirement store to evaluate from lookup data
        await requirementStore.evaluateFromLookupData(lookup.value);
        // Update UI with evaluation results
        console.log('Requirements evaluated successfully');
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
        console.log('Evaluating requirement set:', requirementSetId);
        // Use the requirement store to evaluate specific requirement set
        await requirementStore.evaluateRequirementSet(requirementSetId, lookup.value.patientExaminationId);
        console.log('Requirement set evaluated successfully');
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
// Get evaluation status for a specific requirement
const getRequirementEvaluationStatus = (requirementId) => {
    return requirementStore.getRequirementEvaluationStatus(requirementId);
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
        console.log('Restart already in progress, skipping createPatientExaminationAndInitLookup...');
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
    console.log('Creating PatientExamination with:', {
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
        const formattedBirthDate = selectedPatient.dob
            ? new Date(selectedPatient.dob).toISOString().split('T')[0]
            : null;
        const peRes = await axiosInstance.post('/api/patient-examinations/', {
            patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
            examination: selectedExam.name,
            date_start: formattedDate, // Fixed field name
            // 🎯 NEW: Include patient birth date and gender for age calculation
            patient_birth_date: formattedBirthDate,
            patient_gender: selectedPatient.gender || null,
        });
        patientExaminationStore.addPatientExamination(peRes.data);
        console.log('PatientExamination created:', peRes.data);
        currentPatientExaminationId.value = peRes.data.id;
        // Step 2: Init lookup with the new PatientExamination ID
        const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
            patientExaminationId: currentPatientExaminationId.value
        });
        lookupToken.value = initRes.data.token;
        console.log('Lookup initialized with token:', lookupToken.value);
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
        console.log('Lookup API response:', res.data); // Debug log
        applyLookup(res.data);
    }
    catch (e) {
        // Handle token expiration
        if (e?.response?.status === 404) {
            error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            // Try to automatically restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
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
            error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
            lookupToken.value = null;
            lookup.value = null;
            stopHeartbeat();
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(PATIENT_EXAM_STORAGE_KEY);
            // Try to automatically restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
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
            error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie erneut.';
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
async function triggerRecompute() {
    if (patientStore.currentPatient && patientStore.currentPatient.id !== selectedPatientId.value) {
        console.warn('Selected patient ID does not match patient store name. Reloading...');
        // Reload Token Value to update Requirment Sets etc. to seleccted patient
    }
    if (!lookupToken.value)
        return;
    try {
        console.log('Triggering recomputation for selected requirement sets:', selectedRequirementSetIds.value);
        const res = await axiosInstance.post(`${LOOKUP_BASE}/${lookupToken.value}/recompute/`);
        console.log('Recompute response:', res.data);
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
function closeCreatePatientModal() {
    showCreatePatientModal.value = false;
    // Store-Fehler löschen beim Schließen
    patientStore.clearError();
}
function onPatientCreated(patient) {
    // Patient wurde erfolgreich erstellt - automatisch auswählen
    selectedPatientId.value = patient.id || null;
    // Modal schließen
    showCreatePatientModal.value = false;
    // Store-Fehler löschen (falls vorhanden)
    patientStore.clearError();
    // Erfolgsmeldung anzeigen
    successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich erstellt und ausgewählt!`;
    // Nach 5 Sekunden ausblenden
    setTimeout(() => {
        successMessage.value = null;
    }, 5000);
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
            console.log('Token validation failed with 404, attempting restart...');
            lookupToken.value = null;
            lookup.value = null;
            error.value = 'Lookup-Sitzung ist abgelaufen. Starte neu...';
            // Try to restart the session
            const restarted = await restartLookupSession();
            if (!restarted) {
                error.value = 'Lookup-Sitzung ist abgelaufen. Bitte starten Sie manuell neu.';
            }
            return false;
        }
        return false;
    }
}
async function renewLookupSession() {
    if (!lookupToken.value || !currentPatientExaminationId.value)
        return;
    try {
        // Renew the token by updating it with current data
        const currentData = lookup.value;
        if (currentData) {
            await axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, {
                updates: currentData
            });
        }
    }
    catch (e) {
        console.warn('Failed to renew lookup sitzung:', e);
        // Don't show error to user, just log it
    }
}
function manualRenewSession() {
    if (!lookupToken.value)
        return;
    loading.value = true;
    error.value = null;
    axiosInstance.get(`${LOOKUP_BASE}/${lookupToken.value}/parts/?keys=patientExaminationId`)
        .then(() => {
        return axiosInstance.patch(`${LOOKUP_BASE}/${lookupToken.value}/parts/`, { updates: {} });
    })
        .then(() => {
        fetchLookupAll();
    })
        .catch((e) => {
        error.value = axiosError(e);
        if (e?.response?.status === 404) {
            // Token expired
            lookupToken.value = null;
            lookup.value = null;
            error.value = 'Lookup-Session ist abgelaufen. Bitte starten Sie erneut.';
            stopHeartbeat();
        }
    })
        .finally(() => {
        loading.value = false;
    });
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
    console.log('Resetting session for new patient...');
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
    console.log('Session reset complete for new patient');
}
async function restartLookupSession() {
    if (isRestarting.value) {
        console.log('Restart already in progress, skipping...');
        return false;
    }
    console.log('Attempting to restart lookup session...');
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
            console.log('Reusing existing patient examination:', currentPatientExaminationId.value);
            console.log('selectedPatientId:', selectedPatientId.value);
            console.log('selectedExaminationId:', selectedExaminationId.value);
            const initRes = await axiosInstance.post(`${LOOKUP_BASE}/init/`, {
                patientExaminationId: currentPatientExaminationId.value
            });
            lookupToken.value = initRes.data.token;
            // Start heartbeat for token renewal
            startHeartbeat();
            // Fetch all lookup data
            await fetchLookupAll();
            successMessage.value = 'Lookup-Session wurde erfolgreich neu gestartet!';
            setTimeout(() => {
                successMessage.value = null;
            }, 3000);
            return true;
        }
        else {
            // No existing patient examination, create new one
            console.log('No existing patient examination, creating new one');
            console.log('currentPatientExaminationId:', currentPatientExaminationId.value);
            console.log('selectedPatientId:', selectedPatientId.value);
            console.log('selectedExaminationId:', selectedExaminationId.value);
            if (!selectedPatientId.value || !selectedExaminationId.value) {
                error.value = 'Kann Session nicht automatisch neu starten: Patient oder Untersuchung fehlt.';
                return false;
            }
            await createPatientExaminationAndInitLookup();
            return true;
        }
    }
    catch (e) {
        console.error('Failed to restart lookup session:', e);
        error.value = 'Fehler beim Neustart der Lookup-Session: ' + axiosError(e);
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
// --- Session management ---
const sessionWarningShown = ref(false);
function showSessionExpiryWarning() {
    if (!sessionWarningShown.value && lookupToken.value) {
        error.value = 'Hinweis: Ihre Lookup-Session läuft bald ab. Speichern Sie Ihre Arbeit.';
        sessionWarningShown.value = true;
        // Clear warning after 10 seconds
        setTimeout(() => {
            if (error.value === 'Hinweis: Ihre Lookup-Session läuft bald ab. Speichern Sie Ihre Arbeit.') {
                error.value = null;
            }
            sessionWarningShown.value = false;
        }, 10000);
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
    console.log('Examination selection changed:', {
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
    console.log('Patient selection changed:', {
        oldPatientId,
        newPatientId,
        currentExaminationsCount: examinationsDropdown.value.length
    });
    // Reset examination selection when patient changes
    selectedExaminationId.value = null;
    // If patient actually changed (not just initialized), reset the session
    if (oldPatientId && newPatientId !== oldPatientId) {
        console.log('Patient changed, resetting session for new overview...');
        await resetSessionForNewPatient();
    }
});
// Watch for changes in selected requirement sets to trigger evaluation
watch(selectedRequirementSetIds, async (newIds, oldIds) => {
    if (newIds.length !== oldIds.length && lookup.value) {
        console.log('Requirement set selection changed, triggering evaluation...');
        await evaluateRequirementsOnChange();
    }
}, { deep: true });
// Watch for lookup data changes to trigger evaluation
watch(lookup, async (newLookup, oldLookup) => {
    if (newLookup && newLookup !== oldLookup && selectedRequirementSetIds.value.length > 0) {
        console.log('Lookup data changed, triggering evaluation...');
        // Debounce evaluation to avoid excessive API calls
        setTimeout(() => {
            evaluateRequirementsOnChange();
        }, 1000);
    }
}, { deep: true });
// Watch for lookup data changes to load requirement sets
watch(lookup, (newLookup) => {
    if (newLookup && newLookup.requirementsBySet) {
        console.log('Loading requirement sets from lookup data...');
        requirementStore.loadRequirementSetsFromLookup(newLookup);
    }
}, { immediate: true });
// --- Lifecycle ---
onMounted(async () => {
    console.log('Component mounted, starting data loading...');
    // Patienten und Untersuchungen laden
    await Promise.all([
        patientStore.fetchPatients(),
        examinationStore.fetchExaminations()
    ]);
    console.log('Data loading completed:', {
        patientsCount: patients.value.length,
        examinationsCount: examinationsDropdown.value.length
    });
    // Nachschlagedaten für Patientenerstellung laden
    await patientStore.initializeLookupData();
    // Validate existing token if present (e.g., after page reload)
    if (lookupToken.value) {
        console.log('Validating existing token:', lookupToken.value);
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
});
onUnmounted(() => {
    stopHeartbeat();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['btn-close', 'btn-close', 'btn-close', 'card', 'btn', 'status-indicator', 'status-indicator', 'status-indicator',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("requirement-generator container-fluid py-4") },
    });
    if (__VLS_ctx.patientStore.error || __VLS_ctx.error || __VLS_ctx.examinationStore.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        if (__VLS_ctx.patientStore.error) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.patientStore.error);
        }
        if (__VLS_ctx.examinationStore.error) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.examinationStore.error);
        }
        if (__VLS_ctx.error) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.error);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("h5 mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row align-items-end") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center mb-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("patient-select"),
    });
    if (__VLS_ctx.selectedPatientId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center gap-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.selectedPatientId)))
                        return;
                    __VLS_ctx.patientStore.clearCurrentPatient();
                } },
            type: ("button"),
            ...{ class: ("btn btn-sm btn-outline-secondary") },
            title: ("Patientenauswahl zurücksetzen"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-times") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("patient-select"),
        value: ((__VLS_ctx.selectedPatientId)),
        ...{ class: ("form-control") },
        disabled: ((__VLS_ctx.isLoadingPatients || __VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
        disabled: (true),
    });
    (__VLS_ctx.isLoadingPatients ? 'Lade Patienten...' : 'Bitte wählen Sie einen Patienten');
    for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.patients))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((patient.id)),
            value: ((patient.id)),
        });
        (patient.displayName);
    }
    if (__VLS_ctx.selectedPatientId) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examination-select"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("examination-select"),
        value: ((__VLS_ctx.selectedExaminationId)),
        ...{ class: ("form-control") },
        disabled: ((__VLS_ctx.isLoadingExaminations || !__VLS_ctx.selectedPatientId || __VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: ((null)),
        disabled: (true),
    });
    (__VLS_ctx.isLoadingExaminations ? 'Lade Untersuchungen...' : 'Bitte wählen Sie eine Untersuchung');
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinationsDropdown))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((exam.id)),
            value: ((exam.id)),
        });
        (exam.displayName);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mt-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createPatientExaminationAndInitLookup) },
        ...{ class: ("btn btn-primary") },
        disabled: ((!__VLS_ctx.selectedPatientId || !__VLS_ctx.selectedExaminationId || __VLS_ctx.loading || !!__VLS_ctx.lookupToken)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm") },
            role: ("status"),
            'aria-hidden': ("true"),
        });
    }
    if (!__VLS_ctx.lookupToken) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    if (__VLS_ctx.lookup) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row g-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: ("h6 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lookup.patientExaminationId || 'Nicht verfügbar');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.lookupToken);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.requirementSets.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedRequirementSetIds.join(', ') || 'Keine');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.availableFindings.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 col-xl-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: ("h5 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.lookupToken);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex gap-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.fetchLookupAll) },
            ...{ class: ("btn btn-sm btn-outline-secondary") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.triggerRecompute) },
            ...{ class: ("btn btn-sm btn-outline-info") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.lookupToken)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.manualRenewSession) },
            ...{ class: ("btn btn-sm btn-outline-info") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.lookupToken)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.resetLookupSession) },
            ...{ class: ("btn btn-sm btn-outline-danger") },
            disabled: ((__VLS_ctx.loading || !__VLS_ctx.lookupToken)),
        });
        if (__VLS_ctx.lookup) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row g-3 mt-3 card-body pre-scrollable") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-12") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: ("h5 mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-body") },
            });
            // @ts-ignore
            /** @type { [typeof AddableFindingsDetail, ] } */ ;
            // @ts-ignore
            const __VLS_0 = __VLS_asFunctionalComponent(AddableFindingsDetail, new AddableFindingsDetail({
                ...{ 'onFindingAdded': {} },
                ...{ 'onFindingError': {} },
                examinationId: ((__VLS_ctx.selectedExaminationId || undefined)),
                patientExaminationId: ((__VLS_ctx.currentPatientExaminationId || undefined)),
            }));
            const __VLS_1 = __VLS_0({
                ...{ 'onFindingAdded': {} },
                ...{ 'onFindingError': {} },
                examinationId: ((__VLS_ctx.selectedExaminationId || undefined)),
                patientExaminationId: ((__VLS_ctx.currentPatientExaminationId || undefined)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_0));
            let __VLS_5;
            const __VLS_6 = {
                onFindingAdded: (__VLS_ctx.onFindingAddedToExamination)
            };
            const __VLS_7 = {
                onFindingError: ((errorMsg) => __VLS_ctx.error = errorMsg)
            };
            let __VLS_2;
            let __VLS_3;
            var __VLS_4;
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: ("list-group list-group-flush") },
        });
        for (const [rs] of __VLS_getVForSourceType((__VLS_ctx.requirementSets))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: ((rs.id)),
                ...{ class: ("list-group-item d-flex justify-content-between align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("flex-grow-1") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex justify-content-between align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("fw-semibold") },
            });
            (rs.name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-center gap-2") },
            });
            if (__VLS_ctx.getRequirementSetEvaluationStatus(rs.id)) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge") },
                    ...{ class: ((__VLS_ctx.getRequirementSetEvaluationStatus(rs.id).met ? 'bg-success' : 'bg-warning')) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas") },
                    ...{ class: ((__VLS_ctx.getRequirementSetEvaluationStatus(rs.id).met ? 'fa-check' : 'fa-exclamation-triangle')) },
                });
                (__VLS_ctx.getRequirementSetEvaluationStatus(rs.id).met ? 'Erfüllt' : 'Nicht erfüllt');
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.lookup)))
                            return;
                        __VLS_ctx.evaluateRequirementSet(rs.id);
                    } },
                ...{ class: ("btn btn-sm btn-outline-info") },
                disabled: ((__VLS_ctx.loading)),
                title: ("Anforderungsset evaluieren"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-calculator") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted d-block") },
            });
            (rs.type);
            if (__VLS_ctx.getRequirementSetEvaluationStatus(rs.id)) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mt-2") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
                (__VLS_ctx.getRequirementSetEvaluationStatus(rs.id)?.metRequirementsCount);
                (__VLS_ctx.getRequirementSetEvaluationStatus(rs.id)?.totalRequirementsCount);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("form-check form-switch ms-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!((__VLS_ctx.lookup)))
                            return;
                        __VLS_ctx.toggleRequirementSet(rs.id, $event.target.checked);
                    } },
                ...{ class: ("form-check-input") },
                type: ("checkbox"),
                checked: ((__VLS_ctx.selectedRequirementSetIdSet.has(rs.id))),
            });
        }
        if (!__VLS_ctx.requirementSets.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                ...{ class: ("list-group-item text-muted") },
            });
        }
        if (__VLS_ctx.evaluationSummary && __VLS_ctx.evaluationSummary.totalSets > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3 p-3 bg-light rounded") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mb-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress mb-2") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress-bar") },
                ...{ class: ((__VLS_ctx.evaluationSummary.completionPercentage === 100 ? 'bg-success' : 'bg-info')) },
                ...{ style: (({ width: __VLS_ctx.evaluationSummary.completionPercentage + '%' })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.evaluationSummary.evaluatedSets);
            (__VLS_ctx.evaluationSummary.totalSets);
            (__VLS_ctx.evaluationSummary.completionPercentage);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.evaluateRequirementsOnChange) },
                ...{ class: ("btn btn-sm btn-primary") },
                disabled: ((__VLS_ctx.loading)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-sync") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.lookup) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
            (!!__VLS_ctx.lookup);
            __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
            (__VLS_ctx.requirementSets.length);
            __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
            (JSON.stringify(__VLS_ctx.lookup, null, 2));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12 col-xl-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: ("h5 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted mb-0") },
        });
        if (__VLS_ctx.availableFindings.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-center gap-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.availableFindings.length);
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.lookup)))
                            return;
                        if (!((__VLS_ctx.availableFindings.length > 0)))
                            return;
                        __VLS_ctx.loadFindingsData();
                    } },
                ...{ class: ("btn btn-sm btn-outline-info") },
                disabled: ((__VLS_ctx.loading)),
                title: ("Befunde aktualisieren"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-sync-alt") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body pre-scrollable") },
            ...{ style: ({}) },
        });
        if (__VLS_ctx.findingStore.loading) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("spinner-border") },
                role: ("status"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("visually-hidden") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mt-2 text-muted") },
            });
        }
        else if (__VLS_ctx.availableFindings.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("findings-container") },
            });
            for (const [findingId] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
                // @ts-ignore
                /** @type { [typeof FindingsDetail, ] } */ ;
                // @ts-ignore
                const __VLS_8 = __VLS_asFunctionalComponent(FindingsDetail, new FindingsDetail({
                    ...{ 'onAddedToExamination': {} },
                    ...{ 'onClassificationUpdated': {} },
                    key: ((findingId)),
                    findingId: ((findingId)),
                    isAddedToExamination: ((__VLS_ctx.isFindingAddedToExamination(findingId))),
                    patientExaminationId: ((__VLS_ctx.lookup?.patientExaminationId || undefined)),
                }));
                const __VLS_9 = __VLS_8({
                    ...{ 'onAddedToExamination': {} },
                    ...{ 'onClassificationUpdated': {} },
                    key: ((findingId)),
                    findingId: ((findingId)),
                    isAddedToExamination: ((__VLS_ctx.isFindingAddedToExamination(findingId))),
                    patientExaminationId: ((__VLS_ctx.lookup?.patientExaminationId || undefined)),
                }, ...__VLS_functionalComponentArgsRest(__VLS_8));
                let __VLS_13;
                const __VLS_14 = {
                    onAddedToExamination: (__VLS_ctx.onFindingAddedToExamination)
                };
                const __VLS_15 = {
                    onClassificationUpdated: (__VLS_ctx.onClassificationUpdated)
                };
                let __VLS_10;
                let __VLS_11;
                var __VLS_12;
            }
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-center py-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-info-circle fa-2x text-muted mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
        }
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.successMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.successMessage)))
                        return;
                    __VLS_ctx.successMessage = null;
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.showCreatePatientModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.closeCreatePatientModal) },
            ...{ class: ("modal-overlay") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
            ...{ class: ("modal-dialog") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("modal-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeCreatePatientModal) },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-body") },
        });
        // @ts-ignore
        /** @type { [typeof PatientAdder, ] } */ ;
        // @ts-ignore
        const __VLS_16 = __VLS_asFunctionalComponent(PatientAdder, new PatientAdder({
            ...{ 'onPatientCreated': {} },
            ...{ 'onCancel': {} },
        }));
        const __VLS_17 = __VLS_16({
            ...{ 'onPatientCreated': {} },
            ...{ 'onCancel': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_16));
        let __VLS_21;
        const __VLS_22 = {
            onPatientCreated: (__VLS_ctx.onPatientCreated)
        };
        const __VLS_23 = {
            onCancel: (__VLS_ctx.closeCreatePatientModal)
        };
        let __VLS_18;
        let __VLS_19;
        var __VLS_20;
    }
    ['requirement-generator', 'container-fluid', 'py-4', 'alert', 'alert-danger', 'card', 'mb-3', 'card-header', 'h5', 'mb-0', 'card-body', 'row', 'align-items-end', 'col-md-6', 'form-group', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'd-flex', 'align-items-center', 'gap-2', 'badge', 'bg-info', 'fas', 'fa-user', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-times', 'form-control', 'mt-2', 'text-muted', 'fas', 'fa-info-circle', 'col-md-6', 'form-group', 'form-control', 'row', 'mt-3', 'col-12', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'row', 'g-3', 'col-12', 'card', 'card-header', 'h6', 'mb-0', 'card-body', 'row', 'col-md-4', 'col-md-4', 'col-md-4', 'row', 'mt-2', 'col-md-6', 'col-md-6', 'col-12', 'col-xl-6', 'card', 'h-100', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'h5', 'mb-0', 'text-muted', 'd-flex', 'gap-2', 'btn', 'btn-sm', 'btn-outline-secondary', 'btn', 'btn-sm', 'btn-outline-info', 'btn', 'btn-sm', 'btn-outline-info', 'btn', 'btn-sm', 'btn-outline-danger', 'row', 'g-3', 'mt-3', 'card-body', 'pre-scrollable', 'col-12', 'card', 'card-header', 'h5', 'mb-0', 'card-body', 'list-group', 'list-group-flush', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'flex-grow-1', 'd-flex', 'justify-content-between', 'align-items-center', 'fw-semibold', 'd-flex', 'align-items-center', 'gap-2', 'badge', 'fas', 'btn', 'btn-sm', 'btn-outline-info', 'fas', 'fa-calculator', 'text-muted', 'd-block', 'mt-2', 'text-muted', 'form-check', 'form-switch', 'ms-3', 'form-check-input', 'list-group-item', 'text-muted', 'mt-3', 'p-3', 'bg-light', 'rounded', 'mb-2', 'progress', 'mb-2', 'progress-bar', 'text-muted', 'mt-2', 'btn', 'btn-sm', 'btn-primary', 'fas', 'fa-sync', 'card-body', 'mb-3', 'col-12', 'col-xl-6', 'card', 'h-100', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'h5', 'mb-0', 'text-muted', 'mb-0', 'd-flex', 'align-items-center', 'gap-2', 'text-muted', 'btn', 'btn-sm', 'btn-outline-info', 'fas', 'fa-sync-alt', 'card-body', 'pre-scrollable', 'text-center', 'py-4', 'spinner-border', 'visually-hidden', 'mt-2', 'text-muted', 'findings-container', 'text-center', 'py-4', 'fas', 'fa-info-circle', 'fa-2x', 'text-muted', 'mb-3', 'text-muted', 'text-muted', 'alert', 'alert-success', 'alert-dismissible', 'btn-close', 'modal-overlay', 'modal-dialog', 'modal-content', 'modal-header', 'modal-title', 'btn-close', 'modal-body',];
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
            PatientAdder: PatientAdder,
            FindingsDetail: FindingsDetail,
            AddableFindingsDetail: AddableFindingsDetail,
            patientStore: patientStore,
            examinationStore: examinationStore,
            findingStore: findingStore,
            selectedPatientId: selectedPatientId,
            selectedExaminationId: selectedExaminationId,
            currentPatientExaminationId: currentPatientExaminationId,
            lookupToken: lookupToken,
            lookup: lookup,
            error: error,
            loading: loading,
            showCreatePatientModal: showCreatePatientModal,
            successMessage: successMessage,
            patients: patients,
            isLoadingPatients: isLoadingPatients,
            examinationsDropdown: examinationsDropdown,
            isLoadingExaminations: isLoadingExaminations,
            requirementSets: requirementSets,
            selectedRequirementSetIds: selectedRequirementSetIds,
            selectedRequirementSetIdSet: selectedRequirementSetIdSet,
            availableFindings: availableFindings,
            isFindingAddedToExamination: isFindingAddedToExamination,
            onFindingAddedToExamination: onFindingAddedToExamination,
            onClassificationUpdated: onClassificationUpdated,
            loadFindingsData: loadFindingsData,
            evaluateRequirementsOnChange: evaluateRequirementsOnChange,
            evaluateRequirementSet: evaluateRequirementSet,
            getRequirementSetEvaluationStatus: getRequirementSetEvaluationStatus,
            evaluationSummary: evaluationSummary,
            createPatientExaminationAndInitLookup: createPatientExaminationAndInitLookup,
            fetchLookupAll: fetchLookupAll,
            toggleRequirementSet: toggleRequirementSet,
            triggerRecompute: triggerRecompute,
            closeCreatePatientModal: closeCreatePatientModal,
            onPatientCreated: onPatientCreated,
            manualRenewSession: manualRenewSession,
            resetLookupSession: resetLookupSession,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
