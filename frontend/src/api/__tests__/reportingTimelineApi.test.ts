import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/api/${path}`
}))

import {
  fetchPatientTimeline,
  fetchPatientTimelineLatest,
  pickPreferredStream
} from '@/api/reportingTimelineApi'

const TIMELINE_PATIENT_ID = 42
const PATIENT_EXAMINATION_ID = 314

const timelinePatient = {
  id: TIMELINE_PATIENT_ID,
  firstName: 'Ada',
  lastName: 'Lovelace',
  dob: '1815-12-10',
  isRealPerson: true,
  patientHash: null
}

describe('reportingTimelineApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers processed stream and falls back to raw', () => {
    expect(
      pickPreferredStream([
        { type: 'raw', url: '/raw' },
        { type: 'processed', url: '/processed' }
      ])
    ).toBe('/processed')

    expect(pickPreferredStream([{ type: 'raw', url: '/raw' }])).toBe('/raw')
    expect(pickPreferredStream([])).toBeNull()
  })

  it('requests latest_only timeline with optional patient_examination_id', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: {
        patient: timelinePatient,
        latestReport: null,
        latestVideo: null,
        latestFrames: []
      }
    })

    await fetchPatientTimelineLatest({
      patientId: TIMELINE_PATIENT_ID,
      patientExaminationId: PATIENT_EXAMINATION_ID
    })

    expect(hoisted.axios.get).toHaveBeenCalledWith(
      `/api/${endpoints.media.patientTimeline(TIMELINE_PATIENT_ID)}`,
      {
        params: {
          latest_only: true,
          patient_examination_id: PATIENT_EXAMINATION_ID
        }
      }
    )
  })

  it('requests the complete patient timeline without latest_only', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: { patient: timelinePatient, count: 0, results: [] }
    })

    await fetchPatientTimeline(TIMELINE_PATIENT_ID)

    expect(hoisted.axios.get).toHaveBeenCalledWith(
      `/api/${endpoints.media.patientTimeline(TIMELINE_PATIENT_ID)}`,
      { params: undefined }
    )
  })

  it('requests every document occurrence for one examination', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: { patient: timelinePatient, count: 0, results: [] }
    })

    await fetchPatientTimeline(TIMELINE_PATIENT_ID, PATIENT_EXAMINATION_ID)

    expect(hoisted.axios.get).toHaveBeenCalledWith(
      `/api/${endpoints.media.patientTimeline(TIMELINE_PATIENT_ID)}`,
      { params: { patient_examination_id: PATIENT_EXAMINATION_ID } }
    )
  })

  it('preserves future media kinds after validating timeline items', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: {
        patient: timelinePatient,
        count: 1,
        results: [
          {
            mediaType: 'future_document_kind',
            id: 91,
            timestamp: null,
            examinationDate: null,
            documentType: null,
            fileName: null,
            patientExaminationId: null
          }
        ]
      }
    })

    const result = await fetchPatientTimeline(TIMELINE_PATIENT_ID)

    expect(result.results[0]?.mediaType).toBe('future_document_kind')
  })

  it('rejects non-string media kinds at the timeline boundary', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: {
        patient: timelinePatient,
        count: 1,
        results: [
          {
            mediaType: 91,
            id: 91,
            timestamp: null,
            examinationDate: null,
            documentType: null,
            fileName: null,
            patientExaminationId: null
          }
        ]
      }
    })

    await expect(fetchPatientTimeline(TIMELINE_PATIENT_ID)).rejects.toThrow(
      'Patient timeline response does not match the expected contract'
    )
  })
})
