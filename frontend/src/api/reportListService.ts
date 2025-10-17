import axiosInstance, { r } from './axiosInstance'
import type { ReportData } from '@/types/report'

export interface ReportListItem {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  file_type?: string
  created_at: string
  updated_at: string
  report_meta: {
    id: number
    patient_first_name?: string
    patient_last_name?: string
    patient_gender?: string
    patient_dob?: string
    casenumber?: string
    examination_date?: string
    created_at: string
    updated_at: string
  }
}

export interface ReportListResponse {
  count: number
  next?: string
  previous?: string
  results: ReportListItem[]
}

class ReportListService {
  /**
   * Holt eine paginierte Liste aller Reports
   */
  async getReports(page: number = 1, pageSize: number = 20): Promise<ReportListResponse> {
    try {
      const response = await axiosInstance.get<ReportListResponse>(r('reports/'), {
        params: {
          page,
          page_size: pageSize
        }
      })
      return response.data
    } catch (error) {
      console.error('Fehler beim Laden der Report-Liste:', error)
      throw new Error('Report-Liste konnte nicht geladen werden')
    }
  }

  /**
   * Holt eine gefilterte Liste von Reports
   */
  async getFilteredReports(filters: {
    status?: 'pending' | 'approved' | 'rejected'
    file_type?: string
    patient_name?: string
    casenumber?: string
    date_from?: string
    date_to?: string
    page?: number
    page_size?: number
  }): Promise<ReportListResponse> {
    try {
      const response = await axiosInstance.get<ReportListResponse>(r('reports/'), {
        params: filters
      })
      return response.data
    } catch (error) {
      console.error('Fehler beim Laden der gefilterten Reports:', error)
      throw new Error('Gefilterte Reports konnten nicht geladen werden')
    }
  }

  /**
   * Holt einen einzelnen Report mit allen Details
   */
  async getReportById(id: number): Promise<ReportData> {
    try {
      const response = await axiosInstance.get<ReportData>(r(`reports/${id}/with-secure-url/`))
      return response.data
    } catch (error) {
      console.error(`Fehler beim Laden des Reports ${id}:`, error)
      throw new Error(`Report ${id} konnte nicht geladen werden`)
    }
  }

  /**
   * Sucht Reports basierend auf Suchbegriff
   */
  async searchReports(searchTerm: string, page: number = 1): Promise<ReportListResponse> {
    try {
      const response = await axiosInstance.get<ReportListResponse>(r('reports/search/'), {
        params: {
          q: searchTerm,
          page
        }
      })
      return response.data
    } catch (error) {
      console.error('Fehler bei der Report-Suche:', error)
      throw new Error('Report-Suche fehlgeschlagen')
    }
  }

  /**
   * Holt Reports für Legacy-PDF-API (Fallback)
   */
  async getLegacyReports(): Promise<ReportListItem[]> {
    try {
      // Use Modern Media Framework list endpoint first
      try {
        const response = await axiosInstance.get<ReportListResponse>(
          r('media/pdfs/sensitive-metadata/'),
          {
            params: {
              page: 1,
              page_size: 100,
              ordering: '-id'
            }
          }
        )

        if (response.data && response.data.results) {
          return response.data.results.map(this.normalizeLegacyReport)
        }
      } catch (modernError) {
        console.warn('Modern Framework endpoint nicht verfügbar, versuche Legacy:', modernError)
      }

      // Fallback to legacy endpoints
      const endpoints = [
        'pdf/sensitivemeta/', // Legacy list endpoint
        'pdfs/'
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await axiosInstance.get(r(endpoint))

          // Normalisiere die Antwort zu ReportListItem Format
          if (Array.isArray(response.data)) {
            return response.data.map(this.normalizeLegacyReport)
          } else if (response.data && typeof response.data === 'object') {
            return [this.normalizeLegacyReport(response.data)]
          }
        } catch (err) {
          console.warn(`Legacy-Endpunkt ${endpoint} nicht verfügbar:`, err)
          continue
        }
      }

      throw new Error('Keine Legacy-Endpunkte verfügbar')
    } catch (error) {
      console.error('Fehler beim Laden der Legacy-Reports:', error)
      throw new Error('Legacy-Reports konnten nicht geladen werden')
    }
  }

  /**
   * Normalisiert Legacy-Report-Daten zu ReportListItem Format
   */
  private normalizeLegacyReport(data: any): ReportListItem {
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
    }
  }
}

// Singleton-Instanz
const reportListService = new ReportListService()

// Composable für Vue
export function useReportListService() {
  return reportListService
}

// Standard-Export
export default reportListService
