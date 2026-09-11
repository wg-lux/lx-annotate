import axiosInstance, { r } from '@/api/axiosInstance'
import { buildStudyCohortPreviewQuery } from '@/api/studyApi'
import type {
  StudyCohortPreviewFilters,
  StudyCohortPreviewQuery,
  StudyCohortSummary
} from '@/api/studyApi'
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

export interface StudyCohortExportDefinition {
  studyName: string
  hypothesis: string
  schemaVersion: string
  filters: StudyCohortPreviewFilters
  summary: StudyCohortSummary
  patientExaminationIds: number[]
}

export interface StudyCohortExportPayload extends StudyCohortPreviewQuery {
  mode: 'cohort'
  group_by: 'patient'
  study_name: string
  hypothesis: string
  cohort_schema_version: string
  patient_examination_id: number[]
}

const DRF_NEGOTIATED_ACCEPT = 'application/json'
const DEFAULT_FILENAME = 'pseudonymous-study-cases.xlsx'

export function buildStudyExportQuery(selection: StudyExportSelection): URLSearchParams {
  const params = new URLSearchParams()
  params.set('group_by', selection.groupBy)
  for (const value of selection.examinations) params.append('examination', value)
  for (const value of selection.findings) params.append('finding', value)
  for (const value of selection.indications) params.append('indication', value)
  return params
}

export function buildStudyCohortExportPayload(
  definition: StudyCohortExportDefinition
): StudyCohortExportPayload {
  return {
    mode: 'cohort',
    group_by: 'patient',
    study_name: definition.studyName,
    hypothesis: definition.hypothesis,
    cohort_schema_version: definition.schemaVersion,
    patient_examination_id: [...definition.patientExaminationIds],
    ...buildStudyCohortPreviewQuery(definition.filters)
  }
}

function responseFilename(contentDisposition: unknown): string {
  if (typeof contentDisposition !== 'string') {
    return DEFAULT_FILENAME
  }
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
    // DRF negotiates the request before the view returns its binary HttpResponse.
    // Accept JSON so both JSON errors and the XLSX response reach the view.
    headers: { Accept: DRF_NEGOTIATED_ACCEPT }
  })
  return {
    blob: response.data,
    filename: responseFilename(response.headers['content-disposition']),
    rowCount: responseRowCount(response.headers['x-export-row-count'])
  }
}

export async function fetchStudyCohortExportWorkbook(
  definition: StudyCohortExportDefinition
): Promise<StudyExportDownload> {
  const response = await axiosInstance.post<Blob>(
    r(endpoints.study.caseExportXlsx),
    buildStudyCohortExportPayload(definition),
    {
      responseType: 'blob',
      headers: { Accept: DRF_NEGOTIATED_ACCEPT }
    }
  )
  return {
    blob: response.data,
    filename: responseFilename(response.headers['content-disposition']),
    rowCount: responseRowCount(response.headers['x-export-row-count'])
  }
}
