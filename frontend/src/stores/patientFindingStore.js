import { defineStore } from 'pinia';
import { ref, readonly, computed } from 'vue';
import { findingsApi, parseFindingsApiError } from '@/api/findingsApi';
import { usePatientStore } from '@/stores/patientStore';
const usePatientFindingStore = defineStore('patientFinding', () => {
    const patientFindings = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const fetchPatientFindings = async (patientExaminationId) => {
        if (!patientExaminationId) {
            console.warn('fetchPatientFindings wurde ohne patientExaminationId aufgerufen.');
            patientFindings.value = [];
            return;
        }
        try {
            loading.value = true;
            error.value = null;
            const payload = await findingsApi.listPatientFindings(patientExaminationId);
            patientFindings.value = payload;
        }
        catch (err) {
            const parsed = parseFindingsApiError(err);
            error.value = `Fehler beim Laden der Patientenbefunde (${parsed.code}): ${parsed.message}`;
            console.error('Fetch patient findings error:', err);
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
        return patientFindings.value.filter((pf) => pf.patient?.id === currentPatient.id);
    });
    const createPatientFinding = async (patientFindingData) => {
        try {
            loading.value = true;
            error.value = null;
            const newPatientFinding = (await findingsApi.createPatientFinding({
                patientExamination: patientFindingData.patient_examination ?? patientFindingData.patientExamination ?? 0,
                finding: patientFindingData.finding,
                classifications: patientFindingData.classifications || []
            }));
            // Add to local state
            patientFindings.value.push(newPatientFinding);
            return newPatientFinding;
        }
        catch (err) {
            const parsed = parseFindingsApiError(err);
            error.value = `Fehler beim Erstellen des Patientenbefunds (${parsed.code}): ${parsed.message}`;
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
            const updatedFinding = (await findingsApi.updatePatientFinding(id, {
                finding: Number.isFinite(Number(updateData.finding))
                    ? Number(updateData.finding)
                    : undefined,
                isActive: typeof updateData.is_active === 'boolean'
                    ? updateData.is_active
                    : typeof updateData.isActive === 'boolean'
                        ? updateData.isActive
                        : undefined,
                classifications: Array.isArray(updateData.classifications)
                    ? updateData.classifications
                    : undefined
            }));
            // Update local state
            const index = patientFindings.value.findIndex((pf) => pf.id === id);
            if (index !== -1) {
                patientFindings.value[index] = updatedFinding;
            }
            return updatedFinding;
        }
        catch (err) {
            const parsed = parseFindingsApiError(err);
            error.value = `Fehler beim Aktualisieren des Patientenbefunds (${parsed.code}): ${parsed.message}`;
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
            await findingsApi.deletePatientFinding(id);
            // Remove from local state
            patientFindings.value = patientFindings.value.filter((pf) => pf.id !== id);
        }
        catch (err) {
            const parsed = parseFindingsApiError(err);
            error.value = `Fehler beim Löschen des Patientenbefunds (${parsed.code}): ${parsed.message}`;
            console.error('Delete patient finding error:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    };
    return {
        patientFindings: readonly(patientFindings),
        patientFindingsByCurrentPatient,
        loading: readonly(loading),
        error: readonly(error),
        fetchPatientFindings,
        createPatientFinding,
        updatePatientFinding,
        deletePatientFinding
    };
});
export { usePatientFindingStore };
