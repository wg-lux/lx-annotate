import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchReportTemplateReadiness,
  normalizeBuilderReadiness,
  publishReportTemplate,
  saveReportTemplateDefinition,
  unpublishReportTemplate
} from '@/api/reportTemplateBuilderApi'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: { get: hoisted.get, post: hoisted.post },
  dtypesApi: (path: string) => `/dtypes-api/${path}`
}))

describe('reportTemplateBuilderApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes readiness and preserves blocking errors', () => {
    expect(
      normalizeBuilderReadiness({
        can_publish: false,
        lifecycle_status: 'draft',
        errors: ['Missing required section'],
        warnings: ['Review wording']
      })
    ).toMatchObject({
      canPublish: false,
      lifecycleStatus: 'draft',
      errors: ['Missing required section'],
      warnings: ['Review wording']
    })
  })

  it('uses the lifecycle endpoints and keeps readiness in the response', async () => {
    hoisted.post
      .mockResolvedValueOnce({
        data: {
          module_name: 'report_template_examples',
          template_name: 'custom_template',
          lifecycle_status: 'published',
          readiness: { can_publish: true, lifecycle_status: 'published', errors: [], warnings: [] }
        }
      })
      .mockResolvedValueOnce({
        data: {
          module_name: 'report_template_examples',
          template_name: 'custom_template',
          lifecycle_status: 'draft',
          readiness: { can_publish: true, lifecycle_status: 'draft', errors: [], warnings: [] }
        }
      })

    await expect(
      publishReportTemplate('report_template_examples', 'custom_template')
    ).resolves.toMatchObject({
      lifecycleStatus: 'published'
    })
    await expect(
      unpublishReportTemplate('report_template_examples', 'custom_template')
    ).resolves.toMatchObject({
      lifecycleStatus: 'draft'
    })
    expect(hoisted.post).toHaveBeenNthCalledWith(
      1,
      '/dtypes-api/report-templates/builder/templates/report_template_examples/custom_template/publish'
    )
  })

  it('loads readiness from the definition endpoint', async () => {
    hoisted.get.mockResolvedValue({
      data: { can_publish: true, lifecycle_status: 'draft', errors: [], warnings: [] }
    })
    await expect(fetchReportTemplateReadiness('module', 'template')).resolves.toMatchObject({
      canPublish: true,
      lifecycleStatus: 'draft'
    })
  })

  it('rejects malformed text fields in a saved template response', async () => {
    hoisted.post.mockResolvedValue({
      data: { module_name: { unexpected: true } }
    })

    await expect(
      saveReportTemplateDefinition({
        moduleName: 'report_template_examples',
        fileName: 'custom_template.py',
        templateName: 'custom_template',
        examination: 'upper_gi_endoscopy',
        description: '',
        sections: []
      })
    ).rejects.toThrow('Ungültiges Textfeld in Template-Antwort: moduleName.')
  })
})
