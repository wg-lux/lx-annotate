import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PatientKanban from '../PatientKanban.vue'
import type { PatientCase } from '@/api/casesApi'

const api = vi.hoisted(() => ({ patients: vi.fn(), cases: vi.fn() }))
vi.mock('@/api/patientService', () => ({ patientService: { getPatients: api.patients } }))
vi.mock('@/api/casesApi', () => ({ fetchPatientCases: api.cases }))
const patient = { id: 7, firstName: 'Test', lastName: 'Patient' }
const activeCase: PatientCase = {
  id: 1,
  caseId: 'case-one',
  patient: 7,
  admissionDate: '2026-09-21',
  leaveDate: null,
  isActive: true,
  isClosed: false,
  isDeleted: false,
  patientExaminations: [{ id: 20 }],
  documents: [],
  patientMedications: [],
  patientMedicationSchedules: [],
  patientLabSamples: [],
  patientLabValues: []
}
const mounted: ReturnType<typeof mount>[] = []
function mountBoard() {
  const wrapper = mount(PatientKanban, {
    props: { searchTerm: '' },
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' } }
    }
  })
  mounted.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.clearAllMocks()
  api.patients.mockResolvedValue([patient])
  api.cases.mockResolvedValue([activeCase])
})
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => {
    wrapper.unmount()
  })
  vi.useRealTimers()
})

describe('backend case board', () => {
  it('keeps separate active and closed cases for the same patient and navigates with exact case identity', async () => {
    api.cases.mockResolvedValue([
      activeCase,
      { ...activeCase, id: 2, caseId: 'case-two', isActive: false, isClosed: true }
    ])
    const wrapper = mountBoard()
    await flushPromises()
    expect(wrapper.find('[data-stage="active"] [data-case-id="case-one"]').exists()).toBe(true)
    expect(wrapper.find('[data-stage="closed"] [data-case-id="case-two"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-patient-id="7"]')).toHaveLength(2)
    const targets = wrapper
      .findAllComponents({ name: 'RouterLink' })
      .map((link): unknown => link.props('to'))
    expect(targets).toContainEqual({
      path: '/reporting/20/findings',
      query: { patient_id: 7, case_id: 'case-two' }
    })
    expect(targets).toContain('/anonymisierung/uebersicht')
    await wrapper.get('.patient-heading').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[patient]])
    expect(api.cases).toHaveBeenCalledWith({})
  })
  it('shows unassigned patients, inactive cases and deleted cases explicitly', async () => {
    api.patients.mockResolvedValue([patient, { id: 8, firstName: 'No', lastName: 'Case' }])
    api.cases.mockResolvedValue([
      { ...activeCase, isActive: false },
      { ...activeCase, id: 2, caseId: 'deleted', isActive: false, isClosed: true, isDeleted: true }
    ])
    const wrapper = mountBoard()
    await flushPromises()
    expect(wrapper.get('[data-stage="unassigned"] [data-patient-id="8"]').text()).toContain(
      'Keinem Fall'
    )
    expect(wrapper.get('[data-stage="inactive"] [data-case-id="deleted"]').text()).toContain(
      'gelöscht'
    )
    expect(wrapper.find('[data-stage="closed"] [data-case-id]').exists()).toBe(false)
  })
  it('refreshes backend transitions and searches by case ID', async () => {
    const wrapper = mountBoard()
    await flushPromises()
    api.cases.mockResolvedValue([{ ...activeCase, isActive: false, isClosed: true }])
    await vi.advanceTimersByTimeAsync(30000)
    await flushPromises()
    expect(wrapper.find('[data-stage="closed"] [data-case-id="case-one"]').exists()).toBe(true)
    await wrapper.setProps({ searchTerm: 'case-one' })
    expect(wrapper.findAll('[data-case-id]')).toHaveLength(1)
    await wrapper.setProps({ searchTerm: 'other' })
    expect(wrapper.findAll('[data-case-id]')).toHaveLength(0)
  })
  it('clears stale case state on failure and recovers', async () => {
    const wrapper = mountBoard()
    await flushPromises()
    api.cases.mockRejectedValueOnce(new Error('Forbidden'))
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-case-id]')).toHaveLength(0)
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht geladen')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-case-id]')).toHaveLength(1)
  })
  it('rejects cases whose patient is not in the authorized patient list', async () => {
    api.cases.mockResolvedValue([{ ...activeCase, patient: 9 }])
    const wrapper = mountBoard()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-case-id]')).toHaveLength(0)
  })
  it('does not overlap requests or restart polling after unmount', async () => {
    let resolve!: (value: PatientCase[]) => void
    api.cases.mockReturnValueOnce(
      new Promise<PatientCase[]>((done) => {
        resolve = done
      })
    )
    const wrapper = mountBoard()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60000)
    expect(api.cases).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    resolve([activeCase])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60000)
    expect(api.cases).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
