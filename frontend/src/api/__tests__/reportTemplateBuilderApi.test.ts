import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import {
  fetchReportTemplateReadiness,
  normalizeBuilderReadiness,
  publishReportTemplate,
  unpublishReportTemplate
} from '@/api/reportTemplateBuilderApi'

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn() },
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
    vi.mocked(axiosInstance.post)
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

    await expect(publishReportTemplate('report_template_examples', 'custom_template')).resolves.toMatchObject({
      lifecycleStatus: 'published'
    })
    await expect(unpublishReportTemplate('report_template_examples', 'custom_template')).resolves.toMatchObject({
      lifecycleStatus: 'draft'
    })
    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      1,
      '/dtypes-api/report-templates/builder/templates/report_template_examples/custom_template/publish'
    )
  })

  it('loads readiness from the definition endpoint', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { can_publish: true, lifecycle_status: 'draft', errors: [], warnings: [] }
    })
    await expect(fetchReportTemplateReadiness('module', 'template')).resolves.toMatchObject({
      canPublish: true,
      lifecycleStatus: 'draft'
    })
  })
})
