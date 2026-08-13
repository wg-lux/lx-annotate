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

  it('preserves canonical examination translations for frontend labels', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: {
        results: [
          {
            ...patientCase,
            patientExaminations: [
              {
                id: 314,
                examination: {
                  id: 9,
                  name: 'colonoscopy',
                  nameDe: 'Koloskopie',
                  nameEn: 'Colonoscopy'
                }
              }
            ]
          }
        ]
      }
    })

    const result = await fetchPatientCases({ patientId: 42 })

    expect(result[0]?.patientExaminations[0]?.examination).toEqual({
      id: 9,
      name: 'colonoscopy',
      nameDe: 'Koloskopie',
      nameEn: 'Colonoscopy'
    })
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
    expect(result).toEqual(patientCase)
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
        dateStart: '2026-07-23'
      }
    }

    const result = await createCaseWithExamination(payload)

    expect(hoisted.axios.post).toHaveBeenCalledWith(
      '/endoreg-api/cases/create-with-examination/',
      payload
    )
    expect(result).toEqual(response)
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
    expect(result).toEqual(patientCase)
  })

  it('preserves future document media kinds after validating the wire shape', async () => {
    const document = {
      mediaType: 'future_document_kind',
      id: 88,
      patientExaminationId: 314,
      occurrenceAt: '2026-07-23T08:00:00Z'
    }
    hoisted.axios.get.mockResolvedValue({
      data: { results: [{ ...patientCase, documents: [document] }] }
    })

    const result = await fetchPatientCases({ patientId: 42 })

    expect(result[0]?.documents[0]?.mediaType).toBe('future_document_kind')
  })

  it('rejects non-string document media kinds at the API boundary', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: {
        results: [
          {
            ...patientCase,
            documents: [
              {
                mediaType: 7,
                id: 88,
                patientExaminationId: 314,
                occurrenceAt: '2026-07-23T08:00:00Z'
              }
            ]
          }
        ]
      }
    })

    await expect(fetchPatientCases({ patientId: 42 })).rejects.toThrow(
      'cases[0].documents[0].mediaType'
    )
  })
})
