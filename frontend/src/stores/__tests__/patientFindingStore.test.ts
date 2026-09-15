import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { usePatientFindingStore } from '@/stores/patientFindingStore'

const ORIGINAL_FINDING_ID = 7
const CREATED_FINDING_ID = 8
const PATIENT_EXAMINATION_ID = 42

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
  patientExamination: PATIENT_EXAMINATION_ID,
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
    listPatientFindings.mockResolvedValue([finding(1, ORIGINAL_FINDING_ID)])
    const store = usePatientFindingStore()

    await store.fetchPatientFindings(PATIENT_EXAMINATION_ID)

    expect(listPatientFindings).toHaveBeenCalledWith(PATIENT_EXAMINATION_ID)
    expect(store.patientFindings).toEqual([finding(1, ORIGINAL_FINDING_ID)])
    expect(store.loading).toBe(false)
  })

  it('normalizes the create payload and appends the response', async () => {
    createPatientFinding.mockResolvedValue(finding(2, CREATED_FINDING_ID))
    const store = usePatientFindingStore()

    const created = await store.createPatientFinding({
      patient_examination: PATIENT_EXAMINATION_ID,
      finding: CREATED_FINDING_ID,
      classifications: [{ classification: 3, choice: 9 }]
    })

    expect(createPatientFinding).toHaveBeenCalledWith({
      patientExamination: PATIENT_EXAMINATION_ID,
      finding: CREATED_FINDING_ID,
      classifications: [{ classification: 3, choice: 9 }]
    })
    expect(created).toEqual(finding(2, CREATED_FINDING_ID))
    expect(store.patientFindings).toEqual([finding(2, CREATED_FINDING_ID)])
  })

  it('updates and deletes the matching local finding', async () => {
    listPatientFindings.mockResolvedValue([
      finding(1, ORIGINAL_FINDING_ID),
      finding(2, CREATED_FINDING_ID)
    ])
    updatePatientFinding.mockResolvedValue(finding(1, 9, false))
    deletePatientFinding.mockResolvedValue(undefined)
    const store = usePatientFindingStore()
    await store.fetchPatientFindings(PATIENT_EXAMINATION_ID)

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
      .mockResolvedValueOnce([finding(1, ORIGINAL_FINDING_ID)])
      .mockRejectedValueOnce({
        response: {
          status: 404,
          data: { detail: 'Patient examination not found' }
        }
      })
    const store = usePatientFindingStore()
    await store.fetchPatientFindings(PATIENT_EXAMINATION_ID)

    await store.fetchPatientFindings(PATIENT_EXAMINATION_ID)

    expect(store.patientFindings).toEqual([finding(1, ORIGINAL_FINDING_ID)])
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

    await expect(
      store.createPatientFinding({
        patientExamination: PATIENT_EXAMINATION_ID,
        finding: CREATED_FINDING_ID
      })
    ).rejects.toBe(apiError)

    expect(store.patientFindings).toEqual([])
    expect(store.error).toContain('(duplicate-finding): Finding already exists')
    expect(store.loading).toBe(false)
  })
})
