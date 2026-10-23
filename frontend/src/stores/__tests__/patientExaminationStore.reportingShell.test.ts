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

import {
  usePatientExaminationStore,
  type PatientExamination
} from '@/stores/patientExaminationStore'

const examination = (id = 314): PatientExamination => ({
  id,
  patient: { id: 9, firstName: 'Ada', lastName: 'Lovelace' },
  examination: { id: 7, name: 'colonoscopy' },
  video: null,
  knowledgeBaseModule: 'clinical_reporting',
  knowledgeBaseVersion: '2.0.0'
})

describe('patientExaminationStore ReportingShell boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('stores the newly persisted examination and selects its context for ReportingShell', () => {
    // Arrange
    const store = usePatientExaminationStore()
    const persisted = examination()

    // Act
    store.addPatientExamination(persisted)
    store.setCurrentPatientExaminationId(persisted.id)

    // Assert
    expect(store.getPatientExaminationById(314)).toEqual(persisted)
    expect(store.getCurrentPatientExaminationId()).toBe(314)
    expect(store.getCurrentPatientExaminationExaminationId()).toBe(7)
  })

  it('loads and validates one persisted examination from its canonical detail endpoint', async () => {
    // Arrange
    hoisted.get.mockResolvedValue({ data: examination() })
    const store = usePatientExaminationStore()

    // Act
    await store.fetchPatientExaminationById(314)

    // Assert
    expect(hoisted.get).toHaveBeenCalledWith(
      `/api/${endpoints.examination.patientExaminationDetail(314)}`
    )
    expect(store.getPatientExaminationById(314)).toMatchObject({
      knowledgeBaseModule: 'clinical_reporting',
      knowledgeBaseVersion: '2.0.0'
    })
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('does not commit malformed detail data into reporting state', async () => {
    // Arrange
    hoisted.get.mockResolvedValue({
      data: { ...examination(), knowledgeBaseVersion: 2 }
    })
    const store = usePatientExaminationStore()

    // Act
    await store.fetchPatientExaminationById(314)

    // Assert
    expect(store.patientExaminations).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toContain(
      'Patient examination response does not match the expected contract'
    )
    expect(hoisted.loggerError).toHaveBeenCalledWith(
      'examination-detail-load-failed',
      expect.any(TypeError),
      { operation: 'detail', outcome: 'rejected' }
    )
  })

  it('clears a removed selected examination so another context cannot inherit it', () => {
    // Arrange
    const store = usePatientExaminationStore()
    store.addPatientExamination(examination())
    store.setCurrentPatientExaminationId(314)

    // Act
    store.removePatientExamination(314)

    // Assert
    expect(store.patientExaminations).toEqual([])
    expect(store.getCurrentPatientExaminationId()).toBeNull()
    expect(store.getCurrentPatientExaminationExaminationId()).toBeNull()
  })
})
