import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import RequirementGenerator from '../RequirementGenerator.vue'

const fetchExaminations = vi.fn().mockResolvedValue(undefined)
const fetchPatients = vi.fn().mockResolvedValue(undefined)
const initializeLookupData = vi.fn().mockResolvedValue(undefined)
const fetchLookupAll = vi.fn().mockResolvedValue(undefined)
const ensureCatalogLoaded = vi.fn().mockResolvedValue(undefined)
const ensurePatientFindingsLoaded = vi.fn().mockResolvedValue(undefined)
const getPatientById = vi
  .fn()
  .mockReturnValue({ id: 7, dob: null, gender: null, patientHash: 'patient_7' })
const setSelectedExamination = vi.fn()
const loadFindingsForExamination = vi.fn()

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { id: 42, patientData: { id: 7 }, examination: 'gastroscopy' } }),
    post: vi.fn().mockResolvedValue({ data: { token: 'lookup-token' } })
  },
  r: (value: string) => value
}))

vi.mock('@/types/api/endpoints', () => ({
  endpoints: {
    examination: {
      patientExaminationDetail: (id: number) => `/api/patient-examinations/${id}/`,
      patientExaminationCreate: '/api/patient-examinations/'
    },
    requirements: {
      lookupInit: '/api/lookup/init/',
      lookupAll: (token: string) => `/api/lookup/${token}/all/`,
      lookupParts: (token: string, _keys?: string[]) => `/api/lookup/${token}/parts/`,
      lookupRecompute: (token: string) => `/api/lookup/${token}/recompute/`
    }
  }
}))

vi.mock('@/composables/useDebug', () => ({
  useDebug: () => ({ isDebug: false })
}))

vi.mock('@/composables/reporting/useLookupActions', () => ({
  useLookupActions: () => ({
    fetchLookupAll,
    fetchLookupParts: vi.fn().mockResolvedValue({ ok: true }),
    patchLookupParts: vi.fn().mockResolvedValue({ ok: true }),
    recomputeLookup: vi.fn().mockResolvedValue({ ok: true })
  })
}))

vi.mock('@/stores/patientStore', () => ({
  usePatientStore: () => ({
    patientsWithDisplayName: [{ id: 7, displayName: 'Max Mustermann (ID: 7)', dob: null, gender: null, patientHash: 'patient_7' }],
    loading: false,
    fetchPatients,
    initializeLookupData,
    getPatientById,
    clearCurrentPatient: vi.fn()
  })
}))

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => ({
    exams: [{ id: 3, name: 'gastroscopy', displayName: 'Gastroskopie' }],
    examinationsDropdown: [{ id: 3, name: 'gastroscopy', displayName: 'Gastroskopie' }],
    loading: false,
    fetchExaminations,
    setSelectedExamination,
    loadFindingsForExamination
  })
}))

vi.mock('@/stores/requirementStore', () => ({
  useRequirementStore: () => ({
    evaluateFromLookupData: vi.fn().mockResolvedValue(undefined),
    evaluateRequirementSet: vi.fn().mockResolvedValue(undefined),
    getRequirementSetEvaluationStatus: vi.fn().mockReturnValue(null),
    getRequirementEvaluationStatus: vi.fn().mockReturnValue(null),
    setCurrentRequirementSetIds: vi.fn(),
    reset: vi.fn(),
    loadRequirementSetsFromLookup: vi.fn()
  })
}))

vi.mock('@/stores/patientExaminationStore', () => ({
  usePatientExaminationStore: () => ({
    setCurrentPatientExaminationId: vi.fn(),
    addPatientExamination: vi.fn()
  })
}))

vi.mock('@/composables/reporting/useFindingSelectors', () => ({
  useFindingSelectors: () => ({
    loading: { value: false },
    ensureCatalogLoaded,
    ensurePatientFindingsLoaded,
    getFindingById: vi.fn(),
    getFindingNameById: vi.fn().mockReturnValue('Befund'),
    isFindingAttached: vi.fn().mockReturnValue(false)
  })
}))

