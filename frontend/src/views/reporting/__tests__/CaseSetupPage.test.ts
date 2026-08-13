import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CaseSetupPage from '../CaseSetupPage.vue'
import type { CreateCaseWithExaminationResponse } from '@/api/casesApi'

function requireDefined<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`Expected ${description}.`)
  return value
}

type CreateCasePayload = {
  admissionDate: string
  patientExamination: {
    patient: string
    examination: string
    dateStart: string
  }
}

type CreateCaseResponse = {
  data: CreateCaseWithExaminationResponse
}

const hoisted = vi.hoisted(() => {
  class FixtureRef<T> {
    private fixture: T | undefined

    constructor(private readonly name: string) {}

    get current(): T {
      if (this.fixture === undefined) {
        throw new Error(`${this.name} fixture was not initialized.`)
      }
      return this.fixture
    }

    set current(value: T) {
      this.fixture = value
    }
  }

  return {
    routeRef: {
      current: {
        query: {}
      }
    },
    flowRef: new FixtureRef<ReturnType<typeof buildFlowStore>>('reporting flow'),
    patientStoreRef: new FixtureRef<PatientStoreStub>('patient store'),
    examinationStoreRef: new FixtureRef<ExaminationStoreStub>('examination store'),
    patientExaminationStoreRef: new FixtureRef<PatientExaminationStoreStub>(
      'patient examination store'
    ),
    axiosApi: {
      post: vi.fn<(url: string, payload: CreateCasePayload) => Promise<CreateCaseResponse>>()
    }
  }
})

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>'
  },
  useRoute: () => hoisted.routeRef.current
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

type PatientStoreStub = {
  loading: boolean
  patientsWithDisplayName: Array<{ id: number; displayName: string }>
  getPatientById: (id: number) => {
    id?: number
    patientHash?: string | null
    dob: string
    gender: string
  } | null
  fetchPatients: ReturnType<typeof vi.fn>
}

type ExaminationStoreStub = {
  loading: boolean
  examinationsDropdown: Array<{ id: number; name: string; displayName: string }>
  fetchExaminations: ReturnType<typeof vi.fn>
}

type PatientExaminationStoreStub = {
  addPatientExamination: ReturnType<typeof vi.fn>
  setCurrentPatientExaminationId: ReturnType<typeof vi.fn>
}

type PatientExaminationContext = {
  patientExaminationId: number | null
  selectedPatientId: number | null
  selectedExaminationId: number | null
}

type CaseContext = {
  caseId: string | null
  selectedPatientId?: number | null
}

function buildFlowStore(
  overrides: Partial<{
    selectedPatientId: number | null
    selectedExaminationId: number | null
    patientExaminationId: number | null
    caseId: string | null
  }> = {}
) {
  const flow = reactive({
    selectedPatientId: 7 as number | null,
    selectedExaminationId: 9 as number | null,
    patientExaminationId: null as number | null,
    caseId: null as string | null,
    lookupToken: null as string | null,
    currentRuntimeDraft: null,
    sessionStatus: 'idle',
    setCaseSelection: vi.fn(
      (payload: { selectedPatientId?: number | null; selectedExaminationId?: number | null }) => {
        if (payload.selectedPatientId !== undefined)
          flow.selectedPatientId = payload.selectedPatientId
        if (payload.selectedExaminationId !== undefined)
          flow.selectedExaminationId = payload.selectedExaminationId
      }
    ),
    setPatientExaminationContext: vi.fn((payload: PatientExaminationContext) => {
      flow.patientExaminationId = payload.patientExaminationId
      flow.selectedPatientId = payload.selectedPatientId
      flow.selectedExaminationId = payload.selectedExaminationId
    }),
    setCaseContext: vi.fn((payload: CaseContext) => {
      flow.caseId = payload.caseId
      if (payload.selectedPatientId !== undefined) {
        flow.selectedPatientId = payload.selectedPatientId
      }
    }),
    resetForPatientSwitch: vi.fn(),
    clearAll: vi.fn()
  })

  Object.assign(flow, overrides)
  return flow
}

