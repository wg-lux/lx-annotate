import {defineStore} from 'pinia';
import axios from 'axios';
import {useAnonymizationStore} from "@/stores/anonymizationStore";
import axiosInstance, {r} from "@/api/axiosInstance";
import {ref } from 'vue';

export interface Case {
    id: number; // Added id property to match usage in the code
    patient_first_name: string;
    patient_last_name: string;
    patient_dob: string;
    imageAnnotations: [];
    videoAnnotations: [];
    anonymizationAnnotations: [];
    anonymizationStatus: string;
}

export interface Risk {
    coronaryStent: CoronaryStent[];
    valveReplacement: ValveReplacement[];
    thromboembolicEvent: ThromboembolicEvent[];
    atrialFibrillation: AtrialFibrillation[];
    diabetes: Diabetes[];
    hypertension: Hypertension[];
    stroke: Stroke[];
}

export interface PlateletInhibitionMonoMedication {
    id: number;
    name: string;
    category: string;
    indications: string[];
}

export interface PlateletInhibitionDualMedication {
    id: number;
    name: string;
    category: string;
    indications: string[];
}

export interface AnticoagulationMedication {
    id: number;
    name: string;
    category: string;
    indications: string[];
}
export interface MedicationInterface {
    plateletInhibitionMonoMedications: PlateletInhibitionMonoMedication[];
    plateletInhibitionDualMedications: PlateletInhibitionDualMedication[];
    anticoagulationMedications: AnticoagulationMedication[];
}

export interface CoronaryStent {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    drugEluted: boolean;
    older6Weeks: boolean;
    older12Months: boolean;
}

export interface ValveReplacement {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    type: ValveReplacementType [];
    location: ValveReplacementLocations [];
    possibleAnticoagulation: AnticoagulantIndication [];
}

export interface ValveReplacementType {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    id: number;
    artificial: boolean;
    biological: boolean;
}

export interface ValveReplacementLocations {
    aortic: boolean;
    mitral: boolean;
    tricuspid: boolean;
    pulmonary: boolean;
}

export interface AnticoagulantIndication {
    risk: Risk[];
    anticoagulationMedication: AnticoagulationMedication[];
}

export interface ThromboembolicEvent {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    pulmonary: boolean;
    older3Months: boolean;
    older6Months: boolean;
    older12Months: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}

export interface AtrialFibrillation {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    congestiveHeartFailure: boolean;
    hypertension: boolean;
    ageOlder75: boolean;
    diabetes: boolean;
    stroke: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}

export interface Diabetes {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    type: DiabetesType[];
}

export interface DiabetesType {
    type: string;
    insulin: boolean;
}

export interface Hypertension {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    type: HypertensionType[];
}
export interface HypertensionType {
    type: string;
    older3Months: boolean;
    older6Months: boolean;
    older12Months: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}
export interface Stroke {
    dateDiagnosis: Date;
    diagnosisEnded: Date;
    ischemic: boolean;
    hemorrhagic: boolean;
    older3Months: boolean;
    older6Months: boolean;
    older12Months: boolean;
    possibleAnticoagulation: AnticoagulantIndication[];
}

export const useCasesStore = defineStore('cases', () => {
    const cases = ref<Case[]>([]);
    const risk = ref<Risk[]>([]);
    const medications = ref<MedicationInterface[]>([]);
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const anonymizationStore = useAnonymizationStore();

    async function fetchCases(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get('/cases');
            cases.value = response.data;
        } catch (err) {
            error.value = 'Error fetching cases';
        } finally {
            loading.value = false;
        }
    }
    async function fetchRisk(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get('/risk');
            risk.value = response.data;
        } catch (err) {
            error.value = 'Error fetching risk';
        } finally {
            loading.value = false;
        }
    }
    async function fetchMedications(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get('/medications');
            medications.value = response.data;
        } catch (err) {
            error.value = 'Error fetching medications';
        } finally {
            loading.value = false;
        }
    }
    async function anonymizeCase(caseId: number): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.post(`/cases/${caseId}/anonymize`);
            anonymizationStore.addAnonymization(response.data);
        } catch (err) {
            error.value = 'Error anonymizing case';
        } finally {
            loading.value = false;
        }
    }
    async function deleteCase(caseId: number): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            await axiosInstance.delete(`/cases/${caseId}`);
            cases.value = cases.value.filter((c) => c.id !== caseId);
        } catch (err) {
            error.value = 'Error deleting case';
        } finally {
            loading.value = false;
        }
    }
    async function updateCase(caseId: number, updatedCase: Case): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.put(`/cases/${caseId}`, updatedCase);
            const index = cases.value.findIndex((c) => c.id === caseId);
            if (index !== -1) {
                cases.value[index] = response.data;
            }
        } catch (err) {
            error.value = 'Error updating case';
        } finally {
            loading.value = false;
        }
    }
    async function addCase(newCase: Case): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.post('/cases', newCase);
            cases.value.push(response.data);
        } catch (err) {
            error.value = 'Error adding case';
        } finally {
            loading.value = false;
        }
    }
    async function fetchCaseById(caseId: number): Promise<Case | null> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases/${caseId}`);
            return response.data;
        } catch (err) {
            error.value = 'Error fetching case';
            return null;
        } finally {
            loading.value = false;
        }
    }
    async function fetchCaseByPatientName(patientName: string): Promise<Case[] | null> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases?patient_name=${patientName}`);
            return response.data;
        } catch (err) {
            error.value = 'Error fetching case';
            return null;
        } finally {
            loading.value = false;
        }
    }
    async function fetchCaseByDateOfBirth(dob: string): Promise<Case[] | null> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases?dob=${dob}`);
            return response.data;
        } catch (err) {
            error.value = 'Error fetching case';
            return null;
        } finally {
            loading.value = false;
        }
    }
    async function fetchCaseByAnonymizationStatus(status: string): Promise<Case[] | null> {
        loading.value = true;
        error.value = null;
        try {
            const response = await axiosInstance.get(`/cases?anonymization_status=${status}`);
            return response.data;
        } catch (err) {
            error.value = 'Error fetching case';
            return null;
        } finally {
            loading.value = false;
        }
    }
})