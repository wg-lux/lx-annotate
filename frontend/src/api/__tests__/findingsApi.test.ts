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

const SIZE_CLASSIFICATION_ID = 5
const POLYP_FINDING_ID = 6
const SMALL_CHOICE_ID = 9
const CATALOG_EXAMINATION_ID = 12
const LIST_PATIENT_EXAMINATION_ID = 42
const PATIENT_EXAMINATION_ID = 88
const PATIENT_FINDING_ID = 101
const CONTEXT_PATIENT_EXAMINATION_ID = 168

function choicePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SMALL_CHOICE_ID,
    name: 'small',
    ...overrides
  }
}

function classificationPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SIZE_CLASSIFICATION_ID,
    name: 'size',
    required: true,
    classificationTypes: ['morphology'],
    choices: [choicePayload()],
    ...overrides
  }
}

function findingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: POLYP_FINDING_ID,
    name: 'polyp',
    classifications: [classificationPayload()],
    locationClassifications: [],
    morphologyClassifications: [],
    ...overrides
  }
}

function patientFindingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PATIENT_FINDING_ID,
    patientExamination: PATIENT_EXAMINATION_ID,
    finding: POLYP_FINDING_ID,
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
    await findingsApi.getExaminationFindings(CATALOG_EXAMINATION_ID)
    expect(hoisted.axios.get).toHaveBeenLastCalledWith('/dtypes-api/examinations/12/findings/')
  })

  it('scopes catalog reads to one exact knowledge-base identity and patient examination', async () => {
    hoisted.axios.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { choices: [] } })
    const context = {
      moduleName: 'dgvs_reporting',
      moduleVersion: '0.1.0',
      patientExaminationId: CONTEXT_PATIENT_EXAMINATION_ID
    }

    await findingsApi.getExaminationFindings(CATALOG_EXAMINATION_ID, context)
    await findingsApi.getFindingClassifications(POLYP_FINDING_ID, context)
    await findingsApi.getClassificationChoices(SIZE_CLASSIFICATION_ID, context)

    const config = {
      params: {
        module_name: 'dgvs_reporting',
        module_version: '0.1.0',
        patient_examination_id: CONTEXT_PATIENT_EXAMINATION_ID
      }
    }
    expect(hoisted.axios.get).toHaveBeenNthCalledWith(
      1,
      '/dtypes-api/examinations/12/findings/',
      config
    )
    expect(hoisted.axios.get).toHaveBeenNthCalledWith(
      2,
      '/dtypes-api/findings/6/classifications/',
      config
    )
    expect(hoisted.axios.get).toHaveBeenNthCalledWith(
      3,
      '/dtypes-api/classifications/5/choices/',
      config
    )
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
      patientExamination: PATIENT_EXAMINATION_ID,
      finding: POLYP_FINDING_ID,
      classifications: [{ classification: SIZE_CLASSIFICATION_ID, choice: SMALL_CHOICE_ID }]
    })

    expect(hoisted.axios.post).toHaveBeenCalledTimes(1)
    expect(hoisted.axios.post).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      patientExamination: PATIENT_EXAMINATION_ID,
      finding: POLYP_FINDING_ID,
      classifications: [{ classification: SIZE_CLASSIFICATION_ID, choice: SMALL_CHOICE_ID }]
    })
  })

  it('keeps query parameter spelling explicit because Axios body conversion does not transform params', async () => {
    hoisted.axios.get.mockResolvedValue({ data: [] })

    await findingsApi.listPatientFindings(LIST_PATIENT_EXAMINATION_ID)

    expect(hoisted.axios.get).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      params: { patient_examination: LIST_PATIENT_EXAMINATION_ID }
    })
  })

  it('accepts valid results envelopes and camel-cased nested records', async () => {
    hoisted.axios.get.mockResolvedValue({ data: { results: [findingPayload()] } })

    await expect(findingsApi.getExaminationFindings(CATALOG_EXAMINATION_ID)).resolves.toMatchObject(
      [{ id: POLYP_FINDING_ID, name: 'polyp' }]
    )
  })

  it('rejects malformed list envelopes instead of returning an empty collection', async () => {
    hoisted.axios.get.mockResolvedValue({ data: {} })

    await expect(findingsApi.getExaminationFindings(CATALOG_EXAMINATION_ID)).rejects.toThrowError(
      /findings\.results/
    )
  })

  it('rejects malformed nested finding identities and names', async () => {
    hoisted.axios.get.mockResolvedValue({ data: [findingPayload({ name: '' })] })

    await expect(findingsApi.getExaminationFindings(CATALOG_EXAMINATION_ID)).rejects.toThrowError(
      /findings\[0\]\.name/
    )
  })

  it('rejects malformed classification envelopes and nested required choices', async () => {
    hoisted.axios.get.mockResolvedValueOnce({ data: { unexpected: [] } }).mockResolvedValueOnce({
      data: [classificationPayload({ choices: [choicePayload({ id: 0 })] })]
    })

    await expect(findingsApi.getFindingClassifications(POLYP_FINDING_ID)).rejects.toThrowError(
      /Finding classifications response/
    )
    await expect(findingsApi.getFindingClassifications(POLYP_FINDING_ID)).rejects.toThrowError(
      /choices\[0\]\.id/
    )
  })

  it('rejects malformed choice envelopes and nested required names', async () => {
    hoisted.axios.get
      .mockResolvedValueOnce({ data: { choices: null } })
      .mockResolvedValueOnce({ data: { choices: [choicePayload({ name: ' ' })] } })

    await expect(findingsApi.getClassificationChoices(SIZE_CLASSIFICATION_ID)).rejects.toThrowError(
      /expected contract/
    )
    await expect(findingsApi.getClassificationChoices(SIZE_CLASSIFICATION_ID)).rejects.toThrowError(
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
                classification: SIZE_CLASSIFICATION_ID,
                classificationChoice: 0,
                subcategories: {},
                numericalDescriptors: {},
                isActive: true
              }
            ]
          })
        ]
      })

    await expect(findingsApi.listPatientFindings(LIST_PATIENT_EXAMINATION_ID)).rejects.toThrowError(
      /patientFindings/
    )
    await expect(findingsApi.listPatientFindings(LIST_PATIENT_EXAMINATION_ID)).rejects.toThrowError(
      /patientExamination/
    )
    await expect(findingsApi.listPatientFindings(LIST_PATIENT_EXAMINATION_ID)).rejects.toThrowError(
      /classificationChoice/
    )
  })

  it('rejects incomplete patient-finding write responses', async () => {
    hoisted.axios.post.mockResolvedValue({
      data: {
        id: PATIENT_FINDING_ID,
        finding: POLYP_FINDING_ID,
        isActive: true,
        classifications: []
      }
    })

    await expect(
      findingsApi.createPatientFinding({
        patientExamination: PATIENT_EXAMINATION_ID,
        finding: POLYP_FINDING_ID
      })
    ).rejects.toThrowError(/patientExamination/)
  })

  it('rejects invalid request identifiers and classification selections before dispatch', async () => {
    await expect(findingsApi.getExaminationFindings(0)).rejects.toThrowError(/positive integer/)
    await expect(
      findingsApi.getExaminationFindings(CATALOG_EXAMINATION_ID, {
        moduleName: '',
        moduleVersion: '0.1.0',
        patientExaminationId: CONTEXT_PATIENT_EXAMINATION_ID
      })
    ).rejects.toThrowError(/context\.moduleName/)
    await expect(
      findingsApi.createPatientFinding({
        patientExamination: PATIENT_EXAMINATION_ID,
        finding: POLYP_FINDING_ID,
        classifications: [{ classification: SIZE_CLASSIFICATION_ID, choice: 0 }]
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
