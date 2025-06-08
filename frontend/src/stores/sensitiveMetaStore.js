import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
// --- Store ---
export const useSensitiveMetaStore = defineStore('sensitiveMeta', () => {
    // State
    const currentMetaData = ref(null);
    const metaDataCache = ref(new Map());
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const lastFetchedId = ref(null);
    const successMessage = ref(null);
    // Computed
    const isCurrentDataVerified = computed(() => {
        if (!currentMetaData.value)
            return false;
        return !!(currentMetaData.value.patient_first_name?.trim() &&
            currentMetaData.value.patient_last_name?.trim() &&
            currentMetaData.value.patient_dob &&
            currentMetaData.value.examination_date);
    });
    const totalCachedRecords = computed(() => metaDataCache.value.size);
    // Actions
    async function fetchSensitiveMetaData(options = {}) {
        loading.value = true;
        error.value = null;
        try {
            const { patientId, lastId, mediaType = 'video' } = options;
            let url = r(`${mediaType}/sensitivemeta/`);
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
            if (response.data) {
                const metaData = response.data;
                // Update current data
                currentMetaData.value = metaData;
                lastFetchedId.value = metaData.id;
                // Cache the data
                metaDataCache.value.set(metaData.id, metaData);
                return metaData;
            }
            return null;
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Fehler beim Laden der Patientendaten';
            error.value = errorMessage;
            console.error('Error fetching sensitive meta data:', err);
            throw new Error(errorMessage);
        }
        finally {
            loading.value = false;
        }
    }
    async function updateSensitiveMetaData(updateData, mediaType = 'video') {
        if (!currentMetaData.value) {
            throw new Error('Keine aktuellen Daten zum Aktualisieren vorhanden');
        }
        saving.value = true;
        error.value = null;
        successMessage.value = null;
        try {
            const url = r(`${mediaType}/update_sensitivemeta/`);
            const response = await axiosInstance.patch(url, updateData);
            if (response.data?.updated_data) {
                const updatedData = response.data.updated_data;
                // Update current data
                currentMetaData.value = updatedData;
                // Update cache
                metaDataCache.value.set(updatedData.id, updatedData);
                // Set success message
                successMessage.value = response.data.message || 'Daten erfolgreich gespeichert!';
                // Clear success message after 3 seconds
                setTimeout(() => {
                    successMessage.value = null;
                }, 3000);
                return updatedData;
            }
            throw new Error('Keine aktualisierten Daten in der Antwort erhalten');
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Fehler beim Speichern der Daten';
            error.value = errorMessage;
            console.error('Error updating sensitive meta data:', err);
            throw err;
        }
        finally {
            saving.value = false;
        }
    }
    async function fetchNextPatient(mediaType = 'video') {
        const currentId = lastFetchedId.value || currentMetaData.value?.id;
        return fetchSensitiveMetaData({
            lastId: currentId || undefined,
            mediaType
        });
    }
    function getCachedMetaData(id) {
        return metaDataCache.value.get(id) || null;
    }
    function clearCurrentData() {
        currentMetaData.value = null;
        error.value = null;
        successMessage.value = null;
    }
    function clearCache() {
        metaDataCache.value.clear();
    }
    function clearError() {
        error.value = null;
    }
    function clearSuccessMessage() {
        successMessage.value = null;
    }
    // Utility function to validate required fields
    function validateMetaData(data) {
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
    // Search functionality
    function searchCachedData(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!term)
            return Array.from(metaDataCache.value.values());
        return Array.from(metaDataCache.value.values()).filter(data => data.patient_first_name?.toLowerCase().includes(term) ||
            data.patient_last_name?.toLowerCase().includes(term) ||
            data.patient_hash?.toLowerCase().includes(term) ||
            data.id.toString().includes(term));
    }
    return {
        // State
        currentMetaData,
        metaDataCache,
        loading,
        saving,
        error,
        lastFetchedId,
        successMessage,
        // Computed
        isCurrentDataVerified,
        totalCachedRecords,
        // Actions
        fetchSensitiveMetaData,
        updateSensitiveMetaData,
        fetchNextPatient,
        getCachedMetaData,
        clearCurrentData,
        clearCache,
        clearError,
        clearSuccessMessage,
        validateMetaData,
        searchCachedData
    };
});
