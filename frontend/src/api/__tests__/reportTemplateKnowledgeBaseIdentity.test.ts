import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchReportTemplatesByExamination,
  getReportTemplateDisplayName
} from '@/api/reportTemplatesApi'

const hoisted = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/api/axiosInstance', () => ({
  default: { get: hoisted.get },
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}))

describe('report-template knowledge-base identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the published LXDM identity and German title from the API response', async () => {
    hoisted.get.mockResolvedValue({
      data: [
        {
          name: 'colonoscopy_training_basic',
          name_de: 'Koloskopie – leitlinienbasierte Qualitätsdokumentation',
          name_en: 'Colonoscopy – guideline-based quality documentation',
          examination: 'colonoscopy',
          knowledge_base_module: 'report_template_examples',
          knowledge_base_version: '0.1.0',
          report_sections: []
        }
      ]
    })

    const [template] = await fetchReportTemplatesByExamination(
      'report_template_examples',
      'colonoscopy'
    )

    expect(hoisted.get).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/by-examination/report_template_examples/colonoscopy'
    )
    expect(template.identity).toMatchObject({
      moduleName: 'report_template_examples',
      knowledgeBaseVersion: '0.1.0'
    })
    expect(getReportTemplateDisplayName(template, 'de')).toBe(
      'Koloskopie – leitlinienbasierte Qualitätsdokumentation'
    )
  })
})
