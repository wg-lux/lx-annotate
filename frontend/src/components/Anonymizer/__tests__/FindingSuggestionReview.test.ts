import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FindingSuggestionReview from '../FindingSuggestionReview.vue'
import type { FindingSuggestions } from '@/api/findingSuggestions'

const api = vi.hoisted(() => ({ load: vi.fn(), create: vi.fn() }))
vi.mock('@/api/findingSuggestions', () => ({ load_finding_suggestions: api.load }))
vi.mock('@/api/findingsApi', () => ({
  findingsApi: { createPatientFinding: api.create },
  parseFindingsApiError: () => ({ message: 'Speichern fehlgeschlagen' })
}))

function suggestions(presence: 'present' | 'absent' | 'uncertain' = 'present'): FindingSuggestions {
  return { examination: 17, reason: '', candidates: [{
    id: 3, name: 'colon_polyp', title: 'Kolonpolyp', source: 'report', presence,
    evidence: ['Polyp'], instance: 'fe9b02e0-421a-547b-9363-c3304b2c87e1', approved: false
  }] }
}

describe('finding review', () => {
  beforeEach(() => { vi.clearAllMocks(); api.load.mockResolvedValue(suggestions()); api.create.mockResolvedValue({ id: 44 }) })

  it('requires an explicit click and sends a stable identity to the linked examination', async () => {
    const wrapper = mount(FindingSuggestionReview, { props: { media: 'pdf', id: 8 } })
    await flushPromises()
    expect(api.create).not.toHaveBeenCalled()
    await wrapper.get('li button').trigger('click')
    await flushPromises()
    expect(api.create).toHaveBeenCalledWith({
      patientExamination: 17, finding: 3, instance_id: suggestions().candidates[0].instance, classifications: []
    })
    expect(wrapper.text()).toContain('Als Befund übernommen')
    expect(wrapper.find('li button').exists()).toBe(false)
  })

  it.each(['absent', 'uncertain'] as const)('does not promote %s evidence', async (presence) => {
    api.load.mockResolvedValue(suggestions(presence))
    const wrapper = mount(FindingSuggestionReview, { props: { media: 'pdf', id: 8 } })
    await flushPromises()
    expect(wrapper.get('li button').attributes('disabled')).toBeDefined()
    expect(api.create).not.toHaveBeenCalled()
  })

  it('requires an examination and displays mapped video source', async () => {
    const data = suggestions()
    data.examination = null
    data.candidates[0].source = 'prediction'
    api.load.mockResolvedValue(data)
    const wrapper = mount(FindingSuggestionReview, { props: { media: 'video', id: 8 } })
    await flushPromises()
    expect(wrapper.text()).toContain('Bild-KI')
    expect(wrapper.get('li button').attributes('disabled')).toBeDefined()
  })

  it('retains failed approvals for retry without claiming success', async () => {
    api.create.mockRejectedValue(new Error('failed'))
    const wrapper = mount(FindingSuggestionReview, { props: { media: 'pdf', id: 8 } })
    await flushPromises()
    await wrapper.get('li button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Speichern fehlgeschlagen')
    expect(wrapper.get('li button').attributes('disabled')).toBeUndefined()
  })

  it('ignores an old response after the media changes', async () => {
    let finish: (result: FindingSuggestions) => void = () => { throw new Error('not started') }
    api.load.mockImplementationOnce(() => new Promise<FindingSuggestions>((resolve) => { finish = resolve }))
    const wrapper = mount(FindingSuggestionReview, { props: { media: 'pdf', id: 8 } })
    api.load.mockResolvedValue({ examination: 19, candidates: [], reason: 'Keine Vorschläge' })
    await wrapper.setProps({ media: 'video', id: 9 })
    await flushPromises()
    finish(suggestions())
    await flushPromises()
    expect(wrapper.text()).toContain('Keine Vorschläge')
    expect(wrapper.text()).not.toContain('Kolonpolyp')
  })
})
