var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { defineStore } from 'pinia';
import { reactive, ref, computed, readonly } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
// --- Store ---
export const useExaminationStore = defineStore('examination', () => {
    // State
    const examinations = ref([]);
    const findings = ref([]);
    const locationClassifications = ref([]);
    const morphologyClassifications = ref([]);
    // Current form state
    const selectedExaminationId = ref(null);
    const selectedFindingId = ref(null);
    const currentPatientFinding = ref(null);
    const patientId = ref(null); // Neu: für Patient-spezifische Untersuchungen
    // Loading states
    const loading = ref(false);
    const error = ref(null);
    // Computed values
    const selectedExamination = computed(() => examinations.value.find(e => e.id === selectedExaminationId.value));
    const selectedFinding = computed(() => findings.value.find(f => f.id === selectedFindingId.value));
    // Get findings available for the selected examination
    const availableFindings = computed(() => {
        if (!selectedExaminationId.value)
            return [];
        // Filter findings that are applicable to the selected examination
        return findings.value.filter(finding => {
            // This would need to be based on examination-finding relationships from the API
            // For now, return all findings - this should be improved with proper API endpoints
            return true;
        });
    });
    const availableLocationClassifications = computed(() => {
        if (!selectedFinding.value)
            return [];
        return [
            ...(selectedFinding.value.requiredLocationClassifications || []),
            ...(selectedFinding.value.optionalLocationClassifications || [])
        ];
    });
    const availableMorphologyClassifications = computed(() => {
        if (!selectedFinding.value)
            return [];
        return [
            ...(selectedFinding.value.requiredMorphologyClassifications || []),
            ...(selectedFinding.value.optionalMorphologyClassifications || [])
        ];
    });
    // Actions
    async function loadExaminations() {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get(r('examinations/'));
            examinations.value = response.data || [];
            console.log('Loaded examinations from store:', examinations.value);
        }
        catch (err) {
            console.error('Error loading examinations:', err);
            error.value = 'Fehler beim Laden der Untersuchungen';
        }
        finally {
            loading.value = false;
        }
    }
    async function loadExaminationFindings(examinationId) {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get(r(`examinations/${examinationId}/findings/`));
            // Update the findings for this specific examination
            const examinationFindings = response.data || [];
            // Replace findings with examination-specific ones
            findings.value = examinationFindings;
            console.log(`Loaded ${examinationFindings.length} findings for examination ${examinationId}`);
            return examinationFindings;
        }
        catch (err) {
            console.error('Error loading examination findings:', err);
            error.value = 'Fehler beim Laden der Befunde';
            return [];
        }
        finally {
            loading.value = false;
        }
    }
    async function loadFindingClassifications(findingId) {
        try {
            loading.value = true;
            error.value = null;
            // Load both location and morphology classifications for the specific finding
            const [locationResponse, morphologyResponse] = await Promise.all([
                axiosInstance.get(r(`findings/${findingId}/location-classifications/`)),
                axiosInstance.get(r(`findings/${findingId}/morphology-classifications/`))
            ]);
            // Process location classifications - load choices for each
            const locationClassificationsWithChoices = [];
            for (const locationClass of locationResponse.data || []) {
                try {
                    const choicesResponse = await axiosInstance.get(r(`location-classifications/${locationClass.id}/choices/`));
                    locationClassificationsWithChoices.push({
                        ...locationClass,
                        choices: choicesResponse.data || []
                    });
                }
                catch (err) {
                    console.warn(`Failed to load choices for location classification ${locationClass.id}:`, err);
                    locationClassificationsWithChoices.push({
                        ...locationClass,
                        choices: []
                    });
                }
            }
            // Process morphology classifications - load choices for each
            const morphologyClassificationsWithChoices = [];
            for (const morphologyClass of morphologyResponse.data || []) {
                try {
                    const choicesResponse = await axiosInstance.get(r(`morphology-classifications/${morphologyClass.id}/choices/`));
                    morphologyClassificationsWithChoices.push({
                        ...morphologyClass,
                        choices: choicesResponse.data || []
                    });
                }
                catch (err) {
                    console.warn(`Failed to load choices for morphology classification ${morphologyClass.id}:`, err);
                    morphologyClassificationsWithChoices.push({
                        ...morphologyClass,
                        choices: []
                    });
                }
            }
            // Update the selected finding with its classifications
            const findingIndex = findings.value.findIndex(f => f.id === findingId);
            if (findingIndex !== -1) {
                findings.value[findingIndex] = {
                    ...findings.value[findingIndex],
                    requiredLocationClassifications: locationClassificationsWithChoices.filter(c => c.required),
                    optionalLocationClassifications: locationClassificationsWithChoices.filter(c => !c.required),
                    requiredMorphologyClassifications: morphologyClassificationsWithChoices.filter(c => c.required),
                    optionalMorphologyClassifications: morphologyClassificationsWithChoices.filter(c => !c.required)
                };
            }
            console.log(`Loaded classifications for finding ${findingId}:`, {
                locationClassifications: locationClassificationsWithChoices.length,
                morphologyClassifications: morphologyClassificationsWithChoices.length
            });
            return {
                locationClassifications: locationClassificationsWithChoices,
                morphologyClassifications: morphologyClassificationsWithChoices
            };
        }
        catch (err) {
            console.error('Error loading finding classifications:', err);
            error.value = 'Fehler beim Laden der Klassifikationen';
            return {
                locationClassifications: [],
                morphologyClassifications: []
            };
        }
        finally {
            loading.value = false;
        }
    }
    async function loadFindings() {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get(r('findings/'));
            findings.value = response.data || [];
        }
        catch (err) {
            console.error('Error loading findings:', err);
            error.value = 'Fehler beim Laden der Befunde';
        }
        finally {
            loading.value = false;
        }
    }
    async function loadClassifications() {
        try {
            loading.value = true;
            error.value = null;
            const [locationResponse, morphologyResponse] = await Promise.all([
                axiosInstance.get(r('location-classifications/')),
                axiosInstance.get(r('morphology-classifications/'))
            ]);
            locationClassifications.value = locationResponse.data || [];
            morphologyClassifications.value = morphologyResponse.data || [];
        }
        catch (err) {
            console.error('Error loading classifications:', err);
            error.value = 'Fehler beim Laden der Klassifikationen';
        }
        finally {
            loading.value = false;
        }
    }
    function setSelectedExamination(examinationId) {
        selectedExaminationId.value = examinationId;
        // Reset finding selection when examination changes
        selectedFindingId.value = null;
        currentPatientFinding.value = null;
        // Load findings for the selected examination
        loadExaminationFindings(examinationId);
    }
    function setSelectedFinding(findingId) {
        selectedFindingId.value = findingId;
        // Initialize new patient finding data
        currentPatientFinding.value = {
            findingId,
            selectedLocationChoices: [],
            selectedMorphologyChoices: []
        };
        // Load classifications for the selected finding
        loadFindingClassifications(findingId);
    }
    function updateLocationChoices(choiceIds) {
        if (currentPatientFinding.value) {
            currentPatientFinding.value.selectedLocationChoices = [...choiceIds];
        }
    }
    function updateMorphologyChoices(choiceIds) {
        if (currentPatientFinding.value) {
            currentPatientFinding.value.selectedMorphologyChoices = [...choiceIds];
        }
    }
    function updateNotes(newNotes) {
        if (currentPatientFinding.value) {
            currentPatientFinding.value.notes = newNotes;
        }
    }
    async function savePatientFinding(videoId, timestamp, patientId) {
        if (!currentPatientFinding.value)
            return null;
        try {
            loading.value = true;
            error.value = null;
            // Create PatientFinding first - use patientId if provided, otherwise videoId
            const patientFindingData = {
                patient_id: patientId || videoId, // Bevorzuge patientId über videoId
                finding_id: currentPatientFinding.value.findingId,
                examination_id: selectedExaminationId.value,
                timestamp: timestamp,
                notes: currentPatientFinding.value.notes,
                date_start: new Date().toISOString(),
                date_stop: new Date().toISOString()
            };
            console.log('Speichere PatientFinding:', patientFindingData);
            const patientFindingResponse = await axiosInstance.post(r('patient-findings/'), patientFindingData);
            const patientFindingId = patientFindingResponse.data.id;
            // Save location classifications
            for (const choiceId of currentPatientFinding.value.selectedLocationChoices) {
                await axiosInstance.post(r('patient-finding-locations/'), {
                    patient_finding_id: patientFindingId,
                    location_classification_choice_id: choiceId
                });
            }
            // Save morphology classifications
            for (const choiceId of currentPatientFinding.value.selectedMorphologyChoices) {
                await axiosInstance.post(r('patient-finding-morphologies/'), {
                    patient_finding_id: patientFindingId,
                    morphology_classification_choice_id: choiceId
                });
            }
            console.log('Untersuchung erfolgreich gespeichert:', patientFindingResponse.data);
            // Reset form after successful save
            currentPatientFinding.value = null;
            selectedFindingId.value = null;
            return patientFindingResponse.data;
        }
        catch (err) {
            console.error('Error saving patient finding:', err);
            error.value = 'Fehler beim Speichern der Untersuchung';
            throw err;
        }
        finally {
            loading.value = false;
        }
    }
    function resetForm() {
        selectedExaminationId.value = null;
        selectedFindingId.value = null;
        currentPatientFinding.value = null;
        error.value = null;
    }
    // Neue Methoden für Patient-Funktionalität
    function setPatientId(newPatientId) {
        patientId.value = newPatientId;
    }
    function setError(errorMessage) {
        error.value = errorMessage;
    }
    // Alias für loadExaminationFindings - für bessere API-Kompatibilität
    async function loadFindingsForExamination(examinationId) {
        return await loadExaminationFindings(examinationId);
    }
    // Validation helpers
    function validateRequiredClassifications() {
        const errors = [];
        if (!selectedFinding.value || !currentPatientFinding.value) {
            return errors;
        }
        // Check required location classifications
        const requiredLocationClassifications = selectedFinding.value.requiredLocationClassifications || [];
        for (const classification of requiredLocationClassifications) {
            const hasChoice = classification.choices.some(choice => currentPatientFinding.value.selectedLocationChoices.includes(choice.id));
            if (!hasChoice) {
                errors.push(`Bitte wählen Sie eine Option für ${classification.name}`);
            }
        }
        // Check required morphology classifications
        const requiredMorphologyClassifications = selectedFinding.value.requiredMorphologyClassifications || [];
        for (const classification of requiredMorphologyClassifications) {
            const hasChoice = classification.choices.some(choice => currentPatientFinding.value.selectedMorphologyChoices.includes(choice.id));
            if (!hasChoice) {
                errors.push(`Bitte wählen Sie eine Option für ${classification.name}`);
            }
        }
        return errors;
    }
    return {
        // State
        examinations: readonly(examinations),
        findings: readonly(findings),
        availableFindings,
        locationClassifications: readonly(locationClassifications),
        morphologyClassifications: readonly(morphologyClassifications),
        selectedExaminationId: readonly(selectedExaminationId),
        selectedFindingId: readonly(selectedFindingId),
        currentPatientFinding: readonly(currentPatientFinding),
        loading: readonly(loading),
        error: readonly(error),
        // Computed
        selectedExamination,
        selectedFinding,
        availableLocationClassifications,
        availableMorphologyClassifications,
        // Actions
        loadExaminations,
        loadExaminationFindings,
        loadFindingClassifications,
        loadFindings,
        loadClassifications,
        setSelectedExamination,
        setSelectedFinding,
        updateLocationChoices,
        updateMorphologyChoices,
        updateNotes,
        savePatientFinding,
        resetForm,
        validateRequiredClassifications,
        setPatientId,
        setError,
        loadFindingsForExamination
    };
});
