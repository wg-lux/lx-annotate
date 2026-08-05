import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { isMedicalLedgerContractUnavailable, patientService } from '@/api/patientService'

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

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
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

  it('accepts array and paginated patient-list contracts', async () => {
    const patient = { id: 7, firstName: 'Ada', lastName: 'Lovelace' }
    hoisted.axios.get
      .mockResolvedValueOnce({ data: [patient] })
      .mockResolvedValueOnce({ data: { count: 1, results: [patient] } })

    await expect(patientService.getPatients()).resolves.toEqual([patient])
    await expect(patientService.getPatients()).resolves.toEqual([patient])
  })

  it('rejects malformed patient lists instead of treating them as empty', async () => {
    vi.stubEnv('VITE_ENABLE_TEST_LOGS', 'true')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    hoisted.axios.get.mockResolvedValue({ data: { count: 1, results: [{ id: 7 }] } })

    await expect(patientService.getPatients()).rejects.toThrow(
      'Patient list response does not match the expected contract'
    )
    expect(consoleError).toHaveBeenCalledOnce()
    const serialized = String(consoleError.mock.calls[0][0])
    expect(JSON.parse(serialized)).toMatchObject({
      severity: 'error',
      scope: 'patient-service',
      event: 'patient-list-request-failed',
      errorType: 'TypeError',
      context: {
        operation: 'list',
        outcome: 'rejected'
      }
    })
    expect(serialized).not.toContain('Patient list response does not match')
  })

  it('recognizes only the explicit medical-ledger unavailability contract', () => {
    const error = (data: unknown) =>
      Object.assign(new Error('unavailable'), {
        isAxiosError: true,
        response: { status: 503, data }
      })

    expect(
      isMedicalLedgerContractUnavailable(
        error({ code: 'medical-ledger-contract-unavailable' })
      )
    ).toBe(true)
    expect(isMedicalLedgerContractUnavailable(error(null))).toBe(false)
    expect(isMedicalLedgerContractUnavailable(error('medical-ledger-contract-unavailable'))).toBe(
      false
    )
  })
})
