import { flushPromises, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PatientDetailView from '@/components/Patients/PatientDetailView.vue'
import PatientDocumentsPage from '../PatientDocumentsPage.vue'
import PatientMedicationPage from '../PatientMedicationPage.vue'

const mocks = vi.hoisted(() => ({
  fetchTimeline: vi.fn(),
  fetchCases: vi.fn(),
  getPatient: vi.fn(),
  getMedicalLedger: vi.fn()
}))

vi.mock('@/api/reportingTimelineApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/reportingTimelineApi')>()
  return {
    ...original,
    fetchPatientTimeline: mocks.fetchTimeline
  }
})

vi.mock('@/api/casesApi', () => ({
  fetchPatientCases: mocks.fetchCases
}))

vi.mock('@/api/patientService', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/patientService')>()
  return {
    ...original,
    patientService: {
      getPatient: mocks.getPatient,
      getMedicalLedger: mocks.getMedicalLedger
    }
  }
})

const RouterLinkStub = {
  props: ['to'],
  template: '<a><slot /></a>'
}

describe('patient resource pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCases.mockResolvedValue([])
  })

  it('shows every repeated PDF, report, and video occurrence', async () => {
    mocks.fetchTimeline.mockResolvedValue({
      patient: {
        id: 7,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dob: null,
        isRealPerson: true,
        patientHash: null
      },
      count: 4,
      results: [
        {
          mediaType: 'pdf',
          id: 1,
          timestamp: '2026-07-01T10:00:00Z',
          examinationDate: '2026-07-01',
          documentType: 'Arztbrief',
          fileName: 'report.pdf',
          patientExaminationId: 11,
          streamOptions: [{ type: 'raw', url: '/pdf/1' }]
        },
        {
          mediaType: 'full_report',
          id: 2,
          timestamp: '2026-07-02T10:00:00Z',
          examinationDate: '2026-07-02',
          documentType: 'Endoskopiebericht',
          fileName: 'full-report.pdf',
          patientExaminationId: 12,
          streamOptions: [{ type: 'raw', url: '/pdf/2' }]
        },
        {
          mediaType: 'video',
          id: 3,
          timestamp: '2026-07-03T10:00:00Z',
          examinationDate: '2026-07-03',
          documentType: null,
          fileName: 'video.mp4',
          patientExaminationId: 13,
          streamOptions: [{ type: 'processed', url: '/video/3' }]
        },
        {
          mediaType: 'video',
          id: 4,
          timestamp: '2026-07-03T10:30:00Z',
          examinationDate: '2026-07-03',
          documentType: null,
          fileName: 'video-repeat.mp4',
          patientExaminationId: 13,
          streamOptions: [{ type: 'processed', url: '/video/4' }]
        }
      ]
    })
    mocks.fetchCases.mockResolvedValue([
      {
        id: 8,
        caseId: 'case-repeat',
        patient: 7,
        admissionDate: '2026-07-01',
        leaveDate: null,
        isActive: true,
        isClosed: false,
        isDeleted: false,
        patientExaminations: [{ id: 13 }],
        documents: [],
        patientMedications: [],
        patientMedicationSchedules: [],
        patientLabSamples: [],
        patientLabValues: []
      }
    ])

    const wrapper = mount(PatientDocumentsPage, {
      props: { patientId: 7 },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
    await flushPromises()

    expect(mocks.fetchTimeline).toHaveBeenCalledWith(7)
    expect(mocks.fetchCases).toHaveBeenCalledWith({ patientId: 7 })
    expect(wrapper.findAll('[data-testid="patient-document"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Arztbrief')
    expect(wrapper.text()).toContain('Endoskopiebericht')
    expect(wrapper.text()).toContain('video.mp4')
    expect(wrapper.text()).toContain('video-repeat.mp4')
    expect(wrapper.text()).toContain('Fall case-repeat')
  })

  it('offers patient-scoped links from the selected patient details', () => {
    const wrapper = mount(PatientDetailView, {
      props: {
        patient: {
          id: 7,
          firstName: 'Ada',
          lastName: 'Lovelace'
        }
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          RouterLink: RouterLinkStub,
          PatientEditForm: true
        }
      }
    })

    const patientLinks = wrapper.findAllComponents(RouterLinkStub)
    expect(patientLinks[0]?.props('to')).toEqual({
      name: 'Patientendokumente',
      params: { patientId: 7 }
    })
    expect(patientLinks[1]?.props('to')).toEqual({
      name: 'Patientenmedikation',
      params: { patientId: 7 }
    })
    expect(patientLinks[2]?.props('to')).toEqual({
      path: '/reporting',
      query: { patient_id: 7 }
    })
  })

  it('shows medication and schedule associations grouped by case', async () => {
    mocks.getPatient.mockResolvedValue({ id: 7, firstName: 'Ada', lastName: 'Lovelace' })
    mocks.getMedicalLedger.mockResolvedValue({
      uuid: 'ledger-7',
      externalIds: { endoregDb: 'Patient:7' },
      createdAt: '2026-07-01T10:00:00Z',
      patient: '7',
      diseases: [],
      events: [],
      labSamples: [],
      labValues: [],
      medications: [
        {
          uuid: 'medication-21',
          externalIds: { endoregDb: 'PatientMedication:21' },
          createdAt: '2026-07-01T10:00:00Z',
          patient: '7',
          medicationIndication: 'inflammatory-bowel-disease',
          medication: 'Mesalazine',
          intakeTimes: ['daily-morning'],
          unit: 'mg',
          dosage: { morning: 500 },
          active: true
        }
      ],
      medicationSchedules: [
        {
          uuid: 'schedule-31',
          externalIds: { endoregDb: 'PatientMedicationSchedule:31' },
          createdAt: '2026-07-01T10:00:00Z',
          scheduleCreatedAt: '2026-07-01T10:00:00Z',
          updatedAt: '2026-07-01T10:00:00Z',
          patient: '7',
          medications: [
            {
              uuid: 'medication-21',
              externalIds: { endoregDb: 'PatientMedication:21' },
              createdAt: '2026-07-01T10:00:00Z',
              patient: '7',
              medicationIndication: 'inflammatory-bowel-disease',
              medication: 'Mesalazine',
              intakeTimes: ['daily-morning'],
              unit: 'mg',
              dosage: { morning: 500 },
              active: true
            }
          ]
        }
      ]
    })
    mocks.fetchCases.mockResolvedValue([
      {
        id: 1,
        caseId: 'case-1',
        patient: 7,
        admissionDate: '2026-07-01',
        leaveDate: null,
        isActive: true,
        isClosed: false,
        isDeleted: false,
        patientExaminations: [],
        documents: [],
        patientMedications: [21],
        patientMedicationSchedules: [31],
        patientLabSamples: [],
        patientLabValues: []
      }
    ])

    const wrapper = mount(PatientMedicationPage, {
      props: { patientId: 7 },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
    await flushPromises()

    expect(mocks.fetchCases).toHaveBeenCalledWith({ patientId: 7 })
    expect(mocks.getMedicalLedger).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Fall case-1')
    expect(wrapper.text()).toContain('Mesalazine')
    expect(wrapper.text()).toContain('Dosierung: {"morning":500}')
    expect(wrapper.text()).toContain('Einheit: mg')
    expect(wrapper.text()).toContain('Einnahme: daily-morning')
    expect(wrapper.text()).toContain('Medikationsplan #31')
  })

  it('keeps accurate record IDs visible when the ledger contract is not deployed yet', async () => {
    mocks.getPatient.mockResolvedValue({ id: 7, firstName: 'Ada', lastName: 'Lovelace' })
    mocks.fetchCases.mockResolvedValue([
      {
        id: 1,
        caseId: 'case-1',
        patient: 7,
        admissionDate: '2026-07-01',
        leaveDate: null,
        isActive: true,
        isClosed: false,
        isDeleted: false,
        patientExaminations: [],
        documents: [],
        patientMedications: [21],
        patientMedicationSchedules: [31],
        patientLabSamples: [],
        patientLabValues: []
      }
    ])
    mocks.getMedicalLedger.mockRejectedValue(
      Object.assign(new Error('Medical ledger unavailable'), {
        isAxiosError: true,
        response: {
          status: 503,
          data: { code: 'medical-ledger-contract-unavailable' }
        }
      })
    )

    const wrapper = mount(PatientMedicationPage, {
      props: { patientId: 7 },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Medikationsdetails sind bis zur Aktualisierung')
    expect(wrapper.text()).toContain('Medikationsdatensatz #21')
    expect(wrapper.text()).toContain('Medikationsplan #31')
    expect(wrapper.text()).toContain('Details sind für diesen Datensatz nicht verfügbar.')
  })
})
