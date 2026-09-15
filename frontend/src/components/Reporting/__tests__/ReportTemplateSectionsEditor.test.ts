import { mount } from '@vue/test-utils'
import { toRaw } from 'vue'
import { describe, expect, it } from 'vitest'
import type {
  ReportTemplateBuilderFinding,
  ReportTemplateBuilderSection
} from '@/api/reportTemplateBuilderApi'
import ReportTemplateSectionsEditor from '../ReportTemplateSectionsEditor.vue'
import ReportTemplateFindingEditor from '../ReportTemplateFindingEditor.vue'

function section(id: string): ReportTemplateBuilderSection {
  return { id, sectionType: 'patient_info', name: id, description: '', fields: [], findings: [] }
}

function finding(): ReportTemplateBuilderFinding {
  return {
    finding: 'polyp',
    required: false,
    multipleAllowed: false,
    classifications: [],
    validator: {
      enabled: true,
      name: 'rule',
      operator: 'condition',
      condition: {
        classification: 'size',
        comparator: 'eq',
        value: '5',
        thenRequires: ['size']
      }
    }
  }
}

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected editor control or emitted update')
  }
  return value
}

const options = [
  { name: 'size', label: 'Size' },
  { name: 'location', label: 'Location' }
]

describe('Report template draft editor boundary', () => {
  it('emits reordered sections without mutating parent order or section identity', async () => {
    const sections = [section('first'), section('second')]
    const wrapper = mount(ReportTemplateSectionsEditor, {
      props: { modelValue: sections, findingOptions: [], classificationOptions: options }
    })
    await required(wrapper.findAll('button').find((button) => button.text() === 'Runter')).trigger(
      'click'
    )
    const next = required(
      wrapper.emitted<[ReportTemplateBuilderSection[]]>('update:modelValue')
    )[0][0]
    expect(sections.map((entry) => entry.id)).toEqual(['first', 'second'])
    expect(next).toEqual([sections[1], sections[0]])
    expect(toRaw(next[0])).toBe(sections[1])
    await wrapper.setProps({ modelValue: next })
    expect(wrapper.find('strong').text()).toBe('second')
  })

  it('emits field edits without changing the supplied section draft', async () => {
    const original = section('patient')
    const wrapper = mount(ReportTemplateSectionsEditor, {
      props: { modelValue: [original], findingOptions: [], classificationOptions: options }
    })
    await wrapper.find('input').setValue('Renamed')
    const next = required(
      wrapper.emitted<[ReportTemplateBuilderSection[]]>('update:modelValue')
    )[0][0]
    expect(original.name).toBe('patient')
    expect(next[0]).toEqual({ ...original, name: 'Renamed' })
    expect(next[0].id).toBe(original.id)
  })

  it('updates nested condition requirements immutably and rejects duplicates', async () => {
    const original = finding()
    const wrapper = mount(ReportTemplateFindingEditor, {
      props: {
        modelValue: original,
        findingOptions: [{ name: 'polyp', label: 'Polyp' }],
        classificationOptions: options
      }
    })
    const requirementSelect = required(wrapper.findAll('select').at(-1))
    await requirementSelect.setValue('size')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await requirementSelect.setValue('location')
    const next = required(
      wrapper.emitted<[ReportTemplateBuilderFinding]>('update:modelValue')
    )[0][0]
    expect(original.validator.condition.thenRequires).toEqual(['size'])
    expect(next.validator.condition.thenRequires).toEqual(['size', 'location'])
    expect(next.validator.name).toBe('rule')
    expect(next.finding).toBe('polyp')
    await wrapper.setProps({ modelValue: next })
    expect(wrapper.findAll('.badge').map((badge) => badge.text())).toEqual(['size', 'location'])
    await required(
      wrapper.findAll('button').find((button) => button.text() === 'Entfernen')
    ).trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
