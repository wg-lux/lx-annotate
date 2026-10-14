import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  loggerError: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: { get: hoisted.get },
  r: (path: string) => `/api/${path}`
}))

vi.mock('@/utils/runtimeLogger', () => ({
  createRuntimeLogger: () => ({ error: hoisted.loggerError })
}))

import { usePatientStore } from '@/stores/patientStore'

describe('patientStore ReportingShell boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('loads typed patients and exposes the exact selector data consumed by ReportingShell', async () => {
    // Arrange
    hoisted.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 9,
            firstName: 'Ada',
            lastName: 'Lovelace',
            dob: '1815-12-10',
            patientHash: 'patient_9'
          }
        ]
      }
    })
    const store = usePatientStore()

    // Act
    await store.fetchPatients()

    // Assert
    expect(hoisted.get).toHaveBeenCalledWith(`/api/${endpoints.patient.patients}`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.patientsWithDisplayName).toEqual([
      expect.objectContaining({ id: 9, displayName: 'Ada Lovelace (ID: 9)' })
    ])
    expect(store.getPatientById(9)?.patientHash).toBe('patient_9')
  })

  it('fails closed and exposes an error when a patient row is malformed', async () => {
    // Arrange
    hoisted.get.mockResolvedValue({ data: [{ id: 9, firstName: 'Ada' }] })
    const store = usePatientStore()

    // Act
    await store.fetchPatients()

    // Assert
    expect(store.patients).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toContain('Patient list response does not match the expected contract')
    expect(hoisted.loggerError).toHaveBeenCalledWith(
      'patient-list-load-failed',
      expect.any(TypeError),
      { operation: 'list', outcome: 'rejected' }
    )
  })

  it('does not leak patient state into a fresh Pinia used by another reporting session', async () => {
    // Arrange
    hoisted.get.mockResolvedValue({
      data: [{ id: 9, firstName: 'Ada', lastName: 'Lovelace' }]
    })
    const firstStore = usePatientStore()
    await firstStore.fetchPatients()

    // Act
    setActivePinia(createPinia())
    const secondStore = usePatientStore()

    // Assert
    expect(firstStore.patients).toHaveLength(1)
    expect(secondStore.patients).toEqual([])
    expect(secondStore.getPatientById(9)).toBeUndefined()
  })
})
