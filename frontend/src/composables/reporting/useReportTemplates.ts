import { computed, ref } from 'vue'

import axiosInstance from '@/api/axiosInstance'
import type {
  ReportTemplateClassification,
  ReportTemplateFinding,
  ReportTemplatePayload,
  ReportTemplateSectionBlock
} from '@/types/reportTemplate'

const REPORT_TEMPLATE_BASE = '/base_api/report-templates'

function isRecordLike(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function titleFromSectionName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeClassifications(
  classifications: unknown
): ReportTemplateClassification[] {
  if (!Array.isArray(classifications)) return []
  return classifications
    .filter((classification): classification is Record<string, any> =>
      isRecordLike(classification)
    )
    .map((classification) => ({
      classification:
        typeof classification.classification === 'string'
          ? classification.classification
          : '',
      required: !!classification.required
    }))
    .filter((classification) => !!classification.classification)
}

function normalizeFindings(findings: unknown): ReportTemplateFinding[] {
  if (!Array.isArray(findings)) return []
  return findings
    .filter((finding): finding is Record<string, any> => isRecordLike(finding))
    .map((finding) => ({
      finding: typeof finding.finding === 'string' ? finding.finding : '',
      required: !!finding.required,
      multipleAllowed: !!finding.multipleAllowed,
      classifications: normalizeClassifications(finding.classifications)
    }))
    .filter((finding) => !!finding.finding)
}

function normalizeTemplatePayload(payload: unknown): ReportTemplatePayload | null {
  if (!isRecordLike(payload)) return null
  const name = typeof payload.name === 'string' ? payload.name : ''
  if (!name) return null

  const sections = Array.isArray(payload.reportSections)
    ? payload.reportSections
        .filter((section): section is Record<string, any> => isRecordLike(section))
        .map((section) => ({
          name: typeof section.name === 'string' ? section.name : '',
          position: Number.isFinite(Number(section.position)) ? Number(section.position) : 0,
          types: Array.isArray(section.types)
            ? section.types.filter((entry): entry is string => typeof entry === 'string')
            : [],
          findings: normalizeFindings(section.findings)
        }))
        .filter((section) => !!section.name)
    : []

  const validators = isRecordLike(payload.validators) ? payload.validators : {}

  return {
    name,
    examination: typeof payload.examination === 'string' ? payload.examination : '',
    reportSections: sections,
    validators: {
      examinationValidators: Array.isArray(validators.examinationValidators)
        ? validators.examinationValidators
        : [],
      findingsValidators: Array.isArray(validators.findingsValidators)
        ? validators.findingsValidators
        : []
    }
  }
}

function normalizeSections(
  sections: ReportTemplatePayload['reportSections'] | undefined
): ReportTemplateSectionBlock[] {
  return (sections || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((section) => {
      const findings = Array.isArray(section.findings) ? section.findings : []
      const requiredFindingsCount = findings.filter((f) => !!f.required).length
      const optionalFindingsCount = Math.max(0, findings.length - requiredFindingsCount)
      const requiredClassificationsCount = findings.reduce(
        (acc, finding) =>
          acc +
          (Array.isArray(finding.classifications) ? finding.classifications : []).filter(
            (classification) => !!classification.required
          ).length,
        0
      )
      return {
        name: section.name,
        position: section.position,
        title: titleFromSectionName(section.name),
        subtitle: `${findings.length} Befunde · ${requiredFindingsCount} erforderlich`,
        findings,
        requiredFindingsCount,
        optionalFindingsCount,
        requiredClassificationsCount
      }
    })
}

export function useReportTemplates(params?: {
  initialModuleName?: string
  initialTemplateName?: string | null
}) {
  const moduleName = ref(params?.initialModuleName || 'report_template_examples')
  const selectedTemplateName = ref<string | null>(params?.initialTemplateName || null)
  const templateOptions = ref<ReportTemplatePayload[]>([])
  const selectedTemplate = ref<ReportTemplatePayload | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  const sectionBlocks = computed(() => normalizeSections(selectedTemplate.value?.reportSections))

  function clearError() {
    errorMessage.value = null
  }

  function setModuleName(next: string) {
    moduleName.value = next || 'report_template_examples'
  }

  async function fetchTemplateByName(
    templateName: string,
    opts?: { setAsSelected?: boolean; moduleOverride?: string }
  ): Promise<ReportTemplatePayload | null> {
    const useModule = opts?.moduleOverride || moduleName.value
    if (!templateName || !useModule) return null

    loading.value = true
    clearError()
    try {
      const res = await axiosInstance.get(
        `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(useModule)}/${encodeURIComponent(templateName)}`
      )
      const payload = normalizeTemplatePayload(res.data)
      if (!payload) {
        throw new Error('Ungültiges Report-Template-Format.')
      }
      const existingIndex = templateOptions.value.findIndex((item) => item.name === payload.name)
      if (existingIndex >= 0) {
        templateOptions.value.splice(existingIndex, 1, payload)
      } else {
        templateOptions.value = [payload, ...templateOptions.value]
      }
      if (opts?.setAsSelected ?? true) {
        selectedTemplate.value = payload
        selectedTemplateName.value = payload.name
      }
      return payload
    } catch (e: any) {
      errorMessage.value =
        e?.response?.data?.detail || e?.message || 'Fehler beim Laden des Report-Templates.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchTemplatesByExamination(
    examinationName: string | null | undefined,
    opts?: { moduleOverride?: string }
  ) {
    const useModule = opts?.moduleOverride || moduleName.value
    if (!examinationName || !useModule) {
      templateOptions.value = []
      selectedTemplate.value = null
      return []
    }

    loading.value = true
    clearError()
    try {
      const res = await axiosInstance.get(
        `${REPORT_TEMPLATE_BASE}/by-examination/${encodeURIComponent(useModule)}/${encodeURIComponent(examinationName)}`
      )
      const templates = Array.isArray(res.data)
        ? res.data
            .map((entry) => normalizeTemplatePayload(entry))
            .filter((entry): entry is ReportTemplatePayload => !!entry)
        : []
      templateOptions.value = templates

      const preferredName = selectedTemplateName.value
      const preferredTemplate =
        (preferredName && templates.find((item) => item.name === preferredName)) || templates[0] || null
      selectedTemplate.value = preferredTemplate
      selectedTemplateName.value = preferredTemplate?.name || null

      return templates
    } catch (e: any) {
      errorMessage.value =
        e?.response?.data?.detail ||
        e?.message ||
        'Fehler beim Laden der Report-Templates für die Untersuchung.'
      templateOptions.value = []
      selectedTemplate.value = null
      return []
    } finally {
      loading.value = false
    }
  }

  async function selectTemplateByName(name: string | null) {
    if (!name) {
      selectedTemplateName.value = null
      selectedTemplate.value = null
      return
    }
    selectedTemplateName.value = name
    const local = templateOptions.value.find((item) => item.name === name) || null
    if (local) {
      selectedTemplate.value = local
      return
    }
    await fetchTemplateByName(name, { setAsSelected: true })
  }

  return {
    moduleName,
    selectedTemplateName,
    templateOptions,
    selectedTemplate,
    sectionBlocks,
    loading,
    errorMessage,
    clearError,
    setModuleName,
    fetchTemplateByName,
    fetchTemplatesByExamination,
    selectTemplateByName
  }
}
