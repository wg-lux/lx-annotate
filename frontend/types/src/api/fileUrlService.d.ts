import type { ReportData, FileUrlRequest, FileUrlResponse } from '@/types/report';
declare class FileUrlService {
    private urlCache;
    private readonly CACHE_BUFFER_MS;
    /**
     * Holt Report-Daten inklusive sicherer File-URL
     */
    getReportWithSecureUrl(reportId: number): Promise<ReportData>;
    /**
     * Generiert eine neue sichere File-URL
     */
    generateSecureFileUrl(request: FileUrlRequest): Promise<FileUrlResponse>;
    /**
     * Holt eine sichere File-URL (mit Caching)
     */
    getSecureFileUrl(reportId: number, fileType?: string): Promise<string>;
    /**
     * Validiert eine sichere URL
     */
    validateSecureUrl(url: string): Promise<boolean>;
    /**
     * Erneuert eine sichere URL vor Ablauf
     */
    refreshSecureUrl(reportId: number, fileType?: string): Promise<string>;
    /**
     * Löscht eine sichere URL (invalidiert sie)
     */
    revokeSecureUrl(url: string): Promise<void>;
    /**
     * Holt Metadaten einer Datei
     */
    getFileMetadata(reportId: number, fileType?: string): Promise<any>;
    /**
     * Prüft ob eine URL noch gültig ist (mit Puffer)
     */
    private isUrlStillValid;
    /**
     * Bereinigt abgelaufene Cache-Einträge
     */
    clearExpiredCache(): void;
    /**
     * Leert den gesamten Cache
     */
    clearAllCache(): void;
    /**
     * Gibt Cache-Statistiken zurück
     */
    getCacheStats(): {
        total: number;
        valid: number;
        expired: number;
    };
}
declare const fileUrlService: FileUrlService;
export declare function useFileUrlService(): FileUrlService;
export default fileUrlService;