describe('RequirementGenerator visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    initializeLookupData.mockResolvedValue(undefined)
    fetchPatients.mockResolvedValue(undefined)
    fetchExaminations.mockResolvedValue(undefined)
    fetchLookupAll.mockResolvedValue(undefined)
    getPatientById.mockReturnValue({ id: 7, dob: null, gender: null, patientHash: 'patient_7' })
    setSelectedExamination.mockReset()
    loadFindingsForExamination.mockReset()
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { id: 42, patientData: { id: 7 }, examination: 'gastroscopy' }
    } as any)
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: { token: 'lookup-token' } } as any)
  })

  it('shows requirement area even when debug mode is disabled', async () => {
    fetchLookupAll.mockImplementation(async () => {
      return undefined
    })

    const wrapper = mount(RequirementGenerator, {
      global: {
        stubs: {
          FindingsDetail: { template: '<div data-testid="findings-detail-stub" />' },
          AddableFindingsDetail: { template: '<div data-testid="addable-findings-detail-stub" />' },
          RequirementIssues: { template: '<div data-testid="requirement-issues-stub" />' },
          PatientAdder: { template: '<div />' }
        },
        mocks: {
          $route: {
            params: {
              patient_examination_id: '42'
            }
          }
        }
      }
    })

    await flushPromises()

    ;(wrapper.vm as any).lookup = {
      patientExaminationId: 42,
      requirementSets: [{ id: 1001, name: 'Set A', type: 'template' }],
      availableFindings: [11],
      requiredFindings: [],
      requirementDefaults: {},
      classificationChoices: {},
      requirementsBySet: { '1001': [{ id: 2001, name: 'findings_validator:test' }] },
      requirementStatus: { '2001': false },
      requirementSetStatus: { '1001': false },
      suggestedActions: {},
      selectedRequirementSetIds: [1001]
    }
    await flushPromises()

    expect(wrapper.text()).toContain('Dokumentationsregeln auswählen')
    expect(wrapper.find('[data-testid="requirement-issues-stub"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Lookup')
    expect(wrapper.text()).not.toContain('Debug: Technische Falldaten')
  })

  it('renders the error banner when a visible error exists', async () => {
    const wrapper = mount(RequirementGenerator, {
      global: {
        stubs: {
          FindingsDetail: { template: '<div />' },
          AddableFindingsDetail: { template: '<div />' },
          RequirementIssues: { template: '<div />' },
          PatientAdder: { template: '<div />' }
        },
        mocks: {
          $route: {
            params: {
              patient_examination_id: '42'
            }
          }
        }
      }
    })

    await flushPromises()

    ;(wrapper.vm as any).error = 'knowledge base validation failed'
    await flushPromises()

    expect(wrapper.text()).toContain('Fehler:')
    expect(wrapper.text()).toContain('knowledge base validation failed')
  })

  it('shows a user-facing error when initial data loading fails', async () => {
    fetchPatients.mockRejectedValueOnce(new Error('Netzwerkfehler'))

    const wrapper = mount(RequirementGenerator, {
      global: {
        stubs: {
          FindingsDetail: { template: '<div />' },
          AddableFindingsDetail: { template: '<div />' },
          RequirementIssues: { template: '<div />' },
          PatientAdder: { template: '<div />' }
        },
        mocks: {
          $route: {
            params: {
              patient_examination_id: '42'
            }
          }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Fehler:')
    expect(wrapper.text()).toContain('Fehler beim Laden der Falldaten: Netzwerkfehler')
  })

  it('shows an expiry error when a persisted token can no longer be validated', async () => {
    vi.useFakeTimers()
    localStorage.setItem('lookupToken', 'expired-token')
    localStorage.setItem('currentPatientExaminationId', '42')
    vi.mocked(axiosInstance.get).mockRejectedValue({
      response: {
        status: 404
      }
    } as any)

    const wrapper = mount(RequirementGenerator, {
      global: {
        stubs: {
          FindingsDetail: { template: '<div />' },
          AddableFindingsDetail: { template: '<div />' },
          RequirementIssues: { template: '<div />' },
          PatientAdder: { template: '<div />' }
        },
        mocks: {
          $route: {
            params: {
              patient_examination_id: '42'
            }
          }
        }
      }
    })

    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.text()).toContain('Fehler:')
    expect(wrapper.text()).toContain('Der Fallkontext ist abgelaufen. Bitte den Fall erneut starten.')

    vi.useRealTimers()
  })

  it('forwards the patient birth date unchanged when creating a case', async () => {
    getPatientById.mockReturnValue({
      id: 7,
      dob: '1994-03-21',
      gender: 'female',
      patientHash: 'patient_7'
    })

    vi.mocked(axiosInstance.post)
      .mockResolvedValueOnce({ data: { id: 91 } } as any)
      .mockResolvedValueOnce({ data: { token: 'lookup-token-91' } } as any)
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        patientExaminationId: 91,
        requirementSets: [],
        availableFindings: [],
        requiredFindings: [],
        requirementDefaults: {},
        classificationChoices: {},
        requirementsBySet: {},
        requirementStatus: {},
        requirementSetStatus: {},
        suggestedActions: {},
        selectedRequirementSetIds: []
      }
    } as any)

    const wrapper = mount(RequirementGenerator, {
      global: {
        stubs: {
          FindingsDetail: { template: '<div />' },
          AddableFindingsDetail: { template: '<div />' },
          RequirementIssues: { template: '<div />' },
          PatientAdder: { template: '<div />' }
        },
        mocks: {
          $route: {
            params: {
              patient_examination_id: '42'
            }
          }
        }
      }
    })

    await flushPromises()
    await wrapper.find('#patient-select').setValue('7')
    await wrapper.find('#examination-select').setValue('3')
    await wrapper.find('button.btn.btn-primary').trigger('click')
    await flushPromises()

    expect(vi.mocked(axiosInstance.post)).toHaveBeenNthCalledWith(
      1,
      '/api/patient-examinations/',
      expect.objectContaining({
        patient_birth_date: '1994-03-21',
        patient_gender: 'female'
      })
    )
    expect(getPatientById).toHaveBeenCalledWith(7)
  })
})
