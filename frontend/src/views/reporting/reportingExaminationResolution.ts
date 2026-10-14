export type ReportingExaminationCatalogEntry = {
  id: number
  name: string
  displayName?: string
}

export type ReportingExaminationResolutionCode =
  'missing_name' | 'name_not_found' | 'ambiguous_name' | 'id_not_found' | 'contradictory_identity'

export type ReportingExaminationResolution<T extends ReportingExaminationCatalogEntry> =
  | { status: 'resolved'; examination: T }
  | {
      status: 'unresolved'
      code: ReportingExaminationResolutionCode
      examinationName: string
      selectedExaminationId: number | null
    }

export class ReportingExaminationResolutionError extends Error {
  readonly code: ReportingExaminationResolutionCode

  constructor(code: ReportingExaminationResolutionCode, message: string) {
    super(message)
    this.name = 'ReportingExaminationResolutionError'
    this.code = code
  }
}

export function normalizeReportingExaminationName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || ''
}

export function findReportingExaminationsByName<T extends { name: string }>(
  catalog: readonly T[],
  examinationName: string | null | undefined
): T[] {
  const normalizedName = normalizeReportingExaminationName(examinationName)
  if (!normalizedName) {
    return []
  }
  return catalog.filter((entry) => normalizeReportingExaminationName(entry.name) === normalizedName)
}

export function resolveReportingExamination<T extends ReportingExaminationCatalogEntry>(params: {
  catalog: readonly T[]
  selectedExaminationId: number | null
  examinationName: string | null | undefined
}): ReportingExaminationResolution<T> {
  const examinationName = params.examinationName?.trim() || ''
  if (params.selectedExaminationId !== null) {
    const selectedById = params.catalog.find((entry) => entry.id === params.selectedExaminationId)
    if (!selectedById) {
      return {
        status: 'unresolved',
        code: 'id_not_found',
        examinationName,
        selectedExaminationId: params.selectedExaminationId
      }
    }
    if (
      examinationName &&
      normalizeReportingExaminationName(selectedById.name) !==
        normalizeReportingExaminationName(examinationName)
    ) {
      return {
        status: 'unresolved',
        code: 'contradictory_identity',
        examinationName,
        selectedExaminationId: params.selectedExaminationId
      }
    }
    return { status: 'resolved', examination: selectedById }
  }

  if (!examinationName) {
    return {
      status: 'unresolved',
      code: 'missing_name',
      examinationName,
      selectedExaminationId: null
    }
  }
  const matches = findReportingExaminationsByName(params.catalog, examinationName)
  if (!matches.length) {
    return {
      status: 'unresolved',
      code: 'name_not_found',
      examinationName,
      selectedExaminationId: null
    }
  }
  if (matches.length > 1) {
    return {
      status: 'unresolved',
      code: 'ambiguous_name',
      examinationName,
      selectedExaminationId: null
    }
  }
  return { status: 'resolved', examination: matches[0] }
}

export function reportingExaminationResolutionMessage(
  resolution: Extract<
    ReportingExaminationResolution<ReportingExaminationCatalogEntry>,
    { status: 'unresolved' }
  >
): string {
  if (resolution.code === 'missing_name') {
    return 'Die Patientenuntersuchung enthält keinen Untersuchungsnamen.'
  }
  if (resolution.code === 'name_not_found') {
    return `Die Untersuchung "${resolution.examinationName}" fehlt im Untersuchungskatalog.`
  }
  if (resolution.code === 'ambiguous_name') {
    return `Die Untersuchung "${resolution.examinationName}" ist im Untersuchungskatalog nicht eindeutig.`
  }
  if (resolution.code === 'id_not_found') {
    return `Die Untersuchungs-ID ${String(resolution.selectedExaminationId)} fehlt im Untersuchungskatalog.`
  }
  return `Die gespeicherte Untersuchungs-ID und der Untersuchungsname "${resolution.examinationName}" widersprechen sich.`
}

export function requireResolvedReportingExamination<
  T extends ReportingExaminationCatalogEntry
>(params: {
  catalog: readonly T[]
  selectedExaminationId: number | null
  examinationName: string | null | undefined
}): T {
  const resolution = resolveReportingExamination(params)
  if (resolution.status === 'resolved') {
    return resolution.examination
  }
  throw new ReportingExaminationResolutionError(
    resolution.code,
    reportingExaminationResolutionMessage(resolution)
  )
}

export function requireUniqueReportingExaminationName<T extends { name: string }>(
  catalog: readonly T[],
  examinationName: string
): T {
  const normalizedName = examinationName.trim()
  const matches = findReportingExaminationsByName(catalog, normalizedName)
  if (!normalizedName || !matches.length) {
    throw new ReportingExaminationResolutionError(
      normalizedName ? 'name_not_found' : 'missing_name',
      normalizedName
        ? `Die ausgewählte Untersuchung "${normalizedName}" fehlt im aktiven Terminologiemodul.`
        : 'Die ausgewählte Patientenuntersuchung enthält keinen Untersuchungsnamen.'
    )
  }
  if (matches.length > 1) {
    throw new ReportingExaminationResolutionError(
      'ambiguous_name',
      `Die ausgewählte Untersuchung "${normalizedName}" ist im aktiven Terminologiemodul nicht eindeutig.`
    )
  }
  return matches[0]
}
