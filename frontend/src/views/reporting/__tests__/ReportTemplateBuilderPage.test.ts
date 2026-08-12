import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportTemplateBuilderPage from '../ReportTemplateBuilderPage.vue'
import { reportTemplateLifecycleContextKey } from '../reportTemplateLifecycleContext'

const hoisted = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  fetchByName: vi.fn(),
  fetchPreviewByName: vi.fn(),
  fetchBuilderByExamination: vi.fn(),
  validateDefinition: vi.fn(),
  validateRuntime: vi.fn(),
  saveDefinition: vi.fn(),
  fetchReadiness: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: { get: hoisted.axiosGet },
  dtypesApi: (path: string) => `/dtypes-api/${path}`
}))

vi.mock('@/api/reportTemplatesApi', () => ({
  fetchReportTemplateByName: hoisted.fetchByName,
  fetchReportTemplatePreviewByName: hoisted.fetchPreviewByName,
  fetchBuilderReportTemplatesByExamination: hoisted.fetchBuilderByExamination,
  validateReportTemplateDefinition: hoisted.validateDefinition,
  validateReportTemplateRuntime: hoisted.validateRuntime
}))

vi.mock('@/api/reportTemplateBuilderApi', () => ({
  saveReportTemplateDefinition: hoisted.saveDefinition,
  fetchReportTemplateReadiness: hoisted.fetchReadiness,
  publishReportTemplate: hoisted.publish,
  unpublishReportTemplate: hoisted.unpublish
}))

const draftTemplate = {
  name: 'custom_colonoscopy',
  examination: 'colonoscopy',
  identity: {
    moduleName: 'report_template_examples',
    knowledgeBaseVersion: '1.0.0',
    templateVersion: null,
    templateHash: null,
    lifecycleStatus: 'draft' as const,
    readiness: {
      canPublish: true,
      blockingIssues: [],
      warnings: [],
      raw: {}
    }
  },
  reportSections: [],
  validators: { findingsValidators: [], examinationValidators: [] },
  conceptCoverage: null,
  conceptCoverageState: 'missing' as const
}

describe('ReportTemplateBuilderPage publication integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.axiosGet.mockResolvedValue({
      data: {
        examination: [{ name: 'colonoscopy' }],
        finding: [],
        classification: []
      }
    })
    hoisted.fetchBuilderByExamination.mockResolvedValue([draftTemplate])
    hoisted.fetchPreviewByName.mockResolvedValue(draftTemplate)
    hoisted.fetchByName.mockResolvedValue({
      ...draftTemplate,
      identity: { ...draftTemplate.identity, lifecycleStatus: 'published' }
    })
    hoisted.publish.mockResolvedValue({
      moduleName: 'report_template_examples',
      templateName: 'custom_colonoscopy',
      lifecycleStatus: 'published',
      readiness: {
        canPublish: true,
        lifecycleStatus: 'published',
        errors: [],
        warnings: [],
        raw: {}
      }
    })
  })

  it('uses the shell module, loads drafts through preview, and notifies after publication', async () => {
    const notifyLifecycleChanged = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            notifyLifecycleChanged
          }
        }
      }
    })
    await flushPromises()

    expect(hoisted.axiosGet).toHaveBeenCalledWith(
      '/dtypes-api/core-concepts/report_template_examples'
    )
    expect(hoisted.fetchPreviewByName).toHaveBeenCalledWith(
      'report_template_examples',
      'custom_colonoscopy'
    )
    expect(hoisted.fetchByName).not.toHaveBeenCalled()

    const publishButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Veröffentlichen')
    if (!publishButton) throw new Error('Publish button not found.')
    await publishButton.trigger('click')
    await flushPromises()

    expect(hoisted.publish).toHaveBeenCalledWith('report_template_examples', 'custom_colonoscopy')
    expect(notifyLifecycleChanged).toHaveBeenCalledWith({
      moduleName: 'report_template_examples',
      templateName: 'custom_colonoscopy',
      examination: 'colonoscopy',
      lifecycleStatus: 'published'
    })
  })
})
