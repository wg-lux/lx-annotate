import axiosInstance, { r } from '@/api/axiosInstance'
import { buildStudyCohortPreviewQuery } from '@/api/studyApi'
import type { StudyCohortPreviewFilters, StudyCohortPreviewResponse } from '@/api/studyApi'

export interface SavedStudyCohort {
  id: number
  name: string
  hypothesis: string
  filters: StudyCohortPreviewFilters
  datasetIds: number[]
  updatedAt: string
}

export interface StudyCohortDefinition {
  name: string
  hypothesis: string
  filters: StudyCohortPreviewFilters
  datasetIds: number[]
}

const path = 'media/studies/cohorts/'
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
    filters: buildStudyCohortPreviewQuery(definition.filters)
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
