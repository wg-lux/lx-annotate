import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudyMetadataEditor from '@/components/StudyMetadataEditor.vue'
import StudyRuleEditor from '@/components/StudyRuleEditor.vue'
import { emptyStudyMetadata, type StudyRule } from '@/api/studyCohortApi'

describe('study analysis authoring', () => {
  it('adds a draft analysis to legacy metadata without analysis definitions', async () => {
    const metadata = emptyStudyMetadata()
    const wrapper = mount(StudyMetadataEditor, { props: { modelValue: metadata } })
    await wrapper.get('[data-test="add-analysis"]').trigger('click')
    expect(metadata.analysisDefinitions).toEqual([
      expect.objectContaining({ status: 'draft', schemaVersion: '1', endpoints: [] })
    ])
  })
  it('authors boolean and numeric equality without converting them to strings', async () => {
    const rule: StudyRule = {
      mode: 'all',
      predicates: [
        {
          role: 'index',
          classification: 'outcome',
          descriptor: 'success',
          operator: 'eq',
          value: ''
        }
      ]
    }
    const wrapper = mount(StudyRuleEditor, { props: { modelValue: rule, label: 'Equality' } })
    await wrapper.findAll('select')[3].setValue('boolean')
    expect(rule.predicates[0].value).toBe(false)
    await wrapper.findAll('select')[4].setValue('true')
    expect(rule.predicates[0].value).toBe(true)
    await wrapper.findAll('select')[3].setValue('number')
    await wrapper.get('input[type="number"]').setValue('0')
    expect(rule.predicates[0].value).toBe(0)
  })
  it('keeps numeric thresholds numeric and clears values for presence rules', async () => {
    const rule: StudyRule = {
      mode: 'all',
      predicates: [
        { role: 'index', classification: 'size', descriptor: 'mm', operator: 'eq', value: '' }
      ]
    }
    const wrapper = mount(StudyRuleEditor, { props: { modelValue: rule, label: 'Threshold' } })
    await wrapper.findAll('select')[2].setValue('ge')
    await wrapper.get('input[type="number"]').setValue('20')
    expect(rule.predicates[0].value).toBe(20)
    await wrapper.findAll('select')[2].setValue('present')
    expect(rule.predicates[0].value).toBeNull()
  })
})
