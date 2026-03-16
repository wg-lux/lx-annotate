import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import RequirementIssues from '../RequirementIssues.vue'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    post: vi.fn()
  },
  r: (value: string) => value
}))

describe('RequirementIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders backend validation errors from errors[]', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        ok: false,
        errors: ['knowledge base validation failed', 'missing report template'],
        meta: {
          patientExaminationId: 42,
          setsEvaluated: 0,
          requirementsEvaluated: 0,
          status: 'failed'
        },
        results: []
      }
    } as any)

    const wrapper = mount(RequirementIssues, {
      props: {
        patientExaminationId: 42,
        requirementSetIds: [1001],
        showOnlyUnmet: true
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Fehler bei der Anforderungsprüfung:')
    expect(wrapper.text()).toContain(
      'knowledge base validation failed | missing report template'
    )
  })

  it('does not fire a request when no patient examination id is present', async () => {
    const wrapper = mount(RequirementIssues, {
      props: {
        patientExaminationId: null,
        requirementSetIds: [1001],
        showOnlyUnmet: true
      }
    })

    await flushPromises()

    expect(vi.mocked(axiosInstance.post)).not.toHaveBeenCalled()
    expect(wrapper.text()).toBe('')
  })

  it('renders grouped unmet requirements when the backend response is partial', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        ok: true,
        errors: [],
        meta: {
          patientExaminationId: 42,
          setsEvaluated: 1,
          requirementsEvaluated: 2,
          status: 'partial'
        },
        results: [
          {
            requirement_set_id: 1001,
            requirement_set_name: 'Set A',
            requirement_name: 'finding_exists',
            met: false,
            details: 'Befund fehlt',
            error: null
          },
          {
            requirement_set_id: 1001,
            requirement_set_name: 'Set A',
            requirement_name: 'classification_valid',
            met: true,
            details: 'ok',
            error: null
          }
        ]
      }
    } as any)

    const wrapper = mount(RequirementIssues, {
      props: {
        patientExaminationId: 42,
        requirementSetIds: [1001],
        showOnlyUnmet: true
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain(
      'Um den Report abzuschließen, müssen die folgenden Voraussetzungen erfüllt sein:'
    )
    expect(wrapper.text()).toContain('Set A')
    expect(wrapper.text()).toContain('finding_exists')
    expect(wrapper.text()).toContain('Befund fehlt')
    expect(wrapper.text()).not.toContain('classification_valid')
  })
})
