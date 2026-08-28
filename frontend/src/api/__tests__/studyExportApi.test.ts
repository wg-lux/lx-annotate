import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/endoreg/${path}`
}))

import {
  buildStudyExportQuery,
  fetchStudyExportOptions,
  fetchStudyExportWorkbook
} from '@/api/studyExportApi'

describe('studyExportApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('encodes repeated clinical criteria without collapsing selections', () => {
    const query = buildStudyExportQuery({
      examinations: ['colonoscopy', 'gastroscopy'],
      findings: ['polyp'],
      indications: ['screening', 'surveillance'],
      groupBy: 'patient'
    })

    expect(query.get('group_by')).toBe('patient')
    expect(query.getAll('examination')).toEqual(['colonoscopy', 'gastroscopy'])
    expect(query.getAll('finding')).toEqual(['polyp'])
    expect(query.getAll('indication')).toEqual(['screening', 'surveillance'])
  })

  it('loads server-derived export options', async () => {
    const payload = {
      examinations: ['colonoscopy'],
      findings: ['polyp'],
      indications: ['screening'],
      maximumRows: 25000
    }
    hoisted.axios.get.mockResolvedValue({ data: payload })

    await expect(fetchStudyExportOptions()).resolves.toBe(payload)
    expect(hoisted.axios.get).toHaveBeenCalledWith(
      '/endoreg/media/studies/case-export/options/'
    )
  })

  it('returns the workbook filename and row count from response headers', async () => {
    const blob = new Blob(['xlsx'])
    hoisted.axios.get.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition': 'attachment; filename="pseudonymous-study-cases-2026.xlsx"',
        'x-export-row-count': '17'
      }
    })

    const result = await fetchStudyExportWorkbook({
      examinations: [],
      findings: ['polyp'],
      indications: [],
      groupBy: 'examination'
    })

    const calls = hoisted.axios.get.mock.calls as unknown as Array<
      [string, { params: URLSearchParams; responseType: string }]
    >
    const config = calls[0][1]
    expect(hoisted.axios.get.mock.calls[0][0]).toBe(
      '/endoreg/media/studies/case-export.xlsx'
    )
    expect(config.params.getAll('finding')).toEqual(['polyp'])
    expect(config.params.get('group_by')).toBe('examination')
    expect(config.responseType).toBe('blob')
    expect(result).toEqual({
      blob,
      filename: 'pseudonymous-study-cases-2026.xlsx',
      rowCount: 17
    })
  })
})
