import { computed, onScopeDispose, ref, watch } from 'vue'
import { checkReportLlmStatus, generateLlmReport } from '@/api/reportLlmApi'
import { fetchExaminationReportingContext } from '@/api/knowledgeBaseGraphApi'
import type { ReportLanguageCode } from '@/api/reportingLanguagesApi'
import type {
  ReportTemplateIdentity,
  ReportVerbosity,
  ReportTemplateRuntimePatientFindingInput
} from '@/types/reportTemplate'
import { reportingApiErrorMessage } from '@/views/reporting/reportingError'

export type LlmReportContext = {
  patientExaminationId: number
  moduleName: string
  moduleVersion: string
  examinationName: string
  templateName: string
  templateIdentity: ReportTemplateIdentity
  language: ReportLanguageCode
  verbosity?: ReportVerbosity
  documentedFindings: ReportTemplateRuntimePatientFindingInput[]
  sectionNotes: { name: string; note: string }[]
  existingText: string
}

export function useLlmReportGeneration(options: {
  getContext: () => LlmReportContext | null
  applyText: (text: string, patientExaminationId: number) => void
  confirmReplace: () => boolean
}) {
  const phase = ref<'idle' | 'checking' | 'graph' | 'generating'>('idle')
  const error = ref<string | null>(null)
  const notice = ref<string | null>(null)
  const busy = computed(() => phase.value !== 'idle')
  const available = computed(() => options.getContext() !== null)
  let generation = 0
  let controller: AbortController | null = null

  function cancel() {
    generation += 1
    controller?.abort()
    controller = null
    phase.value = 'idle'
  }

  watch(
    () => JSON.stringify(options.getContext()),
    () => {
      if (busy.value) {
        cancel()
        notice.value =
          'Der Untersuchungskontext oder Berichtstext wurde geändert. Bitte die KI-Erstellung erneut starten.'
      } else {
        notice.value = null
      }
      error.value = null
    },
    { flush: 'sync' }
  )
  onScopeDispose(cancel)

  async function generate() {
    if (busy.value) {
      return
    }
    const context = options.getContext()
    if (!context) {
      return
    }
    if (context.existingText.trim() && !options.confirmReplace()) {
      return
    }
    const fingerprint = JSON.stringify(context)
    const requestGeneration = ++generation
    controller = new AbortController()
    const signal = controller.signal
    const isCurrent = () =>
      requestGeneration === generation && fingerprint === JSON.stringify(options.getContext())
    error.value = null
    notice.value = null
    phase.value = 'checking'
    try {
      await checkReportLlmStatus(signal)
      if (!isCurrent()) {
        return
      }
      phase.value = 'graph'
      const graph = await fetchExaminationReportingContext(
        context.moduleName,
        context.moduleVersion,
        context.examinationName
      )
      if (!isCurrent()) {
        return
      }
      const template = graph.reportTemplates.find((item) => item.name === context.templateName)
      if (
        !template ||
        template.identity.lifecycleStatus !== 'published' ||
        template.identity.moduleName !== context.templateIdentity.moduleName ||
        template.identity.knowledgeBaseVersion !== context.templateIdentity.knowledgeBaseVersion ||
        template.identity.templateVersion !== context.templateIdentity.templateVersion ||
        template.identity.templateHash !== context.templateIdentity.templateHash
      ) {
        throw new Error('Die gewählte Vorlage gehört nicht zum aktuellen Terminologiegraphen.')
      }
      phase.value = 'generating'
      const text = await generateLlmReport(
        {
          patientExaminationId: context.patientExaminationId,
          templateName: context.templateName,
          language: context.language,
          verbosity: context.verbosity ?? 'standard',
          graph,
          documentedFindings: context.documentedFindings,
          sectionNotes: context.sectionNotes
        },
        signal
      )
      if (!isCurrent()) {
        return
      }
      phase.value = 'idle'
      options.applyText(text, context.patientExaminationId)
      notice.value =
        'KI-Entwurf eingefügt. Bitte den Bericht fachlich prüfen und bei Bedarf bearbeiten.'
    } catch (cause: unknown) {
      if (!isCurrent()) {
        return
      }
      error.value = reportingApiErrorMessage(
        cause,
        'Der KI-Bericht konnte nicht erstellt werden. Der bisherige Text bleibt erhalten.'
      )
    } finally {
      if (requestGeneration === generation) {
        phase.value = 'idle'
        controller = null
      }
    }
  }

  return { phase, busy, available, error, notice, generate }
}
