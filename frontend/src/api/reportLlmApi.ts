import axiosInstance, { r } from '@/api/axiosInstance'
import type { ExaminationReportingContext } from '@/types/knowledgeBaseGraph'
import type {
  ReportTemplateRuntimePatientFindingInput,
  ReportVerbosity
} from '@/types/reportTemplate'
import type { ReportLanguageCode } from '@/api/reportingLanguagesApi'

export type LlmReportRequest = {
  patientExaminationId: number
  templateName: string
  language: ReportLanguageCode
  verbosity?: ReportVerbosity
  graph: ExaminationReportingContext
  documentedFindings: ReportTemplateRuntimePatientFindingInput[]
  sectionNotes: { name: string; note: string }[]
}

export async function checkReportLlmStatus(signal: AbortSignal): Promise<string> {
  const response = await axiosInstance.get<unknown>(r('reporting/llm/status/'), {
    signal,
    timeout: 15_000
  })
  const data = response.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('ready' in data) ||
    data.ready !== true ||
    !('model' in data) ||
    typeof data.model !== 'string' ||
    !data.model.trim()
  ) {
    throw new Error('Das konfigurierte LLM-Modell ist nicht bereit.')
  }
  return data.model
}

export async function generateLlmReport(
  request: LlmReportRequest,
  signal: AbortSignal
): Promise<string> {
  const response = await axiosInstance.post<unknown>(r('reporting/llm/generate/'), request, {
    signal,
    timeout: 135_000
  })
  const data = response.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('text' in data) ||
    typeof data.text !== 'string' ||
    !data.text.trim() ||
    !('graphContextId' in data) ||
    data.graphContextId !== request.graph.contextId
  ) {
    throw new Error('Die LLM-Antwort ist leer oder gehört zu einem anderen Untersuchungskontext.')
  }
  return data.text.trim()
}
