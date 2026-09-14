import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Patient, PatientFormData, Gender, Center } from '@/types/patient'
import axiosInstance, { r } from '@/api/axiosInstance'
import axios from 'axios'
import { endpoints } from '@/types/api/endpoints'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('patient-store')

// Re-export types for easier access
export type { Patient, PatientFormData, Gender, Center } from '@/types/patient'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === 'number'
}

function isOptionalNullableNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number'
}

const patientFieldValidators: Array<{
  key: keyof Patient
  accepts: (value: unknown) => boolean
}> = [
  { key: 'firstName', accepts: (value) => typeof value === 'string' },
  { key: 'lastName', accepts: (value) => typeof value === 'string' },
  { key: 'id', accepts: isOptionalNumber },
  { key: 'dob', accepts: isOptionalNullableString },
  { key: 'gender', accepts: isOptionalNullableString },
  { key: 'center', accepts: isOptionalNullableString },
  { key: 'centerKey', accepts: isOptionalNullableString },
  { key: 'email', accepts: isOptionalNullableString },
  { key: 'phone', accepts: isOptionalNullableString },
  { key: 'patientHash', accepts: isOptionalNullableString },
  { key: 'comments', accepts: isOptionalString },
  { key: 'isRealPerson', accepts: (value) => value === undefined || typeof value === 'boolean' },
  { key: 'pseudonymFirstName', accepts: isOptionalNullableString },
  { key: 'pseudonymLastName', accepts: isOptionalNullableString },
  { key: 'sensitiveMetaId', accepts: isOptionalNullableNumber },
  { key: 'age', accepts: isOptionalNullableNumber },
  { key: 'createdAt', accepts: isOptionalString },
  { key: 'updatedAt', accepts: isOptionalString }
]

function isPatient(value: unknown): value is Patient {
  return isRecord(value) && patientFieldValidators.every((rule) => rule.accepts(value[rule.key]))
}

function centerForSubmission(formData: PatientFormData): string | null {
  return formData.centerKey ? null : formData.center || null
}

function firstPositivePatientId(...candidates: Array<number | null | undefined>): number | null {
  return (
    candidates.find(
      (candidate) => candidate !== undefined && candidate !== null && candidate > 0
    ) ?? null
  )
}

function isGender(value: unknown): value is Gender {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    isOptionalString(value.nameDe) &&
    isOptionalString(value.nameEn) &&
    isOptionalString(value.abbreviation) &&
    isOptionalString(value.description)
  )
}

function isCenter(value: unknown): value is Center {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    isOptionalString(value.centerKey) &&
    isOptionalString(value.nameDe) &&
    isOptionalString(value.nameEn) &&
    isOptionalString(value.description)
  )
}

function requireList<T>(
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
  contractName: string
): T[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.results)
      ? value.results
      : null
  if (!rows || !rows.every((row: unknown) => guard(row))) {
    throw new TypeError(`${contractName} response does not match the expected contract`)
  }
  return rows.filter((row: unknown): row is T => guard(row))
}

function requirePatient(value: unknown): Patient {
  if (!isPatient(value)) {
    throw new TypeError('Patient response does not match the expected contract')
  }
  return value
}

