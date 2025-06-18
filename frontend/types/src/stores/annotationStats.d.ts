export type AnnotationType = 'segment' | 'examination' | 'sensitive_meta';
export type AnnotationStatus = 'pending' | 'in_progress' | 'completed';
export interface UnifiedAnnotationStats {
    segmentPending: number;
    segmentInProgress: number;
    segmentCompleted: number;
    examinationPending: number;
    examinationInProgress: number;
    examinationCompleted: number;
    sensitiveMetaPending: number;
    sensitiveMetaInProgress: number;
    sensitiveMetaCompleted: number;
    totalPending: number;
    totalInProgress: number;
    totalCompleted: number;
    totalAnnotations: number;
}
export interface AnnotationStatsBreakdown {
    type: AnnotationType;
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
}
export declare const useAnnotationStatsStore: import("pinia").StoreDefinition<"annotationStats", {
    stats: UnifiedAnnotationStats;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}, {
    pendingCount: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => number;
    isLoading: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => boolean;
    hasError: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => boolean;
    needsRefresh: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => boolean;
    annotationBreakdown: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => AnnotationStatsBreakdown[];
    pendingByType: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => {
        segment: number;
        examination: number;
        sensitive_meta: number;
    };
    inProgressByType: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => {
        segment: number;
        examination: number;
        sensitive_meta: number;
    };
    completedByType: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => {
        segment: number;
        examination: number;
        sensitive_meta: number;
    };
    completionPercentage: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => number;
    inProgressPercentage: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => number;
    pendingPercentage: (state: {
        stats: {
            segmentPending: number;
            segmentInProgress: number;
            segmentCompleted: number;
            examinationPending: number;
            examinationInProgress: number;
            examinationCompleted: number;
            sensitiveMetaPending: number;
            sensitiveMetaInProgress: number;
            sensitiveMetaCompleted: number;
            totalPending: number;
            totalInProgress: number;
            totalCompleted: number;
            totalAnnotations: number;
        };
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: UnifiedAnnotationStats;
        loading: boolean;
        error: string | null;
        lastUpdated: Date | null;
    }>) => number;
}, {
    fetchAnnotationStats(): Promise<void>;
    calculateTotals(): void;
    resetStats(): void;
    refreshIfNeeded(): Promise<void>;
    forceRefresh(): Promise<void>;
    updateAnnotationStatus(type: AnnotationType, fromStatus: AnnotationStatus | null, toStatus: AnnotationStatus, count?: number): void;
    incrementCount(type: AnnotationType, status: AnnotationStatus, count?: number): void;
    decrementCount(type: AnnotationType, status: AnnotationStatus, count?: number): void;
    incrementPending(type?: 'video' | 'pdf'): void;
    decrementPending(type?: 'video' | 'pdf'): void;
    clearError(): void;
}>;
