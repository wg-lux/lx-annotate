import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReportingExaminationRecovery from '../ReportingExaminationRecovery.vue'

describe('ReportingExaminationRecovery', () => {
  it('requires an explicit selection and prevents duplicate submission while saving', async () => {
    const wrapper = mount(ReportingExaminationRecovery, {
      props: {
        patientExaminationId: 216,
        examinations: [{ id: 9, name: 'colonoscopy', displayName: 'Koloskopie' }],
        loading: false,
        saving: false,
        error: null
      }
    })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.get('select').setValue('9')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('assign')).toEqual([[9]])
    await wrapper.setProps({ saving: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
  })
})
