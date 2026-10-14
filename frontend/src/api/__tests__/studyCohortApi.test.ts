import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchStudyCohorts,
  fetchStudyDefinition,
  linkDatasetStudyCohort,
  previewStudyCohort,
  saveStudyCohort
} from '@/api/studyCohortApi'

const axios = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: axios,
  r: (path: string) => `/endoreg-api/${path}`
}))

describe('saved cohort API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    axios.get.mockResolvedValue({ data: [] })
    axios.post.mockResolvedValue({ data: { id: 3 } })
    axios.put.mockResolvedValue({ data: { id: 3 } })
  })

  const definition = {
    name: 'Study',
    hypothesis: 'Hypothesis',
    datasetIds: [1, 2],
    filters: { hasVideo: false, centerKey: ' center ' }
  }
  const payload = {
    name: 'Study',
    hypothesis: 'Hypothesis',
    dataset_ids: [1, 2],
    filters: { has_video: false, center_key: 'center' }
  }

  it('persists the same definition for create, update and cancellable preview', async () => {
    const controller = new AbortController()
    await saveStudyCohort(definition)
    expect(axios.post).toHaveBeenCalledWith('/endoreg-api/media/studies/cohorts/', payload)
    await saveStudyCohort(definition, 3)
    expect(axios.put).toHaveBeenCalledWith('/endoreg-api/media/studies/cohorts/3/', payload)
    await previewStudyCohort(definition, controller.signal)
    expect(axios.post).toHaveBeenCalledWith(
      '/endoreg-api/media/studies/cohorts/preview/',
      payload,
      { signal: controller.signal }
    )
  })

  it('reloads saved cohorts and changes only one dataset/cohort relation', async () => {
    await fetchStudyCohorts()
    expect(axios.get).toHaveBeenCalledWith('/endoreg-api/media/studies/cohorts/')
    await linkDatasetStudyCohort(7, 3, false)
    expect(axios.post).toHaveBeenCalledWith(
      '/endoreg-api/settings/application/ai_datasets/7/study_cohorts/',
      { cohort_id: 3, linked: false }
    )
  })

  it('downloads YAML as a blob with DRF-compatible content negotiation', async () => {
    const blob = new Blob(['schema_version: "1.0"'], { type: 'application/yaml' })
    axios.get.mockResolvedValue({ data: blob })
    expect(await fetchStudyDefinition(3)).toBe(blob)
    expect(axios.get).toHaveBeenCalledWith('/endoreg-api/media/studies/cohorts/3/definition/', {
      responseType: 'blob',
      headers: { Accept: 'application/json' }
    })
  })

  it('serializes protocol metadata without losing zero, null or version alternatives', async () => {
    await saveStudyCohort({
      ...definition,
      studyMetadata: {
        participatingCenters: [{ centerKey: 'center-a', name: 'Center A' }],
        ageGroups: [{ name: 'All ages', minimumAge: 0, maximumAge: null }],
        terminologyRequirements: [
          { module: 'research', version: '1.0.0' },
          { module: 'research', version: '2.0.0' }
        ],
        inclusionCriteria: [
          {
            name: 'Finding',
            description: '',
            concepts: [
              { module: 'research', version: '1.0.0', kind: 'finding', name: 'polyp' },
              { module: 'research', version: '2.0.0', kind: 'finding', name: 'polyp' }
            ]
          }
        ]
      }
    })
    expect(axios.post).toHaveBeenCalledWith('/endoreg-api/media/studies/cohorts/', {
      ...payload,
      study_metadata: {
        participating_centers: [{ center_key: 'center-a', name: 'Center A' }],
        age_groups: [{ name: 'All ages', minimum_age: 0, maximum_age: null }],
        terminology_requirements: [
          { module: 'research', version: '1.0.0' },
          { module: 'research', version: '2.0.0' }
        ],
        inclusion_criteria: [
          {
            name: 'Finding',
            description: '',
            concepts: [
              { module: 'research', version: '1.0.0', kind: 'finding', name: 'polyp' },
              { module: 'research', version: '2.0.0', kind: 'finding', name: 'polyp' }
            ]
          }
        ]
      }
    })
  })
})
