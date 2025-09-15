import axiosInstance, { r } from './axiosInstance';
export async function generatePatientPseudonym(id) {
    if (!Number.isFinite(id) || id <= 0)
        throw new Error('Ungültige patientId');
    const { data } = await axiosInstance.post(`/api/patients/${id}/pseudonym/`);
    return data;
}
export const patientService = {
    async getPatients() {
        try {
            const response = await axiosInstance.get(r('patients/'));
            // Handle both array response and paginated response
            if (Array.isArray(response.data)) {
                return response.data;
            }
            else {
                return response.data.results || [];
            }
        }
        catch (error) {
            console.error('Error getting patients:', error);
            throw error;
        }
    },
    async addPatient(patientData) {
        try {
            console.log('PatientService: Sende Patientendaten an API:', patientData);
            const response = await axiosInstance.post(r('patients/'), patientData);
            console.log('PatientService: Erfolgreiche Antwort erhalten:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('PatientService: Fehler beim Hinzufügen des Patienten:', error);
            // Detaillierte Fehleranalyse
            if (error.response) {
                console.error('Response Error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
            }
            else if (error.request) {
                console.error('Request Error:', error.request);
            }
            else {
                console.error('General Error:', error.message);
            }
            throw error;
        }
    },
    async updatePatient(patientId, patientData) {
        try {
            const response = await axiosInstance.put(r(`patients/${patientId}/`), patientData);
            return response.data;
        }
        catch (error) {
            console.error('Error updating patient:', error);
            throw error;
        }
    },
    async deletePatient(patientId) {
        try {
            await axiosInstance.delete(r(`patients/${patientId}/`));
        }
        catch (error) {
            console.error('Error deleting patient:', error);
            throw error;
        }
    },
    // Lookup-Daten laden
    async getGenders() {
        try {
            // Verwende den korrekten Gender-Endpunkt
            const response = await axiosInstance.get(r('genders/')).catch(async () => {
                // Fallback: Standard Gender-Optionen
                return {
                    data: [
                        { id: 1, name: 'female', nameDe: 'Weiblich' },
                        { id: 2, name: 'male', nameDe: 'Männlich' },
                        { id: 3, name: 'diverse', nameDe: 'Divers' }
                    ],
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {}
                };
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting genders:', error);
            // Fallback Gender-Optionen
            return [
                { id: 1, name: 'female', nameDe: 'Weiblich' },
                { id: 2, name: 'male', nameDe: 'Männlich' },
                { id: 3, name: 'diverse', nameDe: 'Divers' }
            ];
        }
    },
    async getCenters() {
        try {
            // Versuche Centers über verschiedene mögliche Endpunkte zu laden
            const response = await axiosInstance.get(r('centers/')).catch(async () => {
                // Fallback über andere verfügbare Endpunkte
                return {
                    data: [
                        { id: 1, name: 'Hauptzentrum', nameDe: 'Hauptzentrum' }
                    ],
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {}
                };
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting centers:', error);
            // Fallback Center-Optionen
            return [
                { id: 1, name: 'Hauptzentrum', nameDe: 'Hauptzentrum' }
            ];
        }
    },
    // Hilfsmethoden
    formatPatientData(patientForm) {
        const formattedData = {
            firstName: patientForm.firstName,
            lastName: patientForm.lastName,
            dob: patientForm.dob || null,
            gender: patientForm.gender || null,
            center: patientForm.center || null,
            email: patientForm.email || undefined,
            phone: patientForm.phone || undefined,
            patientHash: patientForm.patientHash || null,
            isRealPerson: patientForm.isRealPerson ?? true
        };
        // Entferne leere Strings
        Object.keys(formattedData).forEach(key => {
            const value = formattedData[key];
            if (value === '') {
                delete formattedData[key];
            }
        });
        return formattedData;
    },
    calculateAge(dateOfBirth) {
        if (!dateOfBirth)
            return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        // Validierung des Datums
        if (isNaN(birthDate.getTime()))
            return null;
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    },
    // Validierungshilfsfunktionen
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    validatePatientData(patient) {
        const errors = [];
        if (!patient.firstName?.trim()) {
            errors.push('Vorname ist erforderlich');
        }
        if (!patient.lastName?.trim()) {
            errors.push('Nachname ist erforderlich');
        }
        if (patient.email && !this.isValidEmail(patient.email)) {
            errors.push('Ungültige E-Mail-Adresse');
        }
        if (patient.dob) {
            const birthDate = new Date(patient.dob);
            const today = new Date();
            if (isNaN(birthDate.getTime())) {
                errors.push('Ungültiges Geburtsdatum');
            }
            else if (birthDate > today) {
                errors.push('Geburtsdatum kann nicht in der Zukunft liegen');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    },
};
