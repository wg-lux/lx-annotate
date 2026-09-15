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

export interface StudyCohortExamination {
  patientExaminationId: number
  caseHash: string
  examinationName: string
  examinationDate: string | null
}

export interface StudyCohortCase {
  patientExaminationId: number
  patientExaminationIds: number[]
  caseHash: string
  caseHashes: string[]
  patientHash: string
  examinationName: string | null
  examinationDate: string | null
  examinations: StudyCohortExamination[]
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

type StudyCohortStringQueryKey =
  | 'date_from'
  | 'date_to'
  | 'center_key'
  | 'examination_name'
  | 'document_type'
  | 'finding'
  | 'annotation_label'

function assignNonEmptyQueryValue(
  query: StudyCohortPreviewQuery,
  key: StudyCohortStringQueryKey,
  value: string | null | undefined
): void {
  const normalized = nonEmpty(value)
  if (normalized) {
    query[key] = normalized
  }
}

export function buildStudyCohortPreviewQuery(
  filters: StudyCohortPreviewFilters
): StudyCohortPreviewQuery {
  const query: StudyCohortPreviewQuery = {}
  assignNonEmptyQueryValue(query, 'date_from', filters.dateFrom)
  assignNonEmptyQueryValue(query, 'date_to', filters.dateTo)
  assignNonEmptyQueryValue(query, 'center_key', filters.centerKey)
  assignNonEmptyQueryValue(query, 'examination_name', filters.examinationName)
  assignNonEmptyQueryValue(query, 'document_type', filters.documentType)
  assignNonEmptyQueryValue(query, 'finding', filters.finding)
  assignNonEmptyQueryValue(query, 'annotation_label', filters.annotationLabel)
  if (typeof filters.hasReport === 'boolean') {
    query.has_report = filters.hasReport
  }
  if (typeof filters.hasVideo === 'boolean') {
    query.has_video = filters.hasVideo
  }
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
