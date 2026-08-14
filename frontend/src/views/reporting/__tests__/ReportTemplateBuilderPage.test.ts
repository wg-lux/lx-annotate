import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportTemplateBuilderPage from '../ReportTemplateBuilderPage.vue'
import { reportTemplateLifecycleContextKey } from '../reportTemplateLifecycleContext'

const hoisted = vi.hoisted(() => ({
  fetchKnowledgeBaseGraphSnapshot: vi.fn(),
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

vi.mock('@/api/knowledgeBaseGraphApi', () => ({
  fetchKnowledgeBaseGraphSnapshot: hoisted.fetchKnowledgeBaseGraphSnapshot
}))

vi.mock('@/api/reportTemplatesApi', () => ({
  fetchReportTemplateByName: hoisted.fetchByName,
  fetchReportTemplatePreviewByName: hoisted.fetchPreviewByName,
  fetchBuilderReportTemplatesByExamination: hoisted.fetchBuilderByExamination,
  getReportTemplateDisplayName: (template: { name: string; nameDe?: string }) =>
    template.nameDe || template.name,
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
  nameDe: 'Koloskopie-Demovorlage',
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
    hoisted.fetchKnowledgeBaseGraphSnapshot.mockResolvedValue({
      concepts: {
        moduleName: 'report_template_examples',
        examination: [
          { name: 'colonoscopy', nameDe: 'Koloskopie', displayName: 'Koloskopie', tags: [] }
        ],
        finding: [{ name: 'colon_polyp', nameDe: 'Kolonpolyp', tags: [] }],
        classification: [{ name: 'polyp_size', nameDe: 'Polypengröße', tags: [] }],
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
    hoisted.saveDefinition.mockResolvedValue({
      moduleName: 'report_template_examples',
      fileName: 'clinic_template.yaml',
      path: '/knowledge/generated/clinic_template.yaml',
      templateName: 'custom_colonoscopy',
      recordsWritten: 2,
      lifecycleStatus: 'draft',
      readiness: null
    })
  })

  it('uses the shell module, loads drafts through preview, and notifies after publication', async () => {
    const notifyLifecycleChanged = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => '1.0.0'),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged
          }
        }
      }
    })
    await flushPromises()

    expect(hoisted.fetchKnowledgeBaseGraphSnapshot).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0'
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

  it('waits for the shell terminology module before loading builder catalogs', async () => {
    const activeModuleName = ref('')
    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => activeModuleName.value),
            activeModuleVersion: computed(() => '1.0.0'),
            activeExaminationName: computed(() => ''),
            notifyLifecycleChanged: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    })
    await flushPromises()

    expect(hoisted.fetchKnowledgeBaseGraphSnapshot).not.toHaveBeenCalled()
    expect(hoisted.fetchBuilderByExamination).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Request failed with status code 404')

    activeModuleName.value = 'report_template_examples'
    await flushPromises()

    expect(hoisted.fetchKnowledgeBaseGraphSnapshot).toHaveBeenCalledTimes(1)
    expect(hoisted.fetchKnowledgeBaseGraphSnapshot).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0'
    )
    expect(hoisted.fetchBuilderByExamination).toHaveBeenCalledWith(
      'report_template_examples',
      'colonoscopy'
    )
    expect(wrapper.text()).toContain('1 Untersuchungen')
    expect(wrapper.text()).toContain('Koloskopie')
    expect(wrapper.text()).toContain('Koloskopie-Demovorlage')

    const addFindingButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Befund hinzufügen')
    if (!addFindingButton) throw new Error('Add finding button not found.')
    await addFindingButton.trigger('click')
    expect(wrapper.text()).toContain('Kolonpolyp')

    const addClassificationButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Wert hinzufügen')
    if (!addClassificationButton) throw new Error('Add classification button not found.')
    await addClassificationButton.trigger('click')
    expect(wrapper.text()).toContain('Polypengröße')
  })

  it('fails closed when the shell does not provide an exact module version', async () => {
    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => ''),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    })
    await flushPromises()

    expect(hoisted.fetchKnowledgeBaseGraphSnapshot).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('eine exakte Terminologieversion benötigt')
  })

  it('uses the shell examination instead of the first core-concept examination', async () => {
    hoisted.fetchKnowledgeBaseGraphSnapshot.mockResolvedValueOnce({
      concepts: {
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
      }
    })

    mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => '1.0.0'),
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
    hoisted.fetchKnowledgeBaseGraphSnapshot.mockResolvedValueOnce({
      concepts: {
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
      }
    })

    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => '1.0.0'),
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

  it('preserves hospital branding sections in the template save payload', async () => {
    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => '1.0.0'),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    })
    await flushPromises()

    await wrapper
      .get('[data-testid="hospital-address"]')
      .setValue('Klinikum Beispiel\nEndoskopie\nMusterstraße 1\n12345 Berlin')
    await wrapper
      .get('input[placeholder*="clinic_colonoscopy_template_v1"]')
      .setValue('clinic_template')

    const openSaveButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Template speichern')
    if (!openSaveButton) throw new Error('Template save button not found.')
    await openSaveButton.trigger('click')

    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Speichern')
    if (!saveButton) throw new Error('Save confirmation button not found.')
    await saveButton.trigger('click')
    await flushPromises()

    expect(hoisted.saveDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: [
          expect.objectContaining({
            sectionType: 'clinic_address',
            description: 'Klinikum Beispiel\nEndoskopie\nMusterstraße 1\n12345 Berlin'
          })
        ]
      })
    )
  })
})
