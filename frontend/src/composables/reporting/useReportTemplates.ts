import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

import {
  fetchReportTemplateByName as fetchTemplateByNameApi,
  fetchReportTemplatesByExamination as fetchTemplatesByExaminationApi,
  getReportTemplateSectionDisplayName
} from '@/api/reportTemplatesApi'
import type {
  ReportTemplatePayload,
  ReportTemplateSectionBlock,
  ReportTemplateValidatorDescriptor
} from '@/types/reportTemplate'
import { reportingApiErrorMessage } from '@/views/reporting/reportingError'

function normalizeSections(
  sections: ReportTemplatePayload['reportSections'] | undefined,
  language: 'de' | 'en'
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
        title: getReportTemplateSectionDisplayName(section, language),
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
  initialModuleVersion?: string
  initialTemplateName?: string | null
  language?: MaybeRefOrGetter<'de' | 'en'>
}) {
  const moduleName = ref(params?.initialModuleName?.trim() || '')
  const moduleVersion = ref(params?.initialModuleVersion?.trim() || '')
  const selectedTemplateName = ref<string | null>(params?.initialTemplateName || null)
  const templateOptions = ref<ReportTemplatePayload[]>([])
  const selectedTemplate = ref<ReportTemplatePayload | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  let contextKey = `${moduleName.value}@@${moduleVersion.value}`
  let requestGeneration = 0

  const sectionBlocks = computed(() =>
    normalizeSections(
      selectedTemplate.value?.reportSections,
      params?.language ? toValue(params.language) : 'de'
    )
  )
  const validatorDescriptors = computed<ReportTemplateValidatorDescriptor[]>(() => [
    ...(selectedTemplate.value?.validators.findingsValidators || []),
    ...(selectedTemplate.value?.validators.examinationValidators || [])
  ])

  function clearError() {
    errorMessage.value = null
  }

  function setModuleName(
    next: string,
    nextVersion: string,
    nextContextKey = `${next.trim()}@@${nextVersion.trim()}`
  ) {
    const normalized = next.trim()
    const normalizedVersion = nextVersion.trim()
    if (
      moduleName.value === normalized &&
      moduleVersion.value === normalizedVersion &&
      contextKey === nextContextKey
    ) {
      return
    }
    moduleName.value = normalized
    moduleVersion.value = normalizedVersion
    contextKey = nextContextKey
    requestGeneration += 1
    loading.value = false
    errorMessage.value = null
    templateOptions.value = []
    selectedTemplate.value = null
    selectedTemplateName.value = null
  }

  function setRequestContext(nextContextKey: string) {
    if (contextKey === nextContextKey) {
      return
    }
    contextKey = nextContextKey
    requestGeneration += 1
    loading.value = false
    errorMessage.value = null
    templateOptions.value = []
    selectedTemplate.value = null
  }

  function applyTemplateOptions(templates: ReportTemplatePayload[]) {
    templateOptions.value = templates.slice()
    const preferredName = selectedTemplateName.value
    const preferredTemplate =
      (preferredName && templates.find((item) => item.name === preferredName)) || null
    selectedTemplate.value = preferredTemplate
    selectedTemplateName.value = preferredTemplate?.name || null
  }

  function isCurrentRequest(generation: number, requestedModule: string, version: string): boolean {
    return (
      generation === requestGeneration &&
      requestedModule === moduleName.value &&
      version === moduleVersion.value
    )
  }

  function assertTemplateIdentity(
    template: ReportTemplatePayload,
    requestedModule: string,
    version: string
  ): void {
    const matches =
      template.identity.moduleName === requestedModule &&
      template.identity.knowledgeBaseVersion === version
    if (!matches) {
      throw new Error('Die Vorlagenantwort gehört nicht zur angeforderten Terminologieversion.')
    }
  }

  function upsertTemplate(template: ReportTemplatePayload): void {
    const existingIndex = templateOptions.value.findIndex((item) => item.name === template.name)
    if (existingIndex >= 0) {
      templateOptions.value.splice(existingIndex, 1, template)
      return
    }
    templateOptions.value = [template, ...templateOptions.value]
  }

  function selectTemplateWhenRequested(
    template: ReportTemplatePayload,
    setAsSelected: boolean
  ): void {
    if (!setAsSelected) return
    selectedTemplate.value = template
    selectedTemplateName.value = template.name
  }

  function templateRequestContext(
    moduleOverride?: string
  ): { requestedModule: string; version: string } | null {
    const requestedModule = moduleOverride || moduleName.value
    const version = moduleVersion.value
    return requestedModule && version ? { requestedModule, version } : null
  }

  function requireTemplate(payload: ReportTemplatePayload | null): ReportTemplatePayload {
    if (!payload) throw new Error('Ungültiges Report-Template-Format.')
    return payload
  }

  function handleRequestError(error: unknown, generation: number, fallback: string): void {
    if (generation === requestGeneration) {
      errorMessage.value = reportingApiErrorMessage(error, fallback)
    }
  }

  function finishRequest(generation: number): void {
    if (generation === requestGeneration) loading.value = false
  }

  async function fetchTemplateByName(
    templateName: string,
    opts?: { setAsSelected?: boolean; moduleOverride?: string }
  ): Promise<ReportTemplatePayload | null> {
    const context = templateRequestContext(opts?.moduleOverride)
    if (!templateName || !context) return null
    const generation = ++requestGeneration

    loading.value = true
    clearError()
    try {
      const payload = requireTemplate(
        await fetchTemplateByNameApi(context.requestedModule, context.version, templateName)
      )
      if (!isCurrentRequest(generation, context.requestedModule, context.version)) {
        return null
      }
      assertTemplateIdentity(payload, context.requestedModule, context.version)
      upsertTemplate(payload)
      selectTemplateWhenRequested(payload, opts?.setAsSelected ?? true)
      return payload
    } catch (error: unknown) {
      handleRequestError(error, generation, 'Fehler beim Laden des Report-Templates.')
      return null
    } finally {
      finishRequest(generation)
    }
  }

  async function fetchTemplatesByExamination(
    examinationName: string | null | undefined,
    opts?: { moduleOverride?: string }
  ) {
    const useModule = opts?.moduleOverride || moduleName.value
    const useVersion = moduleVersion.value
    if (!examinationName || !useModule || !useVersion) {
      templateOptions.value = []
      selectedTemplate.value = null
      return []
    }
    const generation = ++requestGeneration

    loading.value = true
    clearError()
    try {
      const templates = await fetchTemplatesByExaminationApi(useModule, useVersion, examinationName)
      if (!isCurrentRequest(generation, useModule, useVersion)) {
        return []
      }
      templates.forEach((template) => {
        assertTemplateIdentity(template, useModule, useVersion)
      })
      applyTemplateOptions(templates)

      return templates
    } catch (error: unknown) {
      if (generation !== requestGeneration) {
        return []
      }
      errorMessage.value = reportingApiErrorMessage(
        error,
        'Fehler beim Laden der Report-Templates für die Untersuchung.'
      )
      templateOptions.value = []
      selectedTemplate.value = null
      return []
    } finally {
      if (generation === requestGeneration) {
        loading.value = false
      }
    }
  }

  async function selectTemplateByName(name: string | null): Promise<ReportTemplatePayload | null> {
    if (!name) {
      selectedTemplateName.value = null
      selectedTemplate.value = null
      return null
    }
    const local = templateOptions.value.find((item) => item.name === name) || null
    if (local) {
      selectedTemplate.value = local
      selectedTemplateName.value = local.name
      return local
    }
    return fetchTemplateByName(name, { setAsSelected: true })
  }

  return {
    moduleName,
    moduleVersion,
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
    applyTemplateOptions,
    fetchTemplateByName,
    fetchTemplatesByExamination,
    selectTemplateByName
  }
}
