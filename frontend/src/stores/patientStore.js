import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
import { AxiosError } from 'axios';
export const usePatientStore = defineStore('patient', () => {
    // --- State ---
    const patients = ref([]);
    const currentPatient = ref(null);
    const patientCache = ref(new Map());
    const searchFilters = ref({});
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const lastFetchedId = ref(null);
    const totalPatients = ref(0);
    const currentPage = ref(1);
    const pageSize = ref(20);
    // --- Computed Properties ---
    const isCurrentPatientAnnotated = computed(() => {
        return currentPatient.value?.sensitive_meta ?
            !!(currentPatient.value.sensitive_meta.patient_first_name?.trim() &&
                currentPatient.value.sensitive_meta.patient_last_name?.trim() &&
                currentPatient.value.sensitive_meta.patient_dob &&
                currentPatient.value.sensitive_meta.examination_date) :
            false;
    });
    const filteredPatients = computed(() => {
        if (!searchFilters.value || Object.keys(searchFilters.value).length === 0) {
            return patients.value;
        }
        return patients.value.filter(patient => {
            if (searchFilters.value.name) {
                const searchTerm = searchFilters.value.name.toLowerCase();
                const fullName = `${patient.first_name} ${patient.name}`.toLowerCase();
                if (!fullName.includes(searchTerm))
                    return false;
            }
            if (searchFilters.value.dob && patient.dob !== searchFilters.value.dob) {
                return false;
            }
            if (searchFilters.value.center && patient.center !== searchFilters.value.center) {
                return false;
            }
            return true;
        });
    });
    const paginatedPatients = computed(() => {
        const startIndex = (currentPage.value - 1) * pageSize.value;
        const endIndex = startIndex + pageSize.value;
        return filteredPatients.value.slice(startIndex, endIndex);
    });
    const totalPages = computed(() => {
        return Math.ceil(filteredPatients.value.length / pageSize.value);
    });
    // --- Actions ---
    async function fetchPatients(filters) {
        loading.value = true;
        error.value = null;
        try {
            let url = r('patients/');
            const params = new URLSearchParams();
            if (filters) {
                Object.assign(searchFilters.value, filters);
                if (filters.name)
                    params.append('name', filters.name);
                if (filters.dob)
                    params.append('dob', filters.dob);
                if (filters.center)
                    params.append('center', filters.center);
                if (filters.status && filters.status !== 'all')
                    params.append('status', filters.status);
                if (filters.has_videos !== undefined)
                    params.append('has_videos', filters.has_videos.toString());
                if (filters.has_reports !== undefined)
                    params.append('has_reports', filters.has_reports.toString());
                if (filters.date_range) {
                    params.append('date_start', filters.date_range.start);
                    params.append('date_end', filters.date_range.end);
                }
            }
            params.append('page', currentPage.value.toString());
            params.append('page_size', pageSize.value.toString());
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            const response = await axiosInstance.get(url);
            patients.value = response.data.results || response.data;
            totalPatients.value = response.data.count || patients.value.length;
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Fehler beim Laden der Patienten';
            error.value = errorMessage;
            console.error('Error fetching patients:', err);
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchPatientWithMedia(patientId) {
        // Check cache first
        if (patientCache.value.has(patientId)) {
            const cached = patientCache.value.get(patientId);
            currentPatient.value = cached;
            return cached;
        }
        loading.value = true;
        error.value = null;
        try {
            // Fetch patient, videos, reports, and examinations in parallel
            const [patientRes, videosRes, reportsRes, examinationsRes] = await Promise.all([
                axiosInstance.get(r(`patients/${patientId}/`)),
                axiosInstance.get(r(`patients/${patientId}/videos/`)),
                axiosInstance.get(r(`patients/${patientId}/reports/`)),
                axiosInstance.get(r(`patients/${patientId}/examinations/`))
            ]);
            // Try to fetch sensitive meta data if available
            let sensitiveMetaRes = null;
            try {
                sensitiveMetaRes = await axiosInstance.get(r(`patients/${patientId}/sensitive-meta/`));
            }
            catch (err) {
                console.warn('No sensitive meta data available for patient:', patientId);
            }
            const patientWithMedia = {
                patient: patientRes.data,
                videos: videosRes.data || [],
                reports: reportsRes.data || [],
                examinations: examinationsRes.data || [],
                sensitive_meta: sensitiveMetaRes?.data || null,
                last_updated: new Date().toISOString()
            };
            // Cache the result
            patientCache.value.set(patientId, patientWithMedia);
            currentPatient.value = patientWithMedia;
            lastFetchedId.value = patientId;
            return patientWithMedia;
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Fehler beim Laden der Patientendaten';
            error.value = errorMessage;
            console.error('Error fetching patient with media:', err);
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function updatePatientSensitiveMeta(patientId, updateData, mediaType = 'video') {
        saving.value = true;
        error.value = null;
        try {
            const url = r(`${mediaType}/update_sensitivemeta/`);
            const payload = {
                sensitive_meta_id: updateData.id,
                patient_first_name: updateData.patient_first_name,
                patient_last_name: updateData.patient_last_name,
                patient_dob: updateData.patient_dob,
                examination_date: updateData.examination_date
            };
            const response = await axiosInstance.patch(url, payload);
            if (response.data?.updated_data) {
                // Update cache
                const cached = patientCache.value.get(patientId);
                if (cached) {
                    cached.sensitive_meta = response.data.updated_data;
                    cached.last_updated = new Date().toISOString();
                    patientCache.value.set(patientId, cached);
                    // Update current patient if it's the same
                    if (currentPatient.value?.patient.id === patientId) {
                        currentPatient.value = cached;
                    }
                }
                return true;
            }
            return false;
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Fehler beim Speichern der Patientendaten';
            error.value = errorMessage;
            console.error('Error updating patient sensitive meta:', err);
            return false;
        }
        finally {
            saving.value = false;
        }
    }
    async function fetchNextPatientForAnnotation(mediaType = 'video') {
        loading.value = true;
        error.value = null;
        try {
            let url = r(`${mediaType}/sensitivemeta/`);
            if (lastFetchedId.value) {
                url += `?last_id=${lastFetchedId.value}`;
            }
            const response = await axiosInstance.get(url);
            if (response.data) {
                // Extract patient ID from the response and fetch full patient data
                const sensitiveMetaData = response.data;
                const patientId = extractPatientIdFromSensitiveMeta(sensitiveMetaData);
                if (patientId) {
                    return await fetchPatientWithMedia(patientId);
                }
            }
            return null;
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Keine weiteren Patienten für Annotation verfügbar';
            error.value = errorMessage;
            console.error('Error fetching next patient for annotation:', err);
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function addPatientVideo(patientId, videoData) {
        try {
            const response = await axiosInstance.post(r(`patients/${patientId}/videos/`), videoData);
            // Update cache
            const cached = patientCache.value.get(patientId);
            if (cached) {
                cached.videos.push(response.data);
                cached.last_updated = new Date().toISOString();
                patientCache.value.set(patientId, cached);
                if (currentPatient.value?.patient.id === patientId) {
                    currentPatient.value = cached;
                }
            }
            return true;
        }
        catch (err) {
            error.value = err.response?.data?.error || 'Fehler beim Hinzufügen des Videos';
            console.error('Error adding patient video:', err);
            return false;
        }
    }
    async function addPatientReport(patientId, reportData) {
        try {
            const response = await axiosInstance.post(r(`patients/${patientId}/reports/`), reportData);
            // Update cache
            const cached = patientCache.value.get(patientId);
            if (cached) {
                cached.reports.push(response.data);
                cached.last_updated = new Date().toISOString();
                patientCache.value.set(patientId, cached);
                if (currentPatient.value?.patient.id === patientId) {
                    currentPatient.value = cached;
                }
            }
            return true;
        }
        catch (err) {
            error.value = err.response?.data?.error || 'Fehler beim Hinzufügen des Reports';
            console.error('Error adding patient report:', err);
            return false;
        }
    }
    function searchPatients(searchTerm) {
        if (!searchTerm.trim())
            return patients.value;
        const term = searchTerm.toLowerCase();
        return patients.value.filter(patient => patient.first_name?.toLowerCase().includes(term) ||
            patient.name?.toLowerCase().includes(term) ||
            patient.patient_hash?.toLowerCase().includes(term) ||
            patient.id.toString().includes(term));
    }
    function setSearchFilters(filters) {
        searchFilters.value = { ...filters };
        currentPage.value = 1; // Reset to first page when filtering
    }
    function clearSearch() {
        searchFilters.value = {};
        currentPage.value = 1;
    }
    function setCurrentPage(page) {
        if (page >= 1 && page <= totalPages.value) {
            currentPage.value = page;
        }
    }
    function clearCurrentPatient() {
        currentPatient.value = null;
        error.value = null;
    }
    function clearCache() {
        patientCache.value.clear();
    }
    function clearError() {
        error.value = null;
    }
    // --- Utility Functions ---
    function extractPatientIdFromSensitiveMeta(sensitiveMetaData) {
        // This function should extract patient ID from sensitive meta data
        // The exact implementation depends on your API response structure
        return sensitiveMetaData.patient_id || sensitiveMetaData.id || null;
    }
    function getPatientDisplayName(patient) {
        return `${patient.first_name || ''} ${patient.name || ''}`.trim() || `Patient #${patient.id}`;
    }
    function isPatientDataComplete(patient) {
        return !!(patient.sensitive_meta?.patient_first_name?.trim() &&
            patient.sensitive_meta?.patient_last_name?.trim() &&
            patient.sensitive_meta?.patient_dob &&
            patient.sensitive_meta?.examination_date);
    }
    function getPatientProgress(patient) {
        const videosAnnotated = patient.videos.filter(v => v.status === 'annotated' || v.status === 'validated').length;
        const reportsProcessed = patient.reports.filter(r => r.status === 'processed' || r.status === 'validated').length;
        const totalItems = patient.videos.length + patient.reports.length;
        const processedItems = videosAnnotated + reportsProcessed;
        const overallProgress = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;
        return {
            videosAnnotated,
            totalVideos: patient.videos.length,
            reportsProcessed,
            totalReports: patient.reports.length,
            overallProgress: Math.round(overallProgress)
        };
    }
    return {
        // State
        patients,
        currentPatient,
        patientCache,
        searchFilters,
        loading,
        saving,
        error,
        lastFetchedId,
        totalPatients,
        currentPage,
        pageSize,
        // Computed
        isCurrentPatientAnnotated,
        filteredPatients,
        paginatedPatients,
        totalPages,
        // Actions
        fetchPatients,
        fetchPatientWithMedia,
        updatePatientSensitiveMeta,
        fetchNextPatientForAnnotation,
        addPatientVideo,
        addPatientReport,
        searchPatients,
        setSearchFilters,
        clearSearch,
        setCurrentPage,
        clearCurrentPatient,
        clearCache,
        clearError,
        // Utility functions
        getPatientDisplayName,
        isPatientDataComplete,
        getPatientProgress
    };
});
