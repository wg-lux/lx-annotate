import axiosInstance, { r } from './axiosInstance';
class ReportListService {
    /**
     * Holt eine paginierte Liste aller Reports
     */
    async getReports(page = 1, pageSize = 20) {
        try {
            const response = await axiosInstance.get(r('reports/'), {
                params: {
                    page,
                    page_size: pageSize
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Fehler beim Laden der Report-Liste:', error);
            throw new Error('Report-Liste konnte nicht geladen werden');
        }
    }
    /**
     * Holt eine gefilterte Liste von Reports
     */
    async getFilteredReports(filters) {
        try {
            const response = await axiosInstance.get(r('reports/'), {
                params: filters
            });
            return response.data;
        }
        catch (error) {
            console.error('Fehler beim Laden der gefilterten Reports:', error);
            throw new Error('Gefilterte Reports konnten nicht geladen werden');
        }
    }
    /**
     * Holt einen einzelnen Report mit allen Details
     */
    async getReportById(id) {
        try {
            const response = await axiosInstance.get(r(`reports/${id}/with-secure-url/`));
            return response.data;
        }
        catch (error) {
            console.error(`Fehler beim Laden des Reports ${id}:`, error);
            throw new Error(`Report ${id} konnte nicht geladen werden`);
        }
    }
    /**
     * Sucht Reports basierend auf Suchbegriff
     */
    async searchReports(searchTerm, page = 1) {
        try {
            const response = await axiosInstance.get(r('reports/search/'), {
                params: {
                    q: searchTerm,
                    page
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Fehler bei der Report-Suche:', error);
            throw new Error('Report-Suche fehlgeschlagen');
        }
    }
    /**
     * Holt Reports für Legacy-PDF-API (Fallback)
     */
    async getLegacyReports() {
        try {
            // Use Modern Media Framework list endpoint first
            try {
                const response = await axiosInstance.get(r('media/pdfs/sensitive-metadata/'), {
                    params: {
                        page: 1,
                        page_size: 100,
                        ordering: '-id'
                    }
                });
                if (response.data && response.data.results) {
                    return response.data.results.map(this.normalizeLegacyReport);
                }
            }
            catch (modernError) {
                console.warn('Modern Framework endpoint nicht verfügbar, versuche Legacy:', modernError);
            }
            // Fallback to legacy endpoints
            const endpoints = [
                'pdf/sensitivemeta/', // Legacy list endpoint
                'pdfs/'
            ];
            for (const endpoint of endpoints) {
                try {
                    const response = await axiosInstance.get(r(endpoint));
                    // Normalisiere die Antwort zu ReportListItem Format
                    if (Array.isArray(response.data)) {
                        return response.data.map(this.normalizeLegacyReport);
                    }
                    else if (response.data && typeof response.data === 'object') {
                        return [this.normalizeLegacyReport(response.data)];
                    }
                }
                catch (err) {
                    console.warn(`Legacy-Endpunkt ${endpoint} nicht verfügbar:`, err);
                    continue;
                }
            }
            throw new Error('Keine Legacy-Endpunkte verfügbar');
        }
        catch (error) {
            console.error('Fehler beim Laden der Legacy-Reports:', error);
            throw new Error('Legacy-Reports konnten nicht geladen werden');
        }
    }
    /**
     * Normalisiert Legacy-Report-Daten zu ReportListItem Format
     */
    normalizeLegacyReport(data) {
        return {
            id: data.id || 0,
            status: data.status || 'pending',
            file_type: data.file_type || data.fileType || 'pdf',
            created_at: data.created_at || data.createdAt || new Date().toISOString(),
            updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
            report_meta: {
                id: data.report_meta?.id || data.id || 0,
                patient_first_name: data.report_meta?.patient_first_name || data.patientFirstName,
                patient_last_name: data.report_meta?.patient_last_name || data.patientLastName,
                patient_gender: data.report_meta?.patient_gender || data.patientGender,
                patient_dob: data.report_meta?.patient_dob || data.patientDob,
                casenumber: data.report_meta?.casenumber || data.caseNumber,
                examination_date: data.report_meta?.examination_date || data.examinationDate,
                created_at: data.report_meta?.created_at || data.createdAt || new Date().toISOString(),
                updated_at: data.report_meta?.updated_at || data.updatedAt || new Date().toISOString()
            }
        };
    }
}
// Singleton-Instanz
const reportListService = new ReportListService();
// Composable für Vue
export function useReportListService() {
    return reportListService;
}
// Standard-Export
export default reportListService;
