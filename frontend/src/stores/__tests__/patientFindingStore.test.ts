import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { usePatientFindingStore } from '@/stores/patientFindingStore'

const findingsApiMocks = vi.hoisted(() => ({
  listPatientFindings: vi.fn(),
  createPatientFinding: vi.fn(),
  updatePatientFinding: vi.fn(),
  deletePatientFinding: vi.fn()
}))

vi.mock('@/api/findingsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/findingsApi')>()
  return {
    ...actual,
    findingsApi: findingsApiMocks
  }
})

const listPatientFindings = findingsApiMocks.listPatientFindings
const createPatientFinding = findingsApiMocks.createPatientFinding
const updatePatientFinding = findingsApiMocks.updatePatientFinding
const deletePatientFinding = findingsApiMocks.deletePatientFinding

const finding = (id: number, findingId: number, isActive = true) => ({
  id,
  patientExamination: 42,
  finding: findingId,
  isActive,
  classifications: []
})

describe('patientFindingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads findings for the selected patient examination', async () => {
    listPatientFindings.mockResolvedValue([finding(1, 7)])
    const store = usePatientFindingStore()

    await store.fetchPatientFindings(42)

    expect(listPatientFindings).toHaveBeenCalledWith(42)
    expect(store.patientFindings).toEqual([finding(1, 7)])
    expect(store.loading).toBe(false)
  })

  it('normalizes the create payload and appends the response', async () => {
    createPatientFinding.mockResolvedValue(finding(2, 8))
    const store = usePatientFindingStore()

    const created = await store.createPatientFinding({
      patient_examination: 42,
      finding: 8,
      classifications: [{ classification: 3, choice: 9 }]
    })

    expect(createPatientFinding).toHaveBeenCalledWith({
      patientExamination: 42,
      finding: 8,
      classifications: [{ classification: 3, choice: 9 }]
    })
    expect(created).toEqual(finding(2, 8))
    expect(store.patientFindings).toEqual([finding(2, 8)])
  })

  it('updates and deletes the matching local finding', async () => {
    listPatientFindings.mockResolvedValue([finding(1, 7), finding(2, 8)])
    updatePatientFinding.mockResolvedValue(finding(1, 9, false))
    deletePatientFinding.mockResolvedValue(undefined)
    const store = usePatientFindingStore()
    await store.fetchPatientFindings(42)

    await store.updatePatientFinding(1, {
      finding: 9,
      is_active: false,
      classifications: []
    })
    await store.deletePatientFinding(2)

    expect(updatePatientFinding).toHaveBeenCalledWith(1, {
      finding: 9,
      isActive: false,
      classifications: []
    })
    expect(deletePatientFinding).toHaveBeenCalledWith(2)
    expect(store.patientFindings).toEqual([finding(1, 9, false)])
  })

  it('preserves existing findings and exposes a typed API error when refresh fails', async () => {
    listPatientFindings
      .mockResolvedValueOnce([finding(1, 7)])
      .mockRejectedValueOnce({
        response: {
          status: 404,
          data: { detail: 'Patient examination not found' }
        }
      })
    const store = usePatientFindingStore()
    await store.fetchPatientFindings(42)

    await store.fetchPatientFindings(42)

    expect(store.patientFindings).toEqual([finding(1, 7)])
    expect(store.error).toContain('(not-found): Patient examination not found')
    expect(store.loading).toBe(false)
  })

  it('does not mutate local findings when creation fails', async () => {
    const apiError = {
      response: {
        status: 400,
        data: { code: 'duplicate-finding', detail: 'Finding already exists' }
      }
    }
    createPatientFinding.mockRejectedValueOnce(apiError)
    const store = usePatientFindingStore()

    await expect(store.createPatientFinding({ patientExamination: 42, finding: 8 })).rejects.toBe(
      apiError
    )

    expect(store.patientFindings).toEqual([])
    expect(store.error).toContain('(duplicate-finding): Finding already exists')
    expect(store.loading).toBe(false)
  })
})
