// @composables/useFileUrl.ts
import { ref, computed, onUnmounted } from 'vue';
import fileUrlService from '@/api/fileUrlService';
export function useFileUrl() {
    // Reactive State
    const loading = ref(false);
    const error = ref('');
    const currentReport = ref(null);
    const secureUrl = ref('');
    const urlExpiresAt = ref(null);
    // Auto-refresh Timer - verwende ReturnType für Browser + Node Kompatibilität
    const refreshTimer = ref(null);
    // Computed Properties
    const isUrlExpired = computed(() => {
        if (!urlExpiresAt.value)
            return false;
        return new Date() >= urlExpiresAt.value;
    });
    const timeUntilExpiry = computed(() => {
        if (!urlExpiresAt.value)
            return 0;
        const now = new Date();
        const expiry = urlExpiresAt.value;
        return Math.max(0, expiry.getTime() - now.getTime());
    });
    const isUrlAvailable = computed(() => {
        return secureUrl.value && !isUrlExpired.value;
    });
    const minutesUntilExpiry = computed(() => {
        return Math.floor(timeUntilExpiry.value / (1000 * 60));
    });
    // Methods
    async function loadReportWithSecureUrl(reportId) {
        loading.value = true;
        error.value = '';
        try {
            const report = await fileUrlService.getReportWithSecureUrl(reportId);
            currentReport.value = report;
            if (report.secure_file_url) {
                secureUrl.value = report.secure_file_url.url;
                urlExpiresAt.value = new Date(report.secure_file_url.expires_at);
            }
            else {
                secureUrl.value = '';
                urlExpiresAt.value = null;
            }
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unbekannter Fehler';
            console.error('Fehler beim Laden der Report-Daten:', err);
        }
        finally {
            loading.value = false;
        }
    }
    async function generateSecureUrl(reportId, fileType = 'pdf') {
        loading.value = true;
        error.value = '';
        try {
            const response = await fileUrlService.generateSecureFileUrl({
                report_id: reportId,
                file_type: fileType
            });
            secureUrl.value = response.url;
            urlExpiresAt.value = new Date(response.expires_at);
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'URL konnte nicht generiert werden';
            console.error('Fehler beim Generieren der URL:', err);
        }
        finally {
            loading.value = false;
        }
    }
    async function validateCurrentUrl() {
        if (!secureUrl.value)
            return false;
        try {
            const isValid = await fileUrlService.validateSecureUrl(secureUrl.value);
            if (!isValid) {
                error.value = 'URL ist nicht mehr gültig';
                secureUrl.value = '';
                urlExpiresAt.value = null;
            }
            return isValid;
        }
        catch (err) {
            console.error('Fehler bei der URL-Validierung:', err);
            return false;
        }
    }
    async function refreshUrl(reportId, fileType = 'pdf') {
        loading.value = true;
        error.value = '';
        try {
            const newUrl = await fileUrlService.refreshSecureUrl(reportId, fileType);
            secureUrl.value = newUrl;
            // Hole neue Ablaufzeit (normalerweise 1 Stunde ab jetzt)
            const now = new Date();
            urlExpiresAt.value = new Date(now.getTime() + 60 * 60 * 1000); // 1 Stunde
            console.log('URL erfolgreich erneuert');
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'URL konnte nicht erneuert werden';
            console.error('Fehler beim Erneuern der URL:', err);
        }
        finally {
            loading.value = false;
        }
    }
    async function revokeCurrentUrl() {
        if (!secureUrl.value)
            return;
        try {
            await fileUrlService.revokeSecureUrl(secureUrl.value);
            secureUrl.value = '';
            urlExpiresAt.value = null;
            console.log('URL erfolgreich widerrufen');
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'URL konnte nicht widerrufen werden';
            console.error('Fehler beim Widerrufen der URL:', err);
        }
    }
    function clearCurrentUrl() {
        currentReport.value = null;
        secureUrl.value = '';
        urlExpiresAt.value = null;
        error.value = '';
        clearRefreshTimer();
    }
    function formatTimeUntilExpiry() {
        const minutes = minutesUntilExpiry.value;
        if (minutes <= 0)
            return 'Abgelaufen';
        if (minutes < 60)
            return `${minutes} Min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours < 24) {
            return remainingMinutes > 0
                ? `${hours}h ${remainingMinutes}m`
                : `${hours}h`;
        }
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0
            ? `${days}d ${remainingHours}h`
            : `${days}d`;
    }
    function setupAutoRefresh(reportId, fileType = 'pdf', intervalMinutes = 30) {
        clearRefreshTimer();
        refreshTimer.value = window.setInterval(async () => {
            // Erneuere URL wenn sie in den nächsten 10 Minuten abläuft
            if (minutesUntilExpiry.value <= 10 && minutesUntilExpiry.value > 0) {
                console.log('Auto-refresh: URL läuft bald ab, erneuere...');
                await refreshUrl(reportId, fileType);
            }
        }, intervalMinutes * 60 * 1000);
    }
    function clearRefreshTimer() {
        if (refreshTimer.value) {
            clearInterval(refreshTimer.value);
            refreshTimer.value = null;
        }
    }
    // Utility Functions
    function getFileTypeFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            const extension = pathname.split('.').pop()?.toLowerCase();
            switch (extension) {
                case 'pdf': return 'pdf';
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                case 'webp': return 'image';
                case 'mp4':
                case 'webm':
                case 'ogg': return 'video';
                default: return 'document';
            }
        }
        catch {
            return 'document';
        }
    }
    function isImageFile(fileType) {
        if (!fileType)
            return false;
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType.toLowerCase());
    }
    function isPdfFile(fileType) {
        return fileType?.toLowerCase() === 'pdf';
    }
    function isVideoFile(fileType) {
        if (!fileType)
            return false;
        return ['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileType.toLowerCase());
    }
    // Cleanup bei Component Unmount
    onUnmounted(() => {
        clearRefreshTimer();
    });
    // Public API
    return {
        // State
        loading: readonly(loading),
        error: readonly(error),
        currentReport: readonly(currentReport),
        secureUrl: readonly(secureUrl),
        urlExpiresAt: readonly(urlExpiresAt),
        // Computed
        isUrlExpired,
        timeUntilExpiry,
        isUrlAvailable,
        minutesUntilExpiry,
        // Methods
        loadReportWithSecureUrl,
        generateSecureUrl,
        validateCurrentUrl,
        refreshUrl,
        revokeCurrentUrl,
        clearCurrentUrl,
        formatTimeUntilExpiry,
        setupAutoRefresh,
        clearRefreshTimer,
        // Utilities
        getFileTypeFromUrl,
        isImageFile,
        isPdfFile,
        isVideoFile
    };
}
// Helper für readonly refs
function readonly(ref) {
    return computed(() => ref.value);
}
