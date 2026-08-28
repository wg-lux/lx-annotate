import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface StudyExportOptions {
  examinations: string[]
  findings: string[]
  indications: string[]
  maximumRows: number
}

export interface StudyExportSelection {
  examinations: string[]
  findings: string[]
  indications: string[]
  groupBy: 'patient' | 'examination'
}

export interface StudyExportDownload {
  blob: Blob
  filename: string
  rowCount: number
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const DEFAULT_FILENAME = 'pseudonymous-study-cases.xlsx'

export function buildStudyExportQuery(selection: StudyExportSelection): URLSearchParams {
  const params = new URLSearchParams()
  params.set('group_by', selection.groupBy)
  for (const value of selection.examinations) params.append('examination', value)
  for (const value of selection.findings) params.append('finding', value)
  for (const value of selection.indications) params.append('indication', value)
  return params
}

function responseFilename(contentDisposition: unknown): string {
  if (typeof contentDisposition !== 'string') return DEFAULT_FILENAME
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition)
  const filename = match?.[1]?.trim()
  return filename?.toLowerCase().endsWith('.xlsx') ? filename : DEFAULT_FILENAME
}

function responseRowCount(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

export async function fetchStudyExportOptions(): Promise<StudyExportOptions> {
  const { data } = await axiosInstance.get<StudyExportOptions>(r(endpoints.study.caseExportOptions))
  return data
}

export async function fetchStudyExportWorkbook(
  selection: StudyExportSelection
): Promise<StudyExportDownload> {
  const response = await axiosInstance.get<Blob>(r(endpoints.study.caseExportXlsx), {
    params: buildStudyExportQuery(selection),
    responseType: 'blob',
    headers: { Accept: XLSX_MIME }
  })
  return {
    blob: response.data,
    filename: responseFilename(response.headers['content-disposition']),
    rowCount: responseRowCount(response.headers['x-export-row-count'])
  }
}
