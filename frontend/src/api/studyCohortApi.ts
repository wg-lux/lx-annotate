import axiosInstance, { r } from '@/api/axiosInstance'
import { buildStudyCohortPreviewQuery } from '@/api/studyApi'
import type { StudyCohortPreviewFilters, StudyCohortPreviewResponse } from '@/api/studyApi'

export interface StudyConceptReference {
  module: string
  version: string
  kind: 'examination' | 'finding'
  name: string
}

export interface StudyMetadata {
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
  signal?: AbortSignal
): Promise<StudyCohortPreviewResponse> {
  const { data } = await axiosInstance.post<StudyCohortPreviewResponse>(
    r(`${path}preview/`),
    payload(definition),
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
