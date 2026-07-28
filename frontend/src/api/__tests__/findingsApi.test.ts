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
    hoisted.axios.post.mockResolvedValueOnce({ data: { id: 91, finding: 7 } })

    await findingsApi.createPatientFinding({
      patientExamination: 35,
      finding: 7,
      classifications: [{ classification: 11, choice: 44 }]
    })

    expect(hoisted.axios.post).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      patient_examination: 35,
      finding: 7,
      classifications: [{ classification: 11, choice: 44 }]
    })
  })

  it('uses dtypes patient-findings endpoint directly by default', async () => {
    hoisted.axios.post.mockResolvedValue({ data: { id: 101, finding: 6 } })

    await findingsApi.createPatientFinding({
      patientExamination: 88,
      finding: 6,
      classifications: [{ classification: 5, choice: 9 }]
    })

    expect(hoisted.axios.post).toHaveBeenCalledTimes(1)
    expect(hoisted.axios.post).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      patient_examination: 88,
      finding: 6,
      classifications: [{ classification: 5, choice: 9 }]
    })
  })

  it('lists patient findings through dtypes by default', async () => {
    hoisted.axios.get.mockResolvedValue({ data: [] })

    await findingsApi.listPatientFindings(42)

    expect(hoisted.axios.get).toHaveBeenCalledWith('/dtypes-api/patient-findings/', {
      params: { patient_examination: 42 }
    })
  })

  it('maps structured backend errors to typed client errors', () => {
    const parsed = parseFindingsApiError({
      response: {
        status: 400,
        data: {
          code: 'duplicate-finding',
          message: 'Finding already exists.'
        }
      }
    })

    expect(parsed.code).toBe('duplicate-finding')
    expect(parsed.message).toContain('Finding already exists')
    expect(parsed.status).toBe(400)
  })
})
