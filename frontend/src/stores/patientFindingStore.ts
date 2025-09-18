import {defineStore} from "pinia";
import axiosInstance from "@/api/axiosInstance";
import {ref, readonly, computed} from "vue";
import type { Finding, FindingClassification, FindingClassificationChoice } from "@/stores/findingStore";
import type { Patient } from "@/stores/patientStore";

import { usePatientStore } from "@/stores/patientStore";
import type { PatientExamination } from '@/stores/patientExaminationStore';

interface PatientFinding {
    id: number;
    examination: string;
    createdAt: number;
    updatedAt: string;
    createdBy?: string; // ISO date string
    updatedBy?: string;
    finding: Finding;
    patient: Patient;
    classifications?: PatientFindingClassification[];
}

interface PatientFindingClassification {
    id: number;
    finding: number; // PatientFinding ID
    classification: FindingClassification;
    classification_choice: FindingClassificationChoice;
    is_active: boolean;
    subcategories?: Record<string, any>;
    numerical_descriptors?: Record<string, any>;
}

const usePatientFindingStore = defineStore('patientFinding', () => {
    const patientFindings = ref<PatientFinding[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const byPatientExamination = ref(new Map<number, PatientFinding[]>());
    const currentPatientExaminationId = ref<number | null>(null);

    const setCurrentPatientExaminationId = (id: number | null) => {
    currentPatientExaminationId.value = id;
    };

    const fetchPatientFindings = async (patientExaminationId: number) => {
        if (!patientExaminationId) {
            console.warn('fetchPatientFindings wurde ohne patientExaminationId aufgerufen.');
            patientFindings.value = [];
            return;
        }
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.get('/api/patient-findings/', {
                params: { patient_examination: patientExaminationId }
            });
            patientFindings.value = response.data.results || response.data;
            const rows = response.data.results || response.data;
            byPatientExamination.value.set(patientExaminationId, rows);
        } 
        catch (err: any) {
            error.value = 'Fehler beim Laden der Patientenbefunde: ' + (err.response?.data?.detail || err.message);
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
        return patientFindings.value.filter(pf => pf.patient.id === currentPatient.id);
    });

    const createPatientFinding = async (patientFindingData: {
        patientExamination: number;
        finding: number;
        classifications?: Array<{
            classification: number;
            choice: number;
        }>;
    }): Promise<PatientFinding> => {
        try {
            loading.value = true;
            error.value = null;

            const response = await axiosInstance.post('/api/patient-findings/', patientFindingData);
            const newPatientFinding = response.data as PatientFinding;
            
            // Add to local state
            patientFindings.value.push(newPatientFinding);
            console.log('New finding created', newPatientFinding)
            
            return newPatientFinding;
        } catch (err: any) {
            error.value = 'Fehler beim Erstellen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Create patient finding error:', err);
            throw err;
        } finally {
            loading.value = false; 
        }
    };

    const updatePatientFinding = async (id: number, updateData: Partial<PatientFinding>): Promise<PatientFinding> => {
        try {
            loading.value = true;
            error.value = null;
            const response = await axiosInstance.patch(`/api/patient-findings/${id}/`, updateData);
            const updatedFinding = response.data as PatientFinding;
            
            // Update local state
            const index = patientFindings.value.findIndex(pf => pf.id === id);
            if (index !== -1) {
                patientFindings.value[index] = updatedFinding;
            }
            
            return updatedFinding;
        } catch (err: any) {
            error.value = 'Fehler beim Aktualisieren des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Update patient finding error:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const deletePatientFinding = async (id: number): Promise<void> => {
        try {
            loading.value = true;
            error.value = null;
            await axiosInstance.delete(`/api/patient-findings/${id}/`);
            
            // Remove from local state
            patientFindings.value = patientFindings.value.filter(pf => pf.id !== id);
        } catch (err: any) {
            error.value = 'Fehler beim Löschen des Patientenbefunds: ' + (err.response?.data?.detail || err.message);
            console.error('Delete patient finding error:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };
    const currentPatientFindings = computed(() => {
    const id = currentPatientExaminationId.value;
    return id ? (byPatientExamination.value.get(id) ?? []) : [];
    });

    const getByPatientExamination = (id: number) =>
    byPatientExamination.value.get(id) ?? [];

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