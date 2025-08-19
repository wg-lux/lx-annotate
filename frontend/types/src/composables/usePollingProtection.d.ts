export type ProtectedMediaType = 'video' | 'pdf';
/**
 * Composable for polling protection and coordination (soft-locks)
 */
export declare function usePollingProtection(): {
    processingLocks: import("vue").ComputedRef<[string, number][]>;
    getProcessingLocksInfo: import("vue").ComputedRef<{
        totalLocks: number;
        locks: {
            key: string;
            expiresAt: number;
        }[];
        videoLocks: {
            key: string;
            expiresAt: number;
        }[];
        pdfLocks: {
            key: string;
            expiresAt: number;
        }[];
    }>;
    canProcessMedia: import("vue").ComputedRef<(fileId: number, mediaType: ProtectedMediaType) => boolean>;
    acquireProcessingLock: (fileId: number, mediaType: ProtectedMediaType, ttlMs?: number) => boolean;
    releaseProcessingLock: (fileId: number, mediaType: ProtectedMediaType) => void;
    getStatusSafeWithProtection: (fileId: number, mediaType: ProtectedMediaType) => Promise<any>;
    startAnonymizationSafeWithProtection: (fileId: number, mediaType: ProtectedMediaType) => Promise<any>;
    validateAnonymizationSafeWithProtection: (fileId: number, mediaType: ProtectedMediaType) => Promise<any>;
    clearAllLocalLocks: () => void;
    clearAllProcessingLocks: (fileType?: ProtectedMediaType) => Promise<void>;
};
