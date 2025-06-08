import axiosInstance, { r } from './axiosInstance';
// --- SensitiveMeta API Service ---
export class SensitiveMetaService {
    /**
     * Fetch sensitive meta data for videos
     */
    static async fetchVideoSensitiveMeta(options = {}) {
        const { patientId, lastId } = options;
        let url = r('video/sensitivemeta/');
        const params = new URLSearchParams();
        if (patientId) {
            params.append('patient_id', patientId.toString());
        }
        else if (lastId) {
            params.append('last_id', lastId.toString());
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        const response = await axiosInstance.get(url);
        return response.data;
    }
    /**
     * Fetch sensitive meta data for PDFs
     */
    static async fetchPdfSensitiveMeta(options = {}) {
        const { patientId, lastId } = options;
        let url = r('pdf/sensitivemeta/');
        const params = new URLSearchParams();
        if (patientId) {
            params.append('patient_id', patientId.toString());
        }
        else if (lastId) {
            params.append('last_id', lastId.toString());
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        const response = await axiosInstance.get(url);
        return response.data;
    }
    /**
     * Update video sensitive meta data
     */
    static async updateVideoSensitiveMeta(updateData) {
        const url = r('video/update_sensitivemeta/');
        const response = await axiosInstance.patch(url, updateData);
        return response.data;
    }
    /**
     * Update PDF sensitive meta data
     */
    static async updatePdfSensitiveMeta(updateData) {
        const url = r('pdf/update_sensitivemeta/');
        const response = await axiosInstance.patch(url, updateData);
        return response.data;
    }
    /**
     * Generic fetch method that works with both video and PDF
     */
    static async fetchSensitiveMeta(mediaType, options = {}) {
        if (mediaType === 'video') {
            return this.fetchVideoSensitiveMeta(options);
        }
        else {
            return this.fetchPdfSensitiveMeta(options);
        }
    }
    /**
     * Generic update method that works with both video and PDF
     */
    static async updateSensitiveMeta(mediaType, updateData) {
        if (mediaType === 'video') {
            return this.updateVideoSensitiveMeta(updateData);
        }
        else {
            return this.updatePdfSensitiveMeta(updateData);
        }
    }
    /**
     * Validate sensitive meta data before sending to backend
     */
    static validateSensitiveMetaData(data) {
        const errors = {};
        if (data.patient_first_name !== undefined && !data.patient_first_name?.trim()) {
            errors.patient_first_name = 'Vorname ist erforderlich';
        }
        if (data.patient_last_name !== undefined && !data.patient_last_name?.trim()) {
            errors.patient_last_name = 'Nachname ist erforderlich';
        }
        if (data.patient_dob !== undefined && !data.patient_dob) {
            errors.patient_dob = 'Geburtsdatum ist erforderlich';
        }
        // Validate date format
        if (data.patient_dob) {
            const date = new Date(data.patient_dob);
            if (isNaN(date.getTime())) {
                errors.patient_dob = 'Ungültiges Datumsformat';
            }
            else if (date > new Date()) {
                errors.patient_dob = 'Geburtsdatum kann nicht in der Zukunft liegen';
            }
        }
        if (data.examination_date) {
            const examDate = new Date(data.examination_date);
            if (isNaN(examDate.getTime())) {
                errors.examination_date = 'Ungültiges Datumsformat';
            }
        }
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    /**
     * Utility method to format hash values for display
     */
    static formatHash(hash) {
        if (!hash)
            return 'Nicht verfügbar';
        return `...${hash.slice(-8)}`;
    }
    /**
     * Utility method to format duration for video display
     */
    static formatDuration(duration) {
        if (!duration)
            return 'Unbekannt';
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} min`;
    }
    /**
     * Utility method to format examiner names
     */
    static formatExaminers(examiners) {
        if (!examiners || examiners.length === 0)
            return 'Nicht angegeben';
        return examiners.join(', ');
    }
    /**
     * Check if sensitive meta data is complete/verified
     */
    static isDataVerified(data) {
        return !!(data.patient_first_name?.trim() &&
            data.patient_last_name?.trim() &&
            data.patient_dob &&
            data.examination_date);
    }
}
export default SensitiveMetaService;
