import type { FindingsCatalogContext } from '@/api/findingsApi'

export type ReportingKnowledgeBaseIdentity = {
  moduleName: string
  moduleVersion: string
}

type ActiveBundle = {
  moduleName: string
  version: string
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
    throw new Error(
      'Die Knowledge-Base-Bindung der Patientenuntersuchung ist unvollständig. Bitte die Patientenuntersuchung auf eine vollständige Modul- und Versionsbindung migrieren.'
    )
  }
  return { moduleName, moduleVersion }
}

export function resolveReportingKnowledgeBaseContext(params: {
  patientExaminationId: number
  pinnedIdentity: ReportingKnowledgeBaseIdentity | null
  activeBundle: ActiveBundle | null
}): FindingsCatalogContext {
  const { patientExaminationId, pinnedIdentity, activeBundle } = params
  if (!activeBundle) {
    throw new Error(
      pinnedIdentity
        ? `Die Patientenuntersuchung #${String(patientExaminationId)} ist an ${pinnedIdentity.moduleName}@${pinnedIdentity.moduleVersion} gebunden. Bitte dieses Terminologiepaket aktivieren.`
        : 'Bitte ein Terminologiepaket aktivieren, bevor Vorlagen und Befundkatalog geladen werden.'
    )
  }
  if (
    pinnedIdentity &&
    (pinnedIdentity.moduleName !== activeBundle.moduleName ||
      pinnedIdentity.moduleVersion !== activeBundle.version)
  ) {
    throw new Error(
      `Die Patientenuntersuchung #${String(patientExaminationId)} ist an ${pinnedIdentity.moduleName}@${pinnedIdentity.moduleVersion} gebunden, aktiv ausgewählt ist jedoch ${activeBundle.moduleName}@${activeBundle.version}. Bitte das gebundene Terminologiepaket auswählen oder die Patientenuntersuchung kontrolliert migrieren.`
    )
  }
  return {
    moduleName: pinnedIdentity?.moduleName || activeBundle.moduleName,
    moduleVersion: pinnedIdentity?.moduleVersion || activeBundle.version,
    patientExaminationId
  }
}
