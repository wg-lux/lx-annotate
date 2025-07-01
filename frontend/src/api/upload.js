import axiosInstance from './axiosInstance';
/**
 * Upload files to the anonymization backend
 * @param files - FileList or File array to upload
 * @returns Promise with upload_id and status_url
 */
export const uploadFiles = async (files) => {
    const formData = new FormData();
    // Add all files to the form data
    const fileArray = Array.from(files);
    fileArray.forEach((file, index) => {
        formData.append('file', file);
    });
    const response = await axiosInstance.post('/api/upload/', formData);
    // Note: Removed headers object - let browser set Content-Type with boundary
    return response.data;
};
/**
 * Check the status of an upload
 * @param statusUrl - The status URL returned from uploadFiles
 * @returns Promise with current upload status
 */
export const checkUploadStatus = async (statusUrl) => {
    const response = await axiosInstance.get(statusUrl);
    return response.data;
};
/**
 * Poll upload status until completion
 * @param statusUrl - The status URL to poll
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when upload is complete
 */
export const pollUploadStatus = async (statusUrl, onProgress) => {
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 60; // Max 2 minutes
    let attempts = 0;
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                attempts++;
                const status = await checkUploadStatus(statusUrl);
                // Call progress callback if provided
                if (onProgress) {
                    onProgress(status);
                }
                if (status.status === 'anonymized') {
                    resolve(status);
                }
                else if (status.status === 'error') {
                    reject(new Error(status.detail || 'Upload failed'));
                }
                else if (attempts >= maxAttempts) {
                    reject(new Error('Upload timeout - maximum polling attempts reached'));
                }
                else {
                    // Continue polling
                    setTimeout(poll, pollInterval);
                }
            }
            catch (error) {
                reject(error);
            }
        };
        poll();
    });
};
