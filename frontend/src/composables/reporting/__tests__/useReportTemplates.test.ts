import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useReportTemplates } from '@/composables/reporting/useReportTemplates'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn()
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

vi.mock('@/api/axiosInstance', () => ({
  default: apiMocks,
  endoregApi: (path: string) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}))

describe('useReportTemplates', () => {
  it('does not invent an example module when no terminology is active', async () => {
    const templates = useReportTemplates({ initialModuleName: '' })

    expect(templates.moduleName.value).toBe('')
    await expect(templates.fetchTemplatesByExamination('colonoscopy')).resolves.toEqual([])
    expect(apiMocks.get).not.toHaveBeenCalled()

    templates.setModuleName('  ')
    expect(templates.moduleName.value).toBe('')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads templates by examination without implicitly selecting a clinical template', async () => {
    apiMocks.get.mockResolvedValue({
      data: [
        {
          name: 'star_upper_gi_main',
          examination: 'star_upper_gi_endoscopy',
          reportSections: [],
          validators: { examinationValidators: [], findingsValidators: [] }
        }
      ]
    })

    const catalog = useReportTemplates({
      initialModuleName: 'report_template_examples',
      initialTemplateName: null
    })

    await catalog.fetchTemplatesByExamination('star_upper_gi_endoscopy')

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/by-examination/report_template_examples/star_upper_gi_endoscopy'
    )
    expect(catalog.templateOptions.value.map((template) => template.name)).toEqual([
      'star_upper_gi_main'
    ])
    expect(catalog.selectedTemplateName.value).toBeNull()
    expect(catalog.selectedTemplate.value).toBeNull()
  })

  it('ignores an older response after the same module changes bundle version', async () => {
    const versionOne = deferred<{ data: unknown[] }>()
    const versionTwo = deferred<{ data: unknown[] }>()
    apiMocks.get
      .mockReturnValueOnce(versionOne.promise)
      .mockReturnValueOnce(versionTwo.promise)
    const catalog = useReportTemplates({ initialModuleName: 'clinical_reporting' })

    const firstLoad = catalog.fetchTemplatesByExamination('colonoscopy')
    catalog.setModuleName('clinical_reporting', 'clinical_reporting@@2.0.0')
    const secondLoad = catalog.fetchTemplatesByExamination('colonoscopy')
    versionTwo.resolve({
      data: [
        {
          name: 'version_two',
          examination: 'colonoscopy',
          reportSections: [],
          validators: { examinationValidators: [], findingsValidators: [] }
        }
      ]
    })
    await secondLoad
    versionOne.resolve({
      data: [
        {
          name: 'version_one',
          examination: 'colonoscopy',
          reportSections: [],
          validators: { examinationValidators: [], findingsValidators: [] }
        }
      ]
    })
    await firstLoad

    expect(catalog.templateOptions.value.map((template) => template.name)).toEqual(['version_two'])
  })

  it('loads a template by explicit name endpoint when not in local options', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        name: 'custom_template',
        examination: 'star_upper_gi_endoscopy',
        reportSections: [],
        validators: { examinationValidators: [], findingsValidators: [] }
      }
    })

    const catalog = useReportTemplates({
      initialModuleName: 'report_template_examples',
      initialTemplateName: null
    })

    await catalog.selectTemplateByName('custom_template')

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/report_template_examples/custom_template'
    )
    expect(catalog.selectedTemplateName.value).toBe('custom_template')
  })

  it('normalizes malformed template payloads to stable defaults', async () => {
    apiMocks.get.mockResolvedValue({
      data: [
        {
          name: 'broken_template',
          examination: 'colonoscopy',
          reportSections: [
            {
              name: 'findings',
              position: '2',
              findings: { invalid: true }
            }
          ],
          validators: null
        }
      ]
    })

    const catalog = useReportTemplates({
      initialModuleName: 'report_template_examples',
      initialTemplateName: null
    })

    const templates = await catalog.fetchTemplatesByExamination('colonoscopy')

    expect(templates).toHaveLength(1)
    expect(templates[0].reportSections[0].findings).toEqual([])
    expect(templates[0].validators.examinationValidators).toEqual([])
    expect(templates[0].validators.findingsValidators).toEqual([])
    expect(catalog.sectionBlocks.value).toEqual([])

    await catalog.selectTemplateByName('broken_template')

    expect(catalog.sectionBlocks.value[0].requiredFindingsCount).toBe(0)
  })

  it('derives validator descriptors with related sections', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        name: 'star_upper_gi_main',
        examination: 'star_upper_gi_endoscopy',
        reportSections: [
          {
            name: 'examination_baseline',
            position: 0,
            findings: [
              {
                finding: 'esophagus_polyp',
                required: false,
                multipleAllowed: true,
                classifications: [{ classification: 'size_mm', required: true }]
              }
            ]
          }
        ],
        validators: {
          findingsValidators: [
            {
              name: 'polyp_has_lst_if_large',
              finding: 'esophagus_polyp',
              operator: 'condition',
              query: {
                finding: 'esophagus_polyp',
                operator: 'condition',
                condition: {
                  any: [{ classification: 'size_mm', comparator: 'gt', value: 10 }],
                  thenRequires: [{ classification: 'lst' }]
                }
              }
            }
          ],
          examinationValidators: [
            {
              name: 'gastroscopy_has_baseline_info',
              findingValidators: ['polyp_has_lst_if_large'],
              examinationValidators: []
            }
          ]
        }
      }
    })

    const catalog = useReportTemplates({
      initialModuleName: 'report_template_examples',
      initialTemplateName: null
    })

    await catalog.selectTemplateByName('star_upper_gi_main')

    expect(catalog.validatorDescriptors.value).toHaveLength(2)
    expect(catalog.validatorDescriptors.value[0].relatedSections).toEqual(['examination_baseline'])
    expect(catalog.validatorDescriptors.value[1].relatedSections).toEqual(['examination_baseline'])
  })
})
