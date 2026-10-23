import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import IndicationsEditor from '../IndicationsEditor.vue'

describe('IndicationsEditor', () => {
  it('clears indication choice when switching to an indication without that choice', async () => {
    const wrapper = mount(IndicationsEditor, {
      props: {
        rows: [{ examinationIndicationId: 1, indicationChoiceId: 10 }],
        indicationOptions: [
          {
            id: 1,
            label: 'Screening',
            choices: [{ id: 10, label: 'Routine' }]
          },
          {
            id: 2,
            label: 'Kontrolle',
            choices: []
          }
        ]
      }
    })

    const selects = wrapper.findAll('select')
    await selects[0].setValue('2')

    const events = wrapper.emitted('update-row')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([0, { examinationIndicationId: 2, indicationChoiceId: null }])
  })

  it('keeps unavailable persisted selections visible without exposing numerical ids', () => {
    const wrapper = mount(IndicationsEditor, {
      props: {
        rows: [{ examinationIndicationId: 77, indicationChoiceId: 88 }],
        indicationOptions: []
      }
    })

    const selects = wrapper.findAll('select')
    expect(selects[0].text()).toContain('Gespeicherte Indikation nicht mehr verfügbar')
    expect(selects[1].text()).toContain('Gespeicherte Auswahl nicht mehr verfügbar')
    expect(wrapper.text()).not.toContain('#77')
    expect(wrapper.text()).not.toContain('#88')
    expect((selects[0].element as HTMLSelectElement).value).toBe('77')
    expect((selects[1].element as HTMLSelectElement).value).toBe('88')
    expect(wrapper.emitted('update-row')).toBeUndefined()
  })

  it('emits refresh-options when no backend options are available', async () => {
    const wrapper = mount(IndicationsEditor, {
      props: {
        rows: [{ examinationIndicationId: null, indicationChoiceId: null }],
        indicationOptions: []
      }
    })

    const refreshButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Optionen laden'))
    if (!refreshButton) {
      throw new Error('Expected the options refresh button to be rendered.')
    }

    await refreshButton.trigger('click')
    expect(wrapper.emitted('refresh-options')).toHaveLength(1)
    expect(wrapper.text()).toContain('Diese Vorlage enthält keine auswählbaren Indikationen.')
    expect(wrapper.text()).toContain('die übrigen Berichtsteile weiter bearbeiten')
    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Zeile hinzufügen')
    expect(addButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  })

  it('distinguishes failed loading from an empty template and allows retry', async () => {
    const wrapper = mount(IndicationsEditor, {
      props: { rows: [], optionsError: 'Die Indikationen konnten nicht geladen werden.' }
    })
    expect(wrapper.text()).toContain('Für diese Vorlage sind derzeit keine Indikationen verfügbar.')
    expect(wrapper.text()).toContain('Die Indikationen konnten nicht geladen werden.')
    expect(wrapper.text()).not.toContain('Diese Vorlage enthält keine auswählbaren Indikationen.')
    await wrapper.get('.alert-warning button').trigger('click')
    expect(wrapper.emitted('refresh-options')).toHaveLength(1)
    await wrapper.setProps({
      optionsError: null,
      indicationOptions: [{ id: 1, label: 'Vorsorge', choices: [] }]
    })
    expect(wrapper.find('.alert-warning').exists()).toBe(false)
    expect(wrapper.find('.alert-info').exists()).toBe(false)
    expect(wrapper.get('.btn-outline-primary').attributes('disabled')).toBeUndefined()
  })
})