describe('CaseSetupPage draft-first setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.routeRef.current = {
      query: {}
    }
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
      examinationsDropdown: [
        { id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' },
        { id: 13, name: 'colonoscopy', displayName: 'Koloskopie' }
      ],
      fetchExaminations: vi.fn().mockResolvedValue(undefined)
    }
    hoisted.patientExaminationStoreRef.current = {
      addPatientExamination: vi.fn(),
      setCurrentPatientExaminationId: vi.fn()
    }
    hoisted.axiosApi.post.mockImplementation((url: string) => {
      if (url === 'cases/create-with-examination/') {
        const patientExamination = { id: 42 }
        return Promise.resolve({
          data: {
            case: {
              id: 5,
              caseId: 'case-uuid-5',
              patient: 7,
              admissionDate: '2026-08-04T10:00:00.000Z',
              leaveDate: null,
              isActive: true,
              isClosed: false,
              isDeleted: false,
              patientExaminations: [patientExamination],
              documents: [],
              patientMedications: [],
              patientMedicationSchedules: [],
              patientLabSamples: [],
              patientLabValues: []
            },
            patientExamination
          }
        })
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })
  })

  it('creates a patient examination and switches reporting context without lookup init', async () => {
    const wrapper = mount(CaseSetupPage)
    await flushPromises()

    const createButton = requireDefined(
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Patientenuntersuchung anlegen')),
      'the create-examination button'
    )

    await createButton.trigger('click')
    await flushPromises()

    expect(hoisted.axiosApi.post).toHaveBeenCalledTimes(1)
    const createCall = hoisted.axiosApi.post.mock.calls[0]
    expect(createCall[0]).toBe('cases/create-with-examination/')
    expect(createCall[1].admissionDate).toEqual(expect.any(String))
    expect(createCall[1].patientExamination).toMatchObject({
      patient: 'patient_7',
      examination: 'gastroscopy'
    })
    expect(createCall[1].patientExamination.dateStart).toEqual(expect.any(String))
    expect(Object.keys(createCall[1].patientExamination).sort()).toEqual([
      'dateStart',
      'examination',
      'patient'
    ])
    expect(hoisted.flowRef.current.setPatientExaminationContext).toHaveBeenCalledWith({
      patientExaminationId: 42,
      selectedPatientId: 7,
      selectedExaminationId: 9,
      preserveTemplateSelection: true
    })
    expect(hoisted.flowRef.current.setCaseContext).toHaveBeenCalledWith({
      caseId: 'case-uuid-5',
      selectedPatientId: 7
    })
  })

  it('uses the selected patient id when the optional patient hash is absent', async () => {
    hoisted.patientStoreRef.current.getPatientById = (id: number) =>
      id === 7
        ? {
            patientHash: null,
            dob: '1980-01-01',
            gender: 'f'
          }
        : null

    const wrapper = mount(CaseSetupPage)
    await flushPromises()

    const createButton = requireDefined(
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Patientenuntersuchung anlegen')),
      'the create-examination button'
    )
    await createButton.trigger('click')
    await flushPromises()

    const createCall = hoisted.axiosApi.post.mock.calls[0]
    expect(createCall[0]).toBe('cases/create-with-examination/')
    expect(createCall[1].patientExamination.patient).toBe('patient_7')
  })

  it('preserves validation return links and preselects the requested examination', async () => {
    hoisted.routeRef.current = {
      query: {
        returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf',
        preferredExamination: 'colonoscopy'
      }
    }
    hoisted.flowRef.current = buildFlowStore({
      selectedExaminationId: null
    })

    const wrapper = mount(CaseSetupPage)
    await flushPromises()

    expect(hoisted.flowRef.current.setCaseSelection).toHaveBeenCalledWith({
      selectedExaminationId: 13
    })

    const backLink = requireDefined(
      wrapper.findAll('a').find((link) => link.text().includes('Zurück zur Validierung')),
      'the validation return link'
    )
    expect(backLink.attributes('data-to')).toBe(
      '/anonymisierung/validierung?fileId=5&mediaType=pdf'
    )

    const nextLink = requireDefined(
      wrapper.findAll('a').find((link) => link.text().includes('Zur klinischen Dokumentation')),
      'the clinical documentation link'
    )
    expect(nextLink.attributes('data-to')).toBe('/reporting/case-setup')
  })

  it('rejects an ambiguous preferred examination without mutating the selection', async () => {
    hoisted.routeRef.current = {
      query: { preferredExamination: 'colonoscopy' }
    }
    hoisted.flowRef.current = buildFlowStore({ selectedExaminationId: null })
    hoisted.examinationStoreRef.current.examinationsDropdown = [
      { id: 13, name: 'colonoscopy', displayName: 'Koloskopie' },
      { id: 14, name: 'colonoscopy', displayName: 'Koloskopie (legacy)' }
    ]

    const wrapper = mount(CaseSetupPage)
    await flushPromises()

    expect(wrapper.text()).toContain('ist im Untersuchungskatalog nicht eindeutig')
    expect(hoisted.flowRef.current.selectedExaminationId).toBeNull()
    expect(
      hoisted.flowRef.current.setCaseSelection.mock.calls.some(
        ([payload]) => payload.selectedExaminationId !== undefined
      )
    ).toBe(false)
  })
})
