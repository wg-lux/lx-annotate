import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkflowProgressStrip from '../WorkflowProgressStrip.vue'
import type { WorkflowItem } from '@/api/mediaWorkflowApi'

const base: WorkflowItem = {
  kind: 'video',
  recordId: 1,
  version: 1,
  source: 'stored',
  privacy: 'awaiting_validation',
  annotation: 'not_available',
  release: 'not_released',
  allowedEvents: []
}

describe('WorkflowProgressStrip', () => {
  it('highlights validation as the current step', () => {
    const wrapper = mount(WorkflowProgressStrip, { props: { item: base } })
    expect(wrapper.find('[aria-current="step"]').text()).toBe('Validierung')
    expect(wrapper.findAll('.workflow-step-done')).toHaveLength(1)
  })

  it('marks export done only after export', () => {
    const wrapper = mount(WorkflowProgressStrip, {
      props: {
        item: { ...base, privacy: 'raw_purged', annotation: 'validated', release: 'exported' }
      }
    })
    expect(wrapper.findAll('.workflow-step-done')).toHaveLength(5)
  })

  it('shows a terminal note for lost items', () => {
    const wrapper = mount(WorkflowProgressStrip, { props: { item: { ...base, privacy: 'lost' } } })
    expect(wrapper.find('[role="status"]').text()).toContain('Integritätsfehler')
    expect(wrapper.findAll('.workflow-step-current')).toHaveLength(0)
  })
})
