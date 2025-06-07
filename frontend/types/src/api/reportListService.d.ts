import type { ReportData } from '@/types/report';
export interface ReportListItem {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    file_type?: string;
    created_at: string;
    updated_at: string;
    report_meta: {
        id: number;
        patient_first_name?: string;
        patient_last_name?: string;
        patient_gender?: string;
        patient_dob?: string;
        casenumber?: string;
        examination_date?: string;
        created_at: string;
        updated_at: string;
    };
}
export interface ReportListResponse {
    count: number;
    next?: string;
    previous?: string;
    results: ReportListItem[];
}
declare class ReportListService {
    /**
     * Holt eine paginierte Liste aller Reports
     */
    getReports(page?: number, pageSize?: number): Promise<ReportListResponse>;
    /**
     * Holt eine gefilterte Liste von Reports
     */
    getFilteredReports(filters: {
        status?: 'pending' | 'approved' | 'rejected';
        file_type?: string;
        patient_name?: string;
        casenumber?: string;
        date_from?: string;
        date_to?: string;
        page?: number;
        page_size?: number;
    }): Promise<ReportListResponse>;
    /**
     * Holt einen einzelnen Report mit allen Details
     */
    getReportById(id: number): Promise<ReportData>;
    /**
     * Sucht Reports basierend auf Suchbegriff
     */
    searchReports(searchTerm: string, page?: number): Promise<ReportListResponse>;
    /**
     * Holt Reports für Legacy-PDF-API (Fallback)
     */
    getLegacyReports(): Promise<ReportListItem[]>;
    /**
     * Normalisiert Legacy-Report-Daten zu ReportListItem Format
     */
    private normalizeLegacyReport;
}
declare const reportListService: ReportListService;
export declare function useReportListService(): ReportListService;
export default reportListService;
