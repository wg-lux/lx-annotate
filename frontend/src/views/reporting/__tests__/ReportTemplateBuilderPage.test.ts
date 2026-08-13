import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportTemplateBuilderPage from '../ReportTemplateBuilderPage.vue'
import { reportTemplateLifecycleContextKey } from '../reportTemplateLifecycleContext'

const hoisted = vi.hoisted(() => ({
  fetchCoreConcepts: vi.fn(),
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

vi.mock('@/api/coreConcepts', () => ({
  fetchCoreConcepts: hoisted.fetchCoreConcepts
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
    hoisted.fetchCoreConcepts.mockResolvedValue({
      moduleName: 'report_template_examples',
      examination: [{ name: 'colonoscopy', displayName: 'Colonoscopy', tags: [] }],
      finding: [],
      classification: [],
      classificationChoice: [],
      classificationChoiceDescriptor: [],
      findingType: [],
      indication: [],
      indicationType: [],
      intervention: [],
      interventionType: [],
      unit: [],
      unitType: [],
      informationSource: [],
      informationSourceType: [],
      citation: []
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
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged
          }
        }
      }
    })
    await flushPromises()

    expect(hoisted.fetchCoreConcepts).toHaveBeenCalledWith('report_template_examples')
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

  it('uses the shell examination instead of the first core-concept examination', async () => {
    hoisted.fetchCoreConcepts.mockResolvedValueOnce({
      moduleName: 'report_template_examples',
      examination: [
        { name: 'gastroscopy', displayName: 'Gastroscopy', tags: [] },
        { name: 'colonoscopy', displayName: 'Colonoscopy', tags: [] }
      ],
      finding: [],
      classification: [],
      classificationChoice: [],
      classificationChoiceDescriptor: [],
      findingType: [],
      indication: [],
      indicationType: [],
      intervention: [],
      interventionType: [],
      unit: [],
      unitType: [],
      informationSource: [],
      informationSourceType: [],
      citation: []
    })

    mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    })
    await flushPromises()

    expect(hoisted.fetchBuilderByExamination).toHaveBeenCalledWith(
      'report_template_examples',
      'colonoscopy'
    )
    expect(hoisted.fetchBuilderByExamination).not.toHaveBeenCalledWith(
      'report_template_examples',
      'gastroscopy'
    )
  })

  it('fails visibly instead of loading templates for an unrelated examination', async () => {
    hoisted.fetchCoreConcepts.mockResolvedValueOnce({
      moduleName: 'report_template_examples',
      examination: [{ name: 'gastroscopy', displayName: 'Gastroscopy', tags: [] }],
      finding: [],
      classification: [],
      classificationChoice: [],
      classificationChoiceDescriptor: [],
      findingType: [],
      indication: [],
      indicationType: [],
      intervention: [],
      interventionType: [],
      unit: [],
      unitType: [],
      informationSource: [],
      informationSourceType: [],
      citation: []
    })

    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Die ausgewählte Untersuchung "colonoscopy" fehlt im aktiven Terminologiemodul.'
    )
    expect(hoisted.fetchBuilderByExamination).not.toHaveBeenCalled()
  })
})
