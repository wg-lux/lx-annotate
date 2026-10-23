import axiosInstance, { r } from '@/api/axiosInstance'
import { buildStudyCohortPreviewQuery } from '@/api/studyApi'
import type { StudyCohortPreviewFilters, StudyCohortPreviewResponse } from '@/api/studyApi'

export interface StudyConceptReference {
  module: string
  version: string
  kind: 'examination' | 'finding'
  name: string
}

/** Mirrors lx_dtypes StudyAnalysisDefinition; evaluation remains server-owned. */
export interface StudyPredicate {
  role: 'index' | 'polyp' | 'previous_follow_up' | 'follow_up'
  classification: string
  descriptor?: string | null
  operator: 'eq' | 'ne' | 'ge' | 'gt' | 'le' | 'lt' | 'in' | 'present'
  value?: string | number | boolean | string[] | null
}
export interface StudyRule {
  mode: 'all' | 'any'
  predicates: StudyPredicate[]
}
export interface StudyAnalysisDefinition {
  schemaVersion: '1'
  name: string
  module: string
  version: string
  unitFinding: string
  status: 'draft' | 'ready'
  unresolvedRequirements: string[]
  inclusion: StudyRule | null
  groups: { name: string; rule: StudyRule }[]
  endpoints: {
    name: string
    positive: StudyRule
    negative: StudyRule
    eligible?: StudyRule | null
  }[]
}

export interface StudyMetadata {
  analysisDefinitions?: StudyAnalysisDefinition[]
  participatingCenters: { centerKey: string; name: string }[]
  ageGroups: { name: string; minimumAge: number; maximumAge: number | null }[]
  terminologyRequirements: { module: string; version: string }[]
  inclusionCriteria: { name: string; description: string; concepts: StudyConceptReference[] }[]
}

export function emptyStudyMetadata(): StudyMetadata {
  return {
    participatingCenters: [],
    ageGroups: [],
    terminologyRequirements: [],
    inclusionCriteria: []
  }
}

function metadataPayload(metadata: StudyMetadata) {
  return {
    ...(metadata.analysisDefinitions ? { analysis_definitions: metadata.analysisDefinitions } : {}),
    participating_centers: metadata.participatingCenters.map((center) => ({
      center_key: center.centerKey,
      name: center.name
    })),
    age_groups: metadata.ageGroups.map((group) => ({
      name: group.name,
      minimum_age: group.minimumAge,
      maximum_age: group.maximumAge
    })),
    terminology_requirements: metadata.terminologyRequirements,
    inclusion_criteria: metadata.inclusionCriteria
  }
}

export interface SavedStudyCohort {
  id: number
  name: string
  hypothesis: string
  filters: StudyCohortPreviewFilters
  datasetIds: number[]
  updatedAt: string
  studyMetadata?: StudyMetadata
}

export interface StudyCohortDefinition {
  name: string
  hypothesis: string
  filters: StudyCohortPreviewFilters
  datasetIds: number[]
  studyMetadata?: StudyMetadata
}

const path = 'media/studies/cohorts/'

export async function fetchStudyDefinition(id: number): Promise<Blob> {
  const { data } = await axiosInstance.get<Blob>(r(`${path}${String(id)}/definition/`), {
    responseType: 'blob',
    headers: { Accept: 'application/json' }
  })
  return data
}
const datasetPath = (id: number | string) =>
  `settings/application/ai_datasets/${String(id)}/study_cohorts/`

export async function fetchStudyCohorts(): Promise<SavedStudyCohort[]> {
  const { data } = await axiosInstance.get<SavedStudyCohort[]>(r(path))
  return data
}

function payload(definition: StudyCohortDefinition) {
  return {
    name: definition.name,
    hypothesis: definition.hypothesis,
    dataset_ids: definition.datasetIds,
    filters: buildStudyCohortPreviewQuery(definition.filters),
    ...(definition.studyMetadata
      ? { study_metadata: metadataPayload(definition.studyMetadata) }
      : {})
  }
}

export async function saveStudyCohort(
  definition: StudyCohortDefinition,
  id?: number
): Promise<SavedStudyCohort> {
  const response =
    id === undefined
      ? await axiosInstance.post<SavedStudyCohort>(r(path), payload(definition))
      : await axiosInstance.put<SavedStudyCohort>(r(`${path}${String(id)}/`), payload(definition))
  return response.data
}

export async function previewStudyCohort(
  definition: StudyCohortDefinition,
  signal?: AbortSignal,
  cohort_id?: number
): Promise<StudyCohortPreviewResponse> {
  const { data } = await axiosInstance.post<StudyCohortPreviewResponse>(
    r(`${path}preview/`),
    { ...payload(definition), ...(cohort_id === undefined ? {} : { cohort_id }) },
    { signal }
  )
  return data
}

export async function linkDatasetStudyCohort(
  datasetId: number | string,
  cohortId: number,
  linked: boolean
): Promise<SavedStudyCohort> {
  const { data } = await axiosInstance.post<SavedStudyCohort>(r(datasetPath(datasetId)), {
    cohort_id: cohortId,
    linked
  })
  return data
}

export interface StudyDatasetStatistics {
  schemaVersion: '1'
  analysisName: string
  packageMismatchRecordCount: number
  analysisDigest: string
  module: string
  version: string
  method: 'descriptive_binary_rates'
  totalRecords: number
  totalUnits: number
  includedUnits: number
  excludedUnits: number
  inclusionUnknown: number
  unassignedUnits: number
  ambiguousUnits: number
  endpoints: {
    group: string
    endpoint: string
    numerator: number
    denominator: number
    negative: number
    missing: number
    ineligible: number
    eligibilityUnknown: number
    conflicting: number
    rate: number | null
  }[]
}
export interface StudyStatisticsResponse {
  datasetVideoCount: number
  missingExaminationVideoCount: number
  conflictingPatientVideoCount: number
  datasetExaminationCount: number
  evaluatedExaminationCount: number
  missingRecordCount: number
  analyses: StudyDatasetStatistics[]
  skippedAnalyses: { analysisName: string; reason: 'draft'; unresolvedRequirements: string[] }[]
}
export async function fetchStudyStatistics(
  id: number,
  signal?: AbortSignal
): Promise<StudyStatisticsResponse> {
  const { data } = await axiosInstance.post<StudyStatisticsResponse>(
    r(`${path}${String(id)}/statistics/`),
    {},
    { signal }
  )
  return data
}

export interface StudyCaptureCoverage {
  examinations: number
  coveredExaminations: number
  missingCollections: number
}
export async function studyCaptureCoverage(cohortId: number, capture = false): Promise<StudyCaptureCoverage> {
  const url = r(`media/studies/cohorts/${String(cohortId)}/capture/`)
  return capture ? (await axiosInstance.post<StudyCaptureCoverage>(url, {})).data : (await axiosInstance.get<StudyCaptureCoverage>(url)).data
}
