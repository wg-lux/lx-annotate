import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HistoricalReportViewer from '../HistoricalReportViewer.vue'
import ReportReadinessSummary from '../ReportReadinessSummary.vue'

describe('historical report viewer', () => {
  it('keeps historical text read-only and asks its owner to close the viewer', async () => {
    const wrapper = mount(HistoricalReportViewer, {
      props: {
        identityLabel: 'Vorlage Gastroskopie · Version 1',
        renderedText: 'Historischer Befund'
      }
    })

    expect(wrapper.text()).toContain('Vorlage Gastroskopie · Version 1')
    const text = wrapper.get<HTMLTextAreaElement>('textarea')
    expect(text.element.value).toBe('Historischer Befund')
    expect(text.element.readOnly).toBe(true)
    expect(text.attributes('aria-label')).toBe('Historischer Berichtstext')

    await wrapper.get('[data-testid="close-historical-report"]').trigger('click')
    expect(wrapper.emitted('close')).toEqual([[]])
    expect(text.element.value).toBe('Historischer Befund')
  })
})

describe('report readiness summary', () => {
  it('shows counts and updates the warning when all requirements are fulfilled', async () => {
    const wrapper = mount(ReportReadinessSummary, {
      props: { completedSections: 1, totalSections: 3, missingRequiredCount: 2, wordCount: 17 }
    })

    expect(wrapper.text()).toContain('1/3')
    expect(wrapper.text()).toContain('17 Wörter')
    expect(wrapper.get('.has-warning').text()).toContain('2')

    await wrapper.setProps({ completedSections: 3, missingRequiredCount: 0 })
    expect(wrapper.text()).toContain('3/3')
    expect(wrapper.find('.has-warning').exists()).toBe(false)
  })

  it('does not imply readiness when no template sections exist', () => {
    const wrapper = mount(ReportReadinessSummary, {
      props: { completedSections: 0, totalSections: 0, missingRequiredCount: 0, wordCount: 5 }
    })

    expect(wrapper.find('.report-readiness-strip').exists()).toBe(false)
  })
})
