import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  endoregApi: (path: string) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}))

import { findingsApi, parseFindingsApiError } from '@/api/findingsApi'

function choicePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 9,
    name: 'small',
    ...overrides
  }
}

function classificationPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 5,
    name: 'size',
    required: true,
    classificationTypes: ['morphology'],
    choices: [choicePayload()],
    ...overrides
  }
}

function findingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 6,
    name: 'polyp',
    classifications: [classificationPayload()],
    locationClassifications: [],
    morphologyClassifications: [],
    ...overrides
  }
}

function patientFindingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 101,
    patientExamination: 88,
    finding: 6,
    isActive: true,
    classifications: [],
    ...overrides
  }
}

describe('findingsApi canonical routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('always routes examination findings through the canonical dtypes API', async () => {
    hoisted.axios.get.mockResolvedValue({ data: [] })

    vi.stubEnv('VITE_FINDINGS_BACKEND', 'endoreg')
    await findingsApi.getExaminationFindings(12)
    expect(hoisted.axios.get).toHaveBeenLastCalledWith('/dtypes-api/examinations/12/findings/')
  })

  it('ignores obsolete rollback flags for patient-finding writes', async () => {
    vi.stubEnv('VITE_FINDINGS_BACKEND', 'endoreg')
    hoisted.axios.post.mockResolvedValueOnce({
      data: patientFindingPayload({ id: 91, patientExamination: 35, finding: 7 })
    })

    await findingsApi.createPatientFinding({
      patientExamination: 35,
      finding: 7,
      classifications: [{ classification: 11, choice: 44 }]
    })

    expect(hoisted.axios.post).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      patientExamination: 35,
      finding: 7,
      classifications: [{ classification: 11, choice: 44 }]
    })
  })

  it('uses dtypes patient-findings endpoint directly by default', async () => {
    hoisted.axios.post.mockResolvedValue({ data: patientFindingPayload() })

    await findingsApi.createPatientFinding({
      patientExamination: 88,
      finding: 6,
      classifications: [{ classification: 5, choice: 9 }]
    })

    expect(hoisted.axios.post).toHaveBeenCalledTimes(1)
    expect(hoisted.axios.post).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      patientExamination: 88,
      finding: 6,
      classifications: [{ classification: 5, choice: 9 }]
    })
  })

  it('keeps query parameter spelling explicit because Axios body conversion does not transform params', async () => {
    hoisted.axios.get.mockResolvedValue({ data: [] })

    await findingsApi.listPatientFindings(42)

    expect(hoisted.axios.get).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      params: { patient_examination: 42 }
    })
  })

  it('accepts valid results envelopes and camel-cased nested records', async () => {
    hoisted.axios.get.mockResolvedValue({ data: { results: [findingPayload()] } })

    await expect(findingsApi.getExaminationFindings(12)).resolves.toMatchObject([
      { id: 6, name: 'polyp' }
    ])
  })

  it('rejects malformed list envelopes instead of returning an empty collection', async () => {
    hoisted.axios.get.mockResolvedValue({ data: {} })

    await expect(findingsApi.getExaminationFindings(12)).rejects.toThrowError(/findings\.results/)
  })

  it('rejects malformed nested finding identities and names', async () => {
    hoisted.axios.get.mockResolvedValue({ data: [findingPayload({ name: '' })] })

    await expect(findingsApi.getExaminationFindings(12)).rejects.toThrowError(/findings\[0\]\.name/)
  })

  it('rejects malformed classification envelopes and nested required choices', async () => {
    hoisted.axios.get.mockResolvedValueOnce({ data: { unexpected: [] } }).mockResolvedValueOnce({
      data: [classificationPayload({ choices: [choicePayload({ id: 0 })] })]
    })

    await expect(findingsApi.getFindingClassifications(6)).rejects.toThrowError(
      /Finding classifications response/
    )
    await expect(findingsApi.getFindingClassifications(6)).rejects.toThrowError(/choices\[0\]\.id/)
  })

  it('rejects malformed choice envelopes and nested required names', async () => {
    hoisted.axios.get
      .mockResolvedValueOnce({ data: { choices: null } })
      .mockResolvedValueOnce({ data: { choices: [choicePayload({ name: ' ' })] } })

    await expect(findingsApi.getClassificationChoices(5)).rejects.toThrowError(/expected contract/)
    await expect(findingsApi.getClassificationChoices(5)).rejects.toThrowError(
      /classificationChoices\[0\]\.name/
    )
  })

  it('rejects malformed patient-finding envelopes and nested required relationships', async () => {
    hoisted.axios.get
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: [patientFindingPayload({ patientExamination: 0 })] })
      .mockResolvedValueOnce({
        data: [
          patientFindingPayload({
            classifications: [
              {
                id: 1,
                classification: 5,
                classificationChoice: 0,
                subcategories: {},
                numericalDescriptors: {},
                isActive: true
              }
            ]
          })
        ]
      })

    await expect(findingsApi.listPatientFindings(42)).rejects.toThrowError(/patientFindings/)
    await expect(findingsApi.listPatientFindings(42)).rejects.toThrowError(/patientExamination/)
    await expect(findingsApi.listPatientFindings(42)).rejects.toThrowError(/classificationChoice/)
  })

  it('rejects incomplete patient-finding write responses', async () => {
    hoisted.axios.post.mockResolvedValue({
      data: { id: 101, finding: 6, isActive: true, classifications: [] }
    })

    await expect(
      findingsApi.createPatientFinding({ patientExamination: 88, finding: 6 })
    ).rejects.toThrowError(/patientExamination/)
  })

  it('rejects invalid request identifiers and classification selections before dispatch', async () => {
    await expect(findingsApi.getExaminationFindings(0)).rejects.toThrowError(/positive integer/)
    await expect(
      findingsApi.createPatientFinding({
        patientExamination: 88,
        finding: 6,
        classifications: [{ classification: 5, choice: 0 }]
      })
    ).rejects.toThrowError(/classifications\[0\]\.choice/)
    expect(hoisted.axios.get).not.toHaveBeenCalled()
    expect(hoisted.axios.post).not.toHaveBeenCalled()
  })

  it('maps only recognized structured backend error codes to typed client errors', () => {
    const parsed = parseFindingsApiError({
      response: {
        status: 400,
        data: {
          code: 'duplicate-finding',
          message: 'Finding already exists.'
        }
      }
    })
    const unknownCode = parseFindingsApiError({
      response: {
        status: 503,
        data: { code: 'future-untrusted-code', message: 'Unavailable.' }
      }
    })

    expect(parsed.code).toBe('duplicate-finding')
    expect(parsed.message).toContain('Finding already exists')
    expect(parsed.status).toBe(400)
    expect(unknownCode.code).toBe('unknown')
  })
})
