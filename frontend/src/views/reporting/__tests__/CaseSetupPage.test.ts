import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CaseSetupPage from '../CaseSetupPage.vue'

const hoisted = vi.hoisted(() => ({
  flowRef: { current: null as any },
  patientStoreRef: { current: null as any },
  examinationStoreRef: { current: null as any },
  patientExaminationStoreRef: { current: null as any },
  axiosApi: {
    post: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a><slot /></a>'
  },
  useRoute: () => ({
    query: {}
  })
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axiosApi,
  r: (path: string) => path
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/stores/patientStore', () => ({
  usePatientStore: () => hoisted.patientStoreRef.current
}))

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => hoisted.examinationStoreRef.current
}))

vi.mock('@/stores/patientExaminationStore', () => ({
  usePatientExaminationStore: () => hoisted.patientExaminationStoreRef.current
}))

function buildFlowStore() {
  return {
    selectedPatientId: 7,
    selectedExaminationId: 9,
    patientExaminationId: null,
    lookupToken: null,
    currentRuntimeDraft: null,
    sessionStatus: 'idle',
    setCaseSelection: vi.fn(),
    setPatientExaminationContext: vi.fn(function (this: any, payload: any) {
      this.patientExaminationId = payload.patientExaminationId
      this.selectedPatientId = payload.selectedPatientId
      this.selectedExaminationId = payload.selectedExaminationId
    }),
    resetForPatientSwitch: vi.fn(),
    clearAll: vi.fn()
  }
}

describe('CaseSetupPage draft-first setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.flowRef.current = buildFlowStore()
    hoisted.patientStoreRef.current = {
      loading: false,
      patientsWithDisplayName: [{ id: 7, displayName: 'Jane Doe' }],
      getPatientById: (id: number) =>
        id === 7
          ? {
              id: 7,
              patientHash: 'patient_7',
              dob: '1980-01-01',
              gender: 'f'
            }
          : null,
      fetchPatients: vi.fn().mockResolvedValue(undefined)
    }
    hoisted.examinationStoreRef.current = {
      loading: false,
      examinationsDropdown: [{ id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }],
      fetchExaminations: vi.fn().mockResolvedValue(undefined)
    }
    hoisted.patientExaminationStoreRef.current = {
      addPatientExamination: vi.fn(),
      setCurrentPatientExaminationId: vi.fn()
    }
    hoisted.axiosApi.post.mockResolvedValue({
      data: { id: 42 }
    })
  })

  it('creates a patient examination and switches reporting context without lookup init', async () => {
    const wrapper = mount(CaseSetupPage)
    await flushPromises()

    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Patientenuntersuchung anlegen'))
    expect(createButton).toBeTruthy()

    await createButton!.trigger('click')
    await flushPromises()

    expect(hoisted.axiosApi.post).toHaveBeenCalledTimes(1)
    expect(hoisted.axiosApi.post).toHaveBeenCalledWith(
      'patient-examinations/create/',
      expect.objectContaining({
        patient: 'patient_7',
        examination: 'gastroscopy'
      })
    )
    expect(hoisted.flowRef.current.setPatientExaminationContext).toHaveBeenCalledWith({
      patientExaminationId: 42,
      selectedPatientId: 7,
      selectedExaminationId: 9,
      preserveTemplateSelection: true
    })
  })
})
