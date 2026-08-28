import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({ query: { mode: 'cohort' } }))

vi.mock('vue-router', () => ({ useRoute: () => hoisted }))

import Export from '@/views/Export.vue'

describe('Export page AAA modes', () => {
  it('opens the separate study cohort mode requested by StudyCohortPage', async () => {
    // Arrange
    const wrapper = mount(Export, {
      global: {
        stubs: {
          CaseStudyExcelExport: { template: '<div data-test="case-mode" />' },
          StudyCohortExcelExport: { template: '<div data-test="cohort-mode" />' },
          ExportAnnotations: { template: '<div data-test="segment-mode" />' }
        }
      }
    })

    // Act
    const cohortTab = wrapper.get('[data-test="cohort-export-tab"]')

    // Assert
    expect(cohortTab.attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-test="cohort-mode"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="case-mode"]').exists()).toBe(false)

    // Act
    await wrapper.get('[data-test="case-export-tab"]').trigger('click')

    // Assert
    expect(wrapper.find('[data-test="case-mode"]').exists()).toBe(true)
  })
})
