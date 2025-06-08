export interface SensitiveMetaData {
    id: number;
    patient_first_name: string;
    patient_last_name: string;
    patient_dob: string;
    examination_date: string;
    patient_gender?: string;
    center?: string;
    examiners?: string[];
    endoscope_type?: string;
    endoscope_sn?: string;
    patient_hash?: string;
    examination_hash?: string;
    video_file?: {
        id: number;
        original_file_name: string;
        duration: number;
        video_url: string;
    };
    pdf_file?: {
        id: number;
        original_file_name: string;
        file_url: string;
    };
}
export interface SensitiveMetaUpdateRequest {
    sensitive_meta_id: number;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_dob?: string;
    examination_date?: string;
}
export interface SensitiveMetaResponse {
    message: string;
    updated_data: SensitiveMetaData;
}
export interface FetchOptions {
    patientId?: number;
    lastId?: number;
}
export declare class SensitiveMetaService {
    /**
     * Fetch sensitive meta data for videos
     */
    static fetchVideoSensitiveMeta(options?: FetchOptions): Promise<SensitiveMetaData>;
    /**
     * Fetch sensitive meta data for PDFs
     */
    static fetchPdfSensitiveMeta(options?: FetchOptions): Promise<SensitiveMetaData>;
    /**
     * Update video sensitive meta data
     */
    static updateVideoSensitiveMeta(updateData: SensitiveMetaUpdateRequest): Promise<SensitiveMetaResponse>;
    /**
     * Update PDF sensitive meta data
     */
    static updatePdfSensitiveMeta(updateData: SensitiveMetaUpdateRequest): Promise<SensitiveMetaResponse>;
    /**
     * Generic fetch method that works with both video and PDF
     */
    static fetchSensitiveMeta(mediaType: 'video' | 'pdf', options?: FetchOptions): Promise<SensitiveMetaData>;
    /**
     * Generic update method that works with both video and PDF
     */
    static updateSensitiveMeta(mediaType: 'video' | 'pdf', updateData: SensitiveMetaUpdateRequest): Promise<SensitiveMetaResponse>;
    /**
     * Validate sensitive meta data before sending to backend
     */
    static validateSensitiveMetaData(data: Partial<SensitiveMetaUpdateRequest>): {
        isValid: boolean;
        errors: Record<string, string>;
    };
    /**
     * Utility method to format hash values for display
     */
    static formatHash(hash?: string): string;
    /**
     * Utility method to format duration for video display
     */
    static formatDuration(duration?: number): string;
    /**
     * Utility method to format examiner names
     */
    static formatExaminers(examiners?: string[]): string;
    /**
     * Check if sensitive meta data is complete/verified
     */
    static isDataVerified(data: SensitiveMetaData): boolean;
}
export default SensitiveMetaService;
