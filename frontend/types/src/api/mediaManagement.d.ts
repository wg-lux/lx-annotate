export interface MediaStatusOverview {
    videos: {
        total: number;
        not_started: number;
        processing: number;
        done: number;
        failed: number;
        validated: number;
        unfinished: number;
    };
    pdfs: {
        total: number;
        not_started: number;
        processing: number;
        done: number;
        failed: number;
        validated: number;
        unfinished: number;
    };
    cleanup_opportunities: {
        stale_processing: number;
        failed_videos: number;
        unfinished_total: number;
    };
    total_files: number;
    timestamp: string;
}
export interface MediaCleanupResult {
    cleanup_type: string;
    force: boolean;
    removed_items: Array<{
        id: number;
        type: 'video' | 'pdf';
        filename: string;
        status: string;
        uploaded_at?: string;
        created_at?: string;
        stale_duration_hours?: number;
    }>;
    summary: {
        videos_removed?: number;
        pdfs_removed?: number;
        stale_videos_removed?: number;
        total_removed: number;
        dry_run: boolean;
    };
}
export interface PollingCoordinatorInfo {
    coordinator_status: string;
    config: {
        processing_timeout: number;
        check_cooldown: number;
    };
    note: string;
}
export interface AnonymizationStatusResponse {
    file_id: number;
    file_type: string;
    anonymizationStatus: string;
    processing_locked?: boolean;
    cooldown_active?: boolean;
}
export interface ProcessingResponse {
    detail: string;
    file_id: number;
    file_type: string;
    processing_locked?: boolean;
}
/**
 * Media Management API Service
 * Provides comprehensive media cleanup and management capabilities
 */
export declare class MediaManagementAPI {
    /**
     * Get comprehensive status overview of all media
     */
    static getStatusOverview(): Promise<MediaStatusOverview>;
    /**
     * Perform media cleanup operations
     * @param type - Type of cleanup: 'unfinished', 'failed', 'stale', 'all'
     * @param force - Whether to actually delete (true) or dry-run (false)
     */
    static performCleanup(type?: 'unfinished' | 'failed' | 'stale' | 'all', force?: boolean): Promise<MediaCleanupResult>;
    /**
     * Force remove a specific media item
     * @param fileId - ID of the file to remove
     */
    static forceRemoveMedia(fileId: number): Promise<ProcessingResponse>;
    /**
     * Reset processing status for a stuck/failed media item
     * @param fileId - ID of the file to reset
     */
    static resetProcessingStatus(fileId: number): Promise<ProcessingResponse>;
    /**
     * Get polling coordinator information
     */
    static getPollingCoordinatorInfo(): Promise<PollingCoordinatorInfo>;
    /**
     * Clear all processing locks (emergency function)
     * @param fileType - Optional file type filter ('video' or 'pdf')
     */
    static clearProcessingLocks(fileType?: 'video' | 'pdf'): Promise<{
        detail: string;
        cleared_count: number;
        file_type_filter?: string;
    }>;
    /**
     * Enhanced anonymization status check with polling protection
     * @param fileId - ID of the file to check
     * @param fileType - Type of file ('video' or 'pdf')
     */
    static getAnonymizationStatusSafe(fileId: number, fileType?: 'video' | 'pdf'): Promise<AnonymizationStatusResponse>;
    /**
     * Start anonymization with processing lock protection
     * @param fileId - ID of the file to process
     */
    static startAnonymizationSafe(fileId: number): Promise<ProcessingResponse>;
    /**
     * Validate anonymization with coordination
     * @param fileId - ID of the file to validate
     */
    static validateAnonymizationSafe(fileId: number): Promise<ProcessingResponse>;
    /**
     * Re-import a video file to regenerate metadata
     * Uses the modern media framework endpoint aligned with PDF reimport
     * @param fileId - ID of the video file to re-import
     */
    static reimportVideo(fileId: number): Promise<ProcessingResponse>;
    /**
     * Re-import a PDF file to regenerate metadata
     * Uses the modern media framework endpoint aligned with video reimport
     * @param fileId - ID of the PDF file to re-import
     */
    static reimportPdf(fileId: number): Promise<ProcessingResponse>;
    /**
     * Delete/remove a media file completely
     * @param fileId - ID of the file to delete
     */
    static deleteMediaFile(fileId: number): Promise<ProcessingResponse>;
}
/**
 * Composable for media management operations
 */
export declare function useMediaManagement(): {
    isLoading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    clearError: () => void;
    getStatusOverview: () => Promise<MediaStatusOverview | null>;
    performCleanup: (type: 'unfinished' | 'failed' | 'stale' | 'all', force?: boolean) => Promise<MediaCleanupResult | null>;
    forceRemoveMedia: (fileId: number) => Promise<ProcessingResponse | null>;
    resetProcessingStatus: (fileId: number) => Promise<ProcessingResponse | null>;
    deleteMediaFile: (fileId: number) => Promise<ProcessingResponse | null>;
    reimportVideo: (fileId: number) => Promise<ProcessingResponse | null>;
    reimportPdf: (fileId: number) => Promise<ProcessingResponse | null>;
    getStatusSafe: (fileId: number, fileType?: 'video' | 'pdf') => Promise<AnonymizationStatusResponse | null>;
    startAnonymizationSafe: (fileId: number) => Promise<ProcessingResponse | null>;
    validateAnonymizationSafe: (fileId: number) => Promise<ProcessingResponse | null>;
    getPollingInfo: () => Promise<PollingCoordinatorInfo | null>;
    clearAllLocks: (fileType?: 'video' | 'pdf') => Promise<{
        detail: string;
        cleared_count: number;
        file_type_filter?: string | undefined;
    } | null>;
};
