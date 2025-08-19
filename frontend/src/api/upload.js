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
    if (fileArray.length === 0) {
        throw new Error('No files provided for upload');
    }
    console.log('Uploading files:', fileArray.map(f => f.name));
    fileArray.forEach((file, index) => {
        console.log(`Adding file ${index}: ${file.name} (${file.size} bytes)`);
        formData.append('file', file);
    });
    console.log('▶︎ FormData just before POST', fileArray.map((file, index) => [`file[${index}]`, file.name, file.size]));
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
    const pollInterval = 5000; // Increased from 2000ms to 5000ms (5 seconds)
    const maxAttempts = 30; // Maximum number of polling attempts
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
