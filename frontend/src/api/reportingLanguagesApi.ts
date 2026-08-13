import axiosInstance, { dtypesApi } from '@/api/axiosInstance'

export type ReportLanguageCode = 'de' | 'en'

export type ReportLanguageOption = {
  code: ReportLanguageCode
  label: string
}

export type ReportingLanguages = {
  defaultLanguage: ReportLanguageCode
  languages: ReportLanguageOption[]
}

function isReportLanguageCode(value: unknown): value is ReportLanguageCode {
  return value === 'de' || value === 'en'
}

export function normalizeReportingLanguages(payload: unknown): ReportingLanguages {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Die Berichtssprachen-Antwort ist ungültig.')
  }
  const source = payload as Record<string, unknown>
  const rawLanguages = source.languages
  if (!Array.isArray(rawLanguages)) {
    throw new Error('Die Liste der Berichtssprachen fehlt.')
  }
  if (rawLanguages.length === 0) {
    throw new Error('Die Liste der Berichtssprachen ist leer.')
  }
  const languages = rawLanguages.map((entry): ReportLanguageOption => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Ein Eintrag der Berichtssprachen ist ungültig.')
    }
    const option = entry as Record<string, unknown>
    if (
      !isReportLanguageCode(option.code) ||
      typeof option.label !== 'string' ||
      !option.label.trim()
    ) {
      throw new Error('Ein Eintrag der Berichtssprachen ist unvollständig.')
    }
    return { code: option.code, label: option.label.trim() }
  })
  if (new Set(languages.map((option) => option.code)).size !== languages.length) {
    throw new Error('Die Berichtssprachen enthalten doppelte Sprachcodes.')
  }
  const defaultLanguage = source.defaultLanguage
  if (!isReportLanguageCode(defaultLanguage)) {
    throw new Error('Die Standard-Berichtssprache ist ungültig.')
  }
  if (!languages.some((option) => option.code === defaultLanguage)) {
    throw new Error('Die Standard-Berichtssprache wird nicht angeboten.')
  }
  return { defaultLanguage, languages }
}

export async function fetchReportingLanguages(): Promise<ReportingLanguages> {
  const response = await axiosInstance.get(dtypesApi('reporting/languages'))
  return normalizeReportingLanguages(response.data)
}
