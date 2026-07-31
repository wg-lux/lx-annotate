import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/endoreg-api/${path}`,
  silentRequestConfig: () => ({ suppressErrorToast: true })
}))

import { patientService } from '@/api/patientService'

const medicationRecord = {
  uuid: 'medication-21',
  externalIds: { endoregDb: 'PatientMedication:21' },
  createdAt: '2026-07-29T10:00:00Z',
  patient: '7',
  medicationIndication: null,
  medication: 'mesalazine',
  intakeTimes: ['daily-morning'],
  unit: 'milligram',
  dosage: { morning: 500 },
  active: true
}

describe('patientService medical ledger writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and patches medication records through patient-scoped routes', async () => {
    hoisted.axios.post.mockResolvedValue({ data: medicationRecord })
    hoisted.axios.patch.mockResolvedValue({
      data: { ...medicationRecord, active: false }
    })

    const createPayload = {
      medication: 'mesalazine',
      intakeTimes: ['daily-morning'],
      unit: 'milligram',
      dosage: { morning: 500 }
    }
    await patientService.createMedication(7, createPayload)
    await patientService.updateMedication(7, 21, { active: false })

    expect(hoisted.axios.post).toHaveBeenCalledWith(
      '/endoreg-api/patients/7/medications/',
      createPayload
    )
    expect(hoisted.axios.patch).toHaveBeenCalledWith(
      '/endoreg-api/patients/7/medications/21/',
      { active: false }
    )
  })

  it('creates and patches schedule membership through patient-scoped routes', async () => {
    const schedule = {
      uuid: 'schedule-31',
      externalIds: { endoregDb: 'PatientMedicationSchedule:31' },
      createdAt: '2026-07-29T10:00:00Z',
      scheduleCreatedAt: '2026-07-29T10:00:00Z',
      updatedAt: '2026-07-29T10:00:00Z',
      patient: '7',
      medications: [medicationRecord]
    }
    hoisted.axios.post.mockResolvedValue({ data: schedule })
    hoisted.axios.patch.mockResolvedValue({ data: schedule })

    await patientService.createMedicationSchedule(7, { medicationIds: [21] })
    await patientService.updateMedicationSchedule(7, 31, { medicationIds: [21] })

    expect(hoisted.axios.post).toHaveBeenCalledWith(
      '/endoreg-api/patients/7/medication-schedules/',
      { medicationIds: [21] }
    )
    expect(hoisted.axios.patch).toHaveBeenCalledWith(
      '/endoreg-api/patients/7/medication-schedules/31/',
      { medicationIds: [21] }
    )
  })
})
