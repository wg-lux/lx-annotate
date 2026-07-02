export type AnonymizationMetricsMediaType = '' | 'all' | 'pdf' | 'video' | string;
export interface AnonymizationMetricsFilters {
    dateFrom?: string;
    dateTo?: string;
    mediaType?: AnonymizationMetricsMediaType;
    centerId?: number | string | null;
    documentType?: string;
    sourceSystem?: string;
}
export interface AnonymizationWorkflowMetrics {
    pendingValidation: number;
    validated: number;
    failedLost: number;
    medianTimeToValidationSeconds: number | null;
    totalsByAnonymizationStatus: Record<string, number>;
    totalsByValidationStatus: Record<string, number>;
}
export interface AnonymizationFieldQualityMetric {
    fieldName: string;
    support: number;
    changedRate: number | null;
    exactMatchRate: number | null;
    meanSimilarity: number | null;
    missingAfterValidationCount: number;
}
export interface AnonymizationPhiRegionMetrics {
    proposalCount: number;
    humanAnnotationCount: number;
    matchedCount: number;
    precision: number | null;
    recall: number | null;
}
export interface AnonymizationMetricsResponse {
    schemaVersion: string;
    filters: AnonymizationMetricsFilters;
    workflow: AnonymizationWorkflowMetrics;
    fieldQuality: AnonymizationFieldQualityMetric[];
    phiRegions: AnonymizationPhiRegionMetrics;
}
export type AnonymizationMetricsQueryParams = {
    date_from?: string;
    date_to?: string;
    media_type?: string;
    center_id?: number | string;
    document_type?: string;
    source_system?: string;
};
export declare function buildAnonymizationMetricsQueryParams(filters?: Partial<AnonymizationMetricsFilters>): AnonymizationMetricsQueryParams;
export declare function sanitizeAnonymizationMetricsResponse(payload: unknown): AnonymizationMetricsResponse;
export declare function fetchAnonymizationMetrics(filters?: Partial<AnonymizationMetricsFilters>): Promise<AnonymizationMetricsResponse>;
