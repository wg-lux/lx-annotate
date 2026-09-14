import type { PatientFormData } from '@/api/patientService'

export function createPatientForm(): PatientFormData {
  return {
    id: null,
    firstName: '',
    lastName: '',
    dob: null,
    email: '',
    phone: '',
    gender: null,
    center: null,
    centerKey: null,
    patientHash: '',
    comments: '',
    isRealPerson: true
  }
}

export function validatePatientForm(form: PatientFormData, today = new Date()) {
  const errors: Partial<Record<'firstName' | 'lastName' | 'dob' | 'email', string>> = {}
  if (!form.firstName.trim()) errors.firstName = 'Vorname ist erforderlich'
  if (!form.lastName.trim()) errors.lastName = 'Nachname ist erforderlich'
  if (form.dob && new Date(form.dob) > today) {
    errors.dob = 'Geburtsdatum kann nicht in der Zukunft liegen'
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Ungültige E-Mail-Adresse'
  }
  return errors
}
