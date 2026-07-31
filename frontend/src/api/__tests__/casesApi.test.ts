import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/endoreg-api/${path}`
}))

import {
  attachCaseDocument,
  createCaseWithExamination,
  createPatientCase,
  fetchPatientCases,
  type PatientCase
} from '@/api/casesApi'

const patientCase: PatientCase = {
  id: 5,
  caseId: '0d7023f4-5124-4bd2-a4cc-0fcfe4ee295c',
  patient: 42,
  admissionDate: '2026-07-23T08:00:00Z',
  leaveDate: null,
  isActive: true,
  isClosed: false,
  isDeleted: false,
  patientExaminations: [{ id: 314 }],
  documents: [],
  patientMedications: [],
  patientMedicationSchedules: [],
  patientLabSamples: [],
  patientLabValues: []
}

describe('casesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches cases using the snake_case query contract', async () => {
    hoisted.axios.get.mockResolvedValue({ data: { results: [patientCase] } })

    const result = await fetchPatientCases({
      patientId: 42,
      patientExaminationId: 314
    })

    expect(hoisted.axios.get).toHaveBeenCalledWith('/endoreg-api/cases/', {
      params: {
        patient_id: 42,
        patient_examination_id: 314
      }
    })
    expect(result).toEqual([patientCase])
  })

  it('creates a case through the shared Axios boundary', async () => {
    hoisted.axios.post.mockResolvedValue({ data: patientCase })
    const payload = {
      patient: 42,
      admissionDate: '2026-07-23T08:00:00Z',
      patientExaminationIds: [314]
    }

    const result = await createPatientCase(payload)

    expect(hoisted.axios.post).toHaveBeenCalledWith('/endoreg-api/cases/', payload)
    expect(result).toBe(patientCase)
  })

  it('creates a case and its first examination atomically', async () => {
    const response = {
      case: patientCase,
      patientExamination: { id: 314 }
    }
    hoisted.axios.post.mockResolvedValue({ data: response })
    const payload = {
      admissionDate: '2026-07-23T08:00:00Z',
      patientExamination: {
        patient: 'patient-hash',
        examination: 'colonoscopy',
        dateStart: '2026-07-23',
        patientBirthDate: '1980-01-01',
        patientGender: 'female'
      }
    }

    const result = await createCaseWithExamination(payload)

    expect(hoisted.axios.post).toHaveBeenCalledWith(
      '/endoreg-api/cases/create-with-examination/',
      payload
    )
    expect(result).toBe(response)
  })

  it('attaches one existing document through the case-scoped API', async () => {
    hoisted.axios.post.mockResolvedValue({ data: patientCase })
    const payload = {
      mediaType: 'video' as const,
      mediaId: 88,
      patientExaminationId: 314
    }

    const result = await attachCaseDocument(patientCase.caseId, payload)

    expect(hoisted.axios.post).toHaveBeenCalledWith(
      `/endoreg-api/cases/${patientCase.caseId}/documents/`,
      payload
    )
    expect(result).toBe(patientCase)
  })
})
