import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReportingContextSelection from '../ReportingContextSelection.vue'

function mountContext() {
  return mount(ReportingContextSelection, {
    props: {
      activePatientExaminationId: null,
      caseId: null,
      selectedPatientId: null,
      selectedExaminationId: null,
      patients: [{ id: 12, displayName: 'Patient Twelve' }],
      examinations: [{ id: 34, displayName: 'Examination Thirty Four' }],
      patientsLoading: false,
      examinationsLoading: false,
      patientExaminationCreationLoading: false,
      patientHeaderLabel: 'Patient Twelve',
      examinationTypeLabel: 'Examination Thirty Four'
    }
  })
}

describe('ReportingContextSelection', () => {
  it('emits selection values and requires both selections before creating context', async () => {
    const wrapper = mountContext()
    const create = wrapper.get<HTMLButtonElement>('[data-testid="persist-patient-examination"]')
    expect(create.element.disabled).toBe(true)
    await wrapper.get('[data-testid="patient-select"]').setValue('12')
    await wrapper.get('[data-testid="examination-select"]').setValue('34')
    expect(wrapper.emitted('selectPatient')).toEqual([['12']])
    expect(wrapper.emitted('selectExamination')).toEqual([['34']])
    await wrapper.setProps({ selectedPatientId: 12 })
    expect(create.element.disabled).toBe(true)
    await wrapper.setProps({ selectedExaminationId: 34 })
    expect(create.element.disabled).toBe(false)
    await create.trigger('click')
    expect(wrapper.emitted('create')).toEqual([[]])
  })

  it('disables each loading selector and prevents edits during context creation', async () => {
    const wrapper = mountContext()
    const patient = wrapper.get<HTMLSelectElement>('[data-testid="patient-select"]')
    const examination = wrapper.get<HTMLSelectElement>('[data-testid="examination-select"]')
    await wrapper.setProps({ patientsLoading: true })
    expect(patient.element.disabled).toBe(true)
    expect(examination.element.disabled).toBe(false)
    expect(patient.text()).toContain('Patienten werden geladen...')
    await wrapper.setProps({ patientsLoading: false, examinationsLoading: true })
    expect(patient.element.disabled).toBe(false)
    expect(examination.element.disabled).toBe(true)
    expect(examination.text()).toContain('Untersuchungen werden geladen...')
    await wrapper.setProps({ examinationsLoading: false, patientExaminationCreationLoading: true })
    expect(patient.element.disabled).toBe(true)
    expect(examination.element.disabled).toBe(true)
    expect(wrapper.get<HTMLButtonElement>('button').element.disabled).toBe(true)
  })

  it('renders persisted context and emits restart without changing the context itself', async () => {
    const wrapper = mountContext()
    await wrapper.setProps({ activePatientExaminationId: 314 })
    const context = wrapper.get('[data-testid="resolved-patient-examination"]')
    expect(context.text()).toContain('Patient Twelve')
    expect(context.text()).toContain('Examination Thirty Four')
    expect(context.text()).toContain('Persistierte Patientenuntersuchung 314')
    expect(wrapper.find('[data-testid="patient-select"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="reporting-context-requirement"]').classes()).toContain(
      'is-complete'
    )
    await context.get('button').trigger('click')
    expect(wrapper.emitted('restart')).toEqual([[]])
    expect(context.text()).toContain('314')
  })
})
