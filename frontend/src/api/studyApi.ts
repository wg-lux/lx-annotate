import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface StudyCohortPreviewFilters {
  dateFrom?: string | null
  dateTo?: string | null
  centerKey?: string | null
  examinationName?: string | null
  documentType?: string | null
  finding?: string | null
  annotationLabel?: string | null
  hasReport?: boolean | null
  hasVideo?: boolean | null
  limit?: number | null
}

export interface StudyCohortSummary {
  caseCount: number
  patientCount: number
  reportCount: number
  videoCount: number
}

export interface StudyCohortReport {
  id: number
  documentType: string | null
  streamUrl: string | null
  availability: string
}

export interface StudyCohortVideo {
  id: number
  streamUrl: string | null
  availability: string
}

export interface StudyCohortCase {
  patientExaminationId: number
  caseHash: string
  patientHash: string
  examinationName: string | null
  examinationDate: string | null
  centerKeys: string[]
  findings: string[]
  annotationLabels: string[]
  reports: StudyCohortReport[]
  videos: StudyCohortVideo[]
}

export interface StudyCohortCenterOption {
  key: string
  label: string
}

export interface StudyCohortOptions {
  centers: StudyCohortCenterOption[]
  examinations: string[]
  documentTypes: string[]
  findings: string[]
  annotationLabels: string[]
}

export interface StudyCohortPreviewResponse {
  schemaVersion: string
  filters: StudyCohortPreviewFilters
  summary: StudyCohortSummary
  cases: StudyCohortCase[]
  options: StudyCohortOptions
}

export interface StudyCohortPreviewQuery {
  date_from?: string
  date_to?: string
  center_key?: string
  examination_name?: string
  document_type?: string
  finding?: string
  annotation_label?: string
  has_report?: boolean
  has_video?: boolean
  limit?: number
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

export function buildStudyCohortPreviewQuery(
  filters: StudyCohortPreviewFilters
): StudyCohortPreviewQuery {
  const query: StudyCohortPreviewQuery = {}
  const dateFrom = nonEmpty(filters.dateFrom)
  const dateTo = nonEmpty(filters.dateTo)
  const centerKey = nonEmpty(filters.centerKey)
  const examinationName = nonEmpty(filters.examinationName)
  const documentType = nonEmpty(filters.documentType)
  const finding = nonEmpty(filters.finding)
  const annotationLabel = nonEmpty(filters.annotationLabel)

  if (dateFrom) query.date_from = dateFrom
  if (dateTo) query.date_to = dateTo
  if (centerKey) query.center_key = centerKey
  if (examinationName) query.examination_name = examinationName
  if (documentType) query.document_type = documentType
  if (finding) query.finding = finding
  if (annotationLabel) query.annotation_label = annotationLabel
  if (typeof filters.hasReport === 'boolean') query.has_report = filters.hasReport
  if (typeof filters.hasVideo === 'boolean') query.has_video = filters.hasVideo
  if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
    query.limit = Math.trunc(filters.limit)
  }

  return query
}

export async function fetchStudyCohortPreview(
  filters: StudyCohortPreviewFilters = {}
): Promise<StudyCohortPreviewResponse> {
  const { data } = await axiosInstance.get<StudyCohortPreviewResponse>(
    r(endpoints.study.cohortPreview),
    { params: buildStudyCohortPreviewQuery(filters) }
  )
  return data
}
