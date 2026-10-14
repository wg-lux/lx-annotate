import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'

import ReportTemplateBuilderPage from '../ReportTemplateBuilderPage.vue'
import { reportTemplateLifecycleContextKey } from '../reportTemplateLifecycleContext'
import ReportTemplateSectionsEditor from '@/components/Reporting/ReportTemplateSectionsEditor.vue'

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
  unpublish: vi.fn(),
  buildPackage: vi.fn(),
  saveDownload: vi.fn()
}))

vi.mock('@/utils/saveDownload', () => ({ saveDownload: hoisted.saveDownload }))

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
  buildReportTemplatePackage: hoisted.buildPackage,
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
  conceptCoverage: null
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
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

  it.each([false, true])(
    'builds package files and discards stale drafts (changed: %s)',
    async (changed) => {
      const pending = deferred<{
        packageName: string
        configYaml: string
        reportTemplatesYaml: string
        validatorsYaml: string
      }>()
      hoisted.buildPackage.mockReturnValue(pending.promise)
      const wrapper = mount(ReportTemplateBuilderPage, {
        global: {
          provide: {
            [reportTemplateLifecycleContextKey as symbol]: {
              activeModuleName: computed(() => 'report_template_examples'),
              activeModuleVersion: computed(() => '1.0.0'),
              activeExaminationName: computed(() => 'colonoscopy'),
              notifyLifecycleChanged: vi.fn()
            }
          }
        }
      })
      await flushPromises()
      wrapper.findComponent(ReportTemplateSectionsEditor).vm.$emit('update:modelValue', [
        {
          id: 'section',
          name: 'study_findings',
          sectionType: 'findings',
          description: '',
          fields: [],
          findings: [
            {
              finding: 'colon_polyp',
              required: false,
              multipleAllowed: true,
              classifications: [],
              validator: {
                enabled: true,
                name: 'study_rule',
                operator: 'exists',
                condition: { classification: '', comparator: 'eq', value: '', thenRequires: [] }
              }
            }
          ]
        }
      ])
      await wrapper.get('#study-package-name').setValue('my_study')
      await wrapper.get('#study-package-version').setValue('0.2.0')
      await wrapper.get('#study-package-dependencies').setValue('additional_terminology')
      const generate = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Paketdateien erzeugen')
      if (!generate) throw new Error('Package generation button missing')
      await generate.trigger('click')
      expect(hoisted.buildPackage).toHaveBeenCalledWith(
        expect.objectContaining({
          packageName: 'my_study',
          packageVersion: '0.2.0',
          moduleVersion: '1.0.0',
          dependsOn: ['report_template_examples', 'additional_terminology']
        })
      )
      expect(hoisted.buildPackage.mock.calls[0]?.[0]).toMatchObject({
        sections: [{ findings: [{ validator: { name: 'study_rule' } }] }]
      })
      if (changed) await wrapper.get('#study-package-version').setValue('0.3.0')
      pending.resolve({
        packageName: 'my_study',
        configYaml: 'name: my_study\n',
        reportTemplatesYaml: '- model: report_template\n',
        validatorsYaml: '- model: findings_validator\n'
      })
      await flushPromises()
      const download = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Studienpaket herunterladen')
      if (!download) throw new Error('Download button missing')
      if (changed) {
        expect(wrapper.find('[data-testid="config.yaml"]').exists()).toBe(false)
        expect(download.attributes('disabled')).toBeDefined()
      } else {
        expect(wrapper.get('[data-testid="config.yaml"]').text()).toContain('name: my_study')
        expect(wrapper.get('[data-testid="validators.yml"]').text()).toContain('findings_validator')
        await download.trigger('click')
        expect(hoisted.saveDownload).toHaveBeenCalledWith(expect.any(Blob), 'my_study.zip')
        const archive: unknown = hoisted.saveDownload.mock.calls[0]?.[0]
        if (!(archive instanceof Blob)) throw new Error('Expected a ZIP Blob')
        const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) resolve(reader.result)
            else reject(new Error('Expected archive bytes'))
          }
          reader.onerror = () => { reject(new Error('Could not read archive')) }
          reader.readAsArrayBuffer(archive)
        })
        const files = unzipSync(new Uint8Array(bytes))
        expect(Object.keys(files).sort()).toEqual([
          'my_study/config.yaml',
          'my_study/report_templates.yml',
          'my_study/validators.yml'
        ])
        const configBytes: unknown = files['my_study/config.yaml']
        if (!(configBytes instanceof Uint8Array)) throw new Error('Missing config file')
        expect(strFromU8(configBytes)).toBe('name: my_study\n')
        await wrapper.get('#study-package-name').setValue('new_study')
        expect(download.attributes('disabled')).toBeDefined()
      }
      expect(hoisted.saveDefinition).not.toHaveBeenCalled()
      expect(hoisted.publish).not.toHaveBeenCalled()
    }
  )

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
      '1.0.0',
      'custom_colonoscopy'
    )
    expect(hoisted.fetchByName).not.toHaveBeenCalled()

    const publishButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Veröffentlichen')
    if (!publishButton) throw new Error('Publish button not found.')
    await publishButton.trigger('click')
    await flushPromises()

    expect(hoisted.publish).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'custom_colonoscopy'
    )
    expect(notifyLifecycleChanged).toHaveBeenCalledWith({
      moduleName: 'report_template_examples',
      moduleVersion: '1.0.0',
      templateName: 'custom_colonoscopy',
      examination: 'colonoscopy',
      lifecycleStatus: 'published'
    })
  })

  it('discards a delayed publication result after the terminology version changes', async () => {
    const activeModuleVersion = ref('1.0.0')
    const delayedPublish = deferred<{
      moduleName: string
      templateName: string
      lifecycleStatus: 'published'
      readiness: null
    }>()
    const notifyLifecycleChanged = vi.fn().mockResolvedValue(undefined)
    hoisted.publish.mockReturnValueOnce(delayedPublish.promise)
    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => activeModuleVersion.value),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged
          }
        }
      }
    })
    await flushPromises()
    const publishButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Veröffentlichen')
    if (!publishButton) throw new Error('Publish button not found.')
    await publishButton.trigger('click')

    activeModuleVersion.value = '2.0.0'
    delayedPublish.resolve({
      moduleName: 'report_template_examples',
      templateName: 'custom_colonoscopy',
      lifecycleStatus: 'published',
      readiness: null
    })
    await flushPromises()

    expect(hoisted.publish).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'custom_colonoscopy'
    )
    expect(notifyLifecycleChanged).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('wurde veröffentlicht')
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
      '1.0.0',
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
      '1.0.0',
      'colonoscopy'
    )
    expect(hoisted.fetchBuilderByExamination).not.toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'gastroscopy'
    )
  })

  it('discards a delayed template list after the terminology version changes', async () => {
    const activeModuleVersion = ref('1.0.0')
    const delayedVersionOne = deferred<(typeof draftTemplate)[]>()
    const versionTwoTemplate = {
      ...draftTemplate,
      name: 'custom_colonoscopy_v2',
      nameDe: 'Koloskopie Version 2',
      identity: {
        ...draftTemplate.identity,
        knowledgeBaseVersion: '2.0.0'
      }
    }
    hoisted.fetchBuilderByExamination.mockImplementation(() =>
      activeModuleVersion.value === '1.0.0'
        ? delayedVersionOne.promise
        : Promise.resolve([versionTwoTemplate])
    )

    const wrapper = mount(ReportTemplateBuilderPage, {
      global: {
        provide: {
          [reportTemplateLifecycleContextKey as symbol]: {
            activeModuleName: computed(() => 'report_template_examples'),
            activeModuleVersion: computed(() => activeModuleVersion.value),
            activeExaminationName: computed(() => 'colonoscopy'),
            notifyLifecycleChanged: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    })
    await vi.waitFor(() => {
      expect(hoisted.fetchBuilderByExamination).toHaveBeenCalled()
    })

    activeModuleVersion.value = '2.0.0'
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Koloskopie Version 2')
    })

    delayedVersionOne.resolve([draftTemplate])
    await flushPromises()
    expect(wrapper.text()).toContain('Koloskopie Version 2')
    expect(wrapper.text()).not.toContain('Koloskopie-Demovorlage')
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
        moduleVersion: '1.0.0',
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
