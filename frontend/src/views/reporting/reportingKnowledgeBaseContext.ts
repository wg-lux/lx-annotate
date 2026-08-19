import type { FindingsCatalogContext } from '@/api/findingsApi'

export type ReportingKnowledgeBaseIdentity = {
  moduleName: string
  moduleVersion: string
}

export type ReportingActiveBundle = {
  moduleName: string
  version: string
}

export class ReportingKnowledgeBaseMismatchError extends Error {
  readonly patientExaminationId: number
  readonly pinnedIdentity: ReportingKnowledgeBaseIdentity
  readonly activeBundle: ReportingActiveBundle

  constructor(params: {
    patientExaminationId: number
    pinnedIdentity: ReportingKnowledgeBaseIdentity
    activeBundle: ReportingActiveBundle
  }) {
    const { patientExaminationId, pinnedIdentity, activeBundle } = params
    super(
      `Die Patientenuntersuchung #${String(patientExaminationId)} ist an ${pinnedIdentity.moduleName}@${pinnedIdentity.moduleVersion} gebunden, aktiv ausgewählt ist jedoch ${activeBundle.moduleName}@${activeBundle.version}. Bitte das gebundene Terminologiepaket auswählen oder die Patientenuntersuchung kontrolliert migrieren.`
    )
    this.name = 'ReportingKnowledgeBaseMismatchError'
    this.patientExaminationId = patientExaminationId
    this.pinnedIdentity = pinnedIdentity
    this.activeBundle = activeBundle
  }
}

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const readNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function readReportingKnowledgeBaseIdentity(
  value: unknown
): ReportingKnowledgeBaseIdentity | null {
  const record = readRecord(value)
  const moduleName = readNonEmptyString(record.knowledgeBaseModule, record.knowledge_base_module)
  const moduleVersion = readNonEmptyString(
    record.knowledgeBaseVersion,
    record.knowledge_base_version
  )
  if (!moduleName && !moduleVersion) return null
  if (!moduleName || !moduleVersion) {
    return null
  }
  return { moduleName, moduleVersion }
}

export function resolveReportingKnowledgeBaseContext(params: {
  patientExaminationId: number
  pinnedIdentity: ReportingKnowledgeBaseIdentity | null
  activeBundle: ReportingActiveBundle | null
  allowMismatchFallback?: boolean
}): FindingsCatalogContext {
  // This function resolves the active terminology bundle. In strict mode it can throw an error if
  // the current terminology bundle is changed for an active report. 
  const { patientExaminationId, pinnedIdentity, activeBundle, allowMismatchFallback } = params

  if (
    pinnedIdentity &&
    (pinnedIdentity.moduleName !== activeBundle?.moduleName ||
      pinnedIdentity.moduleVersion !== activeBundle?.version)
  ) {
    if (!allowMismatchFallback && activeBundle) {
      throw new ReportingKnowledgeBaseMismatchError({ patientExaminationId, pinnedIdentity, activeBundle })
    }
  }

  // Fallback to active bundle if mismatch is explicitly permitted
  return {
    moduleName: activeBundle?.moduleName || pinnedIdentity?.moduleName || '',
    moduleVersion: activeBundle?.version || pinnedIdentity?.moduleVersion || '',
    patientExaminationId
  }
}