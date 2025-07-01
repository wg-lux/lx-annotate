export interface UploadResponse {
    upload_id: string;
    status_url: string;
}
export interface UploadStatusResponse {
    status: 'processing' | 'error' | 'anonymized';
    detail?: string;
    sensitive_meta_id?: number;
    text?: string;
    anonymized_text?: string;
}
/**
 * Upload files to the anonymization backend
 * @param files - FileList or File array to upload
 * @returns Promise with upload_id and status_url
 */
export declare const uploadFiles: (files: FileList | File[]) => Promise<UploadResponse>;
/**
 * Check the status of an upload
 * @param statusUrl - The status URL returned from uploadFiles
 * @returns Promise with current upload status
 */
export declare const checkUploadStatus: (statusUrl: string) => Promise<UploadStatusResponse>;
/**
 * Poll upload status until completion
 * @param statusUrl - The status URL to poll
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves when upload is complete
 */
export declare const pollUploadStatus: (statusUrl: string, onProgress?: (status: UploadStatusResponse) => void) => Promise<UploadStatusResponse>;
