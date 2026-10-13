import axiosInstance, { dtypesApi } from '@/api/axiosInstance'
import type { ReportTemplateLifecycleStatus } from '@/types/reportTemplate'

export type ReportTemplateBuilderField = {
  key: string
  label: string
  source: 'patient' | 'patient_examination' | 'history'
  required: boolean
}

export type ReportTemplateBuilderClassification = {
  classification: string
  required: boolean
}

export type ReportTemplateBuilderFindingValidator = {
  enabled: boolean
  name: string
  operator: 'exists' | 'missing' | 'condition'
  condition: {
    classification: string
    comparator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in'
    value: string | number
    values?: string[]
    thenRequires: string[]
  }
}

export type ReportTemplateBuilderFinding = {
  finding: string
  required: boolean
  multipleAllowed: boolean
  classifications: ReportTemplateBuilderClassification[]
  validator: ReportTemplateBuilderFindingValidator
}

export type ReportTemplateBuilderSection = {
  id: string
  sectionType: 'logo' | 'patient_info' | 'clinic_address' | 'findings'
  name: string
  description: string
  fields: ReportTemplateBuilderField[]
  findings: ReportTemplateBuilderFinding[]
}

export type SaveReportTemplateDefinitionRequest = {
  moduleName: string
  moduleVersion: string
  fileName: string
  templateName: string
  examination: string
  description: string
  sections: ReportTemplateBuilderSection[]
}

export type SaveReportTemplateDefinitionResponse = {
  moduleName: string
  fileName: string
  path: string
  templateName: string
  recordsWritten: number
  lifecycleStatus: ReportTemplateLifecycleStatus
  readiness: ReportTemplateBuilderReadiness | null
}

export type BuildReportTemplatePackageRequest = SaveReportTemplateDefinitionRequest & {
  packageName: string
  packageVersion: string
  dependsOn: string[]
}

export type ReportTemplatePackage = {
  packageName: string
  configYaml: string
  reportTemplatesYaml: string
  validatorsYaml: string
}

export async function buildReportTemplatePackage(
  payload: BuildReportTemplatePackageRequest
): Promise<ReportTemplatePackage> {
  const { data } = await axiosInstance.post<unknown>(
    dtypesApi('report-templates/builder/package'),
    payload
  )
  if (!isRecord(data) || (data.packageName ?? data.package_name) !== payload.packageName) {
    throw new Error('Die Paketantwort gehört nicht zum angeforderten Studienpaket.')
  }
  const result = {
    packageName: payload.packageName,
    configYaml: responseString(data.configYaml ?? data.config_yaml, '', 'configYaml'),
    reportTemplatesYaml: responseString(
      data.reportTemplatesYaml ?? data.report_templates_yaml,
      '',
      'reportTemplatesYaml'
    ),
    validatorsYaml: responseString(
      data.validatorsYaml ?? data.validators_yaml,
      '',
      'validatorsYaml'
    )
  }
  if (
    ![result.configYaml, result.reportTemplatesYaml, result.validatorsYaml].every((text) =>
      text.trim()
    )
  ) {
    throw new Error('Die Paketantwort enthält nicht alle drei YAML-Dateien.')
  }
  return result
}

export type ReportTemplateBuilderReadiness = {
  canPublish: boolean
  lifecycleStatus: ReportTemplateLifecycleStatus
  errors: string[]
  warnings: string[]
  raw: Record<string, unknown>
}

export type ReportTemplateLifecycleResponse = {
  moduleName: string
  templateName: string
  lifecycleStatus: ReportTemplateLifecycleStatus
  readiness: ReportTemplateBuilderReadiness | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function responseString(value: unknown, fallback: string, fieldName: string): string {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === 'string') {
    return value
  }
  throw new Error(`Ungültiges Textfeld in Template-Antwort: ${fieldName}.`)
}

export function normalizeBuilderReadiness(value: unknown): ReportTemplateBuilderReadiness | null {
  if (!isRecord(value)) {
    return null
  }
  const lifecycleStatus = value.lifecycleStatus ?? value.lifecycle_status
  if (lifecycleStatus !== 'draft' && lifecycleStatus !== 'published') {
    return null
  }
  return {
    canPublish: value.canPublish === true || value.can_publish === true,
    lifecycleStatus,
    errors: strings(value.errors),
    warnings: strings(value.warnings),
    raw: value
  }
}

function normalizeLifecycleResponse(value: unknown): ReportTemplateLifecycleResponse {
  if (!isRecord(value)) {
    throw new Error('Ungültige Template-Lifecycle-Antwort.')
  }
  const moduleName = value.moduleName ?? value.module_name
  const templateName = value.templateName ?? value.template_name
  const lifecycleStatus = value.lifecycleStatus ?? value.lifecycle_status
  if (
    typeof moduleName !== 'string' ||
    typeof templateName !== 'string' ||
    (lifecycleStatus !== 'draft' && lifecycleStatus !== 'published')
  ) {
    throw new Error('Ungültige Template-Lifecycle-Antwort.')
  }
  return {
    moduleName,
    templateName,
    lifecycleStatus,
    readiness: normalizeBuilderReadiness(value.readiness)
  }
}

export async function saveReportTemplateDefinition(
  payload: SaveReportTemplateDefinitionRequest
): Promise<SaveReportTemplateDefinitionResponse> {
  const response = await axiosInstance.post(
    dtypesApi('report-templates/builder/templates'),
    payload
  )
  const data = response.data as Record<string, unknown>
  return {
    moduleName: responseString(
      data.moduleName ?? data.module_name,
      payload.moduleName,
      'moduleName'
    ),
    fileName: responseString(data.fileName ?? data.file_name, payload.fileName, 'fileName'),
    path: responseString(data.path, '', 'path'),
    templateName: responseString(
      data.templateName ?? data.template_name,
      payload.templateName,
      'templateName'
    ),
    recordsWritten: Number(data.recordsWritten ?? data.records_written ?? 0),
    lifecycleStatus: (data.lifecycleStatus ??
      data.lifecycle_status ??
      'draft') as ReportTemplateLifecycleStatus,
    readiness: normalizeBuilderReadiness(data.readiness)
  }
}

export async function fetchReportTemplateReadiness(
  moduleName: string,
  moduleVersion: string,
  templateName: string
): Promise<ReportTemplateBuilderReadiness> {
  const response = await axiosInstance.get(
    `${dtypesApi('report-templates')}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate-definition?version=${encodeURIComponent(moduleVersion)}`
  )
  const readiness = normalizeBuilderReadiness(response.data)
  if (!readiness) {
    throw new Error('Ungültiges Readiness-Ergebnis der Berichtsvorlage.')
  }
  return readiness
}

export async function publishReportTemplate(
  moduleName: string,
  moduleVersion: string,
  templateName: string
): Promise<ReportTemplateLifecycleResponse> {
  const response = await axiosInstance.post(
    `${dtypesApi('report-templates')}/builder/templates/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/publish?version=${encodeURIComponent(moduleVersion)}`
  )
  return normalizeLifecycleResponse(response.data)
}

export async function unpublishReportTemplate(
  moduleName: string,
  moduleVersion: string,
  templateName: string
): Promise<ReportTemplateLifecycleResponse> {
  const response = await axiosInstance.post(
    `${dtypesApi('report-templates')}/builder/templates/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/unpublish?version=${encodeURIComponent(moduleVersion)}`
  )
  return normalizeLifecycleResponse(response.data)
}
