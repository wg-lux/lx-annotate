import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Patient, PatientFormData, Gender, Center } from '@/api/patientService'
import axiosInstance from '@/api/axiosInstance'

// Re-export types for easier access
export type { Patient, PatientFormData, Gender, Center } from '@/api/patientService'

export const usePatientStore = defineStore('patient', () => {
    // State
    const patients = ref<Patient[]>([])
    const currentPatient = ref<Patient | null>(null)
    const genders = ref<Gender[]>([])
    const centers = ref<Center[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Computed
    const patientCount = computed(() => patients.value.length)
    
    const patientsWithAge = computed(() => {
        return patients.value.map(patient => ({
            ...patient,
            age: patient.dob ? calculatePatientAge(patient.dob) : null
        }))
    })

    const patientsWithDisplayName = computed(() => {
        return patients.value.map(patient => ({
            ...patient,
            display_name: `${patient.first_name || ''} ${patient.last_name || ''} (ID: ${patient.id})`.trim()
        }));
    });

    // Actions
    const fetchPatients = async () => {
        try {
            loading.value = true
            error.value = null
            const response = await axiosInstance.get('/api/patients/')
            patients.value = response.data.results || response.data
        } catch (err: any) {
            error.value = 'Fehler beim Laden der Patienten: ' + (err.response?.data?.detail || err.message)
            console.error('Fetch patients error:', err)
        } finally {
            loading.value = false
        }
    }

    const fetchGenders = async () => {
        try {
            const response = await axiosInstance.get('/api/gender/')
            genders.value = response.data.results || response.data
        } catch (err: any) {
            console.error('Fetch genders error:', err)
            error.value = 'Fehler beim Laden der Geschlechter'
        }
    }

    const fetchCenters = async () => {
        try {
            const response = await axiosInstance.get('/api/centers/')
            centers.value = response.data.results || response.data
        } catch (err: any) {
            console.error('Fetch centers error:', err)
            error.value = 'Fehler beim Laden der Zentren'
        }
    }

    const initializeLookupData = async () => {
        await Promise.all([
            fetchGenders(),
            fetchCenters()
        ])
    }

    const createPatient = async (patientData: PatientFormData) => {
        try {
            loading.value = true
            error.value = null
            const response = await axiosInstance.post('/api/patients/', patientData)
            const newPatient = response.data
            patients.value.push(newPatient)
            return newPatient
        } catch (err: any) {
            error.value = err.response?.data?.detail || 'Fehler beim Erstellen des Patienten'
            throw err
        } finally {
            loading.value = false
        }
    }

    const updatePatient = async (id: number, patientData: PatientFormData) => {
        try {
            loading.value = true
            error.value = null
            const response = await axiosInstance.put(`/api/patients/${id}/`, patientData)
            const updatedPatient = response.data
            const index = patients.value.findIndex(p => p.id === id)
            if (index !== -1) {
                patients.value[index] = updatedPatient
            }
            return updatedPatient
        } catch (err: any) {
            error.value = err.response?.data?.detail || 'Fehler beim Aktualisieren des Patienten'
            throw err
        } finally {
            loading.value = false
        }
    }

    const deletePatient = async (id: number) => {
        try {
            loading.value = true
            error.value = null
            await axiosInstance.delete(`/api/patients/${id}/`)
            patients.value = patients.value.filter(p => p.id !== id)
        } catch (err: any) {
            error.value = err.response?.data?.detail || 'Fehler beim Löschen des Patienten'
            throw err
        } finally {
            loading.value = false
        }
    }

    const clearError = () => {
        error.value = null
    }

    // Helper functions
    const calculatePatientAge = (dobString: string): number | null => {
        if (!dobString) return null
        try {
            const dob = new Date(dobString)
            const today = new Date()
            let age = today.getFullYear() - dob.getFullYear()
            const monthDiff = today.getMonth() - dob.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--
            }
            return age
        } catch {
            return null
        }
    }

    const getGenderDisplayName = (genderName: string | null | undefined): string => {
        if (!genderName) return 'Unbekannt'
        const gender = genders.value.find(g => g.name === genderName)
        return gender?.name_de || gender?.name || genderName
    }

    const getCenterDisplayName = (centerName: string | null | undefined): string => {
        if (!centerName) return 'Kein Zentrum'
        const center = centers.value.find(c => c.name === centerName)
        return center?.name_de || center?.name || centerName
    }

    const validatePatientForm = (formData: PatientFormData) => {
        const errors: string[] = []

        if (!formData.first_name?.trim()) {
            errors.push('Vorname ist erforderlich')
        }
        if (!formData.last_name?.trim()) {
            errors.push('Nachname ist erforderlich')
        }
        if (formData.dob && new Date(formData.dob) > new Date()) {
            errors.push('Geburtsdatum kann nicht in der Zukunft liegen')
        }
        if (formData.email && !formData.email.includes('@')) {
            errors.push('Ungültige E-Mail-Adresse')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    const formatPatientForSubmission = (formData: PatientFormData): PatientFormData => {
        return {
            id: formData.id,
            first_name: formData.first_name?.trim(),
            last_name: formData.last_name?.trim(),
            dob: formData.dob || null,
            gender: formData.gender || null,
            center: formData.center || null,
            email: formData.email?.trim() || '',
            phone: formData.phone?.trim() || '',
            patient_hash: formData.patient_hash?.trim() || '',
            comments: formData.comments?.trim() || '',
            is_real_person: formData.is_real_person ?? true
        }
    }

    const loadGenders = async () => {
        await fetchGenders()
    }

    const loadCenters = async () => {
        await fetchCenters()
    }

    return {
        // State
        patients,
        currentPatient,
        genders,
        centers,
        loading,
        error,
        
        // Computed
        patientCount,
        patientsWithAge,
        patientsWithDisplayName,
        
        // Actions
        fetchPatients,
        fetchGenders,
        fetchCenters,
        loadGenders,
        loadCenters,
        initializeLookupData,
        createPatient,
        updatePatient,
        deletePatient,
        clearError,
        calculatePatientAge,
        getGenderDisplayName,
        getCenterDisplayName,
        validatePatientForm,
        formatPatientForSubmission
    }
})
