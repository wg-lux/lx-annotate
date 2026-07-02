import { type AnonymizationMetricsFilters, type AnonymizationMetricsResponse } from '@/api/anonymizationMetricsApi';
export interface AnonymizationMetricsState {
    data: AnonymizationMetricsResponse | null;
    filters: AnonymizationMetricsFilters;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}
export declare function formatDateForMetricsInput(date: Date): string;
export declare function buildDefaultAnonymizationMetricsFilters(now?: Date): AnonymizationMetricsFilters;
export declare const useAnonymizationMetricsStore: import("pinia").StoreDefinition<"anonymizationMetrics", AnonymizationMetricsState, {}, {
    fetchMetrics(customFilters?: Partial<AnonymizationMetricsFilters>): Promise<AnonymizationMetricsResponse | null>;
    updateFilters(filters: Partial<AnonymizationMetricsFilters>): Promise<AnonymizationMetricsResponse | null>;
    resetFilters(): void;
}>;
