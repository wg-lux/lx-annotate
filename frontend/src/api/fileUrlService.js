// @api/fileUrlService.ts
import axiosInstance from './axiosInstance';
class FileUrlService {
    urlCache = new Map();
    CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 Minuten Puffer vor Ablauf
    /**
     * Holt Report-Daten inklusive sicherer File-URL
     */
    async getReportWithSecureUrl(reportId) {
        try {
            const response = await axiosInstance.get(`/api/reports/${reportId}/with-secure-url/`);
            return response.data;
        }
        catch (error) {
            console.error('Fehler beim Laden der Report-Daten:', error);
            throw new Error('Report-Daten konnten nicht geladen werden');
        }
    }
    /**
     * Generiert eine neue sichere File-URL
     */
    async generateSecureFileUrl(request) {
        try {
            const response = await axiosInstance.post('/api/secure-file-urls/', request);
            // Cache die neue URL
            const cacheKey = `${request.report_id}_${request.file_type || 'pdf'}`;
            this.urlCache.set(cacheKey, {
                url: response.data.url, // Verwende 'url' statt 'secure_url'
                expiresAt: new Date(response.data.expires_at)
            });
            return response.data;
        }
        catch (error) {
            console.error('Fehler beim Generieren der sicheren URL:', error);
            throw new Error('Sichere URL konnte nicht generiert werden');
        }
    }
    /**
     * Holt eine sichere File-URL (mit Caching)
     */
    async getSecureFileUrl(reportId, fileType = 'pdf') {
        const cacheKey = `${reportId}_${fileType}`;
        const cached = this.urlCache.get(cacheKey);
        // Prüfe Cache und Ablaufzeit
        if (cached && this.isUrlStillValid(cached.expiresAt)) {
            return cached.url;
        }
        // Cache ist abgelaufen oder existiert nicht, generiere neue URL
        try {
            const response = await this.generateSecureFileUrl({
                report_id: reportId,
                file_type: fileType
                // access_duration entfernt - existiert nicht im Interface
            });
            return response.url; // Verwende 'url' statt 'secure_url'
        }
        catch (error) {
            // Entferne abgelaufenen Cache-Eintrag
            this.urlCache.delete(cacheKey);
            throw error;
        }
    }
    /**
     * Validiert eine sichere URL
     */
    async validateSecureUrl(url) {
        try {
            const response = await axiosInstance.head(url);
            return response.status === 200;
        }
        catch (error) {
            console.warn('URL-Validierung fehlgeschlagen:', error);
            return false;
        }
    }
    /**
     * Erneuert eine sichere URL vor Ablauf
     */
    async refreshSecureUrl(reportId, fileType = 'pdf') {
        const cacheKey = `${reportId}_${fileType}`;
        try {
            const response = await this.generateSecureFileUrl({
                report_id: reportId,
                file_type: fileType
                // access_duration entfernt - existiert nicht im Interface
            });
            // Aktualisiere Cache
            this.urlCache.set(cacheKey, {
                url: response.url, // Verwende 'url' statt 'secure_url'
                expiresAt: new Date(response.expires_at)
            });
            return response.url; // Verwende 'url' statt 'secure_url'
        }
        catch (error) {
            console.error('Fehler beim Erneuern der URL:', error);
            throw new Error('URL konnte nicht erneuert werden');
        }
    }
    /**
     * Löscht eine sichere URL (invalidiert sie)
     */
    async revokeSecureUrl(url) {
        try {
            await axiosInstance.delete('/api/secure-file-urls/revoke/', {
                data: { url }
            });
            // Entferne aus Cache
            for (const [key, cached] of this.urlCache.entries()) {
                if (cached.url === url) {
                    this.urlCache.delete(key);
                    break;
                }
            }
        }
        catch (error) {
            console.error('Fehler beim Widerrufen der URL:', error);
            throw new Error('URL konnte nicht widerrufen werden');
        }
    }
    /**
     * Holt Metadaten einer Datei
     */
    async getFileMetadata(reportId, fileType = 'pdf') {
        try {
            const response = await axiosInstance.get(`/api/reports/${reportId}/file-metadata/`, {
                params: { file_type: fileType }
            });
            return response.data;
        }
        catch (error) {
            console.error('Fehler beim Laden der Datei-Metadaten:', error);
            throw new Error('Datei-Metadaten konnten nicht geladen werden');
        }
    }
    /**
     * Prüft ob eine URL noch gültig ist (mit Puffer)
     */
    isUrlStillValid(expiresAt) {
        const now = new Date();
        const expiryWithBuffer = new Date(expiresAt.getTime() - this.CACHE_BUFFER_MS);
        return now < expiryWithBuffer;
    }
    /**
     * Bereinigt abgelaufene Cache-Einträge
     */
    clearExpiredCache() {
        const now = new Date();
        for (const [key, cached] of this.urlCache.entries()) {
            if (now >= cached.expiresAt) {
                this.urlCache.delete(key);
            }
        }
    }
    /**
     * Leert den gesamten Cache
     */
    clearAllCache() {
        this.urlCache.clear();
    }
    /**
     * Gibt Cache-Statistiken zurück
     */
    getCacheStats() {
        const now = new Date();
        const total = this.urlCache.size;
        let valid = 0;
        let expired = 0;
        for (const cached of this.urlCache.values()) {
            if (this.isUrlStillValid(cached.expiresAt)) {
                valid++;
            }
            else {
                expired++;
            }
        }
        return { total, valid, expired };
    }
}
// Singleton-Instanz
const fileUrlService = new FileUrlService();
// Composable-ähnliche Funktion für Vue
export function useFileUrlService() {
    return fileUrlService;
}
// Standard-Export
export default fileUrlService;
