import axiosInstance from '@/api/axiosInstance'

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
    value: string
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
}

export async function saveReportTemplateDefinition(
  payload: SaveReportTemplateDefinitionRequest
): Promise<SaveReportTemplateDefinitionResponse> {
  const response = await axiosInstance.post('/base_api/report-templates/builder/templates', payload)
  return response.data as SaveReportTemplateDefinitionResponse
}
