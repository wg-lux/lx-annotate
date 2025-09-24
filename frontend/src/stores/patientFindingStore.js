import { defineStore } from "pinia";
import axiosInstance from "@/api/axiosInstance";
import { ref, readonly, computed } from "vue";
import { usePatientStore } from "@/stores/patientStore";
const usePatientFindingStore = defineStore('patientFinding', () => {
    const patientFindings = ref([]);
    const patientFindingClassifications = ref(new Map());
    const loading = ref(false);
    const error = ref(null);
    const byPatientExamination = ref(new Map());
    const currentPatientExaminationId = ref(null);
    const setCurrentPatientExaminationId = (id) => {
        currentPatientExaminationId.value = id;
    };
    const fetchPatientFindings = async (patientExaminationId) => {
        if (!patientExaminationId) {
            console.warn('fetchPatientFindings wurde ohne patientExaminationId aufgerufen.');
            patientFindings.value = [];
            return;
        }
        try {
            loading.value = true;
            error.value = null;
            console.log('🔄 [PatientFindingStore] Fetching patient findings for PE:', patientExaminationId);
            // FIRST: Get PatientFindings from the original endpoint
            const patientFindingsResponse = await axiosInstance.get('/api/patient-findings/', {
                params: { patient_examination: patientExaminationId }
            });
            console.log('📥 [PatientFindingStore] PatientFindings API Response:', patientFindingsResponse.data);
            // SECOND: Get Findings with classifications from the findings endpoint
            const findingsResponse = await axiosInstance.get('/api/findings/', {
                params: { patient_examination: patientExaminationId }
            });
            console.log('� [PatientFindingStore] Findings API Response:', findingsResponse.data);
            // 🔧 MERGE: Combine data from both endpoints
            const rawPatientFindings = patientFindingsResponse.data.results || patientFindingsResponse.data;
            const findingsWithClassifications = findingsResponse.data.results || findingsResponse.data;
            // Map findings with classifications by finding ID for quick lookup
            const findingClassificationMap = new Map();
            findingsWithClassifications.forEach((finding) => {
                findingClassificationMap.set(finding.id, finding.classifications || []);
            });
            // Enhance PatientFindings with classification data
            const enhancedPatientFindings = rawPatientFindings.map((pf) => {
                const findingId = typeof pf.finding === 'object' ? pf.finding?.id : pf.finding;
                const defClassifications = findingClassificationMap.get(findingId) || [];
                console.log(`🔧 [PatientFindingStore] Enhancing PatientFinding ${pf.id} with ${defClassifications.length} definition classifications`);
                console.log(`🔧 [PatientFindingStore] PatientFinding ${pf.id} has ${pf.classifications?.length || 0} patient classifications`);
                // 🛡️ DEFENSE: Check for invalid classifications in API response
                if (pf.classifications && Array.isArray(pf.classifications)) {
                    const invalidClassifications = pf.classifications.filter((cls) => !cls.classification || !cls.classification_choice);
                    if (invalidClassifications.length > 0) {
                        console.error('🚨 [PatientFindingStore] API returned invalid classifications:', {
                            patientFindingId: pf.id,
                            findingId: findingId,
                            totalClassifications: pf.classifications.length,
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
                }
                return {
                    ...pf,
                    available_classifications: defClassifications, // Keep separate - definitions only
                    // DO NOT touch pf.classifications (patient-side stays as returned by /api/patient-findings/)
                };
            });
            // 🐛 PRÜFE: Sind die Finding-Objekte vollständig?
            enhancedPatientFindings.forEach((pf, index) => {
                console.log(`🔍 [PatientFindingStore] Enhanced PatientFinding ${index}:`, {
                    id: pf.id,
                    finding: pf.finding,
                    findingId: typeof pf.finding === 'object' ? pf.finding?.id : pf.finding,
                    findingName: typeof pf.finding === 'object' ? (pf.finding?.name || pf.finding?.nameDe) : 'ID only',
                    findingType: typeof pf.finding,
                    classificationsCount: pf.classifications?.length || 0
                });
            });
            patientFindings.value = enhancedPatientFindings;
            byPatientExamination.value.set(patientExaminationId, enhancedPatientFindings);
            console.log('✅ [PatientFindingStore] Stored enhanced patient findings:', enhancedPatientFindings.length);
        }
        catch (err) {
            console.error('❌ [PatientFindingStore] Error fetching patient findings:', err);
            error.value = 'Fehler beim Laden der Patientenbefunde: ' + (err.response?.data?.detail || err.message);
        }
        finally {
            loading.value = false;
        }
    };
    const patientFindingsByCurrentPatient = computed(() => {
        const patientStore = usePatientStore();
        const currentPatient = patientStore.getCurrentPatient();
        if (!currentPatient) {
            return [];
        }
        return patientFindings.value.filter(pf => pf.patient.id === currentPatient.id);
    });
    const createPatientFinding = async (patientFindingData) => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.post('/api/patient-findings/', patientFindingData);
            const newPatientFinding = response.data;
            // Add Findings to local state in BOTH locations
            patientFindings.value.push(newPatientFinding);
            patientFindingClassifications.value.set(newPatientFinding.id, newPatientFinding.classifications || []);
            // CRITICAL: Also add to byPatientExamination map for computed property access
            const patientExaminationId = patientFindingData.patientExamination;
            const existingForExamination = byPatientExamination.value.get(patientExaminationId) || [];
            byPatientExamination.value.set(patientExaminationId, [...existingForExamination, newPatientFinding]);
            console.log('New finding created', newPatientFinding);
            console.log(`🔧 [PatientFindingStore] Added to byPatientExamination[${patientExaminationId}], total count: ${byPatientExamination.value.get(patientExaminationId)?.length || 0}`);
            console.log(`🔧 [PatientFindingStore] Current examination ID: ${currentPatientExaminationId.value}`);
            console.log(`🔧 [PatientFindingStore] Computed patientFindings should now show: ${patientExaminationId === currentPatientExaminationId.value ? 'YES' : 'NO - ID MISMATCH'}`);
            console.log(`🔧 [PatientFindingStore] patientFindings.value length: ${patientFindings.value.length}`);
            return newPatientFinding;
        }
        catch (err) {
            error.value = 'Fehler beim Erstellen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Create patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const updatePatientFinding = async (id, updateData) => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.patch(`/api/patient-findings/${id}/`, updateData);
            const updatedFinding = response.data;
            // Update local state in BOTH locations
            const index = patientFindings.value.findIndex(pf => pf.id === id);
            if (index !== -1) {
                patientFindings.value[index] = updatedFinding;
            }
            patientFindingClassifications.value.set(updatedFinding.id, updatedFinding.classifications || []);
            // CRITICAL: Also update in byPatientExamination map
            for (const [examinationId, findings] of byPatientExamination.value.entries()) {
                const findingIndex = findings.findIndex(pf => pf.id === id);
                if (findingIndex !== -1) {
                    const updatedFindings = [...findings];
                    updatedFindings[findingIndex] = updatedFinding;
                    byPatientExamination.value.set(examinationId, updatedFindings);
                }
            }
            console.log('Finding updated', updatedFinding);
            return updatedFinding;
        }
        catch (err) {
            error.value = 'Fehler beim Aktualisieren des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Update patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const deletePatientFinding = async (id) => {
        try {
            loading.value = true;
            error.value = null;
            await axiosInstance.delete(`/api/patient-findings/${id}/`);
            // Remove from local state in BOTH locations
            patientFindings.value = patientFindings.value.filter(pf => pf.id !== id);
            // CRITICAL: Also remove from byPatientExamination map
            for (const [examinationId, findings] of byPatientExamination.value.entries()) {
                const filteredFindings = findings.filter(pf => pf.id !== id);
                if (filteredFindings.length !== findings.length) {
                    byPatientExamination.value.set(examinationId, filteredFindings);
                }
            }
        }
        catch (err) {
            error.value = 'Fehler beim Löschen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Delete patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    const currentPatientFindings = computed(() => {
        const id = currentPatientExaminationId.value;
        return id ? (byPatientExamination.value.get(id) ?? []) : [];
    });
    const getByPatientExamination = (id) => byPatientExamination.value.get(id) ?? [];
    return {
        patientFindings: readonly(currentPatientFindings),
        patientFindingsByCurrentPatient,
        loading: readonly(loading),
        error: readonly(error),
        currentPatientExaminationId: readonly(currentPatientExaminationId),
        setCurrentPatientExaminationId,
        fetchPatientFindings,
        createPatientFinding,
        updatePatientFinding,
        deletePatientFinding,
    };
});
export { usePatientFindingStore };
