import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import RequirementGenerator from '../RequirementGenerator.vue'

describe('RequirementGenerator - Direct Mocking', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('should render the main title', async () => {
    // Create mock stores
    const mockPatientStore = {
      patients: ref([
        { id: 1, first_name: 'John', last_name: 'Doe', displayName: 'John Doe' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', displayName: 'Jane Smith' }
      ]),
      genders: ref([]),
      centers: ref([]),
      isLoading: ref(false),
      isError: ref(false),
      error: ref(null),
      fetchPatients: vi.fn().mockResolvedValue([]),
      initializeLookupData: vi.fn().mockResolvedValue(undefined)
    }

    const mockExaminationStore = {
      examinations: ref([
        { id: 1, name: 'Blood Test' },
        { id: 2, name: 'X-Ray' }
      ]),
      isLoading: ref(false),
      isError: ref(false),
      error: ref(null),
      fetchExaminations: vi.fn().mockResolvedValue([])
    }

    const mockFindingStore = {
      findings: ref([]),
      isLoading: ref(false),
      isError: ref(false),
      error: ref(null),
      fetchFindings: vi.fn().mockResolvedValue([])
    }

    const mockRequirementStore = {
      requirements: ref([]),
      isLoading: ref(false),
      isError: ref(false),
      error: ref(null),
      fetchRequirements: vi.fn().mockResolvedValue([])
    }

    const mockPatientExaminationStore = {
      patientExaminations: ref([]),
      isLoading: ref(false),
      isError: ref(false),
      error: ref(null),
      createPatientExamination: vi.fn().mockResolvedValue({ id: 1 }),
      fetchPatientExaminations: vi.fn().mockResolvedValue([])
    }

    // Create a minimal wrapper that only checks title rendering
    const wrapper = mount(RequirementGenerator, {
      global: {
        plugins: [createPinia()],
        stubs: {
          AddableFindingsDetail: true,
          FindingsDetail: true,
          PatientAdder: true
        },
        mocks: {
          usePatientStore: () => mockPatientStore,
          useExaminationStore: () => mockExaminationStore,
          useFindingStore: () => mockFindingStore,
          useRequirementStore: () => mockRequirementStore,
          usePatientExaminationStore: () => mockPatientExaminationStore
        }
      }
    })

    // Give Vue some time to initialize
    await nextTick()

    // Check if title is rendered
    expect(wrapper.text()).toContain('Patient Examination Report Generator')
  })
})
