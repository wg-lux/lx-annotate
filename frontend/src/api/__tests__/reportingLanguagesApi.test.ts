import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import {
  fetchReportingLanguages,
  normalizeReportingLanguages
} from '@/api/reportingLanguagesApi'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn()
  },
  dtypesApi: (path: string) => `/dtypes-api/${path}`
}))

describe('reportingLanguagesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the language contract from lx-dtypes-api', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        defaultLanguage: 'de',
        languages: [
          { code: 'de', label: 'Deutsch' },
          { code: 'en', label: 'English' }
        ]
      }
    })

    await expect(fetchReportingLanguages()).resolves.toEqual({
      defaultLanguage: 'de',
      languages: [
        { code: 'de', label: 'Deutsch' },
        { code: 'en', label: 'English' }
      ]
    })
    expect(axiosInstance.get).toHaveBeenCalledWith('/dtypes-api/reporting/languages')
  })

  it('rejects unsupported language codes at the API boundary', () => {
    expect(() =>
      normalizeReportingLanguages({
        defaultLanguage: 'de',
        languages: [{ code: 'fr', label: 'Français' }]
      })
    ).toThrow('unvollständig')
  })
})
