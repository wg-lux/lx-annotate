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
    const selectedPatientId = ref<number | null>(null)
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
            displayName: `${patient.firstName || ''} ${patient.lastName || ''} (ID: ${patient.id})`.trim()
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
            const response = await axiosInstance.get('/api/genders/')
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

    const getPatientById = (id: number): Patient | undefined => {
        return patients.value.find(patient => patient.id === id);
    };

    const clearError = () => {
        error.value = null;
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
        return gender?.nameDe || gender?.name || genderName
    }

    const getCenterDisplayName = (centerName: string | null | undefined): string => {
        if (!centerName) return 'Kein Zentrum'
        const center = centers.value.find(c => c.name === centerName)
        return center?.nameDe || center?.name || centerName
    }

    const validatePatientForm = (formData: PatientFormData) => {
        const errors: string[] = []

        if (!formData.firstName?.trim()) {
            errors.push('Vorname ist erforderlich')
        }
        if (!formData.lastName?.trim()) {
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
            firstName: formData.firstName?.trim(),
            lastName: formData.lastName?.trim(),
            dob: formData.dob || null,
            gender: formData.gender || null,
            center: formData.center || null,
            email: formData.email?.trim() || '',
            phone: formData.phone?.trim() || '',
            patientHash: formData.patientHash?.trim() || '',
            comments: formData.comments?.trim() || '',
            isRealPerson: formData.isRealPerson ?? true
        }
    }

    const loadGenders = async () => {
        await fetchGenders()
    }

    const loadCenters = async () => {
        await fetchCenters()
    }

    const clearCurrentPatient = () => {
        currentPatient.value = null;
    }

    const getCurrentPatient = (): Patient | null => {
        return currentPatient.value;
    }

    const setSelectedPatientId = (id: number | null) => {
        selectedPatientId.value = id
    }

    const getSelectedPatientId = (): number | null => {
        return selectedPatientId.value
    }

    const clearSelectedPatientId = () => {
        selectedPatientId.value = null
    }

    const setCurrentPatient = (p: Patient | null) => {
        currentPatient.value = p
    }

    // ID RESOLVER (no router deps, minimal)
    const resolveCurrentPatientId = (propId?: number, strict = true): number | null => {
        const id =
            (propId && propId > 0 ? propId : null) ??
            (currentPatient.value?.id && currentPatient.value.id > 0 ? currentPatient.value.id : null) ??
            (selectedPatientId.value && selectedPatientId.value > 0 ? selectedPatientId.value : null)

        if (strict && !id) {
            throw new Error('Kein Patient ausgewählt – patientId konnte nicht ermittelt werden.')
        }
        return id
    }

    return {
        // State
        patients,
        currentPatient,
        selectedPatientId,
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
        getPatientById,
        calculatePatientAge,
        getGenderDisplayName,
        getCenterDisplayName,
        validatePatientForm,
        formatPatientForSubmission,
        clearCurrentPatient,
        getCurrentPatient,
        setSelectedPatientId,
        getSelectedPatientId,
        clearSelectedPatientId,
        setCurrentPatient,
        resolveCurrentPatientId,
    }
})
