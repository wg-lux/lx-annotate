import { computed, ref } from 'vue'

import {
  fetchReportTemplateByName as fetchTemplateByNameApi,
  fetchReportTemplatesByExamination as fetchTemplatesByExaminationApi,
  describeSectionTitle
} from '@/api/reportTemplatesApi'
import type {
  ReportTemplatePayload,
  ReportTemplateSectionBlock,
  ReportTemplateValidatorDescriptor
} from '@/types/reportTemplate'
import { reportingApiErrorMessage } from '@/views/reporting/reportingError'

function normalizeSections(
  sections: ReportTemplatePayload['reportSections'] | undefined
): ReportTemplateSectionBlock[] {
  return (sections || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((section) => {
      const findings = Array.isArray(section.findings) ? section.findings : []
      const requiredFindingsCount = findings.filter((f) => f.required).length
      const optionalFindingsCount = Math.max(0, findings.length - requiredFindingsCount)
      const requiredClassificationsCount = findings.reduce(
        (acc, finding) =>
          acc +
          (Array.isArray(finding.classifications) ? finding.classifications : []).filter(
            (classification) => classification.required
          ).length,
        0
      )
      return {
        name: section.name,
        position: section.position,
        title: describeSectionTitle(section.name),
        subtitle: `${String(findings.length)} Befunde · ${String(requiredFindingsCount)} erforderlich`,
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
  const moduleName = ref(params?.initialModuleName?.trim() || '')
  const selectedTemplateName = ref<string | null>(params?.initialTemplateName || null)
  const templateOptions = ref<ReportTemplatePayload[]>([])
  const selectedTemplate = ref<ReportTemplatePayload | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  let contextKey = moduleName.value
  let requestGeneration = 0

  const sectionBlocks = computed(() => normalizeSections(selectedTemplate.value?.reportSections))
  const validatorDescriptors = computed<ReportTemplateValidatorDescriptor[]>(() => [
    ...(selectedTemplate.value?.validators.findingsValidators || []),
    ...(selectedTemplate.value?.validators.examinationValidators || [])
  ])

  function clearError() {
    errorMessage.value = null
  }

  function setModuleName(next: string, nextContextKey = next.trim()) {
    const normalized = next.trim()
    if (moduleName.value === normalized && contextKey === nextContextKey) return
    moduleName.value = normalized
    contextKey = nextContextKey
    requestGeneration += 1
    loading.value = false
    errorMessage.value = null
    templateOptions.value = []
    selectedTemplate.value = null
    selectedTemplateName.value = null
  }

  function setRequestContext(nextContextKey: string) {
    if (contextKey === nextContextKey) return
    contextKey = nextContextKey
    requestGeneration += 1
    loading.value = false
    errorMessage.value = null
    templateOptions.value = []
    selectedTemplate.value = null
  }

  async function fetchTemplateByName(
    templateName: string,
    opts?: { setAsSelected?: boolean; moduleOverride?: string }
  ): Promise<ReportTemplatePayload | null> {
    const useModule = opts?.moduleOverride || moduleName.value
    if (!templateName || !useModule) return null
    const generation = ++requestGeneration

    loading.value = true
    clearError()
    try {
      const payload = await fetchTemplateByNameApi(useModule, templateName)
      if (generation !== requestGeneration || useModule !== moduleName.value) return null
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
    } catch (error: unknown) {
      if (generation !== requestGeneration) return null
      errorMessage.value = reportingApiErrorMessage(
        error,
        'Fehler beim Laden des Report-Templates.'
      )
      return null
    } finally {
      if (generation === requestGeneration) loading.value = false
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
    const generation = ++requestGeneration

    loading.value = true
    clearError()
    try {
      const templates = await fetchTemplatesByExaminationApi(useModule, examinationName)
      if (generation !== requestGeneration || useModule !== moduleName.value) return []
      templateOptions.value = templates

      const preferredName = selectedTemplateName.value
      const preferredTemplate =
        (preferredName && templates.find((item) => item.name === preferredName)) || null
      selectedTemplate.value = preferredTemplate
      selectedTemplateName.value = preferredTemplate?.name || null

      return templates
    } catch (error: unknown) {
      if (generation !== requestGeneration) return []
      errorMessage.value = reportingApiErrorMessage(
        error,
        'Fehler beim Laden der Report-Templates für die Untersuchung.'
      )
      templateOptions.value = []
      selectedTemplate.value = null
      return []
    } finally {
      if (generation === requestGeneration) loading.value = false
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
    validatorDescriptors,
    loading,
    errorMessage,
    clearError,
    setModuleName,
    setRequestContext,
    fetchTemplateByName,
    fetchTemplatesByExamination,
    selectTemplateByName
  }
}
