import type { ReportData } from '@/types/report'
export declare function useFileUrl(): {
  loading: import('vue').ComputedRef<boolean>
  error: import('vue').ComputedRef<string>
  currentReport: import('vue').ComputedRef<
    | ReportData
    | {
        id: number
        anonymized_text?: string | undefined
        report_meta: {
          id: number
          patient_first_name?: string | undefined
          patient_last_name?: string | undefined
          patient_gender?: string | undefined
          patient_dob?: string | undefined
          casenumber?: string | undefined
          examination_date?: string | undefined
          pdf_url?: string | undefined
          created_at: string
          updated_at: string
        }
        secure_file_url?:
          | {
              url: string
              expires_at: string
              file_type: string
              file_size: number
              original_filename: string
            }
          | undefined
        file_type?: string | undefined
        status: 'pending' | 'approved' | 'rejected'
      }
    | null
  >
  secureUrl: import('vue').ComputedRef<string>
  urlExpiresAt: import('vue').ComputedRef<Date | null>
  isUrlExpired: import('vue').ComputedRef<boolean>
  timeUntilExpiry: import('vue').ComputedRef<number>
  isUrlAvailable: import('vue').ComputedRef<boolean | ''>
  minutesUntilExpiry: import('vue').ComputedRef<number>
  loadReportWithSecureUrl: (reportId: number) => Promise<void>
  generateSecureUrl: (reportId: number, fileType?: string) => Promise<void>
  validateCurrentUrl: () => Promise<boolean>
  refreshUrl: (reportId: number, fileType?: string) => Promise<void>
  revokeCurrentUrl: () => Promise<void>
  clearCurrentUrl: () => void
  formatTimeUntilExpiry: () => string
  setupAutoRefresh: (reportId: number, fileType?: string, intervalMinutes?: number) => void
  clearRefreshTimer: () => void
  getFileTypeFromUrl: (url: string) => string
  isImageFile: (fileType?: string) => boolean
  isPdfFile: (fileType?: string) => boolean
  isVideoFile: (fileType?: string) => boolean
}
