import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CaseMedicationPage from '../CaseMedicationPage.vue'

const mocks = vi.hoisted(() => ({
  cases: vi.fn(),
  ledger: vi.fn(),
  terminology: vi.fn(),
  save: vi.fn(),
  route: { query: { patient_id: '7', case_id: 'case-7' } }
}))
vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' }
}))
vi.mock('@/api/casesApi', () => ({ fetchPatientCases: mocks.cases }))
vi.mock('@/api/patientService', () => ({ patientService: { getMedicalLedger: mocks.ledger } }))
vi.mock('@/api/caseMedicalApi', () => ({
  fetchMedicalTerminology: mocks.terminology,
  createCaseMedicalRecords: mocks.save
}))

const patientCase = {
  id: 3,
  caseId: 'case-7',
  patient: 7,
  isDeleted: false,
  patientMedications: [11],
  patientLabValues: [12]
}
const records = {
  medications: [
    {
      uuid: 'med-11',
      externalIds: { endoregDb: 'PatientMedication:11' },
      medication: 'example_med',
      dosage: 1,
      unit: 'mg',
      active: true,
      startAt: '2026-01-01T10:00:00Z'
    },
    {
      uuid: 'med-99',
      externalIds: { endoregDb: 'PatientMedication:99' },
      medication: 'unrelated_med',
      dosage: 2,
      active: true
    }
  ],
  labValues: [
    {
      uuid: 'lab-12',
      externalIds: { endoregDb: 'PatientLabValue:12' },
      labValue: 'example_lab',
      value: 0,
      unit: 'mg',
      timestamp: '2026-01-01T10:00:00Z'
    }
  ]
}

async function form(kind = 'medication') {
  const wrapper = mount(CaseMedicationPage)
  await flushPromises()
  await wrapper.get('#clinical-kind').setValue(kind)
  await wrapper
    .get('#clinical-reference')
    .setValue(kind === 'medication' ? 'example_med' : 'example_lab')
  await wrapper.get('#clinical-start').setValue('2026-01-01T10:00')
  await wrapper.get('#clinical-value').setValue('0')
  return wrapper
}

describe('case medication and laboratory entry', () => {
  it('keeps the examination and case in the return link', async () => {
    Object.assign(mocks.route.query, { patient_examination_id: '314' })
    const wrapper = mount(CaseMedicationPage)
    await flushPromises()
    expect(JSON.parse(wrapper.get('a').attributes('data-to') || '{}')).toEqual({
      path: '/reporting/case-setup',
      query: { patient_id: '7', case_id: 'case-7', patient_examination_id: '314' }
    })
    expect(
      JSON.parse(
        wrapper.get('[data-testid="medication-examination-records"]').attributes('data-to') || '{}'
      )
    ).toEqual({
      path: '/reporting/examination-records',
      query: { patient_id: '7', case_id: 'case-7', patient_examination_id: '314' }
    })
    wrapper.unmount()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.route = reactive({ query: { patient_id: '7', case_id: 'case-7' } })
    mocks.cases.mockResolvedValue([patientCase])
    mocks.ledger.mockResolvedValue(records)
    mocks.terminology.mockResolvedValue([
      { recordType: 'medication', name: 'example_med', defaultUnit: { name: 'mg' } },
      { recordType: 'lab_value', name: 'example_lab', defaultUnit: { name: 'mg' } },
      { recordType: 'unit', name: 'mg' }
    ])
    mocks.save.mockResolvedValue(records)
  })

  it('shows only case-linked records and saves a period with explicit case identity', async () => {
    const wrapper = await form()
    expect(wrapper.text()).not.toContain('unrelated_med')
    expect(wrapper.text()).toContain('example_lab: 0')
    await wrapper.get('#clinical-end').setValue('2026-01-02T10:00')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.save).toHaveBeenCalledWith(
      7,
      {
        patient: '7',
        caseId: 3,
        medications: [
          {
            medication: 'example_med',
            unit: 'mg',
            dosage: 0,
            active: true,
            startAt: new Date('2026-01-01T10:00').toISOString(),
            endAt: new Date('2026-01-02T10:00').toISOString()
          }
        ]
      },
      expect.any(String)
    )
    expect(wrapper.text()).toContain('Eintrag gespeichert')
  })

  it('retains zero numeric measurements and retries with the same idempotency key', async () => {
    const wrapper = await form('lab_value')
    mocks.save.mockRejectedValueOnce(new Error('Connection lost'))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[0]).toEqual(mocks.save.mock.calls[1])
    expect(mocks.save).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        labValues: [expect.objectContaining({ value: 0, labValue: 'example_lab' })]
      }),
      expect.any(String)
    )
  })

  it('reloads canonical records after a write instead of replacing them with the receipt subset', async () => {
    const wrapper = await form()
    mocks.save.mockResolvedValue({ medications: [], labValues: [] })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.ledger).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('example_med')
    expect(wrapper.text()).toContain('example_lab: 0')
    expect(wrapper.text()).not.toContain('unrelated_med')
  })

  it('sends text measurements without a competing numeric value', async () => {
    const wrapper = await form('lab_value')
    await wrapper.get('#clinical-value-kind').setValue('text')
    await wrapper.get('#clinical-value').setValue('negative')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.save).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        labValues: [
          {
            labValue: 'example_lab',
            valueStr: 'negative',
            unit: 'mg',
            timestamp: new Date('2026-01-01T10:00').toISOString()
          }
        ]
      }),
      expect.any(String)
    )
  })

  it('rejects reversed periods and clears records after a context switch', async () => {
    const wrapper = await form()
    await wrapper.get('#clinical-end').setValue('2025-01-01T10:00')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.save).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('ungültig')
    mocks.cases.mockResolvedValue([])
    mocks.route.query.case_id = 'foreign-case'
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('example_med')
  })
})
