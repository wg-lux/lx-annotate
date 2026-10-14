export interface Gender {
  id: number
  name: string
  nameDe?: string
  nameEn?: string
  abbreviation?: string
  description?: string
}

export interface Center {
  id: number
  centerKey?: string
  name: string
  nameDe?: string
  nameEn?: string
  description?: string
}

export interface Patient {
  id?: number
  firstName: string
  lastName: string
  dob?: string | null
  gender?: string | null
  center?: string | null
  centerKey?: string | null
  email?: string | null
  phone?: string | null
  patientHash?: string | null
  comments?: string
  isRealPerson?: boolean
  pseudonymFirstName?: string | null
  pseudonymLastName?: string | null
  sensitiveMetaId?: number | null
  age?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface PatientFormData {
  id?: number | null
  firstName: string
  lastName: string
  dob: string | null | undefined
  gender: string | null
  center?: string | null
  centerKey?: string | null
  email: string
  phone: string
  patientHash: string
  comments: string
  isRealPerson?: boolean
}

export interface PatientCreateData {
  firstName: string
  lastName: string
  dob?: string | null
  gender?: string | null
  center?: string | null
  centerKey?: string | null
  email?: string
  phone?: string
  patientHash?: string | null
  isRealPerson?: boolean
}

export interface PatientUpdateData extends PatientCreateData {
  id: number
}

export interface PatientListResponse {
  count?: number
  next?: string | null
  previous?: string | null
  results: Patient[]
}
