import { defineStore } from 'pinia'
import type { AxiosInstance } from 'axios';
import { ref } from 'vue'
export interface Patient {
    first_name: string;
    name: string;
    dob: string;
    email: string;
    phone: string;
    is_real_person: boolean;
    gender_id: number;
    center_id: number;
}

export interface PatientExamination {
    date_start: string;
    date_stop: string;
    examination_id: number;
    patient_id: number;
    report_file_id: number;
    video_file_id: number;
}

export interface PatientFinding {
    date_start: string;
    date_stop: string;
    examination_id: number;
    patient_id: number;
    report_file_id: number;
    video_file_id: number;
}

export const usePatientStore = defineStore('patient', () => {
    // State
    const patients = ref<Patient[]>([])
    const currentPatient = ref<Patient | null>(null)
    const patientExaminations = ref<PatientExamination[]>([])
    const patientFindings = ref<PatientFinding[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Actions
    const fetchPatients = async () => {
        try {
            loading.value = true
            error.value = null
            
            // Simulate API call
            // Replace with actual API call to fetch patients
            patients.value = [] // Fetch from API

        } catch (err) {
            error.value = 'Failed to fetch patients'
        } finally {
            loading.value = false
        }
    }

    return {
        patients,
        currentPatient,
        patientExaminations,
        patientFindings,
        loading,
        error,
        fetchPatients
    }
})