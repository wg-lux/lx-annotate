// frontend/src/api/mediaManagement.ts
import axiosInstance from '@/api/axiosInstance';
import { ref, readonly } from 'vue';
const api = axiosInstance;
/**
 * Media Management API Service
 * Provides comprehensive media cleanup and management capabilities
 */
export class MediaManagementAPI {
    /**
     * Get comprehensive status overview of all media
     */
    static async getStatusOverview() {
        const response = await api.get('/api/media-management/status/');
        return response.data;
    }
    /**
     * Perform media cleanup operations
     * @param type - Type of cleanup: 'unfinished', 'failed', 'stale', 'all'
     * @param force - Whether to actually delete (true) or dry-run (false)
     */
    static async performCleanup(type = 'unfinished', force = false) {
        const response = await api.delete(`/api/media-management/cleanup/?type=${type}&force=${force}`);
        return response.data;
    }
    /**
     * Force remove a specific media item
     * @param fileId - ID of the file to remove
     */
    static async forceRemoveMedia(fileId) {
        const response = await api.delete(`/api/media-management/force-remove/${fileId}/`);
        return response.data;
    }
    /**
     * Reset processing status for a stuck/failed media item
     * @param fileId - ID of the file to reset
     */
    static async resetProcessingStatus(fileId) {
        const response = await api.post(`/api/media-management/reset-status/${fileId}/`);
        return response.data;
    }
    /**
     * Get polling coordinator information
     */
    static async getPollingCoordinatorInfo() {
        const response = await api.get('/api/anonymization/polling-info/');
        return response.data;
    }
    /**
     * Clear all processing locks (emergency function)
     * @param fileType - Optional file type filter ('video' or 'pdf')
     */
    static async clearProcessingLocks(fileType) {
        const params = fileType ? `?type=${fileType}` : '';
        const response = await api.delete(`/api/anonymization/clear-locks/${params}`);
        return response.data;
    }
    /**
     * Enhanced anonymization status check with polling protection
     * @param fileId - ID of the file to check
     * @param fileType - Type of file ('video' or 'pdf')
     */
    static async getAnonymizationStatusSafe(fileId, fileType) {
        const params = fileType ? `?type=${fileType}` : '';
        const response = await api.get(`/api/anonymization/status/${fileId}/${params}`);
        return response.data;
    }
    /**
     * Start anonymization with processing lock protection
     * @param fileId - ID of the file to process
     */
    static async startAnonymizationSafe(fileId) {
        const response = await api.post(`/api/anonymization/${fileId}/start/`);
        return response.data;
    }
    /**
     * Validate anonymization with coordination
     * @param fileId - ID of the file to validate
     */
    static async validateAnonymizationSafe(fileId) {
        const response = await api.post(`/api/anonymization/${fileId}/validate/`);
        return response.data;
    }
    /**
     * Re-import a video file to regenerate metadata
     * @param fileId - ID of the video file to re-import
     */
    static async reimportVideo(fileId) {
        const response = await api.post(`/api/video/${fileId}/reimport/`);
        return response.data;
    }
    /**
     * Delete/remove a media file completely
     * @param fileId - ID of the file to delete
     */
    static async deleteMediaFile(fileId) {
        const response = await api.delete(`/api/media-management/force-remove/${fileId}/`);
        return response.data;
    }
}
/**
 * Composable for media management operations
 */
export function useMediaManagement() {
    const isLoading = ref(false);
    const error = ref(null);
    /**
     * Safe wrapper for API calls with error handling
     */
    const safeApiCall = async (apiCall) => {
        isLoading.value = true;
        error.value = null;
        try {
            const result = await apiCall();
            return result;
        }
        catch (err) {
            console.error('Media Management API Error:', err);
            if (err.response?.status === 429) {
                error.value = 'Zu viele Anfragen. Bitte warten Sie einen Moment.';
            }
            else if (err.response?.status === 409) {
                error.value = 'Datei wird bereits verarbeitet.';
            }
            else if (err.response?.data?.detail) {
                error.value = err.response.data.detail;
            }
            else {
                error.value = 'Ein unerwarteter Fehler ist aufgetreten.';
            }
            return null;
        }
        finally {
            isLoading.value = false;
        }
    };
    return {
        isLoading: readonly(isLoading),
        error: readonly(error),
        clearError: () => { error.value = null; },
        // Status operations
        getStatusOverview: () => safeApiCall(() => MediaManagementAPI.getStatusOverview()),
        // Cleanup operations
        performCleanup: (type, force = false) => safeApiCall(() => MediaManagementAPI.performCleanup(type, force)),
        // Individual file operations
        forceRemoveMedia: (fileId) => safeApiCall(() => MediaManagementAPI.forceRemoveMedia(fileId)),
        resetProcessingStatus: (fileId) => safeApiCall(() => MediaManagementAPI.resetProcessingStatus(fileId)),
        deleteMediaFile: (fileId) => safeApiCall(() => MediaManagementAPI.deleteMediaFile(fileId)),
        reimportVideo: (fileId) => safeApiCall(() => MediaManagementAPI.reimportVideo(fileId)),
        // Safe anonymization operations
        getStatusSafe: (fileId, fileType) => safeApiCall(() => MediaManagementAPI.getAnonymizationStatusSafe(fileId, fileType)),
        startAnonymizationSafe: (fileId) => safeApiCall(() => MediaManagementAPI.startAnonymizationSafe(fileId)),
        validateAnonymizationSafe: (fileId) => safeApiCall(() => MediaManagementAPI.validateAnonymizationSafe(fileId)),
        // Coordinator operations
        getPollingInfo: () => safeApiCall(() => MediaManagementAPI.getPollingCoordinatorInfo()),
        clearAllLocks: (fileType) => safeApiCall(() => MediaManagementAPI.clearProcessingLocks(fileType)),
    };
}
