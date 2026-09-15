import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchReportingLanguages, normalizeReportingLanguages } from '@/api/reportingLanguagesApi'

const hoisted = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get
  },
  dtypesApi: (path: string) => `/dtypes-api/${path}`
}))

describe('reportingLanguagesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the language contract from lx-dtypes-api', async () => {
    hoisted.get.mockResolvedValue({
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
    expect(hoisted.get).toHaveBeenCalledWith('/dtypes-api/reporting/languages')
  })

  it('rejects unsupported language codes at the API boundary', () => {
    expect(() =>
      normalizeReportingLanguages({
        defaultLanguage: 'de',
        languages: [{ code: 'fr', label: 'Français' }]
      })
    ).toThrow('unvollständig')
  })

  it('preserves the canonical German label supplied by lx-dtypes', () => {
    expect(
      normalizeReportingLanguages({
        defaultLanguage: 'de',
        languages: [{ code: 'de', label: ' Deutsch (Deutschland) ' }]
      })
    ).toEqual({
      defaultLanguage: 'de',
      languages: [{ code: 'de', label: 'Deutsch (Deutschland)' }]
    })
  })

  it.each([
    { defaultLanguage: 'de', languages: [] },
    { defaultLanguage: 'de', languages: [{ code: 'de', label: '' }] },
    {
      defaultLanguage: 'de',
      languages: [
        { code: 'de', label: 'Deutsch' },
        { code: 'de', label: 'Deutsch' }
      ]
    }
  ])('rejects ambiguous or unusable language contracts', (payload) => {
    expect(() => normalizeReportingLanguages(payload)).toThrow()
  })
})
