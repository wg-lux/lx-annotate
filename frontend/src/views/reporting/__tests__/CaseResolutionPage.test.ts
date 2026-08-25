import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CaseResolutionPage from '../CaseResolutionPage.vue'

function requireDefined<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`Expected ${description}.`)
  return value
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
    anonymizationStoreRef: new FixtureRef<AnonymizationStoreStub>('anonymization store'),
    axiosApi: {
      get: vi.fn(),
      post: vi.fn()
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

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => hoisted.anonymizationStoreRef.current
}))

type PatientStoreStub = {
  loading: boolean
  centers: Array<{ id: number; centerKey: string; name: string; nameDe: string }>
  patientsWithDisplayName: Array<{ id: number; displayName: string }>
  getPatientById: (id: number) => {
    id: number
    firstName: string
    lastName: string
    dob: string
    gender: string
    patientHash: string
  } | null
  fetchPatients: ReturnType<typeof vi.fn>
  fetchCenters: ReturnType<typeof vi.fn>
  createPatient: ReturnType<typeof vi.fn>
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

type AnonymizationStoreStub = {
  current: {
    id: number
    patientFirstName: string
    patientLastName: string
    patientDob: string
    patientGenderName: string
    centerName: string
  } | null
  overview: Array<{ id: number }>
  fetchOverview: ReturnType<typeof vi.fn>
  setCurrentForValidation: ReturnType<typeof vi.fn>
}

function buildFlowStore() {
  const initialPatientExaminationId = (): number | null => 314
  const flow = reactive({
    selectedPatientId: null as number | null,
    selectedExaminationId: null as number | null,
    patientExaminationId: initialPatientExaminationId(),
    setCaseSelection: vi.fn(
      (payload: { selectedPatientId?: number | null; selectedExaminationId?: number | null }) => {
        if (payload.selectedPatientId !== undefined)
          flow.selectedPatientId = payload.selectedPatientId
        if (payload.selectedExaminationId !== undefined)
          flow.selectedExaminationId = payload.selectedExaminationId
      }
    ),
    setPatientExaminationContext: vi.fn(
      (payload: {
        patientExaminationId: number | null
        selectedPatientId?: number | null
        selectedExaminationId?: number | null
      }) => {
        flow.patientExaminationId = payload.patientExaminationId
        if (payload.selectedPatientId !== undefined)
          flow.selectedPatientId = payload.selectedPatientId
        if (payload.selectedExaminationId !== undefined)
          flow.selectedExaminationId = payload.selectedExaminationId
      }
    )
  })

  return flow
}

describe('CaseResolutionPage workflow linking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.routeRef.current = {
      query: {
        fileId: '5',
        mediaType: 'pdf',
        returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf',
        preferredExamination: 'colonoscopy'
      }
    }
    hoisted.flowRef.current = buildFlowStore()
    hoisted.patientStoreRef.current = {
      loading: false,
      centers: [{ id: 3, centerKey: 'center-a', name: 'Center A', nameDe: 'Center A' }],
      patientsWithDisplayName: [{ id: 7, displayName: 'Jane Doe' }],
      getPatientById: (id: number) =>
        id === 7
          ? {
              id: 7,
              firstName: 'Jane',
              lastName: 'Doe',
              dob: '1980-01-01',
              gender: 'female',
              patientHash: 'patient_7'
            }
          : null,
      fetchPatients: vi.fn().mockResolvedValue(undefined),
      fetchCenters: vi.fn().mockResolvedValue(undefined),
      createPatient: vi.fn()
    }
    hoisted.examinationStoreRef.current = {
      loading: false,
      examinationsDropdown: [{ id: 13, name: 'colonoscopy', displayName: 'Koloskopie' }],
      fetchExaminations: vi.fn().mockResolvedValue(undefined)
    }
    hoisted.patientExaminationStoreRef.current = {
      addPatientExamination: vi.fn(),
      setCurrentPatientExaminationId: vi.fn()
    }
    hoisted.anonymizationStoreRef.current = {
      current: null,
      overview: [{ id: 5 }],
      fetchOverview: vi.fn().mockResolvedValue(undefined),
      setCurrentForValidation: vi.fn().mockResolvedValue(true)
    }
    hoisted.axiosApi.get.mockImplementation((url: string) => {
      if (url === 'media/pdfs/5/case-resolution/') {
        return Promise.resolve({ data: {} })
      }
      if (url === 'patient-examinations/list/') {
        return Promise.resolve({ data: { results: [] } })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('keeps returnTo and preferred examination on the fall-setup handoff', async () => {
    const wrapper = mount(CaseResolutionPage)
    await flushPromises()

    expect(hoisted.flowRef.current.setCaseSelection).toHaveBeenCalledWith({
      selectedPatientId: null,
      selectedExaminationId: 13
    })

    const setupLink = requireDefined(
      wrapper
        .findAll('a')
        .find((link) => link.text().includes('Im Fall-Setup Fallkontext starten')),
      'the case setup link'
    )
    const setupDestination = requireDefined(
      setupLink.attributes('data-to'),
      'the case setup destination'
    )
    expect(JSON.parse(setupDestination)).toEqual({
      path: '/reporting/case-setup',
      query: {
        returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf',
        preferredExamination: 'colonoscopy'
      }
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
    expect(nextLink.attributes('data-to')).toBe('/reporting/314/findings')
  })

  it('rejects duplicate preferred examination nodes instead of selecting the first', async () => {
    hoisted.examinationStoreRef.current.examinationsDropdown = [
      { id: 13, name: 'colonoscopy', displayName: 'Koloskopie' },
      { id: 14, name: 'colonoscopy', displayName: 'Koloskopie (legacy)' }
    ]

    const wrapper = mount(CaseResolutionPage)
    await flushPromises()

    expect(wrapper.text()).toContain('ist im Untersuchungskatalog nicht eindeutig')
    expect(hoisted.flowRef.current.selectedExaminationId).toBeNull()
    expect(
      hoisted.flowRef.current.setCaseSelection.mock.calls.some(
        ([payload]) => payload.selectedExaminationId !== undefined
      )
    ).toBe(false)
  })

  it('resolves center names to center keys before creating a patient from metadata', async () => {
    hoisted.anonymizationStoreRef.current.current = {
      id: 5,
      patientFirstName: 'Clara',
      patientLastName: 'Keyed',
      patientDob: '1992-07-12',
      patientGenderName: 'female',
      centerName: 'Center A'
    }

    const createdPatient = { id: 12, firstName: 'Clara', lastName: 'Keyed' }
    hoisted.patientStoreRef.current.createPatient.mockResolvedValue(createdPatient)

    const wrapper = mount(CaseResolutionPage)
    await flushPromises()

    const createButton = requireDefined(
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Patienten aus Metadaten anlegen')),
      'the create-patient button'
    )

    await createButton.trigger('click')
    await flushPromises()

    expect(hoisted.patientStoreRef.current.fetchCenters).toHaveBeenCalledTimes(1)
    expect(hoisted.patientStoreRef.current.createPatient).toHaveBeenCalledWith({
      firstName: 'Clara',
      lastName: 'Keyed',
      dob: '1992-07-12',
      gender: 'female',
      centerKey: 'center-a',
      email: '',
      phone: '',
      patientHash: '',
      comments: '',
      isRealPerson: true
    })
  })
})