export const usePatientStore = defineStore('patient', () => {
  const apiErrorDetail = (caught: unknown): string | null => {
    if (axios.isAxiosError<{ detail?: string }>(caught)) {
      const response = caught.response
      return response ? response.data.detail || caught.message : caught.message
    }
    return caught instanceof Error ? caught.message : null
  }
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
    return patients.value.map((patient) => ({
      ...patient,
      age: patient.dob ? calculatePatientAge(patient.dob) : null
    }))
  })

  const patientsWithDisplayName = computed(() => {
    return patients.value.map((patient) => ({
      ...patient,
      displayName:
        `${patient.firstName || ''} ${patient.lastName || ''} (ID: ${String(patient.id)})`.trim()
    }))
  })

  // Actions
  const fetchPatients = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axiosInstance.get<unknown>(r(endpoints.patient.patients))
      patients.value = requireList(response.data, isPatient, 'Patient list')
    } catch (err: unknown) {
      error.value =
        'Fehler beim Laden der Patienten: ' + (apiErrorDetail(err) || 'Unbekannter Fehler')
      logger.error('patient-list-load-failed', err, {
        operation: 'list',
        outcome: 'rejected'
      })
    } finally {
      loading.value = false
    }
  }

  const fetchGenders = async () => {
    try {
      const response = await axiosInstance.get<unknown>(r(endpoints.patient.genders))
      genders.value = requireList(response.data, isGender, 'Gender list')
    } catch (err: unknown) {
      logger.error('gender-list-load-failed', err, {
        operation: 'list',
        outcome: 'rejected'
      })
      error.value = 'Fehler beim Laden der Geschlechter'
    }
  }

  const fetchCenters = async () => {
    try {
      const response = await axiosInstance.get<unknown>(r(endpoints.patient.centers))
      centers.value = requireList(response.data, isCenter, 'Center list')
    } catch (err: unknown) {
      logger.error('center-list-load-failed', err, {
        operation: 'list',
        outcome: 'rejected'
      })
      error.value = 'Fehler beim Laden der Zentren'
    }
  }

  const initializeLookupData = async () => {
    await Promise.all([fetchGenders(), fetchCenters()])
  }

  const createPatient = async (patientData: PatientFormData) => {
    try {
      loading.value = true
      error.value = null
      const response = await axiosInstance.post<unknown>(r(endpoints.patient.patients), patientData)
      const newPatient = requirePatient(response.data)
      patients.value.push(newPatient)
      return newPatient
    } catch (err: unknown) {
      error.value = apiErrorDetail(err) || 'Fehler beim Erstellen des Patienten'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePatient = async (id: number, patientData: PatientFormData) => {
    try {
      loading.value = true
      error.value = null
      const response = await axiosInstance.put<unknown>(
        r(endpoints.patient.patientById(id)),
        patientData
      )
      const updatedPatient = requirePatient(response.data)
      const index = patients.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        patients.value[index] = updatedPatient
      }
      return updatedPatient
    } catch (err: unknown) {
      error.value = apiErrorDetail(err) || 'Fehler beim Aktualisieren des Patienten'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePatient = async (id: number) => {
    try {
      loading.value = true
      error.value = null
      await axiosInstance.delete(r(endpoints.patient.patientById(id)))
      patients.value = patients.value.filter((p) => p.id !== id)
    } catch (err: unknown) {
      error.value = apiErrorDetail(err) || 'Fehler beim Löschen des Patienten'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPatientById = (id: number): Patient | undefined => {
    return patients.value.find((patient) => patient.id === id)
  }

  const clearError = () => {
    error.value = null
  }

  // Helper functions
  const calculatePatientAge = (dobString: string): number | null => {
    if (!dobString) return null
    try {
      const birthDate = new Date(dobString)
      const today = new Date()
      let patientAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--
      }
      return patientAge
    } catch {
      return null
    }
  }

  const getGenderDisplayName = (genderName: string | null | undefined): string => {
    if (!genderName) return 'Unbekannt'
    const gender = genders.value.find((g) => g.name === genderName)
    return gender?.nameDe || gender?.name || genderName
  }

  const getCenterDisplayName = (centerIdentifier: string | null | undefined): string => {
    if (!centerIdentifier) return 'Kein Zentrum'
    const center = centers.value.find(
      (c) => c.name === centerIdentifier || c.centerKey === centerIdentifier
    )
    return center?.nameDe || center?.name || centerIdentifier
  }

  const validatePatientForm = (formData: PatientFormData) => {
    const errors: string[] = []

    if (!formData.firstName.trim()) {
      errors.push('Vorname ist erforderlich')
    }
    if (!formData.lastName.trim()) {
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
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      center: centerForSubmission(formData),
      centerKey: formData.centerKey || null,
      email: formData.email.trim() || '',
      phone: formData.phone.trim() || '',
      patientHash: formData.patientHash.trim() || '',
      comments: formData.comments.trim() || '',
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
    currentPatient.value = null
  }

  const getCurrentPatient = (): Patient | null => {
    return currentPatient.value
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
    const patientId = firstPositivePatientId(
      propId,
      currentPatient.value?.id,
      selectedPatientId.value
    )

    if (strict && !patientId) {
      throw new Error('Kein Patient ausgewählt – patientId konnte nicht ermittelt werden.')
    }
    return patientId
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
    resolveCurrentPatientId
  }
})
