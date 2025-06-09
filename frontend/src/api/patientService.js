import axiosInstance, { r } from './axiosInstance';
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
            const response = await axiosInstance.post(r('patients/'), patientData);
            return response.data;
        }
        catch (error) {
            console.error('Error adding patient:', error);
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
            const response = await axiosInstance.get(r('gender/')).catch(async () => {
                // Fallback: Standard Gender-Optionen
                return {
                    data: [
                        { id: 1, name: 'female', name_de: 'Weiblich' },
                        { id: 2, name: 'male', name_de: 'Männlich' },
                        { id: 3, name: 'diverse', name_de: 'Divers' }
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
                { id: 1, name: 'female', name_de: 'Weiblich' },
                { id: 2, name: 'male', name_de: 'Männlich' },
                { id: 3, name: 'diverse', name_de: 'Divers' }
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
                        { id: 1, name: 'Hauptzentrum', name_de: 'Hauptzentrum' }
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
                { id: 1, name: 'Hauptzentrum', name_de: 'Hauptzentrum' }
            ];
        }
    },
    // Hilfsmethoden
    formatPatientData(patientForm) {
        const formattedData = {
            first_name: patientForm.first_name,
            last_name: patientForm.last_name,
            dob: patientForm.dob || null,
            gender: patientForm.gender || null,
            center: patientForm.center || null,
            email: patientForm.email || undefined,
            phone: patientForm.phone || undefined,
            patient_hash: patientForm.patient_hash || null
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
        if (!patient.first_name?.trim()) {
            errors.push('Vorname ist erforderlich');
        }
        if (!patient.last_name?.trim()) {
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
    }
};
